import { Router } from 'express'
import { searchHotelsBooking, searchHotelsAgoda, searchHotelsTripAdvisor, searchHotelsAll, searchFlightsRapidAPI } from '../services/rapidapi.js'

const router = Router()

// GET /api/rapidapi/hotels?query=Bali
router.get('/hotels', async (req, res) => {
  const { query, city } = req.query
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query required' })
  }

  const result = await searchHotelsAll(query)
  res.json(result)
})

// GET /api/rapidapi/flights?query=Jakarta-Bali
router.get('/flights', async (req, res) => {
  const { query } = req.query
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query required' })
  }

  const result = await searchFlightsRapidAPI(query)
  res.json(result)
})

export default router