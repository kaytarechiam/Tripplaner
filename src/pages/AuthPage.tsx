import { useState } from "react"
import { signIn, signUp } from "../lib/supabase"
import { motion } from "framer-motion"
import {
  Compass, Map, Sparkles, Users, Star, TrendingUp,
  Calendar, Globe, ArrowRight, Play, ChevronRight,
  MapPin, Clock, Wallet, Check, X, Eye, EyeOff,
  Loader2, Mail, Lock, User
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card } from "../components/ui/card"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Progress } from "../components/ui/progress"
import { Separator } from "../components/ui/separator"
import { cn } from "@/lib/utils"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface AppProps {
  setCurrentPage: (page: Page) => void
  isLoggedIn: boolean
  user: any
}

export function LandingPage({ setCurrentPage, isLoggedIn, user }: AppProps) {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => {}}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18 L12 6 L21 18 M7 14 L17 14" />
                  <circle cx="12" cy="6" r="2" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <span className="font-heading font-bold text-lg gradient-text">TripPlanner</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage("login")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Masuk
              </button>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setCurrentPage("register")}
              >
                Daftar Gratis
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden pt-16">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-300 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">✨ AI-Powered Trip Planning</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-gray-900">
                Rencanakan <span className="gradient-text-sunset">bersama</span>,
                Jelajahi <span className="gradient-text-ocean">dunia</span>.
              </h1>

              <p className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed">
                Platform perencanaan perjalanan kolaboratif dengan AI, peta interaktif,
                dan split bill otomatis. Rencanakan trip impianmu bersama teman.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  variant="gradient"
                  size="xl"
                  onClick={() => setCurrentPage("register")}
                  className="shadow-lg shadow-purple-500/30"
                >
                  <Compass className="w-5 h-5 mr-2" />
                  Mulai Gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  size="xl"
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Lihat Demo
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                {[
                  { value: "50K+", label: "Pengguna Aktif" },
                  { value: "120+", label: "Kota Tujuan" },
                  { value: "4.9", label: "Rating" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl font-black text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="bg-white rounded-2xl p-6 space-y-4 shadow-xl shadow-purple-500/10">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="aurora">Trip Populer</Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-medium text-gray-700">4.9</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900">3 Hari di Tokyo</h3>
                <p className="text-sm text-gray-500"> oleh @traveljunkie</p>

                <div className="aspect-video rounded-xl bg-gradient-to-br from-rose-400 via-purple-500 to-indigo-600 relative overflow-hidden">
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <span className="text-xs font-medium text-gray-700">📍 12 tempat</span>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <span className="text-xs font-medium text-gray-700">❤️ 234 likes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {["T", "J", "M"].map((init, i) => (
                      <Avatar key={i} className="w-7 h-7 border-2 border-white">
                        <AvatarFallback className={`bg-gradient-to-br ${["from-pink-400", "from-blue-400", "from-green-400"][i]} text-xs text-white`}>
                          {init}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <Button variant="gradient" size="sm" className="shadow-md">
                    Lihat Trip
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <motion.div
                className="absolute -right-6 top-1/4 bg-white rounded-xl p-4 shadow-lg shadow-amber-500/10"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Map className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Explorer Badge</p>
                    <p className="font-bold text-gray-900">Baru saja unlocked!</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -left-6 bottom-1/4 bg-white rounded-xl p-4 shadow-lg shadow-emerald-500/10"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Co-planning</p>
                    <p className="font-bold text-gray-900">5 teman join</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="aurora" className="mb-4">Fitur Unggulan</Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Semua yang kamu butuhkan<br />
              <span className="gradient-text">untuk trip sempurna</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Map,
                title: "Peta Interaktif",
                desc: "Visualisasi rute hari per hari dengan jarak & estimasi waktu tempuh",
                color: "from-ocean-400 to-blue-500",
                stat: "500+ destinations"
              },
              {
                icon: Sparkles,
                title: "AI Itinerary",
                desc: "Generate rencana perjalanan otomatis sesuai preferensimu",
                color: "from-violet-400 to-purple-500",
                stat: "10K+ itineraries"
              },
              {
                icon: Users,
                title: "Co-Planning",
                desc: "Edit itinerary bareng teman secara real-time",
                color: "from-pink-400 to-rose-500",
                stat: "3+ collaborators avg"
              },
              {
                icon: Wallet,
                title: "Split Bill",
                desc: "Bagi tagihan travel secara adil & kirim ke email",
                color: "from-amber-400 to-orange-500",
                stat: "Rp 2M+ split"
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 space-y-4 shadow-lg border border-gray-100"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
                <p className="text-xs text-gray-400 font-medium">{feature.stat}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="sunset" className="mb-4">Proses Mudah</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Cara Kerja TripPlanner
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, title: "Buat Trip", desc: "Pilih tujuan, tanggal, dan ajak teman untuk一起 merencanakan", icon: Compass },
              { step: 2, title: "Generate AI", desc: "Biarkan AI membuat itinerary optimal dalam hitungan detik", icon: Sparkles },
              { step: 3, title: "Jelajahi", desc: "Bagikan trip kamu ke komunitas atau pesan guide lokal", icon: Globe },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 relative backdrop-blur-sm">
                  <item.icon className="w-10 h-10 text-white" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/80">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="ocean" className="mb-4">Testimoni</Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Dipakai oleh traveler<br />
              <span className="gradient-text">di seluruh Indonesia</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Rina Susanti", avatar: "RS", location: "Jakarta", text: "TripPlanner bikin planning bareng teman jadi mudah banget! Fitur AI-nya keren, hemat waktu.", rating: 5 },
              { name: "Budi Prasetyo", avatar: "BP", location: "Bandung", text: "Split billnya sangat membantu grup kami. Tidak ada lagi drama pembagian tagihan!", rating: 5 },
              { name: "Anisa Rahman", avatar: "AR", location: "Surabaya", text: "Peta interaktifnya membantu kami-optimalkan rute perjalanan. Super recommended!", rating: 5 },
            ].map((testi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] text-white">
                      {testi.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{testi.name}</p>
                    <p className="text-sm text-gray-500">{testi.location}</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{testi.text}</p>
                <div className="flex gap-1">
                  {[...Array(testi.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900">
              Siap merencanakan<br />
              <span className="gradient-text">trip impianmu?</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Bergabung dengan 50.000+ traveler Indonesia. Gratis selamanya.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="gradient" size="xl" onClick={() => setCurrentPage("register")} className="shadow-lg">
                <Compass className="w-5 h-5 mr-2" />
                Daftar Gratis Sekarang
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold gradient-text">TripPlanner</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2025 TripPlanner. Plan together, travel smarter.
            </p>
            <div className="flex items-center gap-4">
              <button className="text-sm text-gray-400 hover:text-white transition-colors">Tentang</button>
              <button className="text-sm text-gray-400 hover:text-white transition-colors">Kebijakan Privasi</button>
              <button className="text-sm text-gray-400 hover:text-white transition-colors">Kontak</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

type AppUser = {
  id: string
  name: string
  email: string
  avatar: string
}

interface LoginPageProps {
  setCurrentPage: (page: Page) => void
  onLoginSuccess: (user: AppUser) => void
  supabaseConfigured: boolean
}

export function LoginPage({ setCurrentPage, onLoginSuccess, supabaseConfigured }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!supabaseConfigured) {
      setError("Supabase belum dikonfigurasi. Lihat SETUP.md untuk petunjuk setup.")
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await signIn(email, password)
      if (error) {
        const msg = error.message
        if (msg.includes("Invalid login credentials")) {
          setError("Email atau password salah.")
        } else if (msg.includes("Email not confirmed")) {
          setError("Email belum dikonfirmasi. Cek inbox email kamu.")
        } else {
          setError(msg)
        }
        setIsLoading(false)
        return
      }
      if (!data.user) {
        setError("Login gagal. Pastikan email dan password benar.")
        setIsLoading(false)
        return
      }
      const u = data.user
      onLoginSuccess({
        id: u.id,
        name: u.user_metadata?.full_name || email.split("@")[0],
        email: u.email || email,
        avatar: (u.user_metadata?.full_name || email[0])
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login gagal"
      if (msg.includes("Invalid login credentials")) {
        setError("Email atau password salah.")
      } else if (msg.includes("Email not confirmed")) {
        setError("Email belum dikonfirmasi. Cek inbox email kamu.")
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError("OAuth akan segera tersedia setelah Supabase dikonfigurasi.")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Compass className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-black">Selamat Datang!</h1>
            <p className="text-muted-foreground mt-2">Masuk ke akun TripPlanner kamu</p>
          </div>

          {/* Google Login */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Masuk dengan Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">atau</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="kamu@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <span className="text-xs text-muted-foreground italic">Belum tersedia</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Masuk
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <button
              onClick={() => setCurrentPage("register")}
              className="font-semibold text-[var(--aurora-start)] hover:underline"
            >
              Daftar gratis
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="text-7xl mb-6">🌏</div>
          <h2 className="text-4xl font-black mb-4 text-gray-900">Mulai Petualanganmu</h2>
          <p className="text-gray-600 max-w-md">
            Rencanakan trip impianmu bersama 50.000+ traveler Indonesia.
            Gratis selamanya.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

interface RegisterPageProps {
  setCurrentPage: (page: Page) => void
  onLoginSuccess: (user: AppUser) => void
  supabaseConfigured: boolean
}

export function RegisterPage({ setCurrentPage, onLoginSuccess, supabaseConfigured }: RegisterPageProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!supabaseConfigured) {
      setError("Supabase belum dikonfigurasi. Lihat SETUP.md untuk petunjuk setup.")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.")
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await signUp(email, password, name)
      if (error) {
        if (error.message.includes("already registered")) {
          setError("Email sudah terdaftar. Coba login.")
        } else {
          setError(error.message)
        }
      } else if (data.user) {
        const u = data.user
        onLoginSuccess({
          id: u.id,
          name: u.user_metadata?.full_name || name,
          email: u.email || email,
          avatar: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        })
      } else {
        // Registration succeeded but no session returned — email confirmation needed
        setSuccess(true)
        setIsLoading(false)
        // Don't redirect immediately — let user read the message first
        return
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registrasi gagal"
      setError(msg)
      setIsLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setError("OAuth akan segera tersedia setelah Supabase dikonfigurasi.")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-black">Buat Akun Baru</h1>
            <p className="text-muted-foreground mt-2">Gratis. Mudah. Tanpa ribet.</p>
          </div>

          {/* Google Register */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleRegister}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Daftar dengan Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">atau</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleRegister} className="space-y-4">

            {/* ✅ Success — Registration succeeded, needs email verification */}
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800 mb-1">Registrasi berhasil!</p>
                    <p className="text-sm text-emerald-700">
                      Kami sudah kirim link verifikasi ke <strong>{email}</strong>.
                      Buka email kamu dan klik link tersebut untuk aktifkan akun.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => {
                    setSuccess(false)
                    setCurrentPage("login")
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Sudah verifikasi? Login di sini
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Masukkan nama kamu"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="kamu@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {!success && (
              <>
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Daftar Gratis
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Dengan mendaftar, kamu menyetujui{" "}
              <button className="text-[var(--aurora-start)] hover:underline">Syarat Layanan</button>
              {" "}dan{" "}
              <button className="text-[var(--aurora-start)] hover:underline">Kebijakan Privasi</button>
            </p>
              </>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <button
              onClick={() => setCurrentPage("login")}
              className="font-semibold text-[var(--aurora-start)] hover:underline"
            >
              Masuk
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="text-7xl mb-6">✈️</div>
          <h2 className="text-4xl font-black mb-6 text-gray-900">Bergabung Gratis</h2>
          <div className="space-y-3 text-left max-w-md mx-auto">
            {[
              "🎯 AI itinerary generator gratis",
              "👥 Co-planning dengan teman",
              "🗺️ Peta interaktif tanpa batas",
              "💰 Split bill otomatis",
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 bg-white/60 rounded-xl p-3"
              >
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-gray-700">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Export as AuthPage object for named imports
export const AuthPage = {
  LandingPage,
  LoginPage,
  RegisterPage,
}