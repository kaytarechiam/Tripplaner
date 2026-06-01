import { Router } from "express"
import axios from "axios"

const router = Router()

// ─── Hotel Price Search ───────────────────────────────
// Uses public booking search endpoints (no API key required)
// Returns mock/historical prices for demo purposes
router.get("/search", async (req, res) => {
  try {
    const { query, category = "hotel" } = req.query

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing query parameter" })
    }

    // For demo: return estimated price ranges based on destination
    // In production, this would call RapidAPI or similar
    const destination = query.toLowerCase()

    // Base prices (IDR) - estimated by destination type
    let basePrice = 500000
    let currency = "IDR"

    // Bali premium pricing
    if (destination.includes("bali") || destination.includes("ubud") || destination.includes("kuta")) {
      basePrice = 800000
    }
    // Jakarta business pricing
    else if (destination.includes("jakarta") || destination.includes("bekasi")) {
      basePrice = 650000
    }
    // Bandung mid-range
    else if (destination.includes("bandung")) {
      basePrice = 550000
    }
    // Yogyakarta cultural
    else if (destination.includes("yogyakarta") || destination.includes("jogja")) {
      basePrice = 450000
    }
    // International destinations
    else if (destination.includes("singapore") || destination.includes("singapura")) {
      basePrice = 1500000
      currency = "SGD"
    }
    else if (destination.includes("tokyo") || destination.includes("japan") || destination.includes("jepang")) {
      basePrice = 2000000
      currency = "JPY"
    }
    else if (destination.includes("bangkok") || destination.includes("thailand") || destination.includes("thai")) {
      basePrice = 900000
      currency = "THB"
    }

    // Smart routing: encode query for URLs
    const encodedQuery = encodeURIComponent(query)

    // Generate tiered options with multiple booking platform links
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
        bookingUrls: [
          { platform: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/hotels/search?query=${encodedQuery}`, color: "bg-blue-600 hover:bg-blue-700" },
          { platform: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodedQuery}&type=hotel`, color: "bg-orange-500 hover:bg-orange-600" },
          { platform: "agoda", name: "Agoda", url: `https://www.agoda.com/search?locale=en-us&currency=IDR&pricenext=1&query=${encodedQuery}`, color: "bg-orange-600 hover:bg-orange-700" },
          { platform: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${encodedQuery}`, color: "bg-blue-500 hover:bg-blue-600" },
        ],
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
        bookingUrls: [
          { platform: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/hotels/search?query=${encodedQuery}`, color: "bg-blue-600 hover:bg-blue-700" },
          { platform: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodedQuery}&type=hotel`, color: "bg-orange-500 hover:bg-orange-600" },
          { platform: "agoda", name: "Agoda", url: `https://www.agoda.com/search?locale=en-us&currency=IDR&pricenext=1&query=${encodedQuery}`, color: "bg-orange-600 hover:bg-orange-700" },
          { platform: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${encodedQuery}`, color: "bg-blue-500 hover:bg-blue-600" },
        ],
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
        bookingUrls: [
          { platform: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/hotels/search?query=${encodedQuery}`, color: "bg-blue-600 hover:bg-blue-700" },
          { platform: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodedQuery}&type=hotel`, color: "bg-orange-500 hover:bg-orange-600" },
          { platform: "agoda", name: "Agoda", url: `https://www.agoda.com/search?locale=en-us&currency=IDR&pricenext=1&query=${encodedQuery}`, color: "bg-orange-600 hover:bg-orange-700" },
          { platform: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${encodedQuery}`, color: "bg-blue-500 hover:bg-blue-600" },
        ],
      },
    ]

    res.json({
      query,
      category,
      results,
      currency,
      disclaimer: "Prices are estimates. Click a platform below to book directly.",
    })
  } catch (error) {
    console.error("Hotel search error:", error)
    res.status(500).json({ error: "Failed to fetch hotel prices" })
  }
})

// ─── Flight Price Search ───────────────────────────────
router.get("/flights", async (req, res) => {
  try {
    const { from, to, date } = req.query

    if (!from || !to || typeof from !== "string" || typeof to !== "string") {
      return res.status(400).json({ error: "Missing from/to parameters" })
    }

    // Base flight prices (IDR)
    let basePrice = 800000

    const route = `${from}-${to}`.toLowerCase()

    // Popular routes
    if (route.includes("jakarta-bali") || route.includes("cgk-dps")) {
      basePrice = 1200000
    } else if (route.includes("jakarta-singapore") || route.includes("cgk-sin")) {
      basePrice = 1800000
    } else if (route.includes("jakarta-surabaya") || route.includes("cgk-sub")) {
      basePrice = 600000
    }

    const results = [
      {
        id: "f1",
        airline: "Citilink",
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        departureTime: "08:00",
        arrivalTime: "10:30",
        duration: "2j 30m",
        price: Math.round(basePrice * 0.7),
        currency: "IDR",
        bookingUrls: [
          { platform: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?ap=${encodeURIComponent(from)}&dc=${encodeURIComponent(to)}`, color: "bg-blue-600 hover:bg-blue-700" },
          { platform: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodeURIComponent(to)}&type=flight`, color: "bg-orange-500 hover:bg-orange-600" },
        ],
      },
      {
        id: "f2",
        airline: "Lion Air",
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        departureTime: "13:00",
        arrivalTime: "15:30",
        duration: "2j 30m",
        price: Math.round(basePrice * 0.85),
        currency: "IDR",
        bookingUrls: [
          { platform: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?ap=${encodeURIComponent(from)}&dc=${encodeURIComponent(to)}`, color: "bg-blue-600 hover:bg-blue-700" },
          { platform: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodeURIComponent(to)}&type=flight`, color: "bg-orange-500 hover:bg-orange-600" },
        ],
      },
      {
        id: "f3",
        airline: "Garuda Indonesia",
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        departureTime: "18:00",
        arrivalTime: "20:30",
        duration: "2j 30m",
        price: Math.round(basePrice * 1.3),
        currency: "IDR",
        bookingUrls: [
          { platform: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?ap=${encodeURIComponent(from)}&dc=${encodeURIComponent(to)}`, color: "bg-blue-600 hover:bg-blue-700" },
          { platform: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodeURIComponent(to)}&type=flight`, color: "bg-orange-500 hover:bg-orange-600" },
        ],
      },
    ]

    res.json({
      from,
      to,
      date,
      results,
      currency: "IDR",
      disclaimer: "Prices are estimates. Click a platform below to book directly.",
    })
  } catch (error) {
    console.error("Flight search error:", error)
    res.status(500).json({ error: "Failed to fetch flight prices" })
  }
})

export default router
