import { Router } from "express"
import { getBookingDeepLinks } from "./prices.js"

const router = Router()

// ─── GET /api/booking/booking-compare?item=Hotel+Bintang+5+Bali ───────────────
router.get("/booking-compare", async (req, res) => {
  const { item, category } = req.query
  if (!item) return res.status(400).json({ error: "item query param is required" })

  const name = item as string
  const nameLower = name.toLowerCase()

  let resolvedCategory: "hotel" | "flight" | "train" | "restaurant" | "attraction" = "attraction"
  if (nameLower.includes("hotel") || nameLower.includes("resort") || nameLower.includes("homestay") || nameLower.includes("akomodasi")) {
    resolvedCategory = "hotel"
  } else if (nameLower.includes("flight") || nameLower.includes("penerbangan") || nameLower.includes("pesawat") || nameLower.includes("airplane")) {
    resolvedCategory = "flight"
  } else if (nameLower.includes("kereta") || nameLower.includes("train") || nameLower.includes("krl")) {
    resolvedCategory = "train"
  } else if (nameLower.includes("restaurant") || nameLower.includes("cafe") || nameLower.includes("makan") || nameLower.includes("kuliner")) {
    resolvedCategory = "restaurant"
  }

  const platforms = getBookingDeepLinks(name, resolvedCategory)

  return res.json({
    item: name,
    category: resolvedCategory,
    platforms,
    isMockData: true,
    note: "Platform comparison ready. Set RapidAPI keys for live prices.",
  })
})

// ─── GET /api/booking/search?query=Bali&category=hotel ────────────────────────
router.get("/search", async (req, res) => {
  const { query, category = "hotel" } = req.query
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing query parameter" })
  }

  const destination = query.toLowerCase()
  let basePrice = 500000
  let currency = "IDR"

  if (destination.includes("bali") || destination.includes("ubud") || destination.includes("kuta")) {
    basePrice = 800000
  } else if (destination.includes("jakarta") || destination.includes("bekasi")) {
    basePrice = 650000
  } else if (destination.includes("bandung")) {
    basePrice = 550000
  } else if (destination.includes("yogyakarta") || destination.includes("jogja")) {
    basePrice = 450000
  } else if (destination.includes("singapore") || destination.includes("singapura")) {
    basePrice = 1500000; currency = "SGD"
  } else if (destination.includes("tokyo") || destination.includes("japan") || destination.includes("jepang")) {
    basePrice = 2000000; currency = "JPY"
  } else if (destination.includes("bangkok") || destination.includes("thailand") || destination.includes("thai")) {
    basePrice = 900000; currency = "THB"
  }

  const encodedQuery = encodeURIComponent(query)
  const platforms = getBookingDeepLinks(query, category as any)

  const results = [
    {
      id: "1",
      name: `${query} Budget Hotel`,
      provider: "Generic",
      price: Math.round(basePrice * 0.4),
      pricePerNight: Math.round(basePrice * 0.4),
      currency,
      rating: 3.5,
      stars: 2,
      amenities: ["WiFi", "AC"],
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      bookingDeepLinks: {
        traveloka: `https://www.traveloka.com/en/hotels/search?query=${encodedQuery}`,
        tiket: `https://www.tiket.com/search?query=${encodedQuery}&type=hotel`,
        agoda: `https://www.agoda.com/search?locale=en-us&currency=IDR&query=${encodedQuery}`,
        booking: `https://www.booking.com/search.html?ss=${encodedQuery}`,
      },
      platforms,
    },
    {
      id: "2",
      name: `${query} Mid-Range Hotel`,
      provider: "Generic",
      price: Math.round(basePrice * 0.8),
      pricePerNight: Math.round(basePrice * 0.8),
      currency,
      rating: 4.2,
      stars: 3,
      amenities: ["WiFi", "AC", "Breakfast", "Pool"],
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400",
      bookingDeepLinks: {
        traveloka: `https://www.traveloka.com/en/hotels/search?query=${encodedQuery}`,
        tiket: `https://www.tiket.com/search?query=${encodedQuery}&type=hotel`,
        agoda: `https://www.agoda.com/search?locale=en-us&currency=IDR&query=${encodedQuery}`,
        booking: `https://www.booking.com/search.html?ss=${encodedQuery}`,
      },
      platforms,
    },
    {
      id: "3",
      name: `${query} Premium Resort`,
      provider: "Generic",
      price: Math.round(basePrice * 1.5),
      pricePerNight: Math.round(basePrice * 1.5),
      currency,
      rating: 4.7,
      stars: 5,
      amenities: ["WiFi", "AC", "Breakfast", "Pool", "Spa", "Gym"],
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400",
      bookingDeepLinks: {
        traveloka: `https://www.traveloka.com/en/hotels/search?query=${encodedQuery}`,
        tiket: `https://www.tiket.com/search?query=${encodedQuery}&type=hotel`,
        agoda: `https://www.agoda.com/search?locale=en-us&currency=IDR&query=${encodedQuery}`,
        booking: `https://www.booking.com/search.html?ss=${encodedQuery}`,
      },
      platforms,
    },
  ]

  res.json({
    query,
    category,
    results,
    currency,
    disclaimer: "Prices are estimates. Click a platform below to book directly.",
  })
})

export default router