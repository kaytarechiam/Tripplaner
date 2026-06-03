import { GoogleGenerativeAI } from "@google/generative-ai";

// Use gemini-2.0-flash — stable GA model (2.5-flash is preview and frequently overloaded)
const GEMINI_MODEL = "gemini-2.0-flash";

let _client: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[Gemini] Missing GEMINI_API_KEY");
    return null;
  }
  if (!_client) {
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _client;
}

// Retry helper — retries once after 2s for 503 Service Unavailable
async function generateWithRetry(
  client: GoogleGenerativeAI,
  prompt: string,
  retries = 1,
): Promise<string> {
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    const msg: string = err?.message || String(err);
    const is503 = msg.includes("503") || msg.includes("Service Unavailable");
    if (retries > 0 && is503) {
      console.warn(`[Gemini] 503 — retrying in 2s... (${retries} left)`);
      await new Promise((r) => setTimeout(r, 2000));
      return generateWithRetry(client, prompt, retries - 1);
    }
    throw err;
  }
}

export async function checkGemini(): Promise<boolean> {
  const client = getGemini();
  if (!client) return false;
  try {
    const text = await generateWithRetry(client, "Hello");
    return !!text;
  } catch {
    return false;
  }
}

// ─── Destination Info ─────────────────────────────────

export interface DestinationInfo {
  name: string;
  country: string;
  description: string;
  best_season: string;
  estimated_daily_budget: string;
  highlights: string[];
  tips: string[];
  latitude?: number;
  longitude?: number;
}

export async function getDestinationInfo(
  place: string,
): Promise<DestinationInfo> {
  const client = getGemini();
  if (!client) return getMockDestinationInfo(place);

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
Only JSON, no markdown.`;

  try {
    const text = (await generateWithRetry(client, prompt))
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(text);
  } catch {
    return getMockDestinationInfo(place);
  }
}

// ─── Itinerary Generation ─────────────────────────────────

export interface ItineraryParams {
  destination: string;
  days: number;
  trip_type?: string;
  budget?: string;
  travelers?: number;
  start_date?: string;
  preferences?: string;
  custom_message?: string;
  min_budget?: number;
  max_budget?: number;
}

export interface GeneratedItinerary {
  itinerary: {
    day: number;
    date: string;
    items: {
      time: string;
      title: string;
      description: string;
      location: string;
      latitude?: number;
      longitude?: number;
      category: string;
      duration_minutes: number;
      estimated_cost?: string;
      tips?: string;
    }[];
  }[];
  summary: string;
  total_estimated_budget: string;
  best_season: string;
}

export async function generateItinerary(
  params: ItineraryParams,
): Promise<GeneratedItinerary> {
  const client = getGemini();
  if (!client) throw new Error("Gemini API not configured");

  const budgetRangeStr = params.min_budget && params.max_budget
    ? ` Budget harian: Rp ${params.min_budget.toLocaleString('id-ID')} – Rp ${params.max_budget.toLocaleString('id-ID')}.`
    : ''
  const customNoteStr = params.custom_message ? ` Catatan khusus dari user: ${params.custom_message}.` : ''

  const prompt = `You are a professional travel planner AI. Generate a ${params.days}-day itinerary for ${params.destination}${params.trip_type ? ` (trip type: ${params.trip_type})` : ""}${params.budget ? ` with a ${params.budget} budget` : ""}${params.travelers ? ` for ${params.travelers} traveler(s)` : ""}${params.start_date ? ` starting from ${params.start_date}` : ""}${params.preferences ? `. Preferences: ${params.preferences}` : ""}.${budgetRangeStr}${customNoteStr}

For each day, provide 4-6 activities with time in HH:MM 24h format, specific place names, categories (hotel/landmark/food/nature/activity/shopping/transport), realistic durations in minutes, estimated costs in local currency, and helpful tips.

Return ONLY valid JSON with no markdown or extra text:
{"itinerary":[{"day":1,"date":"YYYY-MM-DD","items":[{"time":"09:00","title":"Activity name","description":"Why this is worth it","location":"Specific place name","latitude":0.0,"longitude":0.0,"category":"landmark","duration_minutes":120,"estimated_cost":"Rp 50,000","tips":"Helpful tip"}]}],"summary":"Trip summary paragraph","total_estimated_budget":"Rp X,XXX,XXX per person","best_season":"Best months to visit"}

IMPORTANT: Return ONLY the JSON object. No markdown formatting, no code blocks, no explanations.`;

  const text = (await generateWithRetry(client, prompt, 2))
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Failed to parse Gemini response as JSON: " + text.substring(0, 100),
    );
  }
}

function getMockDestinationInfo(place: string): DestinationInfo {
  return {
    name: place,
    country: "Indonesia",
    description: `${place} adalah destinasi wisata yang menakjubkan dengan budaya kaya dan alam yang indah.`,
    best_season: "April - Oktober",
    estimated_daily_budget: "Rp 500,000 - Rp 1,500,000",
    highlights: [
      "Pemandangan alam",
      "Kuliner lokal",
      "Budaya dan tradisi",
      "Aktivitas outdoor",
    ],
    tips: [
      "Bawa sunscreen dan topi",
      "Gunakan transportasi lokal untuk pengalaman lebih autentik",
      "Belajar beberapa frasa bahasa daerah",
    ],
  };
}
