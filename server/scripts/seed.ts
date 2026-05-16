import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role bypasses RLS but NOT foreign key constraints
// We seed only public-facing data that doesn't need a real user_id
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

async function seed() {
  console.log('🌱 Seeding sample data...\n')

  // ── 1. Bucket List Items (no user_id FK — just placeholders for UI) ──
  console.log('📋 Seeding bucket list placeholders...')
  // We'll use a placeholder user UUID so the seed doesn't fail on FK
  // These get linked to actual user on first login via RLS
  const { data: existing } = await supabase
    .from('bucket_list')
    .select('id')
    .limit(1)

  if (!existing || existing.length === 0) {
    // Insert as the service role — RLS won't apply but FK will
    // Use demo placeholder; users will see these until they add their own
    const { error } = await supabase.from('bucket_list').insert([
      { user_id: DEMO_USER_ID, place_name: 'Kyoto', country: 'Jepang', priority: 'high', notes: 'Jangan lupa coba matcha!' },
      { user_id: '00000000-0000-0000-0000-000000000001', place_name: 'Santorini', country: 'Yunani', priority: 'high', notes: 'Sunset terbaik di dunia' },
      { user_id: '00000000-0000-0000-0000-000000000001', place_name: 'Reykjavik', country: 'Islandia', priority: 'medium', notes: 'Northern lights season!' },
      { user_id: '00000000-0000-0000-0000-000000000001', place_name: 'Maldives', country: 'Maladewa', priority: 'high', notes: 'Overwater bungalow dreams!' },
      { user_id: '00000000-0000-0000-0000-000000000001', place_name: 'New York', country: 'Amerika Serikat', priority: 'medium', notes: 'Times Square + Central Park' },
      { user_id: '00000000-0000-0000-0000-000000000001', place_name: 'Barcelona', country: 'Spanyol', priority: 'medium', notes: 'Gaudi architecture + tapas' },
    ])
    if (error) {
      console.log('   Note: bucket_list insert failed (expected — no user exists yet):', error.message)
    } else {
      console.log('   ✅ Inserted 6 bucket list items\n')
    }
  } else {
    console.log('   ℹ️  Bucket list already has data, skipping\n')
  }

  // ── 2. Seed Notifications (for demo user placeholder) ──
  console.log('🔔 Seeding notification placeholders...')
  const { data: existingNotif } = await supabase
    .from('notifications')
    .select('id')
    .limit(1)

  if (!existingNotif || existingNotif.length === 0) {
    const { error } = await supabase.from('notifications').insert([
      { user_id: '00000000-0000-0000-0000-000000000001', type: 'ai', title: 'AI Itinerary Ready!', body: 'Itinerary untuk trip Tokyo sudah siap.', link: '/ai', read: false },
      { user_id: '00000000-0000-0000-0000-000000000001', type: 'badge', title: 'Badge Baru!', body: 'Kamu mendapat badge Explorer', link: '/achievements', read: false },
      { user_id: '00000000-0000-0000-0000-000000000001', type: 'ai', title: 'Trip Recommendation', body: 'Coba visit Bali! Banyak tempat menarik.', link: '/ai', read: true },
    ])
    if (error) {
      console.log('   Note: notifications insert failed:', error.message)
    } else {
      console.log('   ✅ Inserted 3 notification templates\n')
    }
  }

  // ── 3. Clean up stale placeholder data ──
  console.log('🧹 Cleaning placeholder records...')
  const { error: cleanError } = await supabase
    .from('public_trips')
    .delete()
    .is('user_id', '00000000-0000-0000-0000-000000000001')
  if (cleanError) {
    console.log('   Note:', cleanError.message)
  } else {
    console.log('   ✅ Cleaned up old placeholder data\n')
  }

  // ── 4. Insert Public Trips (for Explore page — visible to all) ──
  console.log('🌍 Seeding public trip inspirations (Explore page)...')
  const publicTrips = [
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      name: '3 Hari di Tokyo',
      destination: 'Tokyo, Jepang',
      start_date: '2025-07-15',
      end_date: '2025-07-18',
      status: 'completed',
      cover_image: null,
      collaborators: [],
      public_trip: { likes: 234, views: 1240, is_public: true, gradient: 'from-rose-400 via-purple-500 to-indigo-600', tags: ['city', 'culinary', 'culture'] },
    },
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Bali Adventure 5 Hari',
      destination: 'Bali, Indonesia',
      start_date: '2025-08-01',
      end_date: '2025-08-06',
      status: 'active',
      cover_image: null,
      collaborators: [],
      public_trip: { likes: 456, views: 2100, is_public: true, gradient: 'from-emerald-400 via-teal-500 to-blue-500', tags: ['beach', 'nature'] },
    },
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Food Tour Seoul',
      destination: 'Seoul, Korea Selatan',
      start_date: '2025-09-10',
      end_date: '2025-09-14',
      status: 'planning',
      cover_image: null,
      collaborators: [],
      public_trip: { likes: 189, views: 890, is_public: true, gradient: 'from-pink-400 via-rose-500 to-red-500', tags: ['city', 'culinary'] },
    },
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Trekking Gunung Bromo',
      destination: 'Bromo, Jawa Timur',
      start_date: '2025-10-05',
      end_date: '2025-10-07',
      status: 'planning',
      cover_image: null,
      collaborators: [],
      public_trip: { likes: 312, views: 1560, is_public: true, gradient: 'from-amber-400 via-orange-500 to-red-600', tags: ['nature', 'adventure'] },
    },
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Romantic Paris Weekend',
      destination: 'Paris, Prancis',
      start_date: '2025-12-20',
      end_date: '2025-12-24',
      status: 'planning',
      cover_image: null,
      collaborators: [],
      public_trip: { likes: 567, views: 3200, is_public: true, gradient: 'from-fuchsia-400 via-pink-500 to-rose-600', tags: ['city', 'culture', 'romantic'] },
    },
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Beach Hopping Lombok',
      destination: 'Lombok, Indonesia',
      start_date: '2025-11-01',
      end_date: '2025-11-05',
      status: 'planning',
      cover_image: null,
      collaborators: [],
      public_trip: { likes: 278, views: 1100, is_public: true, gradient: 'from-cyan-400 via-blue-500 to-indigo-600', tags: ['beach', 'nature'] },
    },
  ]

  // Insert trips first
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .insert(publicTrips.map(t => ({
      user_id: t.user_id,
      name: t.name,
      destination: t.destination,
      start_date: t.start_date,
      end_date: t.end_date,
      status: t.status,
      cover_image: t.cover_image,
      collaborators: t.collaborators,
    })))
    .select()

  if (tripsError) {
    console.error('❌ Failed to seed trips (FK constraint — no demo user yet):', tripsError.message)
    console.log('\n💡 To seed trips, first create an account via the app then run seed again.')
    console.log('   For now, public trips data will be loaded directly in the frontend.\n')
  } else {
    console.log(`✅ Inserted ${trips.length} public trips`)

    // Link to public_trips
    const publicTripLinks = trips.map(trip => ({
      trip_id: trip.id,
      user_id: trip.user_id,
      is_public: true,
      likes: publicTrips.find(t => t.name === trip.name)?.public_trip.likes || 100,
      views: publicTrips.find(t => t.name === trip.name)?.public_trip.views || 500,
    }))

    const { error: publicError } = await supabase.from('public_trips').insert(publicTripLinks)
    if (publicError) {
      console.log('   Note: public_trips link failed:', publicError.message)
    } else {
      console.log('✅ Linked to public_trips\n')
    }
  }

  console.log('\n🎉 Seeding complete!')
  console.log('\n📌 NOTE: Untuk seed TRIP dan ITINERARY ITEM, kamu perlu:')
  console.log('   1. Daftar/login ke aplikasi dulu')
  console.log('   2. Setelah itu, trips akan tersimpan otomatis dengan user_id kamu')
  console.log('   3. Atau: bikin user manual di Supabase Dashboard > Authentication')
}

seed().catch(console.error)