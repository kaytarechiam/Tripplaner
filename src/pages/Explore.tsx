import { motion, AnimatePresence } from "framer-motion"
import {
  Globe, Search, TrendingUp, Heart, MessageSquare, Share2,
  MapPin, Calendar, Star,
  Loader2, Plane
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Input } from "../components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { TripDetailModal } from "../components/TripDetailModal"

// Pre-seeded destination images from Unsplash (reliable, no API key needed)
const DESTINATION_IMAGES: Record<string, string> = {
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  lombok: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80",
  jakarta: "https://images.unsplash.com/photo-1558636508-e0db3813bd1d?w=800&q=80",
  bandung: "https://images.unsplash.com/photo-1617871196891-2b6e44e6b6a6?w=800&q=80",
  jogja: "https://images.unsplash.com/photo-1568402102990-bc541580a0d5?w=800&q=80",
  yogyakarta: "https://images.unsplash.com/photo-1568402102990-bc541580a0d5?w=800&q=80",
  surabaya: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  semarang: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
  malang: "https://images.unsplash.com/photo-1570459027562-4a916cc6111f?w=800&q=80",
  Raja_Ampat: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80",
  komodo: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
  labuan_bajo: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
  flores: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  nusa_penida: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  ubud: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  kuta: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  seminyak: "https://images.unsplash.com/photo-1570459027562-4a916cc6111f?w=800&q=80",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80",
}

function getDestinationImage(destination: string): string | null {
  const key = destination.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  return DESTINATION_IMAGES[key] || DESTINATION_IMAGES[Object.keys(DESTINATION_IMAGES).find(k => key.includes(k)) || ""] || null
}

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface ExploreProps {
  navigateTo: (page: Page) => void
}

const categories = [
  { id: "all", label: "Semua", emoji: "🌍" },
  { id: "beach", label: "Pantai", emoji: "🏖️" },
  { id: "mountain", label: "Gunung", emoji: "🏔️" },
  { id: "city", label: "Kota", emoji: "🏙️" },
  { id: "culinary", label: "Kuliner", emoji: "🍜" },
  { id: "culture", label: "Budaya", emoji: "🏛️" },
]

interface PublicTrip {
  id: string
  trip_id: string
  name: string
  destination: string
  start_date: string | null
  end_date: string | null
  status: string
  days: number
  places: number
  likes: number
  comments: number
  rating: number
  gradient: string
  tags: string[]
  author: string
  authorAvatar: string
  image?: string
}

const GRADIENTS = [
  "from-rose-400 via-purple-500 to-indigo-600",
  "from-emerald-400 via-teal-500 to-blue-500",
  "from-pink-400 via-rose-500 to-red-500",
  "from-amber-400 via-orange-500 to-red-600",
  "from-fuchsia-400 via-pink-500 to-rose-600",
  "from-cyan-400 via-blue-500 to-indigo-600",
]

// High-quality destination images from Unsplash
const DEST_IMAGES: Record<string, string> = {
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  yogyakarta: "https://images.unsplash.com/photo-1598857938317-7e52f7c8e90f?w=800&q=80",
  lombok: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80",
  jakarta: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800&q=80",
  bandung: "https://images.unsplash.com/photo-1556268736-1d26d4d8bdc9?w=800&q=80",
  surabaya: "https://images.unsplash.com/photo-1580130712686-1c5e5d5e4c7a?w=800&q=80",
  komodo: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800&q=80",
  rajampat: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80",
  bromo: "https://images.unsplash.com/photo-1580057573934-bfd0f7b29e40?w=800&q=80",
  semarang: "https://images.unsplash.com/photo-1570521462031-7e80f2f76f36?w=800&q=80",
  malang: "https://images.unsplash.com/photo-1583508915901-b46f4c9b59a0?w=800&q=80",
  denpasar: "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=800&q=80",
}

