// server/services/openai.ts
import OpenAI from 'openai'
import type { ItineraryParams } from './gemini.js'
import type { GeneratedItinerary } from './gemini.js'

let _client: OpenAI | null = null

export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[OpenAI] Missing OPENAI_API_KEY')
    return null
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export async function checkOpenAI(): Promise<boolean> {
  const client = getOpenAI()
  if (!client) return false
  try {
    const models = await client.models.list()
    return models.data.length > 0
  } catch {
    return false
  }
}

function buildBookingLinks(destination: string) {
  const q = encodeURIComponent(destination)
  return {
    traveloka_hotels: `https://www.traveloka.com/en/hotels/search?query=${q}`,
    traveloka_flights: `https://www.traveloka.com/en/flights/search?query=${q}`,
    traveloka_trains: `https://www.traveloka.com/en/trains/search?query=${q}`,
    tiket_hotels: `https://www.tiket.com/search?query=${q}&type=hotel`,
    tiket_flights: `https://www.tiket.com/search?query=${q}&type=flight`,
    tiket_trains: `https://www.tiket.com/search?query=${q}&type=train`,
    agoda_hotels: `https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?city=${q}`,
    booking_hotels: `https://www.booking.com/search.html?ss=${q}`,
  }
}

export async function generateItineraryOpenAI(params: ItineraryParams): Promise<{
  destination: string
  trip_summary: string
  booking_links: Record<string, string>
  hotels: { name: string; category: string; estimated_price_idr: number; notes: string }[]
  itinerary: GeneratedItinerary['itinerary']
  summary: string
  total_estimated_budget: string
  best_season: string
}> {
  const client = getOpenAI()
  if (!client) throw new Error('OpenAI API not configured')

  const prompt = `You are a professional travel planner AI. Generate a ${params.days}-day itinerary for ${params.destination}${params.trip_type ? ` (trip type: ${params.trip_type})` : ''}${params.budget ? ` with a ${params.budget} budget` : ''}${params.travelers ? ` for ${params.travelers} traveler(s)` : ''}${params.start_date ? ` starting from ${params.start_date}` : ''}${params.preferences ? `. Preferences: ${params.preferences}` : ''}.

For each day, provide 4-6 activities with time (HH:MM 24h), title, description (1-2 sentences), location (specific place name), category (hotel/landmark/food/nature/activity/shopping/transport), duration_minutes, estimated_cost (local currency), and tips.

Return ONLY valid JSON, no markdown:
{"itinerary":[{"day":1,"date":"YYYY-MM-DD","items":[{"time":"09:00","title":"Activity","description":"Why visit","location":"Place name","latitude":0.0,"longitude":0.0,"category":"landmark","duration_minutes":120,"estimated_cost":"Rp 50.000","tips":"Helpful tip"}]}],"summary":"Trip summary","total_estimated_budget":"Rp X.XXX.XXX per person","best_season":"Best months"}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
    temperature: 0.7,
  })

  const text = response.choices[0]?.message?.content || ''
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse OpenAI response as JSON: ' + cleaned.substring(0, 100))
  }

  // Validate required fields exist
  if (!parsed.itinerary || !Array.isArray(parsed.itinerary)) {
    throw new Error('OpenAI returned invalid itinerary structure')
  }

  const bookingLinks = buildBookingLinks(params.destination)
  const hotelBudgetMap: Record<string, number> = {
    budget: 350000, moderate: 650000, luxury: 1200000,
    low: 300000, mid: 600000, high: 1100000,
  }
  const budget = params.budget || 'moderate'
  const basePrice = hotelBudgetMap[budget] || 650000

  return {
    destination: params.destination,
    trip_summary: parsed.summary || '',
    booking_links: bookingLinks,
    hotels: [
      { name: `${params.destination} Budget Inn`, category: 'budget', estimated_price_idr: basePrice, notes: 'Affordable, central location' },
      { name: `${params.destination} City Hotel`, category: 'mid-range', estimated_price_idr: basePrice * 1.5, notes: 'Good amenities, great value' },
      { name: `${params.destination} Grand Resort`, category: 'premium', estimated_price_idr: basePrice * 3, notes: 'Luxury experience, top-rated' },
    ],
    itinerary: parsed.itinerary || [],
    summary: parsed.summary || '',
    total_estimated_budget: parsed.total_estimated_budget || '',
    best_season: parsed.best_season || '',
  }
}
