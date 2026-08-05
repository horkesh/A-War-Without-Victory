# Launch & Opening-Screens Redesign — Design

**Date:** 2026-08-05
**Status:** Design validated with owner; ready for implementation planning.
**Scope (owner-chosen):** Full opening *experience* — a designed sequence from first frame to in-war, not a targeted patch of four bugs.
**Brainstormed with:** Pyrrhic team — ui-ux-developer, game-designer, narrative-designer, modern-wargame-expert (four independent seats; strong convergence).

---

## 1. Problem

The current opening (`src/ui/map/components/MainMenu.tsx`) undersells a game whose entire thesis — *"authorship of the tragedy," constrained agency, a war that cannot be won* — must land in the first thirty seconds:

1. **No hero image.** Full-screen dark radial gradient (`#1a1816 → #0d0c0a`) + gold serif text title. No splash/hero art exists anywhere in `src/public/assets`. The layout floats with no anchor and sets a "generic strategy game" tone.
2. **Engine jargon leaks.** Save labels read `"Turn 12 (war phase)"` — `warroom.ts:619-621` concatenates `${label} — ${phase}`. "Phase" is a `war_phases.ts` word; it must never reach a player.
3. **Continue vs Load are confusing.** `Continue` (resume autosave, hidden when none) and `Load Game` (a hidden `<input type=file>` `.json` import) are the same verb split across two controls with different mechanics; the menu reflows when no save exists.
4. **Faction picker is "way too basic."** Three flag-buttons that call `onNewGame(faction)` *instantly* — no information, no asymmetry, no moment of deliberation. One mis-click starts a campaign. This throws away the game's best selling point: three genuinely different shapes of powerlessness.

## 2. North Star

> Opening the game should feel like **opening a case file on a tragedy you are about to become responsible for** — grave, quiet, already-lost. The emotion is **dread and responsibility**, not anticipation. If any asset makes the war look thrilling, heroic, or winnable, it fails.

## 3. The opening sequence (3 beats)

1. **Hero + title** — the map-under-lamplight still under the gold-serif title stack.
2. **Menu** — New War · Continue · Records · Settings · Credits · Quit (+ version string).
3. **New War → faction briefing → "Take command" → war-mode beat → Begin.**

No slideshow, no motion spectacle (that reads as power-fantasy, which the game refuses). Loading screens between beats carry rotating art + one quiet constraint-line.

## 4. Hero & loading art (owner: **both**)

- **Menu hero — Concept A "The situation map under lamplight."** A worn paper map of Bosnia on a scuffed table, a single failing desk lamp, half-drawn grease-pencil front lines, a cold coffee, an **empty chair pushed back**. No people, no weapons, no identifiable place. Says: *you command through a table, at a distance, over abstractions that are really villages*; the empty chair is the burden waiting for the player. The lamp glow motivates the existing gold accent; title stack sits in the dark upper third; the current radial vignette layers over at ~40–60% for text contrast.
- **Loading art — Concept B "A divided town at dusk"** (invented composite town — minaret and church tower both on the skyline, thin distant smoke) and optionally **Concept C "Winter road, no horizon"** (exhaustion/attrition mood). Each paired with one faction-agnostic constraint-line, e.g. *"You do not command this army. You ask it to hold."*

**§6 gate (hard blocker before generation):** every generated image goes through historian + §6 review. Concept B **must** be an invented composite — no real skyline (never Sarajevo/Mostar/Srebrenica) — or it reads as depicting a real place's destruction. Map place-names must be illegible/blurred so no real municipality reads as a "target."

### 4.1 Ready-to-use generation prompt — Concept A (hero)

**Positive:**
> A worn paper military situation map of a mountainous Balkan region spread across a scuffed wooden table, viewed from a low three-quarter angle. A single dim desk lamp casts a warm amber pool of light over the map's center and falls off into deep shadow at the edges. On the map: faded grease-pencil front lines and a few hand-drawn arrows, small paper markers, a folded pair of reading glasses, a cold half-full coffee cup, an unlit cigarette resting on a tin ashtray. An empty wooden chair is pushed back from the table. No people. Muted, desaturated palette — aged paper cream, oxblood and slate-grey pencil marks, warm amber lamp glow against near-black surroundings. Somber, heavy, contemplative mood. Painterly semi-realistic style, soft focus at the frame edges, fine film grain, cinematic chiaroscuro lighting, shallow depth of field. Horizontal composition with generous dark negative space in the upper third for a title overlay.

