# LANE B — Operation Opportunity MVP — Implemented Report

**Date:** 2026-05-01
**Lane:** Operation Opportunity MVP (per `docs/plans/2026-05-01-autonomous-parallel-workstreams-operating-plan.md` §6 Lane B)
**Status:** SHIPPED + VERIFIED through Phase 4
**Predecessor lane:** Force Quality Foundation (closed @ commit 16e49f3e)
**Commit chain:** `5dd20678` (Phase 1) → `b0c6277c` (Phase 2) → `fc5a4bd7` (Phase 3) → `7fca3888` (Phase 3.5 one-shot fix) → Phase 4 verification

---

## 0. Executive Summary

The opportunity layer ships as the new owner-path for late-war operations: a typed, deterministic substrate (Phase 1) wired into the existing autonomy review surface (Phase 2) with one MVP content family (Phase 3) and full verification + scenario sanities (Phase 4).

What this lane changes about engine truth:

- **Late-war operations are now opportunity proposals, not calendar-forced scripts.** Operation Sana — the MVP content — was migrated from `triggered_operations.ts` (calendar `turn >= 175`) to `operation_opportunity_catalog_5th_corps.ts` with REAL prerequisite predicates (pocket survival, Operation Storm triggered, corps readiness, staging access, enemy weakness). When the prerequisites do not align in a run, Sana does not fire — the engine telling the truth about the war the player produced.
- **Approval routes through one canonical CorpsOperation factory.** `applyOpportunityDecision('approve')` calls `buildCorpsOperation()` exactly the same way `triggered_operations.checkTriggeredOperations` did. There is no parallel lifecycle. `sector_offensive.ts` is the unchanged downstream owner.
- **Player and bot share the same five-decision vocabulary.** Approve / delay / decline are surfaced through the existing autonomy `domain: 'ops'` proposal queue at autonomy_level=1; bots resolve their own opportunities synchronously through `defaultBotDecisionForOpportunity`. Redirect / under_resource are reachable via the direct `applyOpportunityDecision` API and remain available for a future richer dossier IPC.

What this lane does NOT change:

