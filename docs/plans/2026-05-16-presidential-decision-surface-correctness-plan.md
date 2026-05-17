# Presidential Decision Surface Correctness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the second-pass presidential decision-surface residuals so every generated player decision has an explicit owner, player surface, action route, resolver, and gate policy.

**Architecture:** Treat player decisions as a registered contract, not as scattered UI guesses. Fix the known broken convoy resolver first, then make event ownership explicit, then introduce a manifest-backed read model that feeds Presidential Inbox, Decision Room, pre-advance review, and desktop hard-blocking from the same family classifications.

**Tech Stack:** TypeScript simulation/event code, React tactical-map read models, Electron CJS IPC, Vitest, JSON scenario event catalogs, desktop sim bundle.

**Status:** IMPLEMENTED 2026-05-16. Closeout report: `docs/40_reports/implemented/20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md`. Tasks 1-6 are complete: convoy IPC uses the canonical military queue, event decisions respect explicit `responding_faction`, required-response events declare valid owners, the player-decision manifest is live, UI/desktop gates consume it, and docs/ledger are updated.

---

## Scope

Source audit: `docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md`.

This plan addresses three P0 findings:

1. `stage-convoy-decision` writes root `state.pending_convoy_decisions` while the engine owns `state.military.pending_convoy_decisions`.
2. `evaluateEvents(...)` queues required event decisions for the current `playerFaction` instead of respecting `responding_faction`.
3. No player-decision manifest exists, so Inbox cards, Decision Room counters, pre-advance blocks, and desktop advance hard-blocks can drift.

Do not add new mechanics. Do not change event effects unless a required event owner is impossible to infer from existing event text, IDs, and response effects. If an event's proper owner is ambiguous, stop and ask with the exact event ID and candidate owners.

## Required Reading

- `docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md`
- `src/desktop/electron-main.cjs`
- `src/desktop/preload.cjs`
- `src/desktop/desktop_sim.ts`
- `src/state/supply_reserves.ts`
- `src/state/game_state.ts`
- `src/sim/events/evaluate_events.ts`
- `src/sim/events/event_types.ts`
- `src/sim/events/resolve_decision.ts`
- `data/scenarios/events/war_1992.json`
- `data/scenarios/events/war_1993.json`
- `data/scenarios/events/war_1994.json`
- `data/scenarios/events/war_1995.json`
- `data/scenarios/events/consequences.json`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/data/preAdvanceCommandReview.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/ui/map/data/types.ts`

## Parallelization

- **Lane A can start immediately:** Task 1 convoy resolver path.
- **Lane B can start immediately:** Task 2 event ownership catalog and evaluator.
- **Lane C can start after a quick inventory read, but should merge after A/B:** Tasks 3-5 manifest, UI counters, and desktop gate. Manifest logic depends on knowing final family IDs and blocking policy, but not on the convoy implementation details.
- **Task 6 is final integration only.**

## Task 0: Protect Workspace And Establish Baseline

**Files:**
- Read only: `git status --short`
- Read only: files listed in this plan before editing them

**Step 1: Inspect active changes**

Run:

```powershell
git status --short
git diff -- src/desktop/electron-main.cjs src/sim/events/evaluate_events.ts src/ui/map/data/preAdvanceCommandReview.ts src/ui/map/data/presidentialDecisionRoom.ts
```

Expected: Identify all existing modifications. Work with relevant changes; do not revert unrelated work.

**Step 2: Run current focused baseline**

Run:

```powershell
npx.cmd vitest run tests\event_decisions.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\phase_c_supply_agency.test.ts
```

Expected: Existing tests pass before starting, or any failures are recorded as pre-existing.

## Task 1: Fix Convoy Decision Canonical State Path

**Files:**
- Modify: `src/desktop/electron-main.cjs`
- Create: `src/desktop/convoy_ipc_contract.cjs`
- Test: `tests/desktop_convoy_decision_contract.test.ts`

**Step 1: Write the failing contract test**

Create `tests/desktop_convoy_decision_contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { stageConvoyDecisionOnState } from '../src/desktop/convoy_ipc_contract.cjs';

