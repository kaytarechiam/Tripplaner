import { GoogleGenerativeAI } from '@google/generative-ai'

let _client: GoogleGenerativeAI | null = null

export function getGemini(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Gemini] Missing GEMINI_API_KEY')
    return null
  }
  if (!_client) {
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _client
}

export async function checkGemini(): Promise<boolean> {
  const client = getGemini()
  if (!client) return false
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent('Hello')
  return !!result.response.text()
}

// ─── Destination Info ─────────────────────────────────

export interface DestinationInfo {
  name: string
  country: string
  description: string
  best_season: string
  estimated_daily_budget: string
  highlights: string[]
  tips: string[]
  latitude?: number
  longitude?: number
}

export async function getDestinationInfo(place: string): Promise<DestinationInfo> {
  const client = getGemini()
  if (!client) {
    // Return mock data if Gemini not configured
    return getMockDestinationInfo(place)
  }

  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `Give me travel information about "${place}" in JSON format:
{
  "name": "City/Country name",
  "country": "Country",
  "description": "2-3 sentence description",
  "best_season": "Best months to visit",
  "estimated_daily_budget": "Daily budget estimate in USD",
  "highlights": ["Top 4 highlights"],
  "tips": ["3 practical tips"],
  "latitude": approximate_lat,
  "longitude": approximate_lng
}
Only JSON, no markdown.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(text)
  } catch {
    return getMockDestinationInfo(place)
  }
}

// ─── Itinerary Generation ─────────────────────────────────

export interface ItineraryParams {
  destination: string
  days: number
  trip_type?: string
  budget?: string
  travelers?: number
  start_date?: string
  preferences?: string
}

export interface GeneratedItinerary {
  itinerary: {
    day: number
    date: string
    items: {
      time: string
      title: string
      description: string
      location: string
      latitude?: number
      longitude?: number
      category: string
      duration_minutes: number
      estimated_cost?: string
      tips?: string
    }[]
  }[]
  summary: string
  total_estimated_budget: string
  best_season: string
}

export async function generateItinerary(params: ItineraryParams): Promise<GeneratedItinerary> {
  const client = getGemini()
  if (!client) throw new Error('Gemini API not configured')

  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `You are a professional travel planner AI. Generate a ${params.days}-day itinerary for ${params.destination}${params.trip_type ? ` (trip type: ${params.trip_type})` : ''}${params.budget ? ` with a ${params.budget} budget` : ''}${params.travelers ? ` for ${params.travelers} traveler(s)` : ''}${params.start_date ? ` starting from ${params.start_date}` : ''}${params.preferences ? `. Preferences: ${params.preferences}` : ''}.

For each day, provide 4-6 activities with time in HH:MM 24h format, specific place names, categories (hotel/landmark/food/nature/activity/shopping/transport), realistic durations in minutes, estimated costs in local currency, and helpful tips.

Return ONLY valid JSON with no markdown or extra text:
{"itinerary":[{"day":1,"date":"YYYY-MM-DD","items":[{"time":"09:00","title":"Activity name","description":"Why this is worth it","location":"Specific place name","latitude":0.0,"longitude":0.0,"category":"landmark","duration_minutes":120,"estimated_cost":"Rp 50,000","tips":"Helpful tip"}]}],"summary":"Trip summary paragraph","total_estimated_budget":"Rp X,XXX,XXX per person","best_season":"Best months to visit"}

IMPORTANT: Return ONLY the JSON object. No markdown formatting, no code blocks, no explanations.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Failed to parse Gemini response as JSON: ' + text.substring(0, 100))
  }
}

function getMockDestinationInfo(place: string): DestinationInfo {
  return {
    name: place,
    country: 'Indonesia',
    description: `${place} adalah destinasi wisata yang menakjubkan dengan budaya kaya dan alam yang indah.`,
    best_season: 'April - Oktober',
    estimated_daily_budget: 'Rp 500,000 - Rp 1,500,000',
    highlights: ['Pemandangan alam', 'Kuliner lokal', 'Budaya dan tradisi', 'Aktivitas outdoor'],
    tips: [
      'Bawa sunscreen dan topi',
      'Gunakan transportasi lokal untuk pengalaman lebih autentik',
      'Belajar beberapa frasa bahasa daerah',
    ],
  }
}
