# Engine D2-READY declaration (engine-health pivot complete)

**Status:** DECLARED 2026-06-11; SUPERSEDED FOR SCHEDULING 2026-07-07. Authority: Pyrrhic Panel B verdict (delegated owner signature). The engine-health pivot remains complete for 1.0; current scheduling now runs through WP-9 owner friction diaries before the **D2 full-campaign playthrough**.

## Verdict (Pyrrhic Panel B, 2026-06-11)
> "Ship Fix B, then declare the engine D2-ready and schedule the playthrough — the dead_ops=32 ceiling is already guarded, EH-3 fix(b) is a post-D2 lane, and the highest-value move for 1.0 is getting a full campaign played start→Dayton, not more engine polish."

(Fix B was subsequently DROPPED as redundant — both its conditions are already engine-blocked: `op_empty` for all-owned ops, `war_phases.ts:306/353` reject for below-floor; promoting the per-axis warnings would over-block partial ops. So we go straight to the headline: declare D2-ready.)

## Engine-health state (the evidence)
- **Territory floor 658/712** (188w), **30/30 anchors PASS**, **§6 intact** (Srebrenica RS, Žepa RS, Goražde/Bihać/Teočak RBiH, rupture timing) — held across the entire pivot.
- **Engine-health baseline of record (188w), now measured + CI-gated:** `{zero_eligible_ops 1, dead_ops 32, ghost_destroyed 2, stranded 4, consistency_failures 3, matched_osids 658, K:W 3.85}`. The `engine_health_gate.cjs` ratchets these; the advisory `engine-health-188w` CI job (#424) guards them on every sim-touching PR — closing the 188w blind spot that let EH-3's −39 pass anchors.
- **Determinism intact** (no Math.random/Date.now in sim; platform-stable integer metrics).
- Reaffirms the earlier **D2-readiness audit GO** (188w dayton-close, deterministic, §6 intact, 0 NaN — Tier-1 replay-wire #413).

## Engine-health pivot scorecard (2026-06-11)
| Lane | Outcome |
|---|---|
| EH-1a — puppeteer agent-death fix | ✅ shipped (62d9b68c) |
| EH-1b — engine_health_gate.cjs | ✅ shipped (#423) |
| EH-1b CI — engine-health-188w advisory job | ✅ shipped (#424) |
| EH-2 — MC-leak fix | ✅ shipped (#421, MC −22%) |
| EH-3 — stranded-lifecycle cleanup | ❌ NO-GO, documented (field is load-bearing, −39) |
| EH-4 — dead_ops=32 | 🔬 diagnosed, guarded; Fix A deferred, Fix B dropped-redundant |
| EH-3 fix(b) — sector-geometry/displaced | 🅿️ post-D2 lane |

The pivot's goal was never to drive every metric to zero — it was to make the engine **observable and guarded** so D2 doesn't discover unknown catastrophic failure modes. That goal is met.

## What "D2-ready" means / next action
- The engine is ready for the **D2 playthrough**: a full campaign played start→Dayton — the TRUE remaining 1.0 blocker (no full campaign has been played end-to-end yet; D2 = go/no-go).
- **D2 is owner-only and now diary-gated by the 2026-07-07 command-board supersession.** No agent action remains on the engine-health track; current pre-D2 action is owner friction diaries using `docs/40_reports/playtests/TEMPLATE.md`.
- Post-D2: full doc-sync sweep (DoD/MASTER_ROADMAP/canon to reality), then any D2-surfaced fixes, then the remaining parked lanes (EH-3 fix(b), EH-4 Fix A, enclave OVERRUN/CONTAIN #6, Teočak #9) prioritized by what D2 reveals.

## Parked/deferred (post-D2, by panel)
- **EH-4 Fix A** (idle-abort dwelling ops) — the real dead_ops lever; deferred (EH-3 trap: N unknown, op-lifecycle floor-load-bearing; guarded at ceiling 37 meanwhile).
- **EH-3 fix(b)** (sector-geometry / displaced-not-destroyed brigades) — historically correct but a deep Central-Bosnia calibration lane with §6 enclave-suppression; post-D2.
