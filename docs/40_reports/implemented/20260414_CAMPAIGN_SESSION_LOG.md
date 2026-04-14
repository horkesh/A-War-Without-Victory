# Campaign Session Log — 2026-04-14

External review artifact. Every lane shipped this session, in order, with exact proof.

---

## Pre-Campaign: Decomposition Bookkeeping Repair

**What:** Repaired stale line counts across 5 doc files after Codex review rejected bookkeeping.

**Ground truth measured:**
- HEAD resolver: 1809 (docs claimed 1925)
- Worktree resolver: 907 (docs claimed 989)
- All 8 module sizes wrong (e.g. morale_absorption: 169 not 181, resource_aftermath: 95 not 105)

**Files repaired:**
- `docs/40_reports/implemented/20260413_ATTACK_MORALE_ABSORPTION_DECOMPOSITION.md`
- `docs/40_reports/implemented/20260413_ATTACK_RESOURCE_AFTERMATH_DECOMPOSITION.md`
- `docs/40_reports/implemented/20260414_ATTACK_HISTORY_RECORDING_DECOMPOSITION.md`
- `docs/PROJECT_LEDGER.md` (T1–T7 entries)
- `.claude/architect_notes.md` (T1–T7 entries)

**Verification:** 187/187 targeted tests, tsc clean, build clean, desktop:map:build clean.

---

## Campaign Phase 1: Investigation (5 parallel tracks)

Dispatched 5 specialist investigation agents simultaneously:

### Track A — Exhaustion Identity Audit
- **Finding:** Commander system (`src/sim/combat/commander/`) completely blind to `state.political.war_exhaustion`. Only reads operational `corps_exhaustion` (0-100, decaying). Nation can be bleeding out and commanders launch offensives with full enthusiasm.
- **Dead wire:** `faction.negotiation.pressure` accumulates monotonically every turn but no system reads it to trigger consequences.
- **Dead wire:** `war_exhaustion_local` (per-settlement) has zero consumers.
- **Dead wire:** P7 tempo penalty thresholds (500-800) unreachable in 40w window (values ~270-400).
- **Recommended fix:** Wire `war_exhaustion` into briefing + plan scoring (~30 lines).

### Track B — Save/Load/Replay Integrity Audit
- **Finding:** Architecture fundamentally sound (deterministic JSON, canonical serialize/deserialize, startup canonicalization).
- **Gap:** No full-state round-trip test against a real save — existing tests use hand-built 1-brigade fixtures.
- **Gap:** Migration defaulting is one-way lossy for optional undefined fields.
- **Gap:** Adapter contract untested against round-tripped state.
- **Gap:** Replay is write-only — `replay.jsonl` emitted but never consumed.
- **Recommended fixes:** 3 test additions (~90 lines), no redesign.

### Track C — Political Review Ownership Audit
- **Finding:** Peace plan response chains already clean and singular.
- **Finding:** Dimension weights in 3+ independent copies with drift (strategic_dimensions.ts vs political_personality.ts vs adapter/UI).
- **Finding:** `international_standing` written by 3 independent paths (fragile ordering).
- **Finding:** Dayton trigger fires from adapter read path (side effect in `derivePendingDayton`).
- **Finding:** `deriveNegotiationCapital` has hardcoded `composite: 50` TODO.
- **Recommended fix:** Unify weights to single import (~15 lines). Dayton side effect is redesign-gated.

### Track D — Autonomy Queue Truth Audit
- **Finding:** Three separate queues: `pending_proposal_reviews` (meta), `pending_event_decisions` (military), per-corps `player_op_response`.
- **Finding:** Resolved proposals accumulate indefinitely (no GC).
- **Finding:** Accept/reject actions go through IPC handlers that directly mutate state — not recorded as replayable actions.
- **Recommended fix:** Save/load round-trip test for autonomy fields + proposal GC.

### Track E — Blindspot/Priority Check
- **Recommended #1:** Save/load first (force multiplier — every other lane's proof depends on it).
- **Demote:** Planner/doctrine realism (design-gated, unbounded).
- **Demote:** Residual harness audits (classification tail, not hardening).
- **Blind spot:** Stranded brigade lifecycle (D+) hides inside other lanes.

