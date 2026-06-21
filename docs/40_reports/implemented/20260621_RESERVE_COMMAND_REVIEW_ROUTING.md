# Reserve Command-Review Routing

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Tightened Presidential Decision Room ownership for Army Reserve requests.
- Reserve requests with a concrete `suggested_brigade_id` remain Decision Room command-review cards and carry the `elite_deploy` directive.
- Reserve requests without a staff-named brigade no longer create no-directive Decision Room command cards; they remain in the Army Reserve staff-selection flow.

## Changes Made
- `addCommandPersonnelCards(...)` now skips player reserve requests that do not name a brigade to release.
- The remaining elite-deploy cards always carry a concrete directive payload and still preserve Army HQ Personnel as `sourceHandoffTarget`.
- The Decision Room regression test now pins both sides of the split: `reserve_alpha` routes through the Decision Room command lens, while `reserve_beta` is absent from the Decision Room.

## Verification
- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui\presidential_decision_room.test.ts --pool=forks --reporter=dot` failed before implementation because `command:elite-deploy:reserve_beta` still appeared.
- Green focused proof: `node node_modules\vitest\vitest.mjs run tests\ui\presidential_decision_room.test.ts --pool=forks --reporter=dot` passed 39/39.
- Broader reserve/decision-surface proof: `node node_modules\vitest\vitest.mjs run tests\ui\presidential_decision_room.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\decision_surface_registry.test.ts tests\ui\inbox_items.test.ts tests\ui\decision_family_modals.test.ts tests\ui\inbox_dedup.test.ts --pool=forks --reporter=dot` passed 104/104.
- `npm.cmd run typecheck` passed.

## Determinism / Scope
- UI read-model/test/docs polish only.
- No simulation logic, scenario data, reserve mechanics, Inbox derivation, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, randomness, timestamps, packaged installer artifact, or persisted output ordering changed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/presidentialDecisionRoom.ts` | Emits elite-deploy Decision Room cards only when the reserve request has a concrete suggested brigade. |
| `tests/ui/presidential_decision_room.test.ts` | Pins concrete reserve deployment as Decision Room command review and no-brigade reserve selection as absent from Decision Room. |
