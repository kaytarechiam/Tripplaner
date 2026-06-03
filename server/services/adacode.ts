// server/services/adacode.ts
// adaCODE — OpenAI-compatible API at https://api.adacode.ai
// Primary AI provider for TripPlanner (Sonnet / Qwen / MiniMax)

import OpenAI from 'openai'
import type { ItineraryParams, GeneratedItinerary } from './gemini.js'

// Config — all overridable via .env
const ADACODE_BASE_URL = process.env.ADACODE_BASE_URL || 'https://api.adacode.ai/v1'
const PRIMARY_MODEL    = process.env.ADACODE_MODEL    || 'claude-sonnet-4-6'
const FALLBACK_MODEL   = 'qwen-plus'   // used when primary hits quota

let _client: OpenAI | null = null

export function getAdaCode(): OpenAI | null {
  if (!process.env.ADACODE_API_KEY) {
    console.warn('[AdaCode] Missing ADACODE_API_KEY in .env')
    return null
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey:   process.env.ADACODE_API_KEY,
      baseURL:  ADACODE_BASE_URL,
    })
  }
  return _client
}

/** Quick connectivity check — returns true if key is valid */
export async function checkAdaCode(): Promise<boolean> {
  const client = getAdaCode()
  if (!client) return false
  try {
    const resp = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
    })
    return !!resp.choices[0]?.message?.content
  } catch {
    return false
  }
}

// ─── Shared helper ───────────────────────────────────────────
// SSE heartbeats keep Cloudflare alive, so we can wait up to 3 minutes
const REQUEST_TIMEOUT_MS = 180_000

async function chatComplete(
  client: OpenAI,
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[],
  maxTokens = 2048,
  retries = 1,
): Promise<string> {
  // Try primary model first, fall back to secondary on quota/rate/server errors
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const resp = await client.chat.completions.create(
        { model, messages, max_tokens: maxTokens, temperature: 0 },
        { signal: controller.signal as any },
      )
      clearTimeout(timer)
      const text = resp.choices[0]?.message?.content || ''
      if (text) {
        console.log(`[AdaCode] Responded via model: ${model}`)
        return text
      }
    } catch (err: any) {
      clearTimeout(timer)
      const msg: string = err?.message || String(err)
      const isAbort  = err?.name === 'AbortError' || msg.includes('abort') || msg.includes('signal')
      const isQuota  = msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')
      const isServer = msg.includes('500') || msg.includes('503') || msg.includes('canceled') || msg.includes('timeout')

      if (isAbort) {
        console.warn(`[AdaCode] ${model} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)
        throw new Error('AI request timed out — please try again')
      }
      if (isQuota && model === PRIMARY_MODEL) {
        console.warn(`[AdaCode] ${model} quota hit, trying ${FALLBACK_MODEL}...`)
        continue
      }
      if (isServer && retries > 0) {
        console.warn(`[AdaCode] ${model} server error (${msg.slice(0, 40)}), retrying in 2s...`)
        await new Promise(r => setTimeout(r, 2000))
        return chatComplete(client, messages, maxTokens, retries - 1)
      }
      throw err
    }
  }
  throw new Error('[AdaCode] All models exhausted')
}

// ─── Itinerary generation ─────────────────────────────────────

function buildBookingLinks(destination: string) {
  const q = encodeURIComponent(destination)
  return {
    traveloka_hotels:  `https://www.traveloka.com/en/hotels/search?query=${q}`,
    traveloka_flights: `https://www.traveloka.com/en/flights/search?query=${q}`,
    traveloka_trains:  `https://www.traveloka.com/en/trains/search?query=${q}`,
    tiket_hotels:      `https://www.tiket.com/search?query=${q}&type=hotel`,
    tiket_flights:     `https://www.tiket.com/search?query=${q}&type=flight`,
    tiket_trains:      `https://www.tiket.com/search?query=${q}&type=train`,
    agoda_hotels:      `https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?city=${q}`,
    booking_hotels:    `https://www.booking.com/search.html?ss=${q}`,
  }
}

export async function generateItineraryAdaCode(params: ItineraryParams): Promise<{
  destination: string
  trip_summary: string
  booking_links: Record<string, string>
  hotels: { name: string; category: string; estimated_price_idr: number; notes: string }[]
  itinerary: GeneratedItinerary['itinerary']
  summary: string
  total_estimated_budget: string
  best_season: string
}> {
  const client = getAdaCode()
  if (!client) throw new Error('AdaCode API not configured — set ADACODE_API_KEY in .env')

  const budgetRangeStr = params.min_budget && params.max_budget
    ? `\nBudget range per hari: Rp ${params.min_budget.toLocaleString('id-ID')} – Rp ${params.max_budget.toLocaleString('id-ID')}.`
    : ''
  const customNoteStr = params.custom_message
    ? `\nCatatan khusus dari user (wajib dipertimbangkan): ${params.custom_message}`
    : ''

  const prompt = `Generate a ${params.days}-day travel itinerary for ${params.destination}.\
${params.trip_type ? ` Style: ${params.trip_type}.` : ''}\
${params.travelers ? ` Travelers: ${params.travelers}.` : ''}\
${params.start_date ? ` Start: ${params.start_date}.` : ''}\
${params.preferences ? ` Preferences: ${params.preferences}.` : ''}${budgetRangeStr}${customNoteStr}

Rules: exactly 3 activities per day. No markdown, no explanation. Return ONLY valid JSON:
{"itinerary":[{"day":1,"date":"YYYY-MM-DD","items":[{"time":"09:00","title":"Place Name","description":"Why visit","location":"Address","latitude":0.0,"longitude":0.0,"category":"landmark","duration_minutes":90,"estimated_cost":"IDR 50000"}]}],"summary":"One sentence","total_estimated_budget":"IDR X/person","best_season":"Months"}`

  const text = await chatComplete(client, [{ role: 'user', content: prompt }], 2500)

  // Robust JSON extraction: strip markdown fences, then grab content between first { and last }
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  // Find the outermost JSON object (handles prefix/suffix text from the model)
  const firstBrace = cleaned.indexOf('{')
  const lastBrace  = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('[AdaCode] JSON parse failed. Length:', cleaned.length, '| Start:', cleaned.substring(0, 80))
    throw new Error('AdaCode returned invalid JSON — response may be truncated. Try again.')
  }

  if (!parsed.itinerary || !Array.isArray(parsed.itinerary)) {
    throw new Error('AdaCode returned invalid itinerary structure')
  }

  const bookingLinks = buildBookingLinks(params.destination)
  const hotelBudgetMap: Record<string, number> = {
    budget: 350_000, low: 300_000,
    moderate: 650_000, mid: 600_000,
    luxury: 1_200_000, high: 1_100_000,
  }
  const basePrice = hotelBudgetMap[params.budget || 'moderate'] ?? 650_000

  return {
    destination: params.destination,
    trip_summary: parsed.summary || '',
    booking_links: bookingLinks,
    hotels: [
      { name: `${params.destination} Budget Inn`,   category: 'budget',    estimated_price_idr: basePrice,       notes: 'Affordable, central location'     },
      { name: `${params.destination} City Hotel`,   category: 'mid-range', estimated_price_idr: basePrice * 1.5, notes: 'Great value, good amenities'       },
      { name: `${params.destination} Grand Resort`, category: 'premium',   estimated_price_idr: basePrice * 3,   notes: 'Luxury experience, top-rated'     },
    ],
    itinerary: parsed.itinerary,
    summary: parsed.summary || '',
    total_estimated_budget: parsed.total_estimated_budget || '',
    best_season: parsed.best_season || '',
  }
}

