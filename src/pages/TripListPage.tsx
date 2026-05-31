import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Calendar, MapPin, Search,
  Plus, Clock,
  Plane, Trash2, AlertTriangle
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Progress } from "../components/ui/progress"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getTrips, deleteTrip } from "../lib/supabase"
import type { Trip } from "../lib/supabase"
import { supabase } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications" | "trips"

interface TripListPageProps {
  navigateTo: (page: Page) => void
  user: any
}

type FilterTab = "semua" | "aktif" | "selesai" | "draft"

const GRADIENTS = [
  "from-rose-400 via-purple-500 to-indigo-600",
  "from-emerald-400 via-teal-500 to-blue-500",
  "from-pink-400 via-rose-500 to-red-500",
  "from-amber-400 via-orange-500 to-red-600",
  "from-violet-400 via-fuchsia-500 to-pink-500",
  "from-cyan-400 via-blue-500 to-indigo-600",
]

const EMOJIS = ["🏖️", "🏔️", "✈️", "🌸", "🏙️", "🌺"]

// Popular destination image mapping (Unsplash)
const DEST_IMAGES: Record<string, string> = {
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  jakarta: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800&q=80",
  yogyakarta: "https://images.unsplash.com/photo-1598857938317-7e52f7c8e90f?w=800&q=80",
  bandung: "https://images.unsplash.com/photo-1556268736-1d26d4d8bdc9?w=800&q=80",
  surabaya: "https://images.unsplash.com/photo-1580130712686-1c5e5d5e4c7a?w=800&q=80",
  lombok: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80",
  bromo: "https://images.unsplash.com/photo-1580057573934-bfd0f7b29e40?w=800&q=80",
  komodo: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800&q=80",
  Raja_Ampat: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80",
  labuan_bajo: "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=800&q=80",
  flores: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80",
  semarang: "https://images.unsplash.com/photo-1570521462031-7e80f2f76f36?w=800&q=80",
  malang: "https://images.unsplash.com/photo-1583508915901-b46f4c9b59a0?w=800&q=80",
  denpasar: "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=800&q=80",
  medan: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  makassar: "https://images.unsplash.com/photo-1577906096429-f73b2c38e82c?w=800&q=80",
  padang: "https://images.unsplash.com/photo-1550431476-8c80b0a3e6be?w=800&q=80",
  pekalongan: "https://images.unsplash.com/photo-1583786803926-94ef56c54c1e?w=800&q=80",
 Solo: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
  jogja: "https://images.unsplash.com/photo-1598857938317-7e52f7c8e90f?w=800&q=80",
  "NTB": "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80",
  "NTT": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80",
  aceh: "https://images.unsplash.com/photo-1550431476-8c80b0a3e6be?w=800&q=80",
  lampung: "https://images.unsplash.com/photo-1576086213369-c5b79156bb57?w=800&q=80",
  bengkulu: "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800&q=80",
  jambi: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&q=80",
  riau: "https://images.unsplash.com/photo-1577906096429-f73b2c38e82c?w=800&q=80",
  kalimantan: "https://images.unsplash.com/photo-1550997802-5568-40ae6a0be7e4?w=800&q=80",
  sulawesi: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
  papua: "https://images.unsplash.com/photo-1550952726624-21fbba5bab6e?w=800&q=80",
  jepang: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80",
  japan: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80",
  korea: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80",
  thailand: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
  malaysia: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80",
  australia: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80",
  europa: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
  usa: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
}

// Get destination image - check mapping first, then use keyword-based Unsplash
function getDestinationImage(destination: string): string | null {
  if (!destination) return null
  const dest = destination.toLowerCase()
  for (const [key, url] of Object.entries(DEST_IMAGES)) {
    if (dest.includes(key.toLowerCase())) return url
  }
  // Keyword-based: append travel keyword to destination for better results
  return `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80`
  // Alternative keywords per destination type (fallback if above fails):
  // Nature: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
  // Beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"
  // City: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80"
}

function getStatusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    planning: { label: "Planning", color: "bg-blue-500/20 text-blue-400" },
    active: { label: "Aktif", color: "bg-emerald-500/20 text-emerald-400" },
    completed: { label: "Selesai", color: "bg-gray-500/20 text-gray-400" },
  }
  return map[status] || { label: status, color: "bg-gray-500/20 text-gray-400" }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Belum diatur"
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function getDuration(start: string | undefined, end: string | undefined): number {
  if (!start || !end) return 0
  const s = new Date(start + "T00:00:00").getTime()
  const e = new Date(end + "T00:00:00").getTime()
  return Math.max(1, Math.round((e - s) / 86400000) + 1)
}

