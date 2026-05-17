# GUI Polish Findings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the live GUI polish findings into a tested, shippable implementation sequence, starting with the RS paramilitary inbox blocker.

**Architecture:** Treat the Presidential Inbox as the player-facing decision queue. Expose missing simulator queues through `LoadedGameState`, derive explicit inbox items from them, route those items to small focused UI panels/modals, and verify with unit tests plus browser/Electron smoke checks. Keep cosmetic polish behind the sensitive-history and player-faction filtering fixes.

**Tech Stack:** TypeScript, React, Zustand game store, Electron preload/IPC, Vite tactical map, Vitest, Puppeteer/Playwright-style browser verification.

---

## Scope And Priority

This plan covers the findings added to `docs/40_reports/GUI_POLISH_MASTER.md` on 2026-05-16:

1. `LIV-P0-1`: RS `pending_paramilitary_requests` exist in simulation state but are not surfaced in Presidential Inbox.
2. `LIV-P1-2`: RS Inbox can show ARBiH personnel matters because pending officer events are not filtered to the player faction.
3. `LIV-P1-3`: Browser-dev cannot advance real turns without Electron IPC; QA needs an explicit turn-loop path.
4. `LIV-P1-4`: Warroom no-state placeholder and hotspot labels need user-facing affordances.
5. `LIV-P1-5` / `P0-1`: AdvanceTurnModal palette must be dark-shell consistent; current workspace may already contain a pending fix, so verify before editing.
6. `LIV-P2-6` / `P1-31`: First-run sequence is improved but still needs an acceptance pass.

Do these in order. Do not start cosmetic polish until Tasks 1-3 pass.

## Required Reading Before Implementation

- `docs/40_reports/GUI_POLISH_MASTER.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/components/PresidentialInbox.tsx`
- `src/ui/map/App.tsx`
- `src/sim/combat/paramilitary_sweep.ts`
- `src/desktop/electron-main.cjs`
- `src/desktop/preload.cjs`
- `src/ui/map/desktop/useIPC.ts`

## Task 0: Protect Existing Workspace Changes

**Files:**
- Read only: `git status --short`
- Read only: any modified files before editing them

**Step 1: Inspect active changes**

Run:

```powershell
git status --short
git diff -- src/ui/map/components/warroom/AdvanceTurnModal.tsx
```

Expected: Identify whether `AdvanceTurnModal.tsx` and tests already contain user or prior-session changes.

**Step 2: Decide ownership**

If a file is already modified and the change is relevant, work with it. Do not revert or overwrite it. If the file is unrelated, leave it alone.

**Step 3: Commit boundary**

Do not commit until all tests for the current task pass and the ledger/report updates are ready.

## Task 1: Expose Paramilitary Requests In The UI Data Contract

**Files:**
- Modify: `src/ui/map/data/types.ts`
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Test: `tests/ui/paramilitary_inbox_items.test.ts` or extend `tests/ui/inbox_items.test.ts`

**Step 1: Write the failing adapter/derivation test**

Add a test that builds a minimal loaded state with `player_faction: 'RS'` and `pendingParamilitaryRequests`.

```ts
import { describe, expect, it } from 'vitest';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'rs turn 1',
    turn: 1,
    phase: 'war',
    formations: [],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RS',
    ...overrides,
  } as LoadedGameState;
}

describe('paramilitary Presidential Inbox items', () => {
  it('surfaces RS pending paramilitary requests with explicit warning copy', () => {
    const state = makeState({
      pendingParamilitaryRequests: [
        { faction: 'RS', strength: 150, target_osid: 'op:bijeljina:bijeljina_2' },
      ],
    });

    const items = deriveInboxItems(state, null);
    const paramilitary = items.find((item) => item.type === 'paramilitary_request');

    expect(paramilitary).toBeDefined();
    expect(paramilitary?.severity).toBe('blocking');
    expect(paramilitary?.action).toBe('paramilitary_review');
    expect(`${paramilitary?.title} ${paramilitary?.subtitle}`.toLowerCase()).toContain('paramilitary');
    expect(`${paramilitary?.title} ${paramilitary?.subtitle}`.toLowerCase()).toContain('war crimes');
  });
});
```

Run:

```powershell
npx.cmd vitest run tests\ui\paramilitary_inbox_items.test.ts
```

Expected: FAIL because `pendingParamilitaryRequests`, `paramilitary_request`, and `paramilitary_review` do not exist yet.

**Step 2: Add the loaded-state type**

In `src/ui/map/data/types.ts`, add:

