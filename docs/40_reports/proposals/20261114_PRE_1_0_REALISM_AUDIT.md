# Pre-1.0 realism audit: what a 1992-95 commander would find absurd

**Date:** 2026-11-14
**Scope:** read-only audit of `main` at `0450a2e8d` for realism defects, hidden railroads and dead mechanics before 1.0. No code, data or calibration changed.
**Lenses:** War-or-Game (lead), Railroad Hunter, Gap Finder, Historian (ICTY first, Balkan Battlegrounds second).
**Excluded:** everything already in `F:/AWWV-coordination/crash_recovery_20261112/out_of_scope_findings.md` and everything settled in project memory (cohesion floors, RS brigade-destruction asymmetry, HVO passivity, EH-3 `stranded_status`, `strategic_depth`, sectors as standing OGs, the parked operation planner, Usora HVO under the ARBiH 3rd Corps). Known items that are still live and have no owning lane are listed separately in §4 with fresh numbers.

## 1. The run

| Item | Value |
|---|---|
| Command | `npm run sim:scenario:run:188w` (headless, bots historical) |
| Commit / tree | `0450a2e8d`, `git_dirty: false`, Node 22.23.2 |
| Run directory | `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n0` (machine-local; `runs/` is gitignored) |
| Final state hash | `0ec6d6112fd0e954` |
| Checkpoints (`tools/verify_checkpoints.cjs`) | Jan93 712 / Apr94 711 / Apr95 711 / Oct95 710, the same as main's recorded floor |
| Anchors, guards | 31/31 anchors; enclave guard holds (Srebrenica and Žepa fall on schedule); Farz P-A and P-B pass |

Data used: `final_save.json` (`turn_summaries`, `political.control_events`, `military.formations[*].brigade_history`, casualty ledger, displacement aggregates, enclave resilience), `operation_aars.json` (71 operations), `weekly_report.jsonl` (188 weeks of operation diagnostics, supply and exhaustion), `run_summary.json`, `brigade_temporal_log.jsonl`. Years below use the sim calendar: 1992 = weeks 0-38, 1993 = 39-90, 1994 = 91-142, 1995 = 143-187.

## 2. Ranked findings

<!-- RANKED_TABLE -->

## 3. Findings in detail

<!-- DETAIL -->

## 4. Known, still live, no owning lane (re-measured, not new)

<!-- KNOWN -->

## 5. Checked and not raised

<!-- CHECKED -->

## 6. What a commander would recognise

<!-- POSITIVE -->

## 7. Method notes and traps

<!-- METHOD -->
