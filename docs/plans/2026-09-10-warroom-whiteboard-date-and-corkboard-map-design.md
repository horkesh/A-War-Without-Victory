# Warroom whiteboard date + corkboard map — design

**Date:** 2026-09-10
**Status:** **CLOSED, 2026-09-12.** Steps 3–9 all done — shipped as PR #515 (font + date) and #516
(corkboard map). Step 9's capture matrix was narrowed from 45 shots to 6 and **satisfied by
exception**; the reasoning is in §9. Measured corrections and defects found during the build are
recorded inline below, each next to the claim it corrects — §5.1 in particular, where three of this
document's own assumptions turned out to be false.
**Owner brief:** the whiteboard date "was supposed to look like a date scrawled by hand with flomaster.
Right now it is too artificial"; the corkboard map "still looks like it was tacked on, instead of being
there organically." Whatever blocks the fix — tests included — gets changed.
**Surface:** `src/ui/map/components/warroom/WarroomShellLayer.tsx`, plus the two pure modules the
build split out: `warroomMarkerInk.ts` (date) and `warroomCorkSheet.ts` (map).
**Conflict:** ~~Codex is live in this same file on `codex/r7-english-readability`.~~ RESOLVED — that
lane landed on `main` before any of this started, so the conflict §9.1 guarded against never arose.

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

But §1.4's spread is a real constraint: on the darkest plates, dark ink on a dark board cannot reach useful
contrast. Rules:

- Commit a **per-plate board-luminance table as data** (`faction × year → L`), generated by a checked-in
  script so it can be regenerated when art changes. Data, not hard-coded branches in the component.
- Derive ink lightness/opacity from it, targeting a constant perceptual contrast.
- Where the board is too dark to reach target — see the measured list below — **accept the lower contrast.**
  A dim room with barely-legible board writing is honest, and §4.3's Desk-header date carries legibility.
- Flag those plates for owner review. If they should be brighter, that is an art-side fix, and art is
  generated externally.

**MEASURED, 2026-09-11** — `tools/derive_warroom_board_luminance.cjs`, median CIE L\* of the
`wall_calendar_area` pixels of each plate, committed to
`src/ui/warroom/assets/warroom_board_luminance.json`:

| | 1991 | 1992 | 1993 | 1994 | 1995 |
|---|---|---|---|---|---|
| **HRHB** | 60.1 | 57.9 | 41.3 | **31.0** | **24.5** |
| **RBiH** | 67.0 | **42.3** | 48.8 | 64.1 | 69.8 |
| **RS** | 61.6 | 61.5 | 58.8 | 48.6 | 48.3 |

Two corrections to the paragraph above, both from this measurement:

- **"at HRHB 1995 the board is L57" was wrong.** HRHB 1995 is the DARKEST plate in the game at
  **L\*24.5**; L\*57.9 is HRHB *1992*. The estimate understated the problem by more than half the
  usable range, and the dark-plate case is correspondingly worse than the plan assumed.
- **The dark list named the wrong plates.** Four plates sit below L\*45 — HRHB 1993/1994/1995 and
  RBiH 1992 — but "too dark to reach target" is a different question, and it depends on the target.
  The target is anchored at a **35-point L\* gap**, because that is what the design already signed
  off on: §4.4 calls `rgba(21,35,58,0.88)` (L\*13.63) reasonable on RBiH 1993 (L\*48.8). Against
  that target only **HRHB 1994 (gap 31) and HRHB 1995 (gap 24.5)** fall short. RBiH 1992 reaches it
  comfortably at 35.1.

The spread is **L\*24.5 → 69.8, 45 points**, which is the evidence that a single hard-coded ink
colour cannot work: it is legible on roughly a third of the game.

§10's region-drift worry was also checked and did not reproduce. On RBiH 1993 the region's column
profile falls 53 → 46 L\* smoothly with no cliff, and a middle-60% inset moves the median by at most
0.6 L\*. The sampler therefore uses the whole region, with no inset parameter to tune.

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

### 5.1 What this section got wrong — measured during the build, 2026-09-12

Three of the assumptions above are false. Each was found by photographing the room, not by any test.

**"Tint and dim the sheet from the same per-plate luminance table as §4.4" — the cork is not a light
meter.** Paper has a near-fixed reflectance; cork does not, because the art uses *different cork*. RS
1993 cork is L\*59.5 and RBiH 1993 cork is L\*28.1, and both rooms are brightly lit — the RBiH wall
behind the board is pale cream. Keying the sheet to cork therefore produced proper cream paper on RS
(`rgb(235,225,197)`) and a dead grey card on RBiH (`rgb(146,139,122)`) from the same rule. The
**whiteboard** is the usable probe: near-white and near-constant-albedo in every plate, so its L\*
moves with the illumination. The sheet is keyed to that, with cork setting only a floor.

