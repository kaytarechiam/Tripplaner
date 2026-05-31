// server/routes/images.ts — Google Image Search via RapidAPI
import { Router } from 'express'
import axios from 'axios'

const router = Router()

// GET /api/images/search?q=Bali+temple
router.get('/search', async (req, res) => {
  const { q } = req.query
  if (!q) {
    res.status(400).json({ error: 'q is required' })
    return
  }

  const apiKey = process.env.RAPIDAPI_GOOGLE_KEY
  const host = process.env.RAPIDAPI_GOOGLE_HOST || 'google-api31.p.rapidapi.com'

  if (!apiKey) {
    res.json({ query: q, images: [], isMock: true })
    return
  }

  // Try multiple endpoint paths that different Google-wrapper APIs on RapidAPI use
  const endpoints = ['/imagesearch', '/search/images', '/v1/imagesearch', '/search']

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`https://${host}${endpoint}`, {
        params: { q, hl: 'id', gl: 'id', num: 6 },
        headers: {
          'x-rapidapi-host': host,
          'x-rapidapi-key': apiKey,
        },
        timeout: 8000,
      })

      const raw = response.data
      let rawImages: any[] = []

      // Handle various response formats
      if (Array.isArray(raw)) rawImages = raw
      else if (Array.isArray(raw.images)) rawImages = raw.images
      else if (Array.isArray(raw.items)) rawImages = raw.items
      else if (Array.isArray(raw.image_results)) rawImages = raw.image_results
      else if (raw.data && Array.isArray(raw.data.images)) rawImages = raw.data.images

      if (rawImages.length > 0) {
        const images = rawImages.slice(0, 6).map((img: any) => ({
          url: img.url || img.original || img.link || img.imageUrl || img.image?.url,
          thumbnail: img.thumbnail?.src || img.thumbnailLink || img.thumbnail || img.url || img.link,
          title: img.title || String(q),
        })).filter((img: any) => img.url)

        res.json({ query: q, images })
        return
      }
    } catch {
      // Try next endpoint
      continue
    }
  }

  // If all endpoints failed, return empty
  res.json({ query: q, images: [] })
})

export default router
