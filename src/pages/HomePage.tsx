import { motion } from "framer-motion"
import {
  Compass, Map, Sparkles, Users, Star, TrendingUp,
  Calendar, Globe, ArrowRight, Play, ChevronRight,
  MapPin, Clock, Wallet
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Progress } from "../components/ui/progress"

type Page = "home" | "editor" | "ai" | "splitbill"

interface HomePageProps {
  onNavigate: (page: Page) => void
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="pt-20"
    >
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center aurora-bg-mesh overflow-hidden">
        {/* Floating Orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div variants={item} className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-white/90">AI-Powered Trip Planning</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
                <span className="text-white">Plan </span>
                <span className="gradient-text-sunset">together</span>
                <span className="text-white">, travel </span>
                <span className="gradient-text-ocean">smarter</span>
                <span className="text-white">.</span>
              </h1>

              <p className="text-lg md:text-xl text-white/80 max-w-xl leading-relaxed">
                Rencanakan perjalanan impianmu bersama teman dan keluarga secara real-time.
                Dengan AI itinerary generator, peta interaktif, dan split bill otomatis.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  variant="gradient"
                  size="xl"
                  onClick={() => onNavigate("editor")}
                  className="bg-white text-[var(--aurora-start)] hover:bg-white/90 shadow-xl"
                >
                  <Compass className="w-5 h-5 mr-2" />
                  Mulai Rencanakan Trip
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <Button
                  variant="glass"
                  size="xl"
                  className="text-white border-white/30"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Lihat Demo
                </Button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 pt-4">
                {[
                  { value: "50K+", label: "Pengguna Aktif" },
                  { value: "120+", label: "Kota Tujuan" },
                  { value: "4.9", label: "Rating Bintang" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl font-black text-white">{stat.value}</div>
                    <div className="text-sm text-white/60">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right - Hero Map Preview */}
            <motion.div variants={item} className="relative hidden lg:block">
              <div className="relative">
                {/* Main Map Card */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="aurora" className="mb-2">Trip Aktif</Badge>
                      <h3 className="text-xl font-bold text-white">Liburan Bali 4 Hari</h3>
                      <p className="text-sm text-white/60">15 - 18 Juli 2025</p>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <Avatar key={i} className="w-8 h-8 border-2 border-white/20">
                          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-xs">
                            {["AS", "BK", "CR"][i-1]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>

                  {/* Mini Map Visualization */}
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-ocean-600 to-ocean-800 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30">
                      <svg viewBox="0 0 400 200" className="w-full h-full">
                        <path d="M50,150 Q100,100 150,120 T250,100 T350,130" stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.5"/>
                        <path d="M150,120 Q180,80 220,90 T300,80" stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.5" strokeDasharray="5,5"/>
                      </svg>
                    </div>

                    {[
                      { x: "12%", y: "75%", num: 1 },
                      { x: "38%", y: "50%", num: 2 },
                      { x: "55%", y: "45%", num: 3 },
                      { x: "75%", y: "40%", num: 4 },
                      { x: "88%", y: "50%", num: 5 },
                    ].map((marker) => (
                      <div
                        key={marker.num}
                        className={`absolute map-marker-day-${marker.num}`}
                        style={{ left: marker.x, top: marker.y, transform: "translate(-50%, -50%)" }}
                      >
                        {marker.num}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Hari ke-2 dari 4</span>
                      <span className="text-white/70">5 destinasi</span>
                    </div>
                    <Progress value={50} className="h-2 bg-white/20" />
                  </div>
                </div>

                <motion.div
                  className="absolute -right-4 top-1/4 glass-card p-3"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Distance</p>
                      <p className="text-sm font-bold text-white">4.2 km</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute -left-4 bottom-1/4 glass-card p-3"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Estimasi</p>
                      <p className="text-sm font-bold text-white">12 menit</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Grid Dashboard */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div variants={item} className="text-center mb-12">
          <Badge variant="aurora" className="mb-4">Dashboard</Badge>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Semua yang kamu butuhkan,<br />
            <span className="gradient-text">di satu tempat</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Kelola trip, cek peta, generate itinerary dengan AI, dan bagi tagihan — semua dalam satu platform.
          </p>
        </motion.div>

        <motion.div variants={item} className="bento-grid">
          {/* Recent Trips - Large Card */}
          <div className="bento-item-2x2 card-trip group" onClick={() => onNavigate("editor")}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center">
                    <Map className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Trip Aktif</h3>
                    <p className="text-sm text-muted-foreground">3 trip berlangsung</p>
                  </div>
                </div>
                <Badge variant="aurora">Live</Badge>
              </div>

              <div className="flex-1 space-y-3">
                {[
                  { name: "Liburan Bali 4 Hari", date: "15-18 Jul", progress: 50, people: 3, emoji: "🏖️" },
                  { name: "Road Trip Bandung", date: "22-24 Jul", progress: 20, people: 5, emoji: "🏔️" },
                  { name: "Weekend di Yogyakarta", date: "5-7 Agt", progress: 5, people: 2, emoji: "🏛️" },
                ].map((trip, i) => (
                  <div key={i} className="glass-card-hover p-3 flex items-center gap-3">
                    <span className="text-2xl">{trip.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{trip.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {trip.date}
                        <span>·</span>
                        <Users className="w-3 h-3" />
                        {trip.people}
                      </div>
                    </div>
                    <div className="w-16">
                      <Progress value={trip.progress} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Generator - Tall Card */}
          <div className="bento-item-1x2 card-trip group" onClick={() => onNavigate("ai")}>
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">AI Generator</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate itinerary otomatis dalam hitungan detik dengan AI Claude
                </p>
              </div>

              <div className="space-y-3">
                <div className="glass-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">Last Generated</p>
                  <p className="font-medium text-sm">Weekend Jakarta Food Tour</p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="glass">✨ 3 itinerary dibuat</Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[var(--aurora-start)] transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bento-item-1x1 card-stat">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black gradient-text mb-1">Rp 2.4jt</div>
            <p className="text-sm text-muted-foreground">Total pengeluaran bulan ini</p>
          </div>

          <div className="bento-item-1x1 card-stat">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-500 mb-1">4.9</div>
            <p className="text-sm text-muted-foreground">Rating trip kamu</p>
          </div>

          {/* Split Bill */}
          <div className="bento-item-2x1 card-trip group" onClick={() => onNavigate("splitbill")}>
            <div className="flex items-center gap-4 h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--sunset-warm)] to-[var(--coral-accent)] flex items-center justify-center shadow-lg">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Split Bill</h3>
                <p className="text-sm text-muted-foreground">Bagikan tagihan ke teman dengan satu klik</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[var(--coral-accent)]">4</div>
                <p className="text-xs text-muted-foreground">Tagihan pending</p>
              </div>
            </div>
          </div>

          {/* Featured Guides */}
          <div className="bento-item-2x2 card-trip">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Top Travel Guides</h3>
                  <p className="text-sm text-muted-foreground">Rekomendasi guide lokal</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Wayan Suparta", loc: "Bali", rating: 4.9, tours: 234, avatar: "WS", color: "from-emerald-400 to-teal-500" },
                { name: "Dian Pratika", loc: "Yogyakarta", rating: 4.8, tours: 189, avatar: "DP", color: "from-violet-400 to-purple-500" },
                { name: "Budi Santoso", loc: "Jakarta", rating: 4.7, tours: 156, avatar: "BS", color: "from-amber-400 to-orange-500" },
                { name: "Ani Wijaya", loc: "Bandung", rating: 4.9, tours: 201, avatar: "AW", color: "from-rose-400 to-pink-500" },
              ].map((guide, i) => (
                <div key={i} className="glass-card-hover p-3 flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`bg-gradient-to-br ${guide.color} text-xs`}>
                      {guide.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{guide.name}</p>
                    <p className="text-xs text-muted-foreground">{guide.loc}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-medium">{guide.rating}</span>
                      <span className="text-xs text-muted-foreground">({guide.tours})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 aurora-bg-mesh">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={item} className="text-center mb-16">
            <Badge variant="sunset" className="mb-4">Fitur Unggulan</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Semua yang kamu butuhkan<br />untuk trip sempurna
            </h2>
          </motion.div>

          <motion.div
            variants={container}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: Map,
                title: "Peta Interaktif",
                desc: "Visualisasi rute hari per hari dengan jarak & estimasi waktu tempuh",
                color: "from-ocean-400 to-blue-500",
              },
              {
                icon: Sparkles,
                title: "AI Itinerary",
                desc: "Generate rencana perjalanan otomatis sesuai preferensimu",
                color: "from-violet-400 to-purple-500",
              },
              {
                icon: Users,
                title: "Co-Editing",
                desc: "Edit itinerary bareng teman secara real-time",
                color: "from-pink-400 to-rose-500",
              },
              {
                icon: Wallet,
                title: "Split Bill",
                desc: "Bagi tagihan travel secara adil & kirim ke email",
                color: "from-amber-400 to-orange-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={item}
                className="glass-card p-6 space-y-4 hover:scale-[1.02] transition-transform"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg text-white">{feature.title}</h3>
                <p className="text-sm text-white/70">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div variants={item}>
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Siap merencanakan<br />
              <span className="gradient-text">trip impianmu?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Bergabung dengan lebih dari 50.000 traveler yang sudah merencanakan trip mereka bersama TripPlanner.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="gradient" size="xl" onClick={() => onNavigate("editor")}>
                <Compass className="w-5 h-5 mr-2" />
                Buat Trip Baru
              </Button>
              <Button variant="outline" size="xl">
                <Globe className="w-5 h-5 mr-2" />
                Pelajari Fitur AI
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  )
}