**Removing the borders did not remove the borders.** `factionInkColor` returns `rgba(…, 0.72)`, and
~600 adjacent municipality polygons double-blend along every shared edge, so the mesh reprinted as
darker lines with no stroke at all. Widening a same-colour stroke to close it made it *worse*, which
is what identified alpha as the cause. The fill is opaque now, and the faction hues are pre-muted
toward paper — they only ever looked muted because that alpha blended them with cream.

**"Inset the sheet ~6–8% so cork shows all round" assumes the region IS the board. It is not.**
`desk_map` is a click target, and the three rectangles were authored to different standards:

| | hotspot vs. measured cork |
|---|---|
| RBiH | within **1%** |
| RS | **9%** short |
| HRHB | **15%** short in width, **35%** short in height |

So the same overlay at the same inset filled the RBiH board and floated small on the HRHB one. The
sheet is now positioned from cork measured out of the art by
`tools/derive_warroom_board_luminance.cjs` (hotspot colour as reference, walk each edge to the
frame), committed per faction as the median across all five years.

**Still open, and deliberately not fixed here:** the hotspot rectangles remain what the CLICK uses,
so on HRHB the clickable area is now smaller than the board appears. Correcting the region files is
authored-data work with other consumers, not a side effect of a rendering change.

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

1. ~~**Wait for Codex.**~~ **DONE** — the R7 lane had already landed on `main`; no conflict arose.
2. ~~Branch fresh from the landed R7 tip.~~ **DONE.**
3. ~~Font vendoring + `--font-marker` + packaging proof (§7).~~ **DONE** — PR #515.
4. ~~Luminance table + generator script (§4.4).~~ **DONE**, and extended: it also measures the cork
   surface and the cork's painted extent, both of which §5 turned out to need.
5. ~~Date: placement, marker typography, ink, ghost (§4.1–4.5).~~ **DONE** — PR #515.
6. ~~Desk-header pinned date (§4.6).~~ **DONE**, though not where §4.6 put it: `DeskAuthorityHeader`
   returns `null` without `commandAuthority`, so the date would vanish on the sparsest saves. It is
   pinned in `PresidentDeskShell` above the scroll region instead.
7. ~~Map: viewBox, margin, pins, shadow, texture, latitude, light (§5).~~ **DONE** — see §5.1 for the
   three assumptions that had to be corrected on the way.
8. ~~Test rewrites (§6) alongside each step.~~ **DONE.**
9. **Capture matrix + owner review (§8) — SATISFIED BY EXCEPTION, narrowed from 45 shots to 6.**

   §8 asks for 3 factions × 5 years × 3 viewports. Most of those 45 would prove what two measured
   numbers per plate already say — the ink and the sheet are *derived* from board and cork
   luminance, so a shot mostly re-reads the table. The six captured are the ones carrying risk the
   numbers cannot settle:

   - **RBiH / RS / HRHB at 1920×1080, t68 (1993)** — owner-reviewed and accepted.
   - **HRHB 1994 (board L\*31.0) and HRHB 1995 (L\*24.5)** — the two plates §4.4 predicts cannot
     reach the 35-point target. Confirmed: ink bottoms out at `rgb(0, 0, 0)` on both, gaps 31.0 and
     24.5. Owner-reviewed; **accepted as honest for a dim room, no art request raised.**
   - **1280×720, the design minimum** — which is what §3's whole argument rests on.

   These two override the turn to reach a later room from a 1993 save, so **territory in those two
   shots is t68 and must not be read as history.** They prove ink-against-board, nothing else.

   **§3's claim is confirmed at the design minimum**, and more precisely than it was stated: the
   WHITEBOARD is entirely behind the Desk column at 1280×720, the pinned Desk date carries the
   legibility exactly as §4.6 intends — and the CORKBOARD MAP remains fully visible and reads
   correctly at that size, which §3 did not predict either way.

   Not captured, deliberately: 3440×1440 (the most generous case — §3's own table shows the board
   fully clear there, so it is the least likely to fail), and the eight remaining plates whose ink
   is interpolated between figures already sampled.

**Step 3 should not have been a separate PR.** Splitting the font off produced a stale-manifest
failure on a branch that could not see the work resolving it, and a bundled font nothing uses is not
independently reviewable anyway — which was the stated reason for landing it first. #514 was closed
and superseded by #515 carrying both.

**§10's "typography unification eats it again" risk is now mechanically guarded**, not just noted:
`tests/ui/typography_contract.test.ts` permits `--font-marker` exactly once, in the warroom shell.
Zero uses means it was absorbed again; two means it is spreading into the interface.

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
