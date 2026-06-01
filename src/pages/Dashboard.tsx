import { motion } from "framer-motion"
import {
  Map, Sparkles, Users, Star, TrendingUp,
  Calendar, Globe, ArrowRight, Plus, Bell,
  MapPin, Clock, Wallet, ChevronRight, MoreHorizontal,
  Loader2, Plane
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Progress } from "../components/ui/progress"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getTrips, getSavedTrips, getSession } from "../lib/supabase"
import { supabase } from "../lib/supabase"
import type { Trip, SavedTrip } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications" | "trips"

interface DashboardProps {
  navigateTo: (page: Page) => void
  onLogout: () => void
  user: any
}

// ─── Fetcher hooks ─────────────────────────────────────────

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
  timeAgo: string
}

interface ReminderItem {
  id?: string
  title: string
  date: string
  type: "reminder" | "payment" | "social" | "upcoming"
}

function useDashboardData() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [bucketList, setBucketList] = useState<SavedTrip[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Load trips (always needed for stats + reminders)
      let userTrips: Trip[] = []
      try {
        userTrips = await getTrips()
        setTrips(userTrips)
      } catch {
        setTrips([])
      }

      // Build upcoming reminders from real trips
      const upcomingReminders: ReminderItem[] = []
      const now = new Date()
      for (const t of userTrips) {
        if (t.start_date) {
          const start = new Date(t.start_date + "T00:00:00")
          const diff = Math.ceil((start.getTime() - now.getTime()) / 86400000)
          if (diff >= 0 && diff <= 30) {
            upcomingReminders.push({
              title: `Mulai trip: ${t.name}`,
              date: new Date(start).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
              type: "upcoming",
            })
          }
        }
      }

      // Add reminder to create first trip if none exist
      if (userTrips.length === 0) {
        upcomingReminders.push({
          title: "Buat trip pertamamu!",
          date: "Segera",
          type: "reminder",
        })
      }
      setReminders(upcomingReminders)

      // Load notifications + bucket list from Supabase
      if (supabase) {
        try {
          const session = await getSession()
          const userId = session?.user?.id

          if (userId) {
            // Fetch notifications
            const { data: notifData } = await supabase
              .from("notifications")
              .select("id, type, title, body, action_url, read, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(5)

            if (notifData && notifData.length > 0) {
              setNotifications(notifData.map((n: any) => ({
                ...n,
                timeAgo: formatTimeAgo(n.created_at),
              })))
              setUnreadCount(notifData.filter((n: any) => !n.read).length)
            } else {
              setNotifications([])
            }

            // Fetch saved trips (Disimpan from Explorer)
            try {
              const savedData = await getSavedTrips()
              setBucketList(savedData.slice(0, 5))
            } catch {
              setBucketList([])
            }
          } else {
            setNotifications([])
            setBucketList([])
          }
        } catch {
          setNotifications([])
          setBucketList([])
        }
      }

      setLoading(false)
    }

    load()
  }, [])

  return { trips, notifications, reminders, bucketList, unreadCount, loading }
}

// ─── Helpers ───────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return "Baru saja"
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}

// ─── Main Component ────────────────────────────────────────

