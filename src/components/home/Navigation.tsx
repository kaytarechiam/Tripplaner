import { Map, Sparkles, Receipt, Compass, Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import { cn } from "@/lib/utils"

type Page = "home" | "editor" | "ai" | "splitbill"

interface NavigationProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems = [
  { id: "home" as Page, label: "Dashboard", icon: Compass },
  { id: "editor" as Page, label: "Trip Editor", icon: Map },
  { id: "ai" as Page, label: "AI Generator", icon: Sparkles },
  { id: "splitbill" as Page, label: "Split Bill", icon: Receipt },
]

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate("home")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18 L12 6 L21 18 M7 14 L17 14" />
                <circle cx="12" cy="6" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg gradient-text">TripPlanner</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Plan together, travel smarter</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    currentPage === item.id
                      ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <Button variant="glass" size="sm" className="hidden sm:flex">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              English
            </Button>

            <Button variant="gradient" size="sm" className="hidden sm:flex">
              Get Started
            </Button>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id)
                      setMobileOpen(false)
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                      currentPage === item.id
                        ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white"
                        : "text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}