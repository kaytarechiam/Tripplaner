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
async function chatComplete(
  client: OpenAI,
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[],
  maxTokens = 4096,
): Promise<string> {
  // Try primary model first, fall back to secondary on quota/rate errors
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const resp = await client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      })
      const text = resp.choices[0]?.message?.content || ''
      if (text) {
        console.log(`[AdaCode] Responded via model: ${model}`)
        return text
      }
    } catch (err: any) {
      const msg: string = err?.message || String(err)
      const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('rate')
      if (isQuota && model === PRIMARY_MODEL) {
        console.warn(`[AdaCode] ${model} quota hit, trying ${FALLBACK_MODEL}...`)
        continue
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

  const prompt = `You are a professional travel planner AI specializing in Indonesian and Southeast Asian travel.
Generate a ${params.days}-day detailed itinerary for ${params.destination}\
${params.trip_type ? ` (trip type: ${params.trip_type})` : ''}\
${params.budget ? ` with a ${params.budget} budget` : ''}\
${params.travelers ? ` for ${params.travelers} traveler(s)` : ''}\
${params.start_date ? ` starting from ${params.start_date}` : ''}\
${params.preferences ? `. Special preferences: ${params.preferences}` : ''}.

For each day provide 4-6 activities. Each activity must have:
- time (HH:MM 24-hour format)
- title (specific place/activity name)
- description (1-2 sentences, why it's worth visiting)
- location (full specific address or area)
- latitude & longitude (accurate coordinates — IMPORTANT)
- category: one of hotel/landmark/food/nature/activity/shopping/transport
- duration_minutes (realistic)
- estimated_cost (in local currency, e.g. "Rp 50.000" or "Free")
- tips (one practical tip)

Return ONLY valid JSON — no markdown, no code fences, no explanation:
{"itinerary":[{"day":1,"date":"YYYY-MM-DD","items":[{"time":"09:00","title":"Place Name","description":"Why visit","location":"Specific address","latitude":-8.409518,"longitude":115.188919,"category":"landmark","duration_minutes":120,"estimated_cost":"Rp 50.000","tips":"Practical tip"}]}],"summary":"2-3 sentence trip overview","total_estimated_budget":"Rp X.XXX.XXX per person","best_season":"Best months to visit"}`

  const text = await chatComplete(client, [{ role: 'user', content: prompt }], 6000)
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AdaCode returned invalid JSON: ' + cleaned.substring(0, 120))
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
  ], 1024)

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
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
