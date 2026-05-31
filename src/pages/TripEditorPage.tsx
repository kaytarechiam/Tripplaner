import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin, Plus, GripVertical, Clock,
  Hotel, Utensils, Camera, TreePine, Landmark, ShoppingBag,
  AlertTriangle, Sun, Cloud, CloudRain, Eye,
  Users, ArrowLeft, Search, Filter, Layers, Settings,
  Navigation, Trash2, Edit3, Copy, ExternalLink, Map as MapIcon2,
  Loader2, X, Check, Map as MapIcon, Plane, Calendar, ChevronRight, PanelLeftClose, Sparkles, Ticket
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Progress } from "../components/ui/progress"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { cn, formatDistance, formatDuration } from "@/lib/utils"
import { useState, useEffect, useRef, useCallback } from "react"
import { getTrips, createTrip, getItinerary, addItineraryItem, updateTrip, getTripMembers, inviteTripMember } from "../lib/supabase"
import { searchPlaces } from "../lib/api"
import { TripMap } from "../components/TripMap"
import { TripAIPanel } from "../components/TripAIPanel"
import { PlaceDetailModal } from "../components/PlaceDetailModal"
import { ReminderPanel } from "../components/ReminderPanel"
import type { Trip, ItineraryItem, TripMember } from "../lib/supabase"

// ─── Destination types map ────────────────────────────────
const destinationTypes: Record<string, { icon: typeof MapPin; color: string }> = {
  hotel: { icon: Hotel, color: "from-blue-400 to-cyan-400" },
  landmark: { icon: Landmark, color: "from-sunset-400 to-coral-500" },
  food: { icon: Utensils, color: "from-orange-400 to-amber-400" },
  nature: { icon: TreePine, color: "from-emerald-400 to-green-400" },
  activity: { icon: Camera, color: "from-pink-400 to-rose-400" },
  shopping: { icon: ShoppingBag, color: "from-fuchsia-400 to-pink-400" },
  transport: { icon: MapIcon2, color: "from-gray-400 to-gray-500" },
}

function getWeatherEmoji(dayIndex: number): string { return [Sun, Cloud, CloudRain][dayIndex % 3].name === "CloudRain" ? "🌧️" : [Sun, Cloud, CloudRain][dayIndex % 3].name === "Cloud" ? "⛅" : "☀️" }