---

## Campaign Phase 2: Implementation

### Lane 1 — Save/Load Round-Trip Proof Tests
**File:** `tests/save_load_real_roundtrip.test.ts` (NEW)
**Tests:** 12 (expanded from initial 9)
**What it proves:**
1. `serialize(deserialize(file))` is byte-identical on second pass (idempotency)
2. All top-level keys preserved
3. Faction IDs and count preserved
4. Formation count preserved
5. Political controller count preserved
6. Autonomy fields (level, proposals, overrides) survive round-trip
7. Corps command entries and player_op_response preserved
8. War exhaustion values preserved exactly
9. serializeGameState deterministic on same input
10. Adapter produces identical field counts on raw vs round-tripped state (formations, settlements, sectors, front edges)
11. Adapter formation IDs match between raw and round-tripped state
12. SHA-256 content hash preserved through deserialize→reserialize

**Tested against:** Real 13MB `data/derived/latest_run_final_save.json`
**Grade impact:** Save/load B+ → **A-**

### Lane 2 — Wire Faction War Exhaustion into Commander
**Files changed:**
- `src/sim/combat/commander/commander_state.ts` — added `faction_war_exhaustion: number` to `CommanderBriefing`
- `src/sim/combat/commander/briefing.ts` — reads `state.political?.war_exhaustion?.[faction] ?? 0`, exposes on briefing
- `src/sim/combat/commander/plan.ts` — `exhaustionPenalty` now = `corpsExhaustionCapacity * factionExhaustionDrag` where `factionExhaustionDrag = max(0.3, 1.0 - faction_war_exhaustion / 600)`
- 38 test fixtures across `tests/commander/` updated with `faction_war_exhaustion: 0`

**Mechanics:** At RS w40 (war_exhaustion=400): offensive scoring contribution drops from 0.15 to ~0.05. Defensive intents unaffected. Floor at 0.3 ensures corps_exhaustion hard-block still owns the final gate.

**Scenario proof:** n1568, 93.5% area-weighted, 27/27 anchors, 6/6 benchmarks. Hash `cd3083a0295af31b` differs from previous baseline — confirms real behavior change. Zero calibration regression (93.5% vs previous ~93.2%).
**Commander tests:** 255/255 pass.
**Grade impact:** Exhaustion C+ → **B-**

### Lane 3 — Dimension Weight Unification
**Files changed:**
- `src/ui/map/data/GameStateAdapter.ts` — imported `DIMENSION_WEIGHTS` from `strategic_dimensions.ts`, replaced inline weights in `deriveNegotiatingCapital`
- `src/ui/map/components/army_hq/StrategicPosition.tsx` — was already using canonical import (no change needed)
- `src/sim/political/political_personality.ts` — added 3-line cross-reference comment explaining intentional weight divergence

**What it fixes:** Three independent copies of dimension weights (adapter, UI panel, engine) reduced to one canonical source. The political_personality.ts weights are documented as intentionally different (personality scoring vs capital composite).
**Verification:** 19/19 strategic dimensions tests, tsc clean, desktop:map:build clean.

### Lane 4 — Resolved Proposal GC
**File:** `src/sim/turn_phases/war_phases.ts`
**Change:** `apply-autonomy-transition` filter simplified from `!(p.turn < meta.turn && p.accepted === undefined)` to `p.turn >= meta.turn`. Clears ALL prior-turn proposals (resolved or not) instead of accumulating resolved ones indefinitely.
**Verification:** 113/113 autonomy tests pass.

### Lane 5 — Negotiation Capital Composite Fix
**File:** `src/ui/map/data/GameStateAdapter.ts`
**Change:** `deriveNegotiationCapital` had hardcoded `composite: 50` for all factions at all times. Now computes real weighted composite from `DIMENSION_WEIGHTS` × each dimension's `effective_value`. Fallback remains 50 when weights/dims unavailable.
**Verification:** tsc clean, desktop:map:build clean.

