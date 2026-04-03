# 2026-04-03 - Officer quality frontline truth alignment

## Summary
- Replaced the brigade-posture frontline proxy in `updateBrigadeOfficerQuality(...)` with canonical sector-frontline truth whenever live `corps_front_sectors` data exists.
- Kept a narrow posture fallback only for compatibility cases where no live sector truth exists at all.
- Added focused regressions proving that sector assignment outranks posture and that the posture fallback only survives in no-sector compatibility states.

## Files changed
- `src/sim/combat/officer_quality_update.ts`
- `tests/officer_quality.test.ts`

## Why
- Officer-quality growth is a live war-turn mechanic, so letting it infer "frontline" from brigade posture created a second frontline authority inside progression.
- Sector assignment is now the runtime owner of frontline truth. If officer growth kept reading posture, the engine would still be rewarding stale or shell-era residue instead of canonical line assignment.

## Verification
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\officer_quality.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
