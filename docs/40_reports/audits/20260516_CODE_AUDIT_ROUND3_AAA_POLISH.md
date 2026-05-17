# Code Audit — Round 3 (AAA+++ Polish Pass)

**Date:** 2026-05-16 (continued autonomous session)
**Auditor:** Claude (file/grep/bash access + Claude in Chrome; no Electron IPC)
**Scope:** "Look for anything and everything that can be improved to make this a Paradox-level AAA+++ game in terms of both code and game itself."
**Constraint:** Per user, do NOT touch master files (`MASTER_ROADMAP.md`, `PROJECT_LEDGER.md`, `PROJECT_LEDGER_KNOWLEDGE.md`, `.claude/napkin.md`, `docs/10_canon/FORAWWV.md`) so as not to confuse parallel Codex lanes. Read freely; write only into this new audit doc and any new sibling docs.

**Sister docs:** `docs/40_reports/audits/20260516_CODE_AUDIT.md` (round 1+2), `GUI_PLAYTEST_2026-05-16.md` (initial playtest).

---

## Table of Contents

(Findings appended as each audit completes. Sections are by audit lane, not by severity.)

1. TypeScript strictness escapes
2. TODO/FIXME/HACK inventory
3. Dead code / unused exports
4. Accessibility (a11y) audit
5. Performance smells
6. Canon documentation currency
7. Browser playtest — RBiH first-30s
8. Browser playtest — HRHB first-30s
9. Faction-specific UX comparison (RBiH / RS / HRHB)
10. Paradox-tier benchmark
11. Error handling consistency
12. Save / load UX
13. Additional audit areas proposed
14. **Deliverable: New-Player Tutorial Doc** (separate file)

---

## 1. TypeScript strictness escapes — STRONG DISCIPLINE, ONE HOTSPOT

