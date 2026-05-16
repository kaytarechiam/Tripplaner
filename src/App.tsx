import { useState, useEffect } from "react"
import {
  Home, MapPin, Sparkles, Globe, Heart,
  Bell, Settings as SettingsIcon, Compass, ArrowLeft
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
  const [prevPage, setPrevPage] = useState<Page>("home")

  // Track previous page for back navigation
  const handleSetPage = (page: Page) => {
    if (page !== currentPage) {
      setPrevPage(currentPage)
    }
    setSidebarCollapsed(false) // reset sidebar when navigating
    setCurrentPage(page)
  }

  const handleBack = () => {
    // Go to previous page (home by default)
    setSidebarCollapsed(false)
    setCurrentPage("home")
  }

  // Fetch unread notification count for nav bell
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

  // Check Supabase session on mount
  useEffect(() => {
    if (!supabase) {
      console.warn("[TripPlanner] Supabase not configured — dev mode")
      setSupabaseReady(false)
      return
    }

    // Get initial session
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
        setCurrentPage("home")
      }
      setSupabaseReady(true)
    })

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
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
          setCurrentPage("home")
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setCurrentPage("landing")
        }
      }
    )

    setSupabaseReady(true)
    return () => subscription.unsubscribe()
  }, [supabase, user])

  // Update nav unread count whenever user visits notifications page
  useEffect(() => {
    if (currentPage === "notifications" && supabase && user) {
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .then(({ count }) => setUnreadNotifCount(count || 0))
    }
  }, [currentPage, supabase, user])

  // ─── Auth Handlers (passed to AuthPage) ────────────────
  const handleLoginSuccess = (loggedInUser: AppUser) => {
    setUser(loggedInUser)
    setCurrentPage("home")
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setCurrentPage("landing")
  }

  // ─── Render ────────────────────────────────────────────

  // Not logged in → show landing/login/register
  if (!user) {
    return (
      <div className="min-h-screen">
        {currentPage === "landing" && (
          <AuthPage.LandingPage
            setCurrentPage={setCurrentPage}
            isLoggedIn={false}
            user={null}
          />
        )}
        {currentPage === "login" && (
          <AuthPage.LoginPage
            setCurrentPage={setCurrentPage}
            onLoginSuccess={handleLoginSuccess}
            supabaseConfigured={!!supabase}
          />
        )}
        {currentPage === "register" && (
          <AuthPage.RegisterPage
            setCurrentPage={setCurrentPage}
            onLoginSuccess={handleLoginSuccess}
            supabaseConfigured={!!supabase}
          />
        )}
      </div>
    )
  }

  // ─── Logged in — show main app ───────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Dev mode banner */}
      {!supabase && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-800">
          <strong>Dev Mode:</strong> Supabase not configured. Data tidak akan tersimpan.
          Lihat SETUP.md untuk petunjuk setup.
        </div>
      )}

      {/* Navigation */}
      <MainNav
        currentPage={currentPage}
        setCurrentPage={handleSetPage}
        onLogout={handleLogout}
        user={user}
        unreadNotifCount={unreadNotifCount}
        onBack={handleBack}
      />

      {/* Page Content */}
      {currentPage === "home" && (
        <Dashboard
          setCurrentPage={setCurrentPage}
          onLogout={handleLogout}
          user={user}
        />
      )}
      {currentPage === "editor" && <TripEditorPage setCurrentPage={handleSetPage} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(s => !s)} />}
      {currentPage === "ai" && <AIGeneratorPage setCurrentPage={setCurrentPage} />}
      {currentPage === "splitbill" && <SplitBillPage setCurrentPage={setCurrentPage} />}
      {currentPage === "explore" && <Explore setCurrentPage={setCurrentPage} />}
      {currentPage === "profile" && (
        <Profile setCurrentPage={setCurrentPage} onLogout={handleLogout} user={user} />
      )}
      {currentPage === "achievements" && <Achievements setCurrentPage={setCurrentPage} />}
      {currentPage === "bucketlist" && <BucketList setCurrentPage={setCurrentPage} />}
      {currentPage === "settings" && (
        <Settings setCurrentPage={setCurrentPage} onLogout={handleLogout} user={user} />
      )}
      {currentPage === "notifications" && (
        <Notifications setCurrentPage={setCurrentPage} />
      )}
    </div>
  )
}

// ─── Navigation Component ───────────────────────────────
function MainNav({
  currentPage,
  setCurrentPage,
  onLogout,
  user,
  unreadNotifCount,
  onBack,
}: {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  onLogout: () => void
  user: AppUser
  unreadNotifCount: number
  onBack?: () => void
}) {
  // Show contextual back button on editor sub-pages
  const showBack = (currentPage === "editor" || currentPage === "ai" || currentPage === "splitbill")

  const navItems = [
    { id: "home" as Page, label: "Dashboard", icon: Home },
    { id: "explore" as Page, label: "Explore", icon: Globe },
    { id: "bucketlist" as Page, label: "Bucket List", icon: Heart },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left — Back button (contextual) + Logo */}
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={onBack}
                aria-label="Kembali ke Dashboard"
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:block text-sm font-medium">Kembali</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentPage("home")}
                aria-label="TripPlanner"
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center shadow-md">
                  <Compass className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <h1 className="font-heading font-bold text-lg gradient-text">TripPlanner</h1>
              </button>
            )}
          </div>

          {/* Center Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  aria-label={item.label}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-mid)] text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage("notifications")}
              aria-label="Notifikasi"
              className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentPage("profile")}
              aria-label={`Profil ${user.name}`}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center text-white text-sm font-bold">
                {user.avatar}
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground">
                {user.name.split(" ")[0]}
              </span>
            </button>

            <button
              onClick={() => setCurrentPage("settings")}
              aria-label="Pengaturan"
              className="p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground"
            >
              <SettingsIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden py-3 border-t border-border flex overflow-x-auto gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                aria-label={item.label}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-mid)] text-white"
                    : "bg-white border border-border text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default App
