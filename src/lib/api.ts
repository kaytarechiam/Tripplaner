const API_BASE = import.meta.env.VITE_API_BASE as string || ''

async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint

  // Attach Supabase JWT so server can verify the user
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  // Only call getSession if supabase is configured (otherwise getSession throws)
  let token: string | undefined
  try {
    const { getSession } = await import('./supabase')
    const session = await getSession()
    token = session?.access_token
  } catch {
    // Supabase not configured — proceed without token
    token = undefined
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ─── Types ──────────────────────────────────────────────

export interface GenerateItineraryPayload {
  destination: string
  days: number
  /** Kuliner/Alam/Budaya/Belanja/Petualangan — maps to trip_type internally */
  preferences?: string[]
  /** budget | moderate | luxury */
  budget?: 'budget' | 'moderate' | 'luxury'
  travelers?: number
  start_date?: string
  /** Legacy: comma-separated string (still supported) */
  preferences_raw?: string
  /** Custom message for AI prompt */
  customMessage?: string
  /** Min budget in IDR */
  minBudget?: number
  /** Max budget in IDR */
  maxBudget?: number
}

export interface GenerateItineraryResponse {
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

export interface WeatherData {
  date: string
  temp_max: number
  temp_min: number
  weather_code: number
  precipitation_probability: number
  description: string
  icon?: string
}

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

export interface AIRecommendations {
  places: string[]
  restaurants: string[]
  hidden_gems: string[]
  local_tips: string[]
}

export interface EmailSplitBillPayload {
  trip_name: string
  items: {
    description: string
    amount: number
    paid_by: string
    split_between: string[]
  }[]
  currency: string
  participant_emails?: string[]
}

export interface EmailSplitBillResponse {
  sent_count: number
  preview_html: string
  balances: {
    name: string
    owes: number
    owed: number
    net: number
  }[]
}

// ─── AI Itinerary Generator ──────────────────────────────

// Mapping frontend preferences array → backend trip_type string
const PREFERENCE_TO_TRIPTYPE: Record<string, string> = {
  culinary: 'food',
  nature: 'nature',
  culture: 'cultural',
  shopping: 'shopping',
  adventure: 'adventure',
}

// Mapping frontend budget label → backend budget enum
const BUDGET_LABEL_TO_ENUM: Record<string, string> = {
  Budget: 'budget',
  Menengah: 'moderate',
  Premium: 'luxury',
  Luxury: 'luxury',
}

export async function generateItinerary(
  payload: GenerateItineraryPayload
): Promise<GenerateItineraryResponse> {
  // Map preferences array → trip_type (take first selected preference as dominant type)
  const tripType = payload.preferences?.[0]
    ? PREFERENCE_TO_TRIPTYPE[payload.preferences[0]] || 'mixed'
    : undefined

  // Map budget label → enum
  const budgetEnum = payload.budget
    ? (BUDGET_LABEL_TO_ENUM[payload.budget] as 'budget' | 'moderate' | 'luxury' | undefined)
    : undefined

  // Map preferences array → comma-separated string for AI prompt
  const preferencesStr = payload.preferences?.join(', ') || payload.preferences_raw

  return apiFetch<GenerateItineraryResponse>('/api/ai/generate-itinerary', {
    method: 'POST',
    body: JSON.stringify({
      destination: payload.destination,
      days: payload.days,
      trip_type: tripType,
      budget: budgetEnum,
      travelers: payload.travelers,
      start_date: payload.start_date,
      preferences: preferencesStr,
      custom_message: payload.customMessage,
      min_budget: payload.minBudget,
      max_budget: payload.maxBudget,
    }),
  })
}

// ─── Weather API ───────────────────────────────────────

export async function getWeather(
  latitude: number,
  longitude: number,
  days = 7
): Promise<WeatherData[]> {
  return apiFetch<WeatherData[]>(`/api/weather?lat=${latitude}&lng=${longitude}&days=${days}`)
}

// ─── Split Bill Email ────────────────────────────────

export async function sendSplitBillEmail(
  payload: EmailSplitBillPayload
): Promise<EmailSplitBillResponse> {
  return apiFetch<EmailSplitBillResponse>('/api/split-bill/send-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ─── Destination Info ────────────────────────────────

export async function getDestinationInfo(
  place: string
): Promise<DestinationInfo> {
  return apiFetch<DestinationInfo>(`/api/destinations/info?place=${encodeURIComponent(place)}`)
}

// ─── Place Autocomplete (via backend proxy → OSM Nominatim) ───

export async function searchPlaces(
  query: string
): Promise<{
  place_id: string
  display_name: string
  lat: string
  lon: string
  type: string
  country?: string
  city?: string
}[]> {
  return apiFetch(`/api/destinations/search?q=${encodeURIComponent(query)}`)
}

// ─── AI Recommendations ──────────────────────────────

export async function getAIRecommendations(
  destination: string,
  tripType: string
): Promise<{
  places: string[]
  restaurants: string[]
  hidden_gems: string[]
  local_tips: string[]
}> {
  return apiFetch('/api/ai/recommendations', {
    method: 'POST',
    body: JSON.stringify({ destination, tripType }),
  })
}

// ─── Health Check ──────────────────────────────────

export async function checkAPIHealth(): Promise<{
  status: string
  version: string
  services: {
    supabase: boolean
    openai: boolean
    gemini: boolean
  }
}> {
  return apiFetch('/api/health')
}
