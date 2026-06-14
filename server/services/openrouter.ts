// server/services/openrouter.ts
// OpenRouter — OpenAI-compatible aggregator, hundreds of models including free ones.
// Free models: meta-llama/llama-3.3-70b-instruct:free, google/gemini-2.0-flash-exp:free, etc.

import OpenAI from 'openai'
import type { ItineraryParams, GeneratedItinerary } from './gemini.js'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Free models — primary is GPT OSS 120B (solid JSON output), fallback to Llama 70B
const PRIMARY_MODEL   = process.env.OPENROUTER_MODEL   || 'openai/gpt-oss-120b:free'
const FALLBACK_MODEL  = 'meta-llama/llama-3.3-70b-instruct:free'

let _client: OpenAI | null = null

export function getOpenRouter(): OpenAI | null {
  if (!process.env.OPENROUTER_API_KEY) return null
  if (!_client) {
    _client = new OpenAI({
      apiKey:  process.env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': 'https://tripplaner.stei.cloud',
        'X-Title':      'TripPlanner',
      },
    })
  }
  return _client
}

export async function checkOpenRouter(): Promise<boolean> {
  const client = getOpenRouter()
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

// ─── Shared helper ────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 120_000

async function chatComplete(
  client: OpenAI,
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[],
  maxTokens = 2500,
): Promise<string> {
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
        console.log(`[OpenRouter] Responded via model: ${model}`)
        return text
      }
    } catch (err: any) {
      clearTimeout(timer)
      const msg: string = err?.message || String(err)
      const isAbort = err?.name === 'AbortError' || msg.includes('abort')
      const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')

      if (isAbort) throw new Error('OpenRouter request timed out — coba lagi')
      if (isQuota && model === PRIMARY_MODEL) {
        console.warn(`[OpenRouter] ${model} rate limited, trying ${FALLBACK_MODEL}...`)
        continue
      }
      throw err
    }
  }
  throw new Error('[OpenRouter] All models exhausted')
}

// ─── Helper untuk build booking links ─────────────────────────
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

// ─── Itinerary generation ──────────────────────────────────────
export async function generateItineraryOpenRouter(params: ItineraryParams): Promise<{
  destination: string
  trip_summary: string
  booking_links: Record<string, string>
  hotels: { name: string; category: string; estimated_price_idr: number; notes: string }[]
  itinerary: GeneratedItinerary['itinerary']
  summary: string
  total_estimated_budget: string
  best_season: string
}> {
  const client = getOpenRouter()
  if (!client) throw new Error('OpenRouter API not configured — set OPENROUTER_API_KEY in .env')

  const budgetRangeStr = params.min_budget && params.max_budget
    ? `\nBudget range per hari: Rp ${params.min_budget.toLocaleString('id-ID')} – Rp ${params.max_budget.toLocaleString('id-ID')}.`
    : ''
  const customNoteStr = params.custom_message
    ? `\nIMPORTANT special request (must be followed): ${params.custom_message}`
    : ''

  const dayList = Array.from({ length: params.days }, (_, i) => `day ${i + 1}`).join(', ')

  const prompt = `Generate a ${params.days}-day travel itinerary for ${params.destination}.\
${params.trip_type ? ` Style: ${params.trip_type}.` : ''}\
${params.travelers ? ` Travelers: ${params.travelers}.` : ''}\
${params.start_date ? ` Start date: ${params.start_date}.` : ''}\
${params.preferences ? ` Preferences: ${params.preferences}.` : ''}${budgetRangeStr}${customNoteStr}

CRITICAL RULES:
- You MUST generate EXACTLY ${params.days} days: ${dayList}
- Each day MUST have exactly 3 activities
- Do NOT stop early — the itinerary array MUST contain ${params.days} objects
- No markdown, no explanation. Return ONLY valid JSON

JSON structure (repeat for ALL ${params.days} days):
{"itinerary":[{"day":1,"date":"YYYY-MM-DD","items":[{"time":"09:00","title":"Place Name","description":"Why visit","location":"Address","latitude":0.0,"longitude":0.0,"category":"landmark","duration_minutes":90,"estimated_cost":"IDR 50000"},{"time":"12:00","title":"Place 2","description":"Why","location":"Address","latitude":0.0,"longitude":0.0,"category":"food","duration_minutes":60,"estimated_cost":"IDR 30000"},{"time":"15:00","title":"Place 3","description":"Why","location":"Address","latitude":0.0,"longitude":0.0,"category":"landmark","duration_minutes":90,"estimated_cost":"IDR 25000"}]},{"day":2,"date":"YYYY-MM-DD","items":[...3 items...]}],"summary":"One sentence","total_estimated_budget":"IDR X/person","best_season":"Months"}`

  const text = await chatComplete(client, [{ role: 'user', content: prompt }])

  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  const lastBrace  = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[OpenRouter] JSON parse failed. Start:', cleaned.substring(0, 80))
    throw new Error('OpenRouter returned invalid JSON — coba lagi.')
  }

  if (!parsed.itinerary || !Array.isArray(parsed.itinerary)) {
    throw new Error('OpenRouter returned invalid itinerary structure')
  }

  // Validate day count — throw so the route can retry with next provider
  if (parsed.itinerary.length < params.days) {
    console.warn(`[OpenRouter] Expected ${params.days} days, got ${parsed.itinerary.length}`)
    if (parsed.itinerary.length < Math.ceil(params.days * 0.7)) {
      throw new Error(`OpenRouter only generated ${parsed.itinerary.length} of ${params.days} days — retrying`)
    }
  }

  const hotelBudgetMap: Record<string, number> = {
    budget: 350_000, low: 300_000,
    moderate: 650_000, mid: 600_000,
    luxury: 1_200_000, high: 1_100_000,
  }
  const basePrice = hotelBudgetMap[params.budget || 'moderate'] ?? 650_000

  return {
    destination: params.destination,
    trip_summary: parsed.summary || '',
    booking_links: buildBookingLinks(params.destination),
    hotels: [
      { name: `${params.destination} Budget Inn`,   category: 'budget',    estimated_price_idr: basePrice,       notes: 'Affordable, central location' },
      { name: `${params.destination} City Hotel`,   category: 'mid-range', estimated_price_idr: basePrice * 1.5, notes: 'Great value, good amenities'   },
      { name: `${params.destination} Grand Resort`, category: 'premium',   estimated_price_idr: basePrice * 3,   notes: 'Luxury experience, top-rated'  },
    ],
    itinerary: parsed.itinerary,
    summary: parsed.summary || '',
    total_estimated_budget: parsed.total_estimated_budget || '',
    best_season: parsed.best_season || '',
  }
}

// ─── Chat (TripAI assistant) ───────────────────────────────────
export async function openRouterChat(
  message: string,
  context?: string,
  items?: any[],
): Promise<{ reply: string; actions: any[] }> {
  const client = getOpenRouter()
  if (!client) throw new Error('OpenRouter API not configured')

  const ctx       = context ? `Current itinerary:\n${context}\n---\n` : ''
  const itemsList = items?.length
    ? `\nExisting item IDs:\n${items.map((i: any) => `- id:"${i.id}" title:"${i.title}" day:${i.day} time:${i.time}`).join('\n')}\n---\n`
    : ''

  const systemPrompt = `You are TripAI — a friendly Indonesian travel assistant embedded in a trip planner app.

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
  ], 1000)

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
    return { reply: text.slice(0, 300), actions: [] }
  }
}
