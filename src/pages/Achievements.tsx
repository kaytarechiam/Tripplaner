import { motion, AnimatePresence } from "framer-motion"
import {
  Award, Star, Trophy, Medal, Zap, Target,
  ChevronRight, Check, Lock, Loader2, Gift, X
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getTrips } from "../lib/supabase"
import { supabase } from "@/lib/supabase"
import type { Trip } from "../lib/supabase"
import confetti from "canvas-confetti"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface AchievementsProps {
  navigateTo: (page: Page) => void
}

// Real badge definitions — unlocked state derived from user data
const BADGE_DEFINITIONS = [
  // Level 1 - Bronze
  { id: 1, name: "First Steps", emoji: "👣", level: "bronze", desc: "Buat trip pertamamu", targetTrips: 1 },
  { id: 2, name: "Explorer", emoji: "🗺️", level: "bronze", desc: "Kunjungi 5 destinasi", targetDestinations: 5 },
  { id: 3, name: "Social Butterfly", emoji: "🦋", level: "bronze", desc: "Ajak 3 teman", targetCollaborators: 3 },

  // Level 2 - Silver
  { id: 4, name: "City Hopper", emoji: "🏙️", level: "silver", desc: "Kunjungi 5 kota berbeda", targetCities: 5 },
  { id: 5, name: "Foodie", emoji: "🍜", level: "silver", desc: "Selesaikan 3 trip kuliner", targetCulinaryTrips: 3 },
  { id: 6, name: "AI Master", emoji: "🤖", level: "silver", desc: "Generate 5 itinerary dengan AI", targetAIGenerated: 5 },

  // Level 3 - Gold
  { id: 7, name: "Globe Trotter", emoji: "🌏", level: "gold", desc: "Kunjungi 10 negara", targetCountries: 10 },
  { id: 8, name: "Superstar", emoji: "⭐", level: "gold", desc: "Dapatkan 50 likes di trip", targetLikes: 50 },
  { id: 9, name: "Community Leader", emoji: "👑", level: "gold", desc: "Bagikan 3 trip ke publik", targetPublicTrips: 3 },

  // Level 4 - Platinum
  { id: 10, name: "Travel Legend", emoji: "🏆", level: "platinum", desc: "Selesaikan 20 trip", targetCompletedTrips: 20 },
  { id: 11, name: "Photo Pro", emoji: "📸", level: "platinum", desc: "Upload foto di 10 trip", targetTripsWithPhotos: 10 },
  { id: 12, name: "Budget Master", emoji: "💰", level: "platinum", desc: "Split bill 10 kali", targetSplitBills: 10 },
]

const levelColors = {
  bronze: { bg: "from-amber-600 to-amber-800", text: "text-amber-500", glow: "shadow-amber-500/30" },
  silver: { bg: "from-gray-400 to-gray-600", text: "text-gray-400", glow: "shadow-gray-400/30" },
  gold: { bg: "from-amber-300 to-yellow-500", text: "text-amber-400", glow: "shadow-amber-400/30" },
  platinum: { bg: "from-purple-400 to-purple-700", text: "text-purple-400", glow: "shadow-purple-400/30" },
}

