---
name: TripPlanner
description: Collaborative trip planning platform with AI itinerary generation, interactive maps, and social discovery.
colors:
  aurora-start: "#667eea"
  aurora-mid: "#764ba2"
  aurora-end: "#f093fb"
  aurora-gradient: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)"
  ocean-deep: "#1e40af"
  ocean-light: "#0ea5e9"
  sunset-warm: "#f97316"
  sunset-pink: "#fda085"
  coral-accent: "#f5576c"
  surface-base: "hsl(0 0% 98%)"
  surface-card: "hsl(0 0% 100%)"
  text-primary: "hsl(222 47% 11%)"
  text-muted: "hsl(215 16% 35%)"
  border: "hsl(214 32% 88%)"
  # Map route colors — satu warna per hari, konsisten di marker + polyline + sidebar chip
  map-day-1: "#f97316"
  map-day-2: "#0ea5e9"
  map-day-3: "#10b981"
  map-day-4: "#8b5cf6"
  map-day-5: "#f59e0b"
  map-day-6: "#ec4899"
  map-day-7: "#14b8a6"
  # Dark mode surfaces
  dark-surface-base: "#0f0f1a"
  dark-surface-card: "#1a1a2e"
  dark-surface-overlay: "#1e1e32"
  dark-border: "rgba(255,255,255,0.08)"
typography:
  display:
    fontFamily: "Satoshi, Inter, sans-serif"
    fontWeight: 700
    lineHeight: 1.1
    clamp: "clamp(2rem, 5vw, 3.5rem)"
  heading:
    fontFamily: "Satoshi, Inter, sans-serif"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Satoshi, Inter, sans-serif"
    fontWeight: 600
    size: "1.125–1.25rem"
    lineHeight: 1.3
  body:
    fontFamily: "Inter, DM Sans, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
    size: "0.9375rem"
    maxLineLength: "70ch"
  label:
    fontFamily: "Inter, sans-serif"
    fontWeight: 500
    size: "0.75–0.8125rem"
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  16: "64px"
components:
  button-primary:
    background: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)"
    textColor: "#ffffff"
    rounded: "16px"
    padding: "12px 24px"
    hover-shadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
    hover-transform: "scale(1.02)"
  button-secondary:
    background: "hsl(210 40% 96%)"
    textColor: "hsl(222 47% 11%)"
    rounded: "16px"
  button-ghost:
    background: "transparent"
    textColor: "hsl(215 16% 35%)"
    hover-background: "hsl(210 40% 94%)"
  button-destructive:
    background: "#f5576c"
    textColor: "#ffffff"
  card-default:
    background: "hsl(0 0% 100%)"
    border: "1px solid hsl(214 32% 88%)"
    rounded: "16px"
    shadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)"
  card-hover:
    border-color: "rgba(102, 126, 234, 0.3)"
    shadow: "0 10px 25px rgba(0,0,0,0.08)"
    transform: "translateY(-2px)"
  input-default:
    border: "1px solid hsl(214 32% 88%)"
    background: "hsl(0 0% 100%)"
    rounded: "16px"
    padding: "12px 16px"
    height: "44px"
    focus-ring: "0 0 0 3px rgba(102, 126, 234, 0.2)"
  badge-aurora:
    background: "rgba(102, 126, 234, 0.12)"
    border: "1px solid rgba(102, 126, 234, 0.4)"
    textColor: "#4f46e5"
  badge-sunset:
    background: "rgba(249, 115, 22, 0.12)"
    border: "1px solid rgba(245, 87, 108, 0.4)"
    textColor: "#ea580c"
  map-marker-active:
    background: "#667eea"
    textColor: "#ffffff"
    shadow: "0 4px 12px rgba(102,126,234,0.5)"
    scale-hover: 1.15
  map-marker-hotel:
    background: "hsl(222 47% 11%)"
    textColor: "#ffffff"
    size: "larger"
    icon: "Star"
---

# DESIGN.md — TripPlanner

> Design system reference untuk AI coding agents. Drop file ini ke root project dan instruksikan agent untuk mengikutinya saat build UI. **Baca seluruh file ini sebelum menulis satu baris kode pun.**

