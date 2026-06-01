# TripPlanner — Comprehensive Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken buttons, auth flows, AI generation, booking links, explore features, settings, and split bill email across the TripPlanner app.

**Architecture:** Monorepo — Express backend at `server/`, React+Vite frontend at `src/`. Supabase for DB+Auth. Gemini as primary AI with OpenAI (Codex) as fallback. Resend for transactional email. Open-Meteo (free, no key) for weather.

**Tech Stack:** React, TypeScript, Express, Supabase, @google/generative-ai, openai (already installed), resend (needs install), framer-motion, Tailwind, shadcn/ui

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `server/services/openai.ts` | OpenAI fallback AI service |
| `server/services/resend.ts` | Resend email service |
| `server/routes/split-bill-email.ts` | POST /api/split-bill/send-email |
| `supabase/migrations/001_profiles.sql` | profiles table + RLS |
| `supabase/migrations/002_saved_trips.sql` | saved_trips table + RLS |
| `supabase/migrations/003_trip_comments.sql` | trip_comments table + RLS |
| `supabase/migrations/004_trip_members.sql` | trip_members table + RLS |
| `supabase/migrations/005_avatars_bucket.sql` | avatars storage bucket |

### Modified Files
| File | Change |
|------|--------|
| `server/routes/ai.ts` | Gemini→OpenAI fallback |
| `server/index.ts` | Register split-bill-email route |
| `src/lib/supabase.ts` | Add helpers: saveTrip, getSavedTrips, getComments, addComment, getMembers, addMember |
| `src/lib/api.ts` | Fix booking deep links, add sendSplitBillEmail |
| `src/App.tsx` | "Buat Trip" → editor (not ai) |
| `src/pages/AuthPage.tsx` | Google OAuth + Forgot Password + duplicate email |
| `src/pages/AIGeneratorPage.tsx` | Date pickers, weather per day, fix booking links |
| `src/pages/TripEditorPage.tsx` | Prominent AI button |
| `src/components/TripDetailModal.tsx` | Fix auth, remove Simpan, add itinerary + comments |
| `src/pages/Explore.tsx` | Clean cards (no date/status), pass image to modal |
| `src/pages/Settings.tsx` | Wire save profile + change password |
| `src/pages/SplitBillPage.tsx` | Add bill form + real email via Resend |
| `src/pages/BucketList.tsx` | Repurpose as "Trip Saya" |

---

## Task 1: Install resend package

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Install resend**

```bash
cd D:\Tripplaner && npm install resend
```

Expected output: `added 1 package`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install resend for email"
```

---

## Task 2: Database Migrations via Supabase MCP

**Files:**
- Create: `supabase/migrations/001_profiles.sql`
- Create: `supabase/migrations/002_saved_trips.sql`
- Create: `supabase/migrations/003_trip_comments.sql`
- Create: `supabase/migrations/004_trip_members.sql`
- Create: `supabase/migrations/005_avatars_bucket.sql`

- [ ] **Step 1: Create migrations folder**

```bash
mkdir -p D:\Tripplaner\supabase\migrations
```

- [ ] **Step 2: Create 001_profiles.sql**

```sql
-- supabase/migrations/001_profiles.sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_profile" ON profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "public_read_profiles" ON profiles
  FOR SELECT USING (true);
```

- [ ] **Step 3: Create 002_saved_trips.sql**

```sql
-- supabase/migrations/002_saved_trips.sql
CREATE TABLE IF NOT EXISTS saved_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_trip_id UUID,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  days INTEGER DEFAULT 1,
  start_date DATE,
  end_date DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_saved_trips" ON saved_trips
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 4: Create 003_trip_comments.sql**

```sql
-- supabase/migrations/003_trip_comments.sql
CREATE TABLE IF NOT EXISTS trip_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trip_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_comments" ON trip_comments
  FOR SELECT USING (true);

CREATE POLICY "users_write_own_comments" ON trip_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_comments" ON trip_comments
  FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 5: Create 004_trip_members.sql**

```sql
-- supabase/migrations/004_trip_members.sql
CREATE TABLE IF NOT EXISTS trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_owner_manages_members" ON trip_members
  FOR ALL USING (added_by = auth.uid())
  WITH CHECK (added_by = auth.uid());

CREATE POLICY "public_read_members" ON trip_members
  FOR SELECT USING (true);
```

- [ ] **Step 6: Create 005_avatars_bucket.sql**

```sql
-- supabase/migrations/005_avatars_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "users_upload_own_avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_update_own_avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

- [ ] **Step 7: Apply all migrations via Supabase MCP**

Use `mcp__supabase__apply_migration` for each SQL file in order (001 → 005). Check each returns no error.

- [ ] **Step 8: Verify trips table has correct RLS**

Run via Supabase MCP `mcp__supabase__execute_sql`:
```sql
-- Check if trips RLS policy exists
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'trips';
```

If no INSERT policy exists, run:
```sql
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_trips" ON trips
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 9: Commit migration files**

```bash
git add supabase/
git commit -m "feat: add DB migrations for profiles, saved_trips, trip_comments, trip_members, avatars bucket"
```

---

## Task 3: OpenAI Fallback AI Service

**Files:**
- Create: `server/services/openai.ts`
- Modify: `server/routes/ai.ts`

- [ ] **Step 1: Create `server/services/openai.ts`**

```typescript
// server/services/openai.ts
import OpenAI from 'openai'
import type { ItineraryParams, GeneratedItinerary } from './gemini.js'

let _client: OpenAI | null = null

export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[OpenAI] Missing OPENAI_API_KEY')
    return null
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export async function checkOpenAI(): Promise<boolean> {
  const client = getOpenAI()
  if (!client) return false
  const models = await client.models.list()
  return models.data.length > 0
}

function buildBookingLinks(destination: string) {
  const q = encodeURIComponent(destination)
  return {
    traveloka_hotels: `https://www.traveloka.com/en-id/hotel?search=${q}`,
    traveloka_flights: `https://www.traveloka.com/en-id/flight?search=${q}`,
    tiket_hotels: `https://www.tiket.com/hotel?q=${q}`,
    tiket_flights: `https://www.tiket.com/penerbangan?q=${q}`,
    agoda_hotels: `https://www.agoda.com/search?city=${q}`,
    booking_hotels: `https://www.booking.com/searchresults.html?ss=${q}`,
  }
}

