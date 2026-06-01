import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, Send, ArrowLeft, Users, Mail,
  Check, Receipt, DollarSign,
  CheckCircle2, Loader2,
  SplitSquareHorizontal, Download, Share2,
  Plus, MapPin, Trash2, ChevronDown, ChevronUp,
  PieChart, Equal
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Label } from "../components/ui/label"
import { Input } from "../components/ui/input"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Separator } from "../components/ui/separator"
import { cn, formatCurrency } from "../lib/utils"
import { useState, useEffect, useCallback } from "react"
import { getSplitBills, getTrips, getTripMembersWithProfiles, addSplitBill } from "../lib/supabase"
import type { SplitBillItem, Trip, TripMemberProfile } from "../lib/supabase"

const CATEGORY_COLORS: Record<string, string> = {
  hotel: "from-blue-400 to-cyan-400",
  food: "from-orange-400 to-amber-400",
  ticket: "from-violet-400 to-purple-400",
  transport: "from-emerald-400 to-green-400",
  activity: "from-pink-400 to-rose-400",
  shopping: "from-fuchsia-400 to-pink-400",
  default: "from-gray-400 to-gray-500",
}

const CATEGORY_LABELS: Record<string, string> = {
  hotel: "🏨 Hotel",
  food: "🍜 Makan",
  ticket: "🎟 Tiket",
  transport: "🚌 Transport",
  activity: "🏄 Aktivitas",
  shopping: "🛍 Belanja",
  default: "💰 Lainnya",
}

interface SplitBillProps {
  navigateTo: (page: "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications") => void
}

// Calculate how much each person owes for a bill
function getBillShare(bill: SplitBillItem, person: string): number {
  if (bill.split_amounts && Object.keys(bill.split_amounts).length > 0) {
    return bill.split_amounts[person] ?? 0
  }
  if (bill.split_between.includes(person)) {
    return Number(bill.amount) / bill.split_between.length
  }
  return 0
}

