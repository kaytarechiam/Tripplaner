# TripPlanner 🗺️

> Plan together, travel smarter.

---

## ⚡ Quick Start — Setelah Restart Laptop

### 1. Buka terminal di folder project

```bash
cd D:\Tripplaner
```

### 2. Jalankan development server (frontend + backend sekaligus)

```bash
npm run dev
```

Ini akan menjalankan dua proses sekaligus:

| Proses | URL | Keterangan |
|--------|-----|------------|
| Frontend (Vite) | http://localhost:5173 | React app |
| Backend (Express) | http://localhost:3000 | API server |

### 3. Verifikasi sistem berjalan

```bash
curl http://localhost:3000/api/health
```

Response yang diharapkan:
```json
{
  "status": "ok",
  "services": {
    "supabase": true,
    "gemini": true,
    "openai_fallback": true,
    "resend": true
  }
}
```

### 4. Buka browser

**http://localhost:5173**

---

## 🌐 Jika Pakai Cloudflare Tunnel (Public Access)

`VITE_API_BASE` di `.env` mengarah ke `https://tripplaner.stei.cloud`.
Jika tunnel tidak aktif, frontend tidak bisa reach backend.

**Urutan startup lengkap:**
1. Terminal 1 → `npm run dev`
2. Terminal 2 → `cloudflared tunnel run tripplaner`
3. Buka `https://tripplaner.stei.cloud`

**Kalau mau dev lokal saja (tanpa tunnel):**
1. Edit `.env` → ganti `VITE_API_BASE=http://localhost:3000`
2. `npm run dev`
3. Buka `http://localhost:5173`

---

## 🔑 Environment Variables (`.env`)

File `.env` ada di root project. **Jangan di-commit ke git.**

```env
# ── Supabase ──────────────────────────────────────────
VITE_SUPABASE_URL=https://thclaopauazckmlclsea.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://thclaopauazckmlclsea.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── API Server (frontend → backend) ──────────────────
VITE_API_BASE=https://tripplaner.stei.cloud   # production/tunnel
# VITE_API_BASE=http://localhost:3000         # dev lokal murni

# ── AI ────────────────────────────────────────────────
GEMINI_API_KEY=AQ.Ab8...        # Primary AI (Google Gemini)
OPENAI_API_KEY=sk-proj-...      # Fallback AI (GPT-4o-mini)

# ── Email ─────────────────────────────────────────────
RESEND_API_KEY=re_...

# ── RapidAPI (booking data) ───────────────────────────
RAPIDAPI_KEY=cb8d732d...
```

---

## 🛠️ Scripts

| Command | Fungsi |
|---------|--------|
| `npm run dev` | **[UTAMA]** Jalankan frontend + backend bersamaan |
| `npm run dev:client` | Frontend saja (Vite, port 5173) |
| `npm run dev:server` | Backend saja (Express, port 3000) |
| `npm run build` | Build TypeScript + Vite untuk production |
| `npm run start` | Jalankan production build (butuh `npm run build` dulu) |

---

## 📁 Struktur Project

```
D:\Tripplaner\
├── src/                       # Frontend React + TypeScript
│   ├── pages/
│   │   ├── AuthPage.tsx          # Login, Register, Forgot Password, Google OAuth
│   │   ├── Dashboard.tsx         # Home dashboard
│   │   ├── TripEditorPage.tsx    # Editor trip + AI panel ("✨ Generate dengan AI")
│   │   ├── AIGeneratorPage.tsx   # Generator itinerary AI (date pickers + weather)
│   │   ├── Explore.tsx           # Jelajahi trip publik
│   │   ├── BucketList.tsx        # Trip Saya (my trips + saved from Explore)
│   │   ├── Settings.tsx          # Profil + password + avatar upload
│   │   └── SplitBillPage.tsx     # Split tagihan + kirim email via Resend
│   ├── components/
│   │   └── TripDetailModal.tsx   # Modal detail trip Explore (itinerary + komentar)
│   └── lib/
│       ├── supabase.ts           # DB helpers + auth helpers
│       └── api.ts                # Frontend → Backend API calls
│
├── server/                    # Backend Express + TypeScript
│   ├── index.ts                  # Entry point, PORT 3000
│   ├── routes/
│   │   ├── ai.ts                 # POST /api/ai/generate
│   │   ├── weather.ts            # GET  /api/weather
│   │   ├── split-bill.ts         # POST /api/split-bill/send-email
│   │   ├── hotels.ts             # GET  /api/hotels
│   │   └── booking.ts            # GET  /api/booking
│   └── services/
│       ├── gemini.ts             # Primary AI (Google Gemini)
│       ├── openai.ts             # Fallback AI (GPT-4o-mini)
│       ├── resend.ts             # Email via Resend
│       └── supabase.ts           # Server-side Supabase client
│
├── supabase/migrations/       # SQL migrations (sudah diapply ke DB)
├── .env                       # API keys (JANGAN commit!)
├── package.json
└── README.md                  # ← Kamu di sini
```

