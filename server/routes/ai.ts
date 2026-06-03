// server/routes/ai.ts
// Priority order: adaCODE (primary) → Gemini (fallback 1) → OpenAI (fallback 2)

import { Router } from 'express'
import { generateItineraryAdaCode, adaCodeChat, getAdaCode } from '../services/adacode.js'
import { generateItinerary as generateGemini } from '../services/gemini.js'
import { generateItineraryOpenAI } from '../services/openai.js'
import { tripAIChat } from '../services/gemini-rapidapi.js'

// ─── Chat prompt builder (shared) ───────────────────────────────────────────
function buildChatPrompt(message: string, context?: string, items?: any[]): string {
  const ctx       = context  ? `Current itinerary:\n${context}\n---\n`  : ''
  const itemsList = items?.length
    ? `\nExisting item IDs (use for update/delete):\n${items.map((i: any) => `- id:"${i.id}" title:"${i.title}" day:${i.day} time:${i.time}`).join('\n')}\n---\n`
    : ''

  return `You are TripAI — an Indonesian travel assistant that can MODIFY itineraries.

${ctx}${itemsList}User request: ${message}

Rules:
- Reply in Bahasa Indonesia, friendly tone, 1-3 sentences
- If user asks to ADD a place/hotel/restaurant/activity → put it in actions with type "add"
- If user asks to CHANGE/UPDATE an item → use type "update" with existing itemId
- If user asks to DELETE/REMOVE an item → use type "delete" with existing itemId
- If just asking for advice → actions = []
- category values: hotel, food, landmark, nature, activity, transport
- time format: "HH:MM"

Return ONLY valid JSON — NO markdown, NO code fences:
{
  "reply": "Friendly Indonesian response",
  "actions": [
    {"type": "add", "item": {"title": "Name", "category": "hotel", "day": 1, "time": "14:00", "location": "Address", "latitude": null, "longitude": null, "notes": "...", "duration_minutes": 60}},
    {"type": "update", "itemId": "existing-uuid", "changes": {"time": "10:00", "notes": "Updated"}},
    {"type": "delete", "itemId": "existing-uuid"}
  ]
}`
}

// ─── Gemini direct chat (kept as fallback) ───────────────────────────────────
async function geminiDirect(prompt: string, retries = 1): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  try {
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err: any) {
    const msg: string = err?.message || String(err)
    if (retries > 0 && (msg.includes('503') || msg.includes('Service Unavailable'))) {
      console.warn('[AI] Gemini 503, retrying in 2s...')
      await new Promise(r => setTimeout(r, 2000))
      return geminiDirect(prompt, retries - 1)
    }
    throw err
  }
}