// Mock trending trips for dev mode
const MOCK_TRIPS: PublicTrip[] = [
  {
    id: "mock-1",
    trip_id: "mock-1",
    name: "3 Hari Menjelajahi Bali Utara",
    destination: "Bali, Indonesia",
    start_date: "2026-06-15",
    end_date: "2026-06-17",
    status: "planning",
    days: 3,
    places: 8,
    likes: 1243,
    comments: 89,
    rating: 4.9,
    gradient: "from-emerald-400 via-teal-500 to-blue-500",
    tags: ["beach", "culture"],
    author: "traveler_bali",
    authorAvatar: "TB",
    image: DEST_IMAGES.bali,
  },
  {
    id: "mock-2",
    trip_id: "mock-2",
    name: "Weekend Food Tour Jakarta",
    destination: "Jakarta, Indonesia",
    start_date: "2026-05-25",
    end_date: "2026-05-26",
    status: "active",
    days: 2,
    places: 12,
    likes: 892,
    comments: 56,
    rating: 4.7,
    gradient: "from-rose-400 via-purple-500 to-indigo-600",
    tags: ["culinary", "city"],
    author: "foodie_jkt",
    authorAvatar: "FJ",
    image: DEST_IMAGES.jakarta,
  },
  {
    id: "mock-3",
    trip_id: "mock-3",
    name: "Petualangan Gunung Bromo",
    destination: "Bromo, Jawa Timur",
    start_date: "2026-07-01",
    end_date: "2026-07-02",
    status: "planning",
    days: 2,
    places: 5,
    likes: 2156,
    comments: 134,
    rating: 4.8,
    gradient: "from-amber-400 via-orange-500 to-red-600",
    tags: ["mountain", "nature"],
    author: "adventure_seeker",
    authorAvatar: "AS",
    image: DEST_IMAGES.bromo,
  },
  {
    id: "mock-4",
    trip_id: "mock-4",
    name: "Romantis di Yogyakarta",
    destination: "Yogyakarta, Indonesia",
    start_date: "2026-08-10",
    end_date: "2026-08-13",
    status: "planning",
    days: 4,
    places: 10,
    likes: 1567,
    comments: 98,
    rating: 4.9,
    gradient: "from-pink-400 via-rose-500 to-red-500",
    tags: ["culture", "city"],
    author: "yogi_lover",
    authorAvatar: "YL",
    image: DEST_IMAGES.yogyakarta,
  },
  {
    id: "mock-5",
    trip_id: "mock-5",
    name: "Surf Camp di Lombok",
    destination: "Lombok, NTB",
    start_date: "2026-09-05",
    end_date: "2026-09-09",
    status: "planning",
    days: 5,
    places: 7,
    likes: 1893,
    comments: 112,
    rating: 4.8,
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    tags: ["beach", "nature"],
    author: "surf_chick",
    authorAvatar: "SC",
    image: DEST_IMAGES.lombok,
  },
  {
    id: "mock-6",
    trip_id: "mock-6",
    name: "Road Trip Bandung ke Ciwidey",
    destination: "Bandung, Jawa Barat",
    start_date: "2026-05-30",
    end_date: "2026-06-01",
    status: "active",
    days: 3,
    places: 9,
    likes: 756,
    comments: 43,
    rating: 4.6,
    gradient: "from-fuchsia-400 via-pink-500 to-rose-600",
    tags: ["mountain", "culinary"],
    author: "roadtrippers",
    authorAvatar: "RT",
    image: DEST_IMAGES.bandung,
  },
  {
    id: "mock-7",
    trip_id: "mock-7",
    name: "Diving Paradise Raja Ampat",
    destination: "Raja Ampat, Papua",
    start_date: "2026-10-15",
    end_date: "2026-10-22",
    status: "planning",
    days: 7,
    places: 6,
    likes: 3421,
    comments: 201,
    rating: 4.9,
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    tags: ["beach", "nature"],
    author: "dive_master",
    authorAvatar: "DM",
    image: DEST_IMAGES.rajaapat,
  },
  {
    id: "mock-8",
    trip_id: "mock-8",
    name: "City Break di Surabaya",
    destination: "Surabaya, Jawa Timur",
    start_date: "2026-06-20",
    end_date: "2026-06-21",
    status: "completed",
    days: 2,
    places: 8,
    likes: 432,
    comments: 28,
    rating: 4.5,
    gradient: "from-rose-400 via-purple-500 to-indigo-600",
    tags: ["city", "culinary"],
    author: "surabaya_native",
    authorAvatar: "SN",
    image: DEST_IMAGES.surabaya,
  },
  {
    id: "mock-9",
    trip_id: "mock-9",
    name: "Petualangan Komodo & Pink Beach",
    destination: "Komodo, NTT",
    start_date: "2026-11-01",
    end_date: "2026-11-05",
    status: "planning",
    days: 5,
    places: 8,
    likes: 2765,
    comments: 156,
    rating: 4.9,
    gradient: "from-emerald-400 via-teal-500 to-blue-500",
    tags: ["beach", "nature"],
    author: "eco_traveler",
    authorAvatar: "ET",
    image: DEST_IMAGES.komodo,
  },
  {
    id: "mock-10",
    trip_id: "mock-10",
    name: "Weekend di Kota Semarang",
    destination: "Semarang, Jawa Tengah",
    start_date: "2026-06-15",
    end_date: "2026-06-17",
    status: "active",
    days: 3,
    places: 10,
    likes: 543,
    comments: 34,
    rating: 4.5,
    gradient: "from-amber-400 via-orange-500 to-red-600",
    tags: ["culinary", "city", "culture"],
    author: "semarang_walker",
    authorAvatar: "SW",
    image: DEST_IMAGES.semarang,
  },
  {
    id: "mock-11",
    trip_id: "mock-11",
    name: "Healing di Malang & Batu",
    destination: "Malang, Jawa Timur",
    start_date: "2026-07-10",
    end_date: "2026-07-14",
    status: "planning",
    days: 4,
    places: 9,
    likes: 1234,
    comments: 67,
    rating: 4.7,
    gradient: "from-emerald-400 via-teal-500 to-blue-500",
    tags: ["nature", "mountain"],
    author: "heal_seeker",
    authorAvatar: "HS",
    image: DEST_IMAGES.malang,
  },
  {
    id: "mock-12",
    trip_id: "mock-12",
    name: "Explore Budaya & Kuliner Solo",
    destination: "Solo, Jawa Tengah",
    start_date: "2026-08-01",
    end_date: "2026-08-03",
    status: "completed",
    days: 3,
    places: 11,
    likes: 876,
    comments: 52,
    rating: 4.6,
    gradient: "from-pink-400 via-rose-500 to-red-500",
    tags: ["culture", "culinary"],
    author: "solo_explorer",
    authorAvatar: "SE",
    image: DEST_IMAGES.yogyakarta,
  },
  {
    id: "mock-13",
    trip_id: "mock-13",
    name: "Petualangan 5 Hari di Yogyakarta",
    destination: "Yogyakarta, Indonesia",
    start_date: "2026-07-10",
    end_date: "2026-07-14",
    status: "planning",
    days: 5,
    places: 14,
    likes: 2156,
    comments: 134,
    rating: 4.9,
    gradient: "from-amber-400 via-orange-500 to-red-500",
    tags: ["culture", "history", "nature"],
    author: "jogja_lover",
    authorAvatar: "JL",
    image: "https://images.unsplash.com/photo-1596546731098-4f4e5ad6e3a5?w=800&q=80",
  },
  {
    id: "mock-14",
    trip_id: "mock-14",
    name: "Weekend Escape ke Bandung",
    destination: "Bandung, Jawa Barat",
    start_date: "2026-06-20",
    end_date: "2026-06-22",
    status: "planning",
    days: 2,
    places: 8,
    likes: 1823,
    comments: 98,
    rating: 4.7,
    gradient: "from-green-400 via-emerald-500 to-teal-500",
    tags: ["nature", "culinary"],
    author: "bandung_explorer",
    authorAvatar: "BE",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    id: "mock-15",
    trip_id: "mock-15",
    name: "Liburan Musim Panas di Lombok",
    destination: "Lombok, NTB",
    start_date: "2026-08-15",
    end_date: "2026-08-20",
    status: "planning",
    days: 5,
    places: 12,
    likes: 1654,
    comments: 87,
    rating: 4.8,
    gradient: "from-cyan-400 via-blue-500 to-indigo-500",
    tags: ["beach", "nature"],
    author: "lombok_traveler",
    authorAvatar: "LT",
    image: "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?w=800&q=80",
  },
  {
    id: "mock-16",
    trip_id: "mock-16",
    name: "Backpacking Budaya Jawa Timur",
    destination: "Jawa Timur, Indonesia",
    start_date: "2026-09-01",
    end_date: "2026-09-07",
    status: "planning",
    days: 7,
    places: 18,
    likes: 987,
    comments: 45,
    rating: 4.6,
    gradient: "from-purple-400 via-pink-500 to-rose-500",
    tags: ["culture", "history"],
    author: "jawa_explorer",
    authorAvatar: "JE",
    image: "https://images.unsplash.com/photo-1537531383496-f4749b8032cf?w=800&q=80",
  },
]

