# Presidential Command Friction — Wave 4
**Date:** 2026-04-04
**Branch:** main

## Mission

Complete the command-friction loop by adding two coupled slices:

1. **Stabilize Command Relationship** — presidential action that resolves ALL unresolved friction events at once. Costs Command Authority. 3-turn cooldown.
2. **Strain-gated stance** — offensive stance disabled when command is compromised (strain ≥ 6). IPC-side validation + UI disable.

Together with Wave 3 (one-by-one acknowledgement), the player now has a fast path (Stabilize, pay CA) and a slow path (acknowledge each event individually). Both reduce strain through the same existing `resolved: true` mechanism — no fake modifiers, no new strain pathways.

## Phase A — Final Model Decision

### `command_authority` confirmed present on GameState

```
state.military.command_authority: CommandAuthority { current, max, spent_this_turn, lifetime_spent }
```

CA system is live and used by the force-launch handler. Wave 4 uses the same deduction pattern.

### Model chosen

| Condition | CA cost |
|-----------|---------|
| Strained (strain 1–5) | 10 CA |
| Compromised (strain ≥ 6) | 15 CA |
| No CA system on state | 0 (still resolves events) |

Cooldown: `stabilization_cooldown_until = currentTurn + 3` on `CorpsCommandState`.

### COMPROMISED_THRESHOLD confirmed

`COMPROMISED_THRESHOLD = 6` in `command_strain.ts`. Stance gate applies at exactly this boundary.

## Phase B — Implementation

### B0: `CorpsCommandState` extension (`game_state.ts`)

```typescript
/** Turn number when command stabilization cooldown expires (Wave 4). Set after Stabilize action. */
stabilization_cooldown_until?: number;
```

Single canonical location. Optional field — absent = no cooldown active.

### B1: IPC handler — `stabilize-command-relationship` (`electron-main.cjs`)

Payload: `{ corpsId: string }`

Handler logic:
1. Inline strain computation (mirrors `command_strain.ts` — CJS cannot import TypeScript)
2. Reject if strain = 0 (already healthy)
3. Reject if `currentTurn < stabilization_cooldown_until` (cooldown active)
4. Compute CA cost (10 strained / 15 compromised)
5. Reject if `auth.current < cost`
6. Deduct CA from `state.military.command_authority`
7. Resolve all `friction_events` where officer is active commander of this corps
8. Set `stabilization_cooldown_until = currentTurn + 3`
9. Serialize and broadcast state

Returns: `{ ok, resolvedCount, caCost, error? }`

### B2: Stance gate in `stage-corps-stance-order` (`electron-main.cjs`)

When `stance === 'offensive'`: inline strain computation → if `strain >= COMPROMISED_THRESHOLD`, return:
```js
{ ok: false, reason: 'compromised', error: 'Cannot set aggressive stance — command is compromised. Stabilize the command relationship first.' }
```

This is IPC-side validation — the UI disable is a UX convenience, not the security layer.

### B3: Preload bridge (`preload.cjs`)

```js
stabilizeCommandRelationship: (payload) => ipcRenderer.invoke('stabilize-command-relationship', payload),
```

### B4: `useIPC.ts`

Added to `WindowAwwv` interface and `useIPC()` return:
```typescript
stabilizeCommandRelationship: (payload: { corpsId: string }) => Promise<{ ok: boolean; resolvedCount?: number; caCost?: number; error?: string }>
```

### B5: Type additions (`types.ts`)

Added to `FormationView`:
```typescript
stabilizationAvailable?: boolean;        // strain > 0 && !cooldownActive
stabilizationCooldownUntil?: number;     // turn when cooldown expires
stabilizationCostCA?: number;            // 15 if compromised, 10 if strained, 0 if no CA
```

### B6: Adapter population (`GameStateAdapter.ts`)

