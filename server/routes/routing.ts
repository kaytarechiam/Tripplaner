// server/routes/routing.ts — OSRM road-routing proxy (free, no key needed)
import { Router } from 'express'
import axios from 'axios'

const router = Router()

// GET /api/routing/route?coords=lng1,lat1;lng2,lat2;...
// Proxies to OSRM public API — free, no API key required
router.get('/route', async (req, res) => {
  try {
    const { coords } = req.query
    if (!coords || typeof coords !== 'string') {
      res.status(400).json({ error: 'coords required. Format: lng1,lat1;lng2,lat2' })
      return
    }

    // OSRM public demo API — suitable for low-traffic dev/demo apps
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}`
    const response = await axios.get(url, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: 'false',
        annotations: 'false',
      },
      timeout: 12000,
    })

    const { code, routes } = response.data
    if (code !== 'Ok' || !routes?.length) {
      res.status(500).json({ error: 'Route not found', osrm_code: code })
      return
    }

    const route = routes[0]
    res.json({
      geometry: route.geometry, // GeoJSON LineString {type, coordinates: [[lng,lat],...]}
      legs: route.legs.map((leg: any) => ({
        distance: leg.distance,      // meters
        duration: leg.duration,      // seconds
        distance_km: (leg.distance / 1000).toFixed(1),
        duration_min: Math.round(leg.duration / 60),
      })),
      total_distance_km: (route.distance / 1000).toFixed(1),
      total_duration_min: Math.round(route.duration / 60),
    })
  } catch (err: any) {
    console.error('[routing/route]', err.message)
    res.status(500).json({ error: 'Routing failed', detail: err.message })
  }
})

export default router
