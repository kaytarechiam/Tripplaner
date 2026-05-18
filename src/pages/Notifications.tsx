import { motion } from "framer-motion"
import {
  Bell, Heart, Users, MessageSquare,
  MapPin, Calendar, Check, X, Mail, Loader2
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getSession } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications"

interface NotificationsProps {
  navigateTo: (page: Page) => void
}

const typeIcons: Record<string, typeof Bell> = {
  ai: Bell,
  like: Heart,
  comment: MessageSquare,
  invite: Users,
  splitbill: Mail,
  badge: Users,
  follow: Users,
  system: Bell,
}

const typeColors: Record<string, string> = {
  ai: "from-emerald-400 to-teal-500",
  like: "from-pink-400 to-rose-500",
  comment: "from-blue-400 to-cyan-500",
  invite: "from-violet-400 to-purple-500",
  splitbill: "from-amber-400 to-orange-500",
  badge: "from-amber-400 to-yellow-500",
  follow: "from-fuchsia-400 to-pink-500",
  system: "from-gray-400 to-gray-500",
}

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export function Notifications({ navigateTo }: NotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    getSession().then(session => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      if (!supabase) { setLoading(false); return }

      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setNotifications(data as NotificationItem[])
          } else {
            setNotifications([])
          }
          setLoading(false)
        })
    })
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const filteredNotifications = filter === "unread"
    ? notifications.filter(n => !n.read)
    : notifications

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    if (supabase) {
      supabase.from('notifications').update({ read: true }).eq('id', id).then(() => {})
    }
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    if (supabase && notifications.length > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length > 0) {
        supabase.from('notifications').update({ read: true }).in('id', unreadIds).then(() => {})
      }
    }
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: "all", label: "Semua" },
            { id: "unread", label: "Belum Dibaca" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === f.id
                  ? "bg-gradient-to-r from-[var(--aurora-start)] to-[var(--aurora-end)] text-white"
                  : "glass-card hover:bg-white/20"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--aurora-start)]/20 to-[var(--aurora-end)]/20 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[var(--aurora-start)]" />
            </div>
            <h3 className="font-bold text-lg mb-2">
              {filter === "unread" ? "Semua sudah dibaca!" : "Belum ada notifikasi"}
            </h3>
            <p className="text-muted-foreground">
              {filter === "unread"
                ? "Tidak ada notifikasi baru"
                : "Aktifitas trip dan interaksi akan muncul di sini"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification, i) => {
              const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Bell
              const color = typeColors[notification.type] || "from-gray-400 to-gray-500"
              const avatar = notification.title?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "NT"

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "glass-card-hover p-4 flex items-start gap-4 transition-all",
                    !notification.read && "border-l-4 border-l-[var(--aurora-start)]"
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className={`bg-gradient-to-br ${color} text-sm`}>
                        {avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{notification.title}</span>
                    </p>
                    {notification.body && (
                      <p className="text-sm text-muted-foreground mt-1">{notification.body}</p>
                    )}
                    {notification.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-[var(--aurora-start)]" />
                    )}
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Check className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}