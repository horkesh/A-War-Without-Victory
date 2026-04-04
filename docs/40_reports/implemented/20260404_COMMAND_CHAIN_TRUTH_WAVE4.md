# Command Chain Truth Wave 4 — Regression Gates Expansion + Canon/Roadmap Propagation

**Date:** 2026-04-04
**Lane:** Command Chain Truth (v0.8.0.x stabilization) — **CLOSED**
**Wave:** 4 of 4 (final wave)
**Type:** Tests + doc updates only. No simulation logic changed, no GameState fields added.

---

## What Was Delivered

### Work Item 1 — 3 gap-filler regression tests

File: `tests/sector_frontline_truth_wave4.test.ts` (7 tests across 3 describe blocks)

#### Test A — `assertBrigadeReachability` topology stress (2 tests)

**Invariant:** When brigades are in components disconnected from the sector's component, `assertBrigadeReachability` returns all of them as unreachable. Brigades in the same component as the sector are not flagged.

Setup: 3 disconnected components. Sector in component 0 (OSIDs A/B/C). Two brigades at OSID A (component 0 — reachable). One brigade at OSID D (component 1 — unreachable). One brigade at OSID F (component 2 — unreachable). All 4 listed in `sector.assigned_brigade_ids`.

Pass condition: `assertBrigadeReachability` returns exactly `['brig_c1_1', 'brig_c2_1']`. Same-component brigades not in the result.

Second test: two sectors in different components; cross-assigned brigades (each sector has one brigade from the wrong component). Both cross-assigned brigades flagged, both correctly-placed brigades clean.

#### Test B — Adapter re-assignment fidelity across turns (3 tests)

**Invariant:** When a brigade moves from `seg_old` to `seg_new` between turns (sector `sub_segments` updated), the adapter's canonical reverse-map derivation reads the new assignment, not the stale formation field.

Setup: T2 state where `seg_old.primary_brigade_ids = []` and `seg_new.primary_brigade_ids = ['brig_mobile']`. Formation field still says `'seg_old'` (stale).

Pass: derived `assigned_sub_segment_id = 'seg_new'` (canonical wins). Stale field `'seg_old'` not returned.

Additional cases:
- Reserve brigade not in any sub-segment: formation field used as fallback (correct).
- Demoted brigade with cleared formation field + absent from sub-segments: result is `undefined` (no ghost assignment survives).

#### Test C — Proxy/canonical `pressure_eligible_size` parity (2 tests)

**Invariant:** `console.warn` fires on the proxy path (no sector truth) and not on the canonical path. Proxy path is at least as permissive as canonical for identical contact graph (proxy `pressure_eligible_size >= canonical`).

Setup: identical contact graph `[{a: 'op:mun:osid_a', b: 'op:mun:osid_b'}]` with opposing controllers. State A: `corps_front_sectors = {}` (proxy path). State B: one live sector with matching edge ID (canonical path).

Pass: `console.warn` with legacy-fallback message fires for A only. `resultA.report.pressure_eligible_size >= resultB.report.pressure_eligible_size`.

Second test confirms proxy path produces `pressure_eligible_size = 1` for a single opposing pair — the guard is not vacuously passing.

---

### Work Item 2 — Doc propagation (4 updates)

#### 2a. `docs/plans/MASTER_ROADMAP.md`
Added "COMPLETE 2026-04-04 (Waves 1–4)" note under the immediate engine-health lane entry in the v0.8.0 section. Summary of what was delivered and lane closure stated.

#### 2b. `docs/plans/2026-04-03-v080x-sector-frontline-truth-plan.md`
- Status line updated: `PLAN - READY FOR EXECUTION` → `COMPLETE — all 6 phases landed (Waves 1–4, 2026-04-04)`
- All 6 phase headers updated with wave + date stamps
- All `[ ]` checkboxes in phases 1–6 marked `[x]`

#### 2c. `docs/40_reports/SECTOR_MASTER.md`
Appended new section `## 2026-04-04 — Command Chain Truth Hardening (Waves 1–4)` with 7 bullets covering: Phase 1.5 guard, assertBrigadeReachability contract, demotion sub-segment clear, adapter canonical-first derivation, proxy-fork observability, activity zero-fill, regression gate count. Lane closure stated.

#### 2d. `.claude/architect_notes.md`
"Next Priority Lanes" item 1 updated from `ACTIVE` to `CLOSED 2026-04-04`. Expanded to include Wave 4 summary, test count (29), canonical owner, demoted path, and Wave 5 CI-integration candidates noted as minor future hardening (not a lane re-open).

---

## Verification

```
npx.cmd tsc --noEmit -p tsconfig.json          → clean (no errors)
npm run test:vitest -- tests/sector_frontline_truth_wave4.test.ts
                                                → 7/7 pass
npm run test:vitest -- tests/sector_frontline_truth_wave1.test.ts
                       tests/sector_frontline_truth_wave2.test.ts
                       tests/sector_frontline_truth_wave3.test.ts
                                                → 22/22 pass
powershell -File scripts/repo/check_claude_governance.ps1
                                                → Claude governance check: OK
```

Total regression tests across all 4 wave files: **29 tests**.

---

## Lane Closure Statement

The Command Chain Truth package (v0.8.0.x stabilization lane) is **CLOSED** as of 2026-04-04.

```
Canonical owner:    corps_front_sectors and its truthful downstream consumers
Demoted path:       legacy proxy/fallback paths removed or explicitly compatibility-only
Player-visible truth: frontline reports, Army HQ summaries, and diagnostics match
                      actual sector/frontline state instead of proxy reconstruction
Canonical UI surface: Army HQ / reporting summaries consume sector truth;
                      tactical map visualizes it; neither invents a second definition
Done means:         29 regression tests across waves 1–4 lock all invariants I1–I9.
                    SECTOR REACHABILITY INVARIANT VIOLATION warnings are diagnostic-honest
                    (only fire for genuinely unreachable brigades, not false assignments).
                    No remaining silent proxy surfaces in the reporting pipeline.
```