**Negative:**
> no soldiers, no people, no faces, no weapons, no guns, no tanks, no explosions, no fire, no blood, no bodies, no rubble, no flags, no national emblems, no heroic or triumphant tone, no bright saturated colors, no lens flare, no text, no watermark, no legible place names, no modern UI, no clean/new equipment, no glorification.

**Crops:** generate 16:9 (menu) and 4:5; keep top third dark for the title stack; lamp glow lower-center so gold title reads against black above it.

### 4.2 Generation prompt — Concept B (loading, invented town)

Adapt the above mood/palette/negative list with subject: *"a small invented Bosnian valley town at blue hour, red-tiled roofs, a river, a minaret and a church tower both on the skyline, faint distant haze on the horizon; no identifiable real city, no burning buildings, no people, no weapons."* **Explicitly** constrain: invented composite, no real skyline, no depiction of a specific place's destruction.

## 5. Title / subtitle copy

- **Title** — keep **"A War Without Victory."** It *is* the thesis.
- **Subtitle** — the current `"Bosnia-Herzegovina, 1992-1995"` is an inert caption. Promote a thesis-carrying line and demote the date to a third tier:
  - **Primary (recommended): "Command a war that cannot be won."**
  - `"Bosnia-Herzegovina · 1992–1995"` retained as a small third-tier date line.
  - (Alternatives on file: *"There is no victory here — only the cost of what you allow."* / *"Every choice is a lesser ruin."*)

## 6. Menu architecture & saves

- **One-click Continue** as the primary CTA — resumes the **newest** save (autosave *or* manual, not autosave-only as now).
- **"Field Records" browser** replaces `Load Game`-as-file-dialog: a screen listing saves as dossier cards, newest at top with a prominent **Resume**, older below; **"Import file…"** demoted to a corner action *inside* the browser (power-user `.json` sharing preserved, no longer a top-level peer). This collapses "continue" and "load" into one mental model and stops the menu reflow.
- **Landing entries:** New War · Continue · Records · Settings · Credits · Quit + a small **version string** in a corner.

### 6.1 Save labels (owner: **date + situation tag**) — kills the "war phase" leak

- Fix at `warroom.ts:619-621`: stop concatenating `phase`; render a diegetic label.
- Format: **`Week 41 · March 1993 — The Corridor Holds`** — week/date anchor (via existing `turnToDateString`) + an optional short **situation tag**.
- The situation tag needs a small **deterministic** table: `(front-state + date) → short evocative, player-safe string`. **New authored content** → requires a determinism check (no `Date.now`, sorted, reproducible) + a §6 / player-safe copy pass. The date-only fallback (`Week 41 · March 1993 — Army of RBiH`) ships immediately if the tag table isn't ready.

## 7. Faction-select briefing (the core redesign)