// ─── Unified chat function with fallback chain ───────────────────────────────
async function runChat(
  message: string,
  context?: string,
  items?: any[],
): Promise<{ reply: string; actions: any[] }> {

  // 1. adaCODE (primary)
  if (getAdaCode()) {
    try {
      const result = await adaCodeChat(message, context, items)
      console.log('[AI/Chat] Responded via adaCODE')
      return result
    } catch (err) {
      console.warn('[AI/Chat] adaCODE failed, trying Gemini:', err instanceof Error ? err.message : err)
    }
  }

  // 2. Gemini (fallback 1)
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt  = buildChatPrompt(message, context, items)
      const text    = await geminiDirect(prompt)
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      const parsed  = JSON.parse(cleaned)
      console.log('[AI/Chat] Responded via Gemini fallback')
      return { reply: parsed.reply || 'Oke!', actions: Array.isArray(parsed.actions) ? parsed.actions : [] }
    } catch (err) {
      console.warn('[AI/Chat] Gemini failed, trying RapidAPI:', err instanceof Error ? err.message : err)
    }
  }

  // 3. RapidAPI Gemini (fallback 2)
  try {
    const result = await tripAIChat(message, context)
    console.log('[AI/Chat] Responded via RapidAPI Gemini fallback')
    return { reply: result.reply || 'Maaf, coba lagi ya.', actions: [] }
  } catch (err) {
    console.error('[AI/Chat] All providers failed:', err instanceof Error ? err.message : err)
    return {
      reply: 'Maaf, TripAI sedang tidak bisa membantu saat ini. Pastikan koneksi internet stabil.',
      actions: [],
    }
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────
const router = Router()

/**
 * POST /api/ai/generate-itinerary
 * Priority: adaCODE → Gemini → OpenAI
 * Uses SSE so Cloudflare heartbeats prevent 524 timeout during slow AI calls.
 * Client reads the stream; the final "data: {...}" line is the itinerary JSON.
 */
router.post('/generate-itinerary', async (req, res) => {
  const { destination, days, trip_type, budget, travelers, start_date, preferences, custom_message, min_budget, max_budget } = req.body
  if (!destination || !days) {
    res.status(400).json({ message: 'destination and days are required' })
    return
  }

  // ── SSE headers — keeps Cloudflare alive during slow AI calls ──
  res.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',   // disable nginx buffering
  })

  // Heartbeat every 8 s — Cloudflare 524 fires at 100 s with no activity
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n') } catch { clearInterval(heartbeat) }
  }, 8_000)

  const done = (data: any) => {
    clearInterval(heartbeat)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
    res.end()
  }
  const fail = (message: string) => {
    clearInterval(heartbeat)
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
    res.end()
  }

  const params = {
    destination,
    days: Number(days),
    trip_type,
    budget,
    travelers: travelers ? Number(travelers) : undefined,
    start_date,
    preferences,
    custom_message: custom_message || undefined,
    min_budget: min_budget ? Number(min_budget) : undefined,
    max_budget: max_budget ? Number(max_budget) : undefined,
  }

  try {
    let result: any = null

    // 1. Gemini (primary for generator — fast, low latency)
    if (process.env.GEMINI_API_KEY) {
      try {
        result = await generateGemini(params)
        console.log('[AI/Generate] Used Gemini ✓')
      } catch (geminiErr) {
        console.warn('[AI/Generate] Gemini failed:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
      }
    }

    // 2. adaCODE (fallback 1)
    if (!result) {
      const adaClient = getAdaCode()
      if (adaClient) {
        try {
          result = await generateItineraryAdaCode(params)
          console.log('[AI/Generate] Used adaCODE fallback ✓')
        } catch (adaErr) {
          console.warn('[AI/Generate] adaCODE failed:', adaErr instanceof Error ? adaErr.message : adaErr)
        }
      }
    }

    // 3. OpenAI (fallback 2)
    if (!result && process.env.OPENAI_API_KEY) {
      try {
        result = await generateItineraryOpenAI(params)
        console.log('[AI/Generate] Used OpenAI fallback ✓')
      } catch (openaiErr) {
        const msg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr)
        if (msg.includes('429') || msg.includes('quota') || msg.includes('billing')) {
          fail('OpenAI quota exceeded — add credits at platform.openai.com/billing')
          return
        }
        throw openaiErr
      }
    }

    if (!result) { fail('All AI providers unavailable. Cek API keys di .env'); return }

    done(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    console.error('[AI/Generate]', message)
    fail(message)
  }
})

/**
 * POST /api/ai/chat
 * TripAI assistant — modify itinerary via natural language
 */
router.post('/chat', async (req, res) => {
  const { message, context, items } = req.body
  if (!message) {
    res.status(400).json({ message: 'message is required' })
    return
  }
  try {
    const result = await runChat(message, context, items)
    res.json(result)
  } catch (err) {
    console.error('[AI/Chat]', err instanceof Error ? err.message : err)
    res.json({ reply: 'Maaf, TripAI sedang tidak bisa membantu saat ini.', actions: [] })
  }
})

/**
 * POST /api/ai/recommendations
 * Destination recommendations (still uses RapidAPI Gemini)
 */
router.post('/recommendations', async (req, res) => {
  const { destination, tripType } = req.body
  if (!destination) {
    res.status(400).json({ message: 'destination is required' })
    return
  }
  try {
    const { getRecommendations } = await import('../services/gemini-rapidapi.js')
    const result = await getRecommendations(destination, tripType)
    res.json(result)
  } catch (err) {
    console.error('[AI/Recommendations]', err instanceof Error ? err.message : err)
    res.json({ places: [], restaurants: [], hidden_gems: [], local_tips: [] })
  }
})

export default router