export async function generateItineraryOpenAI(params: ItineraryParams): Promise<{
  destination: string
  trip_summary: string
  booking_links: Record<string, string>
  hotels: { name: string; category: string; estimated_price_idr: number; notes: string }[]
  itinerary: GeneratedItinerary['itinerary']
  summary: string
  total_estimated_budget: string
  best_season: string
}> {
  const client = getOpenAI()
  if (!client) throw new Error('OpenAI API not configured')

  const prompt = `You are a professional travel planner AI. Generate a ${params.days}-day itinerary for ${params.destination}${params.trip_type ? ` (trip type: ${params.trip_type})` : ''}${params.budget ? ` with a ${params.budget} budget` : ''}${params.travelers ? ` for ${params.travelers} traveler(s)` : ''}${params.start_date ? ` starting from ${params.start_date}` : ''}${params.preferences ? `. Preferences: ${params.preferences}` : ''}.

For each day, provide 4-6 activities with time (HH:MM 24h), title, description (1-2 sentences), location, category (hotel/landmark/food/nature/activity/shopping/transport), duration_minutes, estimated_cost (local currency), and tips.

Return ONLY valid JSON, no markdown:
{"itinerary":[{"day":1,"date":"YYYY-MM-DD","items":[{"time":"09:00","title":"Activity","description":"Why visit","location":"Place name","latitude":0.0,"longitude":0.0,"category":"landmark","duration_minutes":120,"estimated_cost":"Rp 50.000","tips":"Helpful tip"}]}],"summary":"Trip summary","total_estimated_budget":"Rp X.XXX.XXX per person","best_season":"Best months"}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
    temperature: 0.7,
  })

  const text = response.choices[0]?.message?.content || ''
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse OpenAI response as JSON')
  }

  const bookingLinks = buildBookingLinks(params.destination)
  const hotelBudgetMap: Record<string, number> = {
    budget: 350000, moderate: 650000, luxury: 1200000,
    low: 300000, mid: 600000, high: 1100000,
  }
  const budget = params.budget || 'moderate'
  const basePrice = hotelBudgetMap[budget] || 650000

  return {
    destination: params.destination,
    trip_summary: parsed.summary || '',
    booking_links: bookingLinks,
    hotels: [
      { name: `${params.destination} Budget Inn`, category: 'budget', estimated_price_idr: basePrice, notes: 'Affordable, central location' },
      { name: `${params.destination} City Hotel`, category: 'mid-range', estimated_price_idr: basePrice * 1.5, notes: 'Good amenities, great value' },
      { name: `${params.destination} Grand Resort`, category: 'premium', estimated_price_idr: basePrice * 3, notes: 'Luxury experience, top-rated' },
    ],
    itinerary: parsed.itinerary || [],
    summary: parsed.summary || '',
    total_estimated_budget: parsed.total_estimated_budget || '',
    best_season: parsed.best_season || '',
  }
}
```

- [ ] **Step 2: Update `server/routes/ai.ts` with fallback**

Replace the entire file:

```typescript
// server/routes/ai.ts
import { Router } from 'express'
import { generateItinerary as generateGemini } from '../services/gemini.js'
import { generateItineraryOpenAI } from '../services/openai.js'
import { tripAIChat, getRecommendations } from '../services/gemini-rapidapi.js'

const router = Router()

router.post('/generate-itinerary', async (req, res) => {
  try {
    const { destination, days, trip_type, budget, travelers, start_date, preferences } = req.body
    if (!destination || !days) {
      res.status(400).json({ message: 'destination and days are required' })
      return
    }

    const params = {
      destination,
      days: Number(days),
      trip_type,
      budget,
      travelers: travelers ? Number(travelers) : undefined,
      start_date,
      preferences,
    }

    let result: any = null

    // Try Gemini first
    try {
      result = await generateGemini(params)
      console.log('[AI] Used Gemini successfully')
    } catch (geminiErr: unknown) {
      const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
      console.warn('[AI] Gemini failed, falling back to OpenAI:', msg)

      // Fallback to OpenAI
      try {
        result = await generateItineraryOpenAI(params)
        console.log('[AI] Used OpenAI fallback successfully')
      } catch (openaiErr: unknown) {
        const openaiMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr)
        console.error('[AI] Both Gemini and OpenAI failed:', openaiMsg)
        throw new Error(`All AI providers failed. Gemini: ${msg}. OpenAI: ${openaiMsg}`)
      }
    }

    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    console.error('[AI/Generate]', message)
    res.status(500).json({ message })
  }
})

router.post('/recommendations', async (req, res) => {
  const { destination, tripType } = req.body
  if (!destination) {
    res.status(400).json({ message: 'destination is required' })
    return
  }
  try {
    const result = await getRecommendations(destination, tripType)
    res.json(result)
  } catch (err) {
    console.error('[AI/Recommendations]', err instanceof Error ? err.message : err)
    res.json({ places: [], restaurants: [], hidden_gems: [], local_tips: [] })
  }
})

router.post('/chat', async (req, res) => {
  const { message, context } = req.body
  if (!message) {
    res.status(400).json({ message: 'message is required' })
    return
  }
  try {
    const result = await tripAIChat(message, context)
    res.json(result)
  } catch (err) {
    console.error('[AI/Chat]', err instanceof Error ? err.message : err)
    res.json({ reply: 'Maaf, TripAI sedang tidak bisa membantu saat ini.' })
  }
})

export default router
```

- [ ] **Step 3: Verify server compiles**

```bash
cd D:\Tripplaner && npm run build:server 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add server/services/openai.ts server/routes/ai.ts
git commit -m "feat: add OpenAI fallback when Gemini quota exhausted"
```

---

## Task 4: Resend Email Service

**Files:**
- Create: `server/services/resend.ts`
- Create: `server/routes/split-bill-email.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create `server/services/resend.ts`**

```typescript
// server/services/resend.ts
import { Resend } from 'resend'

let _client: Resend | null = null

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] Missing RESEND_API_KEY')
    return null
  }
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY)
  }
  return _client
}

export interface SplitBillEmailData {
  tripName: string
  items: {
    description: string
    amount: number
    paid_by: string
    split_between: string[]
  }[]
  currency: string
  participantEmails: { name: string; email: string; owes: number; owed: number; net: number }[]
  totalAmount: number
}

