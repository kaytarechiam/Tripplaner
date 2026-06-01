import axios from 'axios'

// RapidAPI Gemini Pro endpoint — uses own API key via RapidAPI
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_GEMINI_KEY || process.env.RAPIDAPI_API_KEY || ''
const RAPIDAPI_HOST = 'gemini-pro-ai.p.rapidapi.com'

async function geminiGenerate(prompt: string): Promise<string> {
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_API_KEY not configured in server/.env')
  }

  const response = await axios.post(
    'https://gemini-pro-ai.p.rapidapi.com/',
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    },
    {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

function extractJSON(text: string): string {
  return text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
}

// Build smart booking platform links per category
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

// Parse time slot from hour index
function slotTime(dayIndex: number, slotIndex: number): { time: string; duration_minutes: number } {
  const hours = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00', '21:00',
  ]
  return {
    time: hours[slotIndex % hours.length],
    duration_minutes: 60,
  }
}

// ─── generateItinerary ─────────────────────────────────────────────────────────
export async function generateItinerary(params: {
  destination: string
  days: number
  trip_type?: string
  budget?: string
  travelers?: number
  start_date?: string
  preferences?: string
}) {
  const { destination, days, trip_type, budget, travelers, start_date, preferences } = params

  const typeHint = trip_type
    ? `Trip type: ${trip_type}. `
    : ''
  const budgetHint = budget
    ? `Budget level: ${budget}. `
    : ''
  const travelerHint = travelers
    ? `For ${travelers} traveler(s). `
    : ''
  const dateHint = start_date
    ? `Starting: ${start_date}. `
    : ''

  const prompt = `You are TripPlanner AI — a professional travel itinerary generator.
Destination: ${destination}
Duration: ${days} day(s).
${typeHint}${budgetHint}${travelerHint}${dateHint}
${preferences ? `User preferences: ${preferences}` : ''}

Generate a detailed day-by-day itinerary. For each day, include 4-6 items: morning, midday, afternoon, evening activities.
Also recommend 2 hotels per destination category (budget/mid-range/premium) with estimated nightly prices in IDR.
Also recommend 2-3 restaurants per day with price ranges in IDR.

IMPORTANT: Return ONLY valid JSON (no markdown, no explanation), format:
{
  "destination": "${destination}",
  "trip_summary": "2-sentence trip overview",
  "booking_links": {
    "traveloka_hotels": "https://www.traveloka.com/en/hotels/search?query=${destination}",
    "traveloka_flights": "https://www.traveloka.com/en/flights/search?query=${destination}",
    "tiket_hotels": "https://www.tiket.com/search?query=${destination}&type=hotel",
    "agoda_hotels": "https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?city=${destination}",
    "booking_hotels": "https://www.booking.com/search.html?ss=${destination}"
  },
  "hotels": [
    {"name": "...", "category": "budget|mid-range|premium", "estimated_price_idr": 350000, "notes": "..."},
    ...
  ],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD or day description",
      "items": [
        {
          "time": "07:00",
          "duration_minutes": 120,
          "title": "Activity name",
          "category": "activity|food|nature|landmark|shopping|hotel",
          "location": "Specific location in ${destination}",
          "latitude": -8.5,
          "longitude": 115.2,
          "description": "What to do",
          "estimated_cost": 50000,
          "currency": "IDR",
          "tips": "Practical tip"
        }
      ]
    }
  ]
}

Rules:
- Use real place names in ${destination}
- time in HH:MM format
- coordinates should be plausible (near ${destination})
- category must be: activity, food, nature, landmark, shopping, or hotel
- estimated_cost in IDR (no decimals)
- Include a mix: landmarks, food, nature, local experiences
- Total 4-6 items per day
- For hotel category items, include: "is_hotel_recommendation": true and "booking_urls": ["traveloka", "agoda", "booking"]
- For food items, include: "restaurant_tips": "price range like Rp 50.000-150.000"
- Make itinerary realistic and travel-feasible`

  const raw = await geminiGenerate(prompt)
  const text = extractJSON(raw)

  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    // fallback minimal structure
    return {
      destination,
      days,
      booking_links: buildBookingLinks(destination),
      hotels: [],
      itinerary: Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        items: [],
      })),
      raw: raw.substring(0, 500),
    }
  }

  // Normalise shape to what frontend expects
  const bookingLinks = parsed.booking_links || buildBookingLinks(destination)
  const hotels = parsed.hotels || []

  const itinerary = (parsed.days || []).map((day: any, di: number) => {
    const items = (day.items || []).map((item: any, si: number) => {
      const { time: rawTime, duration_minutes, ...rest } = item
      const slot = slotTime(di, si)
      return {
        time: rawTime || slot.time,
        duration_minutes: duration_minutes || slot.duration_minutes,
        ...rest,
      }
    })
    return { day: day.day || di + 1, items }
  })

  return { destination, trip_summary: parsed.trip_summary || '', booking_links: bookingLinks, hotels, itinerary }
}

// ─── getRecommendations ────────────────────────────────────────────────────────
export async function getRecommendations(destination: string, tripType?: string) {
  const typeHint = tripType ? ` Trip type: ${tripType}.` : ''

  const prompt = `You are a local travel expert for ${destination}.${typeHint}
Return ONLY valid JSON (no markdown):
{
  "places": ["Top 5 must-visit places in ${destination}"],
  "restaurants": ["3 best local restaurants in ${destination}"],
  "hidden_gems": ["3 hidden gems tourists miss in ${destination}"],
  "local_tips": ["4 practical tips for ${destination}"]
}`

  const raw = await geminiGenerate(prompt)
  const text = extractJSON(raw)

  try {
    return JSON.parse(text)
  } catch {
    return {
      places: [`${destination} Downtown`, `${destination} Old Town`, `${destination} Beach`],
      restaurants: [`Local Eats ${destination}`, `Cafe ${destination}`, `Street Food ${destination}`],
      hidden_gems: [`Hidden Spot ${destination}`, `Secret Alley ${destination}`],
      local_tips: [`Best time to visit: early morning`, `Try local transport`],
    }
  }
}

// ─── tripAIChat ───────────────────────────────────────────────────────────────
export async function tripAIChat(message: string, context?: string) {
  const ctx = context
    ? `Current itinerary:\n${context}\n---\n`
    : ''

  const prompt = `You are TripAI — a helpful Indonesian travel assistant.

${ctx}
User: ${message}

Guidelines:
- Respond in Indonesian (Bahasa Indonesia)
- Be specific and actionable (numbered suggestions)
- Max 3 suggestions
- Focus on practical tips (time, routing, budget, local tips)
- If itinerary is empty, suggest what to do first

Return ONLY valid JSON:
{"reply": "your response in Indonesian, max 3 numbered points"}`

  const raw = await geminiGenerate(prompt)
  const text = extractJSON(raw)

  try {
    return JSON.parse(text)
  } catch {
    return { reply: `Maaf, TripAI belum bisa menjawab saat ini. Coba lagi dalam beberapa saat.` }
  }
}