// src/pages/BucketList.tsx — "Trip Saya"
import { motion } from "framer-motion"
import { MapPin, Calendar, Plus, Bookmark, Loader2 } from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getTrips, getSavedTrips, supabase } from "../lib/supabase"
import type { Trip, SavedTrip } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications" | "trips"

interface BucketListProps {
  navigateTo: (page: Page) => void
}

export function BucketList({ navigateTo }: BucketListProps) {
  const [activeTab, setActiveTab] = useState<"mytrips" | "saved">("mytrips")
  const [myTrips, setMyTrips] = useState<Trip[]>([])
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    Promise.all([
      getTrips().catch(() => [] as Trip[]),
      getSavedTrips().catch(() => [] as SavedTrip[]),
    ]).then(([trips, saved]) => {
      setMyTrips(trips)
      setSavedTrips(saved)
      setLoading(false)
    })
  }, [])

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "Belum diatur"
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    })
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Trip Saya</h1>
            <p className="text-sm text-muted-foreground">Trip buatan kamu & yang disimpan dari Explore</p>
          </div>
          <Button variant="gradient" size="sm" onClick={() => navigateTo("editor")}>
            <Plus className="w-4 h-4 mr-1" />
            Buat Trip
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl mb-6">
          {([
            { id: "mytrips" as const, label: `✈️ Trip Saya (${myTrips.length})` },
            { id: "saved" as const, label: `🔖 Disimpan (${savedTrips.length})` },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
          </div>
        ) : activeTab === "mytrips" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {myTrips.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <p className="text-muted-foreground mb-4">Belum ada trip. Yuk buat sekarang!</p>
                <Button variant="gradient" onClick={() => navigateTo("editor")}>
                  <Plus className="w-4 h-4 mr-2" />Buat Trip Pertama
                </Button>
              </div>
            ) : myTrips.map((trip, i) => (
              <motion.div key={trip.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover p-4 space-y-3 cursor-pointer"
                onClick={() => navigateTo("editor")}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{trip.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{trip.destination}
                    </p>
                  </div>
                  <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                    {trip.status}
                  </Badge>
                </div>
                {(trip.start_date || trip.end_date) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedTrips.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <p className="text-muted-foreground mb-4">Belum ada trip yang disimpan dari Explore.</p>
                <Button variant="outline" onClick={() => navigateTo("explore")}>
                  <Bookmark className="w-4 h-4 mr-2" />Jelajahi Trip
                </Button>
              </div>
            ) : savedTrips.map((trip, i) => (
              <motion.div key={trip.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover p-4 space-y-3">
                <div>
                  <h3 className="font-bold">{trip.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{trip.destination}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {trip.days} hari · Disimpan {formatDate(trip.created_at)}
                </p>
                {trip.tags && trip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {trip.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-secondary/60 rounded-full text-xs">#{t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