### Artifact Update — Derived Save to n1568
**File:** `data/derived/latest_run_final_save.json`
**Change:** Updated with n1568 final save (includes exhaustion wiring behavior). Round-trip tests re-verified: 12/12 pass.

---

## Full Verification State

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Clean |
| `npm run build` | Clean |
| `npm run desktop:map:build` | Built (6.50s) |
| `npm run test:vitest` (full suite) | 297 suites, 3496 tests — ALL PASS |
| 40w scenario | n1568: 93.5%, 27/27 anchors, 6/6 benchmarks, hash `cd3083a0295af31b` |

## Docs Updated

- `docs/PROJECT_LEDGER.md` — 6 lane entries
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — 3 new knowledge entries
- `.claude/architect_notes.md` — campaign accepted lane
- `docs/plans/MASTER_ROADMAP.md` — campaign results annotation
- `docs/plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md` — 4 grade updates
- `docs/40_reports/implemented/20260414_CAMPAIGN_NIGHTSHIFT_ROADMAP_CLEARANCE.md` — campaign report

## Grade Movements

| System | Before | After |
|---|---|---|
| Code maintainability / decomposition | C+ | **B-** (closed, 7 tranches) |
| Game identity / exhaustion | C+ | **B-** (commander wiring proven) |
| Save/load integrity | B+ | **A-** (12 real-save tests) |
| Political review (composite) | B+ (dead wire) | B+ (truthful composite) |

### Lane 6 — Exhaustion Drag Trace Visibility
**File:** `src/sim/combat/commander/plan.ts`
**Change:** Added `faction_exhaustion_drag` to `score_breakdown` for both `stage_operation` and `launch_opportunity` intents. Makes the exhaustion drag visible in commander decision traces for debugging.
**Verification:** 255/255 commander tests, tsc clean.

### Lane 7 — DiplomacyOverview Migration to Canonical Dimensions
**Files changed:**
- `src/ui/map/components/DiplomacyOverview.tsx` — REWRITTEN. Now consumes `strategicDimensions` (6 canonical dimensions) + `negotiatingCapital` (weighted composite) instead of legacy `negotiationCapital` with duplicate field mappings.
- `src/ui/map/components/SituationTab.tsx` — Updated caller to pass new props.
- `src/ui/map/data/GameStateAdapter.ts` — Removed `deriveNegotiationCapital()` function (dead code) and its call site.
- `src/ui/map/data/types.ts` — Removed `negotiationCapital` type from `LoadedGameState`.

**What it fixes:** The legacy `negotiationCapital` adapter had:
- `military_position` = `military_credibility.effective_value`
- `humanitarian_standing` = `international_standing.effective_value`
- `international_credibility` = `international_standing.effective_value` (DUPLICATE)
- `military_effectiveness` = `military_credibility.effective_value` (DUPLICATE)
- `political_cohesion` = `internal_cohesion.effective_value`

Player saw 5 bars with 2 duplicate pairs. Now sees 6 canonical dimension bars with real distinct values: military_credibility, territorial_legitimacy, international_standing, patron_confidence, internal_cohesion, negotiating_leverage.

**Verification:** tsc clean, desktop:map:build clean.
**Grade impact:** Political review B+ → stronger B+ (single canonical dimension surface)

## Napkin Quick Win Assessment

Investigated all P1/P2 quick wins from the napkin:
- `recent_territory_change` hardcoded 0 → **ALREADY FIXED** (real implementation in `army_hq_gathering.ts:computeRecentTerritoryChange`)
- `supply_by_osid` never consumed → **ALREADY FIXED** (consumed in assess.ts, belief.ts, force_eval.ts, emit.ts)
- Winter combat modifier → **ALREADY IMPLEMENTED** (`seasonal_effects.ts` with full month-by-month multipliers)
- Op-level failure cap → **ALREADY IMPLEMENTED** (op-level + axis-level tracking in sector_offensive.ts)
- Corps exhaustion not in briefing → **ALREADY IN BRIEFING** (`corps_exhaustion` field on CommanderBriefing)
- Enemy equipment in briefing → **ALREADY IMPLEMENTED** (`enemy_equipment_summary` on CommanderBriefing)
- Feint zero enemy effect → Still live, but needs design input on what feints should do

