// server/routes/ai.ts
import { Router } from 'express'
import { generateItinerary as generateGemini } from '../services/gemini.js'
import { generateItineraryOpenAI } from '../services/openai.js'
import { tripAIChat, getRecommendations } from '../services/gemini-rapidapi.js'

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
  const { message, context } = req.body
  if (!message) {
    res.status(400).json({ message: 'message is required' })
    return
  }
  try {
    const result = await tripAIChat(message, context)
    res.json(result)
  } catch (err) {
    console.error('[AI/Chat]', err instanceof Error ? err.message : err)
    res.json({ reply: 'Maaf, TripAI sedang tidak bisa membantu saat ini.' })
  }
})

export default router
