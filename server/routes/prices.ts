import { Router } from "express"
import axios from "axios"
import * as dotenv from "dotenv"
dotenv.config({ path: "../.env" })
dotenv.config({ path: "../../.env" })

// ─── Booking Platform Deep Links Generator ─────────────────────────────────
export function getBookingDeepLinks(itemName: string, category: "hotel" | "flight" | "train" | "restaurant" | "attraction") {
  const encodedName = encodeURIComponent(itemName)

  type Platform = {
    id: string
    name: string
    url: string
    color: string
  }

  const allPlatforms: Record<string, Platform> = {
    traveloka: {
      id: "traveloka", name: "Traveloka",
      url: category === "hotel" ? `https://www.traveloka.com/en/hotels/search?query=${encodedName}`
        : category === "flight" ? `https://www.traveloka.com/en/flights/search?query=${encodedName}`
        : category === "train" ? `https://www.traveloka.com/en/trains/search?query=${encodedName}`
        : `https://www.traveloka.com/en/flights/search?query=${encodedName}`,
      color: "#2563eb",
    },
    tiket: {
      id: "tiket", name: "Tiket.com",
      url: category === "hotel" ? `https://www.tiket.com/search?query=${encodedName}&type=hotel`
        : category === "flight" ? `https://www.tiket.com/search?query=${encodedName}&type=flight`
        : category === "train" ? `https://www.tiket.com/search?query=${encodedName}&type=train`
        : `https://www.tiket.com/search?query=${encodedName}`,
      color: "#f97316",
    },
    agoda: {
      id: "agoda", name: "Agoda",
      url: `https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?city=${encodedName}`,
      color: "#dd1f39",
    },
    booking: {
      id: "booking", name: "Booking.com",
      url: `https://www.booking.com/search.html?ss=${encodedName}`,
      color: "#003580",
    },
    travelokaTrain: {
      id: "traveloka_train", name: "Traveloka",
      url: `https://www.traveloka.com/en/trains/search?query=${encodedName}`,
      color: "#2563eb",
    },
  }

  if (category === "hotel") return [allPlatforms.traveloka, allPlatforms.tiket, allPlatforms.agoda, allPlatforms.booking]
  if (category === "flight") return [allPlatforms.traveloka, allPlatforms.tiket]
  if (category === "train") return [allPlatforms.travelokaTrain, allPlatforms.tiket]
  if (category === "restaurant") return [allPlatforms.booking]
  return []
}

const router = Router()

// ─── Unified Booking Links Endpoint ─────────────────────────────────────────
router.get("/booking-links", (req, res) => {
  const { item, category } = req.query
  if (!item) return res.status(400).json({ error: "item is required" })

  let resolvedCategory: "hotel" | "flight" | "train" | "restaurant" | "attraction" = "attraction"
  const name = (item as string).toLowerCase()

  if ((category as string)?.includes("hotel") || name.includes("hotel") || name.includes("homestay") || name.includes("resort")) {
    resolvedCategory = "hotel"
  } else if ((category as string)?.includes("flight") || name.includes("flight") || name.includes("penerbangan") || name.includes("pesawat")) {
    resolvedCategory = "flight"
  } else if ((category as string)?.includes("train") || name.includes("kereta") || name.includes("train") || name.includes("krl")) {
    resolvedCategory = "train"
  } else if ((category as string)?.includes("food") || name.includes("restaurant") || name.includes("cafe") || name.includes("kuliner") || name.includes("makan")) {
    resolvedCategory = "restaurant"
  }

  const platforms = getBookingDeepLinks(item as string, resolvedCategory)
  return res.json({ item, category: resolvedCategory, platforms })
})

// ─── RapidAPI Agoda – Search Hotels ─────────────────────────────────────────
const AGODA_MOCK_RESULTS = (location: string) => [
  { id: "m1", name: `${location} Beach Resort`, location, rating: 4.5, reviewCount: 320, price: 850000, currency: "IDR", imageUrl: null, bookingUrl: "", bookingPlatforms: getBookingDeepLinks(`${location} Beach Resort`, "hotel") },
  { id: "m2", name: `${location} City Hotel`, location, rating: 4.1, reviewCount: 180, price: 520000, currency: "IDR", imageUrl: null, bookingUrl: "", bookingPlatforms: getBookingDeepLinks(`${location} City Hotel`, "hotel") },
  { id: "m3", name: `${location} Boutique Inn`, location, rating: 4.3, reviewCount: 95, price: 680000, currency: "IDR", imageUrl: null, bookingUrl: "", bookingPlatforms: getBookingDeepLinks(`${location} Boutique Inn`, "hotel") },
  { id: "m4", name: `${location} Budget Stay`, location, rating: 3.8, reviewCount: 210, price: 290000, currency: "IDR", imageUrl: null, bookingUrl: "", bookingPlatforms: getBookingDeepLinks(`${location} Budget Stay`, "hotel") },
]

