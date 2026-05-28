import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Loader2, MapPin, DollarSign,
  ChevronRight, Check, Lightbulb,
  Copy, RotateCcw, Utensils, TreePine, Camera,
  Star, ArrowLeft, Wand2, Users, Zap,
  AlertCircle, Save, CloudSun, Navigation, Ticket, ExternalLink
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Progress } from "../components/ui/progress"
import { cn } from "@/lib/utils"
import { useState, useRef, useCallback } from "react"
import { generateItinerary, searchPlaces, getAIRecommendations, getWeather } from "../lib/api"
import { createTrip, addItineraryItem, getSession } from "../lib/supabase"
import type { Trip } from "../lib/supabase"

const TRIP_TYPES = [
  { id: "culinary", label: "Kuliner", icon: Utensils, color: "from-orange-400 to-amber-400" },
  { id: "nature", label: "Alam", icon: TreePine, color: "from-emerald-400 to-green-400" },
  { id: "culture", label: "Budaya", icon: Camera, color: "from-violet-400 to-purple-400" },
  { id: "shopping", label: "Belanja", icon: Star, color: "from-pink-400 to-rose-400" },
  { id: "adventure", label: "Petualangan", icon: Zap, color: "from-blue-400 to-cyan-400" },
]

const BUDGET_OPTIONS = [
  { id: "Budget", label: "Budget" },
  { id: "Menengah", label: "Menengah" },
  { id: "Premium", label: "Premium" },
]

const BUDGET_MIN = 100000
const BUDGET_MAX = 5000000

// Format currency for display
const formatRupiah = (val: number) => {
  if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`
  if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}rb`
  return `Rp ${val}`
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
  const [duration, setDuration] = useState(2)
  const [people, setPeople] = useState(2)
  // Budget: dual-thumb range
  const [minBudget, setMinBudget] = useState(BUDGET_MIN)
  const [maxBudget, setMaxBudget] = useState(BUDGET_MAX)
  const [preferences, setPreferences] = useState<string[]>([])
  const [customMessage, setCustomMessage] = useState("")
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [error, setError] = useState("")
  const [savedTripId, setSavedTripId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  // ─── Reset form ──────────────────────────────────────
  const handleReset = useCallback(() => {
    setResult(null)
    setRecommendations(null)
    setWeather([])
    setCity("")
    setSelectedPlace(null)
    setDuration(2)
    setPeople(2)
    setMinBudget(BUDGET_MIN)
    setMaxBudget(BUDGET_MAX)
    setPreferences([])
    setCustomMessage("")
    setError("")
    setProgress(0)
    setProgressLabel("")
    setSavedTripId(null)
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
      if (msg.includes("not configured") || msg.includes("API") || msg.includes("Gemini")) {
        setError("AI Generator belum aktif. Pastikan GEMINI_API_KEY sudah benar di server/.env")
      } else {
        setError(msg)
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
      // 1. Create trip record
      const trip = await createTrip({
        name: `${city} - ${duration} Hari`,
        destination: city,
        start_date: undefined,
        end_date: undefined,
        status: "planning",
      }) as Trip

      // 2. Save each itinerary item to DB
      const savedItems: any[] = []
      for (const day of result.itinerary) {
        for (let i = 0; i < day.items.length; i++) {
          const item = day.items[i]
          const saved = await addItineraryItem({
            trip_id: trip.id,
            day: day.day,
            time: item.time || "09:00",
            title: item.title,
            description: item.description,
            location: item.location,
            latitude: item.latitude,
            longitude: item.longitude,
            category: (item.category as any) || "activity",
            duration_minutes: item.duration_minutes,
            notes: item.tips,
            sort_order: i,
          })
          savedItems.push(saved)
        }
      }

      setSavedTripId(trip.id)
      setProgressLabel("Trip berhasil disimpan!")
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

              {/* Duration */}
              <div className="space-y-2">
                <Label>Durasi Trip</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                        duration === d
                          ? "bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-md"
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* People */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="!mb-0">Jumlah Orang</Label>
                  <span className="font-bold text-lg w-8 text-right">{people} org</span>
                </div>
                <input
                  type="range" min="1" max="10"
                  value={people}
                  onChange={e => setPeople(parseInt(e.target.value))}
                  className="w-full accent-[var(--aurora-start)]"
                />
              </div>

              {/* Budget — Dual-thumb range slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="!mb-0">Budget</Label>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatRupiah(minBudget)} — {formatRupiah(maxBudget)}
                  </span>
                </div>
                <div className="relative h-6">
                  {/* Track background */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 rounded-full bg-secondary" />
                  {/* Active track */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)]"
                    style={{
                      left: `${((minBudget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`,
                      right: `${100 - ((maxBudget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`,
                    }}
                  />
                  {/* Min handle */}
                  <input
                    type="range"
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step={50000}
                    value={minBudget}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val < maxBudget) setMinBudget(val)
                    }}
                    className="absolute w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--aurora-start)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--aurora-start)] [&::-moz-range-thumb]:cursor-pointer"
                  />
                  {/* Max handle */}
                  <input
                    type="range"
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step={50000}
                    value={maxBudget}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val > minBudget) setMaxBudget(val)
                    }}
                    className="absolute w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--aurora-end)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--aurora-end)] [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatRupiah(BUDGET_MIN)}</span>
                  <span>{formatRupiah(BUDGET_MAX)}</span>
                </div>
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
                              <p className="font-bold">Hari {day.day}</p>
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
                            const bookingQuery = encodeURIComponent(`${item.location || item.title}`)
                            const isHotelCategory = cat === 'hotel'
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
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <button
                                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                      onClick={() => window.open(`https://www.traveloka.com/en/${isHotelCategory ? 'hotels' : 'flights'}/search?query=${bookingQuery}`, "_blank")}
                                    >
                                      <Ticket className="w-3 h-3" /> Pesan di Traveloka
                                    </button>
                                    <button
                                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white transition-colors"
                                      onClick={() => window.open(`https://www.tiket.com/search?query=${bookingQuery}${isHotelCategory ? '&type=hotel' : ''}`, "_blank")}
                                    >
                                      <Ticket className="w-3 h-3" /> Tiket.com
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Save actions */}
                  <div className="flex justify-center gap-3 pt-2">
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
                          <><Save className="w-4 h-4 mr-2" />Simpan sebagai Trip</>
                        )}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    ⚠️ Output dihasilkan AI. Harga bersifat estimasi. Klik tombol biru/oranye untuk pesan langsung via Traveloka atau Tiket.com.
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
