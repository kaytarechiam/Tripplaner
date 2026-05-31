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
  is_public?: boolean
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
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Trip[]
}

// Create a new trip
export async function createTrip(trip: Omit<Trip, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Map frontend field names → actual DB column names
  // DB uses: owner_id (not user_id), title (not name — name is a generated column)
  const { name, ...rest } = trip as any
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...rest, title: name, owner_id: user.id })
    .select()
    .single()

  if (error) throw error

  // Auto-add the owner to trip_members with accepted status
  const profile = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .maybeSingle()

  await supabase.from('trip_members').upsert({
    trip_id: data.id,
    user_id: user.id,
    name: profile.data?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner',
    email: profile.data?.email || user.email || '',
    role: 'owner',
    status: 'accepted',
    invited_by: user.id,
  }, { onConflict: 'trip_id,user_id' })

  return data as Trip
}

export async function deleteTrip(tripId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('owner_id', user.id)   // only owner can delete
  if (error) throw error
}

// Get itinerary items for a trip
export async function getItinerary(tripId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('order', { ascending: true })

  if (error) throw error
  // Map DB column names → frontend field names
  return (data || []).map((row: any) => ({
    ...row,
    day: row.day_number,
    title: row.name,
    sort_order: row.order,
    latitude: row.lat ?? row.latitude,
    longitude: row.lng ?? row.longitude,
  })) as ItineraryItem[]
}

// Add itinerary item
export async function addItineraryItem(item: Omit<ItineraryItem, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured')

  // Map frontend field names → actual DB column names
  // DB uses: day_number, name, order, lat, lng
  const { day, title, sort_order, latitude, longitude, ...rest } = item as any

  // Map frontend category values → DB allowed values
  // DB constraint: ONLY allows 'attraction'|'food'|'transport'|'accommodation'
  const categoryMap: Record<string, string> = {
    hotel: 'accommodation',
    landmark: 'attraction',
    nature: 'attraction',
    activity: 'attraction',
    shopping: 'attraction',
    transport: 'transport',
    food: 'food',
    accommodation: 'accommodation',
    attraction: 'attraction',
  }
  const mappedCategory = categoryMap[rest.category] || 'attraction'

  const dbItem = {
    ...rest,
    category: mappedCategory,
    day_number: day,
    name: title,
    order: sort_order ?? 0,
    ...(latitude !== undefined && { lat: latitude }),
    ...(longitude !== undefined && { lng: longitude }),
  }

  const { data, error } = await supabase
    .from('itinerary_items')
    .insert(dbItem)
    .select()
    .single()

  if (error) throw error
  return data as ItineraryItem
}

// Copy a public trip (full copy with itinerary items) to user's own trips
export async function copyTripFull(
  sourceTripId: string,
  startDate: string,
  daysCount: number,
  tripName: string,
  destination: string,
): Promise<Trip> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Calculate end date
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(start.getTime() + (daysCount - 1) * 86400000)
  const endDate = end.toISOString().split('T')[0]

  // 1. Create new trip
  const { data: newTrip, error: tripError } = await supabase
    .from('trips')
    .insert({
      owner_id: user.id,
      title: `[Salinan] ${tripName}`,
      destination,
      start_date: startDate,
      end_date: endDate,
      status: 'planning',
      is_public: false,
    })
    .select()
    .single()
  if (tripError) throw tripError

  // 2. Copy itinerary items from source trip
  const { data: sourceItems } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', sourceTripId)
    .order('day_number', { ascending: true })
    .order('order', { ascending: true })

  if (sourceItems && sourceItems.length > 0) {
    const newItems = sourceItems.map(({ id, created_at, trip_id, ...item }: any) => ({
      ...item,
      trip_id: newTrip.id,
    }))
    await supabase.from('itinerary_items').insert(newItems)
  }

  return newTrip as Trip
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

  // Map frontend field names → actual DB column names
  const { day, title, sort_order, latitude, longitude, ...rest } = updates as any
  const dbUpdates: Record<string, unknown> = { ...rest }
  if (day !== undefined) dbUpdates.day_number = day
  if (title !== undefined) dbUpdates.name = title
  if (sort_order !== undefined) dbUpdates.order = sort_order
  if (latitude !== undefined) dbUpdates.lat = latitude
  if (longitude !== undefined) dbUpdates.lng = longitude

  const { data, error } = await supabase
    .from('itinerary_items')
    .update(dbUpdates)
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

  // Map frontend field names → actual DB column names
  const { name, ...rest } = updates as any
  const dbUpdates: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }
  if (name !== undefined) dbUpdates.title = name

  const { data, error } = await supabase
    .from('trips')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Trip
}

