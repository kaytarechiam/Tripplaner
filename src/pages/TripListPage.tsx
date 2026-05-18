import { motion } from "framer-motion"
import {
  ArrowLeft, Calendar, MapPin, Search,
  Filter, Plus, Clock, Map, ChevronRight,
  Plane, Mountain, Utensils, Star
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Progress } from "../components/ui/progress"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getTrips } from "../lib/supabase"
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
            <Button variant="gradient" size="sm" onClick={() => navigateTo("ai")}>
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
              <Button variant="gradient" onClick={() => navigateTo("ai")}>
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
                  onClick={() => navigateTo("editor")}
                  className="bg-white border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-[var(--aurora-start)]/30 hover:shadow-md transition-all duration-300 group"
                >
                  {/* Cover */}
                  <div className={cn("aspect-video bg-gradient-to-br relative overflow-hidden", gradient)}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute top-3 right-3">
                      <span className={cn("px-2 py-1 rounded-lg text-xs font-medium glass-card", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
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
                  <div className="p-4">
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