---

## 1. Creative Direction — "The Warm Horizon"

TripPlanner terasa seperti momen sebelum perjalanan dimulai: excitement saat planning, kejelasan mengetahui tujuan, dan kehangatan melakukannya bersama orang yang kamu sayangi. Interface ini tidak terasa seperti software — terasa seperti membuka peta di pagi yang cerah.

**Character:** Friendly, organized, quietly premium. Tidak corporate, tidak chaotic. Hangat tanpa terasa manis berlebihan. Estetika yang membangun kepercayaan lewat kejelasan dan memberikan momen menyenangkan saat diperhatikan.

**Design Philosophy:**
- **Map-centric** — peta bukan fitur tambahan, dia adalah canvas utama. UI memeluk peta, bukan mengganggunya.
- **Collaborative feel** — avatar, warna per-user, real-time indicators. Terasa seperti kerja bareng, bukan solo.
- **Clarity first** — layout bisa dibaca sekilas. Traveler sedang planning trip, bukan membaca essay.
- **Tonal depth** — kedalaman visual dari perbedaan lightness surface, bukan shadow yang berat.

**Density:** Medium. Card-based layout. Sidebar dan panel bisa padat tapi harus breathable. Variasikan spacing untuk ritme visual — jangan uniform padding di mana-mana.

---

## 2. Colors — The Twilight Sail Palette

Aurora palette membangkitkan langit senja — ungu yang makin dalam ke pink di cakrawala. Hangat, bukan dingin; optimistis, bukan agresif.

### Primary — Aurora
| Token | Value | Penggunaan |
|-------|-------|------------|
| `aurora-start` | `#667eea` | Primary buttons, active nav, logo mark, key CTAs |
| `aurora-mid` | `#764ba2` | Gradient midpoint, depth pada transisi |
| `aurora-end` | `#f093fb` | Gradient terminus, hover accent |
| `aurora-gradient` | `linear-gradient(135deg, #667eea, #764ba2, #f093fb)` | Hanya CTA utama & brand accent |

### Secondary — Warm Action
| Token | Value | Penggunaan |
|-------|-------|------------|
| `sunset-warm` | `#f97316` | Secondary accent, "do this now" CTA |
| `sunset-pink` | `#fda085` | Gradient pair sunset, dekoratif |
| `coral-accent` | `#f5576c` | Destructive, error, urgency |

### Tertiary — Functional
| Token | Value | Penggunaan |
|-------|-------|------------|
| `ocean-light` | `#0ea5e9` | Info, links |
| `ocean-deep` | `#1e40af` | Strong contrast text |
| `success` | `#10b981` | Success state |
| `warning` | `#f59e0b` | Warning, caution |

### Neutral — Tonal Surface Stack
Sistem menggunakan **tonal layering**, bukan shadow, sebagai sinyal depth utama.

| Token | Value | Penggunaan |
|-------|-------|------------|
| `surface-base` | `hsl(0 0% 98%)` | Page background — near-white |
| `surface-card` | `hsl(0 0% 100%)` | Card & panel — pure white |
| `border` | `hsl(214 32% 88%)` | Divider, input stroke, card outline |
| `text-primary` | `hsl(222 47% 11%)` | Heading dan primary copy |
| `text-muted` | `hsl(215 16% 35%)` | Secondary text, label, description |

### Map Route Colors — Per Hari
Warna ini digunakan **secara konsisten di tiga tempat sekaligus**: marker peta, polyline rute, dan day chip di sidebar. Jangan pakai warna berbeda untuk hari yang sama di context berbeda.

| Token | Value | Hari |
|-------|-------|------|
| `map-day-1` | `#f97316` | Hari 1 |
| `map-day-2` | `#0ea5e9` | Hari 2 |
| `map-day-3` | `#10b981` | Hari 3 |
| `map-day-4` | `#8b5cf6` | Hari 4 |
| `map-day-5` | `#f59e0b` | Hari 5 |
| `map-day-6` | `#ec4899` | Hari 6 |
| `map-day-7` | `#14b8a6` | Hari 7 |

Untuk trip >7 hari: loop ulang dari `map-day-1` dengan opacity lebih rendah.

