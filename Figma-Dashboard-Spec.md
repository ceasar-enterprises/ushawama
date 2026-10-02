# Ushawama — Dashboard Design System (Figma Spec)

Source of truth: the app's real theme (`src/theme.ts`), the live dashboard screen
(`src/screens/DashboardScreen.tsx`), and the product rule **no emoji, ever**.
This spec is what you re-create in Figma — exact tokens, components, and the
dashboard frame. 1 Figma unit = 1 px. Grid = 4 pt.

---

## 1. Artboard / Frame

| Setting | Value |
|---|---|
| Frame name | `Dashboard — 390` |
| Size | **390 × 844** (iPhone 14 size, the primary target) |
| Viewport fill | `background` `#FAFAFA` |
| Grid | 4 pt layout grid, 16 px side margins |

Copy this frame 2×: `Dashboard — Empty`, `Dashboard — With matches`.

---

## 2. Design Tokens (make these Figma Styles/Variables)

### Colors (swatch per style name)

| Token | Hex | Use |
|---|---|---|
| `primary` | `#0B4F3A` | Headers, primary buttons, filled banner |
| `primaryLight` | `#2E7D5B` | Accents, level-1 badge, success-adjacent fills |
| `primaryDark` | `#082E22` | Status bar, header overlay |
| `secondary` | `#FF8F00` | Learn tab, quick-tip card, warning accents |
| `secondaryLight` | `#FFB74D` | Secondary button, decorative |
| `accent` | `#0277BD` | Duty tab, "Check Duty" dot |
| `accentLight` | `#4FC3F7` | Decorative fills |
| `info` | `#1565C0` | Trade tab, in-transit status, list-detail text |
| `success` | `#18794E` | Delivered / accepted / check circles |
| `warning` | `#F9A825` | Pending status dot |
| `error` | `#C62828` | Disputed, errors |
| `background` | `#FAFAFA` | Screen background |
| `surface` | `#FFFFFF` | Cards, tab bar |
| `surfaceElevated` | `#F5F5F5` | Chips, inputs, inactive tabs |
| `border` | `#E0E0E0` | Card borders, open check circle |
| `borderLight` | `#EEEEEE` | Dividers |
| `textPrimary` | `#212121` | Titles |
| `textSecondary` | `#757575` | Body / meta |
| `textMuted` | `#9E9E9E` | Helper text, inactive |
| `textOnPrimary` | `#FFFFFF` | Text on green/orange/blue |

### Typography — Font: **Inter** (SF Pro closest free match; system font on iOS)

Make these Text Styles. Line height = 1.3 × size unless noted.

| Style | Size | Weight | Color | Use |
|---|---|---|---|---|
| `Hero / Greeting` | 24 | 800 | textPrimary | "Karibu, Nalubega" |
| `Title / Section` | 17 | 700 | textPrimary | "Quick Actions", "Active Trades" |
| `Card CardTitle` | 15 | 700 | textPrimary | "Bei ya Bidhaa" |
| `Body` | 15 | 400 | textPrimary | Prices, product lines |
| `BodyStrong` | 15 | 600 | textPrimary | Listings, status labels |
| `Meta` | 13 | 400 | textSecondary | village · role, match meta |
| `Label` | 11 | 700 | textPrimary | Button labels, badges |
| `Micro` | 11 | 500 | textMuted | timestamps, helper |
| `OnDark` | 15 | 600 | textOnPrimary | Text on green banner |
| `CTA` | 15 | 700 | — | Primary/secondary button text |

### Radii & Spacing

| Token | px |
|---|---|
| Space 2 | 8 | — | `Spacing.sm` |
| Space 3 | 12 | — | `Spacing.md` |
| Space 4 | 16 | — | `Spacing.lg` |
| Space 5 | 20 | — | `Spacing.xl` |
| Radius sm | 6 / `Radius.sm` |
| Radius md | 10 / `Radius.md` |
| Radius lg | 14 / `Radius.lg` |
| Radius xl | 20 / `Radius.xl` |
| Radius full | 999 / `Radius.full` |
| Shadow sm | 0/1/2, 8% black (elevation-2) — for quick-action buttons |

---

## 3. Component Library (build these components, then reuse)

### Tab Button (×5)
- Icon: **unfilled dot** 7×7, radius 4, border 1.5 `border: color-coded`.
- Active state: **filled** dot with that tab's color.
- Tab colors: Dashboard `primary`, Duty `accent`, Learn `secondary`, Trade `info`, Profile `level4 #9C27B0`.
- Label: `Label` 11/600, active = `primary`, inactive = `textMuted`.
- Bar: 390×56, fill `surface`, top border `borderLight` 1.

