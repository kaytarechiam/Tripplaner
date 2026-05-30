import { useState, useEffect } from "react"
import {
  Home, MapPin, Sparkles, Globe, Heart,
  Bell, Settings as SettingsIcon, Compass, ArrowLeft,
  Star, Wallet
} from "lucide-react"
import { AuthPage } from "./pages/AuthPage"
import { Dashboard } from "./pages/Dashboard"
import { TripEditorPage } from "./pages/TripEditorPage"
import { AIGeneratorPage } from "./pages/AIGeneratorPage"
import { SplitBillPage } from "./pages/SplitBillPage"
import { Explore } from "./pages/Explore"
import { Profile } from "./pages/Profile"
import { Achievements } from "./pages/Achievements"
import { BucketList } from "./pages/BucketList"
import { Settings } from "./pages/Settings"
import { Notifications } from "./pages/Notifications"
import { TripListPage } from "./pages/TripListPage"
import { supabase } from "./lib/supabase"

type Page =
  | "landing"
  | "login"
  | "register"
  | "home"
  | "editor"
  | "ai"
  | "splitbill"
  | "explore"
  | "profile"
  | "achievements"
  | "bucketlist"
  | "settings"
  | "notifications"
  | "trips"

type AppUser = {
  id: string
  name: string
  email: string
  avatar: string
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing")
  const [user, setUser] = useState<AppUser | null>(null)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // ✅ CONSISTENT navigation handler — semua page change lewat sini
  const navigateTo = (page: Page) => {
    console.debug(`[TripPlanner] navigateTo: ${currentPage} → ${page}`)
    setCurrentPage(page)
  }

  // Back button handler — konsisten pakai navigateTo
  const handleBack = () => {
    console.debug(`[TripPlanner] handleBack → home`)
    setSidebarCollapsed(false)
    navigateTo("home")
  }

  // ✅ Auth state on mount — ini trigger sekali pas load
  useEffect(() => {
    if (!supabase) {
      console.debug("[TripPlanner] No Supabase — staying on landing")
      setSupabaseReady(false)
      return
    }

    setSupabaseReady(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user
        setUser({
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          email: u.email || "",
          avatar: (u.user_metadata?.full_name || u.email?.[0] || "U")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        })
        // ✅ Auth on mount — set initial page KE EPISodenya sekali aja
        setCurrentPage("home")
      }
      // else: stay on landing
    })
  }, []) // ✅ DEPENDENCY ARRAY KOSONG — jalan sekali aja pas mount

  // ✅ Auth listener — hanya untuk AUTH EVENTS, bukan page change
  useEffect(() => {
    if (!supabase) return

    // Track whether we're in password recovery mode
    let pendingPasswordRecovery = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug(`[TripPlanner] Auth event: ${event}`)

      if (event === "PASSWORD_RECOVERY") {
        pendingPasswordRecovery = true
        // Will navigate to settings when SIGNED_IN fires with the recovery session
      } else if (event === "SIGNED_IN" && session?.user) {
        const u = session.user
        setUser({
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          email: u.email || "",
          avatar: (u.user_metadata?.full_name || u.email?.[0] || "U")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        })
        if (pendingPasswordRecovery) {
          pendingPasswordRecovery = false
          navigateTo("settings")
        }
        // ✅ JANGAN override page di sini — biarkan user di page yang mereka pilih
        // setCurrentPage("home") — DIHAPUS karena overwrite navigation user
      } else if (event === "SIGNED_OUT") {
        console.debug("[TripPlanner] Signed out → landing")
        setUser(null)
        navigateTo("landing")
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Notification count
  useEffect(() => {
    if (!supabase || !user) { setUnreadNotifCount(0); return }
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }) => {
        setUnreadNotifCount(count || 0)
      })
  }, [supabase, user])

  // Auth success handler
  const handleLoginSuccess = (loggedInUser: AppUser) => {
    console.debug("[TripPlanner] handleLoginSuccess")
    setUser(loggedInUser)
    navigateTo("home")
  }

  // Logout handler
  const handleLogout = async () => {
    console.debug("[TripPlanner] handleLogout")
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    navigateTo("landing")
  }

  // ✅ Render Auth pages
  if (!user) {
    return (
      <div className="min-h-screen">
        {currentPage === "landing" && (
          <AuthPage.LandingPage
            navigateTo={navigateTo}
            isLoggedIn={false}
            user={null}
          />
        )}
        {currentPage === "login" && (
          <AuthPage.LoginPage
            navigateTo={navigateTo}
            onLoginSuccess={handleLoginSuccess}
            supabaseConfigured={!!supabase}
          />
        )}
        {currentPage === "register" && (
          <AuthPage.RegisterPage
            navigateTo={navigateTo}
            onLoginSuccess={handleLoginSuccess}
            supabaseConfigured={!!supabase}
          />
        )}
      </div>
    )
  }

  // ✅ Render Main App — gradient bg hanya di halaman dg floating navbar
  return (
    <div className={`min-h-screen ${currentPage !== "editor" ? "app-gradient-bg" : ""}`}>
      {/* Dev mode banner */}
      {!supabase && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-800">
          <strong>Dev Mode:</strong> Supabase not configured. Data tidak akan tersimpan.
          Lihat SETUP.md untuk petunjuk setup.
        </div>
      )}

      {/* Navigation — hidden di TripEditorPage karena punya layout sendiri */}
      {currentPage !== "editor" && (
        <MainNav
          currentPage={currentPage}
          navigateTo={navigateTo}
          onBack={handleBack}
          user={user}
          unreadNotifCount={unreadNotifCount}
        />
      )}

      {/* Page Content */}
      {currentPage === "home" && (
        <Dashboard
          navigateTo={navigateTo}
          onLogout={handleLogout}
          user={user}
        />
      )}
      {currentPage === "editor" && (
        <TripEditorPage
          navigateTo={navigateTo}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(s => !s)}
        />
      )}
      {currentPage === "ai" && (
        <AIGeneratorPage navigateTo={navigateTo} />
      )}
      {currentPage === "splitbill" && (
        <SplitBillPage navigateTo={navigateTo} />
      )}
      {currentPage === "explore" && (
        <Explore navigateTo={navigateTo} />
      )}
      {currentPage === "profile" && (
        <Profile navigateTo={navigateTo} onLogout={handleLogout} user={user} />
      )}
      {currentPage === "achievements" && (
        <Achievements navigateTo={navigateTo} />
      )}
      {currentPage === "bucketlist" && (
        <BucketList navigateTo={navigateTo} />
      )}
      {currentPage === "settings" && (
        <Settings navigateTo={navigateTo} onLogout={handleLogout} user={user} />
      )}
      {currentPage === "notifications" && (
        <Notifications navigateTo={navigateTo} />
      )}
      {currentPage === "trips" && (
        <TripListPage navigateTo={navigateTo} user={user} />
      )}
    </div>
  )
}