describe('desktop convoy decision contract', () => {
  it('writes decisions to state.military.pending_convoy_decisions', () => {
    const state: any = {
      military: {
        pending_convoy_decisions: [
          { id: 'convoy_srebrenica_1', enclave_id: 'srebrenica', route_patron: 'UN' },
        ],
      },
      pending_convoy_decisions: [
        { id: 'wrong_root_queue', decision: 'block' },
      ],
    };

    const result = stageConvoyDecisionOnState(state, 'convoy_srebrenica_1', 'allow');

    expect(result).toEqual({ ok: true });
    expect(state.military.pending_convoy_decisions[0].decision).toBe('allow');
    expect(state.pending_convoy_decisions[0].id).toBe('wrong_root_queue');
  });

  it('fails when the canonical military queue does not contain the convoy', () => {
    const state: any = {
      military: { pending_convoy_decisions: [] },
      pending_convoy_decisions: [{ id: 'convoy_srebrenica_1' }],
    };

    expect(stageConvoyDecisionOnState(state, 'convoy_srebrenica_1', 'allow')).toEqual({
      ok: false,
      error: 'Convoy not found',
    });
  });
});
```

Run:

```powershell
npx.cmd vitest run tests\desktop_convoy_decision_contract.test.ts
```

Expected: FAIL because `src/desktop/convoy_ipc_contract.cjs` does not exist.

**Step 2: Add testable CJS helper**

Create `src/desktop/convoy_ipc_contract.cjs`:

```js
'use strict';

const VALID_CONVOY_DECISIONS = new Set(['allow', 'block', 'divert']);

function stageConvoyDecisionOnState(state, convoyId, decision) {
  if (!state || typeof convoyId !== 'string' || typeof decision !== 'string') {
    return { ok: false, error: 'No game loaded or invalid payload' };
  }
  if (!VALID_CONVOY_DECISIONS.has(decision)) {
    return { ok: false, error: 'Invalid decision' };
  }
  if (!state.military || typeof state.military !== 'object') {
    state.military = {};
  }

  const pending = Array.isArray(state.military.pending_convoy_decisions)
    ? [...state.military.pending_convoy_decisions]
    : [];
  let found = false;
  state.military.pending_convoy_decisions = pending.map((convoy) => {
    if (convoy?.id !== convoyId) return convoy;
    found = true;
    return { ...convoy, decision };
  });

  if (!found) return { ok: false, error: 'Convoy not found' };
  return { ok: true };
}

module.exports = { stageConvoyDecisionOnState };
```

**Step 3: Wire Electron IPC to the helper**

In `src/desktop/electron-main.cjs`, import:

```js
const { stageConvoyDecisionOnState } = require('./convoy_ipc_contract.cjs');
```

Inside `ipcMain.handle('stage-convoy-decision', ...)`, replace the root-queue mapping with:

```js
const result = stageConvoyDecisionOnState(state, convoyId, decision);
if (!result.ok) return result;
currentGameStateJson = sim.serializeState(state);
sendGameStateToRenderer(currentGameStateJson);
return { ok: true };
```

**Step 4: Verify**

Run:

```powershell
npx.cmd vitest run tests\desktop_convoy_decision_contract.test.ts tests\phase_c_supply_agency.test.ts tests\ui\inbox_items.test.ts
```

Expected: PASS.

## Task 2: Make Event Decision Ownership Explicit

**Files:**
- Modify: `src/sim/events/evaluate_events.ts`
- Modify: `data/scenarios/events/war_1992.json`
- Modify: `data/scenarios/events/war_1993.json`
- Modify: `data/scenarios/events/war_1994.json`
- Modify: `data/scenarios/events/war_1995.json`
- Test: `tests/event_decisions.test.ts`
- Test: `tests/event_response_ownership_catalog.test.ts`

**Step 1: Add catalog test for required-response ownership**

Create `tests/event_response_ownership_catalog.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const eventDir = path.join(process.cwd(), 'data', 'scenarios', 'events');
const files = fs.readdirSync(eventDir).filter((file) => file.endsWith('.json')).sort();
const validFactions = new Set(['RBiH', 'RS', 'HRHB']);