export function SplitBillPage({ navigateTo }: SplitBillProps) {
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [bills, setBills] = useState<SplitBillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userTrips, setUserTrips] = useState<Trip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [showAddBill, setShowAddBill] = useState(false)
  const [addBillLoading, setAddBillLoading] = useState(false)

  // Trip members (auto-populated from DB)
  const [tripMembers, setTripMembers] = useState<TripMemberProfile[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  // Extra manually-added members
  const [extraMembers, setExtraMembers] = useState<{ name: string; email: string }[]>([])
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")

  // Bill form state
  const [billDesc, setBillDesc] = useState("")
  const [billAmount, setBillAmount] = useState("")
  const [billCategory, setBillCategory] = useState("default")
  const [billPaidBy, setBillPaidBy] = useState("")
  const [billSplitWith, setBillSplitWith] = useState<string[]>([])
  // Custom split amounts: { [name]: amount }
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})

  // All members = trip members (from DB) + extra manually added
  const allMembers: { name: string; email: string }[] = [
    ...tripMembers.map(m => ({ name: m.name, email: m.email })),
    ...extraMembers,
  ]
  const memberNames = allMembers.map(m => m.name)

  // Load trips on mount
  useEffect(() => {
    getTrips()
      .then(setUserTrips)
      .catch(() => setUserTrips([]))
  }, [])

  // Load split bills + trip members when selected trip changes
  useEffect(() => {
    if (!selectedTripId) {
      setBills([])
      setTripMembers([])
      setExtraMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setMembersLoading(true)

    getSplitBills(selectedTripId)
      .then(setBills)
      .catch(() => setBills([]))
      .finally(() => setLoading(false))

    getTripMembersWithProfiles(selectedTripId)
      .then(members => {
        setTripMembers(members)
        // Pre-select all members for split
        setBillSplitWith(members.map(m => m.name))
      })
      .catch(() => setTripMembers([]))
      .finally(() => setMembersLoading(false))
  }, [selectedTripId])

  // When bill amount or split selection changes in custom mode, recalculate equal defaults
  useEffect(() => {
    if (splitMode !== "custom" || !billAmount || billSplitWith.length === 0) return
    const amt = Number(billAmount)
    if (isNaN(amt) || amt <= 0) return
    const equalShare = amt / billSplitWith.length
    const defaults: Record<string, string> = {}
    billSplitWith.forEach(name => {
      defaults[name] = customAmounts[name] ?? equalShare.toFixed(0)
    })
    setCustomAmounts(defaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitMode, billSplitWith.length, billAmount])

  const customTotal = Object.values(customAmounts).reduce((s, v) => s + (Number(v) || 0), 0)
  const customRemaining = Number(billAmount) - customTotal

  const handleAddMember = () => {
    const name = newMemberName.trim()
    if (!name) return
    if (memberNames.includes(name)) return
    setExtraMembers(prev => [...prev, { name, email: newMemberEmail.trim() }])
    setBillSplitWith(prev => [...prev, name])
    setNewMemberName("")
    setNewMemberEmail("")
  }

  const handleRemoveExtraMember = (name: string) => {
    setExtraMembers(prev => prev.filter(m => m.name !== name))
    setBillSplitWith(prev => prev.filter(n => n !== name))
  }

  const handleAddBill = async () => {
    if (!billDesc || !billAmount || !billPaidBy || billSplitWith.length === 0) return
    if (!selectedTripId) return

    // Validate custom split
    if (splitMode === "custom") {
      const total = Object.values(customAmounts).reduce((s, v) => s + (Number(v) || 0), 0)
      if (Math.abs(total - Number(billAmount)) > 1) {
        alert(`Total custom (${formatCurrency(total)}) harus sama dengan jumlah tagihan (${formatCurrency(Number(billAmount))})`)
        return
      }
    }

    setAddBillLoading(true)
    try {
      const splitAmounts = splitMode === "custom"
        ? Object.fromEntries(billSplitWith.map(n => [n, Number(customAmounts[n]) || 0]))
        : {}

      const newBill = await addSplitBill({
        trip_id: selectedTripId,
        description: billDesc,
        amount: Number(billAmount),
        currency: 'IDR',
        paid_by: billPaidBy,
        split_between: billSplitWith,
        split_amounts: splitAmounts,
        category: billCategory,
        settled: false,
      })
      setBills(prev => [newBill, ...prev])
      // Reset form
      setBillDesc(""); setBillAmount(""); setBillCategory("default")
      setBillPaidBy(""); setCustomAmounts({})
      // Keep split selection as-is for convenience
      setShowAddBill(false)
    } catch (err) {
      console.error("Add bill error:", err)
      alert("Gagal menyimpan tagihan. Coba lagi.")
    } finally {
      setAddBillLoading(false)
    }
  }

  // All participants across all bills + current members
  const allParticipants = Array.from(new Set([
    ...memberNames,
    ...bills.flatMap(b => b.split_between),
  ]))

  const total = bills.reduce((sum, b) => sum + Number(b.amount), 0)
  const perPerson = allParticipants.length > 0 ? total / allParticipants.length : 0

  // Calculate balances using getBillShare (handles custom splits)
  const balances = allParticipants.map(p => {
    const paid = bills
      .filter(b => b.paid_by === p)
      .reduce((sum, b) => sum + Number(b.amount), 0)
    const owes = bills.reduce((sum, b) => sum + getBillShare(b, p), 0)
    const net = paid - owes
    return { id: p, name: p, paid, owes, net }
  })

  // Participant emails map for sending
  const participantEmails = allMembers

  const handleSendBills = async () => {
    if (!selectedTripId || bills.length === 0) return
    setSendingEmail(true)
    try {
      const { sendSplitBillEmail } = await import('../lib/api')
      const selectedTrip = userTrips.find((t: Trip) => t.id === selectedTripId)
      await sendSplitBillEmail({
        trip_name: selectedTrip?.name || "Trip",
        items: bills.map((b: SplitBillItem) => ({
          description: b.description,
          amount: Number(b.amount),
          paid_by: b.paid_by,
          split_between: b.split_between,
        })),
        currency: 'Rp',
        participant_emails: participantEmails,
      })
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 3000)
    } catch (err: unknown) {
      console.error("Send email error:", err)
      const msg = err instanceof Error ? err.message : "Gagal kirim email"
      alert(msg + ". Pastikan email penerima sudah diisi.")
    } finally {
      setSendingEmail(false)
    }
  }

  const handleExport = () => {
    const selectedTrip = userTrips.find(t => t.id === selectedTripId)
    const lines = [
      `=== SPLIT BILL: ${selectedTrip?.name || "Trip"} ===`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`,
      `Total Pengeluaran: ${formatCurrency(total)}`,
      `Anggota: ${allParticipants.join(", ")}`,
      `Per Orang (rata): ${formatCurrency(perPerson)}`,
      "",
      "──────────────────────────────────────",
      "RINCIAN TAGIHAN",
      "──────────────────────────────────────",
      ...bills.map((b, i) => {
        const share = Number(b.amount) / b.split_between.length
        const lines = [
          `${i + 1}. ${b.description}`,
          `   Jumlah   : ${formatCurrency(Number(b.amount))}`,
          `   Dibayar  : ${b.paid_by}`,
          `   Dibagi ke: ${b.split_between.join(", ")}`,
        ]
        if (b.split_amounts && Object.keys(b.split_amounts).length > 0) {
          lines.push(`   Custom split:`)
          b.split_between.forEach(n => {
            lines.push(`     ${n}: ${formatCurrency(b.split_amounts![n] ?? 0)}`)
          })
        } else {
          lines.push(`   Per orang : ${formatCurrency(share)}`)
        }
        return lines.join("\n")
      }),
      "",
      "──────────────────────────────────────",
      "SUMMARY HUTANG / PIUTANG",
      "──────────────────────────────────────",
      ...balances.map(m =>
        `${m.name.padEnd(15)} │ Bayar: ${formatCurrency(m.paid).padStart(12)} │ Tagihan: ${formatCurrency(m.owes).padStart(12)} │ ${m.net >= 0 ? "✅ Terima" : "❌ Hutang"} ${formatCurrency(Math.abs(m.net))}`
      ),
      "",
      "Generated by TripPlanner",
    ]
    const content = lines.join("\n")
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `split-bill-${(selectedTrip?.name || "trip").replace(/\s+/g, "-").toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    const selectedTrip = userTrips.find(t => t.id === selectedTripId)
    const text = `Split Bill ${selectedTrip?.name}: Total ${formatCurrency(total)}, Per orang ${formatCurrency(perPerson)}`
    if (navigator.share) {
      try { await navigator.share({ title: "Split Bill", text }) } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Split Bill</h1>
            <p className="text-sm text-muted-foreground">Bagikan tagihan trip dengan anggota</p>
          </div>
        </div>

        {/* Trip Selector */}
        {userTrips.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-[var(--aurora-start)]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Belum ada trip</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Buat trip dulu sebelum split bill. Anggota trip akan otomatis ditambahkan.
            </p>
            <Button variant="gradient" onClick={() => navigateTo("editor")}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Trip
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Label className="mb-2 block">Pilih Trip</Label>
              <div className="flex flex-wrap gap-2">
                {userTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                      selectedTripId === trip.id
                        ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white border-transparent shadow-md"
                        : "border-border hover:border-[var(--aurora-start)]/30 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {trip.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedTripId && (
              <>
                {/* Members Section */}
                <div className="mb-6 glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--aurora-start)]" />
                      Anggota Trip
                      {membersLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    </h3>
                    <span className="text-xs text-muted-foreground">{memberNames.length} anggota</span>
                  </div>

                  {/* Members list */}
                  <div className="flex flex-wrap gap-2">
                    {tripMembers.map(m => (
                      <div key={m.user_id} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/60 rounded-full text-sm">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] text-white">
                            {m.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{m.name}</span>
                        {m.email && <span className="text-muted-foreground text-xs">({m.email})</span>}
                      </div>
                    ))}
                    {extraMembers.map(m => (
                      <div key={m.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/40 rounded-full text-sm border border-dashed border-border">
                        <span>{m.name}</span>
                        {m.email && <span className="text-muted-foreground text-xs">({m.email})</span>}
                        <button
                          onClick={() => handleRemoveExtraMember(m.name)}
                          className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {memberNames.length === 0 && !membersLoading && (
                      <span className="text-xs text-muted-foreground italic">Belum ada anggota. Tambah manual di bawah.</span>
                    )}
                  </div>

                  {/* Add manual member */}
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Nama (wajib)"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Email (opsional)"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                      className="text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={handleAddMember} disabled={!newMemberName.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Add Bill Button + Form */}
                <div className="mb-6 space-y-3">
                  <Button variant="gradient" size="sm" onClick={() => setShowAddBill(v => !v)}>
                    <Plus className="w-4 h-4 mr-1" />
                    {showAddBill ? "Tutup Form" : "Tambah Tagihan"}
                  </Button>

                  <AnimatePresence>
                    {showAddBill && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="glass-card p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Tagihan Baru</h3>
                            {/* Equal / Custom toggle */}
                            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                              <button
                                onClick={() => setSplitMode("equal")}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                  splitMode === "equal"
                                    ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <Equal className="w-3 h-3" />
                                Rata
                              </button>
                              <button
                                onClick={() => setSplitMode("custom")}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                  splitMode === "custom"
                                    ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <PieChart className="w-3 h-3" />
                                Custom
                              </button>
                            </div>
                          </div>

                          {/* Description + Amount */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <Label className="text-xs mb-1 block">Deskripsi</Label>
                              <Input
                                placeholder="mis: Makan malam, Hotel, Tiket masuk..."
                                value={billDesc}
                                onChange={e => setBillDesc(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Jumlah (Rp)</Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={billAmount}
                                onChange={e => setBillAmount(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Kategori</Label>
                              <select
                                value={billCategory}
                                onChange={e => setBillCategory(e.target.value)}
                                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                              >
                                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Paid by */}
                          <div>
                            <Label className="text-xs mb-1 block">Siapa yang bayar?</Label>
                            <select
                              value={billPaidBy}
                              onChange={e => setBillPaidBy(e.target.value)}
                              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                            >
                              <option value="">-- Pilih --</option>
                              {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>

                          {/* Split with checkboxes */}
                          <div>
                            <Label className="text-xs mb-2 block">Split dengan:</Label>
                            {memberNames.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Tambah anggota dulu di atas</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-1.5">
                                {memberNames.map(name => (
                                  <label key={name} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={billSplitWith.includes(name)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setBillSplitWith(prev => [...prev, name])
                                        } else {
                                          setBillSplitWith(prev => prev.filter(n => n !== name))
                                          setCustomAmounts(prev => {
                                            const next = { ...prev }
                                            delete next[name]
                                            return next
                                          })
                                        }
                                      }}
                                      className="rounded"
                                    />
                                    <span className="truncate">{name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Custom split amounts */}
                          {splitMode === "custom" && billSplitWith.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Jumlah per orang (custom):</Label>
                                <span className={cn(
                                  "text-xs font-medium",
                                  Math.abs(customRemaining) <= 1 ? "text-emerald-400" : "text-[var(--coral-accent)]"
                                )}>
                                  {Math.abs(customRemaining) <= 1
                                    ? "✅ Pas"
                                    : customRemaining > 0
                                      ? `Sisa: ${formatCurrency(customRemaining)}`
                                      : `Lebih: ${formatCurrency(Math.abs(customRemaining))}`
                                  }
                                </span>
                              </div>
                              {billSplitWith.map(name => (
                                <div key={name} className="flex items-center gap-2">
                                  <span className="text-sm w-24 shrink-0 truncate">{name}</span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={customAmounts[name] ?? ""}
                                    onChange={e => setCustomAmounts(prev => ({ ...prev, [name]: e.target.value }))}
                                    className="text-sm h-8"
                                  />
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {billAmount && Number(billAmount) > 0
                                      ? `${((Number(customAmounts[name] ?? 0) / Number(billAmount)) * 100).toFixed(0)}%`
                                      : ""}
                                  </span>
                                </div>
                              ))}
                              {/* Quick equal-split button */}
                              {billAmount && billSplitWith.length > 0 && (
                                <button
                                  onClick={() => {
                                    const share = Number(billAmount) / billSplitWith.length
                                    const equal: Record<string, string> = {}
                                    billSplitWith.forEach(n => { equal[n] = share.toFixed(0) })
                                    setCustomAmounts(equal)
                                  }}
                                  className="text-xs text-[var(--aurora-start)] hover:underline"
                                >
                                  ↺ Reset ke rata-rata
                                </button>
                              )}
                            </div>
                          )}

                          {/* Equal split preview */}
                          {splitMode === "equal" && billSplitWith.length > 0 && billAmount && (
                            <div className="text-xs text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg">
                              Setiap orang bayar: <span className="font-semibold text-foreground">
                                {formatCurrency(Number(billAmount) / billSplitWith.length)}
                              </span>
                              {" "}({billSplitWith.length} orang)
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAddBill(false)}>
                              Batal
                            </Button>
                            <Button
                              variant="gradient"
                              size="sm"
                              className="flex-1"
                              disabled={
                                addBillLoading
                                || !billDesc.trim()
                                || !billAmount
                                || Number(billAmount) <= 0
                                || !billPaidBy
                                || billSplitWith.length === 0
                              }
                              onClick={handleAddBill}
                            >
                              {addBillLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Tagihan"}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                >
                  <Card className="glass-card p-5 text-center">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-[var(--aurora-start)]" />
                    <div className="text-2xl font-black gradient-text mb-1">{formatCurrency(total)}</div>
                    <div className="text-xs text-muted-foreground">Total Pengeluaran</div>
                  </Card>
                  <Card className="glass-card p-5 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-[var(--aurora-start)]" />
                    <div className="text-2xl font-black text-white mb-1">{allParticipants.length}</div>
                    <div className="text-xs text-muted-foreground">Anggota</div>
                  </Card>
                  <Card className="glass-card p-5 text-center">
                    <Receipt className="w-6 h-6 mx-auto mb-2 text-[var(--aurora-start)]" />
                    <div className="text-2xl font-black text-white mb-1">{bills.length}</div>
                    <div className="text-xs text-muted-foreground">Item Tagihan</div>
                  </Card>
                  <Card className="glass-card p-5 text-center">
                    <SplitSquareHorizontal className="w-6 h-6 mx-auto mb-2 text-[var(--sunset-warm)]" />
                    <div className="text-2xl font-black text-[var(--sunset-warm)] mb-1">
                      {allParticipants.length > 0 ? formatCurrency(perPerson) : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">Per Orang (Rata)</div>
                  </Card>
                </motion.div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
                  </div>
                ) : bills.length === 0 ? (
                  <div className="text-center py-16">
                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-bold mb-2">Belum ada tagihan</h3>
                    <p className="text-sm text-muted-foreground">Klik "Tambah Tagihan" di atas untuk mulai catat pengeluaran.</p>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left — Balances + Expenses */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Balance Cards */}
                      <Card className="glass-card p-6">
                        <h2 className="font-bold text-lg mb-4">Ringkasan Hutang/Piutang</h2>
                        <div className="space-y-3">
                          {balances.map((member, i) => (
                            <motion.div
                              key={member.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="flex items-center gap-4 glass-card-hover p-4 rounded-xl"
                            >
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] text-white text-sm">
                                  {member.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{member.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Bayar {formatCurrency(member.paid)} · Tagihan {formatCurrency(member.owes)}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                {member.net > 0.5 ? (
                                  <>
                                    <p className="text-xs text-emerald-400 font-medium">Hak Terima</p>
                                    <p className="text-lg font-black text-emerald-400">{formatCurrency(member.net)}</p>
                                  </>
                                ) : member.net < -0.5 ? (
                                  <>
                                    <p className="text-xs text-[var(--coral-accent)] font-medium">Hutang</p>
                                    <p className="text-lg font-black text-[var(--coral-accent)]">{formatCurrency(Math.abs(member.net))}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-xs text-muted-foreground font-medium">Lunas</p>
                                    <CheckCircle2 className="w-5 h-5 text-muted-foreground ml-auto" />
                                  </>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </Card>

                      {/* Expense List */}
                      <Card className="glass-card p-6">
                        <h2 className="font-bold text-lg mb-4">Rincian Tagihan</h2>
                        <div className="space-y-3">
                          {bills.map((bill, i) => {
                            const isCustom = bill.split_amounts && Object.keys(bill.split_amounts).length > 0
                            const catColor = CATEGORY_COLORS[bill.category || "default"] || CATEGORY_COLORS.default
                            return (
                              <motion.div
                                key={bill.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                              >
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br text-white text-lg", catColor)}>
                                  {CATEGORY_LABELS[bill.category || "default"]?.split(" ")[0] ?? "💰"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">{bill.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Dibayar oleh <span className="font-medium text-foreground">{bill.paid_by}</span>
                                    {" · "}
                                    {isCustom ? "Custom split" : `${bill.split_between.length} orang rata`}
                                  </p>
                                  {isCustom && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {bill.split_between.map(n => (
                                        <span key={n} className="text-xs bg-secondary/60 rounded-full px-2 py-0.5">
                                          {n}: {formatCurrency(bill.split_amounts![n] ?? 0)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold">{formatCurrency(Number(bill.amount))}</p>
                                  {!isCustom && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatCurrency(Number(bill.amount) / bill.split_between.length)}/org
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </Card>
                    </div>

                    {/* Right — Send + Export */}
                    <div className="lg:col-span-1">
                      <Card className="glass-card p-6 sticky top-24 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sunset-warm)] to-[var(--coral-accent)] flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="font-bold">Kirim Tagihan</h2>
                            <p className="text-sm text-muted-foreground">via email ke anggota</p>
                          </div>
                        </div>

                        <Separator />

                        {/* Who owes */}
                        <div className="space-y-2">
                          <Label className="text-sm">Yang perlu bayar:</Label>
                          {balances.filter(m => m.net < -0.5).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Semua sudah lunas
                            </p>
                          ) : (
                            balances.filter(m => m.net < -0.5).map(member => (
                              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] text-white">
                                    {member.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{member.name}</p>
                                  {allMembers.find(m => m.name === member.name)?.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {allMembers.find(m => m.name === member.name)?.email}
                                    </p>
                                  )}
                                </div>
                                <p className="font-bold text-[var(--coral-accent)] text-sm shrink-0">
                                  {formatCurrency(Math.abs(member.net))}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        <Button
                          variant="gradient-sunset"
                          size="lg"
                          className="w-full"
                          onClick={handleSendBills}
                          disabled={sendingEmail || emailSent || bills.length === 0 || participantEmails.every(p => !p.email)}
                        >
                          {sendingEmail ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</>
                          ) : emailSent ? (
                            <><Check className="w-4 h-4 mr-2" />Terkirim!</>
                          ) : (
                            <><Send className="w-4 h-4 mr-2" />Kirim via Email</>
                          )}
                        </Button>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={handleExport} disabled={bills.length === 0}>
                            <Download className="w-4 h-4 mr-1" />
                            Export .txt
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1" onClick={handleShare}>
                            <Share2 className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                        </div>

                        {participantEmails.every(p => !p.email) && bills.length > 0 && (
                          <p className="text-xs text-muted-foreground text-center">
                            Tambah email anggota agar bisa kirim via email
                          </p>
                        )}
                      </Card>
                    </div>
                  </div>
                )}
              </>
            )}

            {!selectedTripId && (
              <div className="text-center py-20 text-muted-foreground">
                <SplitSquareHorizontal className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Pilih trip di atas untuk mulai split bill</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
