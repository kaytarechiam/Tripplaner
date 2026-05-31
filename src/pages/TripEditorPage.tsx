import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin, Plus, GripVertical, Clock,
  Hotel, Utensils, Camera, TreePine, Landmark, ShoppingBag,
  AlertTriangle, Sun, Cloud, CloudRain, Eye,
  Users, ArrowLeft, Search, Filter, Layers, Settings,
  Navigation, Trash2, Edit3, Copy, ExternalLink, Map as MapIcon2,
  Loader2, X, Check, Map as MapIcon, Plane, Calendar, ChevronRight, PanelLeftClose, Sparkles, Ticket,
  CloudSun
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef, useCallback } from "react"
import { getTrips, createTrip, getItinerary, addItineraryItem, updateTrip, getTripMembers, inviteTripMember } from "../lib/supabase"
import { searchPlaces, getWeather } from "../lib/api"
import { TripMap } from "../components/TripMap"
import { TripAIPanel } from "../components/TripAIPanel"
import { PlaceDetailModal } from "../components/PlaceDetailModal"
import { ReminderPanel } from "../components/ReminderPanel"
import type { Trip, ItineraryItem, TripMember } from "../lib/supabase"

// ─── Destination types map ────────────────────────────────
const destinationTypes: Record<string, { icon: typeof MapPin; color: string }> = {
  hotel: { icon: Hotel, color: "from-blue-400 to-cyan-400" },
  accommodation: { icon: Hotel, color: "from-blue-400 to-cyan-400" },
  landmark: { icon: Landmark, color: "from-sunset-400 to-coral-500" },
  attraction: { icon: Landmark, color: "from-violet-400 to-purple-400" },
  food: { icon: Utensils, color: "from-orange-400 to-amber-400" },
  nature: { icon: TreePine, color: "from-emerald-400 to-green-400" },
  activity: { icon: Camera, color: "from-pink-400 to-rose-400" },
  shopping: { icon: ShoppingBag, color: "from-fuchsia-400 to-pink-400" },
  transport: { icon: MapIcon2, color: "from-gray-400 to-gray-500" },
}

// Weather helpers
function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️"
  if (code <= 2) return "⛅"
  if (code === 3) return "☁️"
  if (code >= 45 && code <= 48) return "🌫️"
  if (code >= 51 && code <= 67) return "🌧️"
  if (code >= 71 && code <= 77) return "❄️"
  if (code >= 80 && code <= 82) return "🌧️"
  if (code >= 95) return "⛈️"
  return "🌤️"
}