---

## 🗄️ Database (Supabase)

**Project ID:** `thclaopauazckmlclsea`
**Dashboard:** https://supabase.com/dashboard/project/thclaopauazckmlclsea

### Tabel

| Tabel | Kolom penting | Fungsi |
|-------|---------------|--------|
| `trips` | `owner_id`, `title`, `destination`, `status` | Trip buatan user |
| `itinerary_items` | `trip_id`, `day_number`, `name`, `lat`, `lng`, `order` | Item per hari |
| `profiles` | `id` (= auth.users.id), `name`, `avatar_url`, `bio` | Profil user |
| `saved_trips` | `user_id`, `original_trip_id`, `name`, `days`, `tags` | Copy dari Explore |
| `trip_comments` | `trip_id`, `user_id`, `author_name`, `content` | Komentar Explore |
| `trip_members` | `trip_id`, `name`, `email` | Anggota trip |
| `split_bills` | `trip_id`, `description`, `amount`, `paid_by`, `split_between` | Tagihan |

> ⚠️ **Perhatian kolom DB** (berbeda dari nama TypeScript di beberapa tempat):
> - `trips.owner_id` bukan `user_id`
> - `trips.title` bukan `name` (tapi ada generated column `name`)
> - `itinerary_items.day_number` bukan `day`
> - `profiles.id` = auth.users.id (bukan kolom `user_id` terpisah)

---

## 🤖 API Endpoints

### `POST /api/ai/generate` — Generate Itinerary
```json
{
  "destination": "Bali",
  "days": 3,
  "travelers": 2,
  "start_date": "2026-06-15",
  "budget": "moderate",
  "preferences": "pantai, kuliner"
}
```
→ Gemini dulu. Jika error/quota habis → otomatis OpenAI GPT-4o-mini.

### `GET /api/weather?lat=-8.4&lng=115.2&days=3` — Cuaca per hari
→ Open-Meteo (free, tidak butuh API key)

### `POST /api/split-bill/send-email` — Kirim email tagihan
```json
{
  "trip_name": "Liburan Bali",
  "items": [{ "description": "Makan malam", "amount": 300000, "paid_by": "Budi", "split_between": ["Budi","Ani"] }],
  "currency": "Rp",
  "participant_emails": [{ "name": "Ani", "email": "ani@email.com" }]
}
```
→ Dikirim via Resend dari `onboarding@resend.dev`

### `GET /api/health` — Status semua service
```json
{
  "status": "ok",
  "services": {
    "supabase": true,
    "gemini": true,
    "openai_fallback": true,
    "resend": true
  }
}
```

---

## 🔧 Troubleshooting

### ❌ Frontend tidak bisa konek backend (`fetch failed` / CORS error)
**Kemungkinan:** `VITE_API_BASE` mengarah ke tunnel yang tidak aktif.

**Fix:**
```env
# Di .env, ganti sementara:
VITE_API_BASE=http://localhost:3000
```
Lalu restart `npm run dev`.

---

### ❌ AI tidak generate itinerary (error 500)
1. Cek: `curl http://localhost:3000/api/health`
2. Jika `gemini: false` → quota habis, akan fallback ke OpenAI otomatis
3. Jika `openai_fallback: false` → cek `OPENAI_API_KEY` di `.env`

---

### ❌ Login/session habis tiba-tiba
1. DevTools → Application → Local Storage → hapus semua key yang diawali `sb-`
2. Refresh + login ulang

---

### ❌ "Trip Saya" kosong padahal sudah buat trip
Kemungkinan data di Supabase menggunakan `owner_id` tapi query salah.
Cek: di Supabase dashboard → Table Editor → `trips` → pastikan kolom `owner_id` berisi user ID kamu.

---

### ❌ Upload foto profil gagal
Pastikan storage bucket `avatars` sudah dibuat di Supabase.
Dashboard → Storage → Buckets → harus ada bucket bernama `avatars` (public).

---

## 🚀 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Express 5, TypeScript, tsx (hot reload) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI Primary | Google Gemini (`@google/generative-ai`) |
| AI Fallback | OpenAI GPT-4o-mini (`openai`) |
| Email | Resend (`resend`) |
| Maps | Leaflet + react-leaflet |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Tunnel | Cloudflare Tunnel → `tripplaner.stei.cloud` |

---

## 📐 Arsitektur

```
Browser
  │
  ├── http://localhost:5173      ← Vite (dev) / dist/ (prod)
  │     React + TypeScript
  │     VITE_API_BASE ──────────────────────────┐
  │                                             ↓
  └── https://tripplaner.stei.cloud  ←── Cloudflare Tunnel
            │
            ↓
        localhost:3000   ← Express server
            ├── /api/ai          → Gemini / OpenAI
            ├── /api/weather     → Open-Meteo
            ├── /api/split-bill  → Resend
            └── /api/health
```

---

*Last updated: 2026-05-30*
