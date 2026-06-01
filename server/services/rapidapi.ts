import axios from 'axios'

const headers = (key: string, host: string) => ({
  'x-rapidapi-key': key,
  'x-rapidapi-host': host,
  useQueryString: true,
})

interface HotelResult {
  name: string
  price: string
  rating: string
  location: string
  reviewCount: string
  imageUrl?: string
  bookingUrl: string
  platform: string
}

interface FlightResult {
  airline: string
  departure: string
  arrival: string
  price: string
  stops: number
  bookingUrl: string
  platform: string
}

// ── Booking.com via RapidAPI ──────────────────────────────
export async function searchHotelsBooking(query: string): Promise<HotelResult[]> {
  const key = process.env.RAPIDAPI_BOOKING_KEY
  const host = process.env.RAPIDAPI_BOOKING_HOST
  if (!key || key === 'YOUR_RAPIDAPI_KEY_HERE') return []

  try {
    const response = await axios.get(
      `https://booking-com18.p.rapidapi.com/v1/hotels/search`,
      {
        params: { query, locale: 'id', currency: 'IDR' },
        headers: headers(key, host || 'booking-com18.p.rapidapi.com'),
        timeout: 10000,
      }
    )

    const results = response.data?.result?.properties || []
    return results.slice(0, 5).map((h: any) => ({
      name: h.property?.name || 'Unknown Hotel',
      price: h.property?.priceBreakdown?.grossAmount?.value
        ? `Rp ${Number(h.property.priceBreakdown.grossAmount.value).toLocaleString('id-ID')}`
        : 'N/A',
      rating: h.property?.reviewScore?.score || 'N/A',
      location: h.property?.address?.city || query,
      reviewCount: h.property?.reviewScore?.totalReviews || '0',
      imageUrl: h.property?.mainPhotoUrl || '',
      bookingUrl: h.property?.paymentConfig?.linkedToProperty ? `https://www.booking.com/property/${h.property?.propertyId}.html` : `https://www.booking.com/search.html?ss=${encodeURIComponent(query)}`,
      platform: 'Booking.com',
    }))
  } catch (err: any) {
    console.error('Booking.com API error:', err?.response?.status, err?.message)
    return []
  }
}

// ── Agoda via RapidAPI ─────────────────────────────────────
export async function searchHotelsAgoda(query: string): Promise<HotelResult[]> {
  const key = process.env.RAPIDAPI_AGODA_KEY
  const host = process.env.RAPIDAPI_AGODA_HOST
  if (!key || key === 'YOUR_RAPIDAPI_KEY_HERE') return []

  try {
    const response = await axios.get(
      `https://agoda-com.p.rapidapi.com/v1/en/hotels/search`,
      {
        params: { query, currency: 'IDR', locale: 'id-ID' },
        headers: headers(key, host || 'agoda-com.p.rapidapi.com'),
        timeout: 10000,
      }
    )

    const results = response.data?.hotels || []
    return results.slice(0, 5).map((h: any) => ({
      name: h.name || 'Unknown Hotel',
      price: h.price ? `Rp ${Number(h.price).toLocaleString('id-ID')}` : 'N/A',
      rating: h.rating || 'N/A',
      location: h.location?.city || query,
      reviewCount: h.reviewCount || '0',
      imageUrl: h.image || '',
      bookingUrl: `https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?city=${encodeURIComponent(query)}`,
      platform: 'Agoda',
    }))
  } catch (err: any) {
    console.error('Agoda API error:', err?.response?.status, err?.message)
    return []
  }
}

