# TripPlanner

Plan together, travel smarter.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TailwindCSS + Framer Motion |
| Backend | Express.js + TypeScript |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| AI | Google Gemini 2.5 Flash |
| Maps | Leaflet + OpenStreetMap |
| Weather | Open-Meteo API (free, no key needed) |
| Search | OSM Nominatim (free, no key needed) |

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Supabase project** (free tier ok)
- **Google Gemini API key** ([get from Google AI Studio](https://aistudio.google.com/apikey))

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/kaytarechiam/Tripplaner.git
cd Tripplaner
npm install
```

### 2. Supabase Setup

1. Buat project di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** dan jalankan schema ini:

```sql
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  countries_visited INTEGER DEFAULT 0,
  trips_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  cover_image TEXT,
  collaborators UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itinerary Items
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day INTEGER NOT NULL,
  time TIME NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  category TEXT DEFAULT 'activity' CHECK (category IN ('hotel','landmark','food','nature','activity','shopping','transport')),
  duration_minutes INTEGER DEFAULT 60,
  notes TEXT,
  estimated_cost NUMERIC,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bucket List
CREATE TABLE IF NOT EXISTS public.bucket_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_name TEXT NOT NULL,
  country TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  notes TEXT,
  image_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Split Bills
CREATE TABLE IF NOT EXISTS public.split_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IDR',
  paid_by TEXT NOT NULL,
  split_between TEXT[] NOT NULL,
  settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public Trips
CREATE TABLE IF NOT EXISTS public.public_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own trips" ON public.trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own itinerary" ON public.itinerary_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid()));
CREATE POLICY "Users manage own bucket list" ON public.bucket_list FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own split bills" ON public.split_bills FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid()));
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### 3. Environment Variables

Copy `.env.example` ke `.env` dan `.env` di folder `server/`:

```bash
cp .env.example .env
cp .env.example server/.env
```

Isi variabel yang dibutuhkan:

**`.env** (frontend):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE=http://localhost:3001
```

**`server/.env`** (backend):
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Run

```bash
# Development (frontend + backend concurrently)
npm run dev

# Frontend saja
npm run dev:client

# Backend saja
npm run dev:server

# Production build
npm run build
```

Buka:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/api/health

## Project Structure

```
src/
├── pages/
│   ├── Dashboard.tsx         # Dashboard utama + statistik
│   ├── TripEditorPage.tsx   # Editor itinerary + peta
│   ├── AIGeneratorPage.tsx  # AI itinerary generator
│   ├── BucketList.tsx        # Wishlist destinasi
│   ├── Explore.tsx          # Browse trip publik
│   ├── Profile.tsx          # Profil user
│   ├── Achievements.tsx      # Badge & XP
│   ├── Notifications.tsx      # Notifikasi
│   ├── Settings.tsx          # Pengaturan akun
│   ├── SplitBillPage.tsx     # Kalkulator split bill
│   └── AuthPage.tsx         # Login / Register / Landing
├── components/
│   ├── TripMap.tsx          # Peta interaktif dengan garis arah
│   └── ui/                  # UI primitives (button, card, badge, dll)
└── lib/
    ├── api.ts               # API client (Supabase + backend)
    └── supabase.ts           # Supabase helpers & types

server/
├── routes/
│   ├── ai.ts               # AI generate itinerary + recommendations
│   ├── destinations.ts      # Place search (Nominatim) + destination info
│   ├── weather.ts           # Weather (Open-Meteo API)
│   └── split-bill.ts       # Split bill calculator + email preview
├── services/
│   ├── gemini.ts           # Gemini AI service
│   └── supabase.ts          # Server-side Supabase helpers
└── index.ts                # Express server entry
```

## Fitur

- **AI Itinerary Generator** — generate rencana trip otomatis berdasarkan preferensi
- **Interactive Map** — garis arah antar destinasi seperti Google Maps
- **Trip Editor** — atur itinerary per hari dengan drag-drop (Coming soon)
- **Bucket List** — wishlist destinasi impian
- **Split Bill** — kalkulasi dan bagi tagihan travel
- **Weather Forecast** — cuaca destinasi dari Open-Meteo
- **Place Autocomplete** — cari kota dari OpenStreetMap
- **Notifications** — real-time dari Supabase Realtime

## API Keys Gratis

| Service | Key Required | Free Tier |
|---------|-------------|-----------|
| Supabase | Ya | ✅ PostgreSQL + Auth + Realtime |
| Gemini AI | Ya | ✅ 1.5M tokens/bulan |
| Open-Meteo | Tidak | ✅ Unlimited |
| OSM Nominatim | Tidak | ✅ Fair use policy |
| OpenStreetMap | Tidak | ✅ Free |
| Leaflet | Tidak | ✅ Free |

## License

MIT
