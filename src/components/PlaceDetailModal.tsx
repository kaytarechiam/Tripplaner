import {
  MapPin, Clock, Edit3, Trash2, ExternalLink,
  Utensils, TreePine, Camera, Landmark, ShoppingBag, Hotel, Navigation,
  Loader2, Check, Ticket, Zap, TrendingUp
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

  const getBookingLinks = () => {
    if (!item.location && !item.title) return null
    const query = encodeURIComponent(item.location || item.title)
    const searchQuery = encodeURIComponent(`${item.title} ${item.location || ''}`)
    const isHotel = item.category === 'hotel'
    const isFlight = item.title.toLowerCase().includes('flight') || item.title.toLowerCase().includes('plane') || item.title.toLowerCase().includes('penerbangan')

    return {
      traveloka: isFlight
        ? `https://www.traveloka.com/en/flights/search?query=${query}`
        : isHotel
        ? `https://www.traveloka.com/en/hotels/search?query=${query}`
        : `https://www.traveloka.com/en/flights/search?query=${query}`,
      tiket: isFlight
        ? `https://www.tiket.com/search?query=${query}&type=flight`
        : isHotel
        ? `https://www.tiket.com/search?query=${query}&type=hotel`
        : `https://www.tiket.com/search?query=${query}`,
      booking: `https://www.booking.com/search.html?ss=${query}`,
    }
  }

  const bookingLinks = getBookingLinks()

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

          {/* Notes / Tips */}
          {item.notes && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-600 mb-1">💡 Catatan AI</p>
              <p className="text-sm text-amber-700">{item.notes}</p>
            </div>
          )}

          {/* Hotel Options */}
          {bookingLinks && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-2.5 border-b border-border flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Pilih Opsi Penginapan</span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "Budget", icon: Hotel, price: "~Rp 150-350rb", tag: "⭐⭐", color: "text-green-400" },
                  { label: "Mid-Range", icon: Hotel, price: "~Rp 350-800rb", tag: "⭐⭐⭐", color: "text-amber-400" },
                  { label: "Premium", icon: Hotel, price: "~Rp 800rb+", tag: "⭐⭐⭐⭐⭐", color: "text-blue-400" },
                ].map((opt) => {
                  const q = encodeURIComponent(`${opt.label} hotel ${item.location || item.title}`)
                  return (
                    <button
                      key={opt.label}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                      onClick={() => window.open(`https://www.traveloka.com/en/hotels/search?query=${q}`, "_blank")}
                    >
                      <div className="flex items-center gap-3">
                        <opt.icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className={`text-xs ${opt.color}`}>{opt.tag}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{opt.price}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Booking Actions */}
          {bookingLinks && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Pesan Sekarang
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => window.open(bookingLinks.traveloka, "_blank")}
                >
                  <Ticket className="w-4 h-4 mr-1" />
                  Traveloka
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(bookingLinks.tiket, "_blank")}
                >
                  <Ticket className="w-4 h-4 mr-1" />
                  Tiket.com
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs"
                onClick={() => window.open(bookingLinks.booking, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Atau pesan via Booking.com
              </Button>
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