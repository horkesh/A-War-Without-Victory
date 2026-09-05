# R7 Presentation and English-Readability Amendment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Discharge the located, in-scope half of the 2026-09-03 showcase GUI audit as R7 Phase 5's
own "Inspect English at 1920x1080" pass — display names, staff voice, number formatting, and English
text that fails to render legibly — while routing every bug, every unlocated finding, and every
polish item to a destination that is not this plan.

**Architecture:** Renderer-only. No new component, no new design-system primitive, no new shared
Toast. Where a correct implementation already exists in the tree (`osidDisplayName.ts`,
`formatFindingSeverity`, `formatPersonnel`), wire to it rather than writing a second one — four
competing "humanize a slug" implementations and four competing casualty formatters are the cause of
most of this audit, and this plan must not add a fifth of either.

**Tech Stack:** React 18, TypeScript, Tailwind/CSS, Vitest, Testing Library, Playwright. No new
runtime dependency.

---

## 1. Header Contract

| Field | Value |
|---|---|
| **Date** | 2026-09-05 |
| **Status** | ACTIVE — registered R7 amendment |
| **Owner lane** | **R7 — Content, historical attribution, audio, accessibility, and opening experience** |
| **Command-board row** | 7 |
| **Parent plan (amended)** | [Content/history/audio plan](2026-07-31-content-history-localization-audio-plan.md) — this plan executes its **Phase 5** checklist line *"Inspect English at 1920x1080, 1366x768, and 3440x1440 across the required surfaces."* |
| **Sibling amendments** | [Opening screens](2026-08-23-opening-screens-implementation-plan.md) · [Cinematic opening and typography](2026-08-28-cinematic-opening-typography-implementation-plan.md) |
| **Source finding set** | [Showcase screenshot GUI audit](../40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md) (FROZEN, 29 findings) |
| **Panel record** | [Tier-1 specialist reports](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) |
| **Collision rules** | §8 of the roadmap: *"Map/Desk English layout strings — R1/R2 layout first; R7 accessibility/readability proof second."* R1/R2 are CLOSED, so their layout pass is complete and this is the open second pass. One file has one owning phase; see §4. |
| **Current next action** | Phase 1 (`messages.en.ts` string pass). |

### Why this is legally an R7 amendment and not a new lane

Roadmap §5: *"The linked plan is the task-level contract for each row. A workstream may not gain a
second active plan; amend the linked plan and this register together."* This plan is registered as an
amendment in `MASTER_ROADMAP.md` §5 (R7 row), the Current Execution Snapshot, `COMMAND_BOARD.md`
row 7, and the parent plan — in one change, exactly as the 2026-08-28 cinematic amendment was
(*"R7 amendment registered in roadmap, command board, and accepted functional-opening plan"*).

R7's own §3 In scope already claims this work: *"English string correctness, accessibility,
readability, and packaged-offline presentation proof."* R7's "Complete when" still lists **broader
English readability/accessibility** as open. Nothing reopens; nothing new is created.

---

## 2. Purpose and Non-Goals

### In scope

- English string correctness and staff voice across Desk, Decision Room, Army HQ, Records, Codex,
  Chronicle, War Summary, Dayton, and corps/OG surfaces.
- Player-facing **display names**: OSID/slug leakage, `_N` suffixes, missing diacritics, doubled
  municipality names.
- **Number formatting** consistency and unit disclosure.
- English text that **fails to render legibly** at a required resolution — truncation with room to
  spare, inter-sibling overlap, vertical letter-stacking.
- A transient receipt that is visually indistinguishable from permanent chrome (finding 21).

### Non-Goals

- **No engine, sim, state, scenario, calibration, or canon edit.** See the Scope Lock in §4.
- **No bug fixes.** Every bug in this audit is pre-seeded to R8 under owner decision D1
  (2026-09-04, HOLD FOR R8). This plan fixes presentation, not correctness.
- **No new UI pattern.** No shared Toast/notification component, no ResizeObserver charting
  rewrite, no grid-template rework, no design-system addition.
- **No diacritic guessing.** Ground-truth names exist for 100% of scored OSIDs (measured 712/712);
  a transliteration heuristic would be strictly worse and non-deterministic.
- **No OSID/`sid` key change.** Banned by `CLAUDE.md`; and unnecessary — measured 0 collisions.
- **No `messages.bcs.ts` translation.** Multilingual is post-1.0 by owner decision 2026-08-15.
- **No art regeneration** (finding 27) — the owner generates all images externally.
- **No repo-wide formatter consolidation and no full turns→weeks sweep** — both correctly declined
  by the panel; both recorded in the post-1.0 backlog with their key lists.
- **`docs/10_canon/FORAWWV.md` is not edited by this plan** (roadmap §3).

---

## 3. External-Agent Execution Contract

**Session-start commands**

```powershell
git status --short
git branch --show-current
npm.cmd run typecheck
```

**Required reading, in order**

1. `CLAUDE.md` (sacred rules; Windows `;` chaining; absolute paths)
2. This plan
3. [Panel record](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) — the
   `file.ts:line` citations behind every task below
4. [Frozen audit](../40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md)
5. Parent plan [§3 and Phase 5](2026-07-31-content-history-localization-audio-plan.md)
6. `docs/life_lessons/ui_map.md`

**Files to inspect before editing:** every `file.ts:line` named in the phase you are starting. Read
the surrounding function, not the cited line alone. Several fixes are one line inside a component
whose sibling lines belong to a different phase.

**Branch collision rule:** one file has one owning phase (§4). Do not edit a file outside your
phase's file list, even for an obviously-correct one-line fix — raise it instead.

**Global stop rule.** STOP and report rather than proceeding if:
- a fix requires touching `src/sim/**`, `src/state/**`, a scenario, calibration data, or canon;
- a "string fix" turns out to change which value is computed rather than how it is worded;
- a display-name fix cannot resolve a name from the existing lookup (that is a data bug, not a
  display bug — it is pre-seeded to R8);
- any baseline, fingerprint, or calibration artifact changes. **This plan must be byte-neutral to
  the simulation.** A changed hash means you edited something you should not have.