// ── TripAdvisor ─────────────────────────────────────────────
export async function searchHotelsTripAdvisor(query: string): Promise<HotelResult[]> {
  const key = process.env.RAPIDAPI_TRIPADVISOR_KEY
  const host = process.env.RAPIDAPI_TRIPADVISOR_HOST
  if (!key || key === 'YOUR_RAPIDAPI_KEY_HERE') return []

  try {
    const response = await axios.get(
      `https://tripadvisor16.p.rapidapi.com/api/v1/hotels/searchHotels`,
      {
        params: { query, currency: 'IDR' },
        headers: headers(key, host || 'tripadvisor16.p.rapidapi.com'),
        timeout: 10000,
      }
    )

    const results = response.data?.data?.hotels || []
    return results.slice(0, 5).map((h: any) => ({
      name: h.name || 'Unknown Hotel',
      price: h.price?.amount ? `Rp ${Number(h.price.amount).toLocaleString('id-ID')}` : 'N/A',
      rating: h.rating || 'N/A',
      location: h.location?.string || query,
      reviewCount: h.numReviews || '0',
      imageUrl: h.photo?.url || '',
      bookingUrl: `https://www.tripadvisor.com${h.geoPointId ? `/Hotel_Review-g' + h.geoPointId.split(':')[1] + '-d' + h.geoPointId.split(':')[2]` : ''}`,
      platform: 'TripAdvisor',
    }))
  } catch (err: any) {
    console.error('TripAdvisor API error:', err?.response?.status, err?.message)
    return []
  }
}

// ── Aggregated hotel search (all platforms) ─────────────────
export async function searchHotelsAll(query: string) {
  const [booking, agoda, tripadvisor] = await Promise.allSettled([
    searchHotelsBooking(query),
    searchHotelsAgoda(query),
    searchHotelsTripAdvisor(query),
  ])

  const all: HotelResult[] = []
  if (booking.status === 'fulfilled') all.push(...booking.value)
  if (agoda.status === 'fulfilled') all.push(...agoda.value)
  if (tripadvisor.status === 'fulfilled') all.push(...tripadvisor.value)

  return all.sort(() => Math.random() - 0.5) // mix results for variety
}

// ── Flight search via RapidAPI ──────────────────────────────
export async function searchFlightsRapidAPI(query: string) {
  // Placeholder - RapidAPI flight APIs need real subscription
  // Using Skyscanner-style endpoint if key is set
  const key = process.env.RAPIDAPI_KEY
  const host = process.env.RAPIDAPI_HOST

  if (!key || key === 'YOUR_RAPIDAPI_KEY_HERE') {
    return {
      flights: [],
      message: 'Flight API key not configured. Set RAPIDAPI_KEY in .env',
    }
  }

  try {
    // Parse query like "Jakarta-Bali"
    const [from, to] = query.split('-').map((s) => s.trim())

    const response = await axios.get(
      `https://skyscanner-api.p.rapidapi.com/v1/flights/international-roundtrip`,
      {
        params: {
          fromPlace: from || 'CGK',
          toPlace: to || 'DPS',
          departDate: '2026-06-15',
          adults: 1,
          currency: 'IDR',
          locale: 'id-ID',
        },
        headers: headers(key, host || 'skyscanner-api.p.rapidapi.com'),
        timeout: 10000,
      }
    )

    const itineraries = response.data?.itineraries?.results || []
    return {
      flights: itineraries.slice(0, 5).map((f: any) => ({
        airline: f.legs?.[0]?.carriers?.marketing?.[0]?.name || 'Unknown',
        departure: f.legs?.[0]?.departure || 'N/A',
        arrival: f.legs?.[0]?.arrival || 'N/A',
        price: f.price?.totalAmount ? `Rp ${Number(f.price.totalAmount).toLocaleString('id-ID')}` : 'N/A',
        stops: f.legs?.[0]?.stops || 0,
        bookingUrl: `https://www.skyscanner.com/transport/flights/${from?.toLowerCase() || 'cgi'}/${to?.toLowerCase() || 'dps'}/`,
        platform: 'Skyscanner',
      })),
    }
  } catch (err: any) {
    console.error('Flight API error:', err?.response?.status, err?.message)
    return { flights: [], message: 'Flight API unavailable' }
  }
}