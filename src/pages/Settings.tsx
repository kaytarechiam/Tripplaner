import { motion } from "framer-motion"
import {
  User, Bell, Shield, Palette, Globe,
  Mail, Lock, Eye, EyeOff, Check, Trash2, LogOut,
  ChevronRight, Moon, Sun, Smartphone, Upload, Camera, Loader2, CheckCircle2
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Separator } from "../components/ui/separator"
import { Switch } from "../components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface SettingsProps {
  navigateTo: (page: Page) => void
  onLogout: () => void
  user: any
  onUserUpdate?: (user: any) => void
}

type NotificationSetting = {
  id: number
  label: string
  description: string
  enabled: boolean
  icon: React.ElementType
  colorClass: string
}

export function Settings({ navigateTo, onLogout, user, onUserUpdate }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "privacy" | "appearance">("profile")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // ── Profile state ──────────────────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name || "")
  const [profileUsername, setProfileUsername] = useState(user?.email?.split("@")[0] || "")
  const [profileBio, setProfileBio] = useState("")
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(user?.avatar || "")
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Password state ────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  // ── Notifications state ──────────────────────────────────────
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 1, label: "Email trip invites", description: "Notifikasi saat diundang ke trip", enabled: true, icon: Mail, colorClass: "bg-blue-500/20 text-blue-400" },
    { id: 2, label: "Email comments", description: "Notifikasi saat ada komentar baru", enabled: true, icon: Mail, colorClass: "bg-blue-500/20 text-blue-400" },
    { id: 3, label: "Email likes", description: "Notifikasi saat trip kamu di-like", enabled: false, icon: Mail, colorClass: "bg-blue-500/20 text-blue-400" },
    { id: 4, label: "Push reminders", description: "Pengingat sebelum tanggal trip", enabled: true, icon: Smartphone, colorClass: "bg-violet-500/20 text-violet-400" },
    { id: 5, label: "Split bill alerts", description: "Notifikasi untuk split bill", enabled: true, icon: Bell, colorClass: "bg-emerald-500/20 text-emerald-400" },
    { id: 6, label: "Weekly digest", description: "Ringkasan aktivitas mingguan", enabled: false, icon: Bell, colorClass: "bg-emerald-500/20 text-emerald-400" },
  ])
  const [notifSaving, setNotifSaving] = useState(false)

  // ── Privacy state ────────────────────────────────────────────
  const [publicProfile, setPublicProfile] = useState(true)
  const [showTrips, setShowTrips] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Appearance state ─────────────────────────────────────────
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    (localStorage.getItem("theme") as "light" | "dark" | "system") || "system"
  )
  const [language, setLanguage] = useState("id")
  const [savingAppearance, setSavingAppearance] = useState(false)

  // ── Helpers ────────────────────────────────────────────────────
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  // ── Profile: Change Photo ────────────────────────────────────
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setProfileLoading(true)
    setProfileError("")

    try {
      const fileExt = file.name.split(".").pop()
      const filePath = `avatars/${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase!.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase!.storage
        .from("avatars")
        .getPublicUrl(filePath)

      setProfileAvatarUrl(urlData.publicUrl)

      await supabase!.from("profiles").upsert({
        id: user.id,
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })

      if (onUserUpdate) {
        onUserUpdate({ ...user, avatar: urlData.publicUrl })
      }
    } catch (err: any) {
      console.error("Avatar upload error:", err)
      setProfileError("Gagal upload foto. Coba lagi.")
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Profile: Save Changes ────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return
    setProfileLoading(true)
    setProfileError("")
    setProfileSuccess(false)

    try {
      // Update auth metadata
      const { error: authError } = await supabase!.auth.updateUser({
        data: { name: profileName },
      })
      if (authError) throw authError

      // Update profiles table
      const { error: profileError } = await supabase!.from("profiles").upsert({
        id: user.id,
        name: profileName,
        username: profileUsername,
        bio: profileBio,
        avatar_url: profileAvatarUrl,
        updated_at: new Date().toISOString(),
      })
      if (profileError) throw profileError

      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)

      if (onUserUpdate) {
        onUserUpdate({ ...user, name: profileName })
      }
    } catch (err: any) {
      console.error("Save profile error:", err)
      setProfileError(err.message || "Gagal menyimpan.")
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Password: Change ─────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!user) return
    setPasswordError("")
    setPasswordSuccess(false)

    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Password baru dan konfirmasi tidak cocok.")
      return
    }

    setPasswordLoading(true)
    try {
      // Re-authenticate first
      const { error: signInError } = await supabase!.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) throw new Error("Password saat ini salah.")

      const { error: updateError } = await supabase!.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError

      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      console.error("Change password error:", err)
      setPasswordError(err.message || "Gagal mengubah password.")
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── Notifications: Toggle ────────────────────────────────────
  const handleNotificationToggle = async (id: number, enabled: boolean) => {
    if (!user || !supabase) return
    setNotifSaving(true)

    const updated = notifications.map((n) => (n.id === id ? { ...n, enabled } : n))
    setNotifications(updated)

    try {
      await supabase.from("notification_settings").upsert({
        user_id: user.id,
        setting_id: id,
        enabled,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      // Revert on error
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, enabled: !enabled } : n)))
    } finally {
      setNotifSaving(false)
    }
  }

  // ── Appearance: Theme ────────────────────────────────────────
  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)

    setSavingAppearance(true)
    try {
      if (newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }

      if (user && supabase) {
        await supabase.from("profiles").update({ theme_preference: newTheme }).eq("id", user.id)
      }
    } finally {
      setSavingAppearance(false)
    }
  }

  // ── Appearance: Language ─────────────────────────────────────
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  // ── Delete Account ───────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!user || !supabase) return
    setDeleteLoading(true)
    try {
      // Delete user data from profiles
      await supabase.from("profiles").delete().eq("id", user.id)
      // Sign out
      await onLogout()
    } catch (err) {
      console.error("Delete account error:", err)
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="pt-16 min-h-screen">
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
                {/* Profile Info Card */}
                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg mb-4">Informasi Profil</h2>

                  <div className="flex items-center gap-6 mb-6">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        {profileAvatarUrl ? (
                          <AvatarImage src={profileAvatarUrl} alt={profileName} />
                        ) : null}
                        <AvatarFallback className="text-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)]">
                          {getInitials(profileName || "US")}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={handleAvatarClick}
                        disabled={profileLoading}
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {profileLoading ? (
                          <Loader2 className="w-4 h-4 text-[var(--aurora-start)] animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-[var(--aurora-start)]" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold">{profileName || "Traveler"}</h3>
                      <p className="text-sm text-muted-foreground">@{profileUsername || "traveler"}</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={handleAvatarClick}>
                        Ganti Foto
                      </Button>
                    </div>
                  </div>

                  {profileError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Perubahan berhasil disimpan!
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nama Lengkap</Label>
                        <Input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Nama lengkap kamu"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input
                          value={profileUsername}
                          onChange={(e) => setProfileUsername(e.target.value)}
                          placeholder="username"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={user?.email || ""} disabled className="opacity-60" />
                    </div>

                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <textarea
                        value={profileBio}
                        onChange={(e) => setProfileBio(e.target.value)}
                        className="w-full h-24 rounded-xl border border-input bg-background px-4 py-2 text-sm resize-none"
                        placeholder="✈️ Traveler enthusiast | 🍜 Foodie | 📸 Photography lover"
                      />
                    </div>

                    <Button
                      variant="gradient"
                      onClick={handleSaveProfile}
                      disabled={profileLoading}
                      className="flex items-center gap-2"
                    >
                      {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Simpan Perubahan
                    </Button>
                  </div>
                </div>

                {/* Change Password Card */}
                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg mb-4">Ubah Password</h2>

                  {passwordError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Password berhasil diubah!
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Password Saat Ini</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-10 pr-10"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
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

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Password Baru</Label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Minimal 8 karakter"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Konfirmasi Password</Label>
                        <Input
                          type="password"
                          placeholder="Ulangi password baru"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleChangePassword}
                      disabled={passwordLoading || !currentPassword || !newPassword}
                      className="flex items-center gap-2"
                    >
                      {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Ubah Password
                    </Button>
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

                {notifSaving && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </div>
                )}

                <div className="space-y-4">
                  {notifications.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", setting.colorClass)}>
                          <setting.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{setting.label}</p>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={setting.enabled}
                        onCheckedChange={(checked: boolean) => handleNotificationToggle(setting.id, checked)}
                      />
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
                      <Switch
                        checked={publicProfile}
                        onCheckedChange={setPublicProfile}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Tampilkan Trip</p>
                        <p className="text-sm text-muted-foreground">Izinkan orang lain melihat trip kamu</p>
                      </div>
                      <Switch
                        checked={showTrips}
                        onCheckedChange={setShowTrips}
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg mb-4 text-red-400">Zona Berbahaya</h2>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
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
                      {[
                        { id: "light", label: "Light", icon: Sun, color: "text-amber-500" },
                        { id: "dark", label: "Dark", icon: Moon, color: "text-indigo-500" },
                        { id: "system", label: "System", icon: Globe, color: "text-emerald-500" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleThemeChange(t.id as typeof theme)}
                          className={cn(
                            "glass-card-hover p-4 text-center border-2 transition-all",
                            theme === t.id
                              ? "border-[var(--aurora-start)] bg-gradient-to-br from-[var(--aurora-start)]/10 to-[var(--aurora-end)]/10"
                              : "border-transparent hover:border-white/20"
                          )}
                        >
                          <t.icon className={cn("w-8 h-8 mx-auto mb-2", t.color)} />
                          <p className="font-medium">{t.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Bahasa</Label>
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="w-full h-11 rounded-xl border border-input bg-background px-4"
                    >
                      <option value="id">Indonesia (ID)</option>
                      <option value="en">English (EN)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Hapus Akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua data kamu akan dihapus permanen, termasuk trip, bucket list, dan achievement.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Ya, Hapus Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}