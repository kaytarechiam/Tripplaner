import { motion } from "framer-motion"
import {
  MapPin, Plus, Search, Trash2, Share2,
  Heart, Calendar, GripVertical, MoreHorizontal, Plane,
  Mountain, Building, Utensils, Camera, ChevronRight,
  Loader2, X
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { getBucketList, addBucketListItem, supabase } from "../lib/supabase"
import type { BucketListItem } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

const categories = [
  { id: "all", label: "Semua", icon: MapPin },
  { id: "beach", label: "Pantai", icon: Building },
  { id: "mountain", label: "Gunung", icon: Mountain },
  { id: "food", label: "Kuliner", icon: Utensils },
  { id: "culture", label: "Budaya", icon: Camera },
]

const priorityColors = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

// ─── Add Place Modal ────────────────────────────────
function AddPlaceModal({ onAdded, triggerRef }: { onAdded: () => void; triggerRef?: React.RefObject<HTMLButtonElement> }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    place_name: "",
    country: "",
    priority: "medium" as "low" | "medium" | "high",
    notes: "",
  })

  const [internalOpen, setInternalOpen] = useState(false)
  const open = internalOpen
  const setOpen = setInternalOpen

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.place_name.trim() || !form.country.trim()) {
      setError("Nama tempat dan negara wajib diisi.")
      return
    }
    setError("")
    setIsLoading(true)
    try {
      await addBucketListItem({
        place_name: form.place_name.trim(),
        country: form.country.trim(),
        priority: form.priority,
        notes: form.notes.trim() || undefined,
      })
      setOpen(false)
      setForm({ place_name: "", country: "", priority: "medium", notes: "" })
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm" ref={triggerRef}>
          <Plus className="w-4 h-4 mr-1" />
          Tambah Tempat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah ke Bucket List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
          <div className="space-y-2">
            <Label>Nama Tempat</Label>
            <Input
              placeholder="Contoh: Kyoto, Jepang"
              value={form.place_name}
              onChange={e => setForm(f => ({ ...f, place_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Negara</Label>
            <Input
              placeholder="Contoh: Jepang"
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Prioritas</Label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                    form.priority === p
                      ? p === "high" ? "bg-red-500 text-white"
                        : p === "medium" ? "bg-amber-500 text-white"
                        : "bg-gray-500 text-white"
                      : "bg-secondary"
                  )}
                >
                  {p === "high" ? "🔥 Tinggi" : p === "medium" ? "📍 Medium" : "💤 Rendah"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Input
              placeholder="Tips atau catatan..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menambahkan...</> : <><Plus className="w-4 h-4 mr-2" />Tambah</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface BucketListProps {
  setCurrentPage: (page: Page) => void
}

export function BucketList({ setCurrentPage }: BucketListProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [realItems, setRealItems] = useState<BucketListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const addModalTriggerRef = useRef<HTMLButtonElement>(null)

  const loadItems = () => {
    setLoading(true)
    setError("")
    getBucketList()
      .then(data => {
        setRealItems(data)
      })
      .catch(err => {
        setRealItems([])
        setError(err instanceof Error ? err.message : "")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadItems() }, [])

  // Map real items to display format
  const realDisplay = realItems.map((item, i) => ({
    id: item.id,
    name: item.place_name,
    country: item.country,
    category: "all",
    priority: item.priority,
    notes: item.notes || "",
    addedAt: new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    gradient: [
      "from-rose-400 to-pink-500", "from-cyan-400 to-blue-500",
      "from-violet-400 to-purple-600", "from-amber-400 to-orange-500",
      "from-emerald-400 to-teal-500", "from-pink-400 to-rose-500",
    ][i % 6],
  }))

  const displayPlaces = realDisplay

  const filteredPlaces = displayPlaces.filter((place: any) => {
    const matchesCategory = selectedCategory === "all" || place.category === selectedCategory
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          place.country.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const removePlace = async (id: string) => {
    try {
      if (supabase) {
        await supabase.from('bucket_list').delete().eq('id', id)
      }
      setRealItems(prev => prev.filter(p => p.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="pt-16 min-h-screen">
      {/* Page header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            Bucket List
            {realItems.length > 0 && (
              <span className="text-base font-normal text-muted-foreground">({realItems.length})</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Destinasi impianmu yang belum terwujud</p>
        </div>
        <AddPlaceModal onAdded={loadItems} triggerRef={addModalTriggerRef} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { value: displayPlaces.length, label: "Total Tempat", color: "gradient-text" },
              { value: displayPlaces.filter((p: any) => p.priority === "high").length, label: "🔥 Priority Tinggi", color: "text-red-400" },
              { value: new Set(displayPlaces.map((p: any) => p.country)).size, label: "Negara", color: "text-ocean-500" },
              { value: 0, label: "Sudah Dikunjungi", color: "text-emerald-400" },
            ].map((stat, i) => (
              <div key={i}>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Search & Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Cari tempat di bucket list..."
              className="pl-12 h-12"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === cat.id
                      ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-lg"
                      : "glass-card hover:bg-white/20"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Places List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPlaces.map((place: any, i: number) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover p-4 flex items-center gap-4 group"
              >
                <button className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${place.gradient} flex items-center justify-center shrink-0`}>
                  <MapPin className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{place.name}</h3>
                    <Badge className={cn("text-[10px]", priorityColors[place.priority as keyof typeof priorityColors])}>
                      {place.priority === "high" ? "🔥 Tinggi" : place.priority === "medium" ? "📍 Medium" : "💤 Rendah"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Plane className="w-3 h-3" />
                    {place.country}
                  </p>
                  {place.notes && (
                    <p className="text-sm text-muted-foreground/70 mt-1">💬 {place.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Ditambahkan {place.addedAt}</p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon">
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removePlace(place.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                  <Button variant="gradient" size="sm">
                    <Plane className="w-4 h-4 mr-1" />
                    Buat Trip
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredPlaces.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Belum ada tempat</h3>
            <p className="text-muted-foreground mb-4">Tambahkan destinasi impianmu ke bucket list</p>
            <Button variant="gradient" onClick={() => addModalTriggerRef.current?.click()}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Tempat
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}