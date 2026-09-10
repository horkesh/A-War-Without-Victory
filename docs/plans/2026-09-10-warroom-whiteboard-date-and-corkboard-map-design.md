# Warroom whiteboard date + corkboard map — design

**Date:** 2026-09-10
**Status:** DESIGN — not implemented, not scheduled. Owner brief captured; awaiting a build slot.
**Owner brief:** the whiteboard date "was supposed to look like a date scrawled by hand with flomaster.
Right now it is too artificial"; the corkboard map "still looks like it was tacked on, instead of being
there organically." Whatever blocks the fix — tests included — gets changed.
**Surface:** `src/ui/map/components/warroom/WarroomShellLayer.tsx`
**Conflict:** Codex is live in this same file on `codex/r7-english-readability`. Nothing here starts
until that lane lands. See §9.

---

## 1. Why it looks artificial — the measured causes

### 1.1 The date

Seven commits, each fixing a legibility complaint, cumulatively removed every handwriting cue:

| Commit | Effect on the date |
|---|---|
| `134d4299a` | **Original**: `Segoe Print / Bradley Hand ITC / Comic Sans MS, cursive`, blue, 10–29px fluid, `rotate(-2deg)` |
| `3a5590bd8` | Shrunk to 7–18px, navy |
| `3d8fdbd98` | **Cursive fallback dropped** → `"Segoe Print", "Segoe UI", Arial, sans-serif` |
| `4476497c6` | Fixed 14px; fluid scaling gone |
| `12c48ffdb` | **Segoe Print removed** → `IBM Plex Sans Condensed`; rotation cut to `-0.45deg` |
| `44b42f28b` | → `var(--font-data)` = **IBM Plex Mono** |
| `88996a23d` | Opaque paper chip, border, drop shadow, `nowrap`, `translateX(min(0px, calc(28vw - 616px)))` |

Root cause of the font retreat: **no handwriting face is bundled.** `assets/ui/fonts/` holds only IBM
Plex Sans / Condensed / Mono. The original depended on `Segoe Print`, a Windows-only system font absent
from many SKUs and from the capture rig, so it silently rendered as Arial and was replaced with something
guaranteed. Monospace is the most machine-like class available.

The R7 acceptance criterion (`logs/r7-english-readability/desk39-layout-browser-attempt2-visual-inspection.txt`)
was *"the complete date is visibly painted, single-line, and separated from the fixed Desk column."*
Each clause produced one artifact: "visibly painted" → the chip; "single-line" → `nowrap`; "separated
from the Desk column" → the `translateX` slide. Nothing in that criterion mentions diegesis.

### 1.2 The date is no longer on the whiteboard

The `translateX` is viewport-driven, not board-driven. Measured against the captures:

| Viewport | Shift applied | Where the date lands |
|---|---|---|
| 3440×1440 | 0px | roughly correct |
| 1920×1080 | −78px | **bare wall**, left of the board |
| 1366×768 | −234px | **on top of the corkboard map** |

### 1.3 The map

Four independent causes in `WarroomProjectedMap` (`WarroomShellLayer.tsx:308`):

1. **Letterbox seams.** `viewBox="0 0 100 100"` + `preserveAspectRatio="xMidYMid meet"` inside a ~1.85:1
   board. The square occupies ~54% of the width; the SVG's opaque `<rect>` covers only that square, so the
   paper's ruled gradient shows through in two side bands with hard vertical seams.
2. **A second frame inside the painted frame** — `border: 3px`, an `outline`, a `0 0 0 7px` ring, and a
   `0 9px 18px rgba(0,0,0,0.46)` drop shadow, on top of the art's own wooden frame.
3. **Wrong paper texture** — `repeating-linear-gradient(0deg, … 0 1px, transparent 1px 9px)` is ruled
   notebook paper, and it is what shows in the seam bands.
4. **No projection correction** — `makeProjector` (line 182) plots raw lon/lat with no `cos(lat)` factor.
   BiH spans 3.9° lon × 2.8° lat, which is ~1:1 on the ground but renders ~1.39:1.

