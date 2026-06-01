# TripPlanner — Comprehensive Fixes Design
**Date:** 2026-05-30  
**Scope:** Full frontend + backend audit & fixes

---

## 1. API Keys Status

| API | Key Status | Use |
|-----|-----------|-----|
| Supabase | ✅ Valid | DB + Auth |
| Gemini | ✅ Updated | Primary AI |
| OpenAI (Codex) | ✅ Added (`sk-proj-...`) | Backup AI if Gemini fails |
| Resend | ✅ Added | Real email for split bill |
| RapidAPI | ✅ Existing | Booking platform data |

---

## 2. Group A — AI & Backend Core

### A1. AI Fallback: Gemini → OpenAI
- `server/services/openai.ts` — new service using `openai` npm package
- `server/routes/ai.ts` — try Gemini first; on error/quota → call OpenAI
- Model: `gpt-4o-mini` (fast + cheap)
- Same `generateItinerary` interface, same JSON output schema

### A2. Trip Save Bug Fix
- `createTrip()` in `lib/supabase.ts`: replace `getUser()` with retry + better error message
- Supabase RLS: ensure `trips` table allows INSERT for authenticated users
- Migration: verify `trips` table schema and policies

### A3. "Salin Trip" Session Bug
- `TripDetailModal.tsx`: replace `getSession()?.user?.id` with `supabase.auth.getUser()`
- Ensures fresh auth verification, not stale cache
- Add `saved_trips` table to Supabase for tracking which trips a user copied

---

## 3. Group B — Auth

### B1. Google OAuth
- Add `signInWithOAuth({ provider: 'google' })` button to login/register forms
- Enable Google provider in Supabase dashboard (user action required)

### B2. Forgot Password
- Add "Lupa Password?" link in login form
- Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`
- Handle `PASSWORD_RECOVERY` event in auth listener

### B3. Duplicate Email Validation
- On register: check if email already exists before submit
- Show clear error "Email sudah terdaftar, silakan masuk"

---

## 4. Group C — AI Generator

### C1. Date Pickers (not duration)
- Replace `duration` number input → `start_date` + `end_date` date pickers
- Auto-calculate days: `(end - start) + 1`
- Pass `start_date` to AI for realistic date-based itinerary

### C2. Weather per Day in Results
- After generation: fetch weather from `/api/weather?lat=&lng=&days=N`
- Display weather icon + temp range on each day card in results
- Weather fetched in parallel with AI generation (already partially done)

### C3. Fix Custom Fields
- Audit `handleGenerate` → confirm all fields (`people`, `budget`, `preferences`) sent correctly to backend

### C4. Fix Booking Deep Links
- Traveloka: `https://www.traveloka.com/en-id/hotel?search={city}&checkInDate={date}`
- Booking.com: `https://www.booking.com/searchresults.html?ss={city}&checkin={checkin}&checkout={checkout}`
- Tiket.com: `https://www.tiket.com/hotel?q={city}&checkIn={date}`
- Agoda: `https://www.agoda.com/search?city={city}&checkIn={date}`

### C5. App Flow: Create Trip → Editor First
- Home Dashboard "Buat Trip Baru" button → navigate to `editor` (not `ai`)
- In `TripEditorPage`: make `TripAIPanel` button more prominent with label "✨ Generate dengan AI"
- `AIGeneratorPage` accessible from: (a) TripEditor AI button, (b) Navbar/sidebar

### C6. Add Members to Trip
- AI Generator form: add "Tambah Anggota" section (name + optional email)
- Save to `trip_members` table after trip creation

---

## 5. Group D — Explore

### D1. Remove "Simpan", Keep "Salin ke Trip Saya" Only
- Remove `handleLike` / "Simpan" button from `TripDetailModal`
- Keep "Salin ke Trip Saya" as primary CTA
- Fix: use `supabase.auth.getUser()` not `getSession()`

### D2. Full Itinerary Detail in Modal
- `TripDetailModal`: load `itinerary_items` for the selected trip
- Display day-by-day items: time, title, location, category icon
- Shows even if 0 items (empty state)

### D3. Clean Up Explore Cards
- Remove `start_date` / `end_date` display from cards
- Remove `status` badge (planning/active/completed) from cards
- Keep: destination, days count, tags, rating, author