// ─── Get booking platforms for an item ─────────────────────
function getBookingPlatforms(item: ItineraryItem) {
  if (!item.location && !item.title) return []
  const query = encodeURIComponent(item.location || item.title)
  const category = item.category?.toLowerCase() || "activity"
  const title = item.title?.toLowerCase() || ""

  const platforms: Array<{ id: string; name: string; url: string; color: string }> = []

  if (category === "hotel" || category === "accommodation") {
    platforms.push(
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/hotels/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" },
      { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=hotel`, color: "bg-[#f97316] hover:bg-[#ea580c]" },
      { id: "agoda", name: "Agoda", url: `https://www.agoda.com/search?locale=en-us&currency=IDR&pricenext=1&query=${query}`, color: "bg-[#dd1f39] hover:bg-[#b71c1c]" },
      { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${query}`, color: "bg-[#003580] hover:bg-[#00224f]" }
    )
  } else if (category === "transport" && (title.includes("flight") || title.includes("pesawat") || title.includes("penerbangan"))) {
    platforms.push(
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" },
      { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=flight`, color: "bg-[#f97316] hover:bg-[#ea580c]" }
    )
  } else if (category === "food") {
    platforms.push(
      { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${query}`, color: "bg-[#003580] hover:bg-[#00224f]" }
    )
  }

  return platforms
}

// ─── Destination Card ─────────────────────────────────────
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
              <button className="p-1 rounded hover:bg-white/10" onClick={(e) => e.stopPropagation()}><Edit3 className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 rounded hover:bg-white/10" onClick={(e) => e.stopPropagation()}><Copy className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 rounded hover:bg-red-500/10" onClick={(e) => e.stopPropagation()}><Trash2 className="w-4 h-4 text-red-400" /></button>
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

// ─── Add Place Modal ──────────────────────────────────────
interface AddPlaceModalProps {
  open: boolean
  onClose: () => void
  tripId: string
  tripDays: number
  defaultDay?: number
  onAdded: () => void
  prefill?: { name: string; location: string; lat: string; lon: string } | null
}

const CATEGORIES = [
  { value: "hotel", label: "🏨 Hotel", dbValue: "accommodation" },
  { value: "food", label: "🍜 Restoran / Makanan", dbValue: "food" },
  { value: "landmark", label: "🏛️ Landmark / Wisata", dbValue: "attraction" },
  { value: "nature", label: "🌿 Alam / Taman", dbValue: "attraction" },
  { value: "activity", label: "🎯 Aktivitas", dbValue: "attraction" },
  { value: "shopping", label: "🛍️ Belanja", dbValue: "attraction" },
  { value: "transport", label: "🚗 Transport", dbValue: "transport" },
]

function AddPlaceModal({ open, onClose, tripId, tripDays, defaultDay = 1, onAdded, prefill }: AddPlaceModalProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("activity")
  const [day, setDay] = useState(defaultDay)
  const [time, setTime] = useState("09:00")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [duration, setDuration] = useState(60)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Apply prefill when it changes
  useEffect(() => {
    if (prefill) {
      setName(prefill.name)
      setLocation(prefill.location)
      setLat(parseFloat(prefill.lat) || null)
      setLng(parseFloat(prefill.lon) || null)
      setSearchQuery(prefill.name)
    }
  }, [prefill])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setName(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (val.length < 2) { setSearchResults([]); setShowSearch(false); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchPlaces(val)
        setSearchResults(res)
        setShowSearch(true)
      } catch { setSearchResults([]) }
    }, 300)
  }

  const handleSelectResult = (r: any) => {
    const displayName = r.display_name.split(",")[0].trim()
    setName(displayName)
    setSearchQuery(displayName)
    setLocation(r.display_name.substring(0, 120))
    setLat(parseFloat(r.lat) || null)
    setLng(parseFloat(r.lon) || null)
    setShowSearch(false)
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Nama tempat wajib diisi"); return }
    setLoading(true)
    setError("")
    try {
      await addItineraryItem({
        trip_id: tripId,
        day,
        time,
        title: name.trim(),
        location: location.trim() || undefined,
        latitude: lat || undefined,
        longitude: lng || undefined,
        category: category as any,  // addItineraryItem maps to DB values internally
        duration_minutes: duration,
        notes: notes.trim() || undefined,
        sort_order: 999,
      })
      onAdded()
      onClose()
      // Reset
      setName(""); setSearchQuery(""); setLocation(""); setLat(null); setLng(null)
      setNotes(""); setTime("09:00"); setDuration(60); setDay(defaultDay); setCategory("activity")
    } catch (err: any) {
      setError(err.message || "Gagal menambahkan tempat")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const maxDay = Math.max(tripDays, 1)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--aurora-start)]" />
              Tambah Tempat
            </h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Search / Name */}
            <div className="space-y-1 relative">
              <Label>Cari & Nama Tempat *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Ketik nama tempat untuk cari..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.slice(0, 5).map(r => (
                    <button
                      key={r.place_id}
                      type="button"
                      onMouseDown={() => handleSelectResult(r)}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-start gap-2 border-b border-border/40 last:border-0"
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.display_name.split(",")[0]}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.display_name.split(",").slice(1, 3).join(",").trim()}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label>Kategori</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "text-left px-3 py-2 rounded-lg text-sm transition-all border",
                      category === c.value
                        ? "bg-gradient-to-r from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10 border-[var(--aurora-start)]/40 font-medium"
                        : "border-transparent hover:bg-secondary/60"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Day + Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Hari ke-</Label>
                <select
                  value={day}
                  onChange={e => setDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Hari {d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Waktu</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            {/* Location (auto-filled from search) */}
            {location && (
              <div className="space-y-1">
                <Label>Lokasi / Alamat</Label>
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Alamat atau nama lokasi"
                />
              </div>
            )}

            {/* Duration */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Durasi</Label>
                <span className="text-xs text-muted-foreground">{duration >= 60 ? `${Math.floor(duration / 60)} jam ${duration % 60 > 0 ? `${duration % 60} mnt` : ''}` : `${duration} mnt`}</span>
              </div>
              <input
                type="range" min="15" max="480" step="15"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full accent-[var(--aurora-start)]"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Tips, info tiket, booking link, dll..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none"
                rows={2}
              />
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
              <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Tambahkan
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
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
      setError(err?.message || JSON.stringify(err))
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

// ─── Day group ────────────────────────────────────────────
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
  const [showTripList, setShowTripList] = useState(true)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null)
  const [addPlaceOpen, setAddPlaceOpen] = useState(false)
  const [addPrefill, setAddPrefill] = useState<{ name: string; location: string; lat: string; lon: string } | null>(null)

  // Place search state
  const [placeQuery, setPlaceQuery] = useState("")
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([])
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false)
  const placeSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Weather state
  const [weather, setWeather] = useState<any[]>([])
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Member state
  const [showMemberDialog, setShowMemberDialog] = useState(false)
  const [members, setMembers] = useState<TripMember[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteSuccess, setInviteSuccess] = useState("")
  const [togglingPublic, setTogglingPublic] = useState(false)

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

  // Fetch weather when trip + destination change
  useEffect(() => {
    if (!selectedTrip?.destination || !selectedTrip.start_date) {
      setWeather([])
      return
    }

    const fetchWeather = async () => {
      setWeatherLoading(true)
      try {
        // Geocode destination → get lat/lng
        const places = await searchPlaces(selectedTrip.destination)
        if (!places.length) return

        const { lat, lon } = places[0]
        const tripDays = selectedTrip.end_date
          ? Math.ceil((new Date(selectedTrip.end_date).getTime() - new Date(selectedTrip.start_date!).getTime()) / 86400000) + 1
          : 7

        const weatherData = await getWeather(parseFloat(lat), parseFloat(lon), Math.min(tripDays, 14))
        setWeather(weatherData)
      } catch {
        setWeather([])
      } finally {
        setWeatherLoading(false)
      }
    }

    fetchWeather()
  }, [selectedTrip?.id, selectedTrip?.destination, selectedTrip?.start_date])

  // Place search handler
  const handlePlaceSearch = (val: string) => {
    setPlaceQuery(val)
    setShowPlaceSuggestions(false)
    if (placeSearchTimeout.current) clearTimeout(placeSearchTimeout.current)
    if (val.length < 2) { setPlaceSuggestions([]); return }
    placeSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchPlaces(val)
        setPlaceSuggestions(res)
        setShowPlaceSuggestions(true)
      } catch { setPlaceSuggestions([]) }
    }, 300)
  }

  const handleSelectPlace = (s: any) => {
    setAddPrefill({
      name: s.display_name.split(",")[0].trim(),
      location: s.display_name.substring(0, 120),
      lat: s.lat,
      lon: s.lon,
    })
    setPlaceQuery("")
    setShowPlaceSuggestions(false)
    setPlaceSuggestions([])
    setAddPlaceOpen(true)
  }

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

  // Map locations
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

  const totalDestinations = itineraryItems.length

  // Trip days for AddPlaceModal
  const tripDays = selectedTrip?.start_date && selectedTrip?.end_date
    ? Math.max(1, Math.ceil((new Date(selectedTrip.end_date).getTime() - new Date(selectedTrip.start_date).getTime()) / 86400000) + 1)
    : Math.max(dayGroups.length, 1)

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Left Sidebar ── */}
      <div className={`
        shrink-0 border-r border-border flex flex-col bg-background/50 backdrop-blur-sm h-screen
        transition-all duration-300 ease-out
        ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-[420px]"}
      `}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b border-border space-y-3 ${sidebarCollapsed ? "hidden" : ""}`}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onToggleSidebar}>
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

        {/* Member Dialog */}
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
              <div className="flex gap-2">
                <Input type="email" placeholder="email@teman.com" value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess("") }}
                  onKeyDown={e => e.key === 'Enter' && handleInviteMember()} className="flex-1 text-sm" />
                <Button variant="gradient" size="sm" onClick={handleInviteMember} disabled={inviteLoading || !inviteEmail.trim()}>
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </div>
              {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-emerald-500">{inviteSuccess}</p>}
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
            <p className="text-xs opacity-70">Buat trip pertamamu dengan tombol di atas!</p>
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
                      <button key={trip.id} onClick={() => setSelectedTrip(trip)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-sm transition-all",
                          selectedTrip?.id === trip.id
                            ? "bg-gradient-to-r from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10 border border-[var(--aurora-start)]/30"
                            : "hover:bg-white/5"
                        )}>
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

        {/* Place Search Bar */}
        {selectedTrip && (
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="🔍 Cari tempat untuk ditambahkan..."
                className="pl-10 pr-10"
                value={placeQuery}
                onChange={e => handlePlaceSearch(e.target.value)}
                onFocus={() => placeSuggestions.length > 0 && setShowPlaceSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPlaceSuggestions(false), 200)}
              />
              {placeQuery && (
                <button onClick={() => { setPlaceQuery(""); setPlaceSuggestions([]); setShowPlaceSuggestions(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
              {showPlaceSuggestions && placeSuggestions.length > 0 && (
                <div className="absolute z-50 w-full top-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {placeSuggestions.slice(0, 6).map(s => (
                    <button key={s.place_id} type="button" onMouseDown={() => handleSelectPlace(s)}
                      className="w-full text-left px-3 py-3 hover:bg-muted/60 transition-colors flex items-start gap-2 border-b border-border/40 last:border-0">
                      <MapPin className="w-4 h-4 text-[var(--aurora-start)] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{s.display_name.split(",")[0]}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.display_name.split(",").slice(1, 3).join(",").trim()}
                        </div>
                      </div>
                      <span className="text-xs text-[var(--aurora-start)] shrink-0 self-center">+ Tambah</span>
                    </button>
                  ))}
                  <button
                    onMouseDown={() => { setAddPrefill(null); setAddPlaceOpen(true); setShowPlaceSuggestions(false) }}
                    className="w-full text-left px-3 py-2.5 text-sm text-[var(--aurora-start)] hover:bg-blue-50/50 flex items-center gap-2 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah "{placeQuery}" manual
                  </button>
                </div>
              )}
            </div>
            {/* Quick add button */}
            <button
              onClick={() => { setAddPrefill(null); setAddPlaceOpen(true) }}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-secondary/50 hover:bg-secondary/80 transition-all text-muted-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah tempat manual
            </button>
          </div>
        )}

        {/* Weather Section */}
        {selectedTrip?.start_date && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <CloudSun className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground">PRAKIRAAN CUACA — {selectedTrip.destination}</span>
            </div>
            {weatherLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Memuat cuaca...
              </div>
            ) : weather.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {weather.slice(0, 7).map((w: any, i: number) => (
                  <div key={i} className="flex flex-col items-center min-w-[44px] bg-secondary/30 rounded-lg p-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {new Date(w.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                    </span>
                    <span className="text-lg my-0.5">{getWeatherIcon(w.weather_code)}</span>
                    <span className="text-xs font-bold">{w.temp_max}°</span>
                    <span className="text-[10px] text-muted-foreground">{w.temp_min}°</span>
                    {w.precipitation_probability > 50 && (
                      <span className="text-[9px] text-blue-400">💧{w.precipitation_probability}%</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Data cuaca tidak tersedia untuk destinasi ini</p>
            )}
          </div>
        )}

        {/* Day Tabs */}
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
                  {weather[i] && (
                    <span className="text-[10px]">{getWeatherIcon(weather[i].weather_code)} {weather[i].temp_max}°</span>
                  )}
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
            <div className="text-center py-8 text-muted-foreground">
              <MapIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">Belum ada itinerary</p>
              <p className="text-xs opacity-70 mb-4">Generate dengan AI atau tambah manual di atas</p>
              <Button variant="gradient" size="sm" className="gap-2 shadow-lg shadow-purple-500/30" onClick={() => navigateTo("ai")}>
                <Sparkles className="w-4 h-4" />✨ Generate dengan AI
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Pilih atau buat trip untuk mulai</p>
            </div>
          )}

          {currentDay && currentDay.items.length > 0 && selectedTrip && (
            <button
              onClick={() => { setAddPrefill(null); setAddPlaceOpen(true) }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--aurora-start)]/30 hover:border-[var(--aurora-start)]/60 hover:bg-[var(--aurora-start)]/5 transition-all text-sm text-muted-foreground hover:text-[var(--aurora-start)]"
            >
              <Plus className="w-4 h-4" />
              Tambah Destinasi ke Hari {dayGroups[selectedDay]?.day || 1}
            </button>
          )}

          {selectedTrip && (
            <div className="pt-4 border-t border-border/50">
              <ReminderPanel tripId={selectedTrip.id} />
            </div>
          )}
        </div>

        {/* Bottom Stats */}
        {dayGroups.length > 0 && (
          <div className="p-4 border-t border-border bg-card/50">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold gradient-text">{totalDestinations}</div>
                <div className="text-xs text-muted-foreground">Destinasi</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--coral-accent)]">{dayGroups.length} hari</div>
                <div className="text-xs text-muted-foreground">Total Trip</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right — Map ── */}
      <div className="flex-1 relative h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f1729]" />

        {/* Floating controls */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="glass" size="sm" onClick={() => navigateTo("home")}>
              <ArrowLeft className="w-4 h-4" />
              <span className="ml-1 text-sm hidden sm:inline">Kembali</span>
            </Button>
            <Button variant="glass" size="sm" onClick={onToggleSidebar} className={sidebarCollapsed ? "bg-white/20" : ""}>
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
            <TripMap locations={mapLocations} height="100%" zoom={13} />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-white/60">
            <MapIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">{selectedTrip ? "Belum ada lokasi di peta" : "Pilih trip untuk melihat peta"}</p>
            <p className="text-sm text-white/40 mt-1">
              {selectedTrip ? "Cari dan tambah destinasi, atau generate dengan AI" : "Atau buat trip baru untuk memulai"}
            </p>
            {selectedTrip && (
              <Button variant="gradient" size="sm" className="mt-4 gap-2 shadow-lg shadow-purple-500/30" onClick={() => navigateTo("ai")}>
                <Sparkles className="w-4 h-4" />✨ Generate dengan AI
              </Button>
            )}
          </div>
        )}

        {/* TWO FABs at bottom-right */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3">
          {/* Add Place FAB */}
          {selectedTrip && (
            <Button
              variant="glass"
              size="lg"
              className="rounded-2xl shadow-lg flex items-center gap-2 h-12 px-5 bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={() => { setAddPrefill(null); setAddPlaceOpen(true) }}
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Tambah Tempat</span>
            </Button>
          )}

          {/* AI Chat FAB */}
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

      {/* Add Place Modal */}
      <AnimatePresence>
        {addPlaceOpen && selectedTrip && (
          <AddPlaceModal
            open={addPlaceOpen}
            onClose={() => { setAddPlaceOpen(false); setAddPrefill(null) }}
            tripId={selectedTrip.id}
            tripDays={tripDays}
            defaultDay={dayGroups[selectedDay]?.day || 1}
            onAdded={refreshItems}
            prefill={addPrefill}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