After the existing `frictionEvents` block in the corps loop:
- `currentTurn` from `state.meta.turn`
- `cooldownUntil` from `state.corps_command[fv.id].stabilization_cooldown_until`
- `stabilizationAvailable = strain > 0 && currentTurn >= cooldownUntil`
- `stabilizationCooldownUntil` — only set when cooldown is active
- `stabilizationCostCA` — 15/10/0 depending on strain level and CA presence

### B7: `CommandManagementSection.tsx` (new component)

`F:\A-War-Without-Victory\src\ui\map\components\army_hq\CommandManagementSection.tsx`

Props: `{ corpsId, commandStrain, commandStrainLabel, stabilizationAvailable, stabilizationCooldownUntil, stabilizationCostCA, currentTurn }`

Renders **nothing when strain = 0** (silence = healthy).

Content when strain > 0:
1. **Stance constraint notice** (only when compromised): amber warning box — "Aggressive stance unavailable while command is compromised. Stabilize the command relationship first."
2. **Stabilize Command Relationship button**: enabled when `stabilizationAvailable && !hasCooldown`. Shows CA cost in label. Disabled with cooldown message when on cooldown.
3. **Footer explainer**: "Stabilizing resolves accumulated command friction. Reducing direct interventions prevents recurrence."

Uses `CollapsibleSection` — defaults open when compromised, closed when strained.

### B8: `ArmyHQCorpsCard.tsx` integration

- Import `CommandManagementSection`
- `data` memo: added `stabilizationAvailable`, `stabilizationCooldownUntil`, `stabilizationCostCA`, `currentTurn`
- Back face sections: `CommandManagementSection` inserted after friction panel, before `CommanderSection`, rendered when `data.strain > 0`
- Stance dropdown: `offensive` option has `disabled={data.strainLabel === 'compromised'}` with `[LOCKED]` suffix and `title` tooltip

## Phase C — Canonical Review Surface

`CommandManagementSection` IS the canonical management surface. It:
- Labels itself "Command Management"
- Shows the stance constraint in context (explains WHY aggressive is unavailable)
- Shows the Stabilize action (explains WHAT to do)
- Shows the footer explainer (explains the incentive structure)
- Renders nothing at strain = 0 (silence = healthy)

## Phase D — Desktop Notification Verification

`notify.ps1` fires correctly. The script chain:
1. BurntToast — not installed (skipped silently)
2. `msg *` — runs (may not produce visible popup in some Windows 11 + bash context configurations)
3. **New (Wave 4)**: Native Windows toast API via `Windows.UI.Notifications.ToastNotificationManager` — no dependencies
4. Terminal bell + colored `Write-Host` — confirmed producing output

Native toast (fallback 3) added per spec. Governance check passed. Script is non-fatal throughout.

## Phase E — Simplification Verification

| Surface | Silence = healthy | Verified |
|---------|------------------|---------|
| Front face strain badge | strain = 0 → hidden | yes (Wave 1, unchanged) |
| Front face friction dot | frictionTypes.length = 0 → hidden | yes (Wave 3, unchanged) |
| Back face friction panel | strain = 0 AND frictionEvents.length = 0 | yes (Wave 3, unchanged) |
| CommandManagementSection | strain = 0 → renders null | yes (Wave 4, new) |
| Stance constraint notice | strainLabel !== 'compromised' → hidden | yes (Wave 4, new) |
| Stabilize button | disabled when cooldown active or strain = 0 | yes (Wave 4, new) |

### Terminology audit

All new strings in `CommandManagementSection.tsx` and IPC error messages use:
- "command friction" (not "friction score")
- "command strain" (not "strain level")  
- "Stabilize Command Relationship" (full form, not shortened)
- "Direct Intervention" not used in Wave 4 strings (correctly scoped to force-launch)
- No "morale penalty" anywhere in new code

## Tests

File: `tests/command_authority.test.ts` — **119 tests total** (29 new Wave 4 tests), all pass.

