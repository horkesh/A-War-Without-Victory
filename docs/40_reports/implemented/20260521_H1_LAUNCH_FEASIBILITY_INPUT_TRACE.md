# H1 Launch Feasibility Input Trace

**Date:** 2026-05-21
**Result:** Watched-operation build blockers now preserve compact launch-feasibility power inputs.

## Summary

- Added optional `launch_feasibility_ratio`, `launch_attacker_power`, and `launch_defender_power` fields to watched-operation trace rows when `buildOperation(...)` fails launch feasibility.
- Kept the change diagnostic-only: operation behavior, objectives, OOB, launch thresholds, scenario data, and sensitive-history outcomes are unchanged.
- Updated the sensitive-history diagnostic to prefer concrete launched/blocked/not-launched trace rows over same-turn warning-only rows, while preserving warnings in `watched_operations.json`.

## 188w Evidence

Fresh run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1928` completed with final hash `c482c67ab918075c`.

| Operation | Blocker | Ratio | Attacker power | Defender power |
| --- | --- | ---: | ---: | ---: |
| Cerska-Kamenica | `build_defender_power_too_high` | 0.334 | 215.03 | 643.639 |
| Krivaja-95 | `build_defender_power_too_high` | 0.317 | 205.892 | 649.751 |
| Stupcanica-95 | `build_defender_power_too_high` | 0.138 | 169.937 | 1228.247 |

Krivaja-95 also preserves the separate `brigade_ineligible` warning row for `rs_skelani_battalion`.

## Determinism

The new fields are derived from the existing launch-feasibility calculation and rounded to three decimals before trace persistence. No randomness, wall-clock values, unordered filesystem reads, or behavior-affecting state changes were introduced.

## Next Owner

H1 is now narrowed to defender-power input attribution: inspect defender roster, terrain, supply, posture, entrenchment, and artillery suppression contributors before considering any report projection or behavior tuning.