### Card
- 358 wide (390 − 2×16), corner `Radius.lg` (14).
- Variants:
  - `elevated` — fill `surface`, `Shadow.md`, optional title+subtitle.
  - `outlined` — fill `surface`, border `border` 1.
  - `filled` — fill a color (green banner / secondary tip), no border.
- Padding: content 16. Inner gaps 8–12.
- Optional `accentColor` = thin colored top bar (4 px) — use for active matches.

### Button
- Height 44 (lg) / 32 (sm). Corner `Radius.md`.
- `primary` — fill `primary`, text `textOnPrimary`.
- `secondary` — fill `secondary`, text `textOnPrimary`.
- `outline` — border `primary` 1, text `primary`.
- `ghost` — text `primary`, transparent.
- Loading = text dimmed + small spinner (no emoji).

### LevelBadge
- Circle 24 (`sm`): completed = filled `level{n}`, not = fill `surfaceElevated`, border `border` 1.
- Levels: 1 `#2E7D5B`, 2 `#2196F3`, 3 `#FF9800`, 4 `#9C27B0`, 5 `#F44336`.

### ProgressBar
- Track 6 px tall, radius 3, fill `surfaceElevated`; value fill = `level2 #2196F3`.
- Label above in `Micro`.

### Status Dot
- 8×8 circle. Colors: pending `warning`, accepted `success`, in_transit `info`,
  delivered `success`, disputed `error`. Sits left of a `Micro` uppercase label.

### VoiceButton
- Circle, fill `primary`. Face:
  - idle/listen = `●` (U+25CF) white,
  - speaking = `…` (U+2026) white,
  - speak-CTA variant = `▶` (U+25B6) white.
  - Sizes: sm 40, md 52, lg 64. Label beside/below in `Meta`.

---

## 4. Dashboard Frame — section tree (top → bottom)

All x-padding 16 (content width 358).

### 4.1 Status + Header (0 → 88)
- Status bar 0–44: fill `primaryDark #082E22`, white time/battery placeholders.
- Header 44–88: fill `primary #0B4F3A`, center title **Ushawama** (17/700 white).

### 4.2 Welcome Banner (88 → ~196)
- Card `filled` fill `primary`, corner `Radius.xl` (20), padding 16, `overflow: hidden`.
- **Background illustration (new):** flat-vector cargo truck, right-aligned, bleeding off the
  right/bottom edges — source `assets/illustrations/truck-header.svg|png` (1600×420, transparent
  PNG for app, want the SVG in Figma → drag the .svg straight onto the frame).
  Params: right −40, bottom −22, width ≈ 430 (dp/px at 390 frame), z-below text. In Figma: place
  the SVG, set its size, keep it behind the text layer.
- Row: left stack + VoiceButton (sm, right).
  - `Hero` "Karibu, Nalubega" (24/800 white)
  - `OnDark` meta "Busia Town · Seller" (13 white, 85% opacity)
  - VoiceButton wrapper in Figma: white fill at 18% opacity over the green.
- Bottom `OnDark` italic hint (13, 92% white):
  "What do you need today? Say \"check duty\" or \"find buyer\""
- **Variant "New/low-literacy":** same banner, hint becomes the two example phrases as large 20px buttons (row of 2, height 56, white 12% fill). Include as separate variant frame.

### 4.3 Quick Actions (≈ 228 → 320)
- Section title `Title` "Quick Actions" (17/700, margin-top 20, bottom 8).
- 4 buttons in a row, gap 4, each 1/4 width:
  fill `surface`, corner `Radius.lg`, `Shadow.sm`, padding vertical 20, centered.
  - **Dot** 10×10 radius 5 above the label (color coded below)
  - Labels 11/600, 3 lines max ("Check Duty", "Find Buyer", "Continue Lesson", "Post Product").
- Dot colors: Check Duty `accent`, Find Buyer `info`, Continue Lesson `secondary`, Post Product `primary`.

### 4.4 My Reading Journey (≈ 352)
- Section title "My Reading Journey" (same as 4.3).
- Card `elevated`, title "Bei ya Bidhaa", subtitle "Level 2 of 5 · 12h done".
- Inside: ProgressBar (value = 5/14 = 36%), label "5/14 lessons".
- "Next up:" `Micro` + "Numbers and Money" `BodyStrong primary`.
- Row of 5 LevelBadges (sm), gap 8. Levels 1&2 completed (filled), 3–5 open.