**Flow — two beats, not a wizard:** click a faction → the card expands into a **briefing** → an explicit **"Take command"** confirm. Exactly one extra beat. Instant-start is thematically wrong (the game is about the weight of a decision you can't win); a full wizard over-corrects and kills replay pace. The read step stays ~5-seconds scannable.

**Shared 4-slot schema** (identical across all three factions — asymmetry reads by *comparison*, not prose):

| Slot | Purpose |
|---|---|
| **Your war** | one §6-safe sentence naming the tragedy |
| **You begin:** | starting strategic situation |
| **Your constraint:** | the asymmetric command cost the engine already models |
| **The arc you face:** | non-spoiling shape of the war |

**Agency, not difficulty.** No easy/medium/hard, no star ratings (that betrays the negative-sum thesis). A **command descriptor** instead:
- RBiH — *"Firm command, scarce means."*
- RS — *"Overwhelming force, uncertain loyalty."*
- HRHB — *"Capable, but not your own master."*

**Draft "Your war" lead sentences (DRAFT — hard-gated on historian + §6 panel before ship):**
- **RBiH:** "You defend a country the world recognizes but will not arm — where survival, not victory, is the most that endurance can buy."
- **RS:** "You command the war's strongest army toward ground that can never be made legitimate — and every kilometer taken deepens the isolation."
- **HRHB:** "You fight for a homeland whose fate is decided in another capital — a smaller war inside a larger one, waged between yesterday's allies."

**§6 discipline (hard gate):** even register across all three — situation + constraint, never verdict; no aggressor/victim labels on the cards (the verdict is the engine's to deliver through consequence). The faction sentences **must** pass historian + §6 panel review to ensure they do **not** flatten aggressor and victim into false equivalence — RS bears responsibility for the largest atrocities, including the Srebrenica genocide. The RS line's "deepens the isolation" / (narrative's alt "the places emptied to reach them") is the load-bearing phrase and the review's focus.

**Determinism:** faction order is a fixed canonical sort — **RBiH, RS, HRHB** — never keyed off hover or `Set` iteration.

## 8. War-mode beat (owner: **separate beat after faction**)

After **Take command**, a small screen — *not* a third column on the picker, and no `decision_mode` jargon:

- **"Let it run from here"** — emergent (pre-selected default; the real game per the Free-War model).
- **"Let history run as it did"** — historical / replay (calibration affordance surfaced for players).
- Then **Begin**.

## 9. Cross-cutting

- **Typography:** serif for headlines (keep), **sans** for faction identity/constraint lines and save metadata. **Remove the `Courier New` monospace** from faction/menu buttons — it violates the warroom design language.
- **Palette:** warroom earth tones (`bg-panel-bg` / `bg-panel-card` / `border-panel-border`), amber-gold accents. No green-terminal/CRT.
- **Accessibility:** faction cards are real `<button>`s with `aria-label`; keyboard-focusable; visible **gold focus ring**; focus moves to the "Take command" CTA on the confirm step. Keep the existing language `<select>`.
- **Micro-copy carries theme at zero cost:** loading one-liners about limits/exhaustion/cost (never conquest); confirm-button copy framing the role ("Take command"). The unifying principle: everywhere the genre says *"choose your empire and conquer,"* AWWV says *"inherit a war you cannot win and decide how it is survived."*
- **Engine "phase" in aria/nav strings** (`opsPlanning.phase*`) → "step" (low priority; partly done).

## 10. Determinism & §6 — hard gates before ship

1. **Generated images** (hero A, loading B/C) — historian + §6 review; invented composite for B; illegible map names for A.
2. **Faction "Your war" sentences** — historian + §6 panel (false-equivalence check; RS line is load-bearing).
3. **Save situation-tag table** — determinism check (no `Date.now`, sorted, reproducible) + player-safe copy pass.
4. None of this touches the sim; the only bright-line risks are the generated image and the faction copy. No calibration impact expected — but any state read for a situation tag must be player-safe and deterministic.

## 11. Suggested build sequence

1. **Kill the "war phase" leak** (`warroom.ts` date swap) — trivial, pure win, ship first regardless of the rest.
2. **Faction briefing + confirm** (§7) — the "way too basic" fix; copy gated on §6.
3. **Field Records** load screen + one-click Continue (§6).
4. **Hero art + title/subtitle copy** (§4, §5) — gated on §6 image review.
5. **War-mode beat** (§8) and **situation-tag table** (§6.1) as enrichments.

## 12. Files of record

- `src/ui/map/components/MainMenu.tsx` — menu + faction picker
- `src/ui/map/App.tsx:~2185` — `appScreen==='mainMenu'` host, `onNewGame` / `onContinue`
- `src/ui/warroom/warroom.ts:619-621` — the `phase` save-label leak
- `src/ui/map/utils/factionAssets.ts` — `getFactionCrest` / `getArmyName` / dossier-stamp assets
- `src/ui/map/utils/sidePickerLabels.ts` — `sidePickerFactionLabel`
- `src/ui/map/i18n/messages.en.ts` (~820-824, ~1796-1801) — `mainMenu.*` keys
- Date helpers already present: `turnToDateString` (ReportsModal), `turnToShortLabel` (warroom)