export function Explore({ navigateTo }: ExploreProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"popular" | "recent" | "rating">("popular")
  const [trips, setTrips] = useState<PublicTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<PublicTrip | null>(null)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      // Dev mode: show mock trending trips
      setTrips(MOCK_TRIPS)
      setLoading(false)
      return
    }
    // Fetch trips + their like/comment counts in parallel
    Promise.all([
      supabase
        .from('trips')
        .select(`id, title, name, destination, start_date, end_date, status, cover_gradient, tags, profiles(name, avatar_url)`)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('trip_likes').select('trip_id'),
      supabase.from('trip_comments').select('trip_id'),
    ]).then(([{ data, error }, { data: likesData }, { data: commentsData }]) => {
      if (error || !data || data.length === 0) {
        setTrips(MOCK_TRIPS)
      } else {
        // Build count maps
        const likeMap: Record<string, number> = {}
        const commentMap: Record<string, number> = {}
        ;(likesData || []).forEach((r: any) => { likeMap[r.trip_id] = (likeMap[r.trip_id] || 0) + 1 })
        ;(commentsData || []).forEach((r: any) => { commentMap[r.trip_id] = (commentMap[r.trip_id] || 0) + 1 })

        setTrips(data.map((t: any, i: number) => {
          const tripName = t.title || t.name || 'Trip'
          const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
          const authorName = profile?.name || 'traveler'
          const authorAvatar = authorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
          const rawTags: string[] = Array.isArray(t.tags) && t.tags.length > 0 ? t.tags : ['all']
          return {
            id: t.id,
            trip_id: t.id,
            name: tripName,
            destination: t.destination || '',
            start_date: t.start_date,
            end_date: t.end_date,
            status: t.status,
            days: t.start_date && t.end_date
              ? Math.max(1, Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000) + 1)
              : 3,
            places: 0,
            likes: likeMap[t.id] || 0,
            comments: commentMap[t.id] || 0,
            rating: parseFloat((4.0 + Math.random() * 0.9).toFixed(1)),
            gradient: t.cover_gradient || GRADIENTS[i % GRADIENTS.length],
            tags: rawTags,
            author: authorName,
            authorAvatar,
            image: getDestinationImage(t.destination || '') || undefined,
          } as PublicTrip
        }))
      }
      setLoading(false)
    })
  }, [])

  const showToast = (msg: string) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 3000)
  }

  const filteredTrips = trips.filter(trip => {
    const matchesCategory = selectedCategory === "all" || trip.tags.includes(selectedCategory)
    const matchesSearch = trip.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trip.destination?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (sortBy === "popular") return b.likes - a.likes
    if (sortBy === "rating") return b.rating - a.rating
    return 0
  })

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search & Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Cari trip, destinasi, atau penulis..."
              className="pl-12 h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === cat.id
                      ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-lg"
                      : "glass-card hover:bg-white/20"
                  )}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="popular">Terpopuler</option>
                <option value="recent">Terbaru</option>
                <option value="rating">Rating Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trending Tags */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto">
          <span className="text-sm text-muted-foreground shrink-0">Trending:</span>
          {["#Bali", "#Tokyo", "#JalanJalan", "#Foodie", "#Adventure", "#Romantis"].map((tag, i) => (
            <button
              key={i}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-medium glass-card hover:bg-white/20 transition-colors flex items-center gap-1"
            >
              <TrendingUp className="w-3 h-3" />
              {tag}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
          </div>
        ) : sortedTrips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center mx-auto mb-6">
              <Globe className="w-10 h-10 text-[var(--aurora-start)]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Belum ada trip publik</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Jadilah yang pertama mempublish tripmu! Buat itinerary dan bagikan ke komunitas.
            </p>
            <Button variant="gradient" onClick={() => navigateTo("editor")}>
              <Plane className="w-4 h-4 mr-2" />
              Buat Trip Baru
            </Button>
          </div>
        ) : (
          /* Itinerary Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTrips.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover overflow-hidden group cursor-pointer"
                onClick={() => setSelectedTrip(trip)}
              >
                {/* Image */}
                <div className="aspect-[4/3] rounded-t-2xl relative overflow-hidden">
                  {/* Always-visible gradient background */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br", trip.gradient)} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <span className="text-7xl">🌏</span>
                  </div>
                  {/* Image overlays gradient */}
                  {(() => {
                    const imgSrc = trip.image || getDestinationImage(trip.destination)
                    return imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={trip.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none" }}
                      />
                    ) : null
                  })()}

                  {/* Actions — hanya Share, Simpan dihapus (pakai Salin di modal) */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        const url = `${window.location.origin}/explore?trip=${trip.id}`
                        if (navigator.share) {
                          try { await navigator.share({ title: trip.name, text: `Check out this trip: ${trip.name}`, url }) } catch {}
                        } else {
                          await navigator.clipboard.writeText(url)
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className="glass-card px-2 py-1 text-xs text-black flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-black" />
                      {trip.days} hari
                    </span>
                    {trip.places > 0 && (
                      <span className="glass-card px-2 py-1 text-xs text-black flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-black" />
                        {trip.places} tempat
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-[var(--aurora-start)] transition-colors">
                      {trip.name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {trip.destination}
                    </p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[10px] bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)]">
                          {trip.authorAvatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">@{trip.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium">{trip.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center pt-2 border-t border-border">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {trip.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {trip.comments}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Trip Detail Modal */}
      <TripDetailModal
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onCopied={() => showToast("✅ Trip berhasil disalin ke Trip Saya!")}
      />

      {/* Save toast notification */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium shadow-xl"
          >
            {saveToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}