// ─── Get booking platforms for an item ─────────────────────
function getBookingPlatforms(item: ItineraryItem) {
  if (!item.location && !item.title) return []
  const query = encodeURIComponent(item.location || item.title)
  const category = item.category?.toLowerCase() || "activity"
  const title = item.title?.toLowerCase() || ""

  const platforms: Array<{ id: string; name: string; url: string; color: string }> = []

  if (category === "hotel") {
    platforms.push(
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/hotels/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" },
      { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=hotel`, color: "bg-[#f97316] hover:bg-[#ea580c]" },
      { id: "agoda", name: "Agoda", url: `https://www.agoda.com/search?locale=en-us&currency=IDR&pricenext=1&query=${query}`, color: "bg-[#dd1f39] hover:bg-[#b71c1c]" },
      { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${query}`, color: "bg-[#003580] hover:bg-[#00224f]" }
    )
  } else if (category === "transport" && (title.includes("flight") || title.includes("penerbangan") || title.includes("pesawat") || title.includes("plane") || title.includes("bandara"))) {
    platforms.push(
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" },
      { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=flight`, color: "bg-[#f97316] hover:bg-[#ea580c]" }
    )
  } else if (category === "transport" && (title.includes("kereta") || title.includes("train") || title.includes("kereta api"))) {
    platforms.push(
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/trains/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" },
      { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=train`, color: "bg-[#f97316] hover:bg-[#ea580c]" }
    )
  } else if (category === "transport" && (title.includes("bus"))) {
    platforms.push(
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/buses/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" },
      { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=bus`, color: "bg-[#f97316] hover:bg-[#ea580c]" }
    )
  } else if (category === "food") {
    // Most platforms don't have restaurant booking; Booking.com has some restaurant reservations
    platforms.push(
      { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${query}`, color: "bg-[#003580] hover:bg-[#00224f]" },
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" }
    )
  }

  return platforms
}

// ─── Destination Card (from real data) ────────────────────
function DestinationCard({ item, dayIndex, index, onSelect }: { item: ItineraryItem; dayIndex: number; index: number; onSelect: (item: ItineraryItem) => void }) {
  const type = destinationTypes[item.category] || destinationTypes.landmark
  const Icon = type.icon
  const bookingPlatforms = getBookingPlatforms(item)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="destination-card group cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <button className="p-1 rounded hover:bg-white/10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${type.color} shadow-lg`}>
            {index + 1}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-semibold text-base">{item.title}</h4>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 rounded hover:bg-white/10" onClick={(e) => { e.stopPropagation() }}><Edit3 className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 rounded hover:bg-white/10" onClick={(e) => { e.stopPropagation() }}><Copy className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 rounded hover:bg-red-500/10" onClick={(e) => { e.stopPropagation() }}><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {item.time}
              {item.duration_minutes && <span className="text-xs">({item.duration_minutes} menit)</span>}
            </div>
            {item.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-xs truncate max-w-[150px]">{item.location}</span>
              </div>
            )}
          </div>
          {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}

          {/* Booking buttons - shown on hover */}
          {bookingPlatforms.length > 0 && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap gap-2 mt-3">
              {bookingPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={(e) => { e.stopPropagation(); window.open(platform.url, "_blank") }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-all active:scale-95",
                    platform.color
                  )}
                >
                  <Ticket className="w-3 h-3" />{platform.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ConflictWarning({ type, message }: { type: string; message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="conflict-warning">
      <AlertTriangle className="w-5 h-5 text-[var(--coral-accent)] shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-sm">{type}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </motion.div>
  )
}

// ─── Create Trip Modal ────────────────────────────────────
function CreateTripModal({ onCreated }: { onCreated: (trip: Trip) => void }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", destination: "", start_date: "", end_date: "" })
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDestinationChange = (value: string) => {
    setForm(f => ({ ...f, destination: value }))
    setShowSuggestions(false)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 2) { setSuggestions([]); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(value)
        setSuggestions(results)
        setShowSuggestions(true)
      } catch { setSuggestions([]) }
    }, 300)
  }

  const handleSelectSuggestion = (s: any) => {
    setForm(f => ({ ...f, destination: s.display_name.split(",")[0].trim() }))
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.destination) return
    setIsLoading(true)
    setError("")
    try {
      const trip = await createTrip({
        name: form.name,
        destination: form.destination,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        status: "planning",
      })
      onCreated(trip as Trip)
      setForm({ name: "", destination: "", start_date: "", end_date: "" })
      setOpen(false)
    } catch (err: any) {
      console.error('[createTrip]', err)
      const msg = err?.message || err?.error?.message || err?.error?.msg || JSON.stringify(err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-2" />Buat Trip Baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Trip Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
          <div className="space-y-2">
            <Label>Nama Trip</Label>
            <Input placeholder="Contoh: Liburan Bali 4 Hari" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="space-y-2 relative">
            <Label>Destinasi</Label>
            <Input placeholder="Ketik kota atau negara..." value={form.destination} onChange={e => handleDestinationChange(e.target.value)} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} required />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {suggestions.map(s => (
                  <button key={s.place_id} type="button" onClick={() => handleSelectSuggestion(s)} className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex items-start gap-3 border-b border-border/50 last:border-0">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{s.display_name.split(",")[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Membuat...</> : <><Plane className="w-4 h-4 mr-2" />Buat Trip</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Day data derived from real itinerary items ───────────
interface DayGroup {
  day: number
  date: string
  items: ItineraryItem[]
}

function groupItemsByDay(items: ItineraryItem[]): DayGroup[] {
  const map = new Map<number, ItineraryItem[]>()
  for (const item of items) {
    if (!map.has(item.day)) map.set(item.day, [])
    map.get(item.day)!.push(item)
  }
  const sorted = [...map.entries()].sort((a, b) => a[0] - b[0])
  return sorted.map(([day, dayItems]) => ({
    day,
    date: dayItems[0]?.time || `Hari ${day}`,
    items: dayItems.sort((a, b) => a.sort_order - b.sort_order),
  }))
}

// ─── Main Page ────────────────────────────────────────────
interface TripEditorProps {
  navigateTo: (page: "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications") => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function TripEditorPage({ navigateTo, sidebarCollapsed = false, onToggleSidebar }: TripEditorProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [tripsError, setTripsError] = useState("")
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [mapView, setMapView] = useState<"day" | "full">("day")
  const [searchQuery, setSearchQuery] = useState("")
  const [showTripList, setShowTripList] = useState(true)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null)
  // Member invitation
  const [showMemberDialog, setShowMemberDialog] = useState(false)
  const [members, setMembers] = useState<TripMember[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteSuccess, setInviteSuccess] = useState("")
  // Make public toggle
  const [togglingPublic, setTogglingPublic] = useState(false)

  // Refresh itinerary items from DB
  const refreshItems = useCallback(() => {
    if (!selectedTrip) return
    getItinerary(selectedTrip.id)
      .then(data => setItineraryItems(data))
      .catch(() => setItineraryItems([]))
  }, [selectedTrip])

  // Load trips on mount
  useEffect(() => {
    getTrips()
      .then(data => {
        setTrips(data)
        if (data.length > 0) setSelectedTrip(data[0])
      })
      .catch(err => setTripsError(err instanceof Error ? err.message : ""))
      .finally(() => setTripsLoading(false))
  }, [])

  // Load itinerary items when selected trip changes
  useEffect(() => {
    if (!selectedTrip) { setItineraryItems([]); return }
    setItemsLoading(true)
    getItinerary(selectedTrip.id)
      .then(data => setItineraryItems(data))
      .catch(() => setItineraryItems([]))
      .finally(() => setItemsLoading(false))
  }, [selectedTrip])

  // Load members when trip changes
  useEffect(() => {
    if (!selectedTrip) { setMembers([]); return }
    getTripMembers(selectedTrip.id).then(setMembers).catch(() => setMembers([]))
  }, [selectedTrip?.id])

  const handleTripCreated = useCallback((trip: Trip) => {
    setTrips(prev => [trip, ...prev])
    setSelectedTrip(trip)
    setItineraryItems([])
  }, [])

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTrip) return
    setInviteLoading(true)
    setInviteError("")
    setInviteSuccess("")
    try {
      await inviteTripMember(selectedTrip.id, inviteEmail.trim(), selectedTrip.name)
      setInviteSuccess(`Undangan dikirim ke ${inviteEmail}!`)
      setInviteEmail("")
      // Refresh members
      const updated = await getTripMembers(selectedTrip.id)
      setMembers(updated)
    } catch (err: any) {
      setInviteError(err.message || "Gagal mengirim undangan.")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleTogglePublic = async () => {
    if (!selectedTrip) return
    setTogglingPublic(true)
    try {
      const updated = await updateTrip(selectedTrip.id, { is_public: !selectedTrip.is_public })
      setSelectedTrip(updated)
      setTrips(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch (err: any) {
      console.error("Toggle public error:", err)
    } finally {
      setTogglingPublic(false)
    }
  }

  const dayGroups = groupItemsByDay(itineraryItems)
  const currentDay = dayGroups[selectedDay]

  // Map locations for TripMap
  const mapLocations = (mapView === "day" && currentDay ? currentDay.items : itineraryItems)
    .filter(d => d.latitude && d.longitude)
    .map((d, i) => ({
      id: d.id,
      title: d.title,
      lat: d.latitude!,
      lng: d.longitude!,
      category: d.category,
      time: d.time,
    }))

  // Stats from real data
  const totalDestinations = itineraryItems.length

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Left Sidebar — collapsible, scrolling independent ── */}
      <div className={`
        shrink-0 border-r border-border flex flex-col bg-background/50 backdrop-blur-sm h-screen
        transition-all duration-300 ease-out
        ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-[420px]"}
      `}>
        {/* Sidebar Header */}
        <div className={`
          p-4 border-b border-border space-y-3
          ${sidebarCollapsed ? "hidden" : ""}
        `}>
          <div className="flex items-center gap-3">
            {/* Toggle button */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onToggleSidebar}
              aria-label={sidebarCollapsed ? "Perluas sidebar" : "Persempit sidebar"}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "" : "rotate-180"}`} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">
                {selectedTrip ? selectedTrip.name : "Trip Editor"}
              </h1>
              {selectedTrip?.start_date && (
                <p className="text-sm text-muted-foreground truncate">
                  {new Date(selectedTrip.start_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  {selectedTrip.end_date && ` - ${new Date(selectedTrip.end_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`}
                </p>
              )}
            </div>
            {selectedTrip && (
              <Badge variant={selectedTrip.status === "active" ? "ocean" : "aurora"} className="shrink-0">
                {selectedTrip.status === "active" ? "Aktif" : selectedTrip.status === "completed" ? "Selesai" : "Planning"}
              </Badge>
            )}
          </div>
          <CreateTripModal onCreated={handleTripCreated} />
          {/* Make Public + Invite Members row */}
          {selectedTrip && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleTogglePublic}
                disabled={togglingPublic}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all",
                  selectedTrip.is_public
                    ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                )}
              >
                {togglingPublic ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                {selectedTrip.is_public ? "Publik ✓" : "Jadikan Publik"}
              </button>
              <button
                onClick={() => { setShowMemberDialog(true); setInviteError(""); setInviteSuccess("") }}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium bg-secondary/60 hover:bg-secondary transition-all"
              >
                <Users className="w-3 h-3" />
                Anggota ({members.length})
              </button>
            </div>
          )}
        </div>
        {/* Member Invitation Dialog */}
        {showMemberDialog && selectedTrip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Kelola Anggota</h3>
                <button onClick={() => setShowMemberDialog(false)} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Undang teman ke "{selectedTrip.name}" via email</p>

              {/* Invite form */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@teman.com"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess("") }}
                  onKeyDown={e => e.key === 'Enter' && handleInviteMember()}
                  className="flex-1 text-sm"
                />
                <Button variant="gradient" size="sm" onClick={handleInviteMember} disabled={inviteLoading || !inviteEmail.trim()}>
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </div>
              {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-emerald-500">{inviteSuccess}</p>}

              {/* Current members */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground">ANGGOTA SAAT INI</p>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada anggota lain.</p>
                ) : (
                  members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center text-white text-xs font-bold">
                        {m.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {m.status === 'accepted' ? '✓ Bergabung' : m.status === 'pending' ? '⏳ Menunggu' : m.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trip List */}
        {tripsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
          </div>
        ) : trips.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <MapIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">Belum ada trip</p>
            <p className="text-xs opacity-70">Buat trip pertamamu dengan tombol di atas, atau generate dengan AI!</p>
          </div>
        ) : (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">TRIP SAYA ({trips.length})</span>
              <button onClick={() => setShowTripList(s => !s)} className="text-xs text-[var(--aurora-start)]">
                {showTripList ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
            <AnimatePresence>
              {showTripList && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {trips.map(trip => (
                      <button
                        key={trip.id}
                        onClick={() => setSelectedTrip(trip)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-sm transition-all",
                          selectedTrip?.id === trip.id
                            ? "bg-gradient-to-r from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10 border border-[var(--aurora-start)]/30"
                            : "hover:bg-white/5"
                        )}
                      >
                        <div className="font-medium">{trip.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{trip.destination}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Search & Filter */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari destinasi..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="text-xs"><Filter className="w-3 h-3 mr-1" />Filter</Button>
          </div>
        </div>

        {/* Day Tabs (from real data) */}
        {dayGroups.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dayGroups.map((dg, i) => (
                <button key={dg.day} onClick={() => setSelectedDay(i)} className={cn(
                  "flex flex-col items-center px-4 py-2 rounded-xl transition-all shrink-0",
                  selectedDay === i ? "bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-lg" : "hover:bg-white/10"
                )}>
                  <span className="text-xs font-medium">Hari {dg.day}</span>
                  <span className="text-[10px] opacity-70">{dg.items.length} item{dg.items.length !== 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Destinations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--aurora-start)]" />
            </div>
          ) : currentDay && currentDay.items.length > 0 ? (
            <>
              {currentDay.items.map((item, i) => (
                <DestinationCard key={item.id} item={item} dayIndex={selectedDay} index={i} onSelect={setSelectedItem} />
              ))}
            </>
          ) : trips.length > 0 && selectedTrip ? (
            /* No itinerary items yet */
            <div className="text-center py-8 text-muted-foreground">
              <MapIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">Belum ada itinerary</p>
              <p className="text-xs opacity-70 mb-4">Generate itinerary dengan AI atau tambah manual</p>
              <Button variant="gradient" size="sm" className="gap-2 shadow-lg shadow-purple-500/30" onClick={() => navigateTo("ai")}>
                <Sparkles className="w-4 h-4" />
                ✨ Generate dengan AI
              </Button>
            </div>
          ) : (
            /* No trip selected */
            <div className="text-center py-8 text-muted-foreground">
              <MapIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Pilih atau buat trip untuk mulai</p>
            </div>
          )}

          {currentDay && currentDay.items.length > 0 && (
            <Button variant="glass" className="w-full" size="lg">
              <Plus className="w-4 h-4 mr-2" />Tambah Destinasi
            </Button>
          )}

          {/* Reminder Panel */}
          {selectedTrip && (
            <div className="pt-4 border-t border-border/50">
              <ReminderPanel tripId={selectedTrip.id} />
            </div>
          )}
        </div>

        {/* Bottom Stats (from real data) */}
        {dayGroups.length > 0 && (
          <div className="p-4 border-t border-border bg-card/50">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold gradient-text">{totalDestinations}</div>
                <div className="text-xs text-muted-foreground">Destinasi</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--coral-accent)]">
                  {dayGroups.length} hari
                </div>
                <div className="text-xs text-muted-foreground">Total Trip</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right — Map ── */}
      <div className="flex-1 relative h-screen overflow-hidden">
        {/* Deep aurora gradient background — prevents clash with white floating navbar */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f1729]" />

        {/* Floating controls — z-10 above gradient + map */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Back to dashboard */}
            <Button
              variant="glass"
              size="sm"
              onClick={() => navigateTo("home")}
              aria-label="Kembali ke dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="ml-1 text-sm hidden sm:inline">Kembali</span>
            </Button>

            {/* Sidebar toggle */}
            <Button
              variant="glass"
              size="sm"
              onClick={onToggleSidebar}
              aria-label={sidebarCollapsed ? "Perluas sidebar" : "Persempit sidebar"}
              className={sidebarCollapsed ? "bg-white/20" : ""}
            >
              <PanelLeftClose className="w-4 h-4" />
              <span className="ml-1 text-sm hidden sm:inline">{sidebarCollapsed ? "Sidebar" : "Sembunyikan"}</span>
            </Button>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <Button variant="glass" size="sm" className={mapView === "day" ? "bg-white/20" : ""} onClick={() => setMapView("day")}>
              <Layers className="w-4 h-4 mr-1" />Hari Ini
            </Button>
            <Button variant="glass" size="sm" className={mapView === "full" ? "bg-white/20" : ""} onClick={() => setMapView("full")}>
              <MapIcon className="w-4 h-4 mr-1" />Semua Hari
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="icon"><Settings className="w-4 h-4" /></Button>
            <Button variant="glass" size="icon"><ExternalLink className="w-4 h-4" /></Button>
            <Button variant="gradient" size="sm"><Eye className="w-4 h-4 mr-1" />Preview Trip</Button>
          </div>
        </div>

        {/* Map or empty state */}
        {selectedTrip && mapLocations.length > 0 ? (
          <div className="absolute inset-0 z-0">
            <TripMap
              locations={mapLocations}
              height="100%"
              zoom={13}
            />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-white/60">
            <MapIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">{selectedTrip ? "Belum ada lokasi di peta" : "Pilih trip untuk melihat peta"}</p>
            <p className="text-sm text-white/40 mt-1">
              {selectedTrip ? "Tambah destinasi atau generate dengan AI" : "Atau buat trip baru untuk memulai"}
            </p>
            {selectedTrip && (
              <Button variant="gradient" size="sm" className="mt-4 gap-2 shadow-lg shadow-purple-500/30" onClick={() => navigateTo("ai")}>
                <Sparkles className="w-4 h-4" />
                ✨ Generate dengan AI
              </Button>
            )}
          </div>
        )}

        {/* AI FAB Button — floating bottom-right, z-20 above everything */}
        <div className="absolute bottom-6 right-6 z-20">
          <Button
            variant="gradient"
            size="lg"
            className="rounded-2xl shadow-lg shadow-purple-500/30 flex items-center gap-2 h-12 px-5"
            onClick={() => setAiPanelOpen(true)}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">AI Assistant</span>
          </Button>
        </div>

        {/* AI Chat Panel */}
        {selectedTrip && (
          <TripAIPanel
            open={aiPanelOpen}
            onClose={() => setAiPanelOpen(false)}
            trip={selectedTrip}
            itineraryItems={itineraryItems}
            onItemsChanged={refreshItems}
            currentDay={selectedDay}
          />
        )}

        {/* Place Detail Modal */}
        <PlaceDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDeleted={refreshItems}
        />
      </div>
    </div>
  )
}