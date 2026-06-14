// server/routes/ai.ts
// Generate: OpenRouter (primary) → adaCODE → Gemini → OpenAI
// Chat:     OpenRouter only — model fallback handled inside openrouter.ts

import { Router } from 'express'
import { generateItineraryOpenRouter, openRouterChat, getOpenRouter } from '../services/openrouter.js'
import { generateItineraryAdaCode, getAdaCode } from '../services/adacode.js'
import { generateItinerary as generateGemini } from '../services/gemini.js'
import { generateItineraryOpenAI } from '../services/openai.js'

// ─── Chat — OpenRouter only (model fallback handled inside openrouter.ts) ────
async function runChat(
  message: string,
  context?: string,
  items?: any[],
): Promise<{ reply: string; actions: any[] }> {
  if (!getOpenRouter()) {
    return {
      reply: 'TripAI tidak tersedia. Pastikan OPENROUTER_API_KEY sudah diset di server/.env',
      actions: [],
    }
  }
  try {
    const result = await openRouterChat(message, context, items)
    console.log('[AI/Chat] Responded via OpenRouter')
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AI/Chat] OpenRouter failed:', msg)
    return {
      reply: 'Maaf, TripAI sedang sibuk. Coba lagi sebentar ya.',
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

    // 1. OpenRouter (primary — free models available)
    const orClient = getOpenRouter()
    if (orClient) {
      try {
        result = await generateItineraryOpenRouter(params)
        console.log('[AI/Generate] Used OpenRouter ✓')
      } catch (orErr) {
        console.warn('[AI/Generate] OpenRouter failed:', orErr instanceof Error ? orErr.message : orErr)
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
          const adaMsg = adaErr instanceof Error ? adaErr.message : String(adaErr)
          console.warn('[AI/Generate] adaCODE failed:', adaMsg)
        }
      }
    }

    // 3. Gemini (fallback 2)
    if (!result && process.env.GEMINI_API_KEY) {
      try {
        result = await generateGemini(params)
        console.log('[AI/Generate] Used Gemini fallback ✓')
      } catch (geminiErr) {
        console.warn('[AI/Generate] Gemini failed:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
      }
    }

    // 4. OpenAI (fallback 3)
    if (!result && process.env.OPENAI_API_KEY) {
      try {
        result = await generateItineraryOpenAI(params)
        console.log('[AI/Generate] Used OpenAI fallback ✓')
      } catch (openaiErr) {
        console.warn('[AI/Generate] OpenAI failed:', openaiErr instanceof Error ? openaiErr.message : openaiErr)
      }
    }

    if (!result) { fail('AI sedang tidak tersedia. Coba lagi beberapa saat ya.'); return }

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