export function TripListPage({ navigateTo, user }: TripListPageProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState<FilterTab>("semua")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getTrips()
        setTrips(data)
      } catch {
        setTrips([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDelete = async (tripId: string) => {
    setDeletingId(tripId)
    try {
      await deleteTrip(tripId)
      setTrips(prev => prev.filter(t => t.id !== tripId))
    } catch (err) {
      console.error("Delete trip error:", err)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  // Sort by date: upcoming first, then past last
  const sortedTrips = [...trips].sort((a, b) => {
    const aDate = a.start_date ? new Date(a.start_date + "T00:00:00").getTime() : 0
    const bDate = b.start_date ? new Date(b.start_date + "T00:00:00").getTime() : 0
    const now = Date.now()
    // Upcoming trips first (future dates), then past trips
    const aIsUpcoming = aDate >= now
    const bIsUpcoming = bDate >= now
    if (aIsUpcoming && !bIsUpcoming) return -1
    if (!aIsUpcoming && bIsUpcoming) return 1
    return bDate - aDate
  })

  // Apply filter
  const filteredTrips = sortedTrips.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterTab === "semua" ||
      (filterTab === "aktif" && t.status === "active") ||
      (filterTab === "selesai" && t.status === "completed") ||
      (filterTab === "draft" && t.status === "planning")

    return matchesSearch && matchesFilter
  })

  const countByStatus = {
    semua: trips.length,
    aktif: trips.filter((t) => t.status === "active").length,
    selesai: trips.filter((t) => t.status === "completed").length,
    draft: trips.filter((t) => t.status === "planning").length,
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigateTo("home")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black">Trip Kamu</h1>
            <p className="text-sm text-muted-foreground">{trips.length} trip tersimpan</p>
          </div>
          <div className="ml-auto">
            <Button variant="gradient" size="sm" onClick={() => navigateTo("editor")}>
              <Plus className="w-4 h-4 mr-1" />
              Buat Trip
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari trip atau destination..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(["semua", "aktif", "selesai", "draft"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                filterTab === tab
                  ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-md"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <Badge
                variant={filterTab === tab ? "glass" : "secondary"}
                className={cn(
                  "text-xs px-1.5",
                  filterTab === tab ? "bg-white/20 text-white" : "text-muted-foreground"
                )}
              >
                {countByStatus[tab]}
              </Badge>
            </button>
          ))}
        </div>

        {/* Trip Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center mx-auto">
              <Plane className="w-8 h-8 text-[var(--aurora-start)]" />
            </div>
            <div>
              <p className="font-bold text-lg">
                {searchQuery ? "Trip tidak ditemukan" : filterTab !== "semua" ? `Belum ada trip ${filterTab}` : "Belum ada trip"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? "Coba kata kunci lain" : "Buat trip pertamamu dengan AI!"}
              </p>
            </div>
            {!searchQuery && (
              <Button variant="gradient" onClick={() => navigateTo("editor")}>
                <Plus className="w-4 h-4 mr-2" />
                Buat Trip Baru
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map((trip, i) => {
              const statusInfo = getStatusLabel(trip.status)
              const gradient = GRADIENTS[i % GRADIENTS.length]
              const emoji = EMOJIS[i % EMOJIS.length]
              const duration = getDuration(trip.start_date, trip.end_date)

              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-[var(--aurora-start)]/30 hover:shadow-md transition-all duration-300 group relative"
                >
                  {/* Confirm Delete Overlay */}
                  <AnimatePresence>
                    {confirmDeleteId === trip.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 bg-black/70 flex flex-col items-center justify-center gap-3 rounded-2xl p-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                        <p className="text-white text-sm font-semibold text-center">Hapus trip "{trip.name}"?</p>
                        <p className="text-white/70 text-xs text-center">Tindakan ini tidak bisa dibatalkan.</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10"
                            onClick={() => setConfirmDeleteId(null)}>Batal</Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => handleDelete(trip.id)}
                            disabled={deletingId === trip.id}>
                            {deletingId === trip.id ? "Menghapus..." : "Hapus"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cover */}
                  <div
                    className="aspect-video relative overflow-hidden"
                    onClick={() => navigateTo("editor")}
                  >
                    {/* Always-visible gradient background */}
                    <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
                    {/* Image overlays gradient */}
                    {(() => {
                      const imgUrl = getDestinationImage(trip.destination)
                      return imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={trip.destination}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                      ) : null
                    })()}
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className={cn("px-2 py-1 rounded-lg text-xs font-medium glass-card", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                      {/* Delete button — visible on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(trip.id) }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-all"
                        title="Hapus trip"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      <span className="glass-card px-2 py-1 text-xs text-white flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {trip.destination}
                      </span>
                      {duration > 0 && (
                        <span className="glass-card px-2 py-1 text-xs text-white">
                          {duration}h
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="text-2xl">{emoji}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4" onClick={() => navigateTo("editor")}>
                    <h3 className="font-bold group-hover:text-[var(--aurora-start)] transition-colors">{trip.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {trip.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(trip.start_date)}
                        </span>
                      )}
                      {trip.start_date && trip.end_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {duration} hari
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span className="font-medium">
                          {trip.status === "completed" ? "100" : trip.status === "active" ? "60" : "20"}%
                        </span>
                      </div>
                      <Progress
                        value={trip.status === "completed" ? 100 : trip.status === "active" ? 60 : 20}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}