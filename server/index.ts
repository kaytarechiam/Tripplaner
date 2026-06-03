// ⚠️  env.ts MUST be first — loads dotenv before any service module initializes
import './env.js'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import aiRoutes from './routes/ai.js'
import weatherRoutes from './routes/weather.js'
import destinationRoutes from './routes/destinations.js'
import splitBillRoutes from './routes/split-bill.js'
import hotelRoutes from './routes/hotels.js'
import bookingRoutes from './routes/booking.js'
import priceRoutes from './routes/prices.js'
import rapidapiRoutes from './routes/rapidapi.js'
import routingRoutes from './routes/routing.js'
import imagesRoutes from './routes/images.js'
import { checkSupabase } from './services/supabase.js'
import { checkClaude } from './services/claude.js'
import { checkGemini } from './services/gemini.js'
import { checkOpenAI } from './services/openai.js'

const app = express()
const PORT = process.env.PORT || 3000
const IS_PROD = process.env.NODE_ENV === 'production'

// ─── Middleware ────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  // Cloudflare Tunnel — stei.cloud domains
  /^https:\/\/.*\.stei\.cloud$/,
  'https://smartcity18224022.stei.cloud',
  'https://tripplaner.stei.cloud',
  // Allow any *.workers.dev
  /^https:\/\/.*\.workers\.dev$/,
  // Allow trycloudflare (quick tunnel testing)
  /^https:\/\/.*\.trycloudflare\.com$/,
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    const allowed = allowedOrigins.some(o => {
      if (typeof o === 'string') return o === origin
      return o.test(origin)
    })
    if (allowed) return callback(null, true)
    callback(new Error(`CORS policy denied: ${origin}`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ─── Routes ──────────────────────────────────────────────
app.use('/api/ai', aiRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/destinations', destinationRoutes)
app.use('/api/split-bill', splitBillRoutes)
app.use('/api/hotels', hotelRoutes)
app.use('/api/booking', bookingRoutes)
app.use('/api/prices', priceRoutes)
app.use('/api/rapidapi', rapidapiRoutes)
app.use('/api/routing', routingRoutes)
app.use('/api/images', imagesRoutes)

// ─── Static Files (Production) ────────────────────────────
if (IS_PROD) {
  const distPath = path.resolve(process.cwd(), 'dist')
  app.use(express.static(distPath))
  // SPA fallback — serve index.html for unknown routes
  app.get(/(.*)/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const [supabaseOk, claudeOk, geminiOk, openaiOk] = await Promise.all([
    checkSupabase().then(() => true).catch(() => false),
    checkClaude().then(() => true).catch(() => false),
    checkGemini().then(() => true).catch(() => false),
    checkOpenAI().then(() => true).catch(() => false),
  ])

  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseOk,
      openai: claudeOk,
      gemini: geminiOk,
      openai_fallback: openaiOk,
      resend: !!process.env.RESEND_API_KEY,
    },
  })
})

// ─── 404 Handler (API only) ──────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// ─── Error Handler ───────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

// ─── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 TripPlanner running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  if (IS_PROD) console.log(`   Static: http://localhost:${PORT}/ (dist folder)\n`)
  else console.log(`   (dev mode — static files disabled)\n`)
})

export default app