### 4.5 Active Trades (≈ 480)
- Header row: "Active Trades" (left, `Title`) + "See All →" (right, 13/600 `primary`).
- **Empty state card** (`Dashboard — Empty` frame):
  - `outlined`, compact.
  - "No active trades yet" 15/700 `textPrimary`
  - "Post a product or find a buyer — we'll match you at your border." 13 `textSecondary`
  - Button `primary` sm "Find a buyer" (left aligned).
- **Match cards** (`Dashboard — With matches` frame) — repeat per match, gap 8:
  - `elevated` white card, padding 12, row: left info / right price.
  - Left: status dot + `Micro` uppercase status; product line `BodyStrong`
    "Maize (500 units)"; meta `Meta` "Seller match · Busia".
  - Right (right-aligned): price `BodyStrong primary` "UGX 250,000";
    `Micro` "2h ago".

### 4.6 Quick Tip (≈ 590)
- Card `filled` fill `secondary #FF8F00`, corner `Radius.md`, padding 12, row:
  - Dot 10×10 radius 5 (rotates with each tip: levels 2/4/5 colors).
  - Tip text 13/500, white, flex-1, 2 lines max.
- Tip lines (rotate; show one):
  1. "Bean prices at Busia rose 12% this week" — dot `#2196F3`
  2. "New STR threshold: goods under UGX 2M are duty-free" — dot `#18794E`
  3. "NSSF registration deadline: 30 Sept 2026" — dot `#1565C0`

### 4.7 Voice Search Bar (≈ 626 → end)
- Card `outlined`, full width, padding 12, row, gap 12:
  - VoiceButton `md` (speak variant)`●` face.
  - Right: `Meta` muted placeholder:
    "Tap the mic and say what you need…" (two lines allowed).
- Bottom whitespace 20.

### 4.8 Tab Bar (788 → 844)
- 390 × 56, fill `surface`, top border `borderLight` 1.
- 5 tabs evenly spaced. See `Tab Button` component. Active = Dashboard (filled `primary` dot).

---

## 5. Golden Rules (constraints that make it "Ushawama")

1. **No emoji, ever.** Iconography = geometric shapes only: dots (circle), `●`, `…`, `▶`, `→`, `›`, `✓`, `✕`, `·`, `—`.
2. Dots carry color semantics: filled dot = active/affirmative; outlined = inactive; color = feature/domain.
3. 4-pt grid everywhere. Card padding 16, button padding 12–16, gaps in steps of 4/8/12/16.
4. Two-tone palette dominance: green `#0B4F3A` (brand/action) + warm orange `#FF8F00` (tips/learning) + blue `#0277BD` (information/duty).
5. Text hierarchy by weight+size from the type scale — never add more colors.
6. Vertical rhythm: section margin-top 20, bottom 8.
7. Dark-on-green only for banner content; all body copy stays on neutrals.

---

## 6. Export hints

- Quick export: In Figma select the two frames → Export PNG @1x and @2x into
  `ushawama/docs/design/` for design reviews.
- Turn tokens into **Variables** (Colors + Type) right away so future screens
  (Duty, Learn, Marketplace, Trucking, Payments, Profile) inherit them.
- Component instances (Card/Button/Badge) make the other 6 screens fast.

## 7. Fleet Control (My Hauls) — the trucking board, mobile-adapted

The Figma control-board file (main-control-board) was reused as the app's
**My Hauls** fleet view, rebuilt in brand tokens. Build it in Figma as one
mobile frame `Trucking / My Hauls` (390×844, light `#FAFAFA`).

Layout, top to bottom:

1. **KPI grid — 2×2 tiles** (Card variant `elevated`, 8px radius, `48.5%` width,
   gap 8). Each tile: 8px status dot top-left + number (Inter 800, `xl`) + label
   (Inter 600, `xs`, uppercase, `uppercase`, muted).
   - Active hauls → dot `accent #0277BD`
   - Loading → dot `secondary #FF8F00`
   - At destination → dot `success #18794E`
   - Idle ready → dot `textMuted #9E9E9E`
2. **Fleet utilization — capacity bars.** One row per truck: plate (`xs` bold,
   `textSecondary`, width 64) · 8px track (radius 4, fill `surfaceElevated`,
   1px `borderLight` border) · `%` label right (width 36, `xs` 700). Fill width =
   `onboard tonnes / capacity`, color by status: hauling `accent`, loading
   `secondary`, at-destination `success`, idle `border`.
3. **Active manifest — one Card per truck on the road** (hauling/loading/
   at-destination): `plate · driver` + status badge (text `<COLOR>22` bg,
   `.score` pill): ON ROAD `accent`, LOADING `secondary`, AT DEST `success`.
   Meta line: `cargo · pickup → dropoff · Xt of Yt`. Hauling rows get a
   "Mark Delivered" secondary button.
