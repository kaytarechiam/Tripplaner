// src/components/TripDetailModal.tsx
import { useState, useEffect } from "react"
import {
  MapPin, Calendar, Star, Copy,
  Share2, Loader2, Check,
  MessageSquare, X, Send, Heart
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { supabase, getComments, addComment, copyTripFull } from "@/lib/supabase"
import type { TripComment } from "@/lib/supabase"

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
  image?: string
}

interface TripDetailModalProps {
  trip: PublicTrip | null
  onClose: () => void
  onCopied?: () => void
}

const CATEGORY_ICONS: Record<string, string> = {
  // Frontend values
  hotel: "🏨", landmark: "🏛️", food: "🍜",
  nature: "🌿", activity: "🎯", shopping: "🛍️", transport: "🚗",
  // DB allowed values
  accommodation: "🏨", attraction: "🏛️",
}

export function TripDetailModal({ trip, onClose, onCopied }: TripDetailModalProps) {
  const [copied, setCopied] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [error, setError] = useState("")
  const [itinerary, setItinerary] = useState<any[]>([])
  const [comments, setComments] = useState<TripComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"itinerary" | "comments">("itinerary")
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    if (!trip || !supabase) return
    setCopied(false)
    setSaved(false)
    setStartDate("")
    setError("")
    setShowDatePicker(false)

    // Load itinerary items — use actual DB column names
    supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', trip.id)
      .order('day_number', { ascending: true })
      .order('order', { ascending: true })
      .then(({ data }) => setItinerary(data || []))

    // Load comments
    getComments(trip.id).then(setComments)

    // Check if already saved (mock trips have null original_trip_id, matched by name)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const isMock = trip.id.startsWith('mock-')
      const query = supabase!.from('saved_trips').select('id').eq('user_id', user.id)
      const filtered = isMock
        ? query.is('original_trip_id', null).eq('name', trip.name)
        : query.eq('original_trip_id', trip.id)
      filtered.maybeSingle().then(({ data }) => { if (data) setSaved(true) })
    })
  }, [trip?.id])

  if (!trip) return null

  const handleShare = async () => {
    const url = `${window.location.origin}/explore?trip=${trip.id}`
    if (navigator.share) {
      try { await navigator.share({ title: trip.name, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  // Simpan = bookmark to Disimpan tab (saved_trips)
  // Mock trips use original_trip_id = null, identified by name+user_id
  const handleSimpan = async () => {
    if (!supabase) return
    setSaveLoading(true)
    setError("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Login dulu untuk menyimpan trip"); return }

      const isMock = trip.id.startsWith('mock-')

      if (saved) {
        // Unsave
        if (isMock) {
          await supabase.from('saved_trips')
            .delete()
            .eq('user_id', user.id)
            .is('original_trip_id', null)
            .eq('name', trip.name)
        } else {
          await supabase.from('saved_trips')
            .delete()
            .eq('user_id', user.id)
            .eq('original_trip_id', trip.id)
        }
        setSaved(false)
      } else {
        if (isMock) {
          // Check for existing save first (prevent duplicates)
          const { data: existing } = await supabase.from('saved_trips')
            .select('id')
            .eq('user_id', user.id)
            .is('original_trip_id', null)
            .eq('name', trip.name)
            .maybeSingle()

          if (!existing) {
            await supabase.from('saved_trips').insert({
              user_id: user.id,
              original_trip_id: null,
              name: trip.name,
              destination: trip.destination,
              days: trip.days,
              tags: trip.tags,
            })
          }
        } else {
          await supabase.from('saved_trips').upsert({
            user_id: user.id,
            original_trip_id: trip.id,
            name: trip.name,
            destination: trip.destination,
            days: trip.days,
            tags: trip.tags,
          }, { onConflict: 'user_id,original_trip_id' })
        }
        setSaved(true)
      }
    } catch (err: unknown) {
      console.error("Simpan error:", err)
      setError("Gagal menyimpan. Coba lagi.")
    } finally {
      setSaveLoading(false)
    }
  }

  // Salin = full copy — creates a new real trip in user's trips
  const handleCopyToMyTrips = async () => {
    if (!startDate) { setError("Pilih tanggal mulai dulu"); return }
    if (!supabase) { setError("Supabase tidak dikonfigurasi"); return }
    if (trip.id.startsWith('mock-')) {
      // Mock trips are demo data — copy as a blank trip template
      setCopyLoading(true)
      setError("")
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { setError("Sesi kadaluarsa. Silakan login ulang."); return }
        // Create blank trip from mock template (no itinerary items to copy)
        const start = new Date(startDate + 'T00:00:00')
        const end = new Date(start.getTime() + (trip.days - 1) * 86400000)
        const endDate = end.toISOString().split('T')[0]
        const { data: newTrip, error: tripErr } = await supabase.from('trips').insert({
          owner_id: user.id,
          title: `[Template] ${trip.name}`,
          destination: trip.destination,
          start_date: startDate,
          end_date: endDate,
          status: 'planning',
          is_public: false,
          tags: trip.tags || [],
        }).select().single()
        if (tripErr) throw tripErr
        // Auto-add owner to trip_members
        await supabase.from('trip_members').upsert({
          trip_id: newTrip.id, user_id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner',
          email: user.email || '', role: 'owner', status: 'accepted', invited_by: user.id,
        }, { onConflict: 'trip_id,user_id' })
        setCopied(true)
        setTimeout(() => { onCopied?.(); onClose() }, 1200)
      } catch (err: unknown) {
        console.error("Copy mock trip error:", err)
        setError(err instanceof Error ? err.message : "Gagal membuat trip. Coba lagi.")
      } finally {
        setCopyLoading(false)
      }
      return
    }
    setCopyLoading(true)
    setError("")
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError("Sesi kadaluarsa. Silakan login ulang.")
        setCopyLoading(false)
        return
      }

      // Copy full trip (creates entry in trips table + copies itinerary items)
      await copyTripFull(trip.id, startDate, trip.days, trip.name, trip.destination)

      setCopied(true)
      setTimeout(() => { onCopied?.(); onClose() }, 1200)
    } catch (err: unknown) {
      console.error("Copy trip error:", err)
      const msg = err instanceof Error
        ? err.message
        : (err as any)?.message || (err as any)?.details || "Gagal menyalin trip. Coba lagi."
      setError(msg)
    } finally {
      setCopyLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !supabase) return
    // Mock trips have no real DB entry — can't save comments
    if (trip.id.startsWith('mock-')) {
      setError("Trip ini adalah contoh dan tidak mendukung komentar.")
      return
    }
    setCommentLoading(true)
    setError("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Login dulu untuk berkomentar")
        return
      }
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"
      const comment = await addComment(trip.id, newComment.trim(), name)
      setComments(prev => [...prev, comment])
      setNewComment("")
    } catch (err: unknown) {
      console.error("Comment error:", err)
      const msg = err instanceof Error
        ? err.message
        : (err as any)?.message || "Gagal mengirim komentar. Coba lagi."
      setError(msg)
    } finally {
      setCommentLoading(false)
    }
  }

  // Group itinerary by day_number (actual DB column)
  const dayGroups = itinerary.reduce((acc, item) => {
    const d = item.day_number || 1
    if (!acc[d]) acc[d] = []
    acc[d].push(item)
    return acc
  }, {} as Record<number, any[]>)

  return (
    <Dialog open={!!trip} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Cover */}
          <div className={cn(
            "aspect-video rounded-xl -mx-6 -mt-6 mb-4 relative overflow-hidden",
            `bg-gradient-to-br ${trip.gradient}`
          )}>
            {/* Image overlays gradient */}
            {trip.image && (
              <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none" }} />
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-3 left-3 flex gap-2">
              <span className="glass-card px-2 py-1 text-xs text-black flex items-center gap-1">
                <Calendar className="w-3 h-3 text-black" />
                {trip.days} hari
              </span>
            </div>
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
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
          <p className="text-sm text-muted-foreground">oleh @{trip.author}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tags */}
          {trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trip.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-secondary/60 rounded-full text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl">
            {(["itinerary", "comments"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                {tab === "itinerary" ? "📍 Itinerary" : `💬 Komentar (${comments.length})`}
              </button>
            ))}
          </div>

          {/* Itinerary Tab */}
          {activeTab === "itinerary" && (
            <div className="space-y-3">
              {Object.keys(dayGroups).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada itinerary detail untuk trip ini.
                </p>
              ) : (
                Object.entries(dayGroups).map(([day, items]) => (
                  <div key={day} className="space-y-2">
                    <h4 className="text-sm font-bold text-muted-foreground">Hari {day}</h4>
                    {(items as any[]).map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-secondary/30 rounded-xl">
                        <span className="text-lg">{CATEGORY_ICONS[item.category] || "📌"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.name || item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.time} · {item.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada komentar. Jadilah yang pertama!
                </p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3 p-3 bg-secondary/30 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(c.author_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{c.author_name || "User"}</p>
                      <p className="text-sm">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
              {/* Add comment */}
              {supabase && (
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Tambah komentar..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                    className="text-sm"
                  />
                  <Button size="sm" variant="gradient" onClick={handleAddComment} disabled={commentLoading}>
                    {commentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Date Picker for Copy */}
          {showDatePicker && (
            <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-[var(--aurora-start)]/5 to-[var(--aurora-end)]/5 border border-[var(--aurora-start)]/20">
              <Label>Pilih Tanggal Mulai Trip</Label>
              <Input type="date" value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => { setStartDate(e.target.value); setError("") }} />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => setShowDatePicker(false)}>Batal</Button>
                <Button variant="gradient" size="sm" className="flex-1"
                  onClick={handleCopyToMyTrips} disabled={copyLoading}>
                  {copyLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> :
                    copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Berhasil!" : copyLoading ? "Menyalin..." : "Konfirmasi"}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons — Share + Simpan (bookmark) + Salin (full copy) */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            {supabase && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimpan}
                disabled={saveLoading}
                className={cn(saved && "border-red-400 text-red-500 hover:bg-red-50")}
              >
                {saveLoading
                  ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  : <Heart className={cn("w-4 h-4 mr-1", saved && "fill-red-500 text-red-500")} />
                }
                {saved ? "Disimpan" : "Simpan"}
              </Button>
            )}
            {!showDatePicker && (
              <Button variant="gradient" size="sm" className="flex-1"
                onClick={() => setShowDatePicker(true)}>
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