export function Achievements({ navigateTo }: AchievementsProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [claimedSet, setClaimedSet] = useState<Set<number>>(new Set())
  const [celebrationBadge, setCelebrationBadge] = useState<typeof BADGE_DEFINITIONS[0] | null>(null)

  useEffect(() => {
    getTrips()
      .then(data => setTrips(data))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [])

  // Derive real badge states from user data
  const countriesVisited = new Set(trips.map(t => {
    // Extract country from destination if available (future: from coordinates)
    return t.destination
  })).size

  const completedTrips = trips.filter(t => t.status === "completed").length
  const totalTrips = trips.length

  // Compute unlocked + progress for each badge
  const computedBadges = BADGE_DEFINITIONS.map(badge => {
    let unlocked = false
    let progress = 0
    let target = 1

    switch (badge.id) {
      case 1: target = badge.targetTrips!; progress = Math.min(100, Math.round((totalTrips / target) * 100)); unlocked = totalTrips >= target; break
      case 2: target = badge.targetDestinations!; progress = Math.min(100, Math.round((totalTrips / target) * 100)); unlocked = totalTrips >= target; break
      case 3: unlocked = false; progress = 0; break // No collaborators yet
      case 4: target = badge.targetCities!; progress = Math.min(100, Math.round((countriesVisited / target) * 100)); unlocked = countriesVisited >= target; break
      case 5: unlocked = false; progress = 0; break
      case 6: unlocked = false; progress = 0; break
      case 7: target = badge.targetCountries!; progress = Math.min(100, Math.round((countriesVisited / target) * 100)); unlocked = countriesVisited >= target; break
      case 8: unlocked = false; progress = 0; break
      case 9: unlocked = false; progress = 0; break
      case 10: target = badge.targetCompletedTrips!; progress = Math.min(100, Math.round((completedTrips / target) * 100)); unlocked = completedTrips >= target; break
      case 11: unlocked = false; progress = 0; break
      case 12: unlocked = false; progress = 0; break
    }

    return { ...badge, unlocked, progress }
  })

  const unlockedBadges = computedBadges.filter(b => b.unlocked).length
  const totalBadges = computedBadges.length
  // XP: 100 per unlocked badge, 50 per partial progress
  const points = computedBadges.reduce((sum, b) => sum + (b.unlocked ? 100 : Math.floor(b.progress * 0.5)), 0)
  const level = Math.max(1, Math.floor(unlockedBadges / 3) + 1)

  // ── Celebration & Claim ────────────────────────────────────
  const fireConfetti = (badge: typeof BADGE_DEFINITIONS[0]) => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#667eea", "#764ba2", "#f093fb", "#ffd700", "#ff6b6b"],
    })
    setTimeout(() => confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.5 },
      colors: ["#667eea", "#764ba2", "#f093fb"],
    }), 300)
  }

  const handleClaim = async (badge: typeof BADGE_DEFINITIONS[0]) => {
    if (claimedSet.has(badge.id)) return
    setClaimedSet(prev => new Set([...prev, badge.id]))
    fireConfetti(badge)
    setCelebrationBadge(badge)
    // Persist claim to DB
    if (supabase) {
      try {
        const { getSession } = await import("@/lib/supabase")
        const session = await getSession()
        const userId = session?.user?.id
        if (userId) {
          await supabase.from("user_achievements").upsert({
            user_id: userId,
            achievement_id: String(badge.id),
            earned_at: new Date().toISOString(),
            claimed_at: new Date().toISOString(),
            notified: true,
          }, { onConflict: "user_id,achievement_id" })
        }
      } catch (err) {
        console.error("Claim achievement error:", err)
      }
    }
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-sm font-bold text-white border-2 border-background">
                {level}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-xl">Level {level}</h2>
                <span className="text-sm text-muted-foreground">{unlockedBadges}/{totalBadges} badges</span>
              </div>
              <Progress value={(unlockedBadges / totalBadges) * 100} className="h-3 mb-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{points.toLocaleString()} XP</span>
                <span className="text-muted-foreground">{(totalBadges - unlockedBadges)} badges menuju Level {level + 1}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Level Badges */}
        {["bronze", "silver", "gold", "platinum"].map((lvl) => {
          const levelBadges = computedBadges.filter(b => b.level === lvl)
          const colors = levelColors[lvl as keyof typeof levelColors]
          const unlockedCount = levelBadges.filter(b => b.unlocked).length

          return (
            <motion.div
              key={lvl}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-lg ${colors.glow}`}>
                  {lvl === "bronze" && <Medal className="w-5 h-5 text-white" />}
                  {lvl === "silver" && <Medal className="w-5 h-5 text-white" />}
                  {lvl === "gold" && <Trophy className="w-5 h-5 text-white" />}
                  {lvl === "platinum" && <Star className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="font-bold capitalize flex items-center gap-2">
                    {lvl} Tier
                    <Badge variant="secondary" className="text-xs">
                      {unlockedCount}/{levelBadges.length}
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {unlockedCount === levelBadges.length ? "✨ Semua terbuka!" : `${levelBadges.length - unlockedCount} badge tersisa`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {levelBadges.map((badge, i) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "glass-card p-5 text-center transition-all",
                      badge.unlocked ? "hover:scale-[1.02]" : "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl",
                      badge.unlocked ? `bg-gradient-to-br ${colors.bg} shadow-lg ${colors.glow}` : "bg-gray-700"
                    )}>
                      {badge.unlocked ? badge.emoji : <Lock className="w-6 h-6 text-gray-500" />}
                    </div>
                    <h4 className="font-bold">{badge.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{badge.desc}</p>

                    {!badge.unlocked && (
                      <div className="mt-3">
                        <Progress value={badge.progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">{badge.progress}%</p>
                      </div>
                    )}

                    {badge.unlocked && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <Button
                          variant={claimedSet.has(badge.id) ? "ghost" : "gradient"}
                          size="sm"
                          className="w-full text-xs h-8"
                          onClick={() => handleClaim(badge)}
                        >
                          {claimedSet.has(badge.id) ? (
                            <><Check className="w-3 h-3 mr-1" />Diklaim</>
                          ) : (
                            <><Gift className="w-3 h-3 mr-1" />Klaim +100 XP</>
                          )}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Celebration Popup */}
      <AnimatePresence>
        {celebrationBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setCelebrationBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className="glass-card p-8 text-center max-w-sm mx-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn("w-24 h-24 rounded-3xl mx-auto bg-gradient-to-br flex items-center justify-center text-5xl shadow-xl", levelColors[celebrationBadge.level as keyof typeof levelColors].bg)}>
                {celebrationBadge.emoji}
              </div>
              <div>
                <Badge className="mb-2">✨ Badge Earned!</Badge>
                <h2 className="text-xl font-black">{celebrationBadge.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{celebrationBadge.desc}</p>
                <p className="text-2xl font-black gradient-text mt-2">+100 XP</p>
              </div>
              <Button variant="gradient" className="w-full" onClick={() => setCelebrationBadge(null)}>
                <Check className="w-4 h-4 mr-2" /> keren!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}