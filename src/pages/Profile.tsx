import { motion } from "framer-motion"
import {
  ArrowLeft, MapPin, Calendar, Users, Star, Award,
  Edit3, Settings, Globe, Plane, Map, TrendingUp,
  ChevronRight, ExternalLink, Heart, MessageSquare, Share2,
  Loader2
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Progress } from "../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getTrips } from "../lib/supabase"
import type { Trip } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface ProfileProps {
  setCurrentPage: (page: Page) => void
  onLogout: () => void
  user: any
}

export function Profile({ setCurrentPage, onLogout, user }: ProfileProps) {
  const [isOwnProfile] = useState(true)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTrips()
      .then(data => setTrips(data))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [])

  const countriesVisited = new Set(trips.map(t => t.destination)).size
  const completedCount = trips.filter(t => t.status === 'completed').length
  const totalDays = trips.reduce((sum, t) => {
    if (!t.start_date || !t.end_date) return sum
    const diff = (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60 * 24)
    return sum + diff
  }, 0)

  // Stats from real data
  const stats = {
    trips: trips.length,
    countries: countriesVisited,
    cities: countriesVisited,
    daysTraveled: Math.round(totalDays),
    followers: 0,
    following: 0,
    totalLikes: 0,
  }

  const badges = [
    { id: 1, name: "Explorer", emoji: "🌍", desc: "Kunjungi 5 negara", unlocked: (countriesVisited || 0) >= 5 },
    { id: 2, name: "Foodie", emoji: "🍜", desc: "10 trip kuliner", unlocked: stats.trips >= 10 },
    { id: 3, name: "Social Butterfly", emoji: "🦋", desc: "10 collaborator", unlocked: false },
    { id: 4, name: "Superstar", emoji: "⭐", desc: "1000+ likes", unlocked: false },
    { id: 5, name: "Globe Trotter", emoji: "🌏", desc: "Kunjungi 10 negara", unlocked: (countriesVisited || 0) >= 10 },
    { id: 6, name: "Legend", emoji: "👑", desc: "50 trip selesai", unlocked: false },
  ]

  const tripHistory = trips.slice(0, 5).map((t, i) => ({
    id: t.id,
    name: t.name,
    date: t.start_date ? new Date(t.start_date + 'T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'TBD',
    status: t.status,
    emoji: ["🏖️","🏔️","✈️","🌸","🏙️"][i % 5],
  }))

  return (
    <div className="pt-16 min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-40 glass-card border-b border-white/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage("home")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">Profil</h1>
          </div>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => setCurrentPage("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Edit Profil
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="aurora-bg-mesh py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative inline-block">
              <Avatar className="w-28 h-28 mx-auto border-4 border-white shadow-xl">
                <AvatarFallback className="text-3xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)]">
                  {user?.name?.split(" ").map((n: string) => n[0]).join("") || "US"}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Edit3 className="w-4 h-4 text-[var(--aurora-start)]" />
                </button>
              )}
            </div>

            <h1 className="text-3xl font-black text-white mt-4">{user?.name || "Traveler"}</h1>
            <p className="text-white/70 mt-1">@{user?.email?.split("@")[0] || "traveler"}</p>
            {user?.name && (
              <p className="text-white/60 mt-2 max-w-md mx-auto">
                ✈️ Traveler enthusiast | 🍜 Foodie | 📸 Photography lover
              </p>
            )}

            {/* Social Stats */}
            <div className="flex items-center justify-center gap-8 mt-6">
              {[
                { value: stats.followers, label: "Followers" },
                { value: stats.following, label: "Following" },
                { value: stats.totalLikes, label: "Likes" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl font-bold text-white">{stat.value.toLocaleString()}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>

            {!isOwnProfile && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="gradient" size="sm">
                  <Users className="w-4 h-4 mr-1" />
                  Follow
                </Button>
                <Button variant="glass" size="sm" className="text-white">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Message
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="trips" className="w-full">
          <TabsList className="w-full justify-start rounded-xl p-1 mb-6">
            <TabsTrigger value="trips" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Trip Saya
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Tersimpan
            </TabsTrigger>
          </TabsList>

          {/* Trips Tab */}
          <TabsContent value="trips" className="space-y-6">
            {/* Travel Stats */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--aurora-start)]" />
                Statistik Travel
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { value: stats.countries, label: "Negara", icon: Globe },
                  { value: stats.cities, label: "Kota", icon: MapPin },
                  { value: stats.trips, label: "Trip", icon: Plane },
                  { value: stats.daysTraveled, label: "Hari di jalan", icon: Calendar },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-4 rounded-xl bg-gradient-to-br from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10">
                    <stat.icon className="w-6 h-6 text-[var(--aurora-start)] mx-auto mb-2" />
                    <div className="text-2xl font-black gradient-text">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trip History */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Riwayat Trip</h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--aurora-start)]" />
                </div>
              ) : tripHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Belum ada trip. <button className="text-[var(--aurora-start)]" onClick={() => setCurrentPage("editor")}>Buat trip pertamamu!</button></p>
                </div>
              ) : (
                tripHistory.map((trip) => (
                <div key={trip.id} className="glass-card-hover p-4 flex items-center gap-4">
                  <span className="text-3xl">{trip.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-medium">{trip.name}</h4>
                    <p className="text-sm text-muted-foreground">{trip.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={trip.status === "completed" ? "aurora" : "secondary"}>
                      {trip.status === "completed" ? "✓ Selesai" : "Planning"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground capitalize">{trip.status}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentPage("editor")}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )))}

            </div>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "glass-card p-6 text-center transition-all",
                    badge.unlocked ? "opacity-50" : "hover:scale-[1.02]"
                  )}
                >
                  <div className="text-4xl mb-3">{badge.emoji}</div>
                  <h4 className="font-bold">{badge.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{badge.desc}</p>
                  {!badge.unlocked ? (
                    <Badge variant="secondary" className="mt-2">
                      🔒 Locked
                    </Badge>
                  ) : (
                    <Badge variant="aurora" className="mt-2">
                      ✓ Unlocked
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved" className="space-y-4">
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Trip yang kamu simpan akan muncul di sini</p>
              <Button variant="gradient" size="sm" className="mt-4" onClick={() => setCurrentPage("explore")}>
                Jelajahi Trip
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}