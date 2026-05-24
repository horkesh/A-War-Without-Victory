# Personnel Trait Chips

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Army HQ Personnel now surfaces existing authored officer `command_style` and `known_for` fields as compact trait chips.
- The chips are read-only UI presentation: `command_style` becomes a doctrinal trait and `known_for` becomes a narrative trait.
- No new officer history, behavior, save schema, scenario data, or simulation tuning was added.

## Changes Made
### Personnel UI
- Active officer roster rows now render compact trait chips under the officer rank/corps line when authored fields exist.
- The presentation uses bounded inline chips so roster rows remain scan-friendly.

### Tests
- Extended the existing officer mini-bio UI test to assert Personnel roster trait surfacing.

## Verification
- Red/green: `npx.cmd vitest run tests\ui\officer_mini_bio.test.ts --reporter=dot` failed before implementation on missing Personnel trait text, then PASS 5/5 after implementation.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/PersonnelContent.tsx` | Renders doctrinal/narrative trait chips from existing officer fields. |
| `tests/ui/officer_mini_bio.test.ts` | Adds Personnel trait-chip regression coverage. |

## Next Steps
- Officer character work can now move from surfacing to content breadth: additional historically reviewed traits/mini-bios for officers beyond the first-pass opening commanders.
- Do not wire these traits into commander behavior without a separate design/canon lane.
