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
  text-foreground: "hsl(222 47% 11%)"
  border: "hsl(214 32% 88%)"
  input: "hsl(214 32% 88%)"
typography:
  display:
    fontFamily: "Satoshi, Inter, sans-serif"
    fontWeight: 700
    lineHeight: 1.1
  heading:
    fontFamily: "Satoshi, Inter, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Inter, DM Sans, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, sans-serif"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  full: "9999px"
spacing:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "24px"
  "3xl": "32px"
  "4xl": "48px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "linear-gradient(135deg, #764ba2, #667eea)"
    shadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
    transform: "scale(1.02)"
  button-secondary:
    backgroundColor: "hsl(210 40% 96%)"
    textColor: "hsl(222 47% 11%)"
    rounded: "{rounded.xl}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "hsl(215 16% 35%)"
    hoverBackgroundColor: "hsl(210 40% 94%)"
  card-default:
    backgroundColor: "hsl(0 0% 100%)"
    border: "1px solid hsl(214 32% 88%)"
    rounded: "{rounded.xl}"
    shadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)"
  card-hover:
    borderColor: "rgba(102, 126, 234, 0.3)"
    shadow: "0 10px 25px rgba(0,0,0,0.08)"
    transform: "translateY(-2px)"
  input-default:
    borderColor: "hsl(214 32% 88%)"
    backgroundColor: "hsl(0 0% 100%)"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
    focusRingColor: "rgba(102, 126, 234, 0.4)"
  badge-aurora:
    backgroundColor: "rgba(102, 126, 234, 0.12)"
    borderColor: "rgba(102, 126, 234, 0.4)"
    textColor: "#4f46e5"
  badge-sunset:
    backgroundColor: "rgba(249, 115, 22, 0.12)"
    borderColor: "rgba(245, 87, 108, 0.4)"
    textColor: "#ea580c"
---

# Design System: TripPlanner

## 1. Overview

**Creative North Star: "The Warm Horizon"**

TripPlanner feels like the moment before a trip begins: the excitement of planning, the clarity of knowing exactly where you're going, and the warmth of doing it with people you care about. The interface doesn't feel like software — it feels like opening a map on a sunlit morning. Every screen rewards curiosity and keeps momentum.

**Character:** Friendly, organized, quietly premium. Not corporate, not chaotic. Warm without being saccharine. The aesthetic earns trust through clarity and rewards attention with delightful moments.

**Key Characteristics:**
- Tonal surface layering (no heavy shadows); depth comes from lightness steps
- Aurora gradient as accent voice, not background noise
- Generous radius (12–16px) for approachable, tactile components
- Motion is responsive and purposeful — enters/exits feel natural, not theatrical
- Layout breathes with variable spacing; never uniform padding everywhere
- Cards used only when content is distinct, actionable, and worth comparison

---

## 2. Colors: The Twilight Sail Palette

The Aurora palette evokes a twilight sky — purple deepening into pink at the horizon. It's warm, not cold; optimistic, not aggressive. Used as an accent voice (≤15% of any screen), never as a default surface.

### Primary — Twilight Sail
**Aurora Purple** (`#667eea`): Primary buttons, active nav states, key CTAs, logo marks. Carries brand recognition.
**Aurora Mid** (`#764ba2`): Gradient midpoint. Adds depth to gradient transitions.
**Aurora Pink** (`#f093fb`): Gradient terminus. Used sparingly on hover states and decorative elements.

### Secondary — Warm Action
**Sunset Orange** (`#f97316`): Secondary accents, call-to-action highlights. Not used as frequently as primary — when it appears, it means "do this now."
**Coral** (`#f5576c`): Destructive states, error treatments, urgency indicators.

### Tertiary — Functional
**Ocean Blue** (`#0ea5e9`): Info states, links, water/destination-related imagery tinting.
**Ocean Deep** (`#1e40af`): Darker ocean variant for strong contrast text on light.

### Neutral — Tonal Surface Stack
The system uses tonal layering, not shadows for depth. Every surface is a lightness step from a warm near-white base.

- **Surface Base** (`hsl(0 0% 98%)`): Page background. Near-white with zero chroma.
- **Surface Card** (`hsl(0 0% 100%)`): Card and panel surfaces. Pure white, one step above base.
- **Border** (`hsl(214 32% 88%)`): Dividers, input strokes, card outlines. Cool-tinted gray.
- **Text Primary** (`hsl(222 47% 11%)`): Near-black for headings and primary copy.
- **Text Muted** (`hsl(215 16% 35%)`): Secondary text, labels, descriptions.

### Named Rules
**The Accent Scarcity Rule.** The Aurora gradient appears on ≤15% of any screen. Its power comes from restraint. A gradient that appears everywhere is wallpaper — it stops meaning anything.

---

## 3. Typography

**Display / Heading Font:** Satoshi (700 weight) — geometric sans with personality. Used for headings, hero text, navigation labels. Commits to one strong family rather than mixing.

**Body Font:** Inter (400–500 weight) — clean, legible, humanist. Used for body copy, labels, descriptions. Pairs with Satoshi as a functional hierarchy.

**Character:** Functional warmth. Satoshi brings personality to headlines; Inter keeps body copy comfortable at length. Not cold monospace, not overly decorative serif.