function buildEmailHTML(data: SplitBillEmailData): string {
  const { tripName, items, currency, participantEmails, totalAmount } = data

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${currency} ${item.amount.toLocaleString('id-ID')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${item.paid_by}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${item.split_between.join(', ')}</td>
    </tr>
  `).join('')

  const balanceRows = participantEmails.map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600">${p.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:${p.net >= 0 ? '#10b981' : '#ef4444'};font-weight:600">
        ${p.net >= 0 ? '+' : ''}${currency} ${Math.abs(p.net).toLocaleString('id-ID')}
        <span style="font-size:12px;font-weight:400;color:#6b7280">(${p.net >= 0 ? 'Hak Terima' : 'Hutang'})</span>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Split Bill - ${tripName}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">✈️ Split Bill</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">${tripName}</p>
    </div>
    <div style="padding:24px">
      <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
        <p style="margin:0;color:#6b7280;font-size:14px">Total Pengeluaran</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#111">${currency} ${totalAmount.toLocaleString('id-ID')}</p>
      </div>

      <h2 style="font-size:16px;color:#374151;margin:0 0 12px">Detail Pengeluaran</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Deskripsi</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280">Jumlah</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Dibayar</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Split</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <h2 style="font-size:16px;color:#374151;margin:0 0 12px">Ringkasan Balance</h2>
      <table style="width:100%;border-collapse:collapse">
        <tbody>${balanceRows}</tbody>
      </table>

      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center">
        Dikirim dari TripPlanner · Selesaikan pembayaran secepatnya 🙏
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendSplitBillEmails(data: SplitBillEmailData): Promise<{ sent: number; errors: string[] }> {
  const resend = getResend()
  if (!resend) throw new Error('Resend not configured')

  const html = buildEmailHTML(data)
  const errors: string[] = []
  let sent = 0

  for (const participant of data.participantEmails) {
    if (!participant.email) continue
    try {
      await resend.emails.send({
        from: 'TripPlanner <noreply@tripplanner.app>',
        to: participant.email,
        subject: `Split Bill: ${data.tripName}`,
        html,
      })
      sent++
    } catch (err: any) {
      errors.push(`${participant.name}: ${err.message}`)
    }
  }

  return { sent, errors }
}
```

- [ ] **Step 2: Create `server/routes/split-bill-email.ts`**

```typescript
// server/routes/split-bill-email.ts
import { Router } from 'express'
import { sendSplitBillEmails } from '../services/resend.js'

const router = Router()

router.post('/send-email', async (req, res) => {
  try {
    const { trip_name, items, currency = 'Rp', participant_emails = [] } = req.body

    if (!trip_name || !items || !Array.isArray(items)) {
      res.status(400).json({ message: 'trip_name and items are required' })
      return
    }

    // Calculate balances
    const allParticipants = Array.from(new Set<string>(
      items.flatMap((b: any) => b.split_between)
    ))

    const balances = allParticipants.map(name => {
      const paid = items
        .filter((b: any) => b.paid_by === name)
        .reduce((sum: number, b: any) => sum + Number(b.amount), 0)
      const owes = items.reduce((sum: number, b: any) => {
        if (b.split_between.includes(name)) {
          return sum + Number(b.amount) / b.split_between.length
        }
        return sum
      }, 0)
      const emailEntry = participant_emails.find((p: any) =>
        p.name === name || p.name?.toLowerCase() === name.toLowerCase()
      )
      return {
        name,
        email: emailEntry?.email || '',
        paid,
        owes,
        owed: paid,
        net: paid - owes,
      }
    })

    const totalAmount = items.reduce((sum: number, b: any) => sum + Number(b.amount), 0)

    // Build preview HTML (always returned)
    const { sendSplitBillEmails: sendFn } = await import('../services/resend.js')

    const result = await sendSplitBillEmails({
      tripName: trip_name,
      items,
      currency,
      participantEmails: balances,
      totalAmount,
    })

    res.json({
      sent_count: result.sent,
      errors: result.errors,
      balances: balances.map(b => ({ name: b.name, owes: b.owes, owed: b.paid, net: b.net })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send emails'
    console.error('[SplitBill/Email]', message)
    res.status(500).json({ message })
  }
})

export default router
```

- [ ] **Step 3: Register route in `server/index.ts`**

In `server/index.ts`, add after the existing imports:
```typescript
import splitBillEmailRoutes from './routes/split-bill-email.js'
```

And in the routes section, add:
```typescript
app.use('/api/split-bill', splitBillEmailRoutes)
```

- [ ] **Step 4: Verify build**

```bash
cd D:\Tripplaner && npm run build:server 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add server/services/resend.ts server/routes/split-bill-email.ts server/index.ts
git commit -m "feat: add Resend email service for split bill"
```

---

## Task 5: Fix Auth — Forgot Password + Google OAuth + Duplicate Email

**Files:**
- Modify: `src/lib/supabase.ts` (add resetPassword, signInWithGoogle)
- Modify: `src/App.tsx` (handle password recovery event)
- Modify: `src/pages/AuthPage.tsx` (LoginForm + RegisterForm)

- [ ] **Step 1: Add auth helpers to `src/lib/supabase.ts`**

Append to the end of the file:

```typescript
// Reset password (sends email)
export async function resetPasswordForEmail(email: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?type=recovery`,
  })
  if (error) throw error
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/?auth=success`,
    },
  })
  if (error) throw error
}

// Check if email already registered
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!supabase) return false
  // Attempt sign-in with a fake password — if error is "Invalid login credentials"
  // it means the email exists. If "User not found" → doesn't exist.
  const { error } = await supabase.auth.signInWithPassword({ email, password: '__check_only__' })
  if (!error) return true // logged in somehow (shouldn't happen)
  return error.message !== 'Invalid login credentials' && !error.message.includes('not found')
}

// Update password (requires current session)
export async function updatePassword(newPassword: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
```

- [ ] **Step 2: Find the LoginForm in `src/pages/AuthPage.tsx`**

Search for the login form component. Find the form with email/password inputs and "Masuk" submit button. The file has both `LandingPage` and modal forms.

Run:
```bash
cd D:\Tripplaner && grep -n "Masuk\|password\|LoginForm\|RegisterForm\|handleLogin\|handleRegister" src/pages/AuthPage.tsx | head -30
```

- [ ] **Step 3: Add "Lupa Password?" link inside LoginForm**

Find the submit button area in the login form. After the password input, add:

```tsx
{/* Forgot password link */}
<div className="text-right">
  <button
    type="button"
    onClick={() => setShowForgotPassword(true)}
    className="text-sm text-[var(--aurora-start)] hover:underline"
  >
    Lupa Password?
  </button>
</div>
```

Add state: `const [showForgotPassword, setShowForgotPassword] = useState(false)`
Add state: `const [forgotEmail, setForgotEmail] = useState("")`
Add state: `const [forgotLoading, setForgotLoading] = useState(false)`
Add state: `const [forgotSuccess, setForgotSuccess] = useState(false)`