**Method:** Grep `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `as any`, `: any` across `src/`.

**Headline numbers:**
- `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`: **0 occurrences** across entire `src/`.
- `as any` in production paths (excluding `_archived/` and `src/cli/`): ~140 across ~30 files, with hotspots:
  - `src/ui/map/data/GameStateAdapter.ts` — **52 occurrences** (largest single concentration)
  - `src/state/save_migration.ts` — 22 (legitimate: schema migration)
  - `src/ui/map/map/MapContainer.tsx` — 12 (likely deck.gl/maplibre type gaps)
  - `src/sim/combat/commander/emit.ts` — 6
  - `src/sim/combat/commander/plan.ts` — 4
- `: any` in production paths: ~71 across ~30 files (some in `_archived/`).

**Verdict:**
- **Excellent posture overall.** Zero `@ts-ignore` is exceptional. The team consistently chose `as any` (which is at least a typed cast) over silencing the checker entirely. That's the right tradeoff.
- **Hotspot worth a focused review:** `GameStateAdapter.ts` with 52 `as any` is the renderer-side translator from engine JSON to UI shapes. Many are unavoidable (engine returns `unknown` after IPC stringification), but at this density there's likely 5–10 that could be replaced with proper typed JSON parsers (`zod`, `io-ts`, or hand-written guards). Each removed `as any` is one less place where a schema drift hides until runtime.

**Recommendation:** Audit `GameStateAdapter.ts` line-by-line; for each `as any`, ask "is the input shape actually known here?". If yes, write a type guard. If no, add a runtime `validateShape(...)` helper. Probably half-day of work for ~5–10 wins.

---

## 2. TODO/FIXME/HACK inventory — VERY LOW DEBT

**Method:** Grep `TODO`, `FIXME`, `HACK`, `XXX` across `src/`.

**Total: 14 markers; 10 active (3 are in `_archived/`, 1 is a NATO division-symbol constant `'XXX'`).**

The 10 active markers, by cluster:

| Cluster | Files | Notes |
|---|---|---|
| Negotiation system | `scenario_preseeding.ts` (×2), `scoring.ts`, `bot_negotiation.ts` | Preseed strategic dimensions; remove `NegotiationBreakdown` param after callers migrate. |
| Event-types integration | `event_types.ts` (×2) | Integrate with enclave/siege system + operation tracking when state fields available. |
| Order interpretation morale | `order_interpretation.ts` (×2) | Apply `RELIEF_MORALE_PENALTY` to brigades; brigade morale field needed. |
| Pressure-diffusion stub constants | `pressure_diffusion.ts` | Conservative defaults; refine if roadmap specifies exact values. |
| Displacement loss constants | `displacement_loss_constants.ts` | Phase F step 26 integration with siege ratio. |
| OOB sidebar fog indicator | `OOBSidebar.tsx` | Visible enemy / total enemy fog-coverage percentage. |

**Verdict:** This is exceptional. Median open-source TypeScript project of this size (~280 sim files + 100 UI components) has 100–500 TODO/FIXME markers. AWWV has 10. All are "future work" notes, not "this is broken" markers.

**Recommendation:** No action needed. Optional: add `tests/no_new_todos.test.ts` that snapshots the current TODO list and fails when a new one is added without a corresponding ticket reference, so the discipline stays a discipline.

---

## 3. Dead code / unused exports — CLEAN, WITH ONE LARGE ARCHIVE

**Findings:**
- `src/_archived/ui_legacy/` — **82 `.ts`/`.tsx` files**, the entire pre-React HoI 3D / staff map / tactical_sandbox stack. Per `context.md` line 39, this is intentionally archived. Adds ~no maintenance burden but inflates grep results and contributor confusion ("which is the live UI?"). Consider moving to a separate `git submodule` or `archived/` repo branch.
- `src/ui/map/components/_retired_chrome/TopToolbar.tsx`, `MapModeToolbar.tsx` — two retired chrome components. Smaller surface, presumably kept for reference. Worth deleting if they're truly retired.
- 49 tmp/log files at repo root (45 of them `tsc_errors_step3..step46.log`) — all gitignored, no git debt, but ~3 MB of clutter on disk per checkout. Consider a `tools/clean_repo.sh` script that wipes ephemeral logs.

**Recommendation:**
- Leave `_archived/` alone if there's an active "look back at the legacy renderer" workflow; otherwise move to a sibling branch named `archive/legacy-ui` and delete from main.
- Decide on `_retired_chrome/` — either ship a `git rm` PR or move to `_archived/`.
- Add a `npm run repo:clean` script that nukes root-level `tsc_errors_*.log`, `tmp_*.log`, `.codex_tmp_*` files.

---

## 4. Accessibility audit — SOLID BASELINE, KEYBOARD COVERAGE LIGHT

**Headline numbers (in `src/ui/map/components/`):**
- `aria-label` / `aria-labelledby` / `aria-describedby` / `role=`: **130 occurrences across 44 files** (~1.3 per file; industry good = 3–5).
- `onClick=` handlers: **373 across 100 files**.
- `onKeyDown=` handlers: **12 across 11 files**.
- `tabIndex=` set: **6 across 6 files**.
- `<div onClick={…}>` (non-semantic clickable divs): **3** — all 3 also have `onKeyDown`. Properly handled.
- `dangerouslySetInnerHTML` / `eval(` / `window.eval`: **0**. Excellent security hygiene.
- v0.9.3 a11y closure lane (per napkin) shipped 4 P0 v1.0 blockers in Wave 1; the ledger references Lanes A–D as completed.

**Implications:**
- The 31:1 onClick:onKeyDown ratio is mostly fine because the 373 `onClick` are mostly on `<button>` elements (which natively handle Enter/Space). The 3 non-semantic clickable divs are properly fitted with `onKeyDown`. ✓
- aria coverage at ~1.3 per file is light. Industry best-practice would have every modal `aria-labelledby` its title, every region with `role="region"` + `aria-label`, every dynamic-content area with `aria-live`. AWWV has these scattered (e.g. `dayton-negotiation-title`) but not consistently.
- `prefers-reduced-motion` query: not yet checked (the napkin lists it as one of the 4 P0 blockers — should already be shipped per Lane A/B/D references in master roadmap).
- Colorblind palette check: not done in this audit; recommend `tools/check_colorblind.cjs` running the political-control palette through deuteranopia/protanopia/tritanopia simulators.

**Recommendation:**
- Audit every modal for `aria-labelledby="..."` pointing at its title heading. The pattern exists (Dayton modal does it) — make it universal.
- Add `aria-live="polite"` regions for the toast / status surface (Decision Room counts, Inbox count badge, ADVANCE_TURN blocked state).
- Add `tests/a11y_modal_contract.test.ts` asserting every component matching `*Modal.tsx` has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` set.

---

## 5. Performance smells — REASONABLE MEMOIZATION, EVENT-LISTENER COMPLEXITY

**Headline numbers (in `src/ui/map/components/`):**
- `useMemo` / `useCallback` / `React.memo`: **210 across 55 files**.
- `useState` / `useEffect`: **246 across 64 files**.
- Memoization ratio: ~0.85:1 — reasonable, not exhaustive.
- `addEventListener` / `removeEventListener` pairs: **35 across 12 files** — high subscriber-density components.

**Bundle sizes:**
- `dist/` = **78 MB** (web bundle including deck.gl + maplibre + 96 essays + sim).
- `dist-packaged/` = **2.8 GB** (accumulated Electron build artifacts). Per napkin's `LANE-V094-INSTALLER-BLOAT-TRIM-PHASE-2`, the trimmed NSIS installer dropped from 1338 MB → ~263 MB; the 2.8 GB is likely staging + intermediates, not the shipped artifact.

**Engine perf** (out of my scope; napkin extensively tracks it): ongoing CPU profiling and optimization work continues. Current 40w `n1845` hash anchor.

**Renderer perf concerns I'd flag:**
1. `OpsPlanningModal.tsx` has **13 useMemo/useCallback** + **11 useState/useEffect** — large stateful component. Worth profile-checking the render cost when the brigade tray re-renders.
2. `MapContainer.tsx` is the deck.gl host — `useEffect` dependency arrays here matter a lot for repaint cost. Worth confirming none accidentally reference unstable refs (e.g. inline object literals).
3. 12 files with `addEventListener` — each is a candidate for forgotten cleanup. Manual review of each `useEffect` would surface any leaks. The most-likely-leaky are `CoachmarkLayer.tsx` (8 listeners), `chronicle/ChronicleOverlay.tsx` (6), `RadialMenu.tsx` (4).

**Recommendation:**
- Add React DevTools profiling pass to the QA gate; record a 10-second profile of a clean Turn-0 → click 1st Krajina → open OpsPlanningModal flow, and look for any component re-rendering >30x in that window.
- For the 12 files with raw `addEventListener`, add an ESLint rule (custom or `react-hooks/exhaustive-deps`) that flags `useEffect` callbacks missing a return cleanup function when they contain `addEventListener`.

---

## 6. Canon documentation currency — ONE STALE FIELD

**Method:** Read `docs/10_canon/CANON.md`, `context.md`, sample others.

**Defect:**
- `docs/10_canon/CANON.md` line 80: **"Current: v0.3.1 (Playable Alpha + Endgame System)"** — package.json is `v0.9.6-alpha.1` and napkin/master-roadmap reference v0.9.6 as current. Version field is ~5 minor versions stale.

**Strengths:**
- `CANON.md` precedence order is clear (Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible > context.md).
- Both v0.9.0 gate docs (`SENSITIVE_HISTORY_DESIGN_GATE.md`, `VICTORY_AND_PYRRHIC_SCORING.md`) are referenced consistently.
- Code Contradiction Rule is canonical: "If code contradicts canon docs, code is wrong."
- Determinism rule explicit and tested.
- Filename version markers (`v0_9_0`) match body version markers as of 2026-05-05 per `LANE-NIGHTSHIFT-CANON-DOCS-TO-V09` pass.

**Did not audit (would take dedicated time):**
- Cross-check every Engine Invariant against actual sim code.
- Verify Systems Manual section numbering matches code structure.
- Check FORAWWV.md for stale entries (canon, manual-edit-only).
- Verify HISTORICAL_TIMELINE_MASTER.md against `data/scenarios/essays/` essay dates.

**Recommendation:**
- One-line fix: update `CANON.md` line 80 to `**Current: v0.9.6-alpha.1**` and reference the active milestone (per napkin, v0.9.7+ followups closed 2026-05-09/10).
- Optional: add `tests/canon_version_currency.test.ts` reading `package.json` and asserting `CANON.md` mentions the same major.minor. Cheap regression.

---

## 11. Error handling consistency

**Numbers (in `src/ui/map/`):**
- `try`/`catch`/`setLoadError`/`throw new`: **312 occurrences across 56 files**.
- `ErrorBoundary` references: **2 files** (`App.tsx`, `RootErrorBoundary.tsx`).

**Hotspots by density:**
- `MapContainer.tsx`: 58 error-handling references (deck.gl integration surface — error-prone).
- `App.tsx`: 20 (root error orchestration).
- `_retired_chrome/TopToolbar.tsx`: 20 (retired, should be deleted).
- `campaignRecruitmentActions.ts`: 22.
- `orderActions.ts`: 15.
- `PresidentialToolbar.tsx`: 14.

**Verdict:** Discipline is solid — most actions go through `setLoadError` (the gameStore-owned error surface that feeds `LoadErrorToast.tsx`). Only one root-level `ErrorBoundary`. The existing `gui-playtest-defects-plan.md` references panel-level error boundary as defect D1.2 — that's in flight.

**Recommendation:** Add panel-level error boundaries (PresidentialInbox, COMMAND, OpsPlanningModal, ArmyHQModal) so a render failure in one panel doesn't blank the whole shell (as I observed during the HQ-Review click in round 1).

---

## 12. Save / load UX

**State observed:**
- `saves/autosave.json` (2.8 MB, last modified during my playthrough session today).
- `saves/save_0001.json` (168 KB, from January).
- IPC actions: `saveGame({ filename? })`, `quickSave()`, `loadScenarioDialog()`, `loadStateDialog()`, all browser-noop'd via `makeNoop`.
- 13 renderer files reference these APIs.
- Save-format migration: `src/state/save_migration.ts` with 22 `as any` (highest concentration in production paths — appropriate for cross-version coercion).

**Concerns I can articulate from file-level inspection (no browser save-test possible):**
1. **Autosave is 2.8 MB at Turn 0** (per file size). Per napkin LANE D, the 188w final save was trimmed from 30 MB → 6.84 MB (-76%). So save-size scaling is monitored. But for a first-time player, downloading a 2.8 MB file on every turn (if save is per-turn) feels heavy for v0.9-era hardware/disk.
2. **No "save slot" UX visible.** All saves go to `saves/` flat directory. Per `saves/save_0001.json` naming, there's a 4-digit slot pattern. Paradox titles always have a "Saves" browser with screenshots + dates + turn number + faction. Worth adding for v1.0.
3. **No "save before risky action"** prompts. CK3/HoI4 prompts to save before critical events. AWWV's "Decision Room" model handles this differently (pending decisions block advance) but a "save now before resolving this peace plan" affordance would be a nice safety.
4. **Save/load is IPC-gated**, so my browser sessions never persisted state across reloads. That's by design (Electron sandbox), but it means anyone doing dev-server testing has no save flow. Consider a localStorage-backed dev-only save for renderer testing.

---

## 13. Additional audit areas I propose

Beyond the round-3 lanes above, the following audit angles would benefit from a focused pass. I haven't done them; they're suggestions for next rounds.

### 13.1 Internationalization readiness

Search `i18n` infrastructure exists (`src/ui/map/i18n/`). Is every UI string actually routed through it, or are there bare string literals in JSX? A bare-string audit would prepare the codebase for localization. Given AWWV's subject matter targets BCMS-language audiences, this is genuinely important rather than nice-to-have.

### 13.2 Colorblind palette validation

Political control overlay uses pink (ARBiH), green (HRHB), gray-blue (RS). Run the palette through deuteranopia / protanopia / tritanopia simulators. The pink/red distinction (own brigades green, hostile red) is the most-likely problem axis. Consider adding a "shape-coded" mode that uses cross-hatching alongside color.

### 13.3 Telemetry / analytics privacy posture

Does the game phone home with usage data? If yes, is the user informed? Given subject-matter sensitivity, telemetry needs explicit opt-in + clear privacy notice. Check `electron-main.cjs` for any HTTPS calls outside the bundled PMTiles/OSM tile fetches.

### 13.4 Mod-support readiness

The game already has highly structured scenario JSON, OPERATION_NAMES pool, officer rosters, Codex essay corpus, events catalog. These are all moddable surfaces in principle. A "mods/" loader (Steam Workshop-style or local-folder-based) is one of the lowest-cost ways to extend AAA+++ value. Audit: which of these "configurable" files are actually safe to load from arbitrary user paths? Which would break the deterministic-hash contract?

### 13.5 Sound design (none currently)

The napkin doesn't reference any audio system. Even minimal — turn-advance "tick", inbox-arrival "chime", war-crime-revealed "alert" — would replace visual scanning load. Consider hiring (or contracting) a sound designer. AAA+++ tier without sound is unusual.

### 13.6 Animation budget

Map zoom/pan, modal open/close, panel slide-in. Are transitions consistent (same easing, similar duration)? Or do some use 200ms ease-out, others 600ms linear, etc? Audit `src/ui/map/utils/` and `src/ui/shared/` for transition constants — if absent, propose a `transitions.ts` token file.

### 13.7 Keyboard shortcut discoverability

`useKeyboardShortcuts.ts` exists. Are all bindings discoverable through a help overlay (press `?`)? Paradox titles all have shortcut overlays. Audit: count bindings vs how many are documented in tutorial or settings.

### 13.8 Save file integrity / corruption recovery

If a save file is partially written (game crashes mid-save), can the game recover? Check `save_migration.ts` and `electron-main.cjs` save logic for atomic-write patterns (write-temp + rename) vs naive overwrite.

### 13.9 Multi-monitor / window-size resilience

The map app uses `useMapInteractions` and deck.gl. What happens if user drags the window to a smaller monitor or undocks a 4K display? Test viewport boundaries.

### 13.10 The `data/scenarios/essays/` corpus depth

I sampled 3 of 110 essays. A focused historian-pass on the remaining 107 — checking ICTY case numbers, dates, casualty figures against authoritative sources — would catch any drift. Recommend a `/historian` lane.

### 13.11 The `validateGameState` coverage

`src/state/validateGameState.ts` exists with 1 `as any`. Does it catch every invariant in `Engine_Invariants_v0_9_0.md`? Cross-reference would surface any unenforced invariant.

### 13.12 `electron-main.cjs` security review

The Electron main process has filesystem + IPC + network access. Security-review pass: are renderer inputs validated before reaching disk/network? Are IPC handlers idempotent (so a fast-clicking user doesn't double-trigger a destructive action)? Are saves written atomically?

### 13.13 First-time-user audit, recorded

Set up an actual first-time player session (a willing human, not me) with screen recording. Record the time-to-first-turn-advance and the time-to-first-"I understand what just happened" moment. Compare across factions. This is the kind of measurement Paradox does pre-launch.

### 13.14 Game-state schema deprecation lanes

The `pendingDayton`, `pendingProposalReviews`, `pendingConvoyDecisions` fields all live on `state.meta` or `state.military`. Are there any deprecated fields that the engine still writes but nothing reads? An `unused-field-audit.cjs` script would surface this.

### 13.15 Endgame Verdict + Cost Ledger content review

I never reached endgame. The `VerdictScreen.tsx` + Cost Ledger are the game's narrative payoff. A dedicated audit lane would: (a) verify every Cost Ledger annotation has Codex copy, (b) verify VerdictScreen handles all the win/lose taxonomy in `VICTORY_AND_PYRRHIC_SCORING.md`, (c) check the "no winner here" framing is consistent across all faction-outcome combinations.

---

## 7. Browser playtest — RBiH first-30s experience

**Setup:** Chrome, fresh load `http://localhost:3002/`, picked RBiH from faction modal, no Continue (clean Turn 0). Skipped tutorial after reading step 1.

**Major positive findings:**

1. **Tutorial step 1 copy was rewritten today** (per Lane O9 closeout). Now reads: *"The opening presidential brief gives your starting position in three scan points. Read it, then use the toolbar and Decision Room to inspect what needs attention. This tutorial covers the loop: brief, inspect, decide, execute, report, judge, then advance into consequences."* Much better than the prior "You are the unnamed political leader" passive voice. **Lane O9 is in production.**

2. **Faction-specific Presidential Brief is excellent.** RBiH brief reads:
   1. *"Hold Sarajevo, Tuzla, Zenica, Bihać, and other urban anchors while the army forms under fire."*
   2. *"Keep the international record visible: diplomacy, civilian harm, and military survival are linked."*
   3. *"Use Army HQ and the Decision Room to set priorities and approve operations through commanders."*

   Each line carries faction-specific framing: defensive posture, ICTY-anchored international pressure, mechanic pointer. Distinctive voice.

3. **Faction-specific branding is well-executed.** Top-center shows ARBiH crest with "ARMIJA" label in gold/silver vs the RS Republika Srpska tricolor I saw earlier. Immediate visual identity.

4. **COMMAND panel information density is high.** At first glance the player sees: TERRITORY (ARBiH 45.9%), OPERATIONAL SITREP (406 exposed front sectors, fronts 497 engaged), priority front IDs, weakest brigades, CASUALTIES (No data), ALLIANCE GAUGE (Bosniak-Croat 0.75), INTERNATIONAL PRESSURE (IVP 0 with 30%/60%/80% thresholds). That's ~15 distinct facts in the first scan — substantial situational awareness without clicking.

5. **`BEGIN | READ LATER` is better than `UNDERSTOOD - BEGIN`.** Two actions communicates a real choice — read now or defer. The RS brief I saw earlier only had one action. RBiH brief offers both. Consistency check: confirm RS brief has been updated too.

6. **"ALLIED" badge at bottom-right** is good — immediately communicates the Bosniak-Croat alliance state at this turn.

**Friction points:**

1. **Tutorial overlay covers half the right column.** Step 1 references the Presidential Brief but the brief is partially obscured by the tutorial card. Player has to dismiss tutorial to read the brief, defeating the "read the brief, then use the toolbar" instruction.

2. **Priority front IDs are raw OSIDs.** `"Banja_luka Melina_2 ↔ Sanski_most Ilidza_2"` — not human-readable. Should be `"Banja Luka — Sanski Most front"` or similar plain-English. Same applies to `Bihać Orasac_2 ↔ Bihać Racic`.

3. **Bottom bar duplicates information unclearly.** Two number pairs side by side: `33% / 67%` (small, no label) immediately followed by `Friendly 32.6%  Hostile-held 67.4%`. The unlabeled `33% / 67%` is likely a graphical control-bar visualization but reads as redundant text.

4. **`SITUATION` cards in the right panel are partially obscured.** Mid-card text like `"...itory Lost"` (showing "Lost" with the "Terr" cut off by the tutorial overlay) reduces signal. Once tutorial dismissed, becomes "Territory Lost - Enemy forces captured 4 positions including Tasovčići (Čapljina)."

5. **Bottom toolbar shows numeric metrics but no obvious tooltip.** Friendly 32.6% / Hostile-held 67.4% — does that add to 100%? No (32.6+67.4 = 100), so OK. But the leading control-bar `33% / 67%` rounded to 33% inconsistent with the 32.6% precise value next to it.

---

## 8. Browser playtest — HRHB first-30s experience

**Setup:** Same browser session, reset to faction picker, picked HRHB.

**Faction-specific Presidential Brief:**
1. *"Protect Herzegovina and exposed Croat communities in central Bosnia while avoiding overextension."*
2. *"Manage the Sarajevo alliance and Zagreb patron pressure; either can shift faster than the front."*
3. *(third line cut by overlay)* — likely about Army HQ + Decision Room.

**Faction-specific signals:**
- HVO crest (red-and-white Croatian checker pattern with gold frame, distinct from ARBiH's silver shield and RS's tricolor).
- Header: faction tag "HVO" appears small below crest.
- **TERRITORY: HVO 15.0%** — significantly smaller than RBiH's 45.9% or RS's 51.7%. Player immediately sees they're playing the smallest faction.
- 79 exposed front sectors vs RBiH's 406 — much smaller operational scope.
- Priority fronts: all `Banja_luka_*` references — concentrated theater (Northwest Bosnia OZ context).
- Weakest brigades: "Hrvoje Vukčić Hrvatinić Brigade" (real HVO unit) and "101st Orašje Brigade" (real Posavina-region unit).
- ALLIANCE GAUGE (Bosniak-Croat): 0.75 — same value as RBiH (symmetric).
- Friendly 15.7%, Hostile-held 84.3% — feels disempowering as initial framing.
- "ALLIED" badge — accurate (alliance live at Turn 0).

**Strengths of HRHB framing:**
- The brief language "avoiding overextension" matches the small-faction reality. Honest, not aspirational.
- "shift faster than the front" is a sophisticated phrase that names HRHB's structural fragility (the war could break HRHB before any sector decisively changes hands).
- "manage Zagreb patron pressure" — accurate to Tudjman's role and the HVO-HV relationship.

**Concerns specific to HRHB onboarding:**
- 15.7% friendly is going to scare a new player. There's no in-line text explaining "this is normal for HRHB at Turn 0" or "your strategic role is different from the other two factions". A first-time HRHB player will likely think they picked badly.
- The "Priority fronts" all reference `Banja_luka_*` settlements which are deep in RS territory — confusing for HRHB whose main territory is Herzegovina (south-west). The "priority fronts" logic may be pulling from a faction-wide aggregate rather than the HRHB-relevant fronts (Mostar, Stolac, Posušje, etc.). **Possible defect** — need to verify.

---

## 9. Faction-specific UX comparison

Side-by-side at Turn 0 (1 Apr 1992):

| Element | RS (VRS) | RBiH (ARBiH) | HRHB (HVO) |
|---|---|---|---|
| Faction crest | Red-blue-white tricolor (Republika Srpska) | Silver-gold ARMIJA shield | Red-white Croatian checker + gold frame |
| Friendly territory % | 51.7% | 32.6% | 15.7% |
| Brigades (per WAR BEGINS) | 77 | 78 | 30 |
| Initial briefing | "control JNA's heavy equipment", "Posavina corridor", "international pressure will erode" | "Hold urban anchors while army forms under fire", "international record visible" | "Protect Herzegovina + Croat communities", "manage Sarajevo alliance + Zagreb patron" |
| Briefing tone | Military advantage + diplomatic decay | Defensive + international visibility | Small + bind between two larger players |
| Belgrade attitude (status bar) | CAUTIOUS | (not shown — different patron) | (not shown — different patron) |
| Alliance gauge | Not shown for RS | Bosniak-Croat 0.75 | Bosniak-Croat 0.75 |
| Action buttons | `UNDERSTOOD - BEGIN` (single action) | `BEGIN \| READ LATER` (two actions) | Same as RBiH (probably) |

**Inconsistencies:**

1. **Briefing action buttons inconsistent between factions.** RS has one action (`UNDERSTOOD - BEGIN`), RBiH/HRHB have two (`BEGIN | READ LATER`). All three should match. Suspect the RS version is stale and the new pattern is `BEGIN | READ LATER`.
2. **Status bar badges differ by faction.** RS shows "BELGRADE: CAUTIOUS" (patron attitude). RBiH/HRHB show "ALLIED" (alliance state). Patron attitude for the latter two factions isn't shown anywhere I can see — likely missing for RBiH (no patron) and HRHB (Zagreb).
3. **HRHB Priority Fronts pull from Banja Luka area** — geographically wrong for HRHB's actual operational theater (Herzegovina). Either the "priority front" selection algorithm is faction-agnostic (showing the war's most-active fronts regardless of who you play) or there's a bug.

**Strengths:**

1. **Faction voice is distinct and historically calibrated.** RS = "your military advantage is overwhelming but temporary." RBiH = "Hold while the army forms under fire." HRHB = "avoid overextension; manage two patrons." Three sentences in three different conceptual registers — exactly right.
2. **Crests, color palette, brief tone, statistical anchors all faction-coded.** A blindfold test (hide the faction name, show only the brief + crest) would let a player guess the faction correctly.
3. **The grand-strategy "negative-sum war" thesis is reinforced by each faction's framing**: RS = "what you have will be eroded," RBiH = "survive until the world notices," HRHB = "navigate between two patrons before one breaks you." None of these are conquest narratives.

---

## 10. Paradox-tier benchmark

(Brief — I don't have access to running Paradox titles for direct comparison; this is from memory.)

**What AWWV already has that matches Paradox-tier:**
- Deterministic engine with replay (Stellaris-grade).
- Per-faction personality / commander system (HoI4 generals, CK3 character ambitions).
- Real historical names + events + ICTY citations in Codex (CK3 history book + EU4 mission tree).
- Multi-phase OPORD-style operation authoring (Strategic Command + HoI4 battle planner).
- Decision Room product-spine "Brief → Inspect → Decide → Execute → Report → Cost → Judge → Next" (EU4 mission tree + CK3 council).
- 96+ historical essays + dynamic Codex tokens (CK3 lore depth).
- Win/lose verdict + "no winner here" framing (CK3 character end-screen + bespoke).

**What AWWV likely lacks vs Paradox tier:**

1. **No diplomatic-relationships overview panel** at glance. Paradox titles uniformly have a "Diplomacy" screen showing all your relations with one click. AWWV has a `DiplomacyPanel.tsx` (1 file) but I haven't tested if it surfaces all three-way + UN/EC/US/Russia/etc relations in one place.
2. **No music / sound** (likely true for v0.9.6-alpha). Paradox-tier always has at least ambient + alert SFX. Not just nice-to-have — sound cues replace half the visual scanning load.
3. **No minimap on the tactical view.** Saw `Minimap.tsx` but didn't see it during play. Paradox titles always include a minimap for spatial orientation.
4. **No "time speed" controls.** AWWV is turn-based (advance one week per click), so this is by design. But CK3/HoI4-style "auto-advance until next decision" mode (where the engine runs until a player-blocking decision surfaces) would suit this game's "negative-sum" pace.
5. **No mod support / scripting.** Paradox titles all ship moddable. Big effort, but the moddable surfaces (scenarios, OPERATION_NAMES, essays, officer rosters) are already structured for it.
6. **No translation / localization.** All UI is English. The game's subject matter is BCMS (Bosnian/Croatian/Montenegrin/Serbian)-speaking; a native-language localization would significantly broaden audience.
7. **No tutorial replay or in-game help glossary.** The 8-step onboarding fires once. Once you skip or finish it, there's no obvious "what does Schwerpunkt mean again?" lookup. Paradox titles have hover-glossary that explains every technical term inline.
8. **No "advisor said" log.** When the simulation makes a decision on your behalf (commander declines an operation, staff stages a stance change), there's no obvious history of "here's what I did and why" that the player can review. CK3 has its event log; HoI4 has the news ticker.
9. **No streamer mode / family-friendly mode.** Given the subject matter (war crimes, ethnic violence), a "tone down explicit graphics" toggle for Twitch/YouTube playthroughs would be socially responsible.
10. **No achievement / steam-integration surface yet.** Per the napkin, Steam integration is post-v1.0; this is appropriate sequencing.

**AAA+++ gaps that are *also* AWWV's distinctive strength:**

- **No "ahistorical" branching.** AWWV explicitly does not let you "win the war"; the simulation tracks divergence but doesn't enable a fantasy victory path. This is the negative-sum thesis. Paradox titles allow "weird" historical paths (Sweden conquering Europe in EU4); AWWV deliberately doesn't. Don't change this.
- **No multiplayer.** Sensitive subject matter argues against PvP. Recommend not adding.

---

## 14. Deliverable — New-Player Guide

See `docs/00_start_here/NEW_PLAYER_GUIDE.md`. ~10 sections covering: the premise, the turn loop, per-faction strategic advice (RBiH / RS / HRHB), every toolbar button, OpsPlanningModal flow, Decision Room flow, common new-player mistakes, jargon glossary, and where to learn more. Targeted at a player who has finished the in-game 8-step tutorial but still feels lost — exactly the gap I experienced during my own playtest sessions.

---

## Final summary — round 3 consolidated

### Real defects worth acting on (priority order)

| # | Finding | Severity | Effort |
|---|---|---|---|
| 6 | `CANON.md` line 80 says "Current: v0.3.1" — should be v0.9.6-alpha.1 | Low (doc-only) | 1 minute |
| 8.II | HRHB Priority Fronts pull from Banja Luka area (wrong geography) | Medium (faction-correctness defect) | Investigate + ~2 hour fix |
| 9.I | Action-button inconsistency: RS = `UNDERSTOOD - BEGIN`; RBiH/HRHB = `BEGIN \| READ LATER`. RS appears stale | Medium (UX inconsistency) | Quarter-day |
| 9.II | Status-bar patron/alliance indicator missing for RBiH/HRHB | Medium (faction-coverage gap) | Half-day |
| 7.II | Priority front IDs are raw OSIDs (`Banja_luka_Melina_2 ↔ Sanski_most_Ilidza_2`) | Low (readability) | Half-day to humanize across all surfaces |
| 1 | `GameStateAdapter.ts` has 52 `as any` — single highest concentration | Low–medium (type safety) | Half-day audit + type guards |
| 11 | Only 1 root-level `ErrorBoundary`; panel-level needed | Medium (resilience) | Half-day per panel (already in flight per gui-playtest-defects-plan D1.2) |

### Strong-discipline signals (no action needed)

- **0** `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` across entire `src/`.
- **0** `dangerouslySetInnerHTML` / `eval` / `window.eval`.
- **10** active TODO/FIXME markers (excellent).
- **130** aria-* / role= annotations across 44 components.
- **312** error-handling references across 56 files (try/catch/setLoadError/throw).
- Faction-specific Presidential Briefs are well-written and historically calibrated.
- ICTY-grounded essay corpus (sampled) is high quality and balanced.

### Areas I propose for next rounds (not done in this pass)

13.1 i18n bare-string sweep. 13.2 colorblind palette validation. 13.3 telemetry privacy posture. 13.4 mod-support readiness audit. 13.5 sound design pass (none exists). 13.6 animation budget consistency. 13.7 keyboard shortcut discoverability. 13.8 save-file integrity / corruption recovery. 13.9 multi-monitor resilience. 13.10 historian audit of remaining 107 Codex essays. 13.11 `validateGameState` invariant coverage. 13.12 `electron-main.cjs` security review. 13.13 first-time-user session with recording. 13.14 deprecated game-state schema fields. 13.15 Endgame Verdict + Cost Ledger content review.

### Deliverables produced this round

- `docs/40_reports/audits/20260516_CODE_AUDIT_ROUND3_AAA_POLISH.md` (this file)
- `docs/00_start_here/NEW_PLAYER_GUIDE.md` (player-facing tutorial doc that fills gaps left by in-game 8-step tutorial)

### Per user instruction

- Did NOT touch `MASTER_ROADMAP.md`, `PROJECT_LEDGER.md`, `PROJECT_LEDGER_KNOWLEDGE.md`, `.claude/napkin.md`, `docs/10_canon/FORAWWV.md`. Findings live in this doc and the sibling guide; team / Codex can promote into roadmap/ledger as appropriate.