router.get("/hotel", async (req, res) => {
  const { location, checkin, checkout, adults } = req.query
  if (!location) return res.status(400).json({ error: "location is required" })

  const host = process.env.RAPIDAPI_AGODA_HOST || "agoda-com.p.rapidapi.com"
  const apiKey = process.env.RAPIDAPI_AGODA_KEY

  const checkinDate = (checkin as string) || new Date().toISOString().split("T")[0]
  const checkoutDate = (checkout as string) || new Date(Date.now() + 86400000).toISOString().split("T")[0]

  // If no key OR key is placeholder → use smart mock data
  if (!apiKey || apiKey === "YOUR_RAPIDAPI_KEY_HERE") {
    return res.json({
      location,
      results: AGODA_MOCK_RESULTS(location as string),
      isMock: true,
      note: "RAPIDAPI_AGODA_KEY not configured — showing smart mock data",
    })
  }

  try {
    const autoRes = await axios.get("https://agoda-com.p.rapidapi.com/v1/auto-complete", {
      params: { language_id: 1, q: location as string },
      headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
      timeout: 8000,
    })

    const suggestions = autoRes.data?.data?.suggestionList || []
    const top = suggestions[0]
    if (!top) {
      return res.json({ location, results: AGODA_MOCK_RESULTS(location as string), isMock: true, note: "No Agoda results — showing smart mock data" })
    }

    const hotelSearchRes = await axios.get("https://agoda-com.p.rapidapi.com/v1/hotels/search-overnight", {
      params: {
        location: top.name,
        checkinDate,
        checkoutDate,
        adults: Number(adults) || 1,
        rooms: 1,
        language_id: 1,
        currency_id: 8,
        sort_by: "BestMatch",
        page: 1,
      },
      headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
      timeout: 10000,
    })

    const hotels = hotelSearchRes.data?.data?.properties || []
    const results = hotels.slice(0, 10).map((h: any) => ({
      id: h.propertyId,
      name: h.name,
      location: h.address?.city || top.name,
      rating: h.reviewScore?.score || null,
      reviewCount: h.reviewScore?.reviewCount || 0,
      price: h.cheapestPrice?.price || null,
      currency: h.cheapestPrice?.currency || "IDR",
      imageUrl: h.image?.url || null,
      bookingUrl: h.cheapestPrice?.deeplinkUrl || `https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?city=${encodeURIComponent(top.name)}`,
      bookingPlatforms: getBookingDeepLinks(h.name || (location as string), "hotel"),
    }))

    return res.json({ location, cityId: top.name, checkinDate, checkoutDate, results })
  } catch (err: any) {
    // Any error (invalid key, network, wrong endpoint) → return smart mock, don't crash
    console.warn("[prices/hotel] Agoda API unavailable, using mock data:", err?.response?.status || err.message)
    return res.json({
      location,
      results: AGODA_MOCK_RESULTS(location as string),
      isMock: true,
      note: `Agoda API error (${err?.response?.status || err.message}) — showing smart mock data`,
    })
  }
})

// ─── Hotel Detail + Prices ───────────────────────────────────────────────────
router.get("/hotel/:propertyId", async (req, res) => {
  const { propertyId } = req.params
  const { checkin, checkout } = req.query
  if (!propertyId) return res.status(400).json({ error: "propertyId is required" })

  const host = process.env.RAPIDAPI_AGODA_HOST || "agoda-com.p.rapidapi.com"
  const apiKey = process.env.RAPIDAPI_AGODA_KEY

  if (!apiKey) return res.status(500).json({ error: "RAPIDAPI_AGODA_KEY not configured" })

  try {
    const detailRes = await axios.get("https://agoda-com.p.rapidapi.com/v1/hotels/get-prices", {
      params: {
        property_id: propertyId,
        checkin_date: (checkin as string) || new Date().toISOString().split("T")[0],
        checkout_date: (checkout as string) || new Date(Date.now() + 86400000).toISOString().split("T")[0],
        adults: 1, rooms: 1, language_id: 1, currency_id: 8,
      },
      headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
      timeout: 10000,
    })
    return res.json(detailRes.data)
  } catch (err: any) {
    console.error("[prices/hotel/:id] RapidAPI error:", err?.response?.data || err.message)
    return res.status(502).json({ error: "Failed to fetch hotel details", detail: err?.response?.data?.message || err.message })
  }
})