```ts
export interface LoadedParamilitaryRequest {
  faction: string;
  strength: number;
  target_osid: string;
  decision?: 'allow' | 'deny';
  mode?: 'rear_pocket' | 'offensive';
}
```

Then add to `LoadedGameState`:

```ts
pendingParamilitaryRequests?: LoadedParamilitaryRequest[];
```

**Step 3: Map root simulator state into `LoadedGameState`**

In `src/ui/map/data/GameStateAdapter.ts`, derive root-level `state.pending_paramilitary_requests`.

Implementation requirements:
- Read `state.pending_paramilitary_requests`, not `state.military.pending_paramilitary_requests`.
- Filter to `playerFaction` when `playerFaction` is present.
- Preserve stable order from the serialized queue.
- Coerce only valid records with string `faction`, string `target_osid`, and finite numeric `strength`.

Suggested helper shape:

```ts
function derivePendingParamilitaryRequests(state: any, playerFaction: string | null): LoadedGameState['pendingParamilitaryRequests'] {
  const requests = state.pending_paramilitary_requests as any[] | undefined;
  if (!Array.isArray(requests) || requests.length === 0) return undefined;

  const parsed = requests
    .filter((req) => !playerFaction || req?.faction === playerFaction)
    .filter((req) => typeof req?.faction === 'string' && typeof req?.target_osid === 'string')
    .map((req) => ({
      faction: String(req.faction),
      strength: Number.isFinite(Number(req.strength)) ? Number(req.strength) : 0,
      target_osid: String(req.target_osid),
      ...(req.decision === 'allow' || req.decision === 'deny' ? { decision: req.decision } : {}),
      ...(req.mode === 'rear_pocket' || req.mode === 'offensive' ? { mode: req.mode } : {}),
    }));

  return parsed.length > 0 ? parsed : undefined;
}
```

Wire it wherever `pendingOfficerEvents` is currently derived and assigned.

**Step 4: Run focused tests**

Run:

```powershell
npx.cmd vitest run tests\ui\paramilitary_inbox_items.test.ts tests\ui\inbox_items.test.ts
```

Expected: New adapter/type errors may remain until Task 2 adds inbox item derivation.

## Task 2: Add Paramilitary Inbox Item Derivation And Rendering

**Files:**
- Modify: `src/ui/map/data/inboxItems.ts`
- Modify: `src/ui/map/components/PresidentialInbox.tsx`
- Modify: `src/ui/map/App.tsx`
- Test: `tests/ui/paramilitary_inbox_items.test.ts`

**Step 1: Extend inbox unions**

In `src/ui/map/data/inboxItems.ts`:

```ts
export type InboxItemType =
  | 'event_decision'
  | 'peace_plan'
  | 'paramilitary_request'
  | 'reserve_request'
  | 'officer_event'
  | 'operation_opportunity'
  | 'autonomy_proposal'
  | 'situation';
```

Add action:

```ts
action:
  | 'event_modal'
  | 'peace_plan_modal'
  | 'paramilitary_review'
  | 'army_reserve'
  | 'army_hq_personnel'
  | 'army_hq_opportunity'
  | 'army_hq_briefing'
  | 'autonomy_panel'
  | 'none';
```

**Step 2: Derive a blocking paramilitary item**

Place this before reserve requests so it ranks above ordinary personnel/logistics:

```ts
const paramilitaryRequests = state.pendingParamilitaryRequests ?? [];
if (paramilitaryRequests.length > 0) {
  const totalStrength = paramilitaryRequests.reduce((sum, req) => sum + (Number(req.strength) || 0), 0);
  const samplePlace = getOsidDisplayName(paramilitaryRequests[0]?.target_osid ?? '', osidNameMap);
  items.push({
    id: `paramilitary:${state.turn ?? 0}`,
    type: 'paramilitary_request',
    severity: 'blocking',
    title: 'Paramilitary Authorization',
    subtitle: `${paramilitaryRequests.length} deployment request${paramilitaryRequests.length === 1 ? '' : 's'} near ${samplePlace}; approval risks war crimes and civilian casualties. Estimated strength ${totalStrength}.`,
    action: 'paramilitary_review',
    priority: 25,
  });
}
```

Acceptance rule: the words `paramilitary` and `war crimes` must be visible in the item text.

**Step 3: Render the label**

In `src/ui/map/components/PresidentialInbox.tsx`, add:

```ts
paramilitary_request: 'PARAMILITARY',
```

**Step 4: Route the action**

In `src/ui/map/App.tsx`, extend the inbox action handler:

```ts
if (action === 'paramilitary_review') {
  openPrimaryRail('paramilitary_review');
  return;
}
```

