# Showcase Screenshot GUI Audit — Tier-1 Specialist Reports (Panel Record)

**Date:** 2026-09-05
**Source artifact (FROZEN, not amended):** `docs/40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md` — 29 findings from capturing the publisher pitch at 1920×1080.
**Panel shape:** four Tier-1 specialists with disjoint finding ownership, one named integrator (Product Manager) for reconciliation. Implementer ≠ reviewer.
**Evidence set:** `tmp_gui_observation/fresh_shots/{rbih,rs,hrhb}/`, `tmp_gui_observation/verbs/`, `tmp_gui_observation/endgame1080/` (untracked, present on the authoring machine).

## Ownership map

| Seat | Class | Findings |
|---|---|---|
| UI/UX Developer | layout / overflow / geometry / scene layering | 1 (re-verify), 7, 12, 14, 15, 16, 17, 21, 24, 27 |
| Gameplay/UI Programmer | display-name leakage (P1) | 3, 9 |
| Modern Wargame Expert | data truth / numbers / contradictions | 2, 6, 8, 10, 13, 25 |
| Narrative Designer | voice / copy / vocabulary | 4, 5, 11, 18, 19, 20, 22, 23, 26, 28, 29 |

## Settled inputs from the owner (2026-09-04)

- **D1 — bug timing: HOLD FOR R8.** P1/P2 bugs whose owning lane is closed pre-seed into R8's findings register. No unscheduled defect repair authorized. Carve-out: a bug found during R7 Phase 5 to be a pure display-layer fix may ride the R7 amendment **as a readability fix, recorded as such**.
- **D2 — stale board: RESYNC IN THE SAME CHANGE.** `COMMAND_BOARD.md` updated alongside `MASTER_ROADMAP.md`; the seven recent PRs recorded as unscheduled work, no lane row's status changed.
- **Writer+reader hard gate.** Every data-truth item names the field's WRITER and the SURFACE THAT READS IT with `file.ts:line`. An item that cannot name both is HELD, not guessed at.

## Two corrections to the frozen audit, established by this panel

1. **Finding 2 is NOT EH-3 `stranded_status`.** The audit says so and the orchestrator's brief repeated it. The field is `state.displacement.sustainability_state[munId].collapsed`, a municipality-level monotonic economic-collapse ratchet (`src/state/sustainability.ts:332-344`). Unrelated to formation-level `stranded_status` and to the reconstitution-Path-C load-bearing constraint. The label fix is unchanged; the reasoning and the ownership are not.
2. **Finding 10's `FORCE BALANCE: REDACTED` is not fog-of-war as designed.** `CorpsFrontSector.intel_confidence` has no writer anywhere in `src/`, so the field is dead and every OG reads REDACTED unconditionally, forever.

---

# 1. UI/UX Developer — layout / geometry

Owned: 1 (re-verify), 7, 12, 14, 15, 16, 17, 21, 24, 27.

## Summary table