### 1.4 The cause neither of us had named: the overlay ignores the room's light

Mean luminance of the scene art under each region, sampled across all 15 plates:

| Faction | Region | 1991 | 1992 | 1993 | 1994 | 1995 |
|---|---|---|---|---|---|---|
| RBiH | `wall_calendar_area` | 163 | 99 | 114 | 152 | 167 |
| RBiH | `desk_map` | 117 | 75 | 58 | 111 | 125 |
| RS | `wall_calendar_area` | 146 | 146 | 139 | 112 | 110 |
| RS | `desk_map` | 146 | 144 | 136 | 78 | 78 |
| HRHB | `wall_calendar_area` | 143 | 137 | 96 | 72 | 57 |
| HRHB | `desk_map` | 103 | 102 | 73 | 54 | 44 |

The room's light varies by a factor of **three to four** across the campaign — the HQs get visibly darker
as the war grinds on, which is good art direction. **Both overlays render at constant brightness
regardless.** A cream sheet at ~L235 sitting on cork at L44 (HRHB 1995) cannot look attached to anything.
That mismatch *is* the "tacked on" reading, and it is not fixed by removing borders.

Standard deviation under `wall_calendar_area` is 3–9 across every plate — a flat, uniform surface — so the
board is present and consistently placed in all five years per faction. The design is viable; it just has
to respond to the light.

---

## 2. Decisions taken

Owner-selected, 2026-09-10:

- **Handwriting:** bundled OFL marker font, subset, plus per-glyph ink treatment.
- **Map object:** pinned paper staff map — sheet inset on the cork, real pins, board visible at the margin.
- **Board content:** current date in fresh ink, plus a faint ghost of the previous week's date.

Decided here, from evidence (§1.4, §3):

- **Occlusion is accepted, not fought.** The `translateX` hack goes. When the Desk column covers the board,
  the date is read from the Desk column — which requires §4.3.
- **Both overlays become light-aware**, driven by a committed per-plate luminance table.

---

## 3. Occlusion geometry — why the hack cannot be repaired

Desk column: `w-[min(32rem,calc(100vw-1.5rem))]`, `xl:right-10`. Left edge = `viewport − 552px` at ≥1280.
Whiteboard sits at 64–77% of the scene plate; plate width = `min(100vw, 100vh × 1.7917)`.

| Viewport | Plate width | Whiteboard x | Desk left edge | Board visible |
|---|---|---|---|---|
| 3440×1440 | 2580 (centred) | 2093–2378 | 2888 | fully |
| 1920×1080 (**preferred**) | 1920 | 1238–1450 | 1368 | ~61% |
| 1280×720 (**design min**) | 1280 | 825–967 | 728 | **none** |

Preferred and minimum window sizes are `PREFERRED_WINDOW = {1920,1080}` and
`DESIGN_MIN_WINDOW = {1280,720}` (`src/desktop/electron-main.cjs:1158`).

At the design minimum the board is entirely behind the panel. No placement rule recovers it. The panel has
a CLOSE button (`desk-close-overlay`) — the room is meant to be looked at — so the correct behaviour is:
write on the board properly, and let the panel occlude it when open.

**This is affordable because the Desk column already renders the date** —
`PresidentDeskShell.tsx:124`, `t('desk.situation.dateTurn', { date: turnToDateString(state.turn) })`,
where the string is simply `'{date}'`. The whiteboard was never the only date surface. The one gap is that
this sits inside `president-desk-scroll-region` and scrolls away, which §4.3 closes.

---

## 4. Design — the date

### 4.1 The marker face

Bundle one OFL/Apache handwriting face as self-hosted woff2 beside IBM Plex. **Offline is mandatory** —
`logs/r9-build-preparation/phase3-runtime-probe.json` is the evidence that the packaged app makes no remote
asset requests, so no Google Fonts link.