**Expected phase/commit boundaries:** one commit per phase minimum; within Phase 3, **one commit per
file** — the `className` fixes are independent and must not be merged into one edit. Two files in
Phase 3 carry two distinct tasks each (`PresidentialDecisionRoomPanel.tsx`: 3.4 + 3.5;
`PresidentDeskShell.tsx`: 3.7 + 3.9): one commit per file, two distinct diffs inside it.

---

## 4. Task Boundary Rules

### Scope Lock — allowed surfaces

- `src/ui/map/**` presentation code, its utils and data adapters
- `src/ui/shared/**` player-facing label helpers
- `src/ui/map/i18n/messages.en.ts`
- active UI tests under `tests/ui/**`
- R7/GUI documentation, roadmap control docs, and the ledger

### Scope Lock — forbidden surfaces

- `src/sim/**`, `src/state/**`, scenarios, calibration data, derived data pipelines
- `src/desktop/electron-main.cjs`, preload, IPC channels/payloads, save schema
- `docs/10_canon/**` — including and especially `FORAWWV.md`
- `messages.bcs.ts` and any locale contract
- OSID/`sid` key derivation

### Per-phase file ownership (the anti-collision contract)

Three seats independently proposed edits to overlapping files. Ownership is assigned **by file**,
not by finding, so no two phases can touch the same file:

**Three known collisions, resolved here so no implementer discovers them at edit time:**
`PresidentialDecisionRoomPanel.tsx` and `CorpsFrontPanel.tsx` were both claimed by the layout seat
and the data-truth seat; `PresidentDeskShell.tsx` and `CodexPanel.tsx` were both claimed by the
layout seat (findings 24 and 7d) and the voice seat. **Phase 3 owns all four of the layout-side
files outright** (`PresidentialDecisionRoomPanel.tsx`, `PresidentDeskShell.tsx`, `CodexPanel.tsx`,
plus `ArmyHQModal.tsx` for finding 17); **Phase 5 owns `CorpsFrontPanel.tsx`**. A voice or data-truth
change wanted inside a Phase-3-owned file is raised to the integrator, not made — and vice versa.

| Phase | Owns these files exclusively |
|---|---|
| 1 | `src/ui/map/i18n/messages.en.ts` |
| 2 | `generateChronicleEntries.ts`, `ChronicleOverlay.tsx`, `playerSafeText.ts`, `FormationDetail.tsx`, new municipality-name map module |
| 3 | `DirectiveCard.tsx`, `AdvanceTurnModal.tsx`, `PresidentialDecisionRoomPanel.tsx`, `SituationTab.tsx`, `PresidentDeskShell.tsx`, `CodexPanel.tsx`, `ArmyHQModal.tsx` |
| 4 | `formatters.ts`, `WarSummaryContent.tsx`, `TurnAftermathModal.tsx`, `TurnAftermathRecordsPanel.tsx`, `BrigadeRow.tsx`, `SettlementDetailContent.tsx` |
| 5 | `SectorsSection.tsx`, `CorpsFrontPanel.tsx`, `DaytonNegotiationModal.tsx`, `DaytonInstitutionalDimensions.tsx`, `CinematicVerdict.tsx`, `PersonnelContent.tsx`, `officerCharacter.ts` |

**Save/schema work:** never. **Scenario/hash drift:** never — see the global stop rule.
**Decision packet instead of implementation:** required for anything in §9 HELD.

---

## 5. Phase Sequence

Effort key: **XS** ≈ one line · **S** ≈ under an hour · **M** ≈ half a day.
Every task carries an implementer seat and a **different** reviewer seat (house rule).

---

### Phase 1 — `messages.en.ts` staff-voice and disclosure pass

**Implementer:** Narrative Designer · **Independent review:** Modern Wargame Expert (semantic
accuracy of every reworded number/label) + Canon Compliance Reviewer (items 19a, 23 only)

This phase is string-only. It changes no computed value. Every data-truth item whose fix the panel
described as "reword" lands here rather than in the data-truth seat's own phase, because
`messages.en.ts` has one owner.

| # | Task | Key / line | Effort |
|---|---|---|---|
| 1.1 | Engineering vocabulary → staff voice: drop *owns*, *shell*, *executable staff items*, *Ghost Entry*, the quoted-string chapter recap, *Responsible owner*, *recorded decision effect* | `:5164`, `:773`, `:2027`, `:343`, `:2015`, `:5171-5172`, `:3577`, `:4221`, `:3578`, `:444`, `:3637`, `:3655`, `:1925` | S |
| 1.2 | `Unreported` → **`No staff report`** across the 13 bare value-slot keys listed in the panel record. **Keep** the contextual phrases (`Cohesion unreported`, `Commander record unreported`) — they already read as prose | 13 keys, enumerated in panel §4 | S |
| 1.3 | Finding 2 — reword `situation.sustainmentCollapsed` to disclose a **cumulative, permanent** municipality count, not a live severity band beside "critical"/"strained" | `situation.sustainmentCollapsed` | XS |
| 1.4 | Finding 25 — disclose the unit on net territory: it is an **OSID count** | `warSummary.label.netOsids` | XS |
| 1.5 | Finding 8c — qualify the two `CRITICAL` labels by domain (reserve queue vs review queue: two different counts, both correct) | `PresidentialAttentionPanel` label keys | XS |
| 1.6 | Finding 10c — "Baseline: 1.0 = Standard Brigade" into staff voice | `corpsFront` baseline key | XS |
| 1.7 | Finding 20 — one time unit: **weeks**. Change only the three keys the audit named | `:2166`, `:1892`, `:1894` | S |
| 1.8 | Finding 18b — Patron Override gains its consequence clause (reuse `commandBriefing.item.patronOverride.detail:1085`) | `:2483` | XS |
| 1.9 | Findings 22a, 28, 29 — `Fielded personnel now` → `Fielded personnel`; `Open Turn Aftermath` → `View Aftermath`; spaced hyphen → em dash | `:3275`, `:449`, `:1077`, `:1085` | XS |
| 1.10 | Finding 19a — reword the paramilitary methodology sentence in place, **keeping every fact and the caveat**, dropping engine-voice framing. **Do NOT relocate it** | `:5471` | S |
| 1.11 | Finding 23 — replace the 19-name comma paragraph with a pointer to the roster already rendered as chips at `PersonnelContent.tsx:329-340`. **Touches no name** | `:3287` | S |

