# H1 Trace-Backed 188w Packet

**Date:** 2026-05-21
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1929`
**Final hash:** `61cf4c64879efe14`
**Verdict:** OPEN_P0

## Summary

The fresh 188w run was generated after watched-operation lifecycle trace persistence. H1 no longer depends on source-scan inference for Cerska-Kamenica, Krivaja-95, or Stupcanica-95: all three now have persisted lifecycle rows in `watched_operations.json`.

This remains diagnostic evidence only. No operation objectives, OOB, launch tuning, or scenario data changed in this packet.

## Run Health

- Scenario completed successfully.
- Anchor checks: 27/27 PASS.
- `srebrenica_falls_1995`: fired at turn 162.
- `zepa_falls_1995`: fired at turn 164.
- `srebrenica_genocide_1995`: not fired.

## Watched Operation Evidence

| Operation | Trace status | Canonical window | Blocker evidence | Launch inputs | Defender attribution | AAR | Delivery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cerska-Kamenica | catalog-present, not launched | 40 | `build_defender_power_too_high` at turn 188 | ratio 0.334; attacker 215.03; defender 643.639 | `op:srebrenica:brezovice_2`; primary `arbih_280th_east_bosnian_light`; 4 defenders | not visible | unknown |
| Krivaja-95 | catalog-present, warning plus no-launch trace | 170-178 | `build_defender_power_too_high` at turn 188; separate `brigade_ineligible` warning for `rs_skelani_battalion` | ratio 0.317; attacker 205.892; defender 649.751 | `op:srebrenica:bostahovine_2`; primary `arbih_280th_east_bosnian_light`; 4 defenders | not visible | unknown |
| Stupcanica-95 | catalog-present, not launched | 172-180 | `build_defender_power_too_high` at turn 188 | ratio 0.138; attacker 169.937; defender 1228.247 | `op:rogatica:zepa_2`; primary `arbih_1st_cerska`; 3 defenders | not visible | unknown |

The key change from the pre-trace packet is that Cerska-Kamenica and Stupcanica-95 are no longer merely catalog-present by source fallback; they are persisted runtime rows. Krivaja-95 also preserves the typed `brigade_ineligible` validation warning in the trace artifact instead of relying only on `op_injection_warnings`.

## H1 Interpretation

H1 remains open because none of the three watched operations produce a visible operation AAR or delivered capture. The owner is now narrower than before: `buildOperation(...)` reaches launch-feasibility evaluation, then fails the defender-power predicate for Cerska-Kamenica, Krivaja-95, and Stupcanica-95 in the 188w state after their windows. Krivaja additionally has a concrete formation eligibility warning: `rs_skelani_battalion` is present but inactive with zero personnel.

Do not tune operation outcomes yet. The next implementation lane should attribute the defender-power modifiers for these triggered operations, especially terrain, supply, posture, entrenchment, local density, fatigue, home-distance, morale, and artillery suppression contributors, before deciding whether report projection, formation eligibility, axis construction, or behavior tuning owns the next fix.

## Verification

- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs` PASS.
- `node tools\diagnostics\sensitive_history_status.cjs --json runs\apr1992_definitive_188w__210e69404d054959__w188_n1929` PASS.
- `watched_operations.json` present with six deterministic rows, including Krivaja `brigade_ineligible`, `build_defender_power_too_high`, launch-feasibility power evidence, objective OSIDs, and defender roster evidence.