// ✅ Navigation Component
function MainNav({
  currentPage,
  navigateTo,
  onBack,
  user,
  unreadNotifCount,
}: {
  currentPage: Page
  navigateTo: (page: Page) => void
  onBack: () => void
  user: AppUser
  unreadNotifCount: number
}) {
  const navCenterPages = ["home", "explore", "bucketlist"]
  const showNavCenter = navCenterPages.includes(currentPage)

  const pageTitleMap: Record<string, { label: string; icon: typeof Compass; iconColor: string }> = {
    achievements: { label: "Achievements", icon: Star, iconColor: "text-amber-500" },
    profile: { label: "Profile", icon: Globe, iconColor: "text-blue-500" },
    settings: { label: "Settings", icon: SettingsIcon, iconColor: "text-muted-foreground" },
    notifications: { label: "Notifications", icon: Bell, iconColor: "text-muted-foreground" },
    ai: { label: "AI Generator", icon: Sparkles, iconColor: "text-violet-500" },
    editor: { label: "Trip Editor", icon: MapPin, iconColor: "text-emerald-500" },
    splitbill: { label: "Split Bill", icon: Wallet, iconColor: "text-orange-500" },
  }
  const pageTitle = pageTitleMap[currentPage]

  const navItems = [
    { id: "home" as Page, label: "Dashboard", icon: Home },
    { id: "explore" as Page, label: "Explore", icon: Globe },
    { id: "bucketlist" as Page, label: "Bucket List", icon: Heart },
  ]

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl bg-white/60 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl shadow-black/10 ring-1 ring-white/20">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left — Back (sub-pages) + Logo (nav pages) */}
          <div className="flex items-center gap-3">
            {!showNavCenter ? (
              <button
                onClick={onBack}
                aria-label="Kembali"
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-black/5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:block text-sm font-medium">Kembali</span>
              </button>
            ) : (
              <button
                onClick={() => navigateTo("home")}
                aria-label="TripPlanner"
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center shadow-md">
                  <Compass className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <span className="hidden sm:block font-heading font-bold text-base gradient-text">TripPlanner</span>
              </button>
            )}
          </div>

          {/* Center — Nav items or Page title */}
          <div className="hidden md:flex items-center gap-1">
            {showNavCenter ? (
              navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    aria-label={item.label}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-mid)] text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </button>
                )
              })
            ) : pageTitle ? (
              <div className="flex items-center gap-3">
                <pageTitle.icon className={`w-5 h-5 ${pageTitle.iconColor}`} aria-hidden="true" />
                <span className="text-base font-bold text-foreground">{pageTitle.label}</span>
              </div>
            ) : null}
          </div>

          {/* Right — Quick actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigateTo("notifications")}
              aria-label="Notifikasi"
              className="relative p-2 rounded-xl hover:bg-black/5 transition-colors text-muted-foreground"
            >
              <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigateTo("profile")}
              aria-label={`Profil ${user.name}`}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-black/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center text-white text-xs font-bold">
                {user.avatar}
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground">
                {user.name.split(" ")[0]}
              </span>
            </button>

            <button
              onClick={() => navigateTo("settings")}
              aria-label="Pengaturan"
              className="p-2 rounded-xl hover:bg-black/5 transition-colors text-muted-foreground"
            >
              <SettingsIcon className="w-[18px] h-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden pb-3 flex overflow-x-auto gap-1.5 -mx-2 px-2 scrollbar-hide">
          {showNavCenter ? (
            navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  aria-label={item.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-mid)] text-white shadow-sm"
                      : "bg-black/5 text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {item.label}
                </button>
              )
            })
          ) : (
            <button
              onClick={onBack}
              aria-label="Kembali"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-black/5 text-muted-foreground whitespace-nowrap flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Kembali
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default App