Wave 4 suites:
- `Wave 4: stabilize command relationship IPC handler` — 9 tests: resolves all events, CA costs (strained/compromised), healthy rejection, cooldown rejection, cooldown boundary, CA insufficient rejection, cooldown output, no-CA path
- `Wave 4: strain-gated stance (compromised blocks offensive)` — 8 tests: healthy/strained/compromised thresholds, all non-offensive stances allowed, error text
- `Wave 4: adapter stabilizationAvailable derivation` — 7 tests: availability conditions, cost derivation for strained/compromised/no-CA
- `Wave 4: CommandManagementSection visibility conditions` — 5 tests: silence=healthy, compromised shows stance notice

## What Was NOT Implemented and Why

| Item | Reason |
|------|--------|
| Stabilize reduces strain directly | Constraints: no fake modifiers. Stabilize marks friction resolved; strain drops via existing decay computation next read. |
| New `trust` or `confidence` field on officers | Out of scope per constraints. No new officer fields. |
| CA recovery rate reduction from strain | Not grounded in existing fields; deferred (Wave 1 constraint). |
| "Strain will drop to X next turn" preview | Wave 4 open item from architect notes — decay math is in command_strain.ts; deferred to a follow-on wave. |

## Files Changed

| File | Type | Change |
|------|------|--------|
| `src/state/game_state.ts` | MODIFIED | +1 line: `stabilization_cooldown_until` on `CorpsCommandState` |
| `src/desktop/electron-main.cjs` | MODIFIED | +95 lines: `stabilize-command-relationship` IPC handler + stance gate in `stage-corps-stance-order` |
| `src/desktop/preload.cjs` | MODIFIED | +1 line: bridge entry |
| `src/ui/map/desktop/useIPC.ts` | MODIFIED | +6 lines: `WindowAwwv` interface entry + return method |
| `src/ui/map/data/types.ts` | MODIFIED | +6 lines: 3 new fields on `FormationView` |
| `src/ui/map/data/GameStateAdapter.ts` | MODIFIED | +10 lines: stabilization field population in corps loop |
| `src/ui/map/components/army_hq/CommandManagementSection.tsx` | NEW | 103 lines: new component |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | MODIFIED | +28 lines: import, memo fields, section wiring, stance gate UI |
| `tools/architect/hooks/notify.ps1` | MODIFIED | +12 lines: native Windows toast API as fallback 3 |
| `tests/command_authority.test.ts` | MODIFIED | +211 lines: 29 Wave 4 tests |

## Verification Evidence

```
npx.cmd tsc --noEmit -p tsconfig.json             → clean (0 errors)
vitest run tests/command_authority.test.ts         → 119/119 pass
npm run test:vitest                                → 2024 passed, 20 pre-existing failures (unrelated)
powershell notify.ps1 "Wave 4 Complete" ...        → fires (colored output confirmed)
check_claude_governance.ps1                        → Claude governance check: OK
desktop:map:build                                  → vite not in PATH (pre-existing env constraint); tsc clean confirms type correctness
```

---

```
Canonical owner: CommandManagementSection (stabilize UX + stance constraint notice); electron-main.cjs (IPC handler + stance gate); command_strain.ts (derivation, unchanged)
Demoted path: Nothing demoted — Wave 4 adds the management action layer on top of Wave 3 one-by-one acknowledgement
Player-visible truth: Player can Stabilize Command Relationship (pay CA, resolve all friction at once, 3-turn cooldown); offensive stance is locked when command is compromised; both routes clear the loop that Wave 3 established
Canonical UI surface: ArmyHQCorpsCard back face — CommandManagementSection (collapsible, defaults open when compromised)
Done means: stabilize IPC handler wired end-to-end; stance gate live in IPC + UI; CommandManagementSection renders with correct silence=healthy behavior; notify.ps1 has native toast fallback; 119 tests pass; tsc clean; governance OK
```
