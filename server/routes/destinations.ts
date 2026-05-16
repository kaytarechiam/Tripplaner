import { Router } from 'express'
import { getDestinationInfo } from '../services/gemini.js'

const router = Router()

// GET /api/destinations/search?q=jakarta
// Uses OpenStreetMap Nominatim - completely free, no API key
router.get('/search', async (req, res) => {
  const q = req.query.q as string
  if (!q || q.length < 2) {
    res.json([])
    return
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8&accept-language=id,en`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TripPlanner/1.0 (https://tripplanner.app)',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`)
    }

    const data = await response.json() as Array<Record<string, unknown>>

    const results = data.map((item) => ({
      place_id: String(item.place_id),
      display_name: String(item.display_name || ''),
      lat: String(item.lat || ''),
      lon: String(item.lon || ''),
      type: String(item.type || ''),
      importance: Number(item.importance || 0),
      country: String((item.address as Record<string, unknown>)?.country || ''),
      city: String((item.address as Record<string, unknown>)?.city ||
             (item.address as Record<string, unknown>)?.town ||
             (item.address as Record<string, unknown>)?.state || ''),
    }))

    res.json(results)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed'
    console.error('[Destinations/Search]', message)
    res.json([]) // Return empty on error instead of 500 so UI doesn't break
  }
})

// GET /api/destinations/info?place=jakarta
router.get('/info', async (req, res) => {
  try {
    const place = req.query.place as string
    if (!place) {
      res.status(400).json({ message: 'place is required' })
      return
    }

    const info = await getDestinationInfo(place)
    res.json(info)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get destination info'
    console.error('[Destinations/Info]', message)
    res.status(500).json({ message })
  }
})

export default router