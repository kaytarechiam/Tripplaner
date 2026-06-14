import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Loader2, MapPin, DollarSign,
  ChevronRight, Check, Lightbulb,
  Copy, RotateCcw, Utensils, TreePine, Camera,
  Star, ArrowLeft, Wand2, Users, Zap,
  AlertCircle, Save, CloudSun, Navigation, Ticket
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Progress } from "../components/ui/progress"
import { cn } from "@/lib/utils"
import { useState, useRef, useCallback, useEffect } from "react"
import { generateItinerary, searchPlaces, getAIRecommendations, getWeather } from "../lib/api"
import { createTrip, addItineraryItem, getSession, getTrips } from "../lib/supabase"
import type { Trip } from "../lib/supabase"

const TRIP_TYPES = [
  { id: "culinary", label: "Kuliner", icon: Utensils, color: "from-orange-400 to-amber-400" },
  { id: "nature", label: "Alam", icon: TreePine, color: "from-emerald-400 to-green-400" },
  { id: "culture", label: "Budaya", icon: Camera, color: "from-violet-400 to-purple-400" },
  { id: "shopping", label: "Belanja", icon: Star, color: "from-pink-400 to-rose-400" },
  { id: "adventure", label: "Petualangan", icon: Zap, color: "from-blue-400 to-cyan-400" },
]

// Budget presets per hari (min, max)
const BUDGET_PRESETS = [
  { label: "100rb",  min: 100_000,   max: 300_000   },
  { label: "500rb",  min: 300_000,   max: 700_000   },
  { label: "1jt",    min: 700_000,   max: 1_500_000 },
  { label: "3jt",    min: 1_500_000, max: 3_500_000 },
  { label: "5jt",    min: 3_500_000, max: 7_000_000 },
  { label: "10jt",   min: 7_000_000, max: 15_000_000},
  { label: "20jt+",  min: 15_000_000,max: 50_000_000},
]

const BUDGET_MIN = 0
const BUDGET_MAX = 999_000_000

// Format currency for display
const formatRupiah = (val: number) => {
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}jt`
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`
  return `Rp ${val}`
}