**Canon gates discharged in this phase** (Canon Compliance Reviewer signs both):
- **19a** — `SENSITIVE_HISTORY_DESIGN_GATE.md:143` requires the citation *content* to be present but
  dictates neither voice nor placement. It already sits under its own `Sources and model`
  sub-header. Reword in place. The audit's "move it to a tooltip/codex note" is **rejected**:
  relocating reduces the visibility of gate-required content for no wording benefit.
- **23** — §10 (provenance) governs any surface stating something about a named real person with a
  `war_crimes_record`. The fix changes only the duplicate summary sentence; the full unmodified list
  stays. **Constraint recorded for any future per-officer dossier work: key off the provenance
  manifest structurally per §10.0, never off a curated subset of "notable" names.**

**Tests first:** extend the existing i18n key-presence/vocabulary tests under `tests/ui` with a
banned-vocabulary assertion (`owns`, `shell`, `Ghost Entry`, `executable staff items`,
bare `Unreported` in a value-slot key).

**Verification:** `npm.cmd run test:vitest -- tests/ui` · `npm.cmd run typecheck`

---

### Phase 2 — Display-name pass (findings 3 and 9) — the audit's #2 headline

**Implementer:** Gameplay/UI Programmer · **Independent review:** Historian (name source and
diacritic fidelity — mandatory, per §13 "Historical/source review") + Code Review

The correct implementation **already exists** and is already consumed by ~30 components:
`buildOsidDisplayNameMap()` / `getOsidDisplayName()` (`src/ui/map/utils/osidDisplayName.ts:59,76`),
populated at `MapContainer.tsx:1602` into Zustand `osidDisplayNames`. It carries proper diacritics,
strips the pipeline's `"(+N)"` merge annotation, strips a trailing `_N`, and already de-duplicates
`Bratunac Bratunac`. Chronicle and three GameStateAdapter sites are simply not wired to it.

| # | Task | Files | Effort |
|---|---|---|---|
| 2.1 | Chronicle battle titles — add an `osidNameMap` param to `generateChronicleEntries()`; replace `getPlayerSafeSettlementName(battle.osid, …)` with `getOsidDisplayName`; pass the store map from the overlay | `generateChronicleEntries.ts:542,569,574`; `ChronicleOverlay.tsx:313` | S |
| 2.2 | Operation display names — harden `getPlayerSafeOperationName`'s slug branch to strip a trailing `_N` as `humanizeOsid` already does; closes the suffix leak at ~7 call sites | `playerSafeText.ts:324-361` | S |
| 2.3 | Finding 9 — "Home municipality" uses the naive path seven lines below a correct one on the same card. Build a small `mun1990_id → mun1990_name` map from the same geojson (measured clean 1:1, 110 municipalities, 0 conflicts) and use it | `FormationDetail.tsx:788` (correct sibling at `:779`) | S |
| 2.4 | Turn the measured **0 collisions / 712 keys** result into an executable invariant so a future OSID/OOB data change cannot silently reintroduce one | new test under `tests/ui` | S |

**Explicitly NOT in this phase:**
- Full diacritic threading into `GameStateAdapter`'s operation-building pass (**M**, needs
  objectives-array-vs-raw-name precedence worked out). Task 2.2 is the bounded fix; the remainder is
  recorded in the post-1.0 backlog. The precedence hazard is **measured absent** for authored
  catalog names (`def.name` bypasses the humanizer entirely), which is why 2.2 is safe alone.
- `src/sim/combat/tactical_group_naming.ts`'s missing diacritics — `src/sim/`, forbidden, pre-seeded
  to R8.

**Verification — enumerate, do not sample.** Run one long scenario; for every Chronicle entry, every
`state.operations[]`/`operationHistory[]` record, and every formation's `location_osid`, run the
CURRENT and FIXED humanizers over the same input and diff. Anything still matching the existing
`looksLikeRawPlayerFacingToken()` regex (`playerSafeText.ts:51`) is a real remaining leak.
Every OSID appearing in a 188-week run must resolve via `osidDisplayNames`; measured coverage is
100%, so **any miss is itself a bug** and pre-seeds to R8 rather than being patched here.

---

### Phase 3 — English text that will not render legibly

**Implementer:** UI/UX Developer · **Independent review:** Code Review + QA Engineer

One commit per file. These are independent one-line `className` fixes and must not be merged.

| # | Task | File:line | Effort |
|---|---|---|---|
| 3.1 | Finding 12 — acronym letter-stacking (`VRS`→`V/R/S`, `ARBiH`→`AR/BiH`): add `whitespace-nowrap shrink-0` to the label spans | `SituationTab.tsx:278,341` | S |
| 3.2 | Finding 7b — DirectiveCard buttons paint over each other: add `truncate` to the three button `className`s, add the missing `title` | `DirectiveCard.tsx:835,851,862,871`; title at `:867` | S |
| 3.3 | Finding 7a — AdvanceTurnModal labels truncate with room to spare: `truncate` → `line-clamp-2 leading-tight`, add `title={label}`. **No grid-template change** | `AdvanceTurnModal.tsx:86-95` | S |
| 3.4 | Finding 7c — Decision Room `ALL` lens chip collides with its own badge: widen `min-w` for the `all` lens, or drop the redundant aggregate digits shown above | `PresidentialDecisionRoomPanel.tsx:74-114` (`:90`, `:102-114`) | S |
| 3.5 | Finding 21 — the action receipt is an in-flow block reusing the header card's exact styling, cleared only by a flat 8s timeout: give it distinct styling and a dismiss control following the existing `desk-close-overlay` pattern. **No new Toast component** | `PresidentialDecisionRoomPanel.tsx:599-614,483-490`; pattern at `PresidentDeskShell.tsx:96-106` | S |

