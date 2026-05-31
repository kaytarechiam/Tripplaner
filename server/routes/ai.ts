// server/routes/ai.ts
import { Router } from 'express'
import { generateItinerary as generateGemini } from '../services/gemini.js'
import { generateItineraryOpenAI } from '../services/openai.js'
import { tripAIChat, getRecommendations } from '../services/gemini-rapidapi.js'

function buildChatPrompt(message: string, context?: string, items?: any[]): string {
  const ctx = context ? `Current itinerary:\n${context}\n---\n` : ''
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

async function geminiDirect(prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function geminiChat(message: string, context?: string, items?: any[]): Promise<{ reply: string; actions: any[] }> {
  const prompt = buildChatPrompt(message, context, items)

  // Try direct Gemini first
  try {
    const text = await geminiDirect(prompt)
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      reply: parsed.reply || 'Oke!',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    }
  } catch (directErr) {
    console.warn('[AI/Chat] Direct Gemini failed, trying RapidAPI:', directErr instanceof Error ? directErr.message : String(directErr))
  }

  // Fallback to RapidAPI Gemini
  try {
    const result = await tripAIChat(message, context)
    return { reply: result.reply || 'Maaf, coba lagi ya.', actions: [] }
  } catch (rapidErr) {
    console.error('[AI/Chat] All providers failed:', rapidErr instanceof Error ? rapidErr.message : String(rapidErr))
    return { reply: 'Maaf, TripAI sedang tidak bisa membantu saat ini. Pastikan koneksi internet stabil.', actions: [] }
  }
}

const router = Router()

router.post('/generate-itinerary', async (req, res) => {
  try {
    const { destination, days, trip_type, budget, travelers, start_date, preferences } = req.body
    if (!destination || !days) {
      res.status(400).json({ message: 'destination and days are required' })
      return
    }

    const params = {
      destination,
      days: Number(days),
      trip_type,
      budget,
      travelers: travelers ? Number(travelers) : undefined,
      start_date,
      preferences,
    }

    let result: any = null

    // Try Gemini first
    try {
      result = await generateGemini(params)
      console.log('[AI] Used Gemini successfully')
    } catch (geminiErr: unknown) {
      const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
      console.warn('[AI] Gemini failed, falling back to OpenAI:', msg)

      // Fallback to OpenAI
      try {
        result = await generateItineraryOpenAI(params)
        console.log('[AI] Used OpenAI fallback successfully')
      } catch (openaiErr: unknown) {
        const openaiMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr)
        console.error('[AI] Both Gemini and OpenAI failed:', openaiMsg)
        throw new Error(`All AI providers failed. Gemini: ${msg}. OpenAI: ${openaiMsg}`)
      }
    }

    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    console.error('[AI/Generate]', message)
    res.status(500).json({ message })
  }
})

router.post('/recommendations', async (req, res) => {
  const { destination, tripType } = req.body
  if (!destination) {
    res.status(400).json({ message: 'destination is required' })
    return
  }
  try {
    const result = await getRecommendations(destination, tripType)
    res.json(result)
  } catch (err) {
    console.error('[AI/Recommendations]', err instanceof Error ? err.message : err)
    res.json({ places: [], restaurants: [], hidden_gems: [], local_tips: [] })
  }
})

router.post('/chat', async (req, res) => {
  const { message, context, items } = req.body
  if (!message) {
    res.status(400).json({ message: 'message is required' })
    return
  }
  try {
    const result = await geminiChat(message, context, items)
    res.json(result)
  } catch (err) {
    console.error('[AI/Chat]', err instanceof Error ? err.message : err)
    res.json({ reply: 'Maaf, TripAI sedang tidak bisa membantu saat ini.', actions: [] })
  }
})

export default router