// ─── RapidAPI TripAdvisor – Restaurant Prices ──────────────────────────────
router.get("/restaurant", async (req, res) => {
  const { location } = req.query
  if (!location) return res.status(400).json({ error: "location is required" })

  const host = process.env.RAPIDAPI_TRIPADVISOR_HOST || "tripadvisor16.p.rapidapi.com"
  const apiKey = process.env.RAPIDAPI_TRIPADVISOR_KEY

  if (!apiKey) return res.json({ location, results: [], isMock: true })

  try {
    const locRes = await axios.get("https://tripadvisor16.p.rapidapi.com/api/v1/restaurant/searchLocation", {
      params: { query: location },
      headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
      timeout: 8000,
    })

    const locationId = locRes.data?.data?.[0]?.locationId
    if (!locationId) return res.json({ location, results: [] })

    const searchRes = await axios.get("https://tripadvisor16.p.rapidapi.com/api/v1/restaurant/searchRestaurants", {
      params: { locationId, page: 1 },
      headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
      timeout: 8000,
    })

    const restaurants = searchRes.data?.data?.restaurants || []
    const results = restaurants.slice(0, 8).map((r: any) => ({
      id: r.restaurantsId,
      name: r.title,
      rating: r.rating || null,
      priceLevel: r.priceLevel || null,
      cuisine: r.cuisine?.join(", ") || null,
      address: r.address || null,
      imageUrl: r.thumbnailUrl || null,
    }))

    return res.json({ location, results })
  } catch (err: any) {
    console.error("[prices/restaurant] RapidAPI error:", err?.response?.data || err.message)
    return res.status(502).json({ error: "Failed to fetch restaurant data", detail: err?.response?.data?.message || err.message })
  }
})

// ─── RapidAPI Airbnb – Stay Prices ─────────────────────────────────────────
router.get("/stay", async (req, res) => {
  const { location, checkin, checkout, adults } = req.query
  if (!location) return res.status(400).json({ error: "location is required" })

  const host = "airbnb19.p.rapidapi.com"
  const apiKey = process.env.RAPIDAPI_KEY

  if (!apiKey) {
    const mockStays = [
      { id: "mock1", name: `${location} Homestay`, location, rating: 4.5, reviewCount: 23, price: "Rp 450.000/malam", currency: "IDR", imageUrl: null, bookingUrl: "", bookingPlatforms: [] },
      { id: "mock2", name: `${location} Villa`, location, rating: 4.8, reviewCount: 41, price: "Rp 1.200.000/malam", currency: "IDR", imageUrl: null, bookingUrl: "", bookingPlatforms: [] },
      { id: "mock3", name: `${location} Beach House`, location, rating: 4.6, reviewCount: 18, price: "Rp 800.000/malam", currency: "IDR", imageUrl: null, bookingUrl: "", bookingPlatforms: [] },
    ]
    return res.json({ location, results: mockStays, isMock: true })
  }

  try {
    const searchRes = await axios.get("https://airbnb19.p.rapidapi.com/api/v2/searchPropertyByLocation", {
      params: { query: location, checkin: checkin || "", checkout: checkout || "", adults: Number(adults) || 1, currency: "USD", totalRecords: 5 },
      headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey! },
      timeout: 10000,
    })

    const stays = searchRes.data?.data?.properties || []
    const results = stays.slice(0, 5).map((s: any) => ({
      id: s.id,
      name: s.name,
      location: s.locationString || location,
      rating: s.rating || null,
      reviewCount: s.reviewCount || 0,
      price: s.price?.totalPrice?.totalPriceFormatted || s.price?.price?.totalPriceFormatted || null,
      currency: "USD",
      imageUrl: s.image || null,
      bookingUrl: s.url || `https://www.airbnb.com/s/${encodeURIComponent(location as string)}/homes`,
      bookingPlatforms: getBookingDeepLinks(s.name || (location as string), "hotel"),
    }))

    return res.json({ location, checkin, checkout, results })
  } catch (err: any) {
    console.error("[prices/stay] RapidAPI error:", err?.response?.data || err.message)
    return res.status(502).json({ error: "Failed to fetch stay prices", detail: err?.response?.data?.message || err.message })
  }
})

export default router