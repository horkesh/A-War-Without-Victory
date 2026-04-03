# Presidential Command Friction Wave 1 — Implementation Report

**Date:** 2026-04-04  
**Commits:** `44356235`, `59b9f2f7`, `16a0726b`, `37668647`  
**Roadmap slot:** v0.8.x — Presidential Command Doctrine substrate  
**Governing doc:** `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`  
**Plan doc:** `docs/plans/2026-04-03-delegation-override-command-friction-plan.md`

---

## Phase A — Friction Audit Findings

### 1. Does `checkWarlordFriction` push to `state.military.friction_events`?

**YES.** Confirmed code path:

- `war_phases.ts` line 1819–1828: named step `check-warlord-friction` calls `checkWarlordFriction(context.state)`
- `warlord_friction.ts` line 124: `state.military.friction_events.push(event)` — pushes directly to GameState
- `warlord_friction.ts` line 79–81: initializes the array if missing (`if (!state.military.friction_events) { state.military.friction_events = []; }`)
- Events are **never cleared** — they accumulate turn over turn with `resolved: false`

### 2. Does any UI component or adapter field read `friction_events`?

**NO.** Before this wave, `friction_events` was written by the engine and never read by any UI component or adapter. The data was completely invisible to the player. Confirmed by exhaustive grep — only `game_state.ts` (type definition), `warlord_friction.ts` (writer), and the new `command_strain.ts` (reader) touch this field.

### 3. Do completed ops have `was_force_launched=true` accessible through the operations history adapter?

**YES, via two paths:**
- Active ops: `GameStateAdapter.ts` line 929 — `was_force_launched: op.was_force_launched === true ? true : undefined`
- Completed ops (AAR): `deriveOperationHistory()` line 2017 — `force_launched: aar.force_launched === true ? true : undefined`
- The active op path provides `was_force_launched` on `OperationView`; the AAR path provides `force_launched` on the history type. Both carry the permanent flag set at launch time.

### 4. Does `command_authority.lifetime_spent` accumulate correctly across force-launches?

**YES.** `electron-main.cjs` handler deducts `auth.current -= cost`, adds to `auth.spent_this_turn += cost` and `auth.lifetime_spent += cost` at each force-launch. The war phase step `recover-command-authority` resets `spent_this_turn` to 0 each turn but does not touch `lifetime_spent`. Accumulation is correct and permanent.

### 5. What does `ArmyHQCorpsCard.tsx` currently show for friction?

**Nothing.** Before this wave, `ArmyHQCorpsCard` had zero friction-related display. The card showed corps name, commander, EF grade, equipment, personnel, stance, active operation, and battles. No strain, no friction indicator, no override history visibility.

---

## What Was Implemented

### Phase B — Command Strain Model

**New file: `src/ui/map/data/command_strain.ts`**

Pure utility — computes a per-corps command strain integer from existing data. Never stores anything. Deterministic.

Strain sources (each decayed -1/turn since the event occurred, floored at 0):
- Each active operation with `was_force_launched=true` on that corps: **+3**
- Each unresolved `FrictionEvent` for that corps's active commander: **+2**

```
score = Σ max(0, rawStrain − turnAge)   for each contributing event
```

Exports:
- `computeCorpsCommandStrain(corpsId, state): number` — the score
- `getCommandStrainLabel(score): 'healthy' | 'strained' | 'compromised'` — thresholds: 0=healthy, 1–5=strained, 6+=compromised

**`GameStateAdapter.ts` — corps loop extension**

For every corps/corps_asset formation, after existing fields are populated:
1. Calls `computeCorpsCommandStrain(fv.id, state)` → `fv.commandStrain`
2. Calls `getCommandStrainLabel(strain)` → `fv.commandStrainLabel`
3. Derives `fv.activeFrictionTypes[]` — unresolved friction event types for that corps's active commander, sorted for determinism

**`types.ts` — FormationView additions**

Three new optional fields on `FormationView` (corps-only, populated by adapter):
- `commandStrain?: number`
- `commandStrainLabel?: 'healthy' | 'strained' | 'compromised'`
- `activeFrictionTypes?: string[]`

### Phase B/D — ArmyHQCorpsCard Display