### Named Rules
**The Accent Scarcity Rule.** Aurora gradient muncul di ≤15% layar mana pun. Satu penggunaan gradient yang tegas lebih baik dari tiga yang ragu-ragu. Gradient yang ada di mana-mana jadi wallpaper dan berhenti punya makna.

---

## 3. Typography

**Font setup** di `app/layout.tsx`:
```css
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,600,500,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
```

| Role | Font | Weight | Size | Line Height | Penggunaan |
|------|------|--------|------|-------------|------------|
| Display | Satoshi | 700 | `clamp(2rem, 5vw, 3.5rem)` | 1.1 | Hero headline, page title, marketing CTA |
| Heading | Satoshi | 600 | `1.5–1.75rem` | 1.2 | Section heading, card title, nav active |
| Title | Satoshi | 600 | `1.125–1.25rem` | 1.3 | List item title, dialog heading |
| Body | Inter | 400 | `0.9375rem` | 1.6 | Paragraph, description. Max `70ch`. |
| Label | Inter | 500 | `0.75–0.8125rem` | 1.4 | Badge, tag, metadata, helper text |

**Aturan:**
- Jangan gunakan uppercase untuk dekorasi — hanya saat semantically required.
- Jangan gunakan gradient text pada heading.
- Jangan gunakan pure black (`#000000`) — gunakan `hsl(222 47% 11%)`.

---

## 4. Elevation & Shadows

TripPlanner menggunakan **tonal surface layering** sebagai sinyal depth utama.

| Level | Surface | Penggunaan |
|-------|---------|------------|
| 0 — Base | `hsl(0 0% 98%)` | Page background |
| 1 — Card | `hsl(0 0% 100%)` | Cards, panels |
| 2 — Elevated | White + blur | Dropdown, tooltip, popover |
| 3 — Overlay | White + dark backdrop | Dialog, modal, drawer |

**Shadow tokens** — hanya muncul sebagai respons state (hover, focus), bukan pada elemen diam:
```css
--shadow-card:    0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
--shadow-card-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
--shadow-card-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
--shadow-glass:   0 8px 32px rgba(31, 38, 135, 0.15);  /* sangat hemat */
--shadow-glow:    0 0 40px rgba(102, 126, 234, 0.4);   /* sangat hemat */
--shadow-map:     0 2px 20px rgba(0,0,0,0.18);         /* panel di atas peta */
```

**The Flat-By-Default Rule.** Surface datar saat diam. Shadow muncul hanya sebagai respons state. Kalau elemen tidak diinteraksi, tidak perlu shadow.

---

## 5. Border Radius

```css
--radius-sm:   6px     /* Badge, chip kecil */
--radius-md:   8px     /* Input, button kecil */
--radius-lg:   12px    /* Card, panel */
--radius-xl:   16px    /* Modal, large card, button primary */
--radius-2xl:  20px    /* Bottom sheet, drawer */
--radius-full: 9999px  /* Pill, avatar, tag */
```

---

## 6. Spacing

```css
--space-1: 4px  | --space-2: 8px   | --space-3: 12px  | --space-4: 16px
--space-5: 20px | --space-6: 24px  | --space-8: 32px  | --space-10: 40px
--space-12: 48px | --space-16: 64px
```

**Grid layout Trip Editor:**
```css
grid-template-columns: 380px 1fr; /* sidebar + peta */
/* sidebar: fixed 380px, overflow-y: scroll, height: calc(100vh - 64px) */
/* peta: flex: 1, full height */
/* mobile: stack vertikal, peta 50vh, itinerary 50vh */
```

---

## 7. Components

### Buttons
```
Primary:     bg = aurora-gradient | text = white | radius = 16px | padding = 12px 24px
             hover: scale(1.02), shadow = 0 8px 24px rgba(102,126,234,0.3)
Secondary:   bg = hsl(210 40% 96%) | text = text-primary | radius = 16px
Ghost:       bg = transparent | text = text-muted | hover bg = hsl(210 40% 94%)
Destructive: bg = #f5576c | text = white
Sizes:       sm h=32px | md h=40px | lg h=48px
```