export function Dashboard({ navigateTo, onLogout, user }: DashboardProps) {
  const [searchQuery] = useState("")
  const { trips, notifications, reminders, bucketList, unreadCount, loading } = useDashboardData()

  // Derive stats from real data
  const completedTrips = trips.filter(t => t.status === "completed").length
  const countriesVisited = new Set(trips.map(t => t.destination)).size

  // Build display trips from real data
  const displayTrips = trips.slice(0, 4).map((t, i) => ({
    id: t.id,
    name: t.name,
    destination: t.destination,
    date: t.start_date
      ? new Date(t.start_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      : "TBD",
    progress: t.status === "completed" ? 100 : t.status === "active" ? 60 : 20,
    people: 1,
    emoji: ["🏖️", "🏔️", "✈️", "🌸", "🏙️"][i % 5],
    status: t.status,
    shared: false,
  }))

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black mb-2 text-foreground">
            Selamat datang, <span className="gradient-text">{user?.name || "Traveler"}</span>! 👋
          </h1>
          <p className="text-muted-foreground">
            {loading ? "Memuat..." :
              trips.length > 0
                ? <>Kamu punya <span className="font-bold text-[var(--aurora-start)]">{trips.length} trip</span> — {completedTrips} sudah selesai. {upcomingTripCount(trips) > 0 ? `(${upcomingTripCount(trips)} trip akan datang)` : ""}</>
                : <>Buat trip pertamamu dan mulai jelajahi dunia!</>
            }
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Trips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Map className="w-5 h-5 text-[var(--aurora-start)]" />
                  Trip {trips.length > 0 ? `(${trips.length})` : "Aktif"}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => trips.length > 0 ? navigateTo("trips") : navigateTo("editor")}>
                  {trips.length > 0 ? "Lihat Semua" : "Buat Baru"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
                </div>
              ) : displayTrips.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {displayTrips.map((trip, i) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="bg-white border border-border rounded-2xl p-5 cursor-pointer group hover:border-[var(--aurora-start)]/30 hover:shadow-md transition-all duration-300"
                      onClick={() => navigateTo("editor")}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{trip.emoji}</span>
                          <div>
                            <h3 className="font-bold text-lg group-hover:text-[var(--aurora-start)] transition-colors">
                              {trip.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {trip.destination}
                              <span>·</span>
                              <Calendar className="w-3 h-3" />
                              {trip.date}
                            </div>
                          </div>
                        </div>
                        <button
                          className="p-1 rounded hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); navigateTo("trips") }}
                          title="Lihat semua trip"
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{trip.progress}%</span>
                        </div>
                        <Progress value={trip.progress} className="h-2" />
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground ml-auto">
                          {trip.status === "active" ? (
                            <span className="flex items-center gap-1 text-emerald-500">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Aktif
                            </span>
                          ) : trip.status === "completed" ? (
                            <span className="flex items-center gap-1 text-blue-500">Selesai</span>
                          ) : (
                            <span className="text-amber-500">Planning</span>
                          )}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* Empty state - no trips */
                <div className="bg-white border border-border rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center mx-auto mb-4">
                    <Map className="w-8 h-8 text-[var(--aurora-start)]" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Belum ada trip</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Mulai rencanakan trip pertamamu dengan bantuan AI!
                  </p>
                  <Button variant="gradient" onClick={() => navigateTo("editor")}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Buat Trip Baru
                  </Button>
                </div>
              )}

              {/* Add New Trip Card — only shown when trips exist */}
              {!loading && trips.length > 0 && trips.length < 4 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white border border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[var(--aurora-start)]/30 hover:shadow-md transition-all duration-300 mt-4"
                  onClick={() => navigateTo("editor")}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-[var(--aurora-start)]" />
                  </div>
                  <p className="font-medium text-center">Buat Trip Baru</p>
                </motion.div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-violet-500" />
                Aksi Cepat
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Sparkles, label: "AI Generator", color: "from-violet-400 to-purple-500", page: "ai" as Page },
                  { icon: Globe, label: "Explore", color: "from-pink-400 to-rose-500", page: "explore" as Page },
                  { icon: Wallet, label: "Split Bill", color: "from-amber-400 to-orange-500", page: "splitbill" as Page },
                  { icon: Star, label: "Achievements", color: "from-amber-400 to-yellow-500", page: "achievements" as Page },
                ].map((action, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    onClick={() => navigateTo(action.page)}
                    className="bg-white border border-border rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[var(--aurora-start)]/30 hover:shadow-md transition-all duration-300"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Inspirasi Trip - only shown when trips exist */}
            {trips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-500" />
                    Trip Kamu
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigateTo("trips")}>
                    Lihat Semua
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {trips.slice(0, 2).map((trip, i) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-white border border-border rounded-2xl p-4 cursor-pointer hover:border-[var(--aurora-start)]/30 hover:shadow-md transition-all duration-300"
                      onClick={() => navigateTo("editor")}
                    >
                      <div className={`aspect-video rounded-xl bg-gradient-to-br ${["from-rose-400 via-purple-500 to-indigo-600", "from-emerald-400 via-teal-500 to-blue-500", "from-pink-400 via-rose-500 to-red-500", "from-amber-400 via-orange-500 to-red-600"][i % 4]} relative overflow-hidden mb-3`}>
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          <span className="glass-card px-2 py-1 text-xs text-white flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {trip.destination}
                          </span>
                          <span className="glass-card px-2 py-1 text-xs text-white capitalize">{trip.status}</span>
                        </div>
                      </div>
                      <h3 className="font-bold">{trip.name}</h3>
                      {trip.start_date && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(trip.start_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <h3 className="font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--aurora-start)]" />
                Statistikmu
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: String(countriesVisited || 0), label: "Kota Dikunjungi", color: "text-blue-500" },
                  { value: String(completedTrips || 0), label: "Trip Selesai", color: "text-emerald-500" },
                  { value: String(trips.length || 0), label: "Total Trip", color: "text-violet-500" },
                  { value: String(unreadCount || 0), label: "Notifikasi Baru", color: "text-red-500" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-2xl font-black ${stat.color}`}>{loading ? "—" : stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity — REAL data from notifications table */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <h3 className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--aurora-start)]" />
                Aktivitas Terkini
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--aurora-start)]" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 text-sm">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className={`text-xs bg-gradient-to-br ${n.type === "ai" ? "from-violet-400 to-purple-500" : n.type === "badge" ? "from-amber-400 to-orange-500" : "from-[var(--aurora-start)] to-[var(--aurora-end)]"}`}>
                          {n.type === "ai" ? "AI" : n.type === "badge" ? "🏆" : "🔔"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{n.timeAgo}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--aurora-start)] shrink-0 mt-1.5" />}
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
                  <p className="text-xs text-muted-foreground mt-1">Aktivitas akan muncul saat kamu membuat trip</p>
                </div>
              )}
            </motion.div>

            {/* Upcoming Reminders — REAL data from trips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <h3 className="font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Pengingat
              </h3>
              <div className="space-y-3">
                {reminders.length > 0 ? reminders.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      r.type === "payment" ? "bg-amber-500/20 text-amber-500" :
                      r.type === "social" ? "bg-pink-500/20 text-pink-500" :
                      r.type === "upcoming" ? "bg-blue-500/20 text-blue-500" :
                      "bg-[var(--aurora-start)]/10 text-[var(--aurora-start)]"
                    }`}>
                      {r.type === "payment" ? <Wallet className="w-4 h-4" /> :
                       r.type === "social" ? <Users className="w-4 h-4" /> :
                       r.type === "upcoming" ? <Calendar className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Tidak ada pengingat</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Bucket List Quick View — REAL data */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  Trip Disimpan
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigateTo("bucketlist")}>
                  Lihat Semua
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--aurora-start)]" />
                </div>
              ) : bucketList.length > 0 ? (
                <div className="space-y-2">
                  {bucketList.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0 bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)]">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{item.name}</span>
                        <span className="text-xs text-muted-foreground truncate block">{item.destination} · {item.days} hari</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">Belum ada trip yang disimpan</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigateTo("explore")}>
                    Jelajahi Trip
                  </Button>
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────

function upcomingTripCount(trips: Trip[]): number {
  const now = new Date()
  return trips.filter(t => {
    if (!t.start_date) return false
    return new Date(t.start_date + "T00:00:00") > now
  }).length
}
