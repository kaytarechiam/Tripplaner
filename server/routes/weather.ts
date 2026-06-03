import { Router } from "express";
import axios from "axios";

const router = Router();

const WEATHER_CODES: Record<number, string> = {
  0: "Cerah",
  1: "Umumnya cerah",
  2: "Sebagian berawan",
  3: "Mendung",
  45: "Kabut",
  48: "Kabut beku",
  51: "Hujan gerimis ringan",
  53: "Hujan gerimis sedang",
  55: "Hujan gerimis lebat",
  61: "Hujan ringan",
  63: "Hujan sedang",
  65: "Hujan lebat",
  71: "Hujan salju ringan",
  73: "Hujan salju sedang",
  75: "Hujan salju lebat",
  80: "Hujan deras ringan",
  81: "Hujan deras sedang",
  82: "Hujan deras sangat",
  95: "Badai petir",
  96: "Badai petir + hujan es",
  99: "Badai petir berat + hujan es",
};

async function fetchWeather(
  lat: number,
  lng: number,
  days: number,
  attempt = 1,
): Promise<any> {
  try {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat,
        longitude: lng,
        daily:
          "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
        timezone: "auto", // auto-detect from coordinates (works for Swiss, Europe, etc.)
        forecast_days: days,
      },
      timeout: 8000,
    });
    return response.data;
  } catch (err: any) {
    const isTimeout =
      err?.code === "ECONNABORTED" || err?.message?.includes("timeout");
    if (attempt === 1 && isTimeout) {
      console.warn("[Weather] Timeout on attempt 1, retrying...");
      await new Promise((r) => setTimeout(r, 1000));
      return fetchWeather(lat, lng, days, 2);
    }
    throw err;
  }
}

// GET /api/weather?lat=-6.2&lng=106.8&days=7
router.get("/", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const days = Math.min(parseInt(req.query.days as string) || 7, 14);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ message: "lat and lng are required" });
      return;
    }

    const data = await fetchWeather(lat, lng, days);
    const daily = data.daily;

    const weather = daily.time.map((date: string, i: number) => ({
      date,
      temp_max: Math.round(daily.temperature_2m_max[i] * 10) / 10,
      temp_min: Math.round(daily.temperature_2m_min[i] * 10) / 10,
      weather_code: daily.weather_code[i],
      precipitation_probability: daily.precipitation_probability_max[i] ?? 0,
      description: WEATHER_CODES[daily.weather_code[i]] || "Tidak diketahui",
    }));

    res.json(weather);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch weather";
    console.error("[Weather]", message);
    // Return empty array instead of 500 — frontend handles gracefully
    res.json([]);
  }
});

export default router;
