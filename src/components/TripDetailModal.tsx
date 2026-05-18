import { useState } from "react"
import {
  MapPin, Calendar, Clock, Users, Star, Heart,
  Share2, Copy, ExternalLink, Loader2, Check,
  Plane, Globe, MessageSquare, X
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { createTrip, addItineraryItem } from "@/lib/supabase"

interface PublicTrip {
  id: string
  trip_id: string
  name: string
  destination: string
  start_date: string | null
  end_date: string | null
  status: string
  days: number
  places: number
  likes: number
  comments: number
  rating: number
  gradient: string
  tags: string[]
  author: string
  authorAvatar: string
}

interface TripDetailModalProps {
  trip: PublicTrip | null
  onClose: () => void
  onCopied?: () => void
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Belum diatur"
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function getDuration(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start + "T00:00:00").getTime()
  const e = new Date(end + "T00:00:00").getTime()
  return Math.max(1, Math.round((e - s) / 86400000) + 1)
}

export function TripDetailModal({ trip, onClose, onCopied }: TripDetailModalProps) {
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [error, setError] = useState("")

  if (!trip) return null

  const duration = getDuration(trip.start_date, trip.end_date)

  const handleLike = async () => {
    if (!supabase) return
    try {
      const { getSession } = await import("@/lib/supabase")
      const session = await getSession()
      const userId = session?.user?.id
      if (!userId) return

      await supabase.from("bucket_list").upsert({
        user_id: userId,
        trip_id: trip.id,
        trip_name: trip.name,
        destination: trip.destination,
        created_at: new Date().toISOString(),
      })
      setLiked(true)
    } catch (err) {
      console.error("Like error:", err)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/explore?trip=${trip.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.name, text: `Check out this trip: ${trip.name}`, url })
      } catch {
        // User cancelled or not supported
      }
    } else {
      await navigator.clipboard.writeText(url)
      // Show toast-like feedback
      const btn = document.getElementById("share-btn")
      if (btn) {
        btn.textContent = "Copied!"
        setTimeout(() => { btn.textContent = "Share" }, 2000)
      }
    }
  }

  const handleCopyToMyTrips = async () => {
    if (!startDate) {
      setError("Pilih tanggal mulai dulu")
      return
    }
    if (!supabase) return

    setCopyLoading(true)
    setError("")
    try {
      const { getSession } = await import("@/lib/supabase")
      const session = await getSession()
      const userId = session?.user?.id
      if (!userId) {
        setError("Login dulu untuk menyalin trip")
        setCopyLoading(false)
        return
      }

      // Calculate end date
      let endDate = ""
      if (trip.days > 0) {
        const start = new Date(startDate + "T00:00:00")
        const end = new Date(start.getTime() + (trip.days - 1) * 86400000)
        endDate = end.toISOString().split("T")[0]
      }

      // Create new trip
      const newTrip = await createTrip({
        name: trip.name,
        destination: trip.destination,
        start_date: startDate,
        end_date: endDate || undefined,
        status: "planning",
      })

      setCopied(true)
      setTimeout(() => {
        onCopied?.()
        onClose()
      }, 1200)
    } catch (err) {
      console.error("Copy trip error:", err)
      setError("Gagal menyalin trip. Coba lagi.")
    } finally {
      setCopyLoading(false)
    }
  }

  return (
    <Dialog open={!!trip} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Cover Image */}
          <div className={cn("aspect-video rounded-xl bg-gradient-to-br -mx-6 -mt-6 mb-4 relative overflow-hidden", trip.gradient)}>
            <div className="absolute inset-0 bg-black/20" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="glass-card px-2 py-1 text-xs text-white flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {trip.days} hari
              </span>
              {trip.places > 0 && (
                <span className="glass-card px-2 py-1 text-xs text-white flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {trip.places} tempat
                </span>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="mb-2">{trip.status}</Badge>
              <DialogTitle className="text-xl">{trip.name}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-bold">{trip.rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center text-white text-xs font-bold">
              {trip.authorAvatar}
            </div>
            <span className="text-sm text-muted-foreground">by @{trip.author}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">Durasi</p>
              <p className="font-bold">{duration > 0 ? `${duration} hari` : `${trip.days} hari`}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">Like</p>
              <p className="font-bold flex items-center justify-center gap-1">
                <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                {trip.likes}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">Komentar</p>
              <p className="font-bold flex items-center justify-center gap-1">
                <MessageSquare className="w-3 h-3 text-blue-400" />
                {trip.comments}
              </p>
            </div>
          </div>

          {/* Tags */}
          {trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trip.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-secondary/60 rounded-full text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Date info */}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                </p>
              </div>
            </div>
          )}

          {/* Date Picker for Copy */}
          {showDatePicker ? (
            <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-[var(--aurora-start)]/5 to-[var(--aurora-end)]/5 border border-[var(--aurora-start)]/20">
              <Label>Pilih Tanggal Mulai Trip</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setError("") }}
                className="w-full"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDatePicker(false)}>
                  Batal
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopyToMyTrips}
                  disabled={copyLoading}
                >
                  {copyLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Berhasil disalin!" : copyLoading ? "Menyalin..." : "Konfirmasi"}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleLike}
            >
              <Heart className={cn("w-4 h-4 mr-1", liked && "fill-red-500 text-red-500")} />
              {liked ? "Disimpan" : "Simpan"}
            </Button>
            <Button
              id="share-btn"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            {!showDatePicker && (
              <Button
                variant="gradient"
                size="sm"
                className="flex-1"
                onClick={() => setShowDatePicker(true)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Salin ke Trip Saya
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}