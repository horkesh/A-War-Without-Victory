# Operation Outcome Category — Wave 3
Date: 2026-04-04
Status: IMPLEMENTED
Verification: tsc clean, 8/8 Wave 7 tests pass, governance OK

## The Gap

`CommandRecord` in `OperationBriefingModal.tsx` previously distinguished only two
outcome tiers for a launched operation:

- `was_force_launched=true` → "⚠ Overrode Command Chain"
- all other cases → "Approved"

This collapsed two meaningfully different situations into a single "Approved" label:

1. **Ordinary compliance** — commander said launch, president approved. Normal channel.
2. **Reluctant compliance** — commander said postpone/abort, but president launched anyway
   via ordinary approval (no CA spent, no Direct Intervention flag).

The reluctant compliance case was invisible to the player in the post-decision record.
A president who routinely overrode commander judgment without spending CA had no
institutional record of it.

## What Was Built

### `deriveOperationOutcomeCategory()` — `src/ui/map/data/command_strain.ts` (Wave 7 block)

Pure derivation function. Takes `assessmentAtLaunch` and `wasForce`, returns one of
three `OperationOutcomeCategory` values. Priority order: `wasForce` is checked first
(direct_intervention), then reluctant assessment (reluctant_compliance), then default
(ordinary_compliance). No side effects. Exported type `OperationOutcomeCategory`.

### Enriched `CommandRecord` — `src/ui/map/components/OperationBriefingModal.tsx`

The "Presidential Decision" row now uses `deriveOperationOutcomeCategory` to select
one of three display tiers. The reluctant_compliance tier adds an Interpretation row
explaining which recommendation was overridden. The CA cost row and institutional strain
follow-through remain gated on `wasForce` only — no CA was spent on reluctant compliance.
The `ForceLaunchBadge` legacy fallback is unchanged.

The "⚠ Overrode Command Chain" badge text updated to "⚠ Direct Intervention" to match
canonical terminology from `PRESIDENTIAL_COMMAND_DOCTRINE.md`.

## Three Outcome Tiers

| Category | Badge | Condition |
|---|---|---|
| `direct_intervention` | ⚠ Direct Intervention (amber bold) | `wasForce=true` |
| `reluctant_compliance` | Approved Against Recommendation (amber light) | `assessmentAtLaunch ∈ {postpone,abort}` AND `wasForce=false` |
| `ordinary_compliance` | Ordinary Compliance (green) | `assessmentAtLaunch=launch` or null/undefined, `wasForce=false` |

`direct_intervention` takes priority: if `wasForce=true`, that tier is shown regardless
of `assessmentAtLaunch`.

## Silence = Healthy Rule

`ordinary_compliance` shows a clean green badge with no explanation row. The player
sees confirmation of the clean path with no institutional noise. Only the two
non-ordinary tiers add explanation text.

## Wave Surface Boundary

- `CommandRecord` = post-decision record, shown during `execution`/`recovery` phases.
- `OrderInterpretationSection` (Wave 5) = pre-decision context, shown during `planning` phase only.
- These answer different questions at different moments. Not mixed.

## Pre-existing Test Failures (documented, not fixed)

- `tests/brigade_posture.test.ts` — 12 tests, brigade posture application functions
- `tests/commander_override.test.ts` — 4 tests, commanderReviewAssignment
- `tests/corps_front_sector_corps_ownership.test.ts` — 1 test, sector corps ownership
- `tests/desktop_pmtiles_protocol_route.test.ts` — 1 test, pmtiles routing
- `tests/engine_honesty_legacy_contracts.test.ts` — 1 test, legacy theatre schema
- `tests/war_phase_step_order.test.ts` — 1 test, step count (expected 153, got 148)

All causally disconnected from `command_strain.ts`, `OperationBriefingModal.tsx`, and
`command_authority.test.ts`.

## Verification Results

- `npx tsc --noEmit -p tsconfig.json` — clean (0 errors)
- `npm run test:vitest tests/command_authority.test.ts` — 150/150 pass (8/8 Wave 7)
- `npm run test:vitest` (full suite) — 2084 pass, 20 fail (all pre-existing)
- `check_claude_governance.ps1` — OK
- `desktop:map:build` — skipped (pre-existing platform limitation: vite not on PATH in bash shell on this machine)

## Canonical Completion Block

```
Canonical owner:       src/ui/map/data/command_strain.ts (deriveOperationOutcomeCategory)
                       src/ui/map/components/OperationBriefingModal.tsx (CommandRecord enrichment)
Demoted path:          two-tier Approved/Overrode display demoted to three-tier
Player-visible truth:  player now sees ordinary_compliance / reluctant_compliance / direct_intervention
                       clearly distinguished in the Command Record
Canonical UI surface:  OperationBriefingModal CommandRecord — execution/recovery phases only
Done means:            tsc clean + 8/8 Wave 7 tests pass + governance OK
```