### Cards
```
bg        = hsl(0 0% 100%)
border    = 1px solid hsl(214 32% 88%)
radius    = 16px
padding   = 16–24px
shadow    = --shadow-card (at rest)
hover:    border-color → rgba(102,126,234,0.3) | shadow → --shadow-card-md | translateY(-2px)
transition: 200ms ease-out
```

### Inputs & Forms
```
bg          = white
border      = 1px solid hsl(214 32% 88%)
radius      = 16px
height      = 44px
padding     = 12px 16px
focus ring  = 0 0 0 3px rgba(102,126,234,0.2)
error       = border #f5576c + background tint merah sangat muda
placeholder = text-muted
```

### Badges / Chips
```
aurora:  bg rgba(102,126,234,0.12) | border rgba(102,126,234,0.4) | text #4f46e5
sunset:  bg rgba(249,115,22,0.12)  | border rgba(245,87,108,0.4)  | text #ea580c
success: bg rgba(16,185,129,0.12)  | border rgba(16,185,129,0.4)  | text #059669
warning: bg rgba(245,158,11,0.12)  | border rgba(245,158,11,0.4)  | text #d97706
error:   bg rgba(245,87,108,0.12)  | border rgba(245,87,108,0.4)  | text #dc2626
radius   = --radius-full | padding = 2px 10px | font = Inter 500, 0.75rem
```

### Avatars
```
shape    = circular (radius-full)
sizes    = sm:24px | md:32px | lg:40px | xl:48px
stacked  = margin-left: -8px, border: 2px solid white
fallback = initials, background dari hash nama menggunakan warna map-day-*
```

### Navigation
```
style      = fixed top bar, 64px height
background = glass saat konten scroll di belakang (backdrop-filter: blur(12px))
active     = aurora gradient pill, white text
inactive   = transparent, text-muted, hover bg muncul
mobile     = horizontal scrollable pill row di bawah top bar
```

### Map Markers (Custom SVG — jangan pakai default Google pin)
```
shape    = teardrop custom SVG
active   = bg #667eea | text white | shadow glow aurora
inactive = bg white | border 2px solid warna hari | text warna hari
hotel    = icon Star | bg hsl(222 47% 11%) | text white | ukuran lebih besar
hover    = scale(1.15), transition 100ms
number   = nomor urut kunjungan di dalam marker
```

---

## 8. Component Library — shadcn/ui

Gunakan **shadcn/ui** sebagai base component library.

```bash
npx shadcn@latest init
# Pilih base color: neutral | CSS variables: yes
```

**Override CSS variables** di `app/globals.css`:
```css
@layer base {
  :root {
    --background:          0 0% 98%;
    --foreground:          222 47% 11%;
    --card:                0 0% 100%;
    --card-foreground:     222 47% 11%;
    --primary:             248 84% 70%;
    --primary-foreground:  0 0% 100%;
    --secondary:           210 40% 96%;
    --secondary-foreground:222 47% 11%;
    --muted:               210 40% 96%;
    --muted-foreground:    215 16% 35%;
    --border:              214 32% 88%;
    --input:               214 32% 88%;
    --ring:                248 84% 70%;
    --radius:              0.75rem;
  }
  .dark {
    --background:          240 25% 8%;
    --foreground:          0 0% 98%;
    --card:                240 25% 11%;
    --card-foreground:     0 0% 98%;
    --border:              240 10% 18%;
    --input:               240 10% 18%;
    --muted:               240 10% 18%;
    --muted-foreground:    215 16% 65%;
  }
}
```

**Install semua komponen (jalankan sekaligus):**
```bash
npx shadcn@latest add button card input label badge avatar \
  dialog drawer dropdown-menu tabs tooltip toast skeleton \
  separator scroll-area calendar popover command sheet \
  progress slider switch textarea table accordion \
  alert-dialog select radio-group checkbox
```

---

## 9. Charting — Recharts

Gunakan **Recharts** untuk semua visualisasi data.

```bash
npm install recharts
```

