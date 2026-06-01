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
import { supabase, saveTrip } from "../lib/supabase"
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


export function Explore({ navigateTo }: ExploreProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"popular" | "recent" | "rating">("popular")
  const [trips, setTrips] = useState<PublicTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<PublicTrip | null>(null)
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const [savedTripIds, setSavedTripIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setTrips([])
      setLoading(false)
      return
    }
    // Load saved trip IDs for the current user (to show heart state)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase!.from('saved_trips').select('original_trip_id').eq('user_id', user.id)
          .then(({ data }) => {
            if (data) setSavedTripIds(new Set(data.map((r: any) => r.original_trip_id).filter(Boolean)))
          })
      }
    })

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
        setTrips([])
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

  const handleSave = async (e: React.MouseEvent, trip: PublicTrip) => {
    e.stopPropagation()
    if (!supabase) { showToast("Login dulu untuk menyimpan trip"); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast("Login dulu untuk menyimpan trip"); return }

    // Toggle: if already saved, unsave it
    if (savedTripIds.has(trip.id)) {
      await supabase.from('saved_trips').delete()
        .eq('user_id', user.id)
        .eq('original_trip_id', trip.id)
      setSavedTripIds(prev => { const s = new Set(prev); s.delete(trip.id); return s })
      showToast("❌ Dihapus dari Disimpan")
      return
    }

    setSavingId(trip.id)
    try {
      await saveTrip({
        original_trip_id: trip.id,
        name: trip.name,
        destination: trip.destination,
        days: trip.days,
        start_date: trip.start_date || undefined,
        end_date: trip.end_date || undefined,
        tags: trip.tags,
      })
      setSavedTripIds(prev => new Set([...prev, trip.id]))
      showToast("❤️ Trip disimpan ke Disimpan!")
    } catch (err) {
      console.error("Save trip error:", err)
      showToast("Gagal menyimpan trip. Coba lagi.")
    } finally {
      setSavingId(null)
    }
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

                  {/* Actions — Share + Simpan */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleSave(e, trip)}
                      disabled={savingId === trip.id}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
                      title={savedTripIds.has(trip.id) ? "Hapus dari Disimpan" : "Simpan ke Disimpan"}
                    >
                      <Heart className={cn("w-4 h-4", savedTripIds.has(trip.id) ? "fill-red-400 text-red-400" : "")} />
                    </button>
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
                      <button
                        className="flex items-center gap-1 hover:text-red-400 transition-colors"
                        onClick={(e) => handleSave(e, trip)}
                        title={savedTripIds.has(trip.id) ? "Hapus dari Disimpan" : "Simpan ke Disimpan"}
                      >
                        <Heart className={cn("w-4 h-4", savedTripIds.has(trip.id) ? "fill-red-400 text-red-400" : "")} />
                        {trip.likes}
                      </button>
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