| 3.6 | Finding 17 — the corps card's OG list is cut mid-name (`OG VISOKO`, `OG MAGLAJ`) with a dead black band below it, because the corps cards sit in one CSS Grid with **no `content-start`**: default `align-content` computes as `stretch`, so surplus height in the scroll area is pushed into the row tracks instead of packing row 2 under row 1. Add `content-start` to the grid container className. **One word, no restructuring, no change to the `auto-fit`/`minmax` column logic** | `ArmyHQModal.tsx:724` | S |
| 3.7 | Finding 7d (desk half) — the RESERVE REQUEST body cuts flush mid-sentence. The content is **not lost**: `president-desk-scroll-region` is a genuinely scrollable `overflow-y-auto` with no visual affordance, which at a glance — and in a press screenshot — is indistinguishable from truncated text. Add a bottom fade/scroll-shadow (mask-image gradient or a pinned gradient overlay) | `PresidentDeskShell.tsx:107-109` | S |
| 3.8 | Finding 7d (Codex half) — same root cause, different container: the campaign-context essay cuts mid-citation (`…in Prosecutor v.`) inside a `max-h-44 overflow-y-auto` `<section>` with no cue. Add the same affordance **independently**. **Two small CSS additions in two files — deliberately NOT a shared component**, so no design-system scope creep | `CodexPanel.tsx:359-362` | S |
| 3.9 | Finding 24 — the whiteboard date (`26 Jul 1993`) is painted into the background art at a fixed screen position and is sliced to a ~12px sliver ("26 Jul 1…") by the `PresidentDeskShell` right column, which lands its `flex gap-3` exactly across the whiteboard. Widen the reveal gap between the `DeskAuthorityHeader` block and the Decision Packet block so the gap clears the whiteboard's full vertical extent. **Treat the accidental sliver as the bug; do not reposition the column** | `PresidentDeskShell.tsx:94,107-117` (header block `:111-113`, packet block `:115-117`) | S-M |

**3.4 and 3.5 are the same file: one commit, two distinct diffs — do not merge the edits.**
**3.7 and 3.9 are the same file: one commit, two distinct diffs — do not merge the edits.**

**3.9 needs one live visual-iteration pass in a browser.** The whiteboard's pixel bounds are baked
into a `.webp`; they are not readable from source, and all three faction plates place the prop in
roughly the same region, so the column slices it identically on every faction. Acceptance is a
before/after screenshot at the same window size: the whiteboard must end up **either fully in the
gap or fully behind a card, never sliced**. If the tuning starts requiring the column to move or
the art to change, STOP — that is out of this plan.

**Provenance for 3.6–3.9.** All four were HELD as UNLOCATED in the first panel round and were closed
by the 2026-09-05 screenshot pass (panel record §5), which read the on-disk PNGs directly rather
than reasoning from source. Two independent screenshots corroborate 17; `command_surface.png`
(whiteboard fully legible, no right-column overlay) against `fresh_shots/{rbih,hrhb}/01_desk.png`
settles 24. Do not re-derive these from source — the citations above are the result.

**Verification — box intersection, never `scrollWidth`.** `scrollWidth === clientWidth` cannot see
this class of bug: under `justify-end` overflow projects from the start edge and is excluded from
`scrollWidth` in LTR. That is the lesson PR #491 already paid for. Assert sibling
`getBoundingClientRect()` non-intersection (7b), single-line label height (12), and drawn-content
containment (7a).

Per-task verification for the screenshot-pass additions:

- **3.6** — with `expandedCorpsId` set to a corps with a long OG list, assert the compressed
  siblings' `getBoundingClientRect().top` equals `expandedCard.bottom + gap`. That is a
  content-driven constant; before the fix it tracks container height, after it must not.
- **3.7 / 3.8** — for each container assert `scrollHeight > clientHeight` implies the fade is
  present; screenshot-diff to confirm the last visible line fades rather than hard-clips.
- **3.9** — before/after screenshot at identical window size (see the task note).

---

### Phase 4 — Number formatting and unit truth

**Implementer:** Gameplay/UI Programmer · **Independent review:** Modern Wargame Expert

| # | Task | File:line | Effort |
|---|---|---|---|
| 4.1 | Finding 6a — **`fmtK` has no M-scale branch**, so 1,211,000 displaced renders `1211k`. Add it | `formatters.ts:125-128`; surfaces at `WarSummaryContent.tsx:245` | XS |
| 4.2 | Finding 6b — the same screen prints `Killed 5k / Wounded 18k` and `4,755 killed / 17,767 wounded`. One formatter for both sections | `WarSummaryContent.tsx:196,200,234-235` | XS |
| 4.3 | Finding 6c — friendly casualties render through raw `String(...)`, a third style with no separator. Route through `formatPersonnel`/`fmtK` | `TurnAftermathModal.tsx:492`, `TurnAftermathRecordsPanel.tsx:186` | XS |
| 4.4 | Finding 6d — two components inline-duplicate `>=1000 ? toFixed(1)+'k'`, identical to the exported `formatPersonnel` they do not import. Import it | `BrigadeRow.tsx:153`, `SettlementDetailContent.tsx:921` | XS |

**Voice rule 4 constraint (canon-adjacent):** round to what a briefing officer would say **except**
where canon forbids rounding to avoid minimising a cost. Check `SENSITIVE_HISTORY_DESIGN_GATE.md`
before rounding anything cost/casualty-adjacent. Finding 19b is the worked example — see §7.

**Verification.** Unit-test `fmtK` across the scale boundaries (999 / 1,000 / 999,999 / 1,000,000 /
1,211,000) — 4.1 exists because nobody had ever passed it a seven-digit number. Then assert on one
rendered frame that the **same** underlying number is not printed in two styles: `WarSummaryContent`'s
Overview tab reproduces 6a, 6b and finding 25 together, so it is the single frame that proves all of
them. `npm.cmd run test:vitest -- tests/ui` · `npm.cmd run typecheck`.