Shortlist, to be judged on the actual board at review rather than argued in advance:

| Face | Licence | Character |
|---|---|---|
| **Caveat** (700) | OFL | casual hand, thickens well at 700, full Latin Ext-A — *recommended starting point* |
| Architects Daughter | OFL | neat technical hand; plausible for a staff officer |
| Permanent Marker | Apache 2.0 | thickest felt-tip, but reads American/signage |

Register as `--font-marker`. **Do not** route it through `--font-data` or `--font-command`; those are UI
tokens and the next typography-unification pass would eat it again, which is exactly how `44b42f28b`
happened.

**Subset to Latin-1 + Latin Extended-A**, not to a hand-picked glyph list. `getWarroomBoardDateLabel` can
return `t('warroomShell.datePending')`, which is `'Datum čeka'` in BCS — a narrow digits-and-months subset
would drop the `č`. Latin-1 + Ext-A keeps a handwriting face at roughly 20–30 KB, which is affordable.

### 4.2 Making it read as a hand, not a font

A font alone still reads as a font: identical glyphs repeat, the baseline is machine-straight. Three
treatments, applied per character:

- **Baseline drift** ±1.5px, **rotation** ±2.5°, **ink opacity** 0.78–0.95 — per glyph.
- **Whole-line tilt** of about −1.8°, applied to the block. People write slightly uphill.
- **Left-anchored placement** with a ~10% margin inside the region, vertically upper-middle. Writing starts
  at the left; it is not centred in the space. This replaces `justify-content: center`.

**Determinism is a hard gate.** No `Math.random()`, no `Date.now()` — the ban covers all of `src/`, not just
sim code. Derive every jitter value from a small pure hash (FNV-1a is fine) over `${turn}:${glyphIndex}:${salt}`.
Same turn always produces the same scrawl; a new turn produces a different one, which is correct — a human
rewrote it this week.

### 4.3 Sizing

The old test bans `vw`-based `fontSize`, and it was right to: `clamp(7px, 1.05vw, 18px)` tracked the
*viewport* while the board tracks the *plate*, and the plate letterboxes independently on both axes.

Use container query units. The scene plate has explicit width and height, so `container-type: size` on it is
valid, and `font-size: ~1.6cqw` then tracks the plate exactly under both letterbox regimes. Fallback if
`container-type` disturbs layout: `min(1.35vw, 2.42vh)`, which reproduces the plate's own `min()`.

Target roughly 60–70% of the board's width — a person writing a date on a board that size writes big. The
current fixed 13px is far too small for the surface.

### 4.4 Ink colour, and the dark-plate problem

The board is a dim warm mid-tone, not white — RBiH 1993 samples RGB (135,114,95) at the board centre against
(121,95,73) on the adjacent wall. The existing `rgba(21,35,58,0.88)` is a reasonable hue; colour was never
the defect.

But §1.4's spread is a real constraint: at HRHB 1995 the board is L57, and dark ink on a dark board cannot
reach useful contrast. Rules:

- Commit a **per-plate board-luminance table as data** (`faction × year → L`), generated by a checked-in
  script so it can be regenerated when art changes. Data, not hard-coded branches in the component.
- Derive ink lightness/opacity from it, targeting a constant perceptual contrast.
- Where the board is too dark to reach target — HRHB 1994/1995, RBiH 1992 — **accept the lower contrast.**
  A dim room with barely-legible board writing is honest, and §4.3's Desk-header date carries legibility.
- Flag those plates for owner review. If they should be brighter, that is an art-side fix, and art is
  generated externally.

### 4.5 The ghost date

Previous week's date at very low opacity, offset slightly up and left, with a light horizontal smear
(small blur plus a shallow skew) — wiped marker leaves a faint *darker* residue, so the ghost is the same
hue at ~0.10–0.14 opacity, never a lighter colour.

Source is `turnToDateString(turn - 1)`; suppress at turn ≤ 0. Keep `aria-hidden` — the ghost is texture, not
information.