| Halaman | Chart | Komponen Recharts |
|---------|-------|-------------------|
| Budget | Breakdown per kategori | `PieChart` + `Cell` + custom `Tooltip` |
| Budget | Biaya per hari | `BarChart` horizontal |
| Admin | Pertumbuhan user | `LineChart` + `Area` |
| Admin | Trip per minggu | `BarChart` |
| Guide Profile | Rating breakdown | `BarChart` horizontal |

**Styling wajib — selalu override default Recharts:**
```tsx
// Custom Tooltip — jangan pakai default
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[hsl(222_47%_11%)] text-white rounded-xl px-3 py-2 text-sm shadow-lg">
      {payload[0].name}: <strong>{payload[0].value}</strong>
    </div>
  )
}

// Warna: gunakan map-day-* colors untuk konsistensi
const CHART_COLORS = ['#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b']

// Grid styling
<CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" opacity={0.5} />

// Axis styling
<XAxis tick={{ fontFamily: 'Inter', fontSize: 12, fill: 'hsl(215 16% 35%)' }} />
<YAxis tick={{ fontFamily: 'Inter', fontSize: 12, fill: 'hsl(215 16% 35%)' }} />
```

---

## 10. Icons — Lucide React

Sudah bundled dengan shadcn. Gunakan sebagai satu-satunya icon library.

**Default size: 18px.** Stick ke 14 / 18 / 24 / 32px — jangan pakai ukuran random.

```
Map & Navigation:  MapPin, Map, Navigation, Compass, Route, Globe
Trip & Travel:     Plane, CalendarDays, Clock, Users, Luggage, Ticket
Places:            Hotel, Coffee, Camera, TreePine, UtensilsCrossed, Building
Actions:           Plus, Edit2, Trash2, Share2, Download, Copy, ExternalLink
Status:            CheckCircle2, AlertTriangle, Info, XCircle, Loader2
UI:                ChevronRight, ChevronDown, Menu, X, Search, Filter, SlidersHorizontal
Collaboration:     UserPlus, MessageSquare, Bell, Eye, Lock
Weather:           Sun, Cloud, CloudRain, CloudSnow, Wind, Thermometer
Money:             Wallet, Receipt, SplitSquareHorizontal, CreditCard
AI:                Sparkles, Wand2, Bot, BrainCircuit
```

---

## 11. Animation & Motion

```bash
npm install framer-motion
```

**Prinsip:** Motion untuk feedback dan orientasi — bukan dekorasi. Enter/exit terasa natural. Pilih 1–2 momen animasi bermakna per halaman, jangan stack berlebihan.

**Timing standar:**
```ts
const micro      = { duration: 0.15, ease: 'easeOut' }           // hover, focus
const transition = { duration: 0.25, ease: [0.16, 1, 0.3, 1] }  // panel, drawer
const page       = { duration: 0.35, ease: [0.16, 1, 0.3, 1] }  // page change
const stagger    = { staggerChildren: 0.06 }                      // list items
```

**Animasi wajib:**
```ts
// Page enter
{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

// Card list stagger
{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

// Sidebar slide-in dari kiri
{ initial: { x: -380 }, animate: { x: 0 } }

// AI panel slide-in dari kanan
{ initial: { x: 400 }, animate: { x: 0 } }

// Map marker muncul
{ initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 400, damping: 20 } }

// Toast / notif
{ initial: { x: 60, opacity: 0 }, animate: { x: 0, opacity: 1 } }
```

**CSS-only** untuk hover dan focus (tidak perlu framer motion):
```css
transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
```

---

## 12. Map System — @vis.gl/react-google-maps

```bash
npm install @vis.gl/react-google-maps
```

**Setup di `app/layout.tsx`:**
```tsx
import { APIProvider } from '@vis.gl/react-google-maps'
<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}>
  {children}
</APIProvider>
```

**Komponen yang dipakai:**
```
<Map>             — canvas utama, nonaktifkan default UI chrome Google
<AdvancedMarker>  — untuk custom marker SVG
<InfoWindow>      — popup hover destinasi
<Polyline>        — rute per hari, warna sesuai map-day-*
```

**Polyline per hari:**
```tsx
const dayColors = ['#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6']

<Polyline
  path={dayCoordinates}
  strokeColor={dayColors[dayIndex % 7]}
  strokeWeight={3}
  strokeOpacity={0.85}
/>
```