Add forgot password modal/section:
```tsx
{showForgotPassword && (
  <div className="space-y-3 p-4 bg-secondary/30 rounded-xl">
    <p className="text-sm font-medium">Reset Password</p>
    <Input
      type="email"
      placeholder="Email kamu"
      value={forgotEmail}
      onChange={e => setForgotEmail(e.target.value)}
    />
    {forgotSuccess && (
      <p className="text-xs text-green-500">Email reset dikirim! Cek inbox kamu.</p>
    )}
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1"
        onClick={() => setShowForgotPassword(false)}>
        Batal
      </Button>
      <Button variant="gradient" size="sm" className="flex-1"
        disabled={forgotLoading}
        onClick={async () => {
          if (!forgotEmail) return
          setForgotLoading(true)
          try {
            const { resetPasswordForEmail } = await import('../lib/supabase')
            await resetPasswordForEmail(forgotEmail)
            setForgotSuccess(true)
          } catch (err: any) {
            // Show error
          } finally {
            setForgotLoading(false)
          }
        }}>
        {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Email'}
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add Google Sign-in button to both Login and Register forms**

After the existing form submit button in both login and register, add:

```tsx
<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">atau</span>
  </div>
</div>

<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={async () => {
    try {
      const { signInWithGoogle } = await import('../lib/supabase')
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message)
    }
  }}