### 4.6 A pinned date in the Desk column

`DeskAuthorityHeader` is rendered *inside* `president-desk-scroll-region` (`PresidentDeskShell.tsx:113-118`),
and the Strategic Situation card carrying the date sits below it. Both scroll away. With the whiteboard now
legitimately occluded, add the date to `DeskAuthorityHeader` and pin that header outside the scroller.

This is what actually discharges R7's "date always visible" requirement — honestly, in the panel that is
covering the room, instead of by sliding a diegetic object onto bare wall.

---

## 5. Design — the corkboard map

The surface under `desk_map` is **genuine cork** — warm brown, visible fibre. The owner's "corkboard" read is
literally what the art is, and a pinned paper sheet is the natural object.

- **Sheet fills the board honestly.** Remove the square-viewBox letterbox: derive the SVG viewBox from the
  sheet's own aspect and project into it. The seam disappears by construction rather than by masking.
- **Deliberate margin.** Inset the sheet ~6–8% so cork shows all round. That margin is the design; the
  current bands are an accident. Real staff sheets do not reach the frame.
- **Pins, not dots.** Replace the `hanging-hardware` strip and its four flat circles with pins at the sheet
  corners — small radial-gradient heads with short offset contact shadows. Drop the horizontal rule.
- **Contact shadow, not a drop shadow.** Paper on cork casts 2–4px, tight and soft. Remove the `border`,
  `outline`, `0 0 0 7px` ring and the 18px shadow.
- **Drop the ruled gradient.** Replace with a faint fibre/fold texture or nothing.
- **Latitude correction** in `makeProjector`: scale longitude by `cos(mean latitude)` ≈ 0.72 before fitting,
  so BiH stops rendering ~1.39:1.
- **Light integration** — the item that matters most. Tint and dim the sheet from the same per-plate
  luminance table as §4.4, and key the glare pass to the window at frame-left rather than the current
  generic `screen` gradient. A sheet that gets dimmer as the HQ gets dimmer is what "organic" means here.

Deliberately **not** doing: a title block, legend, or scale bar. They would fill horizontal space
attractively but each is new localized copy, and the sheet-with-margin already solves the dead space.
Post-1.0 enrichment at most.

---

## 6. Tests that must change

All four are source-string assertions against the component text, so they fail the moment anything moves.
Each is a deliberate reversal and each needs its rationale recorded in the test itself — these tests are the
institutional memory of the removal, and silently deleting them invites a third round of the same drift.

| File / lines | Currently asserts | Change |
|---|---|---|
| `tests/ui/warroom_shell_accessibility.test.ts:224-232` | forbids `Segoe Print` / `Comic Sans MS`; requires `fontFamily: 'var(--font-data)'`; forbids `vw` in `fontSize` | Replace with: requires `var(--font-marker)`; still forbids system-font dependence (`Segoe Print`, `Comic Sans MS`, `cursive` as a fallback) because that is the defect that started this; replace the `vw` ban with a requirement that sizing tracks the plate (`cqw`, or the `min(vw,vh)` fallback) — the ban's real intent |
| `tests/ui/warroom_shell_accessibility.test.ts:234-259` | requires `preserveAspectRatio="xMidYMid meet"`, forbids `slice` | Drop both. The sheet-aspect viewBox makes the question moot; assert instead that the viewBox aspect is derived, not literal `0 0 100 100` |
| `tests/ui/warroom_shell_accessibility.test.ts:261-272` | requires `hanging-hardware`, `staff-marks`, `glare`, `fold-grid`, `feTurbulence`, `perspective(700px)` | Rewrite around the new physical vocabulary: pins, contact shadow, light-adapted tint. Keep a "renders as a physical object" test — the intent is right, the specific element list is not |
| `tests/ui/r7_president_desk_layout_readability.test.ts:24-30` | locks `translateX(min(0px, calc(28vw - 616px)))` and `background: 'rgba(236, 232, 216, 0.94)'` | Delete both assertions. Replace with the pinned Desk-header date from §4.6 — the requirement this test was protecting, discharged properly |

