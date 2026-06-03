// server/env.ts
// MUST be the first import in index.ts so env vars are available
// to all service modules when they initialize.
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load root .env first, then server/.env (server/.env takes precedence)
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true })

// Confirm critical keys are loaded
const adaLoaded  = !!process.env.ADACODE_API_KEY
const geminiLoaded = !!process.env.GEMINI_API_KEY

console.log('[env] Loaded — adaCODE:', adaLoaded ? '✅' : '❌', '| Gemini:', geminiLoaded ? '✅' : '❌')
