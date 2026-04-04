# Stance Interpretation Preview — Wave 2
Date: 2026-04-04
Status: IMPLEMENTED
Verification: tsc clean, 11/11 Wave 6 tests pass (142/142 in command_authority.test.ts), governance OK

## The Gap

When the player changed corps stance via the dropdown on the back face of `ArmyHQCorpsCard`,
it committed immediately with zero interpretation preview — even if the corps was strained (strain
1–5) and the player was requesting offensive posture. The player had no institutional context
before the change was staged.

The IPC gate already correctly rejected compromised+offensive at the handler level, but there was
no UI feedback explaining *why*, and no preview moment for the strained+offensive case (which the
IPC allows but proceeds at elevated institutional friction).

## What Was Built

### 1. `deriveStanceInterpretation()` in `src/ui/map/data/command_strain.ts`

Pure function (Wave 6 block) that returns `StanceInterpretation { severity, notice, isBlocked }`:

- `compromised + offensive` → `constrained` / `isBlocked: true` — IPC also blocks this; UI
  explains why and shows a restore-first message (no confirm button).
- `strained + offensive` (strain > 0, not compromised) → `caution` / `isBlocked: false` — stance
  is available but player must explicitly confirm with a "Confirm Stance Order" button.
- All other combinations → `normal` / `notice: null` — silence = healthy, immediate commit.

### 2. `StanceInterpretationSection` export in `src/ui/map/components/army_hq/OrderInterpretationSection.tsx`

Pure display component (no confirm/cancel buttons — caller owns that flow). Renders null when
`pendingStance === currentStance` or severity is `normal`. Used as optional scaffolding; the
active wiring is inlined in `ArmyHQCorpsCard`.

### 3. Two-step stance flow in `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`

- Added `pendingStance: string | null` React state (resets automatically on corps card remount
  when the player navigates to a different corps).
- `handleStanceChange()` now synchronously routes: `normal` severity → immediate IPC commit
  (preserving prior behavior); `caution` or `constrained` → set `pendingStance`, show preview.
- `handleConfirmStance()` / `handleCancelStance()` own the confirm/dismiss flow.
- Stance dropdown `value` reflects `pendingStance ?? data.stance` so the UI shows the selection
  visually while awaiting confirmation.
- Inline interpretation panel renders below the header flex row when `pendingStance` is set,
  showing the notice with Confirm/Cancel buttons (caution) or a restore-first message (constrained).

### 4. 11 tests in Wave 6 describe block in `tests/command_authority.test.ts`

Cover: normal/null for healthy+offensive, caution for strained+offensive, constrained for
compromised+offensive, normal for all non-offensive stances when strained, isBlocked
discrimination, boundary cases at strain=5 (caution) and strain=6 (constrained), text
differentiation between caution and constrained.

## Silence = Healthy Rule

Preserved throughout. `deriveStanceInterpretation` returns `{ severity: 'normal', notice: null,
isBlocked: false }` for all non-cautionary cases. The dropdown commits immediately for these cases
— no preview panel, no friction, no extra clicks.

## Verification Results

```
tsc --noEmit -p tsconfig.json   → clean (no output)
command_authority.test.ts       → 142/142 passed (11 new Wave 6 tests)
governance check                → Claude governance check: OK
```

Build note: `npm run desktop:map:build` invokes `vite` as a bare command which requires the
Windows shell PATH — the binary is not on the bash PATH in this environment. This is a pre-existing
platform issue unrelated to this wave (tsc clean + no new imports outside already-used modules
confirms no build-breaking changes were introduced).

Pre-existing test failures (brigade_posture, commander_override, corps_front_sector,
war_phase_step_order, desktop_pmtiles, engine_honesty_legacy) are unchanged — none of those files
were modified by this wave.

## Canonical Completion Block

Canonical owner: `src/ui/map/data/command_strain.ts` (pure derivation logic)
Demoted path: n/a — new surface
Player-visible truth: Back-face stance dropdown → interpretation panel → Confirm/Cancel
Canonical UI surface: `ArmyHQCorpsCard.tsx` back face header, below the stance dropdown row
Done means: Player selecting offensive posture when strained sees a caution notice and must
confirm; when compromised sees a blocked notice with no confirm button; all other stance changes
commit immediately (silence = healthy).