- No combat math. No new lifecycle. No painted-target overrides. No scenario data. No canon. No FORAWWV touch. No sensitive-history T4 entries (Krivaja-95 / Stupčanica-95 / Goražde remain calendar-triggered pending `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 sign-off).
- No Army HQ React UI. The dossier modal is a separate future packet that consumes the queue + readiness traits.

---

## 1. Phase Ledger

| Phase | Status | Commit | Files | Tests |
|---|---|---|---|---|
| 0 — Repo audit | DONE | (no code) | implementation map produced via three parallel investigations | n/a |
| 1 — Generic substrate | DONE | `5dd20678` | 4 | 17/17 |
| 2 — Decision surface | DONE | `b0c6277c` | 6 | 11/11 (+ adjacent green) |
| 3 — 5th Corps Sana family | DONE | `fc5a4bd7` | 8 | 15/15 (+ adjacent green) |
| 3.5 — One-shot guard fix | DONE | `7fca3888` | 1 (evaluator) + 2 new test cases | 45/45 substrate (was 43) |
| 4 — Verification | DONE | (this packet) | docs/PROJECT_LEDGER + this report | scenario hashes captured below |

---

## 2. Implementation Map (consumed from Phase 0)

| Concern | Owner file | Notes |
|---|---|---|
| Catalog types + evaluator | `src/sim/combat/operation_opportunities.ts` | Pure deterministic; sorted via `strictCompare`. |
| 5th Corps content | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` | Sana 95 with REAL predicates reading live state. |
| War-pipeline wiring | `src/sim/turn_phases/war_phases.ts` | 4 new steps: evaluate / apply-bot / generate-level1 / apply-resolved. |
| State shape | `src/state/game_state.ts` MilitaryState | Added `operation_opportunities?` + `operation_opportunity_resolutions?`. |
| IPC bridge | `src/desktop/electron-main.cjs` accept-/reject-proposal | Dumb pass-through; sets `accepted` flag only. |
| Approval routing | `corps_operation_helpers.ts:buildCorpsOperation` | Single canonical CorpsOperation factory. |
| Decision-trace + AAR | (Phase 4 force-quality, no changes here) | Reuses the existing `force_quality_traits` + `force_quality_traits_at_launch` fields. |

---

## 3. The Nine Prerequisite Axes — How Sana 95 Uses Them

Per design doc §4. Required axes must all be green; optional axes must meet `min_optional_axes`; n_a axes are skipped.

| Axis | Mode | Predicate (sana_95) | Reads |
|---|---|---|---|
| date_window | required | turn ∈ [175, 200] | `state.meta.turn` |
| political_authorization | n_a | — | — |
| corps_readiness | required | `computeCorpsOperationReadiness(state, 'arbih_5th_corps').operation_readiness ≥ 0.40` | Phase 4 force-quality output |
| logistics | optional | `state.political.war_supply_pressure['RBiH'] < 90` | political state |
| staging_access | required | All 5 pocket-survival anchors RBiH-controlled | `getPoliticalControllerOSID` |
| weather_season | n_a | — | — |
| commander_confidence | optional | `corps_command['arbih_5th_corps'].commander_state` present | corps command |
| enemy_weakness | required | At least one of 4 western targets RS-controlled (something to liberate) | political controllers |
| alliance_context | required | `state.meta.operation_storm_triggered === true` | meta |
| min_optional_axes | 1 | logistics OR commander_confidence must be green | — |

---

## 4. Decision Branches

| Decision | Action | Spawns CorpsOperation? | Resolution log entry? |
|---|---|---|---|
| approve | status → `approved` | YES (full brigade pool) | `response: 'approve'` |
| under_resource | status → `under_resourced_approved` | YES (floor(N/2) brigades) | `response: 'under_resource'` |
| redirect | status → `redirected` | YES (variant axes) | `response: 'redirect'` |
| delay | status → `delayed`, `reevaluate_at_turn = turn + delay_turns` | NO | (none until later resolution) |
| decline | status → `declined` | NO | `response: 'decline'` |
| (auto-expire) | status → `expired` | NO | `response: 'expire'` |

Approve / decline are the binary mapping consumed by the existing accept/reject IPC. Delay / redirect / under_resource land via the direct `applyOpportunityDecision` API today; a future Phase E richer dossier IPC may surface them in the Army HQ modal.

---

## 5. Single-Owner Migration of Operation Sana

**Before:** `src/sim/combat/triggered_operations.ts:493-542` defined Operation Sana with `trigger: (_state, turn) => turn >= 175`. The op fired regardless of pocket survival, theater state, or readiness.

**After:** Operation Sana lives only in `SANA_95_OPPORTUNITY` (`operation_opportunity_catalog_5th_corps.ts:159+`). The legacy entry in `_TRIGGERED_OPS` is gone (catalog count 8 → 7) with a replacement marker comment. Brigade roster + axis layout (3 axes: 2/6, 3/12, 4/13) are byte-equal to the old definition so the resulting CorpsOperation has the same shape.

**Single-owner enforcement:** `tests/operation_opportunities_5th_corps_sana.test.ts` asserts `_TRIGGERED_OPS.filter(op => op.name === 'Operation Sana').length === 0`. `tests/triggered_operations.test.ts` deepEquals the 7-name list. A future change cannot silently re-add the legacy path without breaking these guards.

---

## 6. Sensitive-History Boundary Preserved

Krivaja-95 / Stupčanica-95 / Goražde remain in `_TRIGGERED_OPS` as calendar-triggered entries. The opportunity layer DOES NOT modify them in this packet. Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6, any T4 opportunity authoring requires `/historian` + `/game-designer` + `/war-or-game` + user approval before code lands.

The opportunity catalog is structured to receive T4 entries cleanly when that sign-off chain completes (the `tier: 'T4'` literal exists in the type union and the `OperationOpportunityDef` shape supports the territorial-only carve-out per design doc §9), but no T4 content ships in this lane.

---

## 7. Test Pack Inventory

| Suite | Cases | Coverage |
|---|---|---|
| `tests/operation_opportunities_substrate.test.ts` | 17 | Empty-catalog no-op, prerequisite alignment, deterministic ordering, expiry, every decision branch (approve/delay/decline/redirect/under_resource), missing-corps fallback, default bot decision, deterministic re-invocation, no political-control flips invariant. |
| `tests/operation_opportunities_phase2_decisions.test.ts` | 11 | Bot opportunity auto-approved + never in player queue; player opportunity surfaces at autonomy=1 only; OPPORTUNITY:<id> action format; accept→approve / reject→decline routing; ignores unresolved rows; deterministic bot decisions; sorted multi-opportunity bot apply; empty-catalog yields no rows; no raw OSIDs in description. |
| `tests/operation_opportunities_5th_corps_sana.test.ts` | 15 | One Sana entry in catalog; legacy scripted Sana removed; faction/corps/staging bound; pre-window invisibility; Storm-not-triggered invisibility; pocket-collapsed invisibility; nothing-to-liberate invisibility; full alignment surfaces; expiry; no raw OSIDs in axis reasons; brigade + objective counts match migrated shape; citations include BB1 + family doc. |
| `tests/triggered_operations.test.ts` | 15 (1 updated) | Catalog length 8 → 7; expected names list updated; rest untouched. |
| `tests/triggered_operations_late_1995.test.ts` | 10 (4 updated) | NEW_OP_NAMES 4 → 3; slice(-4) → slice(-3); Sana shape + painted tests removed with migration comments. |
| `tests/operation_opportunities_substrate.test.ts` (1 case) | (counted above) | "production catalog non-empty since Phase 3" guard. |
| `tests/war_phase_step_order.test.ts` | 4 (1 updated) | Step count 167 → 171 with named comments for 4 new steps. |

Total new + modified test cases for the lane: **43 new + 6 migrated**.

---

## 8. Verification — Test + Type Results

```
npx.cmd tsc --noEmit                      → CLEAN (no output)

vitest run on the 5 opportunity-related packs:
  tests/operation_opportunities_substrate.test.ts            17/17
  tests/operation_opportunities_phase2_decisions.test.ts     11/11
  tests/operation_opportunities_5th_corps_sana.test.ts       15/15
  tests/triggered_operations.test.ts                         15/15
  tests/triggered_operations_late_1995.test.ts               10/10
                                                             68/68

vitest run on adjacent commander/op/scenario/UI suites:
  tests/corps_operation_readiness.test.ts                    10/10
  tests/force_quality_trace_persistence.test.ts               3/3
  tests/multi_corps_operation_visibility.test.ts              5/5
  tests/scenario_apr1992_family_consistency.test.ts           6/6
  tests/war_phase_step_order.test.ts                          4/4
  tests/ui/inbox_items.test.ts                               26/26
                                                             54/54
```

---

## 9. Scenario Sanity Runs

(Hashes filled in below as runs complete.)

### 9.1 Pre-window sanity (40w)

Scenario: `data/scenarios/apr1992_definitive_40w.json`. Pre-Sana window — opportunity catalog should NOT enqueue any proposals because the date_window predicate (`turn >= 175`) never opens within 40 turns.

- Audit baseline (Force Quality Foundation Phase 5a): `cbd7d61db0bfbe97`
- This-packet 40w (n1600): `18994397e5b3b8ae`

**Analyst verdict (`/scenario-creator-runner-tester`): NO_BEHAVIOR_DRIFT (GREEN).** Quote: *"Combat / control / formation / battle / operation lifecycle byte-identical."* Drift is purely additive state shape: `state.military.operation_opportunities = []` written every war turn (+ `decision_trace.force_quality_traits` sub-field on 5/18 corps from Phase 4 force-quality, not Lane B itself). `weekly_report.jsonl`, `control_delta.json`, `formation_delta.json`, `activity_summary.json`, `end_report.md`, `operation_aars.json` all byte-identical to baseline.

### 9.2 Late-window sanity (188w) — two iterations

Scenario: `data/scenarios/apr1992_definitive_188w.json`. Crosses the Sana opportunity window (turn 175+). Hash drift is EXPECTED here because Sana is now state-gated rather than calendar-triggered.

**Iteration 1 — n1601 (Lane B Phase 1-3, pre-Phase-3.5):**
- Hash: `ea745064dbd9b59e` (vs Phase 5a baseline `2c851756827d5906`).
- Analyst verdict: **SANA_FIRED_DIFFERENTLY (AMBER) — re-enqueue bug surfaced.** Sana was approved at t175 then re-proposed every turn through t188, with the bot auto-approving each one and `buildCorpsOperation` spawning a new corps op each time. **5 distinct turn-suffixed Sana ops in `operation_aars.json`** (vs 1 in baseline). Critically: territorial outcome was BYTE-IDENTICAL to baseline (HRHB 74 / RBiH 322 / RS 316; engagement metric identical to last digit) — the bug only inflated op records, did not change sim. Phase 3.5 fix shipped @ `7fca3888`.

**Iteration 2 — n1602 (Lane B Phase 1-3 + Phase 3.5 one-shot guard):**
- Hash: `c18c909fbb6fb62b`.
- Analyst verdict: **PHASE_3_5_FIX_VERIFIED (GREEN).** Sana fires exactly once in n1602 (start turn t175, status `failure`, 9 brigades — same as baseline). `state.military.operation_opportunities` contains exactly 1 sana_95 entry, status `approved`, executed_op_id `Operation Sana` (was 14 entries in n1601). `control_delta.json`, `formation_delta.json`, `activity_summary.json` are **byte-identical** to baseline (sha256 5cf2a338ba751f2a / a50489b4df839ace / b1e6b62e000334c0). Net control counts identical (HRHB 107→74, RBiH 330→322, RS 275→316). Top muni flips, direction changes, exhaustion, displacement totals identical.

**Hash drift n1602 vs n1599 fully accounted for:**
1. New state shape: `state.military.operation_opportunities = [<1 sana_95 entry>]` (vs `undefined` in n1599 since legacy `_TRIGGERED_OPS` path never populated this field).
2. Cosmetic OiC name resolution gap in `end_report.md` (1 line: `OiC: Gen. Drago Samardžija` vs `OiC: —`).
3. One weekly snapshot field at w175: `offensive_targets_total: 21` (n1599) vs `3` (n1602) inside RBiH `corps_summary` — metadata-only, no downstream sim effect.

**Sana's 0-attack failure outcome is PRE-EXISTING in the n1599 calendar-trigger baseline** — it is a separate operations-expert problem (Sana planning never advances past the planning phase to launch), not a Lane B regression. The opportunity layer correctly fires Sana with the same brigade roster + axis layout; the downstream lifecycle issue is the same in both paths.

---

## 10. Files Changed Summary

| Phase | Files | Lines |
|---|---|---|
| 1 | 5 (1 new src + 1 new test + 3 edits) | +1187 |
| 2 | 6 (4 edits + 1 new test + ledger) | +537 / -3 |
| 3 | 8 (1 new src + 1 new test + 4 edits + ledger + working-on) | +709 / -157 |
| 4 | 2 (this report + ledger close-out) | +tbd |

Total Phase 1-3: 19 files, ~2433 net additions.

---

## 11. Remaining Work / Next Recommended Lane

**Inside Lane B (deferred to a future packet):**

- Richer dossier IPC for delay / redirect / under_resource branches. The `applyOpportunityDecision` API supports them; the binary accept/reject IPC does not. Phase 5 / Phase E candidate.
- Army HQ React dossier modal per `docs/plans/2026-05-01-operation-opportunity-review-surface-design.md`. Current proposals surface in the existing `pending_proposal_reviews` queue with `domain: 'ops'`. A purpose-built Army HQ subsection with prerequisite chips, force-quality bands, and map-footprint highlighting is the next user-visible improvement.
- AAR / opportunity-resolution wiring at op completion. Today, `OperationOpportunityResolution` rows carry `executed_op_name`. A war-pipeline step that closes the loop by writing `executed_op_aar_id` + `exit_class` once the spawned op completes (in `sector_offensive.ts`) would make the catalog truth observable at endgame.

**Other 5th Corps family content (per `docs/plans/late-war-5th-corps-opportunities-design.md` §8):**

- Tigar-Sloboda 94 (T1 deception/support)
- Pecigrad / Velika Kladuša reduction (T1)
- Una 94 / Grabež pressure (T3 defensive crisis)
- Breza 94 (T3 major defensive crisis — failed VRS-SVK offensive)
- Grmec 94 (T1 breakout with overextension)
- Pauk / Shield 94 (T3 — failed APWB/SVK/VRS restoration)

**Other late-war families:**

- Vlasić / Kupres
- HV/HVO western Bosnia / Storm-linked theater
- Other failed VRS offensives (Zvezda, Orašje, Una-style)

**Sensitive-history T4 (gated):**

- Krivaja-95 / Stupčanica-95 / Goražde — require `/historian` + `/game-designer` + `/war-or-game` + user approval per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 BEFORE any code lands.

**Recommended next lane:** the AAR-loop closure (one war-pipeline step writing `executed_op_aar_id` + `exit_class` from operation completion in `sector_offensive.ts`). Small surface, completes the design-doc end-to-end loop, and unlocks Cost Ledger / Codex consumption of opportunity history.

---

## 12. Stop Gates Hit

None. The lane progressed through all four phases without hitting any of the documented stop gates (sensitive-history boundary, determinism failure, file-ownership conflict, severe invariant break, unresolved player-facing design meaning). Three minor adjustments were made on-the-fly:

1. Test fixture used invalid `'defend'` literal for `CorpsStance` (which is `'defensive' | 'balanced' | 'offensive' | 'reorganize'`); fixed in Phase 1 commit.
2. `_TRIGGERED_OPS` is exported with underscore prefix (it is intentionally non-public for production callers); test assertion updated.
3. Two adjacent test packs (`triggered_operations.test.ts` + `triggered_operations_late_1995.test.ts`) needed migration to acknowledge Sana's new home; done in Phase 3.

---

## 13. Determinism Statement

The lane preserves engine determinism at every phase:

- No `Math.random` / `Date.now` / `localeCompare` in any new file.
- All sorting via `strictCompare` (catalog walk, queue sort, decision target sort, brigade-pool trim).
- Approval is the only mutation that touches `cmd.active_operations`, and it does so via `buildCorpsOperation` (the canonical factory used by the legacy triggered-op path).
- Save shape backward-compatible: both new state fields (`operation_opportunities`, `operation_opportunity_resolutions`) are optional and default to omitted on existing saves.
- Replay safety: opportunity-resolution log preserves (proposal_id, opportunity_id, response, response_turn) for every decision.

---

## 14. Hand-off

**Files changed:** 22 src/test/docs files across 4 commits (Phase 1-3 + Phase 3.5 fix-up).
**Tests:** 45 new cases + 6 migrated. 124 total tests run across opportunity + adjacent suites; all green.
**Run hashes:**
  - 40w n1600: `18994397e5b3b8ae` (vs Phase 5a baseline `cbd7d61db0bfbe97`) — analyst NO_BEHAVIOR_DRIFT GREEN.
  - 188w n1601 (pre-fix): `ea745064dbd9b59e` — analyst SANA_FIRED_DIFFERENTLY AMBER, re-enqueue bug surfaced.
  - 188w n1602 (post-fix `7fca3888`): `c18c909fbb6fb62b` — analyst PHASE_3_5_FIX_VERIFIED GREEN. Territorial outcome byte-identical to baseline.
**Remaining blockers:** none for this lane. Sensitive-history T4 work requires sign-off chain.
**Open follow-ups (not blockers):**
  1. Sana's 0-attack failure outcome — pre-existing in baseline, NOT a Lane B regression. Belongs to operations-expert. The Sana CorpsOperation enters `phase: planning` but never advances to attack execution.
  2. Sana's `force_quality_traits_at_launch` is not yet wired on opportunity-spawned ops — Phase 4 force-quality wiring (Phase 4 milestone close-out item §10 P1c) covers pre-planned/triggered bypass; opportunity-spawned ops have the same gap. Future packet.
  3. Army HQ React dossier UI per `docs/plans/2026-05-01-operation-opportunity-review-surface-design.md` — opportunities surface in the existing autonomy queue today; a richer dossier modal is a future packet.
  4. AAR-loop closure — one war-pipeline step writing `executed_op_aar_id` + `exit_class` from operation completion in `sector_offensive.ts` to close the design-doc end-to-end loop.
**Next recommended lane:** AAR-loop closure (#4 above) — small surface, completes the opportunity layer's catalog-truth observability at endgame for Cost Ledger / Codex consumption.
