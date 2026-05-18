import { createClient } from '@supabase/supabase-js'

// Env vars from .env file - Vite exposes these via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Auth & DB features will be disabled. Copy .env.example → .env and fill in values.'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

// ─── Auth Helpers ────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function signUp(email: string, password: string, name: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })
  return { data, error }
}

// ─── Database Helpers ────────────────────────────────────────

export type Trip = {
  id: string
  user_id: string
  name: string
  destination: string
  start_date?: string
  end_date?: string
  status: 'planning' | 'active' | 'completed'
  cover_image?: string
  created_at: string
  updated_at: string
}

export type ItineraryItem = {
  id: string
  trip_id: string
  day: number
  time: string
  title: string
  description?: string
  location?: string
  latitude?: number
  longitude?: number
  category: 'hotel' | 'landmark' | 'food' | 'nature' | 'activity' | 'shopping' | 'transport'
  duration_minutes?: number
  notes?: string
  sort_order: number
  created_at: string
}

export type BucketListItem = {
  id: string
  user_id: string
  place_name: string
  country: string
  priority: 'low' | 'medium' | 'high'
  notes?: string
  image_url?: string
  created_at: string
}

export type SplitBillItem = {
  id: string
  trip_id: string
  description: string
  amount: number
  currency: string
  paid_by: string
  split_between: string[]
  settled: boolean
  created_at: string
}

// Get all trips for current user
export async function getTrips() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Trip[]
}

// Create a new trip
export async function createTrip(trip: Omit<Trip, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('trips')
    .insert({ ...trip, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Trip
}

// Get itinerary items for a trip
export async function getItinerary(tripId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as ItineraryItem[]
}

// Add itinerary item
export async function addItineraryItem(item: Omit<ItineraryItem, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('itinerary_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data as ItineraryItem
}

// Get bucket list
export async function getBucketList() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('bucket_list')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as BucketListItem[]
}

// Add bucket list item
export async function addBucketListItem(item: Omit<BucketListItem, 'id' | 'user_id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('bucket_list')
    .insert({ ...item, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as BucketListItem
}

// Get split bills for a trip
export async function getSplitBills(tripId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('split_bills')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as SplitBillItem[]
}

// Add split bill
export async function addSplitBill(item: Omit<SplitBillItem, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('split_bills')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data as SplitBillItem
}

// Update itinerary item
export async function updateItineraryItem(id: string, updates: Partial<Omit<ItineraryItem, 'id' | 'trip_id' | 'created_at'>>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('itinerary_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ItineraryItem
}

// Delete itinerary item
export async function deleteItineraryItem(id: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Update trip
export async function updateTrip(id: string, updates: Partial<Omit<Trip, 'id' | 'user_id' | 'created_at'>>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('trips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Trip
}

// ─── Realtime Subscription ───────────────────────────────────

export function subscribeToTrips(callback: (trip: Trip) => void) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('trips-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'trips',
    }, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        callback(payload.new as Trip)
      }
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}