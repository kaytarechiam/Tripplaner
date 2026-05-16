import { Router } from 'express'
import { generateItinerary } from '../services/gemini.js'

const router = Router()

// POST /api/ai/generate-itinerary
router.post('/generate-itinerary', async (req, res) => {
  try {
    const { destination, days, trip_type, budget, travelers, start_date, preferences } = req.body

    if (!destination || !days) {
      res.status(400).json({ message: 'destination and days are required' })
      return
    }

    const result = await generateItinerary({
      destination,
      days: Number(days),
      trip_type,
      budget,
      travelers: travelers ? Number(travelers) : undefined,
      start_date,
      preferences,
    })

    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    console.error('[AI/Generate]', message)
    res.status(500).json({ message })
  }
})

// POST /api/ai/recommendations
// Uses Gemini instead of Claude — Gemini API key is configured
router.post('/recommendations', async (req, res) => {
  const { destination, tripType } = req.body

  if (!destination) {
    res.status(400).json({ message: 'destination is required' })
    return
  }

  // Fallback mock data (used when Gemini fails or not configured)
  const getMock = () => ({
    places: [`${destination} Downtown`, `${destination} Old Town`, `${destination} Nature Park`, `${destination} Beach`, `${destination} Market`],
    restaurants: [`Local Eats ${destination}`, `Street Food ${destination}`, `Cafe ${destination}`],
    hidden_gems: [`Secret Viewpoint ${destination}`, `Hidden Alley ${destination}`, `Local Market ${destination}`],
    local_tips: [
      `Best time to visit ${destination} is early morning`,
      `Try local transportation for authentic experience`,
      `Learn basic local phrases — locals appreciate it`,
      `Keep small change for small vendors`,
    ],
  })

  try {
    const { getGemini } = await import('../services/gemini.js')
    const client = getGemini()

    if (!client) {
      res.json(getMock())
      return
    }

    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const prompt = `You are a local travel expert for ${destination}${tripType ? ` (trip type: ${tripType})` : ''}.
Give me recommendations in JSON format:
{
  "places": ["Top 5 must-visit places"],
  "restaurants": ["3 best local restaurants"],
  "hidden_gems": ["3 hidden gems tourists miss"],
  "local_tips": ["4 practical local tips"]
}
Only JSON, no markdown.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    const parsed = JSON.parse(text)
    res.json(parsed)
  } catch (err) {
    console.error('[AI/Recommendations]', err instanceof Error ? err.message : err)
    res.json(getMock())
  }
})

export default router