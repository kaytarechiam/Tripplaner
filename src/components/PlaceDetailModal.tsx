import {
  MapPin, Clock, Edit3, Trash2, ExternalLink,
  Utensils, TreePine, Camera, Landmark, ShoppingBag, Hotel, Navigation,
  Loader2, Check, Ticket

} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ItineraryItem } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

const categoryConfig: Record<string, { icon: typeof MapPin; label: string; color: string }> = {
  hotel: { icon: Hotel, label: "Hotel", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  landmark: { icon: Landmark, label: "Landmark", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  food: { icon: Utensils, label: "Kuliner", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  nature: { icon: TreePine, label: "Alam", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  activity: { icon: Camera, label: "Aktivitas", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  shopping: { icon: ShoppingBag, label: "Belanja", color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30" },
  transport: { icon: Navigation, label: "Transport", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
}

interface PlaceDetailModalProps {
  item: ItineraryItem | null
  onClose: () => void
  onDeleted?: () => void
}

export function PlaceDetailModal({ item, onClose, onDeleted }: PlaceDetailModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  if (!item) return null

  const config = categoryConfig[item.category] || categoryConfig.landmark
  const Icon = config.icon

  const handleDelete = async () => {
    if (!item || deleting) return
    setDeleting(true)
    try {
      await supabase!.from("itinerary_items").delete().eq("id", item.id)
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
    if (item.latitude && item.longitude) {
      window.open(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`, "_blank")
    } else if (item.location) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`, "_blank")
    }
  }

  // Platform deep link config - based on category support
  const getBookingPlatforms = () => {
    if (!item.location && !item.title) return []
    const query = encodeURIComponent(item.location || item.title)
    const category = item.category?.toLowerCase() || "activity"
    const title = item.title?.toLowerCase() || ""

    const platforms: Array<{ id: string; name: string; url: string; color: string; icon: any }> = []

    // Hotel - all platforms support
    if (category === "hotel") {
      platforms.push(
        { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/hotels/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700", icon: Ticket },
        { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=hotel`, color: "bg-[#f97316] hover:bg-[#ea580c]", icon: Ticket },
        { id: "agoda", name: "Agoda", url: `https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?city=${query}`, color: "bg-[#dd1f39] hover:bg-[#b71c1c]", icon: Ticket },
        { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${query}`, color: "bg-[#003580] hover:bg-[#00224f]", icon: Ticket }
      )
    }
    // Flight
    else if (category === "transport" && (title.includes("flight") || title.includes("penerbangan") || title.includes("pesawat") || title.includes("plane") || title.includes("bandara"))) {
      platforms.push(
        { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/flights/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700", icon: Ticket },
        { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=flight`, color: "bg-[#f97316] hover:bg-[#ea580c]", icon: Ticket }
      )
    }
    // Train/Bus
    else if (category === "transport" && (title.includes("kereta") || title.includes("train") || title.includes("bus") || title.includes("sta") || title.includes("terminal"))) {
      platforms.push(
        { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/trains/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700", icon: Ticket },
        { id: "tiket", name: "Tiket.com", url: `https://www.tiket.com/search?query=${query}&type=train`, color: "bg-[#f97316] hover:bg-[#ea580c]", icon: Ticket }
      )
    }
    // Restaurant - Booking.com has some restaurant listings
    else if (category === "food") {
      platforms.push(
        { id: "booking", name: "Booking.com", url: `https://www.booking.com/search.html?ss=${query}&dest_type=city`, color: "bg-[#003580] hover:bg-[#00224f]", icon: Ticket },
        { id: "traveloka", name: "Traveloka", url: `https://www.traveloka.com/en/restaurants/search?query=${query}`, color: "bg-blue-600 hover:bg-blue-700", icon: Ticket }
      )
    }
    // Other categories (landmark, nature, activity, shopping) - no direct booking
    // Return empty array, buttons won't be shown

    return platforms
  }

  const bookingPlatforms = getBookingPlatforms()

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
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

          {/* Booking Platforms */}
          {bookingPlatforms.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground font-medium px-2">Pesan di</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {bookingPlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => window.open(platform.url, "_blank")}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-medium transition-all active:scale-95",
                      platform.color
                    )}
                  >
                    <Ticket className="w-4 h-4 shrink-0" />
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Tips */}
          {item.notes && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-600 mb-1">💡 Catatan AI</p>
              <p className="text-sm text-amber-700">{item.notes}</p>
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