describe('required event response ownership', () => {
  it('requires every required-response event to declare responding_faction', () => {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const file of files) {
      const events = JSON.parse(fs.readFileSync(path.join(eventDir, file), 'utf8'));
      for (const event of events) {
        if (event.requires_player_response !== true) continue;
        if (!event.responding_faction) {
          missing.push(`${file}:${event.id}`);
        } else if (!validFactions.has(event.responding_faction)) {
          invalid.push(`${file}:${event.id}:${event.responding_faction}`);
        }
      }
    }

    expect(missing).toEqual([]);
    expect(invalid).toEqual([]);
  });
});
```

Run:

```powershell
npx.cmd vitest run tests\event_response_ownership_catalog.test.ts
```

Expected: FAIL listing the 26 missing owners from the second-pass audit.

**Step 2: Add evaluator ownership regression**

Extend `tests/event_decisions.test.ts` with a test using an event definition with `responding_faction: 'RS'` and a loaded player faction of `RBiH`.

Expected behavior:
- RBiH player does not receive the RS decision.
- The event is either auto-responded for RS according to existing bot logic or queued only when `playerFaction === 'RS'`.
- When queued for RS, `pending_event_decisions[0].faction` equals `RS`, not the arbitrary current player.

**Step 3: Update evaluator logic**

In `src/sim/events/evaluate_events.ts`, compute `respondingFaction` before the player/bot branch, using the existing fallback chain currently inside the bot branch:

```ts
const respondingFaction: FactionId | null =
  (def.responding_faction as FactionId | undefined)
  ?? (def.dimension_shifts?.[0]?.faction as FactionId | undefined)
  ?? (def.response_options?.[0]?.dimension_shifts?.[0]?.faction as FactionId | undefined)
  ?? (playerFaction ?? null);
```

Then gate player display:

```ts
const isPlayerRespondent = playerFaction != null && respondingFaction === playerFaction;
const mustShowPlayer = isPlayerRespondent && (autonomyLevel < 3 || def.requires_player_response === true);
```

When queuing, write:

```ts
faction: respondingFaction,
```

If `def.requires_player_response === true` and `respondingFaction` is null, fail closed with a deterministic warning or throw in test-only/catalog validation. Do not silently assign the current player.

**Step 4: Add missing `responding_faction` values**

Patch the 26 missing required-response events listed in the audit. Use obvious owners only:

- `rs_strategic_goals`, `drina_cleansing_decision_1992`, `operation_lukavac_93`, `rs_assembly_rejects_voplan_1993`, `strategic_posture_review_rs`, `visit_to_front_rs`, `belgrade_embargo_rs_1994`, `karadzic_mladic_split_1995`, `un_hostage_crisis_1995`: `RS`.
- `rbih_state_identity`, `london_conference_1992`, `srebrenica_demilitarization_1993`, `vance_owen_plan_1993`, `owen_stoltenberg_plan_1993`, `strategic_posture_review_rbih`, `visit_to_front_rbih`, `contact_group_plan_1994`, `washington_agreement_1994`, `dayton_talks_begin_1995`, `us_halts_federation_advance_1995`: likely `RBiH`, but verify each event text/effects before editing.
- `hrhb_political_goal`, `gornji_vakuf_clashes_1993`, `strategic_posture_review_hrhb`, `visit_to_front_hrhb`: `HRHB`.
- `concentration_camps_revealed_1992` and `carter_ceasefire_1994`: verify narrative and effects before choosing owner; stop and ask if ambiguous.

**Step 5: Verify**

Run:

```powershell
npx.cmd vitest run tests\event_response_ownership_catalog.test.ts tests\event_decisions.test.ts tests\events_evaluate.test.ts tests\integration_event_system.test.ts
```

Expected: PASS.

## Task 3: Add Player Decision Manifest And Family Counters

**Files:**
- Create: `src/state/player_decision_manifest.ts`
- Modify: `src/desktop/desktop_sim.ts`
- Test: `tests/player_decision_manifest.test.ts`

**Step 1: Write failing manifest tests**

Create `tests/player_decision_manifest.test.ts` with fixtures covering all current families:

- required event decision
- peace plan
- Dayton negotiation
- paramilitary request
- convoy decision
- reserve request
- officer/personnel event
- autonomy proposal review
- operation opportunity proposal review

Assertions:

```ts
expect(summary.totalCount).toBe(9);
expect(summary.blockingCount).toBe(4); // exact count depends on final policy below
expect(summary.families.map((family) => family.id)).toEqual([
  'event_decision',
  'peace_plan',
  'dayton_negotiation',
  'paramilitary_request',
  'convoy_decision',
  'reserve_request',
  'officer_event',
  'autonomy_proposal',
  'operation_opportunity',
]);
```

Run:

```powershell
npx.cmd vitest run tests\player_decision_manifest.test.ts
```

Expected: FAIL because manifest does not exist.

**Step 2: Implement manifest**

Create `src/state/player_decision_manifest.ts`.

Export:

```ts
export type PlayerDecisionFamilyId =
  | 'event_decision'
  | 'peace_plan'
  | 'dayton_negotiation'
  | 'paramilitary_request'
  | 'convoy_decision'
  | 'reserve_request'
  | 'officer_event'
  | 'autonomy_proposal'
  | 'operation_opportunity';