**This phase must not change any value.** If a formatter change alters a displayed magnitude rather
than its presentation, stop — that is a data question, not a formatting one.

---

### Phase 5 — Remaining located component copy

**Implementer:** UI/UX Developer · **Independent review:** Narrative Designer

| # | Task | File:line | Effort |
|---|---|---|---|
| 5.1 | Finding 11 (label half) — `Cost Signal: rupture` renders a raw engine enum via `.toString()`. Reuse the existing `formatFindingSeverity` (`WarCostSummary.tsx:70-76`, keys at `messages.en.ts:4210-4212`); add the missing `warCost.findingSeverity.none` | `CinematicVerdict.tsx:114` | S |
| 5.2 | Finding 18a — `RBIH` is canonical `RBiH` destroyed by a CSS `uppercase` class, not a bad string. Remove the transform on this span only | `DaytonNegotiationModal.tsx:361` | XS |
| 5.3 | Finding 13a — the strikethrough price has its explanation only in a hover `title`, invisible at a glance. Add a visible "locked" sub-label | `DaytonInstitutionalDimensions.tsx:184-185,197,200` | XS |
| 5.4 | Finding 10d — the corps card shows the same density twice under two labels and exposes `SUBSEGMENTS: 1`. Show once; gate `sub_segments` on `> 1` | `SectorsSection.tsx:412-414,417,440-442` | XS |
| 5.5 | Finding 5 (component half) — merge the stacked `Unreported / Enemy picture unconfirmed` pair into one sentence, and give `No staff report` a de-emphasised token (italic / lower opacity / **no `tabular-nums`**) so it never carries a number's visual weight | `SectorsSection.tsx:159-162` | S |
| 5.6 | Finding 20 (component half) — drop `formatTenure`'s month branch; weeks throughout | `officerCharacter.ts:211-215` | S |

**5.4 and 5.5 are the same file: one commit, two distinct diffs.**

**Verification.** 5.1: assert no player-facing string equals a raw engine enum — render every
`costEmphasis.severity` value including the `none` key added here, and assert each resolves to a
label present in `messages.en.ts`. 5.2: assert the rendered text is `RBiH`, not `RBIH` — a
`textContent` assertion, since the string was always correct and only the CSS transform was wrong.
5.3: assert the locked price carries a visible sub-label, not only a `title` attribute (a hover-only
explanation is invisible in a screenshot and to a keyboard user). 5.4: assert the density figure
appears exactly once per corps card and that `sub_segments` is absent when it equals 1. 5.6: assert
no tenure string contains "mo" or "month". `npm.cmd run test:vitest -- tests/ui` ·
`npm.cmd run typecheck`.

---

### Phase 6 — Integrated proof and closeout

**Implementer:** QA Engineer · **Independent review:** Process QA + Reports Custodian

- [ ] **Close the finding-1 coverage gap.** `tools/ui/verify_toolbar_fit.mjs` currently reports
      **PARTIAL** — it exercises only the chips present in the one tracked save it loads. Re-run
      with `--save` pointing at a save where **both** state-dependent chips (RESERVE and REVIEWS) are
      simultaneously live. A save without them passes every width trivially, which is not the same
      as passing. Record FULL or record why it remains PARTIAL.
- [ ] Re-capture the audit's surfaces at **1920×1080, 1366×768, and 3440×1440** (the parent plan's
      Phase 5 resolutions) and confirm each discharged finding by image, not by diff.
- [ ] Confirm **zero simulation drift**: baseline artifacts, fingerprints and calibration hashes are
      byte-identical to the pre-plan HEAD. A changed hash fails this phase.
