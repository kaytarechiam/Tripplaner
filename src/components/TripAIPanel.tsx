import { motion, AnimatePresence } from "framer-motion"
import {
  X, Send, Sparkles, CheckCheck, ArrowRight,
  MapPin, Clock, RotateCcw, Lightbulb, ChevronDown,
  MessageSquare, Loader2
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { cn, formatCurrency } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"
import { updateItineraryItem, deleteItineraryItem, addItineraryItem } from "../lib/supabase"
import type { Trip, ItineraryItem, AISuggestion, AIChatMessage, ItineraryChange } from "../lib/ai-types"
import { changeGetItemId } from "../lib/ai-types"
import { apiFetch } from "../lib/api"

interface TripAIPanelProps {
  open: boolean
  onClose: () => void
  trip: Trip
  itineraryItems: ItineraryItem[]
  onItemsChanged: () => void
  currentDay?: number
  onRequestAdd?: (prefill: { name: string; day: number; time: string; location?: string; category?: string; notes?: string }) => void
}

interface ChatBubble {
  id: string
  role: "user" | "assistant"
  text: string
  timestamp: number
  suggestions?: AISuggestion[]
  appliedIds?: string[]
  rejectedIds?: string[]
  appliedActions?: number  // count of AI actions applied
}

const DAY_COLORS = [
  "#f97316", "#0ea5e9", "#10b981", "#8b5cf6",
  "#f59e0b", "#ec4899", "#14b8a6"
]

const DAY_COLORS_LIGHT = [
  "rgba(249,115,22,0.12)", "rgba(14,165,233,0.12)", "rgba(16,185,129,0.12)", "rgba(139,92,246,0.12)",
  "rgba(245,158,11,0.12)", "rgba(236,72,153,0.12)", "rgba(20,184,166,0.12)"
]

// Build trip context from current itinerary
function buildTripContext(items: ItineraryItem[], trip: Trip): string {
  const grouped = items.reduce<Record<number, ItineraryItem[]>>((acc, item) => {
    if (!acc[item.day]) acc[item.day] = []
    acc[item.day].push(item)
    return acc
  }, {})

  let ctx = `${trip.name} — ${trip.destination}\n`
  Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(day => {
      ctx += `\nHari ${day}:\n`
      grouped[Number(day)].forEach(item => {
        ctx += `  ${item.time} — ${item.title} (${item.category})\n`
      })
    })
  return ctx
}

// Parse AI response text to extract structured suggestions
function parseAIResponse(
  text: string,
  items: ItineraryItem[],
  tripId: string
): AISuggestion[] {
  const suggestions: AISuggestion[] = []

  // Look for numbered patterns like "1. Ubah waktu X ke Y"
  const lines = text.split('\n').filter(l => l.match(/^\d+[.)]/))
  lines.forEach((line, i) => {
    const match = line.match(/^(\d+)[.)]\s*(.+)/i)
    if (match) {
      const [, num, desc] = match
      const suggestion: AISuggestion = {
        id: `sug-${Date.now()}-${i}`,
        change: {
          type: 'reorder',
          itemId: items[i % items.length]?.id || '',
          newIndex: i,
        },
        reason: desc,
        beforeLabel: items[i % items.length]?.title || 'Item',
        afterLabel: desc.split(' → ')[1] || desc,
        confidence: 0.8,
      }
      suggestions.push(suggestion)
    }
  })

  // Fallback: single suggestion from full text if no numbered items found
  if (suggestions.length === 0 && text.length > 10) {
    suggestions.push({
      id: `sug-${Date.now()}-0`,
      change: { type: 'reorder', itemId: items[0]?.id || '', newIndex: 0 },
      reason: text.substring(0, 120),
      beforeLabel: items[0]?.title || 'Item',
      afterLabel: 'Perbaikan itinerary',
      confidence: 0.7,
    })
  }

  return suggestions
}