| ID | Reproduces? | Confidence | Root cause class | Effort | Risk |
|---|---|---|---|---|---|
| 1 | FIXED (PR #491), residual risk noted | High | (verified fix, not re-broken) | — | none |
| 7a (AdvanceTurnModal metric labels) | Located | High | rigid equal-fraction grid budget | S | none |
| 7b (DirectiveCard button overlap) | Located | High | unclamped `whitespace-nowrap` overflow in a grid cell | S | none |
| 7c (Decision Room lens chip collision) | Located | High | shared fixed min-width across variable-content chips | S | none |
| 7d (HRHB reserve card cutoff, Codex mid-citation) | Not located | — | — | — | — |
| 12 | Located | High | acronym without `whitespace-nowrap`/`shrink-0` in a `justify-between` row | S | none |
| 14 | Not confidently located | Low | candidate area named, not confirmed | — | — |
| 15 | Not located | — | — | — | — |
| 16 | Located | Medium-High | fixed low-aspect SVG viewBox inside a full-width block | S | none |
| 17 | Not confidently located | Low | candidate file named, not confirmed | — | — |
| 21 | Located | High | in-flow status block styled identically to the header; flat 8s timeout | S | none |
| 24 | Partially located | Medium | art-vs-DOM-overlay coexistence identified, occluder unconfirmed | — | — |
| 27 | Located (non-fixable by layout) | High | art asset content difference, not a layout defect | — | none — routes to art |

## Finding 1 — Tactical toolbar collision (re-verify)

**Still reproduces?** NO — confirmed FIXED. `tools/ui/verify_toolbar_fit.mjs` is tracked; `ui_map.md` records the fix landed 2026-09-03 with geometric (not `scrollWidth`) verification.

**Residual risk:** the verifier declares **PARTIAL coverage** — it exercises only the chips present in the ONE tracked save it loads (`docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/final-autosave.json`). A save where both state-dependent chips (RESERVE and REVIEWS) are simultaneously present, or a longer localized string, is not proven. Coverage gap, not a regression.

**Verification:** `node tools/ui/verify_toolbar_fit.mjs` — rerun with `--save` pointing at a save where both chips are live to close the gap. `scrollWidth === clientWidth` CANNOT see this class (start-side overflow under `justify-end`); the tracked verifier already does the correct box-intersection check.

## Finding 7 — Truncation/overflow cluster (three of four confirmed)

### 7b. DirectiveCard button text renders over the adjacent button
**File:** `src/ui/map/components/army_hq/DirectiveCard.tsx:829-874`
**Root cause:** the elite-deploy action row is a 3-column grid (`grid-cols-1 sm:grid-cols-3`, :829); each button (:830-874) carries `h-7 min-w-0 whitespace-nowrap` with **no `overflow-hidden`/`truncate`**. `min-w-0` lets the box shrink below the text's natural width in its `1fr` cell; `whitespace-nowrap` then forces one line that overflows and paints on top of the neighbouring cell — an overlap, not a soft wrap, because nothing clips it.
**Fix:** add `truncate` to the three button `className`s at :835, :851, :862, :871; add the missing `title` at :867 (the others have one at :834, :850, :861).
**Verification:** Playwright — assert no two sibling buttons' `getBoundingClientRect()` intersect. Box-intersection, not `scrollWidth`.
**Effort:** S. **Risk:** none.

### 7a. AdvanceTurnModal metric-cell labels truncate with room to spare
**File:** `src/ui/map/components/warroom/AdvanceTurnModal.tsx:86-95` (`MetricCell`), grid at :413.
**Root cause:** `grid-cols-4` gives each cell an equal `1fr` share regardless of label length. The row has spare width in aggregate but it is not allocated to the cell that needs it. `truncate` (:89) is unconditional and there is no `title` fallback, so the clipped word is unrecoverable.
**Fix:** replace `truncate` with `line-clamp-2 leading-tight` so the label wraps into the vertical slack that already exists; add `title={label}` regardless. No grid-template change.
**Effort:** S. **Risk:** none.

### 7c. Decision Room "ALL" lens chip collides with its own count badge
**File:** `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx:74-114` (`LensButton`)
**Root cause:** every chip shares one `min-w-[5.75rem]` (:90) sized for an average chip, but the priority-count badge (:102-114) is content-driven and widest for the `all` lens (it sums every category). The row is `overflow-x-auto` (:617) so chips are not stretched; label and badge fight for ~92px inside one `justify-between` row with only `gap-2`.
**Fix:** widen `min-w` for the `all` lens specifically, or drop the redundant aggregate digits already shown above. One line either way.
**Effort:** S. **Risk:** none.

### 7d. HRHB reserve card cutoff / Codex mid-citation — **UNLOCATED**
Both read as long text in a scrollable region with no visible scroll affordance, consistent with the `overflow-y-auto` pattern (e.g. `president-desk-scroll-region`, `PresidentDeskShell.tsx:109`), but no citation for the specific components. Reported UNLOCATED rather than guessing.

**Grouping:** 7a, 7b, 7c are three independent one-line `className` fixes in three files — three separate commits, not one.

## Finding 12 — Vertical letter-stacking (VRS → V/R/S; ARBiH → AR/BiH)

**File:** `src/ui/map/components/SituationTab.tsx:341` (identical pattern at :278)
**Root cause:** `MILITARY_FACTION_LABELS` (`src/ui/map/utils/playerSafeText.ts:4-8`) gives `RS: 'VRS'`, `RBiH: 'ARBiH'`, `HRHB: 'HVO'`. These single-word acronyms render as `<span className={FACTION_COLORS[playerFaction]}>{playerMilitaryLabel}</span>` inside `<div className="flex items-center justify-between gap-2">` (:340) beside a variable-length casualty string. Neither span carries `whitespace-nowrap` or `shrink-0`; under `justify-between` with default `flex-shrink: 1`, the label shrinks below its own content width and the unbroken word breaks letter-by-letter.
**Fix:** add `whitespace-nowrap shrink-0` to the label spans at :278 and :341. Same mechanism as the toolbar lesson, smaller scale.
**Verification:** render at real sidebar widths with the longest casualty-breakdown string; assert the label span's `scrollHeight` equals one line's height. `scrollWidth === clientWidth` on the outer container would NOT catch this — it is inter-sibling shrink inside a flex row.
**Effort:** S. **Risk:** none.

## Finding 14 — Left COMMAND rail clipping — **UNLOCATED**
Traced `src/ui/map/components/panelRail.ts` (`LEFT_DETAIL_PANEL_STYLE`, `LEFT_SIDEBAR_WIDTH = '15.5rem'`) and `CorpsFrontPanel.tsx:501-583`; found no sticky-header structure that would clip a first list item's title. Do not schedule an implementer without a location pass.

## Finding 15 — Map counter clutter (Sarajevo ring) — **UNLOCATED**
Did not reach the deck.gl/MapLibre counter layers in depth. `buildCounterAwareCameraPadding` (`MapContainer.tsx:4311`) is camera framing, not stack declutter, so it is not the fix site. **Flagged as possibly not S-effort once located** — likely graphics-programmer / map-geometry territory.

## Finding 16 — Records territory chart layout
**File:** `src/ui/map/components/TerritoryOverTimeChart.tsx:109-118`, mounted at `army_hq/RecordsContent.tsx:161-163`
**Root cause:** the chart is an `<svg>` with a fixed low-aspect viewBox (`0 0 560 200`, 2.8:1, :55-59) rendered `w-full` with `max-h-[14rem]` and `preserveAspectRatio="xMidYMid meet"` (:118) inside an unconstrained full-width block. At real panel widths the box is far wider than the viewBox's ratio, so `meet` fits to the height-constrained dimension and centres, leaving large empty margins.
**Fix (smallest):** drop or raise `max-h-[14rem]` so the rendered aspect stays near 2.8:1. Alternative: widen `chartWidth` 560 → ~1400 keeping height 200 and recompute `xScale`/padding.
**Verification:** measure the rendered `<svg>` client rect against the drawn content's `getBBox()`; assert ratio ≥ ~0.85.
**Effort:** S. **Risk:** none.

## Finding 17 — Corps briefing bottom half empty — **UNLOCATED**
`ChiefOfStaffBriefing.tsx` is prose generation, ruled out. `CorpsFrontPanel.tsx` inspected; no corps-switcher row found.

## Finding 21 — Toast placement (Decision Room)
**File:** `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx:599-614` (render), `:483-490` (lifecycle)
**Root cause:** not a toast at all. `actionReceipt` (:599) is an in-flow `<div>` directly beneath the Decision Room header card (:584-597), reusing the **identical** styling (`border-panel-border/70 bg-[#10151d]/95`, :608), separated only by `mb-2`. Cleared by a flat `setTimeout(..., 8000)` (:488) with no manual dismiss. It reads as a permanent extension of the header. **No shared Toast/notification component exists anywhere in `src/ui`** — introducing one would be new-UI scope creep.
**Fix (no new pattern):** (a) distinct styling from the header card it sits under; (b) a small dismiss control following the existing `desk-close-overlay` pattern (`PresidentDeskShell.tsx:96-106`).
**Effort:** S. **Risk:** none.

## Finding 24 — Whiteboard date occluded — **PARTIALLY LOCATED**
Background art pipeline traced: `src/ui/warroom/assets/hq_{rbih,rs,hrhb}_{1991..1995}.webp` composited via `WarroomScenePlate` in `WarroomShellLayer.tsx:862`, with per-faction clickable-region JSON overlays containing **no whiteboard or date key** — confirmed by grep, so the whiteboard is painted into the background image, not a DOM element. Which DOM overlay occludes it (toolbar, `PresidentDeskShell`'s `aside`/`DeskPacket` at `right-3`, or `WarroomStatusBar`) is unconfirmed; the fix depends entirely on which.
**Incidental:** `PRESIDENTIAL_DESK_BACKGROUND` (`src/ui/map/data/presidentialDeskAssets.ts:1,28`) has **zero importers** in `src/ui` — possible dead code, flagged separately.

## Finding 27 — HRHB wall-map washed out — ROUTES OUT OF CODE
The three scene plates composite through the **same** `WarroomScenePlate` with the same CSS; there is no faction-conditional sizing, cropping or filter in `WarroomShellLayer.tsx`. The difference is in the generated image content. **No code fix available** — routes to the external art pipeline (owner generates all images externally).

## OUT OF SCOPE — considered and rejected
- No new shared Toast/notification component for 21 (design-system addition, forbidden).
- No grid-template rework for `MetricCell` (7a) — the "correct" `minmax()`/`auto` fix is structural; took the wrap fix instead.
- No `TerritoryOverTimeChart` rewrite to ResizeObserver-driven responsive charting (16).
- No art regeneration for 27.
- Did not investigate deck.gl counter-clustering in depth (15) — a real fix carries rendering-performance risk.

## Suggested commit sequence
1. `SituationTab.tsx` acronym wrap (12) — trivial, ship first.
2. `DirectiveCard.tsx` button overlap (7b).
3. `PresidentialDecisionRoomPanel.tsx` (7c + 21) — same file, **two distinct diffs in one commit**, not merged into one edit.
4. `AdvanceTurnModal.tsx` metric-cell wrap (7a).
5. `TerritoryOverTimeChart.tsx` aspect fix (16).
6. **Location pass required before scheduling 14, 15, 17, 24** — a screenshot-plus-devtools pass answers "which of several plausible components" in seconds; more source-reading does not.
7. Finding 27 → art backlog, not a commit.

---

# 2. Gameplay/UI Programmer — display-name leakage (P1, findings 3 & 9)

## (a) Producer map

**Root cause: four independent reimplementations of "humanize a slug", only one of which is correct.**

1. `src/ui/map/utils/playerSafeText.ts:30` `humanizeIdentifierLabel()` — replaces `_`/`:`/`-` with spaces and title-cases. **No diacritics. Does NOT strip a trailing `_N`** (title-cases it into a trailing " N"). Behind almost every leaked example. Consumers:
   - `getPlayerSafeSettlementName()` (:385) → `chronicle/generateChronicleEntries.ts:569,574` builds the Chronicle battle title. **Exact producer of "Battle of Petrovo 2", "Battle of medojevici/svrake/zvornik/dragoradi".** Takes only an OSID string; no name-map threaded in, though its caller `ChronicleOverlay.tsx:313` could pull `osidDisplayNames` from the store as ~30 other components already do.
   - `getPlayerSafeMunicipalityName()` (:393) → `FormationDetail.tsx:788` "Home municipality". **Exact producer of Finding 9**: seven lines above at :779, "Location:" uses the CORRECT path (`getOsidDisplayName`) and renders "Medojevići (Ilijaš)" with diacritics; :788 uses the naive path on the same id and renders "Ilijas" without. Same card, two code paths.
   - `getPlayerSafeOperationName()` (:281) → `GameStateAdapter.ts:1643` (`display_name`), `:3313` (`operation_display_name` on AAR records), `:3413` (active-ops summaries). Has its own branch stripping `_t<turn>` and a trailing `_<digits>`, so it does not by itself explain a visible trailing " 2".
2. `src/ui/map/utils/osidDisplayName.ts` — **the correct implementation already exists.** `buildOsidDisplayNameMap()` (:59) builds OSID → name from `settlement_name` (proper diacritics) + `mun1990_name`, strips the pipeline's `"(+N)"` merge annotation (:49), and skips the municipality suffix when it duplicates the base name (:51) — i.e. **already solves the "Bratunac Bratunac" doubling**. `getOsidDisplayName()` (:76) falls back to `humanizeOsid()` (:7) which **also correctly strips trailing `_N`** (:18). Populated once from `data/derived/operational/operational_settlements.geojson` at `MapContainer.tsx:1602` into Zustand `osidDisplayNames` (`gameStore.ts:108`), consumed by 30+ components. **Chronicle and the three GameStateAdapter operation-name sites are simply not wired to it.**
3. `src/sim/combat/tactical_group_naming.ts::humanizeToken()` (:30) — sim-side, TG/OG names. Strips the numeric suffix but no diacritics. **Engine code — flagged only, not touched.**

## (b) Existing lookup coverage (MEASURED)

- Joined all **712 scored OSIDs** in `operational_initial_master.json` against the 744-row geojson: **712/712 matched (100%), 0 unmatched.**
- Of 744 drawn rows, 319 `settlement_name`s contain a diacritic, 425 are genuinely plain-ASCII names. Diacritics are present wherever the real place name has one.
- **702 of 744 rows carry a `"(+N)"` merge annotation** that must be stripped for display. `buildOsidDisplayNameMap` already does; the Chronicle path does not.
- `mun1990_id → mun1990_name` is clean 1:1 across all 744 rows: **110 municipalities, 0 conflicts.** The geojson has no bare-municipality OSID key, so the "Home municipality" fix needs its own small derived map.

## (c) `_N` suffix separability (MEASURED)

- Stripping trailing `_<digits>` and title-casing, keyed by (municipality, stripped name): **712 distinct keys for 712 OSIDs — ZERO collisions.**
- The suffix is **not a "second battle" counter** — it is a derivation artifact disambiguating originally-distinct 1990-census sub-parts sharing a base name. `op:banovici:banovici_2` is really "Banovići (+5)"; the "2" appears nowhere in the real name. Corroborated by `humanizeOsid()` and `tactical_group_naming.ts::humanizeToken()` both independently stripping it already.
- "Op Bratunac Bratunac 2" doubling is NOT a suffix artifact: the municipal seat shares the municipality's name (Bratunac town in Bratunac municipality), a recurring pattern across ~110 municipalities. `buildOsidDisplayNameMap`'s existing dedup rule (:51) already handles it wherever used.

## (d) Bounded fix — display layer only

1. **Chronicle battle titles** — add an `osidNameMap` param to `generateChronicleEntries()` (`generateChronicleEntries.ts:542`), replace `getPlayerSafeSettlementName(battle.osid, ...)` (:569) with `getOsidDisplayName(battle.osid, osidNameMap)`, and at `ChronicleOverlay.tsx:313` add `const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);` and pass it. **1 new param, 1 call-site edit, 1 changed line. ~15 minutes.**
2. **Operation display names** (`GameStateAdapter.ts:1643, 3313, 3413`) — minimum fix without new plumbing: harden `getPlayerSafeOperationName`'s slug branch (`playerSafeText.ts:324-361`) to strip a trailing `_N` as `humanizeOsid` does, closing the suffix leak at ~7 call sites (~10 minutes). Full fix (diacritics) requires threading `osidNameMap` into GameStateAdapter's operation-building pass — half a day, because it needs objectives-array-vs-raw-name precedence worked out so authored catalog names are never misrouted.
3. **Formation card "Home municipality"** (`FormationDetail.tsx:788`) — replace the naive path with a new tiny `mun1990_id → mun1990_name` map built the same way from the same geojson (~10 lines). **~30 minutes.**
4. **"Op X Y" doubling** — once (2) consults the real objective OSID via the map, `buildOsidDisplayNameMap`'s existing dedup rule removes the doubling for free.

## (e) Verification plan

- **Enumerate, don't sample.** Run one long scenario; for every Chronicle entry, every `state.operations[]`/`operationHistory[]` record, and every formation's `location_osid`/`municipalityId`, run the CURRENT and FIXED humanizers over the same input and diff. Anything still matching `looksLikeRawPlayerFacingToken()` (`playerSafeText.ts:51` — a regex that already exists for exactly this failure class) is a real remaining leak.
- **Diacritic completeness:** every OSID appearing in `turnSummaries[].battles[]` or `operations[]` across a 188-week run must resolve via `osidDisplayNames`. The measured 100% coverage should make this zero-miss; any miss is itself a bug.
- **Collision regression test:** turn the 0/712 measurement into an executable invariant so a future OOB/OSID data change cannot silently reintroduce a collision.
- **Grep sweep** for remaining callers of the three `getPlayerSafe*` helpers after the fix.

## (f) FOLLOW-UP FINDING — a sim-side leak the display plan does NOT catch

`src/sim/combat/army_reserve_system.ts:716` and `:755` bake a literal template **inside `src/sim/`**:

```
bestDescription = `Op "${op.name}" (${...}) — elite deployment for offensive`;
```

Flow: `bestDescription` → `describeCorpsNeed()` (:208) → `request.why_needed` (`types.ts:685`) → `GameStateAdapter.ts:3958` **raw passthrough, zero player-safe processing** (the name is embedded mid-sentence, not in a name field, so not even the naive humanizer touches it). Reaches the player via Decision Room evidence rows.

**Consequence: fixes (2) and (4) above will NOT close this leak.** It is a distinct, sim-side bug — flagged, not planned, per the hard constraint.

**Authored catalog names do NOT share this path** — `def.name` goes straight through `spawnCorpsOperationFromOpportunity` → `buildCorpsOperation({name: def.name, ...})` with no humanize step. Confirmed clean, which removes the precedence hazard from fix (2).

**Still unlocated:** the construction site of the raw two-token "Bratunac Jezestica"-shaped name. Ruled out exhaustively (~30 files): `pickOperationName`'s three faction pools (all "Operacija X"), all `name:` entries in the three opportunity catalogs, `pre_planned_operations.ts`/`triggered_operations.ts`, `buildCommanderOperation`'s call site, `tactical_group_naming.ts`, and every literal `` `Op ${...}` ``/`'Op '` template in `src/ui` and `src/sim`.

## OUT OF SCOPE — considered and rejected
- The sector → Operational Group rename and OG auto-naming (2026-08-06 post-1.0 backlog) — confirmed a separate mechanism, not touched.
- Fixing `tactical_group_naming.ts`'s missing diacritics — `src/sim/`, flagged only.
- A general diacritic-restoration/transliteration heuristic — rejected; ground-truth names exist for 100% of scored OSIDs, guessing would be strictly worse and non-deterministic.
- Changing OSID/`sid` keys to drop `_N` — banned by `CLAUDE.md`, and unnecessary given zero measured collisions.

---

# 3. Modern Wargame Expert — data truth (findings 2, 6, 8, 10, 13, 25)

## Findings table

| ID | Verdict | Reproduces | WRITER | READER | Bounded fix | Risk | Effort |
|---|---|---|---|---|---|---|---|
| 2 | **FRICTION** (not the EH-3 field the brief named) | `SituationTab.tsx:301` | `src/state/sustainability.ts:334-344` (municipality-level, monotonic) | `SituationTab.tsx:301`, `WarSummaryContent.tsx:281` | Reword `situation.sustainmentCollapsed` to disclose it is a cumulative/permanent count, not a live severity band | none (i18n only) | XS |
| 6a | **BUG** | any surface with `fmtK` on ≥ 1,000,000 | `src/ui/map/utils/formatters.ts:125-128` (`fmtK`) | `WarSummaryContent.tsx:245` | Add an M-scale branch to `fmtK` | none | XS |
| 6b | FRICTION | `WarSummaryContent.tsx:196/200` vs `:234-235` | `casualtyLedger[faction].killed/.wounded` | same screen, `fmtK` vs `localizedInteger` | One formatter for both sections | none | XS |
| 6c | FRICTION | `TurnAftermathModal.tsx:492`, `TurnAftermathRecordsPanel.tsx:186` | `view.cost.friendlyMilitaryCasualties` (`turnAftermath.ts:60`) | raw `String(...)` — no separator, a third style | Route through `formatPersonnel`/`fmtK` | none | XS |
| 6d | FRICTION (hygiene) | `BrigadeRow.tsx:153`, `SettlementDetailContent.tsx:921` | n/a | inline-duplicated `>=1000 ? toFixed(1)+'k'` logic identical to the exported `formatPersonnel` (`formatters.ts:120-122`) they do not import | Import `formatPersonnel` | none | XS |
| 8a | **BUG** | corps briefing sector list | `src/sim/combat/tactical_group_naming.ts:79` | `src/ui/shared/playerFacingLabels.ts:36-46` → `CorpsFrontPanel.tsx:335,520` / `SectorsSection.tsx` | Number ordinals ≥ 2 distinctly | low — `display_name` is a pure label field | S, **but `src/sim/`** |
| 8b | **BUG** | Army HQ inbox | n/a (UI-layer) | `inboxItems.ts:186-193` `officerEventDedupeKey()` | Key on `current_commander_id` first for `replacement_suggested` | none | XS |
| 8c | FRICTION | `PresidentialAttentionPanel.tsx:137` vs `:168` | `armyReserveQueue.criticalCount` vs `reviewQueue.criticalCount` (two different domains) | same two lines | Qualify the labels per domain | none | XS |
| 8d/8e/8f | **HELD** | — | — | — | — | — | — |
| 10a | **BUG** | `CorpsFrontPanel.tsx` overview tab | `sector_combat_rating.ts:144-154` computes both powers symmetrically | `CorpsFrontPanel.tsx:369` (`displayOffensivePower`, **no fallback**), `:336` (`displayStrengthClass`, **no fallback**) vs `:370-376` (`displayDefensivePower`, **two-level fallback**) | Give offensive/strength the same fallback, or strip defensive's — the asymmetry IS the bug | none, presentational | S |
| 10b | **BUG, more severe than audited** | every sector, always | **no writer exists** | `CorpsFrontPanel.tsx:405-407,626-627` reads `sector.intel_confidence`, always `undefined` | Point the adapter at `state.military.sector_intel[sector_id].confidence` | needs the sector-id-churn owner's decision first | S |
| 10c | FRICTION | `CorpsFrontPanel.tsx:590` | `corpsFront.standardBrigadeBaseline` | same | Rewrite in staff voice | none | XS |
| 10d | FRICTION | `SectorsSection.tsx` corps card | `computeCurrentFrontDensity()` (:423-424) | rendered at :440-442 (called :602) **and again** at :412-414 under a different label | Show once; gate `sub_segments` on `> 1` (:417) | none | XS |
| 13a | FRICTION | Dayton modal | `getDialDeclarationCost` vs `capitalAvailable` (`DaytonInstitutionalDimensions.tsx:184-185`) | :197 applies `line-through`; explanation only in a hover `title` (:200), invisible at a glance | Add a visible "locked" sub-label | none | XS |
| 13b | **HELD** | — | — | — | — | — | — |
| 25 | FRICTION, flag harder than cosmetic | `WarSummaryContent.tsx:249` | `turnAftermath.ts:1037` | label key is literally `warSummary.label.netOsids` | Disclose the unit — it is an **OSID count** | none, i18n | XS |

## Evidence worth surfacing

**#2 — corrected from the brief.** Traced `SituationTab.tsx:301` → `operational_sitrep_views.ts:336` → `war_data_extractor.ts:617-647` (`extractSupply`) → `state.displacement.sustainability_state[munId].collapsed`, written at `src/state/sustainability.ts:332-344`. That function's own comment: `// Apply degradation (sustainability_score never increases)`. `collapsed = scoreAfter <= 0`, and **nothing anywhere resets it** — every `sustainability_score =` and `.collapsed = false` assignment in `src/` was grepped; there are none besides the monotonic-decrease line. This is a **municipality-level, permanent-once-triggered siege/economic-collapse ratchet** — a different subsystem from formation-level `stranded_status` (EH-3), and NOT gated by the reconstitution-Path-C constraint the brief cited. Real, intentional, historically defensible, and completely mislabelled as a live severity tier beside "critical"/"strained".

**#10b — the most consequential find.** `node tools/hooks/whowrites.mjs intel_confidence` returns exactly 3 writers, all on an unrelated operation-prep result object, **none on `CorpsFrontSector.intel_confidence`**. The field is never written by anything in `src/`. `hasReliableThreatIntel` (`>= 0.4`) can therefore never be true, so **every OG's FORCE BALANCE reads REDACTED, unconditionally, forever** — a dead field, not fog-of-war. The real system sits one hop away and is fully built: `state.military.sector_intel[sectorId].confidence`, computed every turn in `src/sim/combat/sector_intel.ts:91-129`, with a helper already written for this exact consumption pattern (:402). The adapter (`GameStateAdapter.ts:2578`) never wired to it. **Caution:** `sector_intel` is the structure already documented as corrupted by per-turn sector-id churn — wiring a dead field to a possibly-broken one needs that owner's decision, not a UI patch.

**#10a — one root cause, two symptoms.** `displayOffensivePower` (:369) and `displayStrengthClass` (:336) read `sector_combat_ratings[sid]` with zero fallback; `displayDefensivePower` (:370-376) falls back to a legacy `sector.defensive_power` maintained on the sector object. When the ratings entry is absent for a sector with an active friendly line you get the audited pair for free: blank OFFENSIVE POWER + the sentence "Friendly line reported" in the STRENGTH slot + a working DEFENSIVE POWER. Two candidate causes for absence: per-turn recompute (`sector_combat_rating.ts:164`) racing sector-id churn, or `final_sector_truth_reconciliation.ts:285/316` which **wipes the whole map to `{}`** — confirm whether the audited screenshot came from an endgame/final save before chasing either.

**#8a — a writer-side collision, not a render bug.** `generateTacticalGroupName`'s RS branch is `ordinal <= 1 ? "TG {place}" : "{place} OG"` — every TG/OG anchored at the same place past the first collapses to a byte-identical name. The two "OG MAGLAJ" rows with different stats are two genuinely distinct sectors, correctly counted, wrongly named.

## ENGINE DEFECTS FOUND (escalation)
1. `CorpsFrontSector.intel_confidence` has **no writer anywhere in `src/`** — FORCE BALANCE permanently REDACTED for every sector. Real data exists in `state.military.sector_intel[sid].confidence`, unwired. Ties into the documented sector-id-churn defect.
2. `sector_combat_ratings[sid]` can be absent for a sector with an active friendly line (cause unconfirmed: recompute timing vs sector-id churn vs `final_sector_truth_reconciliation.ts` zeroing the map).
3. `generateTacticalGroupName` (RS branch) is **non-injective for ordinal ≥ 2** — real distinct OGs get identical display names.
4. *(from the display-name seat)* `army_reserve_system.ts:716,755` bakes `Op "${op.name}"` into a sentence that reaches the player raw via `why_needed`.

## HELD — unresolved provenance
- **8d** (review-before-advance lists the same two decisions twice), **8e** (decorate-a-unit identical copy/effects), **8f** (War Summary objective cards sharing one CTA). Unblocking query: grep each component for the literal duplicated copy strings, then determine **one entity rendered twice (render-loop bug) or two real entities with coincidentally identical copy (content-authoring gap)** — that distinction decides owner and lane.
- **13b** ("Visit the front ~~10~~ CA"): no `line-through` render site matching this copy anywhere under `src/ui/map/components` (all 5 files using `line-through` checked; `DeskAuthorityHeader.tsx` uses muted colour only). Unblocking query: check the screenshot — possibly outside `src/ui/map/components`, or the "10" is not CA cost at all but a visit count or cooldown.

## OUT OF SCOPE — considered and rejected
- Fixing `tactical_group_naming.ts` or the `sector_intel`/`sector_combat_ratings` wiring directly — `src/sim/`-adjacent, reportable-only.
- Cleaning `stranded_status` or any state field — never in scope, and confirmed it is not even the right field for #2.
- Consolidating all four casualty formatters (`fmtK`, `formatPersonnel`, `localizedInteger`, raw `String()`) into one canonical helper — correct long-term fix implied by 6b/6c/6d, but a repo-wide sweep. **Recommend a follow-up `code-simplifier` pass / post-1.0 backlog, not this plan.**
- The historical accuracy of "55 collapsed municipalities" as a count — a calibration/historian question about degradation constants, not a representation-truthfulness one.

---

# 4. Narrative Designer — voice / copy (findings 4, 5, 11, 18, 19, 20, 22, 23, 26, 28, 29)

All locations verified in `src/` by grep+read.

## Findings table

| ID | Current string | File:line | Proposed string | Canon-gated? | Effort |
|---|---|---|---|---|---|
| 4a | `Records owns operation status, completed dossiers, and archive exclusions.` | `messages.en.ts:5164` | `Records keeps operation status, completed dossiers, and archive exclusions. Chronicle carries one narrative entry for each visible completed operation.` | No | XS |
| 4b | `Army HQ owns command review, operation dossiers, personnel, and reserve handoffs.` | `messages.en.ts:773` | `Presidential signatures belong in the Desk and Decision Room; Army HQ handles command review, operation dossiers, personnel, and reserve handoffs.` | No | XS |
| 4c | `Army HQ owns command review. This panel stays map-facing.` | `messages.en.ts:2027` | `Army HQ handles command review. This panel stays map-facing.` | No | XS |
| 4d | `{count} executable staff items are on file. Review them in the Decision Room; no new command channel is created here.` | `messages.en.ts:343` | `{count} staff items are waiting for review. Open them in the Decision Room — this list doesn't send new orders on its own.` | No | S |
| 4e | `7 archived operation records are excluded from RS detailed AAR review.` | `messages.en.ts:2015`, `:5171-5172` | `{count} archived operation isn't in {faction}'s detailed AAR review.` / plural `…operations aren't…` | No | S |
| 4f | `Ghost Entry` / `Historical Ghost Entry` | `messages.en.ts:3577`, `:4221`, `:3578` | `Speculative Entry` / `Speculative Historical Note` | No | S |
| 4g | `From "{opening}" to "{closing}" \| sensitive-history signal chapters: {signals}` | `messages.en.ts:444` | `From "{opening}" to "{closing}" — {signals} chapter(s) touch sensitive history.` | No | S |
| 4h | `Responsible owner` | `messages.en.ts:3637` | `In command` | No | XS |
| 4i | `Standing {value}/100; recorded decision effect {modifier}` | `messages.en.ts:3655` | `Standing {value}/100 — your decisions moved it {modifier}` | No | XS |
| 4j | `Historical essays and reference material live in the separate Codex shell.` | `messages.en.ts:1925` | `Historical essays and reference material live in the Codex.` | No | XS |
| 5 | bare `Unreported` in value slots | root key `messages.en.ts:3354` + ~12 more (list below) | **`No staff report`** | No | S + layout dependency |
| 11 | `Cost Signal: rupture` | `CinematicVerdict.tsx:114` renders `scene.costEmphasis.severity.toString()` — raw engine enum | Reuse `formatFindingSeverity` from `WarCostSummary.tsx:70-76` (`rupture → 'Locked condemnation'`, keys at `messages.en.ts:4210-4212`); add `warCost.findingSeverity.none` | No | S |
| 18a | `RBIH` chip casing | `DaytonNegotiationModal.tsx:361` — a CSS `uppercase` class transforms canonical `RBiH` | Remove the transform on this span only | No | XS |
| 18b | `Patron Override Active ({pct}%)` | `messages.en.ts:2483` | `Patron Override Active ({pct}%) — forced concessions at settlement` (reuses `commandBriefing.item.patronOverride.detail:1085`) | No | XS |
| 18c | `Negotiation Capital: 0/27`, all packages enabled | `DaytonNegotiationModal.tsx:298-301` | **Handoff** — `overBudget` already exists and reddens the header; needs per-package affordability state (interaction logic) | No | Dependency |
| 19a | paramilitary methodology sentence | `messages.en.ts:5471` | Reworded in place, all facts and the caveat kept, engine-voice framing dropped | **Yes — ruled on below** | S |
| 19b | `−4.04 international standing` | `ParamilitaryReviewModal.tsx:32-34` | **No change — canon requires the precision** | **Yes** | None |
| 20 | `{count} turns`, `isolated turn(s)`, `{months}mo in command` | `messages.en.ts:2166`, `:1892`, `:1894`; `officerCharacter.ts:211-215` | weeks throughout; drop `formatTenure`'s month branch | No | S |
| 22a | `Fielded personnel now` | `messages.en.ts:3275` | `Fielded personnel` (matches sibling `corpsCard.fieldedBrigadesLabel`) | No | XS |
| 22b | stray `×` glyph beside the Army HQ date | **UNLOCATED** — no literal in `ArmyHQModal.tsx:405-426` or anywhere in `army_hq/`; likely a close-icon or font artifact, not a string | — | — |
| 23 | 19 reserve officers as a flat comma paragraph | `messages.en.ts:3287`, fed by `PersonnelContent.tsx:175` | `See the reserve roster below` — **`PersonnelContent.tsx:329-340` already renders every officer as an individual chip in the same panel**; the paragraph is redundant | **Yes — ruled on below** | S |
| 26 | verdict preview cuts mid-sentence | `CinematicVerdict.tsx:148` | **Handoff** (fade/scroll affordance), or a display-only truncated `previewSummary` while `copySummary()` keeps the full text | No | Dependency or S |
| 28 | `Open Turn Aftermath` on every card | `messages.en.ts:449` | `View Aftermath` | No | XS |
| 29 | spaced hyphen in two Decision Room strings | `messages.en.ts:1077`, `:1085` | em dash | No | XS |

**Finding 5 — the bare value-slot keys to change:** `corpsFront.unknown`, `corpsFront.unreported`, `orbat.metricUnreported`, `orbat.postureUnreported`, `operationsSection.metricUnreported`, `operationHistory.gradeFactorUnreported`, `corpsCard.stance.unreported`, `peace.metricUnreported`, `strategicPosition.unreported`, `armyReserve.personnelUnreported`, `opportunity.axis.unreported`, `warSummary.objective.status.unreported`, `warSummary.objective.trend.unreported`. **Keep** the contextual phrases (`Cohesion unreported`, `Commander record unreported`) — those already read as prose. At `SectorsSection.tsx:159-162`, merge the stacked pair into `No staff report — enemy picture unconfirmed.` **Layout dependency (one line of intent):** give `No staff report` a de-emphasised token (italic / lower opacity / no `tabular-nums`) so it never carries a number's visual weight.

## VOICE RULE SHEET

1. **Who is speaking:** a staff officer briefing the president — factual, deferential, never chatty. No first person, no exclamation points.
2. **Never expose engine/QA vocabulary.** Banned: *owns* ("X owns Y"), *shell*, *Ring N*, *executable [staff] items*, *ghost entry* (use "speculative"/"path not taken"), any internal gate tag rendered as literal text.
3. **One time unit: weeks.** Never "turns", never month-derived labels. A turn is a week.
4. **Numbers are staff numbers, not telemetry** — round to what a briefing officer would say, **except** where canon forbids rounding to avoid minimising a cost. Check `SENSITIVE_HISTORY_DESIGN_GATE.md` before rounding anything cost/casualty-adjacent.
5. **`Unreported` is a sentence, not a value.** Standard phrase `No staff report`; never in a numeric slot with a number's visual weight.
6. **Canonical casing survives CSS transforms.** `RBiH`/`RS`/`HRHB` — never force-uppercase a canonical ID that is not already all-caps. Check for `text-transform` before assuming a display bug is a string bug.
7. **Reuse existing labels before writing new ones** — grep whether a sibling component already solved the same enum display.
8. **Dash style:** em dash for asides, never a spaced hyphen. Ellipsis (or a visible scroll/fade cue) wherever text can run past its box — never a silent hard cut.
9. **Real people's names are never touched for brevity.** Fidelity wins over scan-friendliness; fix the container, never truncate or soften who is named.
10. **Repeated list-item action labels stay short and quiet.**

## CANON-GATE REFERRALS

- **19a (methodology sentence):** `SENSITIVE_HISTORY_DESIGN_GATE.md:143` requires the `ask`-mode decision to present "historical-citation context." **Ruling: canon requires the CONTENT to be present but dictates neither voice nor exact placement.** It already sits under its own `Sources and model` sub-header, separated from the decision text. The reword keeps it fully in place and changes only the wording. **The brief's "relocate to a tooltip/codex note" was NOT needed and was deliberately not done** — relocating would reduce the visibility of gate-required content for no wording benefit.
- **19b (`−4.04` precision):** same line, verbatim: *"It does not round numbers to make the decision look small."* **Ruling: canon explicitly REQUIRES this precision. Not a defect — close this half of finding 19 as working-as-designed, do not route it as a fix.**
- **23 (reserve officers):** §10 (provenance) governs any surface stating something about a named real person with a `war_crimes_record`. **Ruling: the fix touches no name** — it changes only the summary sentence that duplicates the list; the full unmodified list stays in the existing chip section. **Constraint recorded for whoever later builds per-officer dossier links: they must key off the provenance manifest structurally per §10.0, never off a curated subset of "notable" names.**

## OUT OF SCOPE — considered and rejected
- Rewriting the good contextual `*unreported` phrases — only bare value slots needed the standard phrase.
- Translating any of this into `messages.bcs.ts` — parallel-locale dependency needing native review; flagged, not shipped.
- Designing the muted `No staff report` style, the reserve-officer dossier rows, the Dayton per-package affordability indicator, or the verdict-preview fade — four layout/interaction dependencies, stated as one-line intents, not designed.
- Renaming the `rupture` concept — an established canon term with an already-shipped label; only its unlabelled surfacing was in scope.
- Finding 11's `HVO 68.3 B` vs red `FAILURE` semantic contradiction — another seat's ownership.
- Chasing the stray `×` glyph (22b) beyond the header component and the `army_hq/` folder.
- A full systemic turns→weeks sweep. **~20 further `{turns}`-bearing keys were located and are recorded here so they need not be re-grepped:** `opsPlanning.commander.optionAria`, `commanderSelect.personalityPrep`, `turnAftermath.campaignCost.briefing.*`, `deskAuthority.cadence`, `eventDecision.effect.*` (×7), `eventModal.effect.duration`, `commandStrain.recovery.resolving.*`, `commandBriefing.item.enclave.detail`. Same VOICE RULE 3 applies; not rewritten because the audit named only two.

---

# 5. Follow-up — screenshot-driven location pass (2026-09-05)

Both the layout and data-truth seats were sent back to read the on-disk PNGs directly rather than reason from source alone. **Seven of the nine open items closed. Two remain, both with exhaustive negative evidence.**

## 24 — Whiteboard date occluded — NOW FULLY CONFIRMED

Comparing `tmp_gui_observation/verbs/command_surface.png` (same office scene, no right-column overlay) against `fresh_shots/{rbih,hrhb}/01_desk.png` settles it. On `command_surface.png` the whiteboard is fully visible and legible — **"26 Jul 1993"** — confirming it is static painted background art at a fixed screen position. On both desk shots the same whiteboard is sliced by the `PresidentDeskShell` right-column overlay: only a thin horizontal strip survives ("26 Jul 1…" for RBiH, "26 J…" for HRHB), squeezed into the ~12px flex `gap-3` between two stacked opaque cards — `DeskAuthorityHeader` ending ~y=507 and the Decision Packet card starting ~y=524 (`PresidentDeskShell.tsx:107-117`).

**Root cause:** `PresidentDeskShell.tsx:94` positions the directive column at `right-3` with `w-[min(32rem,calc(100vw-1.5rem))]`, chosen independently of where the externally-generated per-faction art places its whiteboard prop. All three plates place it in roughly the same region, so the column's fixed bounds slice it identically — not a per-faction bug, a column-placement-vs-art coincidence that repeats.

**Bounded fix:** widen the reveal-gap between the `DeskAuthorityHeader` block (:111-113) and the Decision Packet block (:115-117) specifically, so the gap clears the whiteboard's full vertical extent instead of bisecting it. Treats the accidental sliver as the bug rather than repositioning the column. **Needs one visual-iteration pass in a live browser** — exact pixel bounds of art baked into a `.webp` are not readable from source.
**Verification:** before/after screenshot at the same window size; the whiteboard must be either fully in the gap or fully behind a card, never sliced.
**Effort:** S-M (visual tuning, no restructuring). **Risk:** none.

## 17 — Corps briefing bottom half empty — CONFIRMED, one-word fix

Two independent screenshots show the identical pattern: `fresh_shots/rbih/07_corps_command.png` (ARBiH 1st Corps) cuts off mid "OG VISOKO", `verbs/inspect_corps.png` (VRS 1st Krajina Corps) mid "OG MAGLAJ" — then a large dead black area, then the sibling-corps tab row pinned to the very bottom of the viewport.

**File:** `src/ui/map/components/army_hq/ArmyHQModal.tsx:724`
**Root cause:** the corps cards are siblings in one CSS Grid with **no `content-start`**. Default `align-content: normal` computes as `stretch` for Grid, so when the grid sits in a scrollable area taller than its intrinsic content, the surplus height is distributed into the row tracks — pushing row 2 (the compressed tabs) to the bottom instead of packing it under row 1.
**Bounded fix:** add `content-start` to the grid container's className at :724. One word, no restructuring, no change to the `auto-fit`/`minmax` column logic.
**Verification:** with `expandedCorpsId` set to a corps with a long OG list, assert the compressed siblings' `getBoundingClientRect().top` equals `expandedCard.bottom + gap` — a content-driven constant. Before the fix it tracks container height; after, it must not.
**Effort:** S. **Risk:** none.

## 7d — HRHB reserve card + Codex mid-citation — CONFIRMED, one shared root cause

`fresh_shots/hrhb/01_desk.png` shows the RESERVE REQUEST body cut flush mid-sentence ("…0 reserve formations remain; Ruda (Novi Travnik)"); `fresh_shots/hrhb/10_codex.png` shows the campaign-context essay cut flush mid-citation ("…later examined in the Karadžić trial in Prosecutor v."). Both confirmed exactly as audited.

**Root cause, same in both:** the content is **not lost** — both containers are genuinely scrollable (`president-desk-scroll-region` is `overflow-y-auto`, `PresidentDeskShell.tsx:107-109`; the Codex campaign-context `<section>` is `max-h-44 overflow-y-auto`, `CodexPanel.tsx:359-362`). Neither has any visual scroll affordance — no fade, no persistent scrollbar styling, no "more below" cue. A hard-clipped `overflow-y-auto` box with no cue is indistinguishable from truncated content at a glance, which is exactly what a screenshot-based audit — and a press screenshot — catches.
**Bounded fix:** add a bottom fade/scroll-shadow to each container independently (mask-image gradient, or an absolutely-positioned gradient overlay pinned to the bottom edge). Two small independent CSS additions in two files — **no shared component, so no design-system scope creep**.
**Verification:** for each container assert `scrollHeight > clientHeight` implies the fade is present; screenshot-diff to confirm the last visible line fades rather than hard-clips.
**Effort:** S. **Risk:** none.

## 15 — Sarajevo counter clutter — CONFIRMED, root-caused, priced L

`fresh_shots/rbih/02_war_map.png`, Sarajevo ring (~x=1150-1215, y=505-545): one cell shows a correctly-functioning stack badge ("12"), but several **geographically-distinct neighbouring** OSIDs' markers and EN contact chips overlap around it. This is cross-settlement crowding, **not** a failure of the same-OSID stack mechanism.

**Root cause:** `src/ui/map/map/builders/buildFormationsGeoJSON.ts:90-115`. A working per-OSID mechanism exists — `countsPerOsid`/`unitsPerOsid` (:90-95, :111-115) drives bounded pixel fanning for units sharing one OSID centroid (`stack_index`/`stack_count`, :44-47, :167-169) — but every marker anchors at `[osidCenter[0], osidCenter[1]]` (:114), computed independently per OSID **with no awareness of any other OSID's marker position**. In a dense cluster of small adjacent settlements, each OSID's anchor-plus-fan can land close enough to a neighbouring OSID's to collide on screen. There is no zoom-dependent declutter pass and no cross-OSID screen-space collision check anywhere in the render path (grep found no `collision`/`declutter` terms).
**Bounded fix:** none at S/M size. A real fix needs a post-projection screen-space collision-avoidance or clustering pass across all visible OSID anchors.
**Verification:** icon bounding-box intersection across ALL rendered markers (not just within one stack) at a dense area across standard zoom levels — the `verify_toolbar_fit.mjs` box-intersection technique applied to the deck.gl canvas.
**Effort: L** (multi-day, new rendering-layer logic). **Risk:** no sim/determinism impact, but real regression risk to counter click-targets and stack expansion (`MapContainer.tsx:2004-2025` depends on marker hit-testing). **Graphics-programmer review required — not a quick pass.**

## 27 — HRHB wall map — CONFIRMED HARDER, still routes to art

`command_surface.png` (RS): the wall map fills nearly the whole corkboard frame, full country outline, bold red/white fill. `hrhb/01_desk.png`: a much smaller, mostly-empty corkboard with a tiny blue/black outline confined to the bottom-left corner. An unambiguous content difference between two `.webp` assets composited through the same code path. **Routes to art regeneration. No code fix exists.**

## 8d — Review-before-advance duplicate listing — BUG, root-caused

`fresh_shots/rbih/04_review_before_advance.png` confirms literally: "Vance Owen Peace Plan" appears once as a `REQUIRED / PEACE PROPOSAL` card ("REVIEW PROPOSAL") and again as a `DECISION/BLOCKING` row ("Peace plan response pending… OPEN PRESIDENT'S DESK"). Same for "Paramilitary authorization." **Two real decisions, each listed twice.**
- **WRITER:** `AdvanceTurnModal.tsx:197-198` (`blockers = derivePresidentialBlockers(...)`) and `:189-196` (`review = buildPreAdvanceCommandReviewView(...)`, from `data/preAdvanceCommandReview.ts`) — two independently-computed "what blocks advance" pipelines with no shared identity check.
- **READER:** same file, `:421-435` renders `blockers` via `BlockerRow`, `:437-450` renders `review.items` via `ReviewItemRow`, sequentially, no dedup.
- **Fix:** dedupe `review.items` against `blockers` by decision id before rendering, or merge upstream. Presentational only.
- **Risk/effort:** none / XS.

## 8f — War Summary objective cards sharing one CTA — BUG, root-caused

`fresh_shots/rbih/07b_war_summary.png` confirms "Preserve international standing" and "Maintain internal cohesion" both show `Next available lever: Decision Room / Review political decisions` — identical label, identical target.
- **WRITER:** `GameStateAdapter.ts:251-266` (`objectiveLever()`) — the `!config.militaryOwner` branch returns one hardcoded lever (`warSummary.objective.lever.politicalDecisions`, `navigationTarget: {kind:'decision-room', lens:'decision'}`) for **every** non-military objective, with no per-objective branching. Any two political objectives always collide.
- **READER:** `WarSummaryContent.tsx` objective-card CTA, via `buildFactionStrategicObjectiveViews` → `nextLever`.
- **Fix:** branch `objectiveLever()` on `config.dimension`/`config.id` for the political case as it already does for the military case.
- **Risk/effort:** none, presentational / S — touches a shared adapter function used by 4 objective cards; verify all four still resolve sensibly.

## 8e — Decorate-a-unit identical copy — FRICTION, and it is a CONTENT gap, not a render bug

`decorate_decision.png`, `decorate_unit_card.png`, `decorate_picker.png` confirm three real, distinct formations ("Decorate 3rd Sarajevo Infantry Brigade (Ilijaš)", "Decorate 2nd Romanija Motorized Brigade", "Decorate 11th Dubica Infantry") each carrying **byte-identical body copy and byte-identical effect rows** (morale +5, cohesion +2, Military Credibility +4, Internal Cohesion −2).
- **WRITER:** `data/scenarios/events/war_1993.json:8172-8194` — a single authored response-option template (`decorate_steadfast_rs`) per faction with fixed `description`/`effects`/`dimension_shifts`. `src/desktop/decorate_unit_contract.cjs` clones it verbatim for every eligible candidate; its own comment confirms this is deliberate ("authored effects… come straight from the authored event, no fabricated").
- **Verdict:** neither a duplicate-render bug nor two coincidentally-identical entities — **one content template stamped over N real formations.** Routes to narrative-designer / game-designer for per-candidate variation, not to a code fix.
- **Effort:** data-authoring, not a bounded UI fix. Reported for routing only.

## Also confirmed on one frame

`07b_war_summary.png` reproduces **6a** (`1211k` displaced), **6b** (`Killed 8k / Wounded 33k` beside `7,824 killed / 32,917 wounded`) and **25** (`Net territory −61`, no unit) together on a single Overview tab.

## `PRESIDENTIAL_DESK_BACKGROUND` — dead code CONFIRMED

`grep -rn "PRESIDENTIAL_DESK_BACKGROUND" src/` returns exactly one hit: its own declaration at `presidentialDeskAssets.ts:28`. Zero importers in `src/`, zero in `tools/`. Safe to route as dead code (unused export plus its unused `hq_presidential_desk_1992.webp` import).

## STILL OPEN after the screenshot pass — two items, both with negative evidence

**14 — Left COMMAND rail clipping — UNLOCATED.** All four candidate screenshots checked; none shows a COMMAND rail header overlapping a first OG list item. `OOBSidebar.tsx` re-read in full: **grep for `sticky` returns zero hits**, and the "COMMAND" header (:319-321) is a normal `shrink-0` flex sibling above the scrollable region (:324-329), not an absolutely/stickily-positioned element that could sit on top of content below it. **The mechanism this finding requires does not exist in that file.** The finding therefore likely describes a different surface, or a transient mid-scroll state static screenshots cannot catch. Further progress needs a live interactive session or the original auditor's click-path — not more source-reading or more static screenshots.

**13b — "Visit the front ~~10~~ CA" — HELD, exhaustive negative evidence.** All three factions' `01_desk.png` plus `front_visit_card.png`, `front_visit_issue.png`, `front_visit_dossier.png`, `command_surface.png` all show **100/100 Command Authority** — no save in the evidence set is CA-constrained enough to reach an unaffordable state. Every component rendering the front-visit CA cost was then read directly: `DeskAuthorityHeader.tsx:179-197` uses muted colour only (`text-text-muted/60`, `text-red-300/70`), **no `line-through`**; `FrontVisitSection.tsx:154-166` uses `cursor-not-allowed` + muted styling, **no `line-through`**; `DirectiveCard.tsx`'s front-visit branch has no cost strikethrough at all. The only cost-lock `line-through` in the tree is `DaytonInstitutionalDimensions.tsx:197` — finding 13a, already reported. **Conclusion: either already fixed since the audit, or the auditor's shorthand for the muted/disabled colour rather than a literal strikethrough, or a surface not yet found.** Unblocking query: a save with CA < 10 on the desk, or the original audit capture if it exists outside `tmp_gui_observation/`.

---

## Cross-cutting observations for the integrator

1. **Two audit premises were wrong** (finding 2's subsystem; finding 10's REDACTED being intentional). Both were caught by requiring writer+reader before planning.
2. **Four engine defects surfaced that the audit never saw** — none are in the 29, all route as bugs, none may be planned by the seats that found them.
3. **Findings that close with NO code:** 19b (canon requires the unrounded precision), 27 (art content), and 8e (content-authoring template, routes to narrative/game-designer).
4. **Only TWO findings remain open after the screenshot pass: 14 and 13b**, both with exhaustive negative evidence recorded above. Neither is unblockable by more source-reading; both need a live session or the original capture. **22b** (stray `×` glyph) also remains unlocated and is likely an icon/font artifact rather than a string.
5. **One finding is priced L and needs a specialist**: 15 (cross-OSID marker collision) is deck.gl rendering-layer work with real regression risk to marker hit-testing — graphics-programmer, not a className pass.
6. **A repo-wide formatter consolidation** (four competing casualty formatters) and **a full turns→weeks sweep** (~20 further keys, listed above) were both correctly declined as out of scope; both belong in the post-1.0 backlog.
7. **File collisions to check:** the layout and data-truth seats both touch `PresidentialDecisionRoomPanel.tsx` and both touch `CorpsFrontPanel.tsx`; the layout seat and the voice seat both touch `PresidentDeskShell.tsx` (24 and 7d) and `CodexPanel.tsx`.
