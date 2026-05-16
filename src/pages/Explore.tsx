import { motion } from "framer-motion"
import {
  Globe, Search, TrendingUp, Heart, MessageSquare, Share2,
  MapPin, Calendar, Users, Star, SlidersHorizontal,
  ChevronDown, Loader2, Plane
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Input } from "../components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface ExploreProps {
  setCurrentPage: (page: Page) => void
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
}

const GRADIENTS = [
  "from-rose-400 via-purple-500 to-indigo-600",
  "from-emerald-400 via-teal-500 to-blue-500",
  "from-pink-400 via-rose-500 to-red-500",
  "from-amber-400 via-orange-500 to-red-600",
  "from-fuchsia-400 via-pink-500 to-rose-600",
  "from-cyan-400 via-blue-500 to-indigo-600",
]

export function Explore({ setCurrentPage }: ExploreProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"popular" | "recent" | "rating">("popular")
  const [likedTrips, setLikedTrips] = useState<string[]>([])
  const [trips, setTrips] = useState<PublicTrip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase
      .from('trips')
      .select(`
        id,
        name,
        destination,
        start_date,
        end_date,
        status
      `)
      .limit(20)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          // No trips yet — show empty state
          setTrips([])
        } else {
          setTrips(data.map((t, i) => ({
            id: t.id,
            trip_id: t.id,
            name: t.name,
            destination: t.destination,
            start_date: t.start_date,
            end_date: t.end_date,
            status: t.status,
            days: t.start_date && t.end_date
              ? Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000) + 1
              : 3,
            places: 0,
            likes: Math.floor(Math.random() * 200) + 20,
            comments: Math.floor(Math.random() * 50) + 5,
            rating: 4.0 + Math.random(),
            gradient: GRADIENTS[i % GRADIENTS.length],
            tags: ["all"],
            author: "traveler",
            authorAvatar: t.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
          })))
        }
        setLoading(false)
      })
  }, [])

  const toggleLike = (id: string) => {
    setLikedTrips(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
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
            <Button variant="gradient" onClick={() => setCurrentPage("ai")}>
              <Plane className="w-4 h-4 mr-2" />
              Generate Trip dengan AI
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
              >
                {/* Image */}
                <div className={`aspect-[4/3] rounded-t-2xl bg-gradient-to-br ${trip.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10" />

                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(trip.id) }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
                        likedTrips.includes(trip.id)
                          ? "bg-red-500 text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", likedTrips.includes(trip.id) && "fill-current")} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className="glass-card px-2 py-1 text-xs text-white flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {trip.days} hari
                    </span>
                    {trip.places > 0 && (
                      <span className="glass-card px-2 py-1 text-xs text-white flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
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
                  <div className="flex items-center justify-between pt-2 border-t border-border">
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
                    <span className="text-xs text-muted-foreground capitalize">{trip.status}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}