// Generate AI prompt from user question + current itinerary
function buildAIPrompt(userText: string, items: ItineraryItem[], trip: Trip): string {
  const context = buildTripContext(items, trip)
  return `Kamu adalah TripAI — asisten perjalanan yang membantu mengoptimalkan itinerary.

ITINERARY SAAT INI:
${context}

PETANYAAN USER:
${userText}

Tugas kamu:
1. Baca itinerary saat ini
2. Berikan saran konkret berdasarkan pertanyaan
3. Tulis saran dalam format:
   1. [Judul saran singkat]
   2. [Judul saran singkat]
   dst.

Contoh:
User: "Saya mau trip 3 hari di Bali yang lebih efisien"
AI:
1. Pindahkan makan siang ke lokasi yang lebih dekat dengan itinerary pagi
2. Tambahkan waktu buffer 30 menit antar destinasi
3. Pertimbangkan menggabungkan hari 1 dan 2 untuk lokasi yang berdekatan

Jadi?`
}

// Apply a single suggestion to the database
async function applySuggestion(
  suggestion: AISuggestion,
  tripId: string,
  items: ItineraryItem[],
  onDone: () => void
): Promise<void> {
  const { change } = suggestion

  try {
    // Handle 'add' before the itemId lookup (add has no existing itemId)
    if (change.type === 'add') {
      await addItineraryItem({ ...change.item, trip_id: tripId })
      onDone()
      return
    }

    const itemId = changeGetItemId(change)
    const item = itemId ? items.find(i => i.id === itemId) : undefined
    if (!itemId) return

    if (change.type === 'delete') {
      await deleteItineraryItem(itemId)
    } else if (change.type === 'update_time' && item) {
      await updateItineraryItem(item.id, { time: change.newTime })
    } else if (change.type === 'update_category' && item) {
      await updateItineraryItem(item.id, { category: change.newCategory as any })
    } else if (change.type === 'swap') {
      const itemA = items.find(i => i.id === change.itemIdA)
      const itemB = items.find(i => i.id === change.itemIdB)
      if (itemA && itemB) {
        await Promise.all([
          updateItineraryItem(itemA.id, { sort_order: itemB.sort_order }),
          updateItineraryItem(itemB.id, { sort_order: itemA.sort_order }),
        ])
      }
    }
    onDone()
  } catch (err) {
    console.error('[TripAI] Apply failed:', err)
  }
}

// Format suggestion as readable text
function formatSuggestionChange(change: ItineraryChange): string {
  switch (change.type) {
    case 'reorder': return `Pindahkan urutan`
    case 'update_time': return `Ubah waktu ke ${change.newTime}`
    case 'update_category': return `Ubah kategori ke ${change.newCategory}`
    case 'delete': return `Hapus item`
    case 'add': return `Tambah: ${change.item.title}`
    case 'swap': return `Tukar posisi`
    default: return 'Perubahan itinerary'
  }
}

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
  isApplying,
}: {
  suggestion: AISuggestion
  onAccept: () => void
  onReject: () => void
  isApplying: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[hsl(214_32%_88%)] bg-white p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[hsl(222_47%_11%)] leading-snug">{suggestion.reason}</p>
          <p className="text-xs text-[hsl(215_16%_35%)] mt-0.5">{formatSuggestionChange(suggestion.change)}</p>
        </div>
        <Badge variant="aurora" className="shrink-0 text-[10px]">
          {Math.round(suggestion.confidence * 100)}%
        </Badge>
      </div>

      {/* Before / After */}
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded-md bg-red-50 text-red-600 line-through truncate max-w-[40%]">
          {suggestion.beforeLabel}
        </span>
        <ArrowRight className="w-3 h-3 text-[hsl(215_16%_35%)] shrink-0" />
        <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 truncate max-w-[40%]">
          {suggestion.afterLabel}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-[hsl(214_32%_88%)]"
          onClick={onReject}
          disabled={isApplying}
        >
          <X className="w-3 h-3 mr-1" />
          Tolak
        </Button>
        <Button
          variant="gradient"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={onAccept}
          disabled={isApplying}
        >
          {isApplying ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <CheckCheck className="w-3 h-3 mr-1" />
          )}
          Terima
        </Button>
      </div>
    </motion.div>
  )
}

