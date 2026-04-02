# 2026-04-02 - Compatibility shell truth hardening

## Summary

Removed another small but dangerous layer of false authority from the player shell and its contracts. The browser fallback used by `dev:map` was still seeding dead front/theatre-era fields into mock state, and the schema / desktop IPC contract still described compatibility residue too casually. This made front assignment, theatres, and old AoR-cap behavior look more current than they really are.

This pass:

- stopped browser fallback campaign loading from seeding `brigade_front_assignment`, `army_theatre_assignment`, and `theatres`
- hardened `GameState` comments so those fields are explicitly described as compatibility-only residue
- removed the stale `set-brigade-desired-aor-cap` section from the desktop IPC contract
- locked the new truth in `engine_honesty_legacy_contracts.test.ts`

## Why this matters

In AWWV, the most dangerous legacy concepts are often the ones that still look alive to future implementers. A mock state that seeds old front/theatre fields or a contract doc that still advertises a retired bridge teaches the next agent that those concepts remain part of the live shell. That becomes a source of new bugs even if the old system no longer drives gameplay.

## Files changed

- `src/ui/map/desktop/campaignRecruitmentActions.ts`
- `src/state/game_state.ts`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `tests/engine_honesty_legacy_contracts.test.ts`

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\engine_honesty_legacy_contracts.test.ts tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Result

The live player shell and the docs now agree more honestly about these compatibility-era fields:

- `assignable_front_segments` = compatibility snapshot
- `brigade_front_assignment` = legacy fallback only
- `theatres` / `army_theatre_assignment` = compatibility residue, not live shell authority
- `brigade_desired_aor_cap` = legacy AoR tuning field, not an active desktop command surface

That makes the repo safer for future cleanup and less likely to regress through “helpful” reintroductions of dead concepts.