export type PlayerDecisionGatePolicy = 'hard_block' | 'modal_required' | 'advisory';

export interface PlayerDecisionFamilyDefinition {
  id: PlayerDecisionFamilyId;
  statePath: string;
  inboxType: string;
  ownerSurface: string;
  resolver: string;
  gatePolicy: PlayerDecisionGatePolicy;
}
```

Initial policy:

- `event_decision`: `hard_block` only for `requires_player_response === true`.
- `paramilitary_request`: `hard_block` until resolved.
- `peace_plan`: `modal_required`.
- `dayton_negotiation`: `modal_required`.
- `convoy_decision`: `modal_required` if pending decision has no `decision`; otherwise not blocking.
- `reserve_request`: `advisory`.
- `officer_event`: `advisory`, except `order_refused` may remain urgent but not hard-blocking unless product decides otherwise.
- `autonomy_proposal`: `advisory`.
- `operation_opportunity`: `advisory`.

Export pure functions:

```ts
export function summarizePlayerDecisions(state: GameStateLike, playerFaction?: string | null): PlayerDecisionSummary;
export function countBlockingPlayerDecisions(state: GameStateLike, playerFaction?: string | null): number;
export function listBlockingPlayerDecisions(state: GameStateLike, playerFaction?: string | null): PlayerDecisionInstance[];
```

Implementation requirements:
- Filter faction-owned queues to `playerFaction` where the queue carries faction.
- Do not treat `meta.autonomy_level_pending` as a decision.
- Do not treat player-staged orders as generated pending decisions.
- Keep family order stable and deterministic by the manifest order.

**Step 3: Re-export for Electron**

In `src/desktop/desktop_sim.ts`, export the manifest functions:

```ts
export {
  PLAYER_DECISION_FAMILIES,
  summarizePlayerDecisions,
  countBlockingPlayerDecisions,
  listBlockingPlayerDecisions,
} from '../state/player_decision_manifest.js';
```

This lets `electron-main.cjs` use the built `dist/desktop/desktop_sim.cjs` bundle rather than duplicating manifest logic in CJS.

**Step 4: Verify**

Run:

```powershell
npx.cmd vitest run tests\player_decision_manifest.test.ts
npm.cmd run desktop:sim:build
```

Expected: PASS and desktop sim bundle exports the helper functions.

## Task 4: Wire UI Review Counts And Advance Readiness To Manifest

**Files:**
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Modify: `src/ui/map/data/types.ts`
- Modify: `src/ui/map/data/preAdvanceCommandReview.ts`
- Modify: `src/ui/map/data/presidentialDecisionRoom.ts`
- Test: `tests/ui/pre_advance_command_review.test.ts`
- Test: `tests/ui_presidential_decision_room_wiring.test.ts`
- Test: `tests/ui/presidential_decision_room.test.ts`

**Step 1: Add failing UI tests**

Extend pre-advance and Decision Room tests with a state containing:

- one unresolved paramilitary request
- one unresolved convoy decision
- one pending Dayton negotiation
- one reserve request
- one officer event

Expected:
- `blockingDecisionCount` comes from manifest blocking/modal-required families, not just event decisions.
- Decision Room advance readiness reports blocked when manifest blocking/modal-required count is positive.
- Advisory families appear in review counts but do not hard-block if their manifest policy is `advisory`.

Run:

```powershell
npx.cmd vitest run tests\ui\pre_advance_command_review.test.ts tests\ui_presidential_decision_room_wiring.test.ts
```

Expected: FAIL because current code counts only event decisions and paramilitary in some places.

**Step 2: Add manifest summary to loaded UI state**

In `src/ui/map/data/types.ts`, add a `playerDecisionSummary` view type matching the manifest summary.

In `src/ui/map/data/GameStateAdapter.ts`, compute:

```ts
const playerDecisionSummary = summarizePlayerDecisions(state, playerFaction);
```

Assign it to `LoadedGameState`.

**Step 3: Replace local gate mirrors**

In `src/ui/map/data/preAdvanceCommandReview.ts`:
- Replace `countBlockingDecisions(...)` internals with `state.playerDecisionSummary?.blockingCount ?? 0`.
- Use manifest-derived modal-required count for "Review before advance" where appropriate.

In `src/ui/map/data/presidentialDecisionRoom.ts`:
- Replace `blockedByExistingSystems` hard-coded checks with manifest summary.
- Either rename `presidentialReviewQueue` language where it is not exhaustive, or add a manifest-driven total count alongside existing queue counts.

**Step 4: Verify**

Run:

```powershell
npx.cmd vitest run tests\ui\pre_advance_command_review.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts
```

Expected: PASS.

## Task 5: Wire Desktop Advance Gate To Manifest

**Files:**
- Modify: `src/desktop/electron-main.cjs`
- Test: `tests/desktop_persistence_contract.test.ts`
- Test: `tests/desktop_player_decision_gate_contract.test.ts`

**Step 1: Add failing desktop gate test**

Create `tests/desktop_player_decision_gate_contract.test.ts` around the exported desktop sim helpers:

```ts
import { describe, expect, it } from 'vitest';
import { countBlockingPlayerDecisions, listBlockingPlayerDecisions } from '../src/state/player_decision_manifest.js';

