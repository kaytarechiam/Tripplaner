import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getClaude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Claude] Missing ANTHROPIC_API_KEY')
    return null
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export async function checkClaude(): Promise<boolean> {
  const client = getClaude()
  if (!client) return false
  // Simple models list call to verify API key works
  await client.models.list({})
  return true
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

export interface ItineraryDay {
  day: number
  date: string
  items: ItineraryItem[]
}

export interface ItineraryItem {
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
}

export interface GeneratedItinerary {
  itinerary: ItineraryDay[]
  summary: string
  total_estimated_budget: string
  best_season: string
}

export async function generateItinerary(params: ItineraryParams): Promise<GeneratedItinerary> {
  const client = getClaude()
  if (!client) throw new Error('Claude API not configured')

  const prompt = `You are a professional travel planner AI. Generate a detailed ${params.days}-day itinerary for ${params.destination}${params.trip_type ? ` (trip type: ${params.trip_type})` : ''}${params.budget ? ` with a ${params.budget} budget` : ''}${params.travelers ? ` for ${params.travelers} traveler(s)` : ''}${params.start_date ? ` starting from ${params.start_date}` : ''}${params.preferences ? `. Preferences: ${params.preferences}` : ''}.

For each day, provide 4-6 activities with:
- time (HH:MM format, 24h)
- title (name of place/activity)
- description (why this is worth doing, 1-2 sentences)
- location (specific place name in local language)
- category: one of hotel, landmark, food, nature, activity, shopping, transport
- duration_minutes (how long to spend there)
- estimated_cost (in local currency, be realistic)

Also include:
- A summary of the trip
- Total estimated budget breakdown
- Best season to visit

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "items": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Why visit this place",
          "location": "Full address or landmark",
          "latitude": 0.0,
          "longitude": 0.0,
          "category": "landmark",
          "duration_minutes": 120,
          "estimated_cost": "Rp 50,000",
          "tips": "Helpful tip for this stop"
        }
      ]
    }
  ],
  "summary": "One paragraph summary of the trip",
  "total_estimated_budget": "Rp 2,500,000 per person",
  "best_season": "October to March"
}

IMPORTANT: Only return the JSON. No preamble or explanation.`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}

// ─── Recommendations ───────────────────────────────────────

export async function getRecommendations(destination: string, tripType: string): Promise<{
  places: string[]
  restaurants: string[]
  hidden_gems: string[]
  local_tips: string[]
}> {
  const client = getClaude()
  if (!client) throw new Error('Claude API not configured')

  const prompt = `You are a local travel expert for ${destination}. Trip type: ${tripType}.
Give me recommendations for:
1. Top 5 must-visit places (with brief why)
2. Best local restaurants (2-3 recommendations)
3. 3 hidden gems most tourists miss
4. 4 practical local tips

Return ONLY valid JSON:
{
  "places": ["Place 1", "Place 2", "Place 3", "Place 4", "Place 5"],
  "restaurants": ["Restaurant 1", "Restaurant 2", "Restaurant 3"],
  "hidden_gems": ["Hidden gem 1", "Hidden gem 2", "Hidden gem 3"],
  "local_tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
}
Only return JSON, no markdown.`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return { places: [], restaurants: [], hidden_gems: [], local_tips: [] }
  }
}