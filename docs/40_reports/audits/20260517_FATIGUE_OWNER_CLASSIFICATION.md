# Fatigue Owner Classification

Date: 2026-05-17

## Diagnostic Baseline

Diagnostic: `tools/diagnostics/fatigue_distribution_audit.cjs`

| bucket | n1740 mean | n1740 pct_zero | n1741 mean | n1741 pct_zero | classified source |
|---|---:|---:|---:|---:|---|
| sector_front | 0.275 | 94.944 | 0.000 | 100.000 | n1740 non-zero residue is combat-driven; n1741 has no final-save residue |
| sector_reserve | 0.000 | 100.000 | 0.000 | 100.000 | none |
| sector_rear | 0.000 | 100.000 | 0.000 | 100.000 | none |
| operation_participant | 0.000 | 100.000 | 0.000 | 100.000 | none |
| engaged_this_turn | 0.091 | 90.909 | n/a | n/a | combat-driven |
| unassigned | n/a | n/a | 0.000 | 100.000 | none |

Notes:
- n1740 read `replay_save_sequence.json` directly: 40 weekly snapshots, final hash `86ebf26ae0271465`.
- n1741 replay is 1,004,403,335 bytes, so the diagnostic used deterministic final-save fallback: final hash `a4bf8b8095050881`.
- At n1741 final, 99 of 194 front-assigned active formations had a last engagement within 80 turns, while all front fatigue values had recovered to zero.

## Owner Selected

Owner D: winter / war-exhaustion modulation.

Mechanism: late-war exhausted factions should not erase every trace of recent combat fatigue. The bounded lever is a small fatigue residue floor for recently combat-engaged active formations once the late-war window is reached and faction `political.war_exhaustion` is high. This leaves global `FRONTLINE_FATIGUE_PER_TURN`, `FATIGUE_RECOVERY_INTERVAL`, `FATIGUE_MAX`, and combat-power math untouched.

Expected effect:
- 40w: no effect, because the lever is late-war gated.
- 188w: sector-front `pct_zero` should drop versus n1741 without dropping below the 30% stop gate. Target band: 40-70% sector-front zero fatigue at final save.

## Non-Goals

- No global fatigue multiplier.
- No isolated changes to `FRONTLINE_FATIGUE_PER_TURN`, `FATIGUE_RECOVERY_INTERVAL`, or `FATIGUE_MAX`.
- No `getFatigueMult()` combat-power retune.
- No supply, paramilitary, RBiH-HRHB, strict-null, FORAWWV, or global calibration-doc edits in this lane.

## Design Gate

User handoff authorized the implementer to choose and implement the bounded lever unless sensitive-history stop gates trip. Chosen owner: D. Expected band: final 188w `sector_front.pct_zero` improves from 100.000 into 40-70%, with a hard stop below 30%.
