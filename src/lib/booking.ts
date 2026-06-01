import axios from 'axios'
import { apiFetch } from './api'

export interface BookingPlatform {
  id: string
  name: string
  url: string
  color: string
}

export interface BookingLinksResponse {
  item: string
  category: string
  platforms: BookingPlatform[]
}

export async function getBookingLinks(
  item: string,
  category?: string
): Promise<BookingPlatform[]> {
  try {
    const params: Record<string, string> = { item }
    if (category) params.category = category
    const data = await apiFetch<BookingLinksResponse>(`/api/prices/booking-links?item=${encodeURIComponent(item)}${category ? `&category=${encodeURIComponent(category)}` : ''}`)
    return data.platforms
  } catch {
    return []
  }
}

export async function searchHotelPrices(location: string) {
  const data = await apiFetch<unknown>(`/api/prices/hotel?location=${encodeURIComponent(location)}`)
  return data
}

export async function searchStayPrices(location: string, checkin?: string, checkout?: string) {
  const params = new URLSearchParams({ location })
  if (checkin) params.append('checkin', checkin)
  if (checkout) params.append('checkout', checkout)
  const data = await apiFetch<unknown>(`/api/prices/stay?${params}`)
  return data
}

export async function searchBookingCategory(
  query: string,
  category: 'hotel' | 'attraction' | 'flight' | 'restaurant' = 'hotel'
) {
  const data = await apiFetch<unknown>(`/api/booking/search?query=${encodeURIComponent(query)}&category=${category}`)
  return data
}