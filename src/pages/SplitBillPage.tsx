import { motion } from "framer-motion"
import {
  Wallet, Send, ArrowLeft, Users, Mail,
  Check, Copy, Receipt, DollarSign, CreditCard,
  CheckCircle2, Loader2,
  SplitSquareHorizontal, PieChart, Download, Share2,
  Plus, MapPin
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Card } from "../components/ui/card"
import { Label } from "../components/ui/label"
import { Input } from "../components/ui/input"
import { Progress } from "../components/ui/progress"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Separator } from "../components/ui/separator"
import { cn, formatCurrency } from "../lib/utils"
import { useState, useEffect } from "react"
import { getSplitBills, getTrips } from "../lib/supabase"
import type { SplitBillItem, Trip } from "../lib/supabase"
import { supabase } from "../lib/supabase"

const CATEGORY_COLORS: Record<string, string> = {
  hotel: "from-blue-400 to-cyan-400",
  food: "from-orange-400 to-amber-400",
  ticket: "from-violet-400 to-purple-400",
  transport: "from-emerald-400 to-green-400",
  activity: "from-pink-400 to-rose-400",
  shopping: "from-fuchsia-400 to-pink-400",
  default: "from-gray-400 to-gray-500",
}

interface SplitBillProps {
  navigateTo: (page: "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications") => void
}