**Z-index floating UI di atas peta:**
```
z-10 — Day legend pills (kiri atas)
z-10 — Map controls (kanan atas)
z-10 — Route summary (kanan bawah)
z-20 — InfoWindow popup
z-30 — AI Generate FAB button (kiri bawah)
```

**Map style:** Gunakan custom JSON style untuk kurangi visual noise. Recommended: Snazzy Maps "Light Monochrome" atau buat via Google Cloud Console. Dark mode: terapkan style "night".

---

## 13. Layout Utama — Trip Editor

```
┌─────────────────────────────────────────────────────────────┐
│  NAVBAR 64px (fixed)                                        │
│  ← Dashboard | Trip Name (editable) | Avatars | Share | ⋮  │
├─────────────────────┬───────────────────────────────────────┤
│  SIDEBAR 380px      │  MAP CANVAS (flex: 1)                 │
│  (overflow-y scroll)│                                       │
│  ┌───────────────┐  │  [Google Maps — full height]          │
│  │ 🏨 Hotel base │  │                                       │
│  │ Day tabs ●●●  │  │  z-10: Legend    z-10: Controls       │
│  │ ─────────────│  │                                       │
│  │ ⚠️ Konflik    │  │  Custom teardrop markers              │
│  │ ─────────────│  │  Colored polyline routes              │
│  │ 1. Destinasi │  │                                       │
│  │ 2. Destinasi │  │  z-20: InfoWindow on hover            │
│  │ + Add Place  │  │                                       │
│  └───────────────┘  │  z-30: ✨ AI FAB (kiri bawah)        │
│  ✨ Generate AI     │                                       │
│  💰 Split Bill      │                                       │
└─────────────────────┴───────────────────────────────────────┘
```

---

## 14. Page Routes

| Route | Halaman | Layout |
|-------|---------|--------|
| `/` | Landing Page | Full-width, no sidebar |
| `/dashboard` | Dashboard | Centered, max-width 1280px |
| `/trip/[id]` | Trip Editor | Sidebar 380px + Map full height |
| `/trip/[id]/budget` | Budget & Split Bill | 2 kolom: form + summary |
| `/marketplace` | Marketplace | Sidebar filter 240px + grid |
| `/guide/[id]` | Guide Profile | Hero + 2 kolom |
| `/explore` | Explore | Full-width masonry |
| `/profile` | User Profile | Centered, max-width 900px |
| `/admin` | Admin Dashboard | Sidebar 240px + konten |

---

## 15. Responsive Breakpoints

```
mobile:  < 640px    — single column, map 50vh, itinerary scroll bawah
tablet:  640–1024px — sidebar collapsible (shadcn Drawer)
desktop: > 1024px   — full split layout sidebar + map
wide:    > 1440px   — sidebar bisa 420px
```

Mobile-first. Tailwind: `sm:` `md:` `lg:` `xl:` `2xl:`.

---

## 16. Dark Mode

```bash
npm install next-themes
```

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

| Token | Light | Dark |
|-------|-------|------|
| surface-base | `hsl(0 0% 98%)` | `#0f0f1a` |
| surface-card | `hsl(0 0% 100%)` | `#1a1a2e` |
| surface-overlay | — | `#1e1e32` |
| text-primary | `hsl(222 47% 11%)` | `#f9fafb` |
| text-muted | `hsl(215 16% 35%)` | `#9ca3af` |
| border | `hsl(214 32% 88%)` | `rgba(255,255,255,0.08)` |

Aurora gradient **tidak berubah** di dark mode — tetap sama, justru lebih pop di background gelap.

Map dark mode: terapkan Google Maps JSON style "night".

---

## 17. Loading States

Setiap async operation harus punya loading state. Shape skeleton harus menyerupai konten asli (content-shaped), bukan bar horizontal generic.

```
Data fetching:     shadcn <Skeleton /> berbentuk sesuai konten (card, list, dll)
Map loading:       spinner di tengah peta dengan overlay transparan ringan
AI thinking:       animated 3 dots + teks "TripAI sedang merancang itinerary..."
Route calculating: progress bar 2px di atas sidebar, warna aurora gradient
Button loading:    disabled state + Loader2 icon dari lucide + animate-spin
Image loading:     next/image dengan blurDataURL (blur → sharp)
```