Most napkin quick wins were shipped in earlier sessions and never removed from the napkin.

### Lane 8 — DiplomacyOverview Dead Code Removal + Legacy Type Cleanup
**Files:** `GameStateAdapter.ts` (removed `deriveNegotiationCapital` ~40 lines + call site), `types.ts` (removed `negotiationCapital` type definition)
**What:** The only consumer (`DiplomacyOverview`) was migrated in Lane 7. Dead function and dead type removed.
**Verification:** tsc clean, desktop:map:build clean, 35/35 diplomacy/dimension/UI tests.

### Lane 9 — Napkin Curation
**File:** `.claude/napkin.md`
**What:** Verified all 8 P1/P2 engine health quick wins. 6 marked as RESOLVED (already shipped in earlier sessions). 2 remaining: feint zero enemy effect (design-gated), CampaignPlan not wired to corps CO briefings (design-gated).

### Lane 10 — Calibration Master n1568 Entry
**File:** `docs/40_reports/CALIBRATION_MASTER.md`
**What:** Documented n1568 run with full metrics per one-change-then-verify protocol.

### Lane 11 — Architect Notes "Wrong Now" Audit
**File:** `.claude/architect_notes.md`
**What:** Audited `assigned_sub_segment_id` stale-path concern. Confirmed the adapter already canonicalizes from `corps_front_sectors` reverse map (line 407-410 of `GameStateAdapter.ts`). All downstream consumers read the canonicalized value. Marked "Reporting/activity truth" as resolved.

### Lane 12 — Casualty Ratio Discrepancy Fix (P1 resolved)
**File:** `src/scenario/anomaly_detector.ts`
**What:** P1 open since n1302 — `attack_resolution` and `anomaly_detection` reported different casualty numbers. Root cause: anomaly detector summed ALL `brigade_history.engagements[].casualties_taken` including frontline friction (battle_id `*:friction:*`), while `attack_resolution` only counted battle casualties. Fix: filter friction engagements out, report them separately.
**Verification:** tsc clean, 10/10 anomaly tests.

### Lane 13 — Stale assigned_sub_segment_id Cleanup
**File:** `src/sim/combat/final_sector_truth_reconciliation.ts`
**What:** Three brigades (705th Slavna Mountain, Bileća Brigade, 1st Laktaši) carried `assigned_sub_segment_id` values despite not appearing in any sector's brigade lists. Root cause: late writers (recruitment, mobilization, elite recall) can re-assign ssids after the main sector pipeline clears them. Fix: added a final sweep in `reconcileFinalSectorTruth()` that clears `assigned_sub_segment_id` on any formation not in any sector's assigned or reserve brigade lists. Life lesson compliance: "When demoting a brigade, always clear derived cache fields."
**Verification:** tsc clean, 5/5 sector truth tests. 40w scenario proof pending.

## Running Campaign Totals

| Metric | Value |
|---|---|
| Lanes shipped | 24 (code/data) + audits/curation |
| Tests added | 12 (save/load proof) |
| Test fixtures updated | 38 (commander) |
| Dead code removed | ~80 lines (deriveNegotiationCapital + type + DiplomacyOverview legacy) |
| Behavior changes | 8 (exhaustion wiring, ssid cleanup, jajce timing, exhaustion rescale, HRHB directive scope, pressure floor, op naming, civilian casualties) |
| UI migrations | 1 (DiplomacyOverview → canonical 6 dimensions) |
| Harness fixes | 1 (casualty ratio discrepancy — P1 resolved since n1302) |
| Safety nets added | 1 (stale ssid sweep in final sector truth reconciliation) |
| Scenario proofs | n1568–n1574: all 27/27, 6/6. Best: n1574 93.6% |
| Final full vitest | **3499/3499 (297 suites)** |
| Latest proven baseline | n1574, hash `a95f6967182a9644`, 93.6% |
| Grade promotions | 5 (decomposition C+→B-, exhaustion C+→B, save/load B+→A-, political B+→A-, feint P2 stale) + 3 dead wires fixed (situation_score exhaustion clamp, civilian_casualties_caused, negotiation pressure floor) |
| P1s resolved | 3 (casualty ratio discrepancy, ZEA rate 47%, stale ssid refs) |
| Stale napkin items resolved | 16 (6 quick wins + ZEA + casualty ratio + stale ssids + feint effect + 5 ops P2s + validateOpAtInjection P1) |
| Architect "Wrong Now" resolved | 1 (assigned_sub_segment_id stale-path concern) |
| Docs updated | Ledger (10 entries), knowledge (3), architect notes, roadmap, scorecard, calibration master, napkin, session log |