### D4. Comments Section
- New Supabase table: `trip_comments(id, trip_id, user_id, content, created_at)`
- In `TripDetailModal`: load + display comments, add comment form (if logged in)

---

## 6. Group E — Settings

### E1. Profile Photo Upload
- Requires Supabase storage bucket `avatars` (public)
- Code already exists in `Settings.tsx`, just needs the bucket created
- Migration: `INSERT INTO storage.buckets`

### E2. Save Profile
- Requires `profiles` table: `(id, user_id, full_name, username, bio, avatar_url, updated_at)`
- Migration: create table + RLS

### E3. Change Password
- Add `supabase.auth.updateUser({ password: newPassword })` after verifying current password
- UI already exists in Settings.tsx (state variables exist)

---

## 7. Group F — Bucket List → Trip Saya

- Rename page: "Bucket List" → "Trip Saya"  
- Data: trips from `trips` table (user's own) + trips from `saved_trips` table (copied from Explore)
- UI: tab "Trip Saya" | "Disimpan dari Explore"
- Keep existing BucketList UI style, just change data source + tabs

---

## 8. Group G — Split Bill + Real Email

### G1. Audit Split Bill
- Add bill form: description, amount, paid_by, split_between (select from trip members)
- Mark bill as settled
- Fix: save new bills to `split_bills` table via `addSplitBill()`

### G2. Real Email via Resend
- `server/routes/split-bill.ts`: new endpoint `POST /api/split-bill/send-email`
- Uses `resend` npm package + `RESEND_API_KEY`
- Sends bill summary email to each participant (if they have email)
- Email template: HTML with bill breakdown table

---

## 9. Database Migrations Needed

```sql
-- 1. profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- 2. saved_trips table
CREATE TABLE saved_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_trip_id UUID,
  name TEXT,
  destination TEXT,
  days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own saved trips" ON saved_trips
  FOR ALL USING (auth.uid() = user_id);

-- 3. trip_comments table
CREATE TABLE trip_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE trip_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all comments" ON trip_comments FOR SELECT USING (true);
CREATE POLICY "users write own comments" ON trip_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. trip_members table
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trip owner manages members" ON trip_members
  FOR ALL USING (added_by = auth.uid());

-- 5. Fix trips RLS (ensure INSERT allowed)
-- Verify policy exists, if not:
CREATE POLICY "users manage own trips" ON trips
  FOR ALL USING (auth.uid() = user_id);
```

---

## 10. New npm Packages Needed

```
server: openai resend
frontend: (none new — existing deps sufficient)
```

---

## 11. Button Audit Summary

| Button | Location | Status | Fix |
|--------|----------|--------|-----|
| Buat Trip | Home/Navbar | ❌ Goes to AI | Change to → Editor |
| Simpan (Like) | Explore Modal | ❌ Schema mismatch | Remove |
| Salin ke Trip Saya | Explore Modal | ❌ Session bug | Fix auth call |
| Simpan (Profile) | Settings | ❌ Missing profiles table | Add migration |
| Upload Foto | Settings | ❌ Missing storage bucket | Create bucket |
| Ganti Password | Settings | ❌ Not wired up | Implement |
| Kirim Email | Split Bill | ❌ Fake setTimeout | Resend API |
| Export PDF | Split Bill | ⚠️ Copies to clipboard | Acceptable |
| Daftar Google | Auth | ❌ Not implemented | Add OAuth |
| Lupa Password | Auth | ❌ Not implemented | Add reset flow |
| Booking Links | AI Generator | ❌ Wrong deep links | Fix URLs |
| Generate AI | TripEditor | ⚠️ Hidden/not prominent | Make visible |
| Tambah Bill | SplitBill | ⚠️ No add form UI | Add form |

---

## 12. Execution Order (Priority)

1. **DB Migrations** (unblocks everything else)
2. **Auth fixes** (login/register/forgot password)
3. **AI fallback** (Gemini → OpenAI)
4. **Trip save bug** + **Salin trip bug**
5. **App flow** (Buat Trip → Editor)
6. **AI Generator** (dates, weather, booking links)
7. **Explore cleanup** (cards, modal, comments)
8. **Settings** (profile, photo, password)
9. **Bucket List → Trip Saya**
10. **Split Bill** (add form + real email)
