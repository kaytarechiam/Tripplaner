import {
  MapPin, Clock, Edit3, Trash2, ExternalLink,
  Utensils, TreePine, Camera, Landmark, ShoppingBag, Hotel, Navigation,
  Loader2, Check, Ticket, TrendingUp, ChevronDown, Wifi, Coffee, Waves, Dumbbell
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ItineraryItem } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"

const categoryConfig: Record<string, { icon: typeof MapPin; label: string; color: string }> = {
  hotel: { icon: Hotel, label: "Hotel", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  landmark: { icon: Landmark, label: "Landmark", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  food: { icon: Utensils, label: "Kuliner", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  nature: { icon: TreePine, label: "Alam", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  activity: { icon: Camera, label: "Aktivitas", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  shopping: { icon: ShoppingBag, label: "Belanja", color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30" },
  transport: { icon: Navigation, label: "Transport", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
}

interface BookingPlatform {
  id: string
  name: string
  url: string
  color: string
}

interface PriceSource {
  source: string
  name: string
  price: string
  rating: number
  stars: number
  bookingUrl: string
  platforms: BookingPlatform[]
}

interface PriceComparison {
  item: string
  category: string
  sources: {
    booking?: { results: any[]; isMock: boolean }
    agoda?: { results: any[]; isMock: boolean }
  }
  isMockData: boolean
  platforms: BookingPlatform[]
}

// Platform color mapping
const platformColors: Record<string, { bg: string; text: string; border: string }> = {
  traveloka: { bg: "bg-blue-600", text: "text-blue-400", border: "border-blue-500/30" },
  tiket: { bg: "bg-[#f97316]", text: "text-orange-400", border: "border-orange-500/30" },
  agoda: { bg: "bg-[#dd1f39]", text: "text-red-400", border: "border-red-500/30" },
  booking: { bg: "bg-[#003580]", text: "text-blue-300", border: "border-blue-400/30" },
}

// Which platforms to show per category
const categoryPlatforms: Record<string, string[]> = {
  hotel: ["traveloka", "tiket", "agoda", "booking"],
  transport_flight: ["traveloka", "tiket"],
  transport_train: ["traveloka", "tiket"],
  food: ["booking"],
  // landmark, nature, activity, shopping → no booking platforms
}

interface PlaceDetailModalProps {
  item: ItineraryItem | null
  onClose: () => void
  onDeleted?: () => void
}

export function PlaceDetailModal({ item, onClose, onDeleted }: PlaceDetailModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [priceComparison, setPriceComparison] = useState<PriceComparison | null>(null)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [expandedTier, setExpandedTier] = useState<string | null>(null)

  // Fetch price comparison when item changes
  useEffect(() => {
    if (!item) return
    const cat = item.category?.toLowerCase() || "activity"
    if (cat !== "hotel" && cat !== "transport") {
      setPriceComparison(null)
      return
    }
    fetchPriceComparison()
  }, [item?.id])

  const fetchPriceComparison = async () => {
    if (!item) return
    setLoadingPrices(true)
    setPriceError(null)
    try {
      const res = await fetch(
        `/api/booking/booking-compare?item=${encodeURIComponent(item.title + (item.location ? " " + item.location : ""))}&category=${item.category || "hotel"}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PriceComparison = await res.json()
      setPriceComparison(data)
    } catch (err) {
      console.error("Failed to fetch price comparison:", err)
      setPriceError("Gagal memuat data harga")
    } finally {
      setLoadingPrices(false)
    }
  }

  // Get which platforms are available for current category
  const getAvailablePlatforms = (): BookingPlatform[] => {
    if (!item) return []
    const cat = item.category?.toLowerCase() || "activity"
    const title = item.title?.toLowerCase() || ""

    if (cat === "hotel") return [
      { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/hotels/search?query=${encodeURIComponent(item.location || item.title)}`, color: "#2563eb" },
      { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodeURIComponent(item.location || item.title)}&type=hotel`, color: "#f97316" },
      { id: "agoda", name: "Agoda", url: `https://www.agoda.com/search?locale=en-us&currency=IDR&pricenext=1&query=${encodeURIComponent(item.location || item.title)}`, color: "#dd1f39" },
      { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${encodeURIComponent(item.location || item.title)}`, color: "#003580" },
    ]
    if (cat === "transport" && (title.includes("flight") || title.includes("penerbangan") || title.includes("pesawat"))) {
      return [
        { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?query=${encodeURIComponent(item.location || item.title)}`, color: "#2563eb" },
        { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodeURIComponent(item.location || item.title)}&type=flight`, color: "#f97316" },
      ]
    }
    if (cat === "transport" && (title.includes("kereta") || title.includes("train"))) {
      return [
        { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/trains/search?query=${encodeURIComponent(item.location || item.title)}`, color: "#2563eb" },
        { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${encodeURIComponent(item.location || item.title)}&type=train`, color: "#f97316" },
      ]
    }
    return []
  }

  const availablePlatforms = getAvailablePlatforms()

  const handleDelete = async () => {
    if (!item || deleting) return
    setDeleting(true)
    try {
      await supabase?.from("itinerary_items").delete().eq("id", item.id)
      setDeleted(true)
      setTimeout(() => {
        onDeleted?.()
        onClose()
      }, 800)
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenMaps = () => {
    if (!item) return
    if (item.latitude && item.longitude) {
      window.open(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`, "_blank")
    } else if (item.location) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`, "_blank")
    }
  }

  const platformBg: Record<string, string> = {
    traveloka: "bg-blue-600 hover:bg-blue-700",
    tiket: "bg-[#f97316] hover:bg-[#ea580c]",
    agoda: "bg-[#dd1f39] hover:bg-[#b71c1c]",
    booking: "bg-[#003580] hover:bg-[#00224f]",
  }

  const simpleUrls = availablePlatforms
  const bookingResults = priceComparison?.sources?.booking?.results
  const agodaResults = priceComparison?.sources?.agoda?.results
  const hasRealPriceData = priceComparison && (
    (bookingResults && bookingResults.length > 0 && !priceComparison?.sources?.booking?.isMock) ||
    (agodaResults && agodaResults.length > 0 && !priceComparison?.sources?.agoda?.isMock)
  )

  if (!item) return null

  const config = categoryConfig[item.category] || categoryConfig.landmark
  const Icon = config.icon

  const formatPrice = (price: number, currency = "IDR") => {
    if (currency === "IDR") {
      return `Rp ${price.toLocaleString("id-ID")}`
    }
    return `${currency} ${price.toLocaleString()}`
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", config.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <Badge className={cn("text-xs border", config.color)}>{config.label}</Badge>
                <DialogTitle className="text-lg mt-1">{item.title}</DialogTitle>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time & Duration */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{item.time}</p>
              {item.duration_minutes && (
                <p className="text-xs text-muted-foreground">{item.duration_minutes} menit</p>
              )}
            </div>
          </div>

          {/* Location */}
          {item.location && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{item.location}</p>
                {item.latitude && item.longitude && (
                  <p className="text-xs text-muted-foreground">
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-sm font-medium mb-1">Deskripsi</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          )}

          {/* Notes / Tips */}
          {item.notes && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-600 mb-1">Catatan AI</p>
              <p className="text-sm text-amber-700">{item.notes}</p>
            </div>
          )}

          {/* ── BOOKING SECTION ──────────────────────────────── */}
          {availablePlatforms.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-2.5 border-b border-border flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {item.category === "hotel" ? "Cari & Bandingkan Harga" :
                    item.category === "transport" ? "Pesan Transportasi" : "Pesan Sekarang"}
                </span>
                {priceComparison && priceComparison.isMockData && (
                  <span className="ml-auto text-[10px] text-muted-foreground">estimasi</span>
                )}
                {hasRealPriceData && (
                  <span className="ml-auto text-[10px] font-semibold text-green-600 dark:text-green-400">real-time</span>
                )}
              </div>

              {/* Price comparison from API */}
              {loadingPrices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Memuat harga...</span>
                </div>
              ) : priceError ? (
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-3">{priceError}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {simpleUrls.map((p) => (
                      <button
                        key={p.id}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-white text-sm font-medium transition-all active:scale-95",
                          platformBg[p.id] || "bg-gray-600"
                        )}
                        onClick={() => window.open(p.url, "_blank")}
                      >
                        <Ticket className="w-4 h-4" />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : hasRealPriceData ? (
                /* Show real price results from RapidAPI */
                <div className="divide-y divide-border">
                  {/* Booking.com results */}
                  {priceComparison!.sources?.booking?.results?.map((hotel: any, idx: number) => (
                    <div key={`booking-${hotel.id || idx}`}>
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                        onClick={() => setExpandedTier(expandedTier === `booking-${idx}` ? null : `booking-${idx}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={cn("text-xs", s <= (hotel.stars || 3) ? "text-amber-400" : "text-gray-600")}>★</span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{hotel.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              Booking.com
                              {hotel.rating && <span className="text-amber-500">★ {hotel.rating}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold">{hotel.price}</p>
                            <p className="text-xs text-muted-foreground">/malam</p>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedTier === `booking-${idx}` && "rotate-180")} />
                        </div>
                      </button>

                      {expandedTier === `booking-${idx}` && (
                        <div className="px-4 pb-3 space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">Pesan via platform:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {simpleUrls.map((p) => (
                              <button
                                key={p.id}
                                className={cn(
                                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-white text-sm font-medium transition-all active:scale-95",
                                  platformBg[p.id] || "bg-gray-600"
                                )}
                                onClick={() => window.open(p.url, "_blank")}
                              >
                                <Ticket className="w-4 h-4" />
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Agoda results */}
                  {priceComparison!.sources?.agoda?.results?.map((hotel: any, idx: number) => (
                    <div key={`agoda-${hotel.id || idx}`}>
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                        onClick={() => setExpandedTier(expandedTier === `agoda-${idx}` ? null : `agoda-${idx}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={cn("text-xs", s <= (hotel.stars || 3) ? "text-amber-400" : "text-gray-600")}>★</span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{hotel.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              Agoda
                              {hotel.rating && <span className="text-amber-500">★ {hotel.rating}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold">{hotel.price || "~Rp 700.000"}</p>
                            <p className="text-xs text-muted-foreground">/malam</p>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedTier === `agoda-${idx}` && "rotate-180")} />
                        </div>
                      </button>

                      {expandedTier === `agoda-${idx}` && (
                        <div className="px-4 pb-3 space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">Pesan via platform:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {simpleUrls.map((p) => (
                              <button
                                key={p.id}
                                className={cn(
                                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-white text-sm font-medium transition-all active:scale-95",
                                  platformBg[p.id] || "bg-gray-600"
                                )}
                                onClick={() => window.open(p.url, "_blank")}
                              >
                                <Ticket className="w-4 h-4" />
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* No price data or mock only: show booking platform buttons directly */
                <div className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {priceComparison ? "Harga estimasi — pilih platform untuk pesan:" : "Pilih platform untuk pesan:"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {simpleUrls.map((p) => (
                      <button
                        key={p.id}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-white text-sm font-medium transition-all active:scale-95",
                          platformBg[p.id] || "bg-gray-600"
                        )}
                        onClick={() => window.open(p.url, "_blank")}
                      >
                        <Ticket className="w-4 h-4" />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleOpenMaps}
              disabled={!item.location && !item.latitude}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Buka di Maps
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting || deleted}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : deleted ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              {deleted ? "Terhapus!" : deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}