describe('desktop player decision gate contract', () => {
  it('blocks required event and paramilitary decisions from the same manifest', () => {
    const state: any = {
      meta: { player_faction: 'RS' },
      pending_paramilitary_requests: [{ faction: 'RS', target_osid: 'x', strength: 100 }],
      military: {
        pending_event_decisions: [{ event_id: 'rs_required', faction: 'RS', requires_player_response: true }],
      },
    };

    expect(countBlockingPlayerDecisions(state, 'RS')).toBe(2);
    expect(listBlockingPlayerDecisions(state, 'RS').map((item) => item.familyId)).toEqual([
      'event_decision',
      'paramilitary_request',
    ]);
  });
});
```

Run:

```powershell
npx.cmd vitest run tests\desktop_player_decision_gate_contract.test.ts
```

Expected: PASS after Task 3; if not, fix manifest.

**Step 2: Replace desktop hard-coded event-only gate**

In `src/desktop/electron-main.cjs`, in `ipcMain.handle('advance-turn', ...)`, replace:

```js
const pending = state.military.pending_event_decisions ?? [];
const blocked = pending.filter(d => d.requires_player_response === true);
```

with:

```js
const blocked = typeof sim.listBlockingPlayerDecisions === 'function'
  ? sim.listBlockingPlayerDecisions(state, state.meta?.player_faction ?? null)
  : [];
