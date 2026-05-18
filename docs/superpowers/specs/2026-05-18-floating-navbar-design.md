# Floating Centered Navbar Design Spec

**Date:** 2026-05-18
**Author:** TripPlanner
**Status:** Approved

## Overview

Mengganti navbar fixed full-width menjadi **floating centered pill** dengan glass blur effect. Navbar melayang di atas konten — saat scroll, konten webpage bisa melewati di belakang navbar dengan efek transparan blur yang estetik.

---

## Design Decisions

### Shape & Position
- **Shape:** `rounded-2xl` (subtle rounded, tidak full pill)
- **Width:** `max-w-5xl`
- **Position:** `fixed top-4 left-1/2 -translate-x-1/2` — centered horizontal, 16px dari atas layar
- **Z-index:** `z-50` (tetap di atas konten)

### Background & Effects
- **Background:** `bg-white/60 backdrop-blur-2xl` — ~60% opacity, kuat blur
- **Border:** `border border-white/40`
- **Shadow:** `shadow-2xl shadow-black/10`
- **Ring glow:** subtle `ring-1 ring-white/20` untuk depth

### Nav Items (Tetap Sama)
**Center:** Dashboard · Explore · Bucket List
**Right:** Notification Bell · Avatar · Settings

### Mobile
- Navbar tetap floating, scale down
- Nav items collapse ke horizontal scroll atau hamburger

### Page Content
- `padding-top` untuk konten perlu penyesuaian (tidak lagi `pt-16` tetap)

---

## Implementation

**File:** `src/App.tsx`
**Component:** `MainNav`
**Approach:** Modify existing `MainNav` — no new component needed

### Changes:
1. Remove `fixed top-0 left-0 right-0`
2. Add `fixed top-4 left-1/2 -translate-x-1/2 max-w-5xl w-[calc(100%-2rem)]`
3. Change background to glass blur
4. Add shadow-2xl and ring effect
5. Adjust mobile layout

---

## Success Criteria
- [ ] Navbar floating centered di atas layar
- [ ] Background transparan ~60% dengan blur kuat
- [ ] Konten scroll melewati di belakang navbar
- [ ] Nav items dan right section tetap berfungsi
- [ ] Responsive mobile friendly