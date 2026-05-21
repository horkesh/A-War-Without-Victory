# H1 Launch Feasibility Input Trace

**Date:** 2026-05-21
**Result:** Watched-operation build blockers now preserve compact launch-feasibility power inputs, per-defender stacked-power contributions, and the modifier components behind each defender power value.

## Summary

- Added optional `launch_feasibility_ratio`, `launch_attacker_power`, `launch_defender_power`, and `launch_defender_power_by_id` fields to watched-operation trace rows when `buildOperation(...)` fails launch feasibility. Each defender row now includes a compact `breakdown` object for the final defender-power multipliers.
- Kept the change diagnostic-only: operation behavior, objectives, OOB, launch thresholds, scenario data, and sensitive-history outcomes are unchanged.
- Updated the sensitive-history diagnostic to prefer concrete launched/blocked/not-launched trace rows over same-turn warning-only rows, while preserving warnings in `watched_operations.json`.

## 188w Evidence

Fresh run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1931` completed with final hash `3099a5fabaa04d6b`.

| Operation | Blocker | Ratio | Attacker power | Defender power | Objective | Primary defender | Defender count |
| --- | --- | ---: | ---: | ---: | --- | --- | ---: |
| Cerska-Kamenica | `build_defender_power_too_high` | 0.334 | 215.03 | 643.639 | `op:srebrenica:brezovice_2` | `arbih_280th_east_bosnian_light` | 4 |
| Krivaja-95 | `build_defender_power_too_high` | 0.317 | 205.892 | 649.751 | `op:srebrenica:bostahovine_2` | `arbih_280th_east_bosnian_light` | 4 |
| Stupcanica-95 | `build_defender_power_too_high` | 0.138 | 169.937 | 1228.247 | `op:rogatica:zepa_2` | `arbih_1st_cerska` | 3 |

Cerska-Kamenica and Krivaja-95 are blocked against the same persisted defender roster: `arbih_280th_east_bosnian_light`, `arbih_281st_east_bosnian_light`, `arbih_283rd_east_bosnian_light`, and `arbih_284th_east_bosnian_light`. Stupcanica-95 is blocked against `arbih_1st_cerska`, `arbih_282nd_east_bosnian_light`, and `arbih_285th_light`.

Krivaja-95 also preserves the separate `brigade_ineligible` warning row for `rs_skelani_battalion`.

## Defender Contributions

The trace now preserves raw defender power and the stacked contribution used by launch feasibility. Secondary defenders use the existing `STACKING_DEFENDER_SUPPORT` contribution, so the row names both the formation roster and the power that actually binds the launch check.

| Operation | Formation | Raw power | Stacked contribution |
| --- | --- | ---: | ---: |
| Cerska-Kamenica | `arbih_280th_east_bosnian_light` | 338.758 | 338.758 |
| Cerska-Kamenica | `arbih_281st_east_bosnian_light` | 338.758 | 101.627 |
| Cerska-Kamenica | `arbih_283rd_east_bosnian_light` | 338.758 | 101.627 |
| Cerska-Kamenica | `arbih_284th_east_bosnian_light` | 338.758 | 101.627 |
| Krivaja-95 | `arbih_280th_east_bosnian_light` | 341.974 | 341.974 |
| Krivaja-95 | `arbih_281st_east_bosnian_light` | 341.974 | 102.592 |
| Krivaja-95 | `arbih_283rd_east_bosnian_light` | 341.974 | 102.592 |
| Krivaja-95 | `arbih_284th_east_bosnian_light` | 341.974 | 102.592 |
| Stupcanica-95 | `arbih_1st_cerska` | 1080.063 | 1080.063 |
| Stupcanica-95 | `arbih_282nd_east_bosnian_light` | 329.375 | 98.812 |
| Stupcanica-95 | `arbih_285th_light` | 164.571 | 49.371 |

## Modifier Breakdown Findings

The modifier trace shows the Srebrenica stack is not blocked by supply, home-distance, fatigue, disruption, corps stance, or equipment-quality multipliers; those are all `1.0` for the East Bosnian defenders. The binding contributors are base power `155.754`, posture `1.2`, entrenchment (`1.132` for Cerska-Kamenica and `1.143` for Krivaja-95), terrain-class `1.575`, final environment cap (`1.387` / `1.4`), morale `1.065`, officer `1.228`, and front-density `0.778`.

Stupcanica-95 is dominated by `arbih_1st_cerska`: base power `457.602`, posture `1.2`, entrenchment `1.147`, terrain-class `1.47`, final environment cap `1.518`, morale `1.065`, officer `1.228`, front-density `0.8`, and per-brigade terrain bonus `1.15`. The two secondary defenders have lower base power and no per-brigade terrain bonus, then contribute only through `STACKING_DEFENDER_SUPPORT`.

## Determinism

The new fields are derived from the existing launch-feasibility calculation and rounded to three decimals before trace persistence. Defender contribution rows are sorted by descending stacked power and then formation id. Breakdown objects contain only already-computed deterministic multipliers. No randomness, wall-clock values, unordered filesystem reads, or behavior-affecting state changes were introduced.

## Next Owner

H1 is now narrowed past attribution into decision: the trace identifies which components are active. Next work should decide whether any of posture, entrenchment, terrain class, final environment compression, officer, morale, front density, or the `arbih_1st_cerska` per-brigade terrain bonus are historically over-stating the watched-operation defense before considering report projection or behavior tuning.