If the rail system does not support arbitrary panels, add a minimal modal state instead. Keep the first implementation small: one review surface is enough.

**Step 5: Run tests**

Run:

```powershell
npx.cmd vitest run tests\ui\paramilitary_inbox_items.test.ts tests\ui\inbox_items.test.ts tests\ui_presidential_toolbar_summary_click.test.ts
```

Expected: PASS before moving to IPC/action handling.

## Task 3: Implement Paramilitary Review Decisions End-To-End

**Files:**
- Modify/create: `src/ui/map/components/ParamilitaryReviewPanel.tsx`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/desktop/useIPC.ts`
- Modify: `src/desktop/preload.cjs`
- Modify: `src/desktop/electron-main.cjs`
- Test: `tests/ui/paramilitary_review_panel.test.ts`
- Test: extend `tests/paramilitary_sweep.test.ts` only if resolver semantics change

**Step 1: Write the failing UI test**

The panel must show:
- Count of pending requests.
- Target OSID display names when available.
- Warning text: "war crimes" and "civilian casualties".
- Two actions: deny all and authorize selected/all.

```ts
it('renders explicit warning and calls decision handler', async () => {
  // Mount ParamilitaryReviewPanel with one RS request.
  // Assert visible text includes "Paramilitary", "war crimes", and "civilian casualties".
  // Click "Deny All".
  // Expect onDecision([{ target_osid: 'op:bijeljina:bijeljina_2', decision: 'deny' }]).
});
```

Run:

```powershell
npx.cmd vitest run tests\ui\paramilitary_review_panel.test.ts
```

Expected: FAIL because panel does not exist.

**Step 2: Create the panel**

`src/ui/map/components/ParamilitaryReviewPanel.tsx` should:
- Read `loadedGameState.pendingParamilitaryRequests`.
- Group or list requests in stable order.
- Use the dark panel tokens already used by `PresidentialInbox`.
- Provide `Deny All` and `Authorize Selected` initially. Per-request checkboxes are acceptable; if time is tight, do all-allow/all-deny first.
- Never use celebratory language. This is a sober sensitive-history decision.

Suggested warning copy:

```txt
Authorizing paramilitary deployments can accelerate control operations, but these formations are associated with civilian casualties and war crimes. Denial preserves a cleaner record and may reduce later diplomatic isolation.
```

**Step 3: Add IPC surface**

In `src/ui/map/desktop/useIPC.ts`, add:

```ts
submitParamilitaryDecisions: (decisions: Array<{ target_osid: string; decision: 'allow' | 'deny' }>) => Promise<{ ok: boolean; error?: string; state?: unknown }>;
```

In `src/desktop/preload.cjs`, expose:

```js
submitParamilitaryDecisions: (decisions) => ipcRenderer.invoke('submit-paramilitary-decisions', decisions),
```

In `src/desktop/electron-main.cjs`, add handler:
- Parse `currentGameStateJson`.
- Find `state.pending_paramilitary_requests`.
- For each request matching the player faction and `target_osid`, set `decision`.
- Leave unmatched requests unchanged.
- Call `resolvePlayerParamilitaryDecisions(state)` only after all pending player requests have an explicit decision, or after a submit action that intentionally decides all pending requests.
- Serialize/update `currentGameStateJson`.
- Return `{ ok: true, state }` using the same shape as nearby IPC handlers.

**Step 4: Preserve determinism**

Implementation rules:
- Match requests by stable `target_osid` plus `faction`.
- Sort outbound decisions by `target_osid` before applying if the UI can submit unordered arrays.
- Do not insert timestamps.
- Do not use random IDs.

**Step 5: Run focused tests**

Run:

```powershell
npx.cmd vitest run tests\paramilitary_sweep.test.ts tests\ui\paramilitary_review_panel.test.ts tests\ui\paramilitary_inbox_items.test.ts
```

Expected: PASS.

## Task 4: Filter Pending Officer Events To The Player Faction

**Files:**
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Test: `tests/sim/command/phase4_ui_data_layer.test.ts`
- Test: `tests/ui/inbox_items.test.ts`

**Step 1: Write the failing adapter test**

Add a test that parses a state with `meta.player_faction = 'RS'` and two pending officer events: one `RS`, one `RBiH`. Expected parsed `pendingOfficerEvents` contains only the RS event.

```ts
expect(parsed.pendingOfficerEvents?.map((event) => event.faction)).toEqual(['RS']);
```

Run:

```powershell
npx.cmd vitest run tests\sim\command\phase4_ui_data_layer.test.ts
```

Expected: FAIL because all unacknowledged events are currently mapped.

**Step 2: Update `derivePendingOfficerEvents`**

Change signature:

```ts
function derivePendingOfficerEvents(state: any, playerFaction: string | null): LoadedGameState['pendingOfficerEvents']
```

Filter:

```ts
.filter((e: any) => !playerFaction || e.faction === playerFaction)
```

Apply before mapping. If `playerFaction` is absent, keep current behavior for dev/headless fixtures.

**Step 3: Run tests**

Run:

```powershell
npx.cmd vitest run tests\sim\command\phase4_ui_data_layer.test.ts tests\ui\inbox_items.test.ts tests\ui\paramilitary_inbox_items.test.ts
```

Expected: PASS. Verify the RS fixture no longer shows Sefer Halilovic unless the player faction is RBiH or the item is deliberately reclassified as foreign intelligence.

## Task 5: Make Browser-Dev Turn-Loop QA Explicit

**Files:**
- Modify: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- Modify: `docs/40_reports/GUI_POLISH_MASTER.md`
- Optional create: `tools/gui/rs_turn_loop_observation.cjs`

**Step 1: Document the split**

Add a short section to `TACTICAL_MAP_SYSTEM.md`:

```md
### Browser Dev vs Electron Turn Advancement

