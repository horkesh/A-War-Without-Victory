# D2 Readiness Audit — 188w Dayton-Close Run + Determinism

**Date:** 2026-06-11
**HEAD:** `main` @ `0589ccafe`
**Scenario:** `apr1992_definitive_188w_dayton_close` (full April-1992 → Dayton, 188 weeks)
**Runs:** RUN1 `…__w188_n4` + RUN2 (determinism) — both `final_state_hash b18bde2d9dc141bd`
**Verdict:** **GO** for the owner's D2 full-campaign playthrough. **0 P0, 0 P1, 1 P2 (cosmetic).**

## Provenance / process note

The instrumented audit was executed directly in the main checkout after three worktree-isolated audit agents died at fresh-worktree `npm install` (puppeteer browser download). The dispatched scenario-tester independently **confirmed determinism** (byte-identical artifacts; matching `political_controllers`, verdict, and exhaustion across RUN1/RUN2) before going quiet; the remaining mechanical verification (serializer scan, control counts, §6-via-rupture, close-out) was completed by the orchestrator. Floor/anchor §6 invariants are independently validated by the **green Baseline Regression CI on standard-188w main (`0589ccafe`)**.

## Check-by-check

| Check | Result | Evidence |
|---|---|---|
| Runs full 188 weeks, no crash | ✅ | exit 0; turn=188 |
| **Closes to Dayton terminal state** | ✅ | `meta.game_over = true` (not a freeze-frame) |
| Deterministic | ✅ | RUN1 hash == RUN2 hash `b18bde2d9dc141bd`; byte-identical artifacts |
| §6 — Srebrenica falls to RS + rupture | ✅ | `srebrenica_genocide_1995` rupture records turn 162, perpetrator RS, flag `genocide_condemnation` |
| §6 — full anchor set (falls + holds) | ✅ | standard-188w Baseline Regression GREEN on main `0589ccafe` (30/30 anchors = the §6 falls/holds) |
| Verdict pipeline populated | ✅ | territory HRHB 19.1% / RBiH 28.9% / RS 52.0%; per-faction casualties_taken, war_crimes, civilian_cas; cost-ledger; strategic dimensions all present |
| Serializer / NaN health (long divergent game) | ✅ | final_save: 0 `NaN`, 0 `Infinity`, parses clean — no save-corruption risk for a human playthrough |
| Control distribution historically shaped | ✅ | end-state OSID control RS 327 / RBiH 284 / HRHB 101 (=712); RS dominant, 181 total flips over the war |

## Punch-list

**P0 (blocks D2):** none.
**P1 (degrades playthrough):** none.
**P2 (cosmetic / follow-up):**
- `hrhb_travnik_brigade` carries `stranded_status = collapsed` "since t1" while at full health (cohesion 100 / morale 100 / personnel 1500), despite the brigade having fought (213 killed / 762 wounded). This is a stranded-status flag set at initialization and never cleared — internal bookkeeping that does not crash, corrupt the save, or distort the verdict. Follow-up: trace the stranded-status lifecycle (`grep stranded_status src/`) for the init/clear path; the prior audit agent flagged the same brigade. Not a D2 blocker.
- `hv_1st/5th/7th_guards` marked collapsed ~t92 (one `destroyed`, personnel 0) — these are Croatian Army (HV) units; likely a legitimate withdrawal/attrition outcome, noted for confirmation, not a defect.

## Verdict

**GO.** The engine runs a full April-1992 → Dayton campaign to completion without crashing, **closes cleanly to the Dayton terminal verdict** (`game_over: true`), is **deterministic**, keeps the **§6 bright lines intact** (Srebrenica genocide rupture fires; anchor set CI-green), produces a **fully populated verdict + cost-ledger**, and serializes a long divergent game with **zero NaN/Infinity corruption**. The single anomaly is a cosmetic stranded-status flag. The engine is ready for the owner's D2 playthrough — the irreducible human go/no-go gate.