// ─── Chat (TripAI assistant) ──────────────────────────────────

export async function adaCodeChat(
  message: string,
  context?: string,
  items?: any[],
): Promise<{ reply: string; actions: any[] }> {
  const client = getAdaCode()
  if (!client) throw new Error('AdaCode API not configured')

  const ctx = context ? `Current itinerary:\n${context}\n---\n` : ''
  const itemsList = items?.length
    ? `\nExisting item IDs:\n${items.map((i: any) => `- id:"${i.id}" title:"${i.title}" day:${i.day} time:${i.time}`).join('\n')}\n---\n`
    : ''

  const systemPrompt = `You are TripAI — a friendly Indonesian travel assistant embedded in a trip planner app. You help users modify their itinerary.

${ctx}${itemsList}Rules:
- Always reply in Bahasa Indonesia, friendly & helpful tone, 1-3 sentences
- If user asks to ADD a place/hotel/restaurant/activity → include it in "actions" with type "add"
- If user asks to CHANGE/UPDATE an item → type "update" with existing itemId
- If user asks to DELETE/REMOVE an item → type "delete" with existing itemId
- If just asking for advice/info → actions = []
- category values: hotel, food, landmark, nature, activity, transport
- time format: "HH:MM"

Return ONLY valid JSON (no markdown, no code fences):
{
  "reply": "Friendly Indonesian response in 1-3 sentences",
  "actions": [
    {"type": "add", "item": {"title": "Name", "category": "food", "day": 1, "time": "12:00", "location": "Address", "latitude": null, "longitude": null, "notes": "...", "duration_minutes": 60}},
    {"type": "update", "itemId": "existing-uuid", "changes": {"time": "10:00", "notes": "Updated note"}},
    {"type": "delete", "itemId": "existing-uuid"}
  ]
}`

  const text = await chatComplete(client, [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: message },
  ], 1500)

  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace  = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  try {
    const parsed = JSON.parse(cleaned)
    return {
      reply:   parsed.reply   || 'Oke!',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    }
  } catch {
    // If JSON parse fails, return the text as a plain reply
    return { reply: text.slice(0, 300), actions: [] }
  }
}