`npm run dev:map` is authoritative for visual inspection, loading saves, and browser-only UI checks. It does not advance real turns because `PresidentialToolbar` disables advance without Electron IPC. End-to-end turn-loop QA must use Electron or `dist/desktop/desktop_sim.cjs` and then load the resulting save into the browser UI.
```

**Step 2: Optional harness**

If the team wants repeatable observation artifacts, create `tools/gui/rs_turn_loop_observation.cjs` to:
- Start an RS `apr_1992` campaign through `dist/desktop/desktop_sim.cjs`.
- Advance to turns 1, 8, and 16.
- Write saves to `tmp_gui_observation/`.
- Print pending paramilitary counts by turn.

Do not commit generated `tmp_gui_observation/` artifacts.

**Step 3: Verification**

Run:

```powershell
npm.cmd run desktop:map:build
node tools\gui\rs_turn_loop_observation.cjs
```

Expected: Build passes; script prints nonzero RS paramilitary request counts for early turns.

## Task 6: Close Or Re-Verify AdvanceTurnModal Palette

**Files:**
- Modify only if needed: `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- Test: `tests/modal_migration.test.ts`
- Test: relevant shell/frame test if present

**Step 1: Check current source before editing**

Run:

```powershell
git diff -- src/ui/map/components/warroom/AdvanceTurnModal.tsx
Select-String -Path src/ui/map/components/warroom/AdvanceTurnModal.tsx -Pattern 'bg-neutral-50|bg-neutral-100|bg-white|border-neutral-400'
```

Expected: If no light-theme classes remain and the current diff is intentional, do not edit. Mark the report item as pending verification or resolved after tests/browser check.

**Step 2: If still light-themed, migrate to dark shell tokens**

Use:
- `bg-panel-bg`
- `bg-panel-card`
- `border-panel-border`
- `text-text-primary`
- `text-text-secondary`
- `accent-gold` for the primary action

Do not change modal behavior.

**Step 3: Verify**

Run:

```powershell
npx.cmd vitest run tests\modal_migration.test.ts tests\ui_shell_frame_contract.test.ts
npm.cmd run desktop:map:build
```

Then capture a browser screenshot of the modal.

Expected: Modal visually matches the dark campaign shell and no light neutral panel remains.

## Task 7: Add Warroom No-State CTA And Visible Hotspot Labels