**Skeleton rules:**
- Trip card skeleton: harus punya cover image placeholder, nama, dan meta — bukan 3 bar horizontal.
- Gunakan `animate-pulse` Tailwind untuk shimmer.
- Kalau loading >3 detik, tampilkan error state dengan tombol retry.

---

## 18. Empty States

Empty state harus informatif, sedikit menyenangkan, dan selalu punya CTA yang jelas.

```
Dashboard — belum ada trip:
  SVG: peta sederhana dengan titik-titik tanda tanya
  Heading: "Belum ada trip"
  Sub: "Mulai rencanakan petualanganmu bersama teman."
  CTA: "+ Buat Trip Pertama" (primary button)

Trip Editor — hari kosong:
  SVG: titik-titik marker melayang
  Heading: "Hari ini masih kosong"
  Sub: "Cari destinasi atau biarkan AI yang merancang hari ini."
  CTA: "Cari Destinasi" (secondary) + "✨ Generate dengan AI" (primary)

Marketplace — belum ada template:
  SVG: guide berdiri dengan peta
  Heading: "Belum ada template di kota ini"
  Sub: "Jadilah guide pertama yang berbagi itinerary di sini."
  CTA: "Daftar sebagai Guide"

No search results:
  SVG: kaca pembesar
  Heading: "Tidak ditemukan"
  Sub: "Coba kata kunci lain atau browse berdasarkan kategori."
  CTA: chips kategori populer

Notif kosong (konteks kecil — tanpa ilustrasi):
  Teks saja: "Semua beres — tidak ada notifikasi baru."
```

---

## 19. Do's and Don'ts

### ✅ Do:
- **Do** gunakan Aurora gradient sebagai accent voice — satu penggunaan tegas > tiga yang ragu-ragu.
- **Do** gunakan tonal surface difference untuk depth. White card di atas near-white background sudah cukup.
- **Do** gunakan radius generous dan konsisten (12–16px) di seluruh card dan modal.
- **Do** gunakan motion untuk feedback dan orientasi — hover, stagger entrance, smooth page change.
- **Do** gunakan warna `map-day-*` secara konsisten: sama di marker, polyline, dan sidebar chip untuk hari yang sama.
- **Do** desain untuk squint test: primary action dan grouping harus obvious saat di-blur.
- **Do** gunakan real imagery untuk destinasi. Foto nyata lebih baik dari gradient placeholder.
- **Do** buat skeleton berbentuk sesuai konten, bukan bar horizontal generik.

### ❌ Don't:
- **Don't** gunakan Aurora gradient sebagai background wash section penuh. Gradient adalah accent, bukan canvas.
- **Don't** gunakan glassmorphism dekoratif. Frosted glass card karena terlihat "modern" dilarang.
- **Don't** gunakan dark glassmorphism theme — TripPlanner light dan bright; depth dari tonal layering.
- **Don't** gunakan gradient text untuk heading — gunakan solid color dengan weight dan scale sebagai emphasis.
- **Don't** gunakan side-stripe borders (border-left tebal berwarna sebagai accent pada card/alert).
- **Don't** taruh shadow berat pada elemen diam. Resting card hampir flat.
- **Don't** gunakan pure black `#000000` sebagai text — gunakan `hsl(222 47% 11%)`.
- **Don't** ulangi struktur section identik di satu halaman. Variasikan ritme layout.
- **Don't** pakai warna berbeda untuk hari yang sama di context berbeda (marker vs sidebar vs legend).
- **Don't** stack animasi berlebihan — 1–2 momen animasi bermakna per halaman sudah cukup.

---

> **Catatan untuk AI Agent**: Baca seluruh file ini sebelum generate satu baris kode pun. Ikuti semua token, aturan, dan constraint. Kalau ragu antara dua pilihan desain, pilih yang lebih sederhana dan lebih konsisten dengan design system ini. Konsistensi lebih penting dari kreativitas lokal per komponen.