```

Return `pending_required_decisions` with family IDs and labels if the existing error payload supports it. Keep backward-compatible `error: 'pending_required_decisions'`.

**Step 3: Verify desktop bundle path**

Run:

```powershell
npm.cmd run desktop:sim:build
npx.cmd vitest run tests\desktop_player_decision_gate_contract.test.ts tests\desktop_persistence_contract.test.ts
```

Expected: PASS.

## Task 6: Final Regression, Docs, And Ledger

**Status:** COMPLETE 2026-05-16.

**Files:**
- Modify: `docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md`
- Modify: `docs/40_reports/GUI_MASTER.md`
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Optional new report after implementation: `docs/40_reports/implemented/20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md`

**Step 1: Run integrated focused tests**

Run:

```powershell
npx.cmd vitest run tests\desktop_convoy_decision_contract.test.ts tests\event_response_ownership_catalog.test.ts tests\event_decisions.test.ts tests\events_evaluate.test.ts tests\integration_event_system.test.ts tests\player_decision_manifest.test.ts tests\desktop_player_decision_gate_contract.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\phase_c_supply_agency.test.ts
```

Expected: PASS.

**Step 2: Run build/type gates**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run desktop:sim:build
npm.cmd run desktop:map:build
git diff --check
```

Expected:
- Typecheck passes.
- Desktop sim build passes.
- Desktop map build passes, allowing existing Vite/browser-external warnings if unchanged.
- `git diff --check` has no whitespace errors, allowing CRLF warnings only.

Observed 2026-05-16:
- Integrated focused decision-surface suite passed 110/110.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:sim:build` passed with the existing `import.meta` CJS warning.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/dynamic-import/chunk warnings.
- `git diff --check` reported CRLF normalization warnings only.

**Step 3: Update docs**

Update the audit status from "P0 residuals open" to "implemented" only after all tests pass.

Update `docs/plans/MASTER_ROADMAP.md`:
- Mark this plan as implemented.
- Remove the decision-surface correctness item from hard blockers.
- Keep a note that future decision families must register in the manifest.

Append `docs/PROJECT_LEDGER.md` with:
- Type: UI/engine decision-surface correctness.
- Determinism: manifest is deterministic, family order stable, no random/timestamp behavior.
- Tests/build commands and outcomes.

**Step 4: Commit**

Use a scoped commit such as:

```powershell
git add src/desktop/convoy_ipc_contract.cjs src/desktop/electron-main.cjs src/desktop/desktop_sim.ts src/state/player_decision_manifest.ts src/sim/events/evaluate_events.ts data/scenarios/events/war_1992.json data/scenarios/events/war_1993.json data/scenarios/events/war_1994.json data/scenarios/events/war_1995.json src/ui/map/data/GameStateAdapter.ts src/ui/map/data/types.ts src/ui/map/data/preAdvanceCommandReview.ts src/ui/map/data/presidentialDecisionRoom.ts tests/desktop_convoy_decision_contract.test.ts tests/event_response_ownership_catalog.test.ts tests/player_decision_manifest.test.ts tests/desktop_player_decision_gate_contract.test.ts docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md docs/40_reports/GUI_MASTER.md docs/plans/MASTER_ROADMAP.md docs/PROJECT_LEDGER.md
git commit -m "fix(ui): enforce presidential decision-surface contract"
```

## Acceptance Criteria

- Convoy decisions shown in UI resolve through `state.military.pending_convoy_decisions`; root `state.pending_convoy_decisions` is not used.
- Every `requires_player_response: true` event has an explicit valid `responding_faction`.
- `evaluateEvents(...)` only queues a player decision for the responding faction.
- A manifest lists every current generated player decision family with owner surface, resolver, and gate policy.
- UI pre-advance review and Decision Room blocked/readiness counts consume the manifest summary.
- Desktop `advance-turn` hard-blocking consumes the same manifest through the desktop sim bundle.
- Regression tests cover convoy path, event owner catalog, evaluator scoping, manifest counts, UI readiness, and desktop gate.

## Determinism Safeguards

- Manifest family order is a static array.
- Event catalog test sorts file names and reports missing owners deterministically.
- No random input, timestamps, generated scenario artifacts, or calibration baselines are introduced.
- JSON event edits add metadata ownership only; they do not alter trigger conditions, effects, response weights, or narrative text unless a separate canon-reviewed change is explicitly approved.