**Files:**
- Modify: `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- Test: `tests/warroom_shell_layer.test.ts`
- Test: `tests/ui/warroom_shell_accessibility.test.ts`

**Step 1: Write failing tests**

Add tests for:
- No-state warroom renders an "Open Side Picker" or "Choose Side" button.
- Hotspot hover/focus renders visible label text, not only `title`/`aria-label`.

Expected failing assertions:

```ts
expect(screen.getByRole('button', { name: /choose side|open side picker/i })).toBeTruthy();
expect(screen.getByText(/army hq|map|calendar/i)).toBeTruthy();
```

**Step 2: Add CTA**

In the no-state branch of `WarroomShellLayer.tsx`, render a button below the unavailable text. Wire it to the same state/action used by the main app to open `SidePickerOverlay`. If that action is not currently injectable, pass a callback prop from `App.tsx`.

**Step 3: Add visible hotspot labels**

For `WarroomHotspot`, keep `aria-label` and `title`, but render a small label when `hovered` or focused:

```tsx
{hovered && (
  <span className="pointer-events-none absolute left-0 top-0 translate-y-[-100%] border border-accent-gold/40 bg-panel-bg/95 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-gold">
    {accessibleLabel}
  </span>
)}
```

If inline styles dominate this component, implement the same visual language with inline styles.

**Step 4: Verify**

Run:

```powershell
npx.cmd vitest run tests\warroom_shell_layer.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\warroom_smoke.test.ts
```

Expected: PASS.

## Task 8: First-Run Sequence Acceptance Pass

**Files:**
- Modify only if acceptance fails: `src/ui/map/App.tsx`, `src/ui/map/components/PeaceWarTransition.tsx`, `src/ui/map/components/onboarding/OnboardingOverlay.tsx`, `src/ui/map/components/PresidentialInbox.tsx`
- Test: `tests/ui/first_turn_orientation.test.ts`
- Test: `tests/ui/peace_war_transition.test.ts`
- Test: `tests/v092_tutorial_lane_e_overlay_a11y.test.ts`

**Step 1: Define acceptance criteria**

For a new RS campaign:
- First screen shows side picker.
- After side selection, exactly one modal/overlay owns focus.
- War Begins is not underneath rails.
- Tutorial does not appear until War Begins is dismissed.
- Opening brief remains in Presidential Inbox and does not block map interaction after dismissal.

**Step 2: Run existing tests**

Run:

```powershell
npx.cmd vitest run tests\ui\first_turn_orientation.test.ts tests\ui\peace_war_transition.test.ts tests\v092_tutorial_lane_e_overlay_a11y.test.ts
```

Expected: PASS.

**Step 3: Browser smoke**

Open:

```txt
http://127.0.0.1:3002/tactical_map.html
```

Select RS and observe the sequence manually or via Puppeteer. Capture screenshots only if behavior regresses.

Expected: No stacked overlays. If sequence still feels too long, log as product UX work, not a blocker.

## Task 9: Final Regression And Documentation

**Files:**
- Modify: `docs/40_reports/GUI_POLISH_MASTER.md`
- Modify: `docs/40_reports/GUI_MASTER.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Optional create: `docs/40_reports/implemented/YYYYMMDD_GUI_POLISH_INBOX_AND_WARROOM_FIXES.md`

**Step 1: Run full focused regression**

Run:

```powershell
npx.cmd vitest run tests\ui\paramilitary_inbox_items.test.ts tests\ui\inbox_items.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\paramilitary_sweep.test.ts tests\warroom_shell_layer.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\modal_migration.test.ts tests\ui\first_turn_orientation.test.ts tests\ui\peace_war_transition.test.ts
npm.cmd run typecheck
npm.cmd run desktop:map:build
```

Expected: All pass, except known existing Vite warning noise.

**Step 2: Live smoke**

Use Electron if available. If using browser-dev:
- Generate RS turn 1 and turn 8 saves through `dist/desktop/desktop_sim.cjs`.
- Load them into `tactical_map.html`.
- Confirm Presidential Inbox shows paramilitary warning item.
- Confirm approving/denying changes the queue in Electron or documented IPC harness.
- Confirm RS no longer sees ARBiH personnel matters.
- Confirm warroom no-state CTA exists.
- Confirm hotspot visible label appears on hover/focus.

**Step 3: Update report statuses**

In `docs/40_reports/GUI_POLISH_MASTER.md`:
- Mark `LIV-P0-1` resolved only when the RS paramilitary card and decision routing are verified.
- Mark `LIV-P1-2` resolved only when player-faction officer filtering passes tests.
- Mark `P0-1` resolved only after source and screenshot verify the dark modal.
- Keep any deferred polish items open.

**Step 4: Ledger and implementation report**

Append a `docs/PROJECT_LEDGER.md` entry with:
- Type: UI sensitive-history decision routing / polish.
- Behavior change: UI now exposes pending paramilitary decisions and filters officer events.
- Determinism: stable queue ordering, no timestamps/randomness.
- Verification commands and browser/Electron smoke evidence.

If implementation changes span multiple areas, create an implemented report under `docs/40_reports/implemented/`.

## Recommended Commit Sequence

1. `fix(ui): surface paramilitary requests in presidential inbox`
2. `fix(ui): filter officer inbox events to player faction`
3. `feat(ui): add paramilitary review decision routing`
4. `fix(ui): add warroom no-state and hotspot affordances`
5. `docs(gui): document turn-loop QA path and close polish findings`

Keep each commit testable. Do not mix the palette/modal cleanup with the sensitive-history inbox fix unless the working tree already contains that modal fix and it is ready to land.