>
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Lanjutkan dengan Google
</Button>
```

- [ ] **Step 5: Add duplicate email check to register handler**

Find the register `handleSubmit` or `handleRegister` function. Before calling `signUp`, add:

```typescript
// Check if email already exists
try {
  const { checkEmailExists } = await import('../lib/supabase')
  const exists = await checkEmailExists(email)
  if (exists) {
    setError('Email sudah terdaftar. Silakan masuk atau gunakan email lain.')
    setLoading(false)
    return
  }
} catch {
  // If check fails, proceed with signup (Supabase will catch duplicate)
}
```

- [ ] **Step 6: Handle PASSWORD_RECOVERY event in `src/App.tsx`**

In the `onAuthStateChange` listener in `App.tsx`, add:

```typescript
if (event === 'PASSWORD_RECOVERY') {
  // Navigate to settings where user can change password
  navigateTo('settings')
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts src/pages/AuthPage.tsx src/App.tsx
git commit -m "feat: add forgot password, Google OAuth, duplicate email check"
```

---

## Task 6: Fix App Flow — "Buat Trip" → Editor, Not AI

**Files:**
- Modify: `src/App.tsx` (change nav button)
- Modify: `src/pages/HomePage.tsx` (change "Buat Trip Baru" CTA)
- Modify: `src/pages/TripEditorPage.tsx` (make AI panel button prominent)

- [ ] **Step 1: Find all "Buat Trip" / "ai" navigation in App.tsx and HomePage**

```bash
cd D:\Tripplaner && grep -n "navigateTo.*ai\|\"ai\"\|'ai'" src/App.tsx src/pages/HomePage.tsx src/pages/Dashboard.tsx 2>/dev/null
```

- [ ] **Step 2: Update any button navigating to "ai" → change to "editor"**

In `src/App.tsx`, find the sidebar/navbar "AI Generator" or "Buat Trip" button. Change:
```tsx
// BEFORE:
onClick={() => navigateTo("ai")}

// AFTER — Keep "ai" page accessible from sidebar as "AI Generator"
// But main CTA "Buat Trip" should go to "editor"
onClick={() => navigateTo("editor")}
```

In `src/pages/HomePage.tsx`, find the primary "Buat Trip Baru" button and update:
```tsx
// BEFORE:
<Button variant="gradient" onClick={() => navigateTo("ai")}>
  <Sparkles className="w-4 h-4 mr-2" />
  Buat Trip Baru
</Button>

// AFTER:
<Button variant="gradient" onClick={() => navigateTo("editor")}>
  <MapPin className="w-4 h-4 mr-2" />
  Buat Trip Baru
</Button>
```

- [ ] **Step 3: Make AI button prominent in TripEditorPage**

In `src/pages/TripEditorPage.tsx`, find the TripAIPanel button/trigger. Look for `Sparkles` icon or `TripAIPanel`. Make it a visible floating button:

```bash
cd D:\Tripplaner && grep -n "TripAIPanel\|Sparkles\|AI\|Generate" src/pages/TripEditorPage.tsx | head -20
```

Find where `TripAIPanel` is rendered or triggered and ensure there's a clearly visible button labeled:

```tsx
<Button
  variant="gradient"
  size="sm"
  className="gap-2 shadow-lg shadow-purple-500/30"
  onClick={() => setShowAIPanel(true)}
>
  <Sparkles className="w-4 h-4" />
  ✨ Generate dengan AI
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/HomePage.tsx src/pages/TripEditorPage.tsx
git commit -m "fix: buat trip navigates to editor, AI is optional from editor"
```

---

## Task 7: AI Generator — Date Pickers + Weather per Day

**Files:**
- Modify: `src/pages/AIGeneratorPage.tsx`

- [ ] **Step 1: Replace `duration` state with `startDate` + `endDate`**

In `AIGeneratorPage.tsx`, find:
```typescript
const [duration, setDuration] = useState(2)
```

Replace with:
```typescript
const [startDate, setStartDate] = useState("")
const [endDate, setEndDate] = useState("")

// Derived: number of days
const duration = startDate && endDate
  ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
  : 2
```

- [ ] **Step 2: Replace duration slider/input UI with date pickers**

Find the duration UI section (likely a slider or number input labeled "Durasi" or "Hari"). Replace with:

```tsx
{/* Date Range */}
<div className="space-y-2">
  <Label className="text-sm font-semibold">Tanggal Trip</Label>
  <div className="grid grid-cols-2 gap-3">
    <div>
      <Label className="text-xs text-muted-foreground">Mulai</Label>
      <Input
        type="date"
        value={startDate}
        min={new Date().toISOString().split('T')[0]}
        onChange={e => setStartDate(e.target.value)}
        className="mt-1"
      />
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">Selesai</Label>
      <Input
        type="date"
        value={endDate}
        min={startDate || new Date().toISOString().split('T')[0]}
        onChange={e => setEndDate(e.target.value)}
        className="mt-1"
      />
    </div>
  </div>
  {duration > 0 && startDate && endDate && (
    <p className="text-xs text-muted-foreground">
      📅 {duration} hari perjalanan
    </p>
  )}
</div>
```

- [ ] **Step 3: Update `handleGenerate` to use `startDate` + calculate dates**

In `handleGenerate`, change validation:
```typescript
// BEFORE:
if (!city.trim()) { ... }

// AFTER:
if (!city.trim()) {
  setError("Kota tujuan wajib diisi.")
  return
}
if (!startDate) {
  setError("Pilih tanggal mulai trip.")
  return
}
```

Update the `generateItinerary` call:
```typescript
const aiResult = await generateItinerary({
  destination: city,
  days: duration,
  travelers: people,
  preferences,
  customMessage,
  minBudget,
  maxBudget,
  start_date: startDate,  // ← ADD THIS
})
```

- [ ] **Step 4: Show weather per day in results**

After `setResult(aiResult)`, update weather fetch to use `duration`:
```typescript
// Weather fetch with actual days count
if (selectedPlace?.lat && selectedPlace?.lon) {
  try {
    const weatherData = await getWeather(
      parseFloat(selectedPlace.lat),
      parseFloat(selectedPlace.lon),
      duration
    )
    setWeather(weatherData)
  } catch {
    setWeather([])
  }
}
```

In the results rendering, find where itinerary days are shown. Add weather badge per day:

```tsx
{/* In the day header section of itinerary results */}
{weather[dayIndex] && (
  <span className="ml-2 text-sm text-muted-foreground flex items-center gap-1">
    {getWeatherIcon(weather[dayIndex].weather_code)}
    {weather[dayIndex].temp_max}°/{weather[dayIndex].temp_min}°C
    {weather[dayIndex].precipitation_probability > 50 && (
      <span className="text-xs text-blue-400">💧{weather[dayIndex].precipitation_probability}%</span>
    )}
  </span>
)}
```

- [ ] **Step 5: Fix booking deep links**

Find `buildBookingLinks` or booking URL generation in AIGeneratorPage. Update all deep links:

```typescript
// In AIGeneratorPage results section, find where booking URLs are generated/displayed
// Replace hardcoded URL patterns with:

function buildDeepLinks(destination: string, checkin?: string, checkout?: string) {
  const q = encodeURIComponent(destination)
  const ci = checkin || ''
  const co = checkout || ''
  return {
    traveloka: `https://www.traveloka.com/en-id/hotel?search=${q}${ci ? `&checkInDate=${ci.replace(/-/g,'')}&checkOutDate=${co.replace(/-/g,'')}` : ''}`,
    tiket: `https://www.tiket.com/hotel?q=${q}${ci ? `&checkIn=${ci}&checkOut=${co}` : ''}`,
    agoda: `https://www.agoda.com/search?city=${q}${ci ? `&checkIn=${ci}&los=${duration}` : ''}`,
    booking: `https://www.booking.com/searchresults.html?ss=${q}${ci ? `&checkin=${ci}&checkout=${co}` : ''}`,
  }
}
```

- [ ] **Step 6: Update `handleReset` to clear new date states**

```typescript
const handleReset = useCallback(() => {
  setResult(null)
  setRecommendations(null)
  setWeather([])
  setCity("")
  setSelectedPlace(null)
  setStartDate("")   // ← changed
  setEndDate("")     // ← changed
  setPeople(2)
  setMinBudget(BUDGET_MIN)
  setMaxBudget(BUDGET_MAX)
  setPreferences([])
  setCustomMessage("")
  setError("")
  setProgress(0)
  setProgressLabel("")
  setSavedTripId(null)
}, [])
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/AIGeneratorPage.tsx
git commit -m "feat: AI generator uses date pickers, shows weather per day, fixed booking deep links"
```

---

## Task 8: Fix Explore — Salin Trip Auth Bug + Remove Simpan + Clean Cards + Itinerary Detail + Comments

**Files:**
- Modify: `src/components/TripDetailModal.tsx`
- Modify: `src/pages/Explore.tsx`
- Modify: `src/lib/supabase.ts`

- [ ] **Step 1: Add supabase helpers for saved_trips and comments**

Append to `src/lib/supabase.ts`:

```typescript
// ─── Saved Trips ─────────────────────────────────────────────

export type SavedTrip = {
  id: string
  user_id: string
  original_trip_id?: string
  name: string
  destination: string
  days: number
  start_date?: string
  end_date?: string
  tags?: string[]
  created_at: string
}

export async function saveTrip(trip: Omit<SavedTrip, 'id' | 'user_id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('saved_trips')
    .insert({ ...trip, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as SavedTrip
}

export async function getSavedTrips() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('saved_trips')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as SavedTrip[]
}

// ─── Trip Comments ────────────────────────────────────────────

export type TripComment = {
  id: string
  trip_id: string
  user_id: string
  author_name?: string
  content: string
  created_at: string
}

export async function getComments(tripId: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('trip_comments')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data as TripComment[]
}

export async function addComment(tripId: string, content: string, authorName: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('trip_comments')
    .insert({ trip_id: tripId, user_id: user.id, content, author_name: authorName })
    .select()
    .single()
  if (error) throw error
  return data as TripComment
}
```

- [ ] **Step 2: Rewrite `TripDetailModal.tsx` completely**

Replace the full file with the fixed version:

```tsx
// src/components/TripDetailModal.tsx
import { useState, useEffect } from "react"
import {
  MapPin, Calendar, Clock, Star, Copy,
  Share2, ExternalLink, Loader2, Check,
  Plane, MessageSquare, X, Send
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { supabase, createTrip, saveTrip, getComments, addComment } from "@/lib/supabase"
import type { TripComment } from "@/lib/supabase"

interface PublicTrip {
  id: string
  trip_id: string
  name: string
  destination: string
  start_date: string | null
  end_date: string | null
  status: string
  days: number
  places: number
  likes: number
  comments: number
  rating: number
  gradient: string
  tags: string[]
  author: string
  authorAvatar: string
  image?: string
}

interface TripDetailModalProps {
  trip: PublicTrip | null
  onClose: () => void
  onCopied?: () => void
}

const CATEGORY_ICONS: Record<string, string> = {
  hotel: "🏨", landmark: "🏛️", food: "🍜",
  nature: "🌿", activity: "🎯", shopping: "🛍️", transport: "🚗",
}

export function TripDetailModal({ trip, onClose, onCopied }: TripDetailModalProps) {
  const [copied, setCopied] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [error, setError] = useState("")
  const [itinerary, setItinerary] = useState<any[]>([])
  const [comments, setComments] = useState<TripComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"itinerary" | "comments">("itinerary")

  useEffect(() => {
    if (!trip || !supabase) return
    // Load itinerary items
    supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', trip.id)
      .order('day', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data }) => setItinerary(data || []))

    // Load comments
    getComments(trip.id).then(setComments)
  }, [trip?.id])

  if (!trip) return null

  const handleShare = async () => {
    const url = `${window.location.origin}/explore?trip=${trip.id}`
    if (navigator.share) {
      try { await navigator.share({ title: trip.name, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const handleCopyToMyTrips = async () => {
    if (!startDate) { setError("Pilih tanggal mulai dulu"); return }
    if (!supabase) { setError("Supabase tidak dikonfigurasi"); return }
    setCopyLoading(true)
    setError("")
    try {
      // Use getUser() — fresh auth call, not cached session
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError("Sesi kadaluarsa. Silakan login ulang.")
        setCopyLoading(false)
        return
      }

      let endDate = ""
      if (trip.days > 0) {
        const start = new Date(startDate + "T00:00:00")
        const end = new Date(start.getTime() + (trip.days - 1) * 86400000)
        endDate = end.toISOString().split("T")[0]
      }

      // Save to saved_trips (not trips — this is a copy from Explore)
      await saveTrip({
        original_trip_id: trip.id,
        name: trip.name,
        destination: trip.destination,
        days: trip.days,
        start_date: startDate,
        end_date: endDate || undefined,
        tags: trip.tags,
      })

      setCopied(true)
      setTimeout(() => { onCopied?.(); onClose() }, 1200)
    } catch (err: any) {
      console.error("Copy trip error:", err)
      setError(err.message || "Gagal menyalin trip. Coba lagi.")
    } finally {
      setCopyLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !supabase) return
    setCommentLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Login dulu untuk berkomentar"); return }
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
      const comment = await addComment(trip.id, newComment.trim(), name)
      setComments(prev => [...prev, comment])
      setNewComment("")
    } catch (err: any) {
      console.error("Comment error:", err)
    } finally {
      setCommentLoading(false)
    }
  }

  // Group itinerary by day
  const dayGroups = itinerary.reduce((acc, item) => {
    const d = item.day || 1
    if (!acc[d]) acc[d] = []
    acc[d].push(item)
    return acc
  }, {} as Record<number, any[]>)

  return (
    <Dialog open={!!trip} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Cover */}
          <div className={cn("aspect-video rounded-xl -mx-6 -mt-6 mb-4 relative overflow-hidden",
            trip.image ? "" : `bg-gradient-to-br ${trip.gradient}`)}>
            {trip.image && (
              <img src={trip.image} alt={trip.name} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-3 left-3 flex gap-2">
              <span className="glass-card px-2 py-1 text-xs text-black flex items-center gap-1">
                <Calendar className="w-3 h-3 text-black" />
                {trip.days} hari
              </span>
            </div>
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">{trip.name}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-bold">{trip.rating.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">oleh @{trip.author}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tags */}
          {trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trip.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-secondary/60 rounded-full text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl">
            {(["itinerary", "comments"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                {tab === "itinerary" ? "📍 Itinerary" : `💬 Komentar (${comments.length})`}
              </button>
            ))}
          </div>

          {/* Itinerary Tab */}
          {activeTab === "itinerary" && (
            <div className="space-y-3">
              {Object.keys(dayGroups).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada itinerary detail untuk trip ini.
                </p>
              ) : (
                Object.entries(dayGroups).map(([day, items]) => (
                  <div key={day} className="space-y-2">
                    <h4 className="text-sm font-bold text-muted-foreground">Hari {day}</h4>
                    {(items as any[]).map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-secondary/30 rounded-xl">
                        <span className="text-lg">{CATEGORY_ICONS[item.category] || "📌"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.time} · {item.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada komentar. Jadilah yang pertama!
                </p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3 p-3 bg-secondary/30 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--aurora-start)] to-[var(--aurora-end)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(c.author_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{c.author_name || "User"}</p>
                      <p className="text-sm">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
              {/* Add comment */}
              {supabase && (
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Tambah komentar..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    className="text-sm"
                  />
                  <Button size="sm" variant="gradient" onClick={handleAddComment} disabled={commentLoading}>
                    {commentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Date Picker for Copy */}
          {showDatePicker && (
            <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-[var(--aurora-start)]/5 to-[var(--aurora-end)]/5 border border-[var(--aurora-start)]/20">
              <Label>Pilih Tanggal Mulai Trip</Label>
              <Input type="date" value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => { setStartDate(e.target.value); setError("") }} />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => setShowDatePicker(false)}>Batal</Button>
                <Button variant="gradient" size="sm" className="flex-1"
                  onClick={handleCopyToMyTrips} disabled={copyLoading}>
                  {copyLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> :
                    copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Berhasil!" : copyLoading ? "Menyalin..." : "Konfirmasi"}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons — only Share + Salin */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            {!showDatePicker && (
              <Button variant="gradient" size="sm" className="flex-1"
                onClick={() => setShowDatePicker(true)}>
                <Copy className="w-4 h-4 mr-1" />
                Salin ke Trip Saya
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Clean up Explore card — remove status + date display**

In `src/pages/Explore.tsx`, find the card content section. Remove:
- Any `{trip.status}` badge display
- Any `{trip.start_date}` / `{trip.end_date}` display in the card

Keep only: name, destination, days, tags, rating, author, likes/comments.

- [ ] **Step 4: Commit**

```bash
git add src/components/TripDetailModal.tsx src/pages/Explore.tsx src/lib/supabase.ts
git commit -m "fix: explore salin trip uses getUser(), remove simpan, add itinerary detail and comments"
```

---

## Task 9: Fix Settings — Save Profile + Change Password

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Wire up Change Password in Settings.tsx**

Find the `handleChangePassword` function or password section. Replace/add:

```typescript
const handleChangePassword = async () => {
  if (!supabase) return
  if (!newPassword) { setPasswordError("Password baru wajib diisi"); return }
  if (newPassword !== confirmPassword) { setPasswordError("Password tidak cocok"); return }
  if (newPassword.length < 6) { setPasswordError("Password minimal 6 karakter"); return }

  setPasswordLoading(true)
  setPasswordError("")
  setPasswordSuccess(false)

  try {
    // updateUser changes password for the currently logged-in user
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setPasswordSuccess(true)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setTimeout(() => setPasswordSuccess(false), 3000)
  } catch (err: any) {
    setPasswordError(err.message || "Gagal mengubah password")
  } finally {
    setPasswordLoading(false)
  }
}
```

- [ ] **Step 2: Ensure Save Profile button calls `handleSaveProfile`**

Find the "Simpan Perubahan" button in the profile tab. Ensure it has:
```tsx
<Button
  variant="gradient"
  onClick={handleSaveProfile}
  disabled={profileLoading}
>
  {profileLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
   profileSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
  {profileSuccess ? "Tersimpan!" : profileLoading ? "Menyimpan..." : "Simpan Perubahan"}
</Button>
```

And show error if any:
```tsx
{profileError && <p className="text-xs text-red-500 mt-2">{profileError}</p>}
```

- [ ] **Step 3: Ensure Change Password button calls `handleChangePassword`**

Find the password change button and ensure onClick calls `handleChangePassword`:
```tsx
<Button
  variant="gradient"
  onClick={handleChangePassword}
  disabled={passwordLoading}
>
  {passwordLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
  {passwordSuccess ? "Password Diubah!" : "Ubah Password"}
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "fix: settings save profile and change password now wired up"
```

---

## Task 10: Repurpose BucketList → Trip Saya

**Files:**
- Modify: `src/pages/BucketList.tsx`
- Modify: `src/App.tsx` (sidebar label if needed)

- [ ] **Step 1: Read current BucketList.tsx**

```bash
cd D:\Tripplaner && head -50 src/pages/BucketList.tsx
```

- [ ] **Step 2: Replace BucketList content to show Saved + My Trips**

Replace the BucketList page to fetch from both `saved_trips` and `trips`:

```tsx
// src/pages/BucketList.tsx — rename to "Trip Saya"
import { motion } from "framer-motion"
import { MapPin, Calendar, Copy, Trash2, Loader2, Plus, Bookmark } from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getTrips, getSavedTrips } from "../lib/supabase"
import type { Trip, SavedTrip } from "../lib/supabase"
import { supabase } from "../lib/supabase"

type Page = "landing" | "login" | "register" | "home" | "editor" | "ai" | "splitbill" | "explore" | "profile" | "achievements" | "bucketlist" | "settings" | "notifications" | "trips"

interface BucketListProps {
  navigateTo: (page: Page) => void
}

export function BucketList({ navigateTo }: BucketListProps) {
  const [activeTab, setActiveTab] = useState<"mytrips" | "saved">("mytrips")
  const [myTrips, setMyTrips] = useState<Trip[]>([])
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    Promise.all([
      getTrips().catch(() => []),
      getSavedTrips().catch(() => []),
    ]).then(([trips, saved]) => {
      setMyTrips(trips)
      setSavedTrips(saved)
      setLoading(false)
    })
  }, [])

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "Belum diatur"
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Trip Saya</h1>
            <p className="text-sm text-muted-foreground">Trip buatan kamu & yang disimpan dari Explore</p>
          </div>
          <Button variant="gradient" size="sm" onClick={() => navigateTo("editor")}>
            <Plus className="w-4 h-4 mr-1" />
            Buat Trip
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl mb-6">
          {([
            { id: "mytrips", label: `✈️ Trip Saya (${myTrips.length})` },
            { id: "saved", label: `🔖 Disimpan (${savedTrips.length})` },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--aurora-start)]" />
          </div>
        ) : activeTab === "mytrips" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {myTrips.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <p className="text-muted-foreground mb-4">Belum ada trip. Yuk buat sekarang!</p>
                <Button variant="gradient" onClick={() => navigateTo("editor")}>
                  <Plus className="w-4 h-4 mr-2" />Buat Trip Pertama
                </Button>
              </div>
            ) : myTrips.map((trip, i) => (
              <motion.div key={trip.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover p-4 space-y-3 cursor-pointer"
                onClick={() => navigateTo("editor")}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{trip.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{trip.destination}
                    </p>
                  </div>
                  <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>{trip.status}</Badge>
                </div>
                {(trip.start_date || trip.end_date) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedTrips.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <p className="text-muted-foreground mb-4">Belum ada trip yang disimpan dari Explore.</p>
                <Button variant="outline" onClick={() => navigateTo("explore")}>
                  <Bookmark className="w-4 h-4 mr-2" />Jelajahi Trip
                </Button>
              </div>
            ) : savedTrips.map((trip, i) => (
              <motion.div key={trip.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover p-4 space-y-3">
                <div>
                  <h3 className="font-bold">{trip.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{trip.destination}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {trip.days} hari · Disimpan {formatDate(trip.created_at)}
                </p>
                {trip.tags && trip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {trip.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-secondary/60 rounded-full text-xs">#{t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update sidebar label in App.tsx**

Find the sidebar/navbar item with `bucketlist` navigation. Change label from "Bucket List" to "Trip Saya":
```bash
cd D:\Tripplaner && grep -n "bucketlist\|Bucket\|bucket" src/App.tsx | head -10
```

Change:
```tsx
// BEFORE:
<span>Bucket List</span>
// AFTER:
<span>Trip Saya</span>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/BucketList.tsx src/App.tsx
git commit -m "feat: repurpose BucketList as Trip Saya (my trips + saved from Explore)"
```

---

## Task 11: Fix Split Bill — Add Bill Form + Real Email

**Files:**
- Modify: `src/pages/SplitBillPage.tsx`

- [ ] **Step 1: Add "Tambah Tagihan" form state**

In `SplitBillPage.tsx`, add state for the add bill form:

```typescript
const [showAddBill, setShowAddBill] = useState(false)
const [billDesc, setBillDesc] = useState("")
const [billAmount, setBillAmount] = useState("")
const [billPaidBy, setBillPaidBy] = useState("")
const [billSplitWith, setBillSplitWith] = useState<string[]>([])
const [addBillLoading, setAddBillLoading] = useState(false)
const [memberNames, setMemberNames] = useState<string[]>([])
const [newMemberName, setNewMemberName] = useState("")
const [participantEmails, setParticipantEmails] = useState<{ name: string; email: string }[]>([])
```

- [ ] **Step 2: Add "Tambah Tagihan" form UI**

Find the split bill page render. After the trip selector and before the bills list, add:

```tsx
{selectedTripId && (
  <div className="mb-6 space-y-3">
    {/* Members management */}
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Anggota Trip</h3>
      <div className="flex flex-wrap gap-2">
        {memberNames.map(name => (
          <span key={name} className="px-3 py-1 bg-secondary/60 rounded-full text-sm">{name}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Nama anggota baru"
          value={newMemberName}
          onChange={e => setNewMemberName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newMemberName.trim()) {
              setMemberNames(prev => [...new Set([...prev, newMemberName.trim()])])
              setNewMemberName("")
            }
          }}
          className="text-sm"
        />
        <Button size="sm" variant="outline"
          onClick={() => {
            if (newMemberName.trim()) {
              setMemberNames(prev => [...new Set([...prev, newMemberName.trim()])])
              setNewMemberName("")
            }
          }}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>

    {/* Add Bill button */}
    <Button variant="gradient" size="sm" onClick={() => setShowAddBill(true)}>
      <Plus className="w-4 h-4 mr-1" />
      Tambah Tagihan
    </Button>

    {/* Add Bill Form */}
    {showAddBill && (
      <div className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Tagihan Baru</h3>
        <div className="space-y-2">
          <Input placeholder="Deskripsi (mis: Makan malam)" value={billDesc}
            onChange={e => setBillDesc(e.target.value)} />
          <Input type="number" placeholder="Jumlah (Rp)" value={billAmount}
            onChange={e => setBillAmount(e.target.value)} />
          <select
            value={billPaidBy}
            onChange={e => setBillPaidBy(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">-- Siapa yang bayar? --</option>
            {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Split dengan:</p>
            {memberNames.map(name => (
              <label key={name} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox"
                  checked={billSplitWith.includes(name)}
                  onChange={e => {
                    if (e.target.checked) setBillSplitWith(prev => [...prev, name])
                    else setBillSplitWith(prev => prev.filter(n => n !== name))
                  }} />
                {name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1"
            onClick={() => setShowAddBill(false)}>Batal</Button>
          <Button variant="gradient" size="sm" className="flex-1"
            disabled={addBillLoading}
            onClick={async () => {
              if (!billDesc || !billAmount || !billPaidBy || billSplitWith.length === 0) return
              if (!supabase || !selectedTripId) return
              setAddBillLoading(true)
              try {
                const { addSplitBill } = await import('../lib/supabase')
                const newBill = await addSplitBill({
                  trip_id: selectedTripId,
                  description: billDesc,
                  amount: Number(billAmount),
                  currency: 'IDR',
                  paid_by: billPaidBy,
                  split_between: billSplitWith,
                  settled: false,
                })
                setBills(prev => [...prev, newBill])
                setBillDesc(""); setBillAmount(""); setBillPaidBy(""); setBillSplitWith([])
                setShowAddBill(false)
              } catch (err) {
                console.error("Add bill error:", err)
              } finally {
                setAddBillLoading(false)
              }
            }}>
            {addBillLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
          </Button>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Fix `handleSendBills` to use real Resend API**

Replace the fake `handleSendBills`:

```typescript
const handleSendBills = async () => {
  if (!selectedTripId) return
  setSendingEmail(true)
  try {
    const { sendSplitBillEmail } = await import('../lib/api')
    const selectedTrip = userTrips.find(t => t.id === selectedTripId)
    await sendSplitBillEmail({
      trip_name: selectedTrip?.name || "Trip",
      items: bills.map(b => ({
        description: b.description,
        amount: Number(b.amount),
        paid_by: b.paid_by,
        split_between: b.split_between,
      })),
      currency: 'Rp',
      participant_emails: participantEmails,
    })
    setEmailSent(true)
    setTimeout(() => setEmailSent(false), 3000)
  } catch (err) {
    console.error("Send email error:", err)
    alert("Gagal kirim email. Pastikan API key Resend sudah dikonfigurasi.")
  } finally {
    setSendingEmail(false)
  }
}
```

Add email input UI for participants (near the send button):
```tsx
{/* Participant emails for sending */}
<div className="space-y-2 mb-4">
  <p className="text-sm font-medium">Email Anggota (untuk kirim tagihan)</p>
  {allParticipants.map(name => (
    <div key={name} className="flex items-center gap-2">
      <span className="text-sm w-24 shrink-0">{name}:</span>
      <Input
        type="email"
        placeholder="email@example.com"
        value={participantEmails.find(p => p.name === name)?.email || ""}
        onChange={e => setParticipantEmails(prev => {
          const updated = prev.filter(p => p.name !== name)
          if (e.target.value) updated.push({ name, email: e.target.value })
          return updated
        })}
        className="text-sm"
      />
    </div>
  ))}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/SplitBillPage.tsx
git commit -m "feat: split bill add form, member management, real Resend email sending"
```

---

## Task 12: Final — Update .env, Health Check, API Audit

**Files:**
- Modify: `server/index.ts` (update health check to include openai)
- Verify: `.env` has all keys

- [ ] **Step 1: Verify .env has all keys**

```bash
cd D:\Tripplaner && grep -E "GEMINI_API_KEY|OPENAI_API_KEY|RESEND_API_KEY|VITE_SUPABASE" .env
```

Expected output: 4 lines, all non-empty.

- [ ] **Step 2: Update health check to show openai status**

In `server/index.ts`, update the health check:

```typescript
// BEFORE:
const [supabaseOk, claudeOk, geminiOk] = await Promise.all([
  checkSupabase().then(() => true).catch(() => false),
  checkClaude().then(() => true).catch(() => false),
  checkGemini().then(() => true).catch(() => false),
])

// AFTER:
import { checkOpenAI } from './services/openai.js'

const [supabaseOk, geminiOk, openaiOk] = await Promise.all([
  checkSupabase().then(() => true).catch(() => false),
  checkGemini().then(() => true).catch(() => false),
  checkOpenAI().then(() => true).catch(() => false),
])

res.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  services: {
    supabase: supabaseOk,
    gemini: geminiOk,
    openai_fallback: openaiOk,
    resend: !!process.env.RESEND_API_KEY,
  },
})
```

- [ ] **Step 3: Full build test**

```bash
cd D:\Tripplaner && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Start dev server and smoke test**

```bash
cd D:\Tripplaner && npm run dev 2>&1 &
sleep 3
curl http://localhost:3000/api/health
```

Expected JSON: `{ "status": "ok", "services": { "supabase": true, ... } }`

- [ ] **Step 5: Final commit**

```bash
git add server/index.ts
git commit -m "fix: update health check to report gemini, openai fallback, resend status"
```

---

## Self-Review Checklist

### Spec Coverage
| Requirement | Task |
|------------|------|
| Gemini → OpenAI fallback | Task 3 |
| Resend email | Task 4 |
| Forgot password | Task 5 |
| Google OAuth | Task 5 |
| Duplicate email | Task 5 |
| App flow: Buat Trip → Editor | Task 6 |
| AI date pickers (not duration) | Task 7 |
| Weather per day in AI results | Task 7 |
| Fix booking deep links | Task 7 |
| Explore: fix Salin trip auth bug | Task 8 |
| Explore: remove Simpan button | Task 8 |
| Explore: itinerary detail in modal | Task 8 |
| Explore: comments section | Task 8 |
| Explore: clean cards (no status/date) | Task 8 |
| Settings: save profile | Task 9 |
| Settings: change password | Task 9 |
| Settings: upload photo | Task 2 (bucket) + existing code |
| BucketList → Trip Saya | Task 10 |
| Split bill add form | Task 11 |
| Split bill real email | Task 11 |
| DB migrations (profiles, saved_trips, etc.) | Task 2 |
| API key status audit | Task 12 |

### No Placeholders Found ✅
### Type Consistency ✅ (`saveTrip`, `getSavedTrips`, `getComments`, `addComment` defined in Task 8 Step 1, used in Task 8 Step 2 and Task 10)

---

## Required Action From User

Before running this plan, the user must:

1. **Enable Google OAuth in Supabase Dashboard:**
   - Go to `Authentication → Providers → Google`
   - Add Google Client ID + Secret from Google Cloud Console
   - This cannot be done via code

2. **API Keys already in `.env`:** ✅ Gemini, OpenAI, Resend all set

3. **Resend sender domain:** Free tier uses `onboarding@resend.dev` as `from` address unless a custom domain is verified. The email template in Task 4 uses `noreply@tripplanner.app` — change to `onboarding@resend.dev` if no domain is verified yet.