**Front card face** (summary card, always visible):
- When `strain > 0`: amber `⚠ COMMAND STRAINED` or red `⚠ COMMAND COMPROMISED` badge with tooltip
- When `frictionTypes.length > 0`: amber `FRICTION ACTIVE` badge with tooltip (shown whether or not strain > 0)
- Silence = healthy — no indicator when both are zero

**Back face** (expanded detail card):
- Banner row between header and sections wrapper
- Shows `Command Strain: Strained/Compromised [N]` with color-coded text
- Shows `· Warlord Friction Active` alongside strain (or alone when strain=0)

### Phase C — OperationBriefingModal Institutional Strain Follow-Through

**`CommandRecord` component** — fifth row added:
- Only shown when `wasForce=true` AND `corpsStrain > 0`
- Label: `Command Strain` / Value: `Strained/Compromised — direct interventions have damaged this command relationship`
- Closes the narrative gap: player sees the override AND what it cost institutionally

**`OperationHistoryPanel` expanded view** — strain note added:
- When `op.force_launched === true`: shows `Note: Presidential override contributed to command strain on this corps.` in amber italic
- Appears only for force-launched ops; normal ops are silent

### Phase D — Terminology

- `DirectInterventionSection` button label: changed from `Force Launch — Override Command Chain` to `Direct Intervention — Override Command Chain`
- `ForceLaunchBadge` confirmed legacy-fallback-only: it is in the `else` branch of `commander_assessment_at_launch != null` ternary — fires only for pre-feature ops that have no snapshot. Not removed.
- All new code uses: `Command Strain` (Title Case in UI), `Direct Intervention` (not "force launch" in labels), `command_strain` (snake_case in code)
- Engine-internal uses of "force launch" in sim code (`army_hq_gathering_constants.ts`, `operation_preparation.ts`) are not UI-facing and left unchanged

---

## What Was NOT Implemented and Why

| Item | Reason |
|------|--------|
| Mechanical penalties from strain (morale hit, competence penalty) | Out of scope for Wave 1 — plan explicitly excludes fake penalties. Only real data used. |
| `command_strain` stored on GameState | By design — derived on-read. Avoids GameState bloat and keeps computation canonical in one place. |
| Brigade-commander level strain | Out of scope per implementation constraints. |
| CA recovery rate modification from strain | Not in Wave 1 spec. Data exists for future wave. |
| Warlord friction player decision surface (accept/override flow) | Not in Wave 1 — this is Phase 3 of the delegation plan (v0.8.3+). Wave 1 only surfaces visibility. |
| Delegation summary in CoS briefing | Phase 4 of the plan — separate work item. |
| Strategic priorities (Level 1) | Phase 1 of the plan — separate work item. |

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `src/ui/map/data/command_strain.ts` | NEW | Strain computation utility |
| `src/ui/map/data/types.ts` | MODIFIED | FormationView: +commandStrain, +commandStrainLabel, +activeFrictionTypes |
| `src/ui/map/data/GameStateAdapter.ts` | MODIFIED | Corps loop: populate strain + friction types on FormationView |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | MODIFIED | Strain + friction badges on front and back faces |
| `src/ui/map/components/OperationBriefingModal.tsx` | MODIFIED | CommandRecord strain row; button label fix |
| `src/ui/map/components/OperationHistoryPanel.tsx` | MODIFIED | Force-launched ops: strain note in expanded view |
| `tests/command_authority.test.ts` | MODIFIED | +17 strain tests (53 total, all pass) |

---

## Verification

- `npx tsc --noEmit`: clean (no errors)
- `vitest run tests/command_authority.test.ts`: 53/53 pass
- Governance check: `OK`

---

## Canonical Completion Block

```
Canonical owner: Presidential Command Doctrine + command_strain.ts utility
Demoted path: friction_events written but never read (now surfaced); ForceLaunchBadge demoted to confirmed legacy-fallback-only
Player-visible truth: Player can now see command strain on each corps card; warlord friction is no longer invisible; OperationBriefingModal shows institutional cost of overrides; history panel notes force-launched ops
Canonical UI surface: ArmyHQCorpsCard (per-corps strain + friction); OperationBriefingModal CommandRecord (strain follow-through); OperationHistoryPanel (history note)
Done means: Command strain score derived from real data, displayed without fake penalties, visible in Army HQ and ops review, all 53 tests pass, tsc clean
```