4. **Return-load radar card** — repeats the board's radar idea as a real
   feature: top 4 open backhauls via `matchCargoForTruck`, each row a CargoMatch
   (cargoType, weight + route + fee, `score%` pill, **Take Load** button).

Golden rule preserved: **no emojis anywhere** — statuses are colored pills and
the 8px dot, never pictographs.

## Rebuild checklist

- [ ] 2 color/type variable sets created from §2
- [ ] Core components: Button, Card(3 variants), LevelBadge, ProgressBar, StatusDot, VoiceButton, TabButton
- [ ] `Dashboard — With matches` frame fully built
- [ ] `Dashboard — Empty` duplicate with empty-state card
- [ ] Low-literacy variant frame (big phrase buttons in banner)
- [ ] Passed the "no emoji" check on every layer name/content

---

## §8 Command Centre Modules (6-tab layout now)

The app now has **6 bottom tabs**: Home · Duty · Learn · Trade · **Center**
(new, icon `cube`, tint `primaryLight`) · Me. The Center tab hosts the
**Command Centre** stack — a control board for operations.

### Command Centre hub (`CommandCentre`)
1. **KPI strip** — 2×2 grid, one Card per KPI: `In transit` (accent),
   `At border` (warning), `Duty due $` (error when 0 → success), `Open tickets`
   (error when urgent → secondary). Big `xl/800` value + `xs` label + 8px dot.
2. **Live Operations card** — `filled primary` card, one alert row per signal:
   8px dot (urgent `error`, warn `warning`, info `info`, good `success`) +
   `sm` white text.
3. **Command Modules grid** — 2-column wrapped cards (icon tile 42×42 at
   `color18`, Ionicons glyph, `md/700` title, `xs` sub; shadow `sm`):
   - Live Tracking — `navigate-circle`, accent
   - Ticketing — `chatbubbles`, secondary
   - Customs Clearing — `document-text`, level4
   - Estimates — `receipt`, level3
   - Warehousing — `cube`, info
   - Trucks & Cargo — `bus`, `primaryLight` (deep-links to Trade → Trucking)

### Live Tracking (`LiveTracking`)
Filter chips (All / In transit / At border / Delivered). Shipment Card:
ref + status pill (BOOKED muted, ON ROAD accent, AT BORDER warning, CLEARED +
DELIVERED success) · route strip (dots + connected line, live stop = accent
marker, label `● City`) · progress bar + `done/total · ETA Xh` · vertical
timeline (✓ nodes, line to next) · "Notify me at each stage" switch.

### Ticketing (`Ticketing`)
Category chips (Customs/Delivery/Payment/Warehouse/App). Ticket Card: ref,
title, description, 3 pills (category `primary`, priority `urgent error/high
warning/medium secondary/low muted`, status OPEN warning / IN PROGRESS accent /
RESOLVED success / CLOSED muted) + context action (Start / Mark resolved /
Reopen). Bottom "New ticket" button → bottom sheet modal (subject, category,
priority chips, details) — hits the golden rule (no emoji even in the sheet).

### Customs Clearing (`Customs`)
NTB-style **stage stepper**: Documents → Verification → Pay duty → Release
(done = ✓ `primary`/`success`, active = number in warning outline, pending =
muted). Card shows declaration id, cargo, border + regime pill (Formal CET /
Simplified STR), importer + agent, **Documents** rows (VERIFIED success /
UPLOADED info / MISSING muted + *Upload* action), duty payable row + button
(`Pay $X` / `Release cargo`).

### Estimates (`Estimates`)
Landed-cost estimator: cargo, value USD, weight (t), origin/destination/border
chips, warehouse months. **Estimate →** breakdown card (freight `→`, duty 8%
CIF, VAT 18%, fees, warehousing) with total + "Save this estimate". Saved
estimates list below (ref, date · border, total).

### Warehousing (`Warehouse`)
Warehouse Cards (name, city · rate/t/mo, `%` `xl/800`, 8px utilization bar,
"X of Y tonnes used"). **Stock in store** list: ref + expiry pill (OK · N days /
EXPIRES IN 14d warning / EXPIRED error / no-expiry muted), cargo · quantity,
`Warehouse · Bin · owner`, ghost **Release** button. Bottom "Check in goods"
→ modal (cargo, quantity t, warehouse city chips, owner).

Shared rule for every module screen: emerald headers, Inter/SF type, pills not
pictures — **no emoji, ever**.