// Parse typed Rupiah string back to number
const parseRupiahInput = (raw: string): number => {
  const cleaned = raw.replace(/[^0-9]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

// Format number as plain thousand-separated for input display
const formatInputDisplay = (val: number): string => {
  if (!val) return ''
  return val.toLocaleString('id-ID')
}

// Weather icon mapping from WMO codes
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

interface PlaceSuggestion {
  place_id: string
  display_name: string
  lat: string
  lon: string
  type: string
  country?: string
  city?: string
}

interface Props {
  navigateTo: (page: "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications") => void
}

export function AIGeneratorPage({ navigateTo }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [weather, setWeather] = useState<any[]>([])
  const [city, setCity] = useState("")
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Manual day override — used when no dates selected
  const [manualDays, setManualDays] = useState(3)

  // Derived: if dates set → use date diff; otherwise use manual slider
  const duration = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : manualDays

  const [people, setPeople] = useState(2)
  // Budget: free-input + presets (default ~1jt/hari)
  const [minBudget, setMinBudget] = useState(BUDGET_PRESETS[2].min)
  const [maxBudget, setMaxBudget] = useState(BUDGET_PRESETS[2].max)
  const [preferences, setPreferences] = useState<string[]>([])
  const [customMessage, setCustomMessage] = useState("")
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [error, setError] = useState("")
  const [savedTripId, setSavedTripId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // Save to existing trip
  const [existingTrips, setExistingTrips] = useState<Trip[]>([])
  const [selectedExistingTrip, setSelectedExistingTrip] = useState<string>("new")
  const [showTripSelector, setShowTripSelector] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Toggle preference chip ────────────────────────────
  const togglePreference = useCallback((pref: string) => {
    setPreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    )
  }, [])

  // ─── City input + autocomplete ───────────────────────
  const handleCityChange = useCallback((value: string) => {
    setCity(value)
    setSelectedPlace(null)
    setShowSuggestions(false)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 2) { setSuggestions([]); return }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchPlaces(value)
        setSuggestions(res)
        setShowSuggestions(true)
      } catch { setSuggestions([]) }
    }, 300)
  }, [])

  const handleSelectSuggestion = useCallback((s: PlaceSuggestion) => {
    setCity(s.display_name.split(",")[0].trim())
    setSelectedPlace(s)
    setShowSuggestions(false)
    setSuggestions([])
  }, [])

  // ─── Pre-fill from TripEditor context ───────────────────
  const [prefillTripId, setPrefillTripId] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('ai_trip_context')
    if (!raw) return
    try {
      const ctx = JSON.parse(raw)
      if (ctx.destination) setCity(ctx.destination)
      if (ctx.startDate) setStartDate(ctx.startDate)
      if (ctx.endDate) setEndDate(ctx.endDate)
      if (ctx.tripId) {
        setPrefillTripId(ctx.tripId)
        setSelectedExistingTrip(ctx.tripId)
      }
      // Clear so next visit to AI page starts fresh
      sessionStorage.removeItem('ai_trip_context')
    } catch { /* ignore malformed JSON */ }
  }, [])

  // Load existing trips when result is shown (also pre-load if prefill tripId exists)
  useEffect(() => {
    if (result || prefillTripId) {
      getTrips().then(trips => {
        setExistingTrips(trips)
        // If prefillTripId is set and exists in trips, keep it selected
        if (prefillTripId && trips.some((t: Trip) => t.id === prefillTripId)) {
          setSelectedExistingTrip(prefillTripId)
        }
      }).catch(() => setExistingTrips([]))
    }
  }, [result, prefillTripId])

  // ─── Reset form ──────────────────────────────────────
  const handleReset = useCallback(() => {
    setResult(null)
    setRecommendations(null)
    setWeather([])
    setCity("")
    setSelectedPlace(null)
    setStartDate("")
    setEndDate("")
    setManualDays(3)
    setPeople(2)
    setMinBudget(BUDGET_PRESETS[2].min)   // default: kisaran 1jt
    setMaxBudget(BUDGET_PRESETS[2].max)
    setPreferences([])
    setCustomMessage("")
    setError("")
    setProgress(0)
    setProgressLabel("")
    setSavedTripId(null)
    setPrefillTripId(null)
    setSelectedExistingTrip("new")
  }, [])

  // ─── Main generate ───────────────────────────────────
  const handleGenerate = async () => {
    if (!city.trim()) {
      setError("Kota tujuan wajib diisi.")
      return
    }

    setIsGenerating(true)
    setError("")
    setResult(null)
    setRecommendations(null)
    setWeather([])
    setSavedTripId(null)
    setProgress(5)
    setProgressLabel("Menghubungi AI...")

    try {
      setProgress(20)
      setProgressLabel("Membuat itinerary optimal...")

      // Call AI generator with CORRECT payload
      const aiResult = await generateItinerary({
        destination: city,
        days: duration,
        travelers: people,
        preferences,
        customMessage,
        minBudget,
        maxBudget,
        start_date: startDate,
      })

      setProgress(70)
      setProgressLabel("Mendapatkan rekomendasi tempat...")
      setResult(aiResult)

      // Parallel: fetch recommendations + weather if we have coordinates
      const [recResult] = await Promise.allSettled([
        getAIRecommendations(city, preferences[0] || "mixed"),
        // Weather fetch only if we have lat/lon from selected place
        selectedPlace?.lat && selectedPlace?.lon
          ? getWeather(parseFloat(selectedPlace.lat), parseFloat(selectedPlace.lon), duration)
          : Promise.resolve([]),
      ])

      if (recResult.status === "fulfilled") {
        setRecommendations(recResult.value)
      }

      // Check weather result separately since it was in the same Promise.allSettled
      if (selectedPlace?.lat && selectedPlace?.lon) {
        const weatherResult = await Promise.allSettled([
          getWeather(parseFloat(selectedPlace.lat), parseFloat(selectedPlace.lon), duration),
        ])
        if (weatherResult[0].status === "fulfilled") {
          setWeather(weatherResult[0].value)
        }
      }

      setProgress(100)
      setProgressLabel("Selesai!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal generate itinerary"
      if (msg.toLowerCase().includes("fetch") || msg.includes("ERR_") || msg.includes("network")) {
        setError("Tidak bisa terhubung ke server. Pastikan server backend sudah berjalan (npm run dev).")
      } else if (msg.includes("not configured") || msg.includes("API key") || msg.includes("ADACODE")) {
        setError("AI belum dikonfigurasi. Pastikan ADACODE_API_KEY sudah benar di server/.env")
      } else if (msg.includes("Kredit adaCODE") || msg.includes("adacode.ai") || msg.includes("perpanjang")) {
        setError("Kredit adaCODE habis. Silakan perpanjang langganan di adacode.ai agar fitur AI kembali aktif.")
      } else if (msg.includes("quota") || msg.includes("billing") || msg.includes("exceeded") || msg.includes("tidak tersedia")) {
        setError("Layanan AI sedang penuh atau tidak tersedia. Coba lagi beberapa saat ya.")
      } else if (msg.includes("timed out") || msg.includes("timeout")) {
        setError("AI membutuhkan waktu terlalu lama. Coba dengan destinasi atau durasi yang lebih singkat.")
      } else {
        setError(msg || "Gagal generate itinerary. Coba lagi.")
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── Save itinerary to Supabase ───────────────────────
  const handleSave = async () => {
    if (!result || !city.trim()) return

    setIsSaving(true)
    try {
      let tripId: string

      if (selectedExistingTrip === "new") {
        // Create new trip record
        const trip = await createTrip({
          name: `${city} - ${duration} Hari`,
          destination: city,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          status: "planning",
        }) as Trip
        tripId = trip.id
      } else {
        // Use existing trip
        tripId = selectedExistingTrip
      }

      // Map AI category values → DB-accepted values
      const AI_TO_DB_CAT: Record<string, string> = {
        hotel: 'accommodation', accommodation: 'accommodation',
        landmark: 'attraction', nature: 'attraction', activity: 'attraction',
        shopping: 'attraction', cultural: 'attraction', culture: 'attraction',
        sightseeing: 'attraction', entertainment: 'attraction',
        food: 'food', restaurant: 'food', culinary: 'food',
        transport: 'transport', transportation: 'transport',
      }
      // Save each itinerary item
      for (const day of result.itinerary) {
        for (let i = 0; i < day.items.length; i++) {
          const item = day.items[i]
          const dbCategory = AI_TO_DB_CAT[(item.category || '').toLowerCase()] ?? 'attraction'
          await addItineraryItem({
            trip_id: tripId,
            day: day.day,
            time: item.time || "09:00",
            title: item.title,
            description: item.description,
            location: item.location,
            latitude: item.latitude,
            longitude: item.longitude,
            category: dbCategory as any,
            duration_minutes: item.duration_minutes,
            notes: item.tips,
            sort_order: i,
          })
        }
      }

      setSavedTripId(tripId)
      setProgressLabel(selectedExistingTrip === "new" ? "Trip baru berhasil dibuat!" : "Itinerary berhasil ditambahkan ke trip!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan trip.")
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Calculate total budget ────────────────────────────
  const totalBudget = result?.itinerary?.reduce((sum: number, day: any) =>
    sum + day.items.reduce((s: number, item: any) => {
      const cost = parseInt((item.estimated_cost || "0").replace(/[^0-9]/g, ""))
      return s + (isNaN(cost) ? 0 : cost)
    }, 0)
  , 0) ?? 0

  // ─── Booking platforms helper ──────────────────────────
  const getBookingPlatforms = (item: any) => {
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
    } else if (category === "transport" && (title.includes("kereta") || title.includes("train") || title.includes("bus"))) {
      platforms.push(
        { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/trains/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700" },
        { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=train`, color: "bg-[#f97316] hover:bg-[#ea580c]" }
      )
    } else if (category === "food") {
      platforms.push(
        { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${query}&dest_type=city`, color: "bg-[#003580] hover:bg-[#00224f]" }
      )
    }
    return platforms
  }

  return (
    <div className="pt-16 min-h-screen">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── LEFT — Form ── */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card p-6 space-y-5">

              {/* City with autocomplete */}
              <div className="space-y-1">
                <Label>Kota Tujuan</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Ketik kota atau negara..."
                    className="pl-10"
                    value={city}
                    onChange={e => handleCityChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto"
                      >
                        {suggestions.map((s) => (
                          <button
                            key={s.place_id}
                            type="button"
                            onMouseDown={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                          >
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">{s.display_name.split(",")[0]}</span>
                            <span className="text-xs text-muted-foreground ml-auto truncate max-w-[120px]">
                              {s.display_name.split(",").slice(1).join(",").trim().substring(0, 40)}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tanggal Trip</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mulai</Label>
                    <Input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Selesai</Label>
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      onChange={e => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                {startDate && endDate ? (
                  <p className="text-xs text-muted-foreground">
                    📅 {duration} hari perjalanan (dari tanggal)
                  </p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Durasi Perjalanan</Label>
                      <span className="text-sm font-semibold">{manualDays} hari</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setManualDays(d => Math.max(1, d - 1))}
                        className="w-8 h-8 rounded-lg border border-input bg-secondary hover:bg-secondary/80 flex items-center justify-center text-base font-bold transition-colors"
                      >−</button>
                      <input
                        type="range"
                        min={1}
                        max={14}
                        value={manualDays}
                        onChange={e => setManualDays(Number(e.target.value))}
                        className="flex-1 accent-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => setManualDays(d => Math.min(14, d + 1))}
                        className="w-8 h-8 rounded-lg border border-input bg-secondary hover:bg-secondary/80 flex items-center justify-center text-base font-bold transition-colors"
                      >+</button>
                    </div>
                    <p className="text-xs text-muted-foreground">atau pilih tanggal di atas untuk set otomatis</p>
                  </div>
                )}
              </div>

              {/* People — stepper, no upper limit */}
              <div className="space-y-2">
                <Label>Jumlah Orang</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPeople(p => Math.max(1, p - 1))}
                    className="w-9 h-9 rounded-xl border border-input bg-secondary hover:bg-secondary/80 flex items-center justify-center text-lg font-bold transition-colors"
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    value={people}
                    onChange={e => {
                      const v = parseInt(e.target.value)
                      if (!isNaN(v) && v >= 1) setPeople(v)
                    }}
                    className="flex-1 text-center rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPeople(p => p + 1)}
                    className="w-9 h-9 rounded-xl border border-input bg-secondary hover:bg-secondary/80 flex items-center justify-center text-lg font-bold transition-colors"
                  >+</button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">orang</span>
                </div>
              </div>

              {/* Budget — free-input + preset chips */}
              <div className="space-y-3">
                <Label>Budget per Hari</Label>

                {/* Preset chips */}
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_PRESETS.map(p => {
                    const active = minBudget === p.min && maxBudget === p.max
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => { setMinBudget(p.min); setMaxBudget(p.max) }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                          active
                            ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white border-transparent shadow-sm"
                            : "border-input bg-secondary/60 hover:bg-secondary text-muted-foreground"
                        )}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>

                {/* Min / Max inputs */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Min</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatInputDisplay(minBudget)}
                      onChange={e => {
                        const v = parseRupiahInput(e.target.value)
                        if (v >= 0) setMinBudget(v)
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">—</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Max</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatInputDisplay(maxBudget)}
                      onChange={e => {
                        const v = parseRupiahInput(e.target.value)
                        if (v >= 0) setMaxBudget(v)
                      }}
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-input bg-background text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                {minBudget > 0 && maxBudget > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatRupiah(minBudget)} – {formatRupiah(maxBudget)} per hari
                    {people > 1 && ` · ${formatRupiah(minBudget * people)}–${formatRupiah(maxBudget * people)} total`}
                  </p>
                )}
              </div>

              {/* Preferences — FIXED: now sent to backend */}
              <div className="space-y-2">
                <Label>Minat / Preferensi</Label>
                <div className="flex flex-wrap gap-2">
                  {TRIP_TYPES.map(t => {
                    const Icon = t.icon
                    const selected = preferences.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => togglePreference(t.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          selected
                            ? `bg-gradient-to-br ${t.color} text-white`
                            : "bg-secondary hover:bg-secondary/80"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Message */}
              {preferences.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span>Catatan Khusus</span>
                    <Badge variant="outline" className="text-xs">Opsional</Badge>
                  </Label>
                  <textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder="Tidak ada opsi yang cocok? Tulis request khusus di sini... Contoh: 'Saya suka tempat yang tenang untuk fotografi'"
                    className="w-full h-20 rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-none"
                    rows={3}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating || !city.trim()}
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generate dengan AI</>
                )}
              </Button>

              {/* Real Progress — FIXED: no fake delays */}
              {isGenerating && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressLabel}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
            </Card>

            {/* Tips */}
            <Card className="glass-card p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-1">Tips dari AI</p>
                  <p className="text-xs text-muted-foreground">
                    Pilih preferensi dan budget untuk hasil itinerary yang lebih akurat.
                    Minimal pilih 1 kota tujuan untuk memulai.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* ── RIGHT — Result ── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-5"
                >
                  {/* Header card */}
                  <Card className="glass-card p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">Itinerary Generated!</p>
                        <p className="text-sm text-muted-foreground">
                          {city} · {duration} hari · {people} orang · {formatRupiah(minBudget)}–{formatRupiah(maxBudget)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                        <Sparkles className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </Card>

                  {/* Summary */}
                  {result.summary && (
                    <Card className="glass-card p-4">
                      <p className="text-sm text-muted-foreground italic">"{result.summary}"</p>
                    </Card>
                  )}

                  {/* Budget + Weather row */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="glass-card p-4 flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">Estimasi Total</span>
                        <div className="text-lg font-black gradient-text">
                          {result.total_estimated_budget || "—"}
                        </div>
                      </div>
                    </Card>

                    {/* Weather display if available */}
                    {weather.length > 0 && (
                      <Card className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CloudSun className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Cuaca ({city})</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto">
                          {weather.slice(0, duration).map((w: any, i: number) => (
                            <div key={i} className="flex flex-col items-center min-w-[48px]">
                              <span className="text-lg">{getWeatherIcon(w.weather_code)}</span>
                              <span className="text-xs font-medium">{w.temp_max}°</span>
                              <span className="text-xs text-muted-foreground">{w.temp_min}°</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Best season */}
                  {result.best_season && (
                    <Card className="glass-card p-4 flex items-center gap-3">
                      <Navigation className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="text-xs text-muted-foreground">Waktu terbaik visit </span>
                        <span className="text-sm font-medium">{result.best_season}</span>
                      </div>
                    </Card>
                  )}

                  {/* AI Recommendations */}
                  {recommendations && (
                    <Card className="glass-card p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <h3 className="font-bold">Rekomendasi AI</h3>
                      </div>

                      {recommendations.places?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">📍 Tempat Wajib Kunjungi</p>
                          <div className="flex flex-wrap gap-1.5">
                            {recommendations.places.map((p: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {recommendations.restaurants?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">🍽️ Rekomendasi Restoran</p>
                          <div className="flex flex-wrap gap-1.5">
                            {recommendations.restaurants.map((r: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {recommendations.hidden_gems?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">✨ Hidden Gems</p>
                          <div className="flex flex-wrap gap-1.5">
                            {recommendations.hidden_gems.map((g: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {recommendations.local_tips?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">💡 Tips Lokal</p>
                          <ul className="space-y-1">
                            {recommendations.local_tips.map((t: string, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className="shrink-0">•</span>{t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Day-by-day itinerary */}
                  <div className="space-y-4">
                    {(result.itinerary || []).map((day: any) => (
                      <Card key={day.day} className="glass-card p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center text-white font-bold">
                              {day.day}
                            </div>
                            <div>
                              <p className="font-bold flex items-center gap-2">
                                Hari {day.day}
                                {weather && weather[day.day - 1] && (
                                  <span className="ml-1 text-sm text-muted-foreground flex items-center gap-1 font-normal">
                                    {getWeatherIcon(weather[day.day - 1].weather_code)}
                                    {weather[day.day - 1].temp_max}°/{weather[day.day - 1].temp_min}°C
                                    {weather[day.day - 1].precipitation_probability > 50 && (
                                      <span className="text-xs text-blue-400">💧{weather[day.day - 1].precipitation_probability}%</span>
                                    )}
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">{day.date || "Tanggal TBD"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{day.items?.length} aktivitas</p>
                          </div>
                        </div>

                        {/* Activities */}
                        <div className="relative pl-6 space-y-3">
                          <div className="absolute left-2.5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[var(--aurora-start)] to-[var(--aurora-end)] rounded-full" />
                          {day.items?.map((item: any, i: number) => {
                            const cat = item.category?.split("/")[0] || "activity"
                            const catColorMap: Record<string, string> = {
                              food: "from-orange-400 to-amber-400",
                              landmark: "from-violet-400 to-purple-400",
                              nature: "from-emerald-400 to-green-400",
                              shopping: "from-pink-400 to-rose-400",
                              activity: "from-blue-400 to-cyan-400",
                              hotel: "from-gray-400 to-gray-500",
                              transport: "from-gray-400 to-gray-500",
                            }
                            const catColor = catColorMap[cat] || "from-gray-400 to-gray-500"

                            // Build booking platform buttons based on category
                            const locQ   = encodeURIComponent((item.location || item.title || "").trim())
                            const titleQ = encodeURIComponent((item.title || item.location || "").trim())
                            const itemCat   = cat
                            const itemTitle = item.title?.toLowerCase() || ""
                            const aiBookingPlatforms: Array<{name: string; url: string; color: string}> = []

                            // Google Maps — always shown
                            aiBookingPlatforms.push(
                              { name: "Maps", url: `https://www.google.com/maps/search/?api=1&query=${locQ}`, color: "bg-[#4285F4] hover:bg-[#2b6cd6]" }
                            )

                            if (itemCat === "hotel") {
                              const ci = startDate, co = endDate
                              aiBookingPlatforms.push(
                                { name: "Traveloka", url: `https://www.traveloka.com/en-id/hotel?search=${locQ}${ci ? `&checkInDate=${ci.replace(/-/g,'')}&checkOutDate=${co.replace(/-/g,'')}` : ''}`, color: "bg-blue-600 hover:bg-blue-700" },
                                { name: "Booking",   url: `https://www.booking.com/searchresults.html?ss=${locQ}${ci ? `&checkin=${ci}&checkout=${co}` : ''}`, color: "bg-[#003580] hover:bg-[#00224f]" },
                                { name: "Agoda",     url: `https://www.agoda.com/search?city=${locQ}${ci ? `&checkIn=${ci}` : ''}`, color: "bg-[#dd1f39] hover:bg-[#b71c1c]" },
                                { name: "Airbnb",    url: `https://www.airbnb.com/s/${locQ}/homes`, color: "bg-[#FF5A5F] hover:bg-[#e04347]" }
                              )
                            } else if (itemCat === "transport" && (itemTitle.includes("flight") || itemTitle.includes("penerbangan") || itemTitle.includes("pesawat"))) {
                              aiBookingPlatforms.push(
                                { name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?query=${locQ}`, color: "bg-blue-600 hover:bg-blue-700" },
                                { name: "Tiket.com", url: `https://www.tiket.com/search?query=${locQ}&type=flight`, color: "bg-[#f97316] hover:bg-[#ea580c]" }
                              )
                            } else if (itemCat === "transport" && (itemTitle.includes("kereta") || itemTitle.includes("train") || itemTitle.includes("bus"))) {
                              aiBookingPlatforms.push(
                                { name: "Traveloka", url: `https://www.traveloka.com/en/trains/search?query=${locQ}`, color: "bg-blue-600 hover:bg-blue-700" },
                                { name: "Tiket.com", url: `https://www.tiket.com/search?query=${locQ}&type=train`, color: "bg-[#f97316] hover:bg-[#ea580c]" }
                              )
                            } else if (itemCat === "food") {
                              aiBookingPlatforms.push(
                                { name: "Klook", url: `https://www.klook.com/en-ID/search/?query=${titleQ}`, color: "bg-[#FF5010] hover:bg-[#e04000]" }
                              )
                            } else if (["landmark", "nature", "activity", "shopping"].includes(itemCat)) {
                              aiBookingPlatforms.push(
                                { name: "Klook",        url: `https://www.klook.com/en-ID/search/?query=${titleQ}`,    color: "bg-[#FF5010] hover:bg-[#e04000]" },
                                { name: "GetYourGuide", url: `https://www.getyourguide.com/s/?q=${titleQ}`,            color: "bg-[#FF8000] hover:bg-[#e07000]" }
                              )
                            }

                            return (
                              <div key={i} className="relative flex items-start gap-4 pl-4">
                                <div className={`absolute left-2 top-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br ${catColor} shadow-lg z-10`} />
                                <div className="flex-1 bg-muted/40 rounded-xl p-4">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-medium">{item.time} — {item.title}</p>
                                    {item.estimated_cost && (
                                      <span className="text-xs font-medium text-[var(--aurora-start)] shrink-0">
                                        {item.estimated_cost}
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                                  )}
                                  {item.location && (
                                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />{item.location}
                                    </p>
                                  )}
                                  {item.tips && (
                                    <p className="text-xs text-muted-foreground/70 italic mt-1">💡 {item.tips}</p>
                                  )}
                                  {aiBookingPlatforms.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {aiBookingPlatforms.map(p => (
                                        <button
                                          key={p.name}
                                          onClick={() => window.open(p.url, "_blank")}
                                          className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-white transition-all active:scale-95", p.color)}
                                        >
                                          <Ticket className="w-3 h-3" />{p.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>

                    {/* Save actions */}
                    <div className="space-y-3 pt-2">
                      {/* Trip selector */}
                      {!savedTripId && (
                        <div className="flex flex-col gap-2 max-w-sm mx-auto">
                          <p className="text-xs font-medium text-muted-foreground text-center">Simpan ke mana?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedExistingTrip("new")}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border",
                                selectedExistingTrip === "new"
                                  ? "bg-gradient-to-r from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10 border-[var(--aurora-start)]/40"
                                  : "border-transparent hover:bg-secondary/60"
                              )}
                            >
                              ✨ Trip Baru
                            </button>
                            <button
                              onClick={() => setSelectedExistingTrip(existingTrips[0]?.id || "new")}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border",
                                selectedExistingTrip !== "new"
                                  ? "bg-gradient-to-r from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10 border-[var(--aurora-start)]/40"
                                  : "border-transparent hover:bg-secondary/60"
                              )}
                            >
                              📁 Trip Saya
                            </button>
                          </div>
                          {selectedExistingTrip !== "new" && existingTrips.length > 0 && (
                            <select
                              value={selectedExistingTrip}
                              onChange={e => setSelectedExistingTrip(e.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            >
                              {existingTrips.map(t => (
                                <option key={t.id} value={t.id}>{t.name} — {t.destination}</option>
                              ))}
                            </select>
                          )}
                          {selectedExistingTrip !== "new" && existingTrips.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center">Belum ada trip. Pilih "Trip Baru".</p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={handleReset}>
                          <RotateCcw className="w-4 h-4 mr-2" />Generate Ulang
                        </Button>
                        {savedTripId ? (
                          <Button variant="outline" onClick={() => navigateTo("editor")}>
                            <Check className="w-4 h-4 mr-2" />Lihat di Editor
                          </Button>
                        ) : (
                          <Button variant="gradient" size="lg" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
                            ) : (
                              <><Save className="w-4 h-4 mr-2" />{selectedExistingTrip === "new" ? "Simpan sebagai Trip Baru" : "Tambah ke Trip Saya"}</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      ⚠️ Output dihasilkan AI. Harga bersifat estimasi. Klik tombol biru/oranye untuk pesan langsung via Traveloka, Tiket.com, Agoda, atau Booking.com.
                    </p>
                  </motion.div>
                ) : (
                /* Empty state */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="glass-card p-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center mx-auto">
                      <Wand2 className="w-8 h-8 text-[var(--aurora-start)]" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Buat Itinerary dengan AI</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Isi form di samping dan klik Generate. AI akan membuat rencana trip otomatis.
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