- [ ] Produce the **bug/friction split table** required by roadmap §12 (*"bugs and friction remain
      separately reported"*) — friction discharged here, bugs pre-seeded to R8, neither merged.
- [ ] Create `docs/40_reports/implemented/20260905_R7_PRESENTATION_ENGLISH_READABILITY.md`.
- [ ] Update roadmap, command board, ledger, knowledge ledger, and napkin together.

**Global verification barriers (roadmap §11) — all must pass before this plan closes:**

```powershell
npm.cmd run typecheck
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run test:vitest
npm.cmd run qa:player-experience
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
npm.cmd run desktop:release:check
node tools/ui/verify_toolbar_fit.mjs
git diff --check
```

**Gate the whole `tests/ui` directory, not the files you touched.** A focused suite is a
false-green at the UI boundary — this is a recorded project lesson, not a preference.

---

## 6. Determinism and Save-Schema Gates

- No `Math.random()`, `Date.now()`, or wall-clock value enters any changed file — including comments.
- No persisted-state field is written, renamed, or migrated. This plan reads state and renders it.
- Faction iteration stays in canonical `RBiH`, `RS`, `HRHB` order.
- The new municipality-name map (2.3) is built deterministically from the committed geojson at load,
  by the same mechanism as the existing OSID map. It is a lookup, not derived data, and **no
  pipeline output changes**.
- **Byte-neutrality is the acceptance test for the whole plan**: two long scenarios before and after
  must produce identical hashes.

## 7. UI and Player-Truth Gates

- No fix may make a false statement true-looking. Where a value is genuinely unknown, the surface
  says `No staff report` — it does not invent a number.
- No fix may hide a real cost. **Finding 19b is closed as working-as-designed:**
  `SENSITIVE_HISTORY_DESIGN_GATE.md:143` states verbatim *"It does not round numbers to make the
  decision look small."* The `−4.04 international standing` precision is **canon-required**. Do not
  route it as a defect and do not round it.
- Real people's names are never shortened, softened, or truncated for scan-friendliness. Fix the
  container; never the name.
- Every rendered acronym, name, and label must survive CSS `text-transform` — check for a transform
  before assuming a display defect is a string defect (finding 18a is the worked example).

## 8. Historical and Sensitive-History Gates

- **Historian sign-off is mandatory on Phase 2.** Display names are historical identity content;
  `Medojevići`, `Svrake`, `Čajniče` must match the settlement source, not a transliteration.
- Diacritics come from `settlement_name` ground truth (measured: 319 of 744 rows carry one, and
  every scored OSID resolves). **No heuristic restoration.**
- The `_N` suffix is a derivation artifact disambiguating 1990-census sub-parts, **not** a "second
  battle" ordinal. Stripping it is a correction, not a loss of meaning — measured 0 collisions
  across all 712 scored OSIDs.
- Canon Compliance Reviewer signs Phase 1 items 19a and 23 before merge.

## 9. Routing of everything this plan does NOT do

The frozen audit has 29 findings. This plan discharges the located English/presentation half. The
rest has a destination, and every destination is named. **Nothing is left as "considered".**

### 9.1 The destination rule (settled Phase 1; do not re-argue)

First YES wins:

1. Is it English text the player reads — wording, a name, a label, a number's formatting, or text
   failing to render legibly? → **this plan (R7 amendment).**
2. Else, does the product state something false, contradictory, or blank where a value belongs, or
   does one control obstruct another? → **Bug**, pre-seeded into R8's findings register.
3. Else (pixels only, nothing false) → **post-1.0 backlog.**

### 9.2 Routed to R8's pre-seeded finding register

The register lives in **Phase 3 of
[2026-07-31-full-campaign-electron-validation-plan.md](2026-07-31-full-campaign-electron-validation-plan.md)**,
not in a new file. **R8 remains WAITING ON R7; the register is inert until R8 opens.**

| Register ID | Finding | Why it is a bug, not text |
|---|---|---|
| B1 | 10b — `intel_confidence` dead; FORCE BALANCE permanently REDACTED. **Measured display-only — D1 covers it; final, in this register** (§9.6) | a blank where a value belongs |
| B2 | 10a — `sector_combat_ratings[sid]` absent; blank OFFENSIVE POWER plus a sentence in a number slot. **Measured ENDGAME-ONLY — 7/7 mid-war snapshots in perfect parity, 0 missing; 63/63 missing at turn 188. D1 covers it; final** (§9.6) | same |
| B3 | 8a — `generateTacticalGroupName` non-injective at ordinal ≥ 2 | two distinct sectors given one identity |
| B4 | `army_reserve_system.ts:716,755` bakes an operation name into a sentence that reaches the player raw | sim-side writer; forbidden surface |
| B5 | 8b — two Commander Replacement cards claim the same consequence | contradictory |
| B6 | 15 — cross-OSID marker collision around the Sarajevo ring | **one control obstructs another** (markers are click targets) |
| B7 | 8d — review-before-advance lists the same two decisions twice | contradictory |
| B8 | 8f — two objective cards share one hardcoded CTA | states a false "next lever" for one of them |
| B9 | **Not an audit finding** — surfaced by B2's measurement. Near war-end, something rebuilds `corps_front_sectors` back to 63 later in the same turn **without a paired rating recompute**; that asymmetry, not the wipe, leaves the final state inconsistent. Rebuild site **not yet identified** (§9.6) | an engine path that leaves two paired maps disagreeing |

**B6 is priced L and is not a `className` pass.** `buildFormationsGeoJSON.ts:90-115` anchors every
marker at its own OSID centroid with no awareness of any other OSID's marker; there is no
zoom-dependent declutter and no cross-OSID screen-space collision check anywhere in the render path.
A real fix is a post-projection collision-avoidance or clustering pass — multi-day,
**graphics-programmer**, with real regression risk to marker hit-testing
(`MapContainer.tsx:2004-2025`). It is recorded so R8 can weigh it, and it is an explicit candidate
for R8 to prove *outside the 1.0 definition of done* under roadmap §12 rather than to fix.

### 9.3 Closing with NO code — do not schedule an implementer

| Finding | Disposition |
|---|---|
| 19b — the `−4.04 international standing` precision | **Working as designed.** `SENSITIVE_HISTORY_DESIGN_GATE.md:143`, verbatim: *"It does not round numbers to make the decision look small."* Canon **requires** this precision. Not a defect; do not route it as one and do not round it. |
| 27 — HRHB wall map washed out | All three plates composite through the same `WarroomScenePlate` with no faction-conditional sizing, cropping or filter. The difference is in the generated `.webp` content. **No code fix exists**; the owner generates all art externally. Post-1.0 backlog row. |
| 8e — decorate-a-unit identical copy and effects | **One authored template stamped over N real formations** (`war_1993.json:8172-8194`, cloned verbatim by `src/desktop/decorate_unit_contract.cjs`, whose own comment confirms this is deliberate). Neither a duplicate-render bug nor two coincidentally-identical entities — a **content-authoring gap**. It belongs to neither this plan nor R8's register as a code item; it routes to Narrative Designer / Game Designer. Post-1.0 backlog row. |

### 9.4 Routed to the post-1.0 backlog

Recorded in `MASTER_ROADMAP.md` §10's backlog table **with their key lists, so nobody re-greps
them**: the four-formatter consolidation, the full turns→weeks sweep, 8e's per-candidate decorate
content, 27's art regeneration, and the `PRESIDENTIAL_DESK_BACKGROUND` dead export.

### 9.5 STILL HELD — three items, each with a named owner and ONE unblocking query

**These are findings, not shrugs.** The 2026-09-05 screenshot pass closed seven of the nine items
the first round left open; these three survived it, and each carries exhaustive negative evidence
rather than an absence of effort. None blocks the located work above. **None may be implemented by
guessing.**

| ID | What is unresolved | Owner | The ONE unblocking query |
|---|---|---|---|
| 14 | Left COMMAND rail clips the first list item's title. All four candidate screenshots checked; none reproduces it. `OOBSidebar.tsx` re-read in full: **grep for `sticky` returns zero hits**, and the COMMAND header (`:319-321`) is a normal `shrink-0` flex sibling above the scroll region (`:324-329`), not a positioned element that could sit on top of content below it. **The mechanism this finding requires does not exist in that file.** | UI/UX Developer | A live interactive session, or the original auditor's click-path. More source-reading and more static screenshots will not advance it — both are exhausted. |
| 13b | `Visit the front ~~10~~ CA`. Every component rendering the front-visit CA cost was read: `DeskAuthorityHeader.tsx:179-197` and `FrontVisitSection.tsx:154-166` use muted colour / `cursor-not-allowed` only, **no `line-through`**; `DirectiveCard.tsx`'s front-visit branch has no cost strikethrough at all. The only cost-lock `line-through` in the tree is `DaytonInstitutionalDimensions.tsx:197` — which is finding 13a, already scheduled at task 5.3. Every save in the evidence set shows **100/100 Command Authority**, so no capture can reach an unaffordable state. | Modern Wargame Expert | A save with CA < 10 on the desk, or the original audit capture if one exists outside `tmp_gui_observation/`. Absent either, close it as "already fixed, or auditor shorthand for the muted/disabled styling". |
| 22b | Stray `×` glyph beside the Army HQ date. No literal in `ArmyHQModal.tsx:405-426` or anywhere in `army_hq/`. **Probably not a string at all** — likely a close-icon element or a font-fallback artifact. | Narrative Designer (hands off to UI/UX if it proves to be an element) | Is it a DOM element or a rendered glyph? One devtools inspection answers it. |

**Disposition rule:** when a HELD item is located, it re-enters this plan **only if** the §9.1
decision rule sends it here. If it is a bug it pre-seeds to R8; if it is polish it goes to the
post-1.0 backlog. Locating a finding does not by itself earn it a place in this plan.

### 9.6 D1's reach over engine defects the audit never saw — ASKED, ANSWERED, AND RULED

**The question that was raised.** Owner decision D1 (2026-09-04) said HOLD FOR R8: no unscheduled
defect repair, P1/P2 bugs pre-seed to R8. The panel then surfaced **four engine defects that are not
among the 29 audited findings at all** (B1–B4). D1 was made about the audit's own bugs; it was not
self-evident that it reached defects that had never been in front of the owner. The record of what
was asked is kept here because the same question will recur the next time a panel finds something
the audit missed.

**The part that was the integrator's to rule.** D1 governs **scheduling**, and its logic — do not
open unscheduled repair work while R7 is the live lane — applies as well to a defect discovered on
2026-09-05 as to one discovered on 2026-09-03. **For a defect whose only consequence is
player-facing presentation, D1 covers it.** That disposed of **B3** (a display-name collision in a
pure label field) and **B4** (a string leak into an evidence row) immediately. Both are recorded in
the register; neither is touched.

**The part that was not.** B1 and B2 were not yet known to be presentation-only. The roadmap carries
a standing owner order from 2026-09-01 — *"engine health is sacrosanct… engine-health defects are
fixed before tuning"* — and that order and D1 point opposite ways for a defect that reaches
simulation behaviour. A standing order about what the engine *is* outranks a scheduling decision
about UI repair. So the recommendation was **one bounded read-only query per defect** — a grep and a
read, changing no code, breaching D1 in neither direction — and the call was surfaced to the owner
rather than made here.

**Both queries have now been run. Nothing was changed to run them.**

#### B1 — MEASURED DISPLAY-ONLY. D1 covers it. Closed; returns to the owner for nothing.

Exhaustive reader list for `CorpsFrontSector.intel_confidence`, **all under `src/ui/`**:
`CorpsFrontPanel.tsx:405-407,626` · `SectorsSection.tsx:152,157-158` · `SituationTab.tsx:487` ·
`GameStateAdapter.ts:2578`. **No bot, AI, or targeting path branches on it.** B1 therefore sits with
B3 and B4: recorded in the R8 register, not repaired now, and not an owner decision.

**But record what a future fix actually means, because the blank panel understates it.** A separate
and fully load-bearing intel system exists — `state.military.sector_intel[sectorId][].confidence`,
computed every turn at `sector_intel.ts:91-129` — and **it does gate simulation behaviour**:
`bot_corps_directives.ts:58-59,286` (`INTEL_GATE_LAUNCH_THRESHOLD`, default `0.30`, gates whether a
corps may launch an operation at all) · `combat_predictor.ts:82` ·
`sector_offensive.ts:716,1105-1106` · `commander/{briefing,belief,decide,emit}.ts`.

**The UI is reading a dead twin of a live system.** Whoever eventually closes B1 is not filling in a
blank label — they are wiring a dead field to a load-bearing one, and the plan's existing caution
applies directly: `sector_intel` is the structure already documented as corrupted by per-turn
sector-id churn. That work is R8's to schedule and is **not** a UI patch.

#### B2 — MEASURED ENDGAME-ONLY. D1 covers it. Closed; no engine repair scheduled.

`sector_combat_ratings` is **not** display-only in the source: `army_hq_gathering.ts:269,340-360`
(`computeSectorThreatAvg`) feeds `CorpsAssessment.sector_threat_avg`, which feeds
`computeOpportunityScore` (`:521-522`) and the skip test at `:875`; `CorpsAssessment` is consumed by
`bot_corps_directives`, `bot_corps_stance`, `bot_strategy`, `army_co_lifecycle`,
`army_order_interpretation`, `operation_preparation`, and the commander modules. That is why it was
measured rather than assumed.

**The measurement (2026-09-05): ZERO mid-war occurrences.** Seven mid-war full-state snapshots
(turns 41, 44, 60 ×3, 70, 80) show `corps_front_sectors` and `sector_combat_ratings` in **perfect
parity every time** — 79/79, 79/79, 89/89 ×3, 83/83, 89/89. **0 missing, 7/7.** At turn 188 of the
canonical run `apr1992_definitive_188w__46834a3b41033bff__w188_n388`: 63 active sectors, ratings map
empty, **63/63 missing**. The absence is an endgame artifact and does not occur in ordinary play.

**It is explained by code, not merely correlated.** Every writer of `corps_front_sectors`' key set —
the `partition-corps-front-sectors` step and all four entry points in
`final_sector_truth_reconciliation.ts` — calls `computeSectorCombatRatings` immediately afterward,
in the same function, against the just-written map, and that function emits one entry per key
unconditionally, **even for 0-brigade sectors** (`sector_combat_rating.ts:81-98`). The two maps are
always rebuilt as a pair. The one standalone mutator outside the pairing, `bot_corps_ai.ts:431`
(`delete corps_front_sectors[sid]` for 0-edge ghosts), only ever **removes** keys — it can leave a
stale extra rating, never a missing one — and is resynced the same turn by
`recompute-sector-combat-ratings` (`war_phases.ts:2614`). Exhaustive grep found no path that adds a
sector key without the pairing.

**CORRECTION — this plan previously stated the consequence wrongly.** The earlier text here said an
absent sector is excluded from both the numerator and the denominator, silently skewing the average.
**That is the *partial*-absence case, and it does not occur.** Absence is all-or-nothing: with the
map empty, `computeSectorThreatAvg`'s loop never executes, `count === 0`, and **every corps takes
the flat `0.5` fallback** (`army_hq_gathering.ts:341-360`). Because `0.5 > 0`, the
`sector_threat_avg <= 0` skip test at `:875` **never fires**. The real consequence is narrower than
described: at the final turn only, LOW/HIGH_THREAT bonus logic runs on a uniform `0.5` instead of a
real signal.

**Disposition: B2 joins B1 as D1-covered and FINAL in the R8 register.** It does not return to the
owner and no engine repair is scheduled. Display-only in practice, on measured evidence rather than
on a reading of the source.

**Evidence limitation, recorded so it is not overstated later.** The seven snapshots are
**opportunistic saves from different playtest configurations**, not a systematic per-turn trace of
the canonical scenario. A fresh instrumented run was offered and **deliberately declined**: seven
clean mid-war samples plus a code-level pairing argument is sufficient to *route* a defect nobody is
repairing, and a fresh run is not justified for one. If B2 is ever scheduled for repair, that run
becomes worth doing first.

#### B9 — the endgame rebuild asymmetry (new; nobody had named it)

The measurement surfaced a second half to the endgame wipe. The
`final_sector_truth_reconciliation.ts` guard clauses fire when sectors momentarily go empty near
war-end — and then **something rebuilds `corps_front_sectors` back to 63 later in the same turn
WITHOUT a paired rating recompute.** That asymmetry, not the wipe itself, is what leaves the final
state inconsistent.

**Routed to the R8 register as B9, not to the post-1.0 backlog.** The backlog is for *"optional
improvements outside the 1.0 outcome"*; an inconsistent state at war's end is not optional — the
endgame is what every campaign reaches, and R8 is the lane that plays campaigns to Dayton, so R8 is
where it will actually be encountered. **It is recorded, not scheduled.** Its only measured
consequence is the same bounded one as B2 — final-turn corps assessments running on a uniform `0.5`
— so it does not trigger the §9.6 escalation rule as it stands. **If anyone finds a mid-war
manifestation, it does, and the call returns to the owner.**

**First step for whoever picks it up: the rebuild site was not identified.** Find what re-populates
`corps_front_sectors` after the guard clause fires, in the same turn, without calling
`computeSectorCombatRatings`. Everything else about this defect is downstream of that answer.

### 9.7 Traceability of the D1 carve-out

D1 permits a bug found during R7 Phase 5 to be *a pure display-layer fix* to ride this amendment
**as a readability fix, recorded as such**. The R8 register carries a
`Discharged early via R7 amendment? Y/N + amendment task id` column for exactly this. **Any task
added to this plan under that carve-out must set that column in the same change** — otherwise the
carve-out becomes a hole in the register and a bug disappears from R8's gate without ever having
been fixed under R8's eyes. As of this writing no register row is discharged early; every one reads
`N`.

## 10. Roadmap and Ledger Closeout

**§13 Orchestrator Closeout Contract** — R7 closes with every field supplied:

```text
Workstream: R7 (presentation/English-readability amendment)
Plan: docs/plans/2026-09-05-r7-presentation-and-english-readability-amendment-plan.md
Base and final commit:
Tasks completed:
Focused verification:
Long-run/package evidence:
Behavior/baseline disposition:   <- must state BYTE-IDENTICAL
Historical/source review:        <- Historian sign-off on Phase 2 display names
Bug findings:                    <- SEPARATE field; pre-seeded to R8, not fixed here
Friction findings:               <- SEPARATE field; discharged by this plan
Ledger/canon/docs propagation:
Remaining dependency:
Next workstream: R8
```

**Propagation checklist:** `MASTER_ROADMAP.md` R7 row + Snapshot + §10 post-1.0 backlog rows ·
`COMMAND_BOARD.md` row 7 · parent R7 plan status paragraph · **R8's pre-seeded register in
[2026-07-31-full-campaign-electron-validation-plan.md](2026-07-31-full-campaign-electron-validation-plan.md)
Phase 3** (set the `Discharged early?` column if the D1 carve-out is used — §9.7) ·
`docs/PROJECT_LEDGER.md` · `docs/PROJECT_LEDGER_KNOWLEDGE.md` · `.claude/napkin.md` ·
`docs/40_reports/README.md` §1A.

**Bug and friction stay separate fields, never one merged list.** Roadmap §12 requires that *"bugs
and friction remain separately reported"*. This plan discharges **friction**; the register in R8's
plan holds **bugs**. Do not produce a combined findings table at closeout — the closeout block above
has two distinct fields for exactly this reason.

## 11. Copy-Ready Prompt

> Execute `docs/plans/2026-09-05-r7-presentation-and-english-readability-amendment-plan.md`
> task-by-task using the `executing-plans` skill. This is an R7 amendment: renderer-only, display
> layer only. Read the panel record at
> `docs/40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md` for the `file.ts:line`
> citation behind every task. Respect the per-phase file ownership table in §4 — one file has one
> owning phase; raise anything outside your phase rather than fixing it. Do not touch `src/sim/**`,
> `src/state/**`, scenarios, calibration, or canon. Do not fix bugs: every bug in this audit is
> pre-seeded to R8 by owner decision. The acceptance test for the whole plan is byte-neutrality —
> if a baseline hash moves, you edited something you should not have. Gate the whole `tests/ui`
> directory, never a focused subset. Implementer and reviewer seats are named per phase and must be
> different people.
