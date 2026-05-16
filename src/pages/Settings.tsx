import { motion } from "framer-motion"
import {
  ArrowLeft, User, Bell, Shield, Palette, Globe,
  Mail, Lock, Eye, EyeOff, Check, Trash2, LogOut,
  ChevronRight, Moon, Sun, Smartphone, Mail as MailIcon
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Separator } from "../components/ui/separator"
import { cn } from "@/lib/utils"
import { useState } from "react"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface SettingsProps {
  setCurrentPage: (page: Page) => void
  onLogout: () => void
  user: any
}

export function Settings({ setCurrentPage, onLogout, user }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "privacy" | "appearance">("profile")
  const [showPassword, setShowPassword] = useState(false)

  const notificationSettings = [
    { id: 1, label: "Email trip invites", description: "Notifikasi saat diundang ke trip", enabled: true },
    { id: 2, label: "Email comments", description: "Notifikasi saat ada komentar baru", enabled: true },
    { id: 3, label: "Email likes", description: "Notifikasi saat trip kamu di-like", enabled: false },
    { id: 4, label: "Push reminders", description: "Pengingat sebelum tanggal trip", enabled: true },
    { id: 5, label: "Split bill alerts", description: "Notifikasi untuk split bill", enabled: true },
    { id: 6, label: "Weekly digest", description: "Ringkasan aktivitas mingguan", enabled: false },
  ]

  return (
    <div className="pt-16 min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-40 glass-card border-b border-white/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage("home")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">Pengaturan</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-2">
              {[
                { id: "profile", label: "Profil", icon: User },
                { id: "notifications", label: "Notifikasi", icon: Bell },
                { id: "privacy", label: "Privasi", icon: Shield },
                { id: "appearance", label: "Tampilan", icon: Palette },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    activeTab === item.id
                      ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-lg"
                      : "hover:bg-white/10"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}

              <Separator className="my-4" />

              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {activeTab === "profile" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg mb-4">Informasi Profil</h2>

                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="text-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)]">
                          {user?.name?.split(" ").map((n: string) => n[0]).join("") || "US"}
                        </AvatarFallback>
                      </Avatar>
                      <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <User className="w-4 h-4 text-[var(--aurora-start)]" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-bold">{user?.name || "Traveler"}</h3>
                      <p className="text-sm text-muted-foreground">@{user?.email?.split("@")[0] || "traveler"}</p>
                      <Button variant="ghost" size="sm" className="mt-2">
                        Ganti Foto
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nama Lengkap</Label>
                        <Input defaultValue={user?.name || ""} />
                      </div>
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input defaultValue={user?.email?.split("@")[0] || ""} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" defaultValue={user?.email || ""} />
                    </div>

                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <textarea
                        className="w-full h-24 rounded-xl border border-input bg-background px-4 py-2 text-sm resize-none"
                        placeholder="✈️ Traveler enthusiast | 🍜 Foodie | 📸 Photography lover"
                      />
                    </div>

                    <Button variant="gradient">Simpan Perubahan</Button>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg mb-4">Ubah Password</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Password Saat Ini</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type={showPassword ? "text" : "password"} className="pl-10 pr-10" placeholder="••••••••" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Password Baru</Label>
                        <Input type="password" placeholder="Minimal 8 karakter" />
                      </div>
                      <div className="space-y-2">
                        <Label>Konfirmasi Password</Label>
                        <Input type="password" placeholder="Ulangi password baru" />
                      </div>
                    </div>

                    <Button variant="outline">Ubah Password</Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6"
              >
                <h2 className="font-bold text-lg mb-4">Preferensi Notifikasi</h2>
                <p className="text-muted-foreground mb-6">Pilih notifikasi mana yang ingin kamu terima</p>

                <div className="space-y-4">
                  {notificationSettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          setting.label.includes("Email") ? "bg-blue-500/20 text-blue-400" :
                          setting.label.includes("Push") ? "bg-violet-500/20 text-violet-400" :
                          "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {setting.label.includes("Email") ? <MailIcon className="w-5 h-5" /> :
                           setting.label.includes("Push") ? <Smartphone className="w-5 h-5" /> :
                           <Bell className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium">{setting.label}</p>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {}}
                        className={cn(
                          "w-12 h-7 rounded-full relative transition-all",
                          setting.enabled ? "bg-[var(--aurora-start)]" : "bg-gray-600"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all",
                          setting.enabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "privacy" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg mb-4">Privasi Profil</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Profil Publik</p>
                        <p className="text-sm text-muted-foreground">Izinkan orang lain melihat profilmu</p>
                      </div>
                      <button className="w-12 h-7 rounded-full bg-[var(--aurora-start)] relative">
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white shadow" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Tampilkan Trip</p>
                        <p className="text-sm text-muted-foreground">Izinkan orang lain melihat trip kamu</p>
                      </div>
                      <button className="w-12 h-7 rounded-full bg-[var(--aurora-start)] relative">
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white shadow" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg mb-4 text-red-400">Zona Berbahaya</h2>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Hapus Akun
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tindakan ini tidak dapat dibatalkan. Semua data kamu akan dihapus permanen.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "appearance" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6"
              >
                <h2 className="font-bold text-lg mb-4">Tampilan</h2>
                <div className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Tema</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <button className="glass-card-hover p-4 text-center border-2 border-[var(--aurora-start)]">
                        <Sun className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                        <p className="font-medium">Light</p>
                      </button>
                      <button className="glass-card-hover p-4 text-center">
                        <Moon className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                        <p className="font-medium">Dark</p>
                      </button>
                      <button className="glass-card-hover p-4 text-center">
                        <Globe className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        <p className="font-medium">System</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Bahasa</Label>
                    <select className="w-full h-11 rounded-xl border border-input bg-background px-4">
                      <option>Indonesia (ID)</option>
                      <option>English (EN)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}