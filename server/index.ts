import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import aiRoutes from './routes/ai.js'
import weatherRoutes from './routes/weather.js'
import destinationRoutes from './routes/destinations.js'
import splitBillRoutes from './routes/split-bill.js'
import { checkSupabase } from './services/supabase.js'
import { checkClaude } from './services/claude.js'
import { checkGemini } from './services/gemini.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ─── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
  ],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ─── Routes ──────────────────────────────────────────────
app.use('/api/ai', aiRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/destinations', destinationRoutes)
app.use('/api/split-bill', splitBillRoutes)

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const [supabaseOk, claudeOk, geminiOk] = await Promise.all([
    checkSupabase().then(() => true).catch(() => false),
    checkClaude().then(() => true).catch(() => false),
    checkGemini().then(() => true).catch(() => false),
  ])

  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseOk,
      openai: claudeOk,
      gemini: geminiOk,
    },
  })
})

// ─── 404 Handler ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// ─── Error Handler ───────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

// ─── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 TripPlanner API running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health\n`)
})

export default app