`tests/ui/warroom_scene_continuity.test.ts:83-92` (render order) is unaffected and stays.

New coverage to add:

- **Determinism**: same turn → identical jitter across renders; different turns → different. This is the
  test that protects the sacred rule.
- **Ghost date**: present for turn ≥ 1, absent at turn 0, always `aria-hidden`.
- **Luminance table**: every faction × year has an entry; the generating script reproduces the committed
  file byte-for-byte.

---

## 7. Asset and packaging work

Adding a font file touches the packaging path, which has bitten this repo before — the roadmap records the
packaged app dead on startup from a missing `build.files` entry.

1. Vendor the chosen woff2 into `assets/ui/fonts/` with its OFL/Apache licence text alongside the existing
   `OFL-1.1.txt`, and update `assets/ui/fonts/README.md`.
2. `@font-face` + `--font-marker` in `src/ui/map/styles/globals.css`.
3. Confirm the file is emitted by `npm run desktop:map:build` **and** present in the packaged resources —
   not just that the build exits 0.
4. Re-verify offline behaviour: no network request for the face at runtime.

---

## 8. Acceptance evidence

Per `docs/life_lessons/ui_map.md` — *test at the size the product actually ships at*, and *a measurement can
be blind to the failure it is cited as disproving*. The R7 inspection passed while the date sat on bare wall,
because it only ever asked "is the date legible and clear of the panel?"

Capture **3 factions × 5 years × 3 viewports** (1280×720, 1920×1080, 3440×1440), and state the criterion as:

> The date reads as marker written on the board by a person: it sits inside the board's writing surface,
> its ink sits in the room's light, and no element of it has a background, border or shadow of its own.
> The map sheet reads as paper pinned to cork: cork is visible at the margin, there are no seams, and the
> sheet's brightness tracks the room.

Then the mechanical gates: `npx tsc --noEmit`, `npm run test:vitest`, `npm run desktop:map:build` — reading
each command's own exit code, never a pipeline's.

Do **not** reuse the R7 run budget. This is presentation-only: no scenario run, no calibration, no pin
refresh, no baseline touch.

---

## 9. Sequencing

1. **Wait for Codex.** `WarroomShellLayer.tsx` is live on `codex/r7-english-readability`. Starting now
   guarantees a conflict in the exact function both lanes edit.
2. Branch fresh from the landed R7 tip.
3. Font vendoring + `--font-marker` + packaging proof (§7) — independently verifiable, lands first.
4. Luminance table + generator script (§4.4) — shared by both overlays, so it precedes them.
5. Date: placement, marker typography, ink, ghost (§4.1–4.5).
6. Desk-header pinned date (§4.6).
7. Map: viewBox, margin, pins, shadow, texture, latitude, light (§5).
8. Test rewrites (§6) alongside each step, not batched at the end.
9. Capture matrix + owner review (§8).

Steps 5 and 7 are separable and could run in parallel once step 4 lands, but they share a file, so serial is
simpler than coordinating.

---

## 10. Risks

- **Typography unification eats it again.** `44b42f28b` was a general "unify active interface typography"
  pass. `--font-marker` must be documented as diegetic and explicitly out of scope for UI-token sweeps.
- **Dark plates (§4.4).** May prove unacceptable on review and turn into an art request. Surface early, with
  the captures, rather than after the rest is built.
- **Region drift.** `wall_calendar_area` is per-faction, not per-year, and extends somewhat past the board's
  right edge on RBiH. Verify the writing lands on the board in all 15 plates before tuning ink.
- **Determinism regression.** The jitter is the obvious place a `Math.random()` gets added later. The §6 test
  is the guard.
- **Source-string tests are brittle by nature.** The replacements should assert *intent* — "sizing tracks the
  plate", "no self-background" — rather than pinning exact literals, which is what made the current set an
  obstacle instead of a safety net.
