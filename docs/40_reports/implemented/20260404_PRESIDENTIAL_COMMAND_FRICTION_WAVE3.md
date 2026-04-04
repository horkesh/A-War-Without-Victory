# Presidential Command Friction — Wave 3
**Date:** 2026-04-04
**Branch:** main
**Commits:** `36bb32c0`, `831778ea`, `1cb68fc8`

## Mission

Move from "strain changes what the president is told" (Wave 2) to "strain begins to change what the institution is willing or able to do."

One truthful, bounded, player-legible mechanical consequence: the **Friction Resolution Loop**.

## Phase A — Honest Behavioral Leverage Audit

### Model chosen: Friction Resolution Loop

All required pieces already existed:

| Piece | Location | Status |
|-------|----------|--------|
| `FrictionEvent.resolved: boolean` | `warlord_friction.ts` line 26 | CONFIRMED present |
| `friction_events[]` on `state.military` | `game_state.ts` line 1783 | CONFIRMED present |
| `computeCorpsCommandStrain()` filters `!e.resolved` | `command_strain.ts` line 94 | CONFIRMED — resolution already excludes resolved events |
| No id field on `FrictionEvent` | — | Deliberate: composite key `officer_id:turn:type` used instead |

**Composite key decision:** `${officerId}:${turn}:${type}` is deterministic and unique per event within a run. Adding a stored `id` field was unnecessary — the composite key routes acknowledgements without touching the engine type or any serialized state.

### Why this model is grounded (not fake)

- `computeCorpsCommandStrain()` is the canonical strain source. It already reads `resolved` — the filter was there, just never exercised via player action.
- Acknowledging a friction event sets `resolved: true` on the exact same object that `computeCorpsCommandStrain()` reads next turn.
- No new fields, no new mechanics, no fake penalties. The loop closes through existing code.

### What was considered and rejected

| Option | Reason rejected |
|--------|----------------|
| Auto-resolve after N turns | Already exists via decay. Player acknowledgement adds intentional weight without fake mechanics. |
| Strain → commander competence penalty | No existing competence field on CorpsState to write to cleanly. Wave 1 deliberately deferred this. |
| CA recovery rate reduction from strain | Would require a new recovery modifier and a new field. Not grounded yet. |

## Phase B — Implementation

### B1: IPC handler (`electron-main.cjs`)

New channel: `acknowledge-friction-event`

Payload: `{ corpsId: string; officerId: string; eventTurn: number; eventType: string }`

Handler logic:
1. Deserializes state
2. Finds event in `state.military.friction_events` matching `officer_id + turn + type + resolved === false`
3. Sets `event.resolved = true`
4. Serializes and broadcasts updated state

Rejects cleanly when: no game loaded, missing payload fields, event not found, event already resolved.

**Note on `corpsId` in payload:** The handler uses `officerId + turn + type` as the lookup key — `corpsId` is present for context/logging but not used in the search. This is intentional: friction events are stored globally on `state.military.friction_events`, not per-corps. The officer→corps relationship is already encoded in `officer_id`.

### B2: Preload bridge (`preload.cjs`)

```js
acknowledgeFrictionEvent: (payload) => ipcRenderer.invoke('acknowledge-friction-event', payload),
```

### B3: IPC hook (`useIPC.ts`)

Added to `WindowAwwv` interface and `useIPC()` return:
```typescript
acknowledgeFrictionEvent: (payload: { corpsId: string; officerId: string; eventTurn: number; eventType: string }) => Promise<{ ok: boolean; error?: string }>
```

### B4: Type additions (`types.ts`)

New `FrictionEventView` interface:
```typescript
export interface FrictionEventView {
    compositeKey: string;    // officerId:turn:type — routing key for IPC
    officerId: string;
    typeLabel: string;       // player-facing label
    turn: number;
    resolved: boolean;
}
```

`FormationView` extended:
```typescript
frictionEvents?: FrictionEventView[];  // full list for corps/corps_asset, Wave 3 resolution UI
```

## Phase C — Canonical Review Surface

### GameStateAdapter (`GameStateAdapter.ts`)

After populating `activeFrictionTypes` (Wave 1), now also populates `frictionEvents`:
- Filters to events for this corps's active commanders
- Sorted by turn ascending (oldest first for stable rendering)
- Maps raw `FrictionEvent` → `FrictionEventView` with humanized type labels:
  - `ignored_stance` → "Ignored Stance Order"
  - `unauthorized_op` → "Unauthorized Operation"
  - `refused_release` → "Refused Brigade Release"

### ArmyHQCorpsCard back face (`ArmyHQCorpsCard.tsx`)

The back face now renders a full friction resolution panel when `strain > 0 OR frictionEvents.length > 0`:

1. **Strain score row** — unchanged from Wave 1/2 (Command Strain: Strained/Compromised [N])
2. **Unresolved event list** — shown when any unresolved events exist:
   - Each row: `· [typeLabel]  Wk [turn]  [Acknowledge button]`
   - Clicking Acknowledge calls `acknowledgeFrictionEvent` IPC
   - Resolved events are hidden (silence = healthy)
3. **Explainer line** — below the list: *"Acknowledging friction events reduces command strain over time."*

The player now knows:
- **What** strain exists (Wave 1 badge — still present)
- **Why** (which specific unresolved friction events — back face list, new in Wave 3)
- **What changes it** (acknowledge to close the loop — new in Wave 3)

## Phase D — Simplification

### Front face badge demoted

The `FRICTION ACTIVE` badge (text-only, wide) was demoted to a dot + label:

```
Before: [FRICTION ACTIVE]   (full text badge)
After:  [● FRICTION]        (dot indicator, tooltip: "flip card to review and acknowledge")
```

Rationale: the back face now owns the full friction detail list. The front badge is a "something is here, flip to see" signal only. Singular ownership restored — back face is the canonical friction surface.

### Silence = healthy verified across all surfaces

| Surface | Condition for silence | Verified |
|---------|----------------------|---------|
| Front face strain badge | strain = 0 | yes |
| Front face friction dot | frictionTypes.length = 0 | yes |
| Back face friction panel | strain = 0 AND frictionEvents.length = 0 | yes |
| Back face acknowledge list | all events resolved | yes |
| CoS briefing paragraph (Wave 2) | strain = 0 | unchanged |
| OperationsSection notice (Wave 2) | strain = 0 or no ops | unchanged |
| OperationBriefingModal warning (Wave 2) | strain = 0 | unchanged |

## Tests

File: `tests/command_authority.test.ts` — **90 tests total** (20 new Wave 3 tests), all pass.

Wave 3 suites:
- `Wave 3: friction resolution IPC handler logic` — 6 tests: sets resolved, rejects unknown/already-resolved, scopes correctly by type/turn/officer
- `Wave 3: strain drops after friction resolution` — 3 tests: resolving event removes contribution; partial resolution; full accumulate→resolve loop
- `Wave 3: FrictionEventView composite key` — 6 tests: key format, distinctness, eventType extraction
- `Wave 3: silence=healthy on back face` — 5 tests: panel/list visibility conditions

## What Was NOT Implemented and Why

| Item | Reason |
|------|--------|
| Mechanical penalty from strain (attack/defense modifier) | No existing stat field to write to cleanly; Wave 1 constraint: no fake penalties |
| `resolved` field added to `FrictionEvent` type | Already existed in `warlord_friction.ts` — no change needed |
| CA recovery rate modification from strain | Not grounded in existing fields; deferred |
| `command_friction_log` on GameState | Plan Phase 3 proposed this; Wave 3 reuses `friction_events[]` directly — no duplication needed |
| Brigade-level acknowledgement | Out of scope per constraints; player acknowledges at presidential level (Level 2) |

## Files Changed

| File | Type | Change |
|------|------|--------|
| `src/desktop/electron-main.cjs` | MODIFIED | +39 lines: `acknowledge-friction-event` IPC handler |
| `src/desktop/preload.cjs` | MODIFIED | +1 line: bridge entry |
| `src/ui/map/desktop/useIPC.ts` | MODIFIED | +4 lines: WindowAwwv interface + return method |
| `src/ui/map/data/types.ts` | MODIFIED | +22 lines: FrictionEventView interface + frictionEvents on FormationView |
| `src/ui/map/data/GameStateAdapter.ts` | MODIFIED | +19 lines: frictionEvents population in corps loop |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | MODIFIED | +68 lines / -35 lines: back-face friction panel, Acknowledge buttons, front badge demotion |
| `tests/command_authority.test.ts` | MODIFIED | +228 lines: 20 Wave 3 tests |

## Verification Evidence

```
npx.cmd tsc --noEmit -p tsconfig.json   → clean (0 errors)
vitest run tests/command_authority.test.ts  → 90/90 pass
npm run test:vitest                      → 1995 passed (20 pre-existing failures unrelated to Wave 3)
check_claude_governance.ps1             → Claude governance check: OK
```

---

```
Canonical owner: ArmyHQCorpsCard back face (friction resolution UX); command_strain.ts (derivation); electron-main.cjs (IPC handler)
Demoted path: FRICTION ACTIVE full-text badge demoted to dot indicator on front face — back face now owns friction detail list
Player-visible truth: Player can see which specific friction events are unresolved (type + turn), acknowledge each one to set resolved:true, and watch strain drop on next read — the loop is complete
Canonical UI surface: ArmyHQCorpsCard back face (friction event list + Acknowledge buttons)
Done means: friction resolution loop closed end-to-end; IPC handler wired; adapter exposes full event views; UI shows unresolved events with Acknowledge button; resolved events hidden; silence=healthy at all surfaces; 90 tests pass; tsc clean; governance OK
```