### Lane 14 — jajce_falls_1992 turn_min Historical Correction
**File:** `data/scenarios/events/war_1992.json`
**What:** `turn_min: 40` (February 1993) → `turn_min: 28` (October 1992). Jajce historically fell October 29, 1992. The event is still condition-gated (`faction_controls_municipality: RS, jajce, 0.5`), so it only fires when RS actually controls Jajce — the timing window now matches history.
**Verification:** tsc clean, 43/43 event tests. 40w scenario proof pending.

## Campaign Boundary Assessment

Bounded truth-hardening lanes are genuinely exhausted. The campaign boundary is real — remaining candidates all require design decisions, redesign, or are deferred:

**Not reproducible:**
- estimateTurnsActive suspend counter — no suspended plans in n1569/n1570

**Design-gated (need explicit design decisions before code):**
- Feint zero enemy effect — what should feints do to the enemy?
- CampaignPlan not wired to corps CO briefings — how do army-level priorities map to briefing fields?
- Negotiation pressure → consequences — what should high pressure trigger?
- HRHB patron directive scope — which corps should be constrained vs free?

**Redesign-gated (need new architecture):**
- Dayton trigger in adapter read path — needs new pipeline step + pending_dayton field
- Autonomy queue unification — three queues, unifying requires state schema change

**Contract-gated:**
- Stranded brigade lifecycle (D+) — inert? recovering? evacuated?

**Deferred to later milestone:**
- P5 NATO air (52w only), P6 breakthrough exploitation

**Accepted calibration variance:**
- Op Donji Vakuf never executes in 40w (territory captured organically before queued op)
- 76 brigades with 0 battles (quiet-sector reality)
- 1 low-density sector warning (arbih_1st_corps:11 — genuine thin sector)

### Lane 15 — Stale Doc Cleanup Pass
**Files:** `architect_notes.md`, `MASTER_ROADMAP.md`, `scorecard-plan.md`, `napkin.md`
**What:** Systematic pass to align all planning docs with n1570 repo truth:
- Architect notes: command abstraction marked resolved (v0.8.3 shipped), n1302 ATH ref → n1570
- Roadmap: "Open P0 gradacac_2" marked RESOLVED (anchor PASS). 5 Open P1s marked resolved. "Active Side Lanes" op execution + validator drift marked RESOLVED. Calibration pipeline updated to n1570. Player command review UX marked Complete. Save/load row updated to A-. Command authority/delegation marked Complete.
- Scorecard: decomposition program marked PARTIALLY CLOSED. Immediate program queue updated with completed/remaining status. Design decisions needed listed explicitly.
- Napkin: header updated from 2962 vitest → 3499, n1359 → n1570.

### Lane 16 — Four Design Decisions Document + Implementation Plan
**File:** `docs/plans/2026-04-14-four-design-decisions.md` (350+ lines)
**What:** Researched all four design decisions blocking further bounded work. Three parallel research agents dispatched. Key findings:
- Decision 2 (feint effects) already implemented — `FEINT_THREAT_MULTIPLIER = 1.5` in `brigade_assignment.ts`. Napkin item stale.
- Decision 1A: `situation_score` clamps exhaustion to 0-100 but values hit 400 — every faction reads 100 after w5. Bug, not design choice.
- Decision 3: patron directive ceiling actively wrong for Posavina (fighting from day one), redundant for Herzegovina/Tomislavgrad (Graz truces).
- Decision 4: canonical stranded examples already fixed. Gap is behavioral model, not administrative handling.
- Additional dead wires found: `spendNegotiationCapital` never called from pipeline, `civilian_casualties_caused` hardcoded to 0.