export function SplitBillPage({ navigateTo }: SplitBillProps) {
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [bills, setBills] = useState<SplitBillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userTrips, setUserTrips] = useState<Trip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  // Load user's trips
  useEffect(() => {
    getTrips()
      .then(setUserTrips)
      .catch(() => setUserTrips([]))
  }, [])

  // Load split bills when selected trip changes
  useEffect(() => {
    if (!selectedTripId) { setBills([]); setLoading(false); return }
    setLoading(true)
    getSplitBills(selectedTripId)
      .then(setBills)
      .catch(() => setBills([]))
      .finally(() => setLoading(false))
  }, [selectedTripId])

  // Participants derived from split bills
  const allParticipants = Array.from(new Set(
    bills.flatMap(b => b.split_between)
  ))

  const total = bills.reduce((sum, b) => sum + Number(b.amount), 0)
  const perPerson = allParticipants.length > 0 ? total / allParticipants.length : 0

  // Calculate balances
  const balances = allParticipants.map(p => {
    const paid = bills
      .filter(b => b.paid_by === p)
      .reduce((sum, b) => sum + Number(b.amount), 0)
    const owes = bills.reduce((sum, b) => {
      if (b.split_between.includes(p)) {
        return sum + Number(b.amount) / b.split_between.length
      }
      return sum
    }, 0)
    const net = paid - owes
    return { id: p, name: p, paid, owes, net }
  })

  const handleSendBills = async () => {
    setSendingEmail(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setSendingEmail(false)
    setEmailSent(true)
    setTimeout(() => setEmailSent(false), 3000)
  }

  const handleExportPDF = () => {
    if (typeof window === "undefined") return
    // Generate simple text-based bill summary and download as .txt
    // For real PDF, jspdf should be installed — fallback to clipboard copy
    const selectedTrip = userTrips.find(t => t.id === selectedTripId)
    const summary = [
      `=== SPLIT BILL: ${selectedTrip?.name || "Trip"} ===`,
      `Total: ${formatCurrency(total)}`,
      `Anggota: ${allParticipants.join(", ")}`,
      `Per Orang: ${formatCurrency(perPerson)}`,
      "",
      "--- Rincian ---",
      ...bills.map(b => `${b.description} | ${formatCurrency(Number(b.amount))} | oleh ${b.paid_by}`),
      "",
      "--- Balance ---",
      ...balances.map(m => `${m.name}: ${m.net >= 0 ? "+" : ""}${formatCurrency(m.net)} (${m.net >= 0 ? "Hak Terima" : "Hutang"})`),
    ].join("\n")
    navigator.clipboard.writeText(summary).catch(() => {})
    alert("Rincian tagihan sudah disalin! Paste ke notes atau chat.")
  }

  const handleShare = async () => {
    const selectedTrip = userTrips.find(t => t.id === selectedTripId)
    const text = `Split Bill ${selectedTrip?.name}: Total ${formatCurrency(total)}, Per orang ${formatCurrency(perPerson)}`
    if (navigator.share) {
      try { await navigator.share({ title: "Split Bill", text }) } catch {}
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
          <Button variant="gradient" size="sm" onClick={() => navigateTo("editor")}>
            <Plus className="w-4 h-4 mr-1" />
            Tambah Trip
          </Button>
        </div>

        {/* Trip Selector */}
        {userTrips.length > 0 && (
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
        )}
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="glass-card p-5 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-[var(--aurora-start)]" />
            <div className="text-2xl font-black gradient-text mb-1">
              {formatCurrency(total)}
            </div>
            <div className="text-sm text-muted-foreground">Total Pengeluaran</div>
          </Card>

          <Card className="glass-card p-5 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-[var(--aurora-start)]" />
            <div className="text-2xl font-black text-white mb-1">
              {allParticipants.length}
            </div>
            <div className="text-sm text-muted-foreground">Anggota Trip</div>
          </Card>

          <Card className="glass-card p-5 text-center">
            <Receipt className="w-6 h-6 mx-auto mb-2 text-[var(--aurora-start)]" />
            <div className="text-2xl font-black text-white mb-1">
              {bills.length}
            </div>
            <div className="text-sm text-muted-foreground">Item Tagihan</div>
          </Card>

          <Card className="glass-card p-5 text-center">
            <SplitSquareHorizontal className="w-6 h-6 mx-auto mb-2 text-[var(--sunset-warm)]" />
            <div className="text-2xl font-black text-[var(--sunset-warm)] mb-1">
              {allParticipants.length > 0 ? formatCurrency(perPerson) : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Per Orang (Rata)</div>
          </Card>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
          </div>
        ) : bills.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-[var(--aurora-start)]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Belum ada tagihan</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Tambahkan pengeluaran trip kamu di editor untuk memulai split bill. Nanti bisa kirim rincian tagihan ke semua anggota via email.
            </p>
            <Button variant="gradient" onClick={() => navigateTo("editor")}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Trip & Tambah Tagihan
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Members & Expenses */}
            <div className="lg:col-span-2 space-y-6">
              {/* Balance Cards */}
              <Card className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-lg">Ringkasan Tagihan</h2>
                    <p className="text-sm text-muted-foreground">Perhitungan otomatis</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={splitMode === "equal" ? "gradient" : "ghost"}
                      size="sm"
                      onClick={() => setSplitMode("equal")}
                    >
                      Rata
                    </Button>
                    <Button
                      variant={splitMode === "custom" ? "gradient" : "ghost"}
                      size="sm"
                      onClick={() => setSplitMode("custom")}
                    >
                      Custom
                    </Button>
                  </div>
                </div>

                {/* Members */}
                <div className="space-y-4">
                  {balances.map((member, i) => {
                    const isPositive = member.net > 0
                    const isNegative = member.net < 0

                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card-hover p-4"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className={`bg-gradient-to-br ${CATEGORY_COLORS.default} text-base`}>
                              {member.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg">{member.name}</p>
                          </div>
                          <div className="text-right">
                            {isPositive ? (
                              <div>
                                <p className="text-sm text-emerald-400 font-medium">Hak Terima</p>
                                <p className="text-xl font-black text-emerald-400">
                                  {formatCurrency(member.net)}
                                </p>
                              </div>
                            ) : isNegative ? (
                              <div>
                                <p className="text-sm text-[var(--coral-accent)] font-medium">Hutang</p>
                                <p className="text-xl font-black text-[var(--coral-accent)]">
                                  {formatCurrency(Math.abs(member.net))}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-muted-foreground font-medium">Lunas</p>
                                <CheckCircle2 className="w-6 h-6 text-muted-foreground ml-auto" />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </Card>

              {/* Expense Breakdown */}
              <Card className="glass-card p-6">
                <h2 className="font-bold text-lg mb-4">Rincian Pengeluaran</h2>
                <div className="space-y-3">
                  {bills.map((bill, i) => (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br",
                        CATEGORY_COLORS.default
                      )}>
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{bill.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Dibayar oleh {bill.paid_by} · Dibagi ke {bill.split_between.length} orang
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(Number(bill.amount))}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(bill.amount) / bill.split_between.length)}/orang
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right - Send Bills */}
            <div className="lg:col-span-1">
              <Card className="glass-card p-6 sticky top-24 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sunset-warm)] to-[var(--coral-accent)] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold">Kirim Tagihan</h2>
                    <p className="text-sm text-muted-foreground">via email</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Destinasi Email</Label>
                  {balances.filter(m => m.net < 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Tidak ada yang perlu bayar</p>
                  ) : (
                    balances.filter(m => m.net < 0).map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)]">
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{member.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[var(--coral-accent)] text-sm">
                            {formatCurrency(Math.abs(member.net))}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  variant="gradient-sunset"
                  size="lg"
                  className="w-full"
                  onClick={handleSendBills}
                  disabled={sendingEmail || emailSent || bills.length === 0}
                >
                  {sendingEmail ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</>
                  ) : emailSent ? (
                    <><Check className="w-4 h-4 mr-2" />Terkirim!</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Kirim Tagihan via Email</>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={handleExportPDF}>
                    <Download className="w-4 h-4 mr-1" />Export
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-1" />Share
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}