// ─── Trip Members ────────────────────────────────────────────

export type TripMember = {
  id: string
  trip_id: string
  user_id: string
  name: string
  email?: string
  role: string
  status?: string
  invited_by?: string
  created_at?: string
}

export async function getTripMembers(tripId: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
  if (error) return []
  return data as TripMember[]
}

// Invite a user by email to a trip
export async function inviteTripMember(tripId: string, email: string, tripName: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Find invitee by email in profiles
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('email', email)
    .limit(1)

  if (profileErr || !profiles || profiles.length === 0) {
    throw new Error('Pengguna dengan email tersebut tidak ditemukan. Pastikan mereka sudah terdaftar.')
  }
  const invitee = profiles[0]

  // Check if already invited
  const { data: existing } = await supabase
    .from('trip_members')
    .select('id, status')
    .eq('trip_id', tripId)
    .eq('user_id', invitee.id)
    .maybeSingle()

  if (existing) {
    throw new Error(`Pengguna sudah ${existing.status === 'accepted' ? 'bergabung' : 'diundang'} ke trip ini.`)
  }

  // Create trip_members entry (pending)
  // DB role constraint: ONLY 'owner' | 'editor' | 'viewer' allowed
  const { error: memberErr } = await supabase
    .from('trip_members')
    .insert({
      trip_id: tripId,
      user_id: invitee.id,
      name: invitee.name || email.split('@')[0],
      email: invitee.email || email,
      role: 'viewer',       // was 'member' — not allowed by DB constraint
      status: 'pending',
      invited_by: user.id,
    })
  if (memberErr) throw memberErr

  // Create notification for the invitee
  const myName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Seseorang'
  await supabase
    .from('notifications')
    .insert({
      user_id: invitee.id,
      type: 'invite',
      title: `Undangan Trip: ${tripName}`,
      body: `${myName} mengundang kamu untuk bergabung ke trip "${tripName}". Terima atau tolak undangan ini.`,
      read: false,
      action_url: `trip_invite:${tripId}`,
    })

  return invitee
}

// Accept or reject a trip invitation
export async function respondToTripInvite(tripId: string, accept: boolean) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (accept) {
    const { error } = await supabase
      .from('trip_members')
      .update({ status: 'accepted' })
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
    if (error) throw error
  }
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

// Reset password (sends email)
export async function resetPasswordForEmail(email: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?type=recovery`,
  })
  if (error) throw error
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/?auth=success`,
    },
  })
  if (error) throw error
}

// Ensure profile exists for the current user (creates if missing)
export async function ensureProfile() {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const name = user.user_metadata?.full_name || user.user_metadata?.name || null

  await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: name,
      name: name,
      role: 'traveler',
    }, { onConflict: 'id' })
}

// Check if email already registered via signInWithPassword (no side effects)
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!supabase) return false
  // Attempt sign-in with a clearly-wrong password.
  // If error is "Invalid login credentials" → email EXISTS
  // If error is "Email not confirmed" → email EXISTS (unconfirmed)
  // If no error → shouldn't happen (password would be wrong)
  // If network error → return false (let signUp try)
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: '__tripplanner_check__',
  })
  if (!error) return false // weird — no error with wrong password
  const msg = error.message.toLowerCase()
  return msg.includes('invalid login credentials') || msg.includes('email not confirmed')
}

// Update password (requires current session)
export async function updatePassword(newPassword: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ─── Saved Trips ─────────────────────────────────────────────

export type SavedTrip = {
  id: string
  user_id: string
  original_trip_id?: string
  name: string
  destination: string
  days: number
  start_date?: string
  end_date?: string
  tags?: string[]
  created_at: string
}

export async function saveTrip(trip: Omit<SavedTrip, 'id' | 'user_id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('saved_trips')
    .insert({ ...trip, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as SavedTrip
}

export async function getSavedTrips() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('saved_trips')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as SavedTrip[]
}

// ─── Trip Comments ────────────────────────────────────────────

export type TripComment = {
  id: string
  trip_id: string
  user_id: string
  author_name?: string
  content: string
  created_at: string
}

export async function getComments(tripId: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('trip_comments')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data as TripComment[]
}

export async function addComment(tripId: string, content: string, authorName: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('trip_comments')
    .insert({ trip_id: tripId, user_id: user.id, content, author_name: authorName })
    .select()
    .single()
  if (error) throw error
  return data as TripComment
}