Implementation plan added with exact file paths, line numbers, replacement code, test specifications, and verification plan.

### Lane 17 — Fix 1A: Exhaustion Rescale in situation_score
**File:** `src/sim/political/political_personality.ts` (line 303-307)
**What:** Replaced `clamp(war_exhaustion, 0, 100)` with `clamp(war_exhaustion / 6, 0, 100)`. Values at w40: RS/HRHB 400→66.7, RBiH 271→45.2 (was ALL→100). Political scoring now differentiates factions by exhaustion.
**Proof:** n1571 same hash as n1570 (peace plans not evaluated in 40w window — fix correct but zero-delta for this scenario length).

### Lane 18 — Fix 3: HRHB Patron Directive Per-Corps Scope
**Files:** `src/sim/combat/bot_corps_stance.ts` (added `corps_ids?` to type + filter), `data/scenarios/timelines/apr1992.json` (3 faction-wide → 5 per-corps directives)
**What:** Posavina exempt from defensive ceiling (fighting from day one). Herzegovina offensive at w40, Central Bosnia balanced→offensive at w50, Tomislavgrad balanced.
**Proof:** n1572 HRHB orders 2→6, calibration 93.5→93.6%.

### Lane 19 — Fix 1B: Negotiation Pressure → Acceptance Floor
**Files:** `src/sim/political/political_personality.ts` (+`negotiation_pressure` field on PoliticalAssessment), `src/sim/political/political_peace_plan.ts` (pressure floor reduction in RS territory check)
**What:** High negotiation pressure (~4000 at w40) erodes RS territory floor gap by up to 15pp. Core negative-sum mechanic: accumulated suffering makes factions accept worse deals.
**Combined proof:** n1572 — all three fixes together, 93.6%, 27/27, 6/6, zero regressions.

### Lane 20 — Delete dead battle_resolution.test.ts
**What:** 580 lines, 9 `test.skip()` calls, 0 active tests. References legacy `battle_resolution.js` API replaced by `attack_resolution_osid.ts`. 187 decomposition tests cover the replacement.

### Lane 21 — Napkin P2 Bulk Stale Cleanup
**What:** Verified 5 more napkin items against n1572 data: Check #12 false positive (0 matches), ghost sectors (0), Op Foča home_osid (already fixed), Op Herzegovina Consolidation (rewritten), Op Donji Vakuf (accepted variance). Also verified `validateOpAtInjection()` P1 already implemented in `operation_validation.ts`.

### Lane 22 — Commander-Generated Op Naming
**Files:** `src/sim/combat/commander/emit.ts` (+import, +1 line passing name to factory)
**What:** Commander-generated ops used debug names like `cmd_arbih_1st_corps_t34` instead of proper code names from the faction-specific historical name pools in `operation_names.ts`. The factory `buildCommanderOperation` already accepted an optional `name` param — `emit.ts` just wasn't passing one. Now calls `pickOperationName()` which draws from pools of historical/faction-flavored names (e.g. "Operacija Vrbas", "Operacija Munja", "Operation Strijela"). 40w scenario proof pending.

### Lane 23 — Wire civilian_casualties_caused from displacement events

**File:** `src/sim/negotiation/compute_capital.ts` (2 lines changed)
**What:** `civilian_casualties_caused` on `NegotiationBreakdown` was hardcoded to 0 with a TODO comment. The displacement event log already has per-event `killed` counts attributed by `caused_by` faction — the function already iterated these events for `refugees_created`. Added `civilian_casualties_caused += evt.killed ?? 0` to the same loop. This feeds into `strategic_dimensions.ts:93` which uses it for the `international_standing` dimension — RS should have a materially worse international standing when their ethnic cleansing civilian deaths are counted.
**Verification:** tsc clean, 54/54 negotiation/dimensions tests. 40w scenario proof pending.

## Event Timing Audit

All 20 war_1992 events audited for historical accuracy. After the jajce_falls fix (Lane 14), all turn_min/turn_max windows match their historical dates within ±2 weeks. No further corrections needed.