### Hierarchy
- **Display** (Satoshi 700, clamp(2rem, 5vw, 3.5rem), 1.1 line-height): Hero headlines, page titles, marketing CTA text.
- **Headline** (Satoshi 600, 1.5–1.75rem, 1.2 line-height): Section headings, card titles, nav active states.
- **Title** (Satoshi 600, 1.125–1.25rem, 1.3 line-height): List item titles, dialog headings, table headers.
- **Body** (Inter 400, 0.9375rem, 1.6 line-height): Paragraph text, descriptions, form labels. Max line length 70ch.
- **Label** (Inter 500, 0.75–0.8125rem, tracking 0.01em): Badges, tags, metadata, helper text. Uppercase only when semantically required (never for decoration).

---

## 4. Elevation

TripPlanner uses **tonal surface layering**, not shadows, as the primary depth cue. Cards and panels are at different lightness steps — the lighter the surface, the higher the elevation.

- **Base surface:** Page background, `hsl(0 0% 98%)`
- **Card surface:** White cards, `hsl(0 0% 100%)`, one step above base
- **Elevated surface:** Dropdowns, dialogs, tooltips. Use `backdrop-filter: blur(16px)` with a subtle white tint.

**Shadows exist but are minimal** — used only for hover states and interactive feedback. Structural depth comes from tonal contrast.

### Shadow Vocabulary
- **`card`** (`0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)`): Card at rest. Barely visible — the card's white surface is the elevation signal.
- **`card-md`** (`0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)`): Card on hover. Adds presence without drama.
- **`card-lg`** (`0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)`): Modals, dialogs. The heaviest shadow in the system.
- **`glass`** (`0 8px 32px rgba(31, 38, 135, 0.15)`): Glass-morphism elements, used sparingly. Never as decorative default.
- **`glow-aurora`** (`0 0 40px rgba(102, 126, 234, 0.4)`): Focused accent elements. Used sparingly for emphasis.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, elevation). If a shadow appears on an element that isn't being interacted with, it's unnecessary.

---

## 5. Components

### Buttons
- **Shape:** Rounded-xl (16px radius). Friendly, approachable — never sharp.
- **Primary:** Aurora gradient background, white text, medium shadow. Padding 12px 24px.
- **Hover:** Slight scale (1.02), shadow lifts. Transition 300ms ease-out.
- **Secondary:** Light surface (`hsl(210 40% 96%)`), dark text. Ghost when resting, gains background on hover.
- **Ghost:** Transparent background, muted text. Hover: soft gray background appears.
- **Destructive:** Coral-red background for irreversible actions.

### Cards
- **Corner style:** Rounded-xl (16px radius). Generous but not bubbly.
- **Background:** White (`hsl(0 0% 100%)`). The surface itself is the depth signal.
- **Border:** 1px solid `hsl(214 32% 88%)`. Visible but not loud.
- **Hover:** Border shifts to `rgba(102, 126, 234, 0.3)`, shadow lifts to card-md, 2px upward translate.
- **Internal padding:** 16–24px. Spacious enough to feel breathable.

### Chips / Badges
- **Style:** Pill-shaped (rounded-full). Background tinted with aurora/sunset/ocean at low opacity, border at matching saturation.
- **Selected state:** Solid tint background, darker text. Clear visual toggle.
- **Text:** Small, semibold. Not uppercase unless functional.

### Inputs
- **Style:** 1px border (`hsl(214 32% 88%)`), white background, rounded-xl.
- **Focus:** Ring in aurora at 40% opacity — visible but not aggressive. No color change on border.
- **Error:** Border shifts to destructive color with subtle destructive background tint.
- **Placeholder:** `text-muted-foreground` (`hsl(215 16% 35%)`). Never light gray on white.

### Navigation
- **Style:** Fixed top bar. Glass-card background with subtle blur when content scrolls behind.
- **Active state:** Aurora gradient pill with white text. Commanding presence.
- **Inactive state:** Transparent with muted text. Subtle hover background.
- **Mobile:** Horizontal scrollable pill row below the top bar. Same active treatment.

### Dialogs
- **Backdrop:** Semi-transparent dark overlay with blur.
- **Panel:** White surface, rounded-2xl, card-lg shadow. Generous padding (24–32px).
- **Close button:** Top-right, ghost style.

---

## 6. Do's and Don'ts

### Do:
- **Do** use the Aurora gradient as an accent voice, not decoration. One decisive gradient use beats three timid ones.
- **Do** use tonal surface differences to communicate depth. White card on near-white background is enough.
- **Do** use generous radius (12–16px) consistently. It communicates warmth and approachability.
- **Do** use motion for feedback and orientation. Hover transitions, stagger entrances, smooth page changes.
- **Do** design for the squint test: primary action and secondary grouping should be obvious when blurred.
- **Do** use real imagery for destinations and trips. A photo of an actual place beats a gradient placeholder.

### Don't:
- **Don't** use purple/aurora gradient as a background wash across entire sections. The gradient is an accent, not a canvas.
- **Don't** use glassmorphism decoratively. Frosted glass cards used because they look "modern" are banned.
- **Don't** use dark glass-morphism themes. TripPlanner is light and bright; depth comes from tonal layering.
- **Don't** use identical card grids (icon + heading + text, repeated). Cards should have distinct content, not identical structure.
- **Don't** use gradient text for headings. Use solid color emphasis via weight and scale, not `background-clip: text`.
- **Don't** use side-stripe borders (colored border-left > 1px as accent on cards or alerts). Use full borders, background tints, or leading icons.
- **Don't** use heavy shadows on resting elements. Resting cards should be nearly flat; only hovered/elevated elements gain shadow.
- **Don't** use pure black or pure white as text colors. Use `hsl(222 47% 11%)` for primary text, `hsl(0 0% 100%)` for inverted text only.
- **Don't** repeat the same section structure across a page. Vary layout rhythm; same padding everywhere is monotony.