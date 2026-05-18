import { useState, useEffect } from "react"
import {
  Bell, Plus, Clock, Trash2, Check,
  ChevronDown, ChevronRight, Loader2, Repeat
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

type Reminder = {
  id: string
  trip_id: string
  title: string
  remind_at: string
  repeat: "none" | "daily" | "weekly"
  completed: boolean
  created_at: string
}

interface ReminderPanelProps {
  tripId: string | null
  className?: string
}

const REPEAT_OPTIONS = [
  { value: "none", label: "Sekali" },
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
] as const

function formatRemindAt(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffH = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (diffMs < 0) return "Lewat"
  if (diffH < 1) return "Sekarang"
  if (diffH < 24) return `${diffH} jam lagi`
  if (diffDays === 1) return "Besok"
  if (diffDays < 7) return `${diffDays} hari lagi`
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
}

export function ReminderPanel({ tripId, className }: ReminderPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formTime, setFormTime] = useState("09:00")
  const [formRepeat, setFormRepeat] = useState<"none" | "daily" | "weekly">("none")
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const load = async () => {
    if (!tripId || !supabase) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from("reminders")
        .select("*")
        .eq("trip_id", tripId)
        .order("remind_at", { ascending: true })
      setReminders(data || [])
    } catch {
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tripId])

  const handleAdd = async () => {
    if (!formTitle.trim() || !formDate || !tripId || !supabase) return
    setSaving(true)
    try {
      const remindAt = new Date(`${formDate}T${formTime}:00`).toISOString()
      const { data } = await supabase
        .from("reminders")
        .insert({
          trip_id: tripId,
          title: formTitle.trim(),
          remind_at: remindAt,
          repeat: formRepeat,
          completed: false,
        })
        .select()
        .single()
      if (data) {
        setReminders(prev => [...prev, data as Reminder].sort(
          (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
        ))
      }
      setFormTitle("")
      setFormDate("")
      setFormTime("09:00")
      setFormRepeat("none")
      setShowForm(false)
    } catch (err) {
      console.error("Add reminder error:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (reminder: Reminder) => {
    const updated = !reminder.completed
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, completed: updated } : r))
    if (!supabase) return
    try {
      await supabase.from("reminders").update({ completed: updated }).eq("id", reminder.id)
    } catch {
      // Revert on error
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, completed: !updated } : r))
    }
  }

  const handleDelete = async (reminder: Reminder) => {
    setReminders(prev => prev.filter(r => r.id !== reminder.id))
    if (!supabase) return
    try {
      await supabase.from("reminders").delete().eq("id", reminder.id)
    } catch {
      load()
    }
  }

  const upcomingReminders = reminders.filter(r => !r.completed)
  const completedReminders = reminders.filter(r => r.completed)

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(s => !s)}
        className="w-full flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Bell className="w-4 h-4" />
        Pengingat
        {upcomingReminders.length > 0 && (
          <Badge className="ml-auto text-xs" variant="aurora">{upcomingReminders.length}</Badge>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pl-6">
              {/* Loading */}
              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--aurora-start)]" />
                </div>
              )}

              {/* Empty */}
              {!loading && reminders.length === 0 && !showForm && (
                <div className="text-center py-3">
                  <p className="text-xs text-muted-foreground mb-2">Belum ada pengingat</p>
                </div>
              )}

              {/* Upcoming Reminders */}
              {!loading && upcomingReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-start gap-2 p-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <button
                    onClick={() => handleToggle(reminder)}
                    className="w-5 h-5 rounded-full border-2 border-[var(--aurora-start)] shrink-0 mt-0.5 flex items-center justify-center hover:bg-[var(--aurora-start)]/10 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{reminder.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatRemindAt(reminder.remind_at)}</span>
                      {reminder.repeat !== "none" && (
                        <Repeat className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(reminder)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}

              {/* Completed */}
              {!loading && completedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-start gap-2 p-2 rounded-xl bg-secondary/10 opacity-50 group"
                >
                  <button
                    onClick={() => handleToggle(reminder)}
                    className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-500 shrink-0 mt-0.5 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight line-through">{reminder.title}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(reminder)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}

              {/* Add Form */}
              {showForm ? (
                <div className="space-y-2 p-3 rounded-xl bg-gradient-to-br from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10 border border-[var(--aurora-start)]/20">
                  <Input
                    placeholder="Judul pengingat..."
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="h-9 text-sm flex-1"
                    />
                    <Input
                      type="time"
                      value={formTime}
                      onChange={e => setFormTime(e.target.value)}
                      className="h-9 text-sm w-24"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {REPEAT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFormRepeat(opt.value)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                          formRepeat === opt.value
                            ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white border-transparent"
                            : "border-border hover:border-[var(--aurora-start)]/30 bg-white/5"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowForm(false)}>
                      Batal
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={handleAdd}
                      disabled={saving || !formTitle.trim() || !formDate}
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs justify-start text-muted-foreground hover:text-foreground"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Tambah pengingat
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}