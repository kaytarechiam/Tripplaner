# TripPlanner Backend Setup Guide

## 1. Supabase — Database + Auth

### Create Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `TripPlanner`, Region: closest to your users
3. Save the **Database Password** and **API URL**

### Run Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `server/services/supabase.ts` → look for `SCHEMA_SQL` constant
3. Or run this simplified version:

```sql
-- Profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT, username TEXT UNIQUE,
  avatar_url TEXT, bio TEXT,
  countries_visited INTEGER DEFAULT 0, trips_completed INTEGER DEFAULT 0
);

-- Trips
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, destination TEXT NOT NULL,
  start_date DATE, end_date DATE,
  status TEXT DEFAULT 'planning',
  cover_image TEXT, collaborators UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itinerary Items
CREATE TABLE itinerary_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day INTEGER NOT NULL, time TIME NOT NULL,
  title TEXT NOT NULL, description TEXT, location TEXT,
  latitude NUMERIC, longitude NUMERIC,
  category TEXT DEFAULT 'activity',
  duration_minutes INTEGER DEFAULT 60, notes TEXT,
  estimated_cost NUMERIC, sort_order INTEGER DEFAULT 0
);

-- Bucket List
CREATE TABLE bucket_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_name TEXT NOT NULL, country TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  notes TEXT, image_url TEXT,
  latitude NUMERIC, longitude NUMERIC
);

-- Split Bills
CREATE TABLE split_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL, amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IDR',
  paid_by TEXT NOT NULL, split_between TEXT[] NOT NULL,
  settled BOOLEAN DEFAULT FALSE
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
  link TEXT, read BOOLEAN DEFAULT FALSE
);

-- Public Trips (Explore feed)
CREATE TABLE public_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  likes INTEGER DEFAULT 0, views INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_trips ENABLE ROW LEVEL SECURITY;

-- Policies (owner-only)
CREATE POLICY "own profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own trips" ON trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own items" ON itinerary_items FOR ALL
  USING (EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND user_id = auth.uid()));
CREATE POLICY "own bucket" ON bucket_list FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own bills" ON split_bills FOR ALL
  USING (EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND user_id = auth.uid()));
CREATE POLICY "own notifs" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN INSERT INTO profiles (id, full_name)
VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
ON CONFLICT (id) DO NOTHING; RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Get API Keys
In Supabase dashboard → Settings → API:
- `Project URL` → `VITE_SUPABASE_URL` in `.env`
- `anon public` → `VITE_SUPABASE_ANON_KEY` in `.env`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`

---

## 2. Claude API (AI Itinerary Generator)

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Add payment method (required)
3. API Keys → Create Key
4. Copy to `ANTHROPIC_API_KEY` in `server/.env`

**Free tier:** $5 credit for new users. Each itinerary generation costs ~$0.01-0.05.

---

## 3. Gemini API (Optional - for recommendations)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create API Key
3. Copy to `GEMINI_API_KEY` in `server/.env`

**Free tier:** 15 requests/minute, 1500 requests/day on Gemini 2.0 Flash.

---

## 4. Running the App

```bash
# 1. Install dependencies
npm install

# 2. Fill in your .env file
cp .env.example .env
# Edit .env with your Supabase + API keys

# 3. Create server/.env (copy of relevant vars)
cp .env.example server/.env
# Add: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Add: ANTHROPIC_API_KEY, GEMINI_API_KEY

# 4. Start both frontend + backend together
npm run dev

# Frontend: http://localhost:5174
# Backend API: http://localhost:3001
# Health check: http://localhost:3001/api/health
```

---

## 5. Map (No API Key Needed)

The app uses **OpenStreetMap + Leaflet** for maps. Completely free:
- No API key required
- Global coverage
- Works offline with cached tiles

---

## 6. Weather (No API Key Needed)

Uses **Open-Meteo** API:
- Completely free
- 10,000 requests/day free tier
- 7-day forecast for any location

---

## Environment Variables Summary

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE=http://localhost:3001
```

### Backend (server/.env)
```
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-api03-...
GEMINI_API_KEY=AIzaSy...
FRONTEND_URL=http://localhost:5174
```