function ChatBubble({
  bubble,
  onAcceptSuggestion,
  onRejectSuggestion,
  applyingId,
  allItems,
  tripId,
  onItemsChanged,
}: {
  bubble: ChatBubble
  onAcceptSuggestion: (sug: AISuggestion) => void
  onRejectSuggestion: (sug: AISuggestion) => void
  applyingId: string | null
  allItems: ItineraryItem[]
  tripId: string
  onItemsChanged: () => void
}) {
  const isUser = bubble.role === "user"
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white text-xs">
            <Sparkles className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("max-w-[80%] flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-br-md"
              : "bg-white border border-[hsl(214_32%_88%)] text-[hsl(222_47%_11%)] rounded-bl-md"
          )}
        >
          {bubble.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* Suggestions */}
        {bubble.suggestions && bubble.suggestions.length > 0 && (
          <div className="mt-2 space-y-2 w-full max-w-sm">
            {bubble.suggestions.slice(0, expanded ? undefined : 3).map(sug => (
              <SuggestionCard
                key={sug.id}
                suggestion={sug}
                onAccept={() => onAcceptSuggestion(sug)}
                onReject={() => onRejectSuggestion(sug)}
                isApplying={applyingId === sug.id}
              />
            ))}
            {bubble.suggestions.length > 3 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-[#667eea] hover:underline flex items-center gap-1"
              >
                <ChevronDown className="w-3 h-3" />
                Lihat {bubble.suggestions.length - 3} saran lainnya
              </button>
            )}
          </div>
        )}

        {/* Time */}
        <span className="text-[10px] text-[hsl(215_16%_35%)]">
          {new Date(bubble.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {isUser && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-[hsl(210_40%_96%)] text-[hsl(215_16%_35%)] text-xs">
            <MessageSquare className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  )
}

export function TripAIPanel({
  open,
  onClose,
  trip,
  itineraryItems,
  onItemsChanged,
  currentDay,
  onRequestAdd,
}: TripAIPanelProps) {
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Reset when panel opens with new trip
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        text: `Halo! Saya TripAI ✨\n\nAku bisa bantu kamu optimize itinerary "${trip.name}" di ${trip.destination}.\n\nCoba tanya sesuatu, misalnya:\n• "Tambahkan waktu buffer antar destinasi"\n• "Apa yang bisa dioptimalkan?"\n• "Tukar urutan hari 1 dan 2"`,
        timestamp: Date.now(),
      }])
    }
  }, [open])

  const applyActions = async (actions: any[]): Promise<{ applied: number; pendingAdds: number }> => {
    if (!actions?.length) return { applied: 0, pendingAdds: 0 }
    let applied = 0
    let pendingAdds = 0
    for (const action of actions) {
      try {
        if (action.type === 'add' && action.item) {
          if (onRequestAdd) {
            // Open AddPlaceModal so user can review day/time before adding
            onRequestAdd({
              name: action.item.title || action.item.name || 'Tempat Baru',
              day: action.item.day || currentDay || 1,
              time: action.item.time || '09:00',
              location: action.item.location,
              category: action.item.category,
              notes: action.item.notes,
            })
            pendingAdds++
          } else {
            // Fallback: auto-apply directly
            await addItineraryItem({
              trip_id: trip.id,
              day: action.item.day || 1,
              time: action.item.time || '09:00',
              title: action.item.title || 'Tempat Baru',
              location: action.item.location,
              latitude: action.item.latitude || null,
              longitude: action.item.longitude || null,
              category: action.item.category || 'activity',
              duration_minutes: action.item.duration_minutes || 60,
              notes: action.item.notes,
              sort_order: 999,
            })
            applied++
          }
        } else if (action.type === 'update' && action.itemId && action.changes) {
          await updateItineraryItem(action.itemId, action.changes)
          applied++
        } else if (action.type === 'delete' && action.itemId) {
          await deleteItineraryItem(action.itemId)
          applied++
        }
      } catch (err) {
        console.error('[TripAI] Action failed:', action, err)
      }
    }
    if (applied > 0) onItemsChanged()
    return { applied, pendingAdds }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatBubble = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    const thinkingId = `thinking-${Date.now()}`
    const thinkingMsg: ChatBubble = {
      id: thinkingId,
      role: "assistant",
      text: "",
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, thinkingMsg])

    try {
      // Send message to backend with trip context + item IDs for AI to reference
      const result = await apiFetch<{ reply: string; actions: any[] }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          trip_id: trip.id,
          context: buildTripContext(itineraryItems, trip),
          items: itineraryItems.map(i => ({ id: i.id, title: i.title, day: i.day, time: i.time })),
        }),
      })

      const reply = result.reply || "Maaf, aku belum bisa menjawab saat ini. Coba lagi ya!"
      const actions = Array.isArray(result.actions) ? result.actions : []

      // Apply actions first, then update message with result
      let appliedCount = 0
      let pendingAdds = 0
      if (actions.length > 0) {
        const result = await applyActions(actions)
        appliedCount = result?.applied ?? 0
        pendingAdds = result?.pendingAdds ?? 0
      }

      // Build actionSummary text
      const parts: string[] = []
      if (appliedCount > 0) parts.push(`✅ ${appliedCount} perubahan diterapkan.`)
      if (pendingAdds > 0) parts.push(`📝 ${pendingAdds} tempat menunggu konfirmasi — cek form yang terbuka!`)
      const actionSummary = parts.length > 0 ? `\n\n${parts.join(' ')}` : ''

      setMessages(prev => prev.map(m =>
        m.id === thinkingId
          ? { ...m, text: reply + actionSummary, appliedActions: appliedCount }
          : m
      ))
    } catch (err) {
      console.error('[TripAIPanel] Chat error:', err)
      setMessages(prev => prev.map(m =>
        m.id === thinkingId
          ? { ...m, text: "Hmm, aku lagi tidak bisa membantu saat ini. Pastikan server AI sudah aktif." }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    setApplyingId(suggestion.id)
    await applySuggestion(suggestion, trip.id, itineraryItems, () => {
      onItemsChanged()
      setApplyingId(null)
      // Mark as applied
      setMessages(prev => prev.map(m =>
        m.id === messages[messages.length - 1]?.id
          ? {
              ...m,
              appliedIds: [...(m.appliedIds || []), suggestion.id],
              suggestions: m.suggestions?.map(s =>
                s.id === suggestion.id ? { ...s, reason: `✓ ${s.reason}` } : s
              ),
            }
          : m
      ))
    })
  }

  const handleRejectSuggestion = (suggestion: AISuggestion) => {
    setMessages(prev => prev.map(m =>
      m.id === messages[messages.length - 1]?.id
        ? {
            ...m,
            rejectedIds: [...(m.rejectedIds || []), suggestion.id],
            suggestions: m.suggestions?.filter(s => s.id !== suggestion.id),
          }
        : m
    ))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[hsl(0_0%_98%)] z-50 flex flex-col shadow-[-8px_0_32px_rgba(31,38,135,0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(214_32%_88%)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-[hsl(222_47%_11%)]">TripAI</h2>
                  <p className="text-xs text-[hsl(215_16%_35%)]">{trip.name}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-[hsl(215_16%_35%)]">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map(bubble => (
                <ChatBubble
                  key={bubble.id}
                  bubble={bubble}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  applyingId={applyingId}
                  allItems={itineraryItems}
                  tripId={trip.id}
                  onItemsChanged={onItemsChanged}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white">
                      <Sparkles className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-bl-md bg-white border border-[hsl(214_32%_88%)] px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-[hsl(214_32%_88%)]">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanya TripAI sesuatu..."
                  className="flex-1 resize-none rounded-xl border border-[hsl(214_32%_88%)] bg-white px-4 py-2.5 text-sm text-[hsl(222_47%_11%)] placeholder-[hsl(215_16%_35%)] focus:outline-none focus:ring-2 focus:ring-[#667eea]/30"
                  rows={1}
                  style={{ maxHeight: '120px' }}
                />
                <Button
                  variant="gradient"
                  size="icon"
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 w-11 h-11 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-[hsl(215_16%_35%)] mt-2 text-center">
                TripAI bisa bantu optimize itinerary · Tekan Enter untuk kirim
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}