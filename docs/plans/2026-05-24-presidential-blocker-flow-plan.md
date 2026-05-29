# Presidential Blocker Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Presidential Inbox and advance-turn blockers explain exactly what blocks the turn and route every blocker to an actionable decision surface.

**Architecture:** Keep the current React shell and existing decision modals. Add a small, player-facing blocker read model that converts existing pending decision state into direct actions; then make Inbox clicks and advance-block review use that direct model instead of sending the player to the broad Decision Room when a concrete modal exists.

**Tech Stack:** TypeScript, React, Zustand store, Vitest, existing `src/ui/map` read models and modals.

---

## Task 1: Add a Direct Blocker Read Model

**Files:**
- Create: `src/ui/map/data/presidentialBlockers.ts`
- Test: `tests/ui/presidential_blockers.test.ts`

**Step 1: Write failing tests**

Test cases:

- Event decisions become `event_modal` blockers scoped to `state.player_faction`.
- Convoy decisions become `convoy_decision_modal` blockers with the convoy id.
- Peace plans become `peace_plan_modal` blockers.
- Dayton negotiation becomes `dayton_modal`.
- Paramilitary requests become `paramilitary_review`.
- The list is stable sorted by severity and priority.
- The title/subtitle use player-facing language and do not expose raw ids such as `route_faction`, `target_enclave`, or `corps_id`.

**Step 2: Run tests and confirm failure**

Run:

```powershell
npx.cmd vitest run tests\ui\presidential_blockers.test.ts --reporter=dot
```

Expected: fail because `presidentialBlockers.ts` does not exist.

**Step 3: Implement minimal read model**

Create:

```ts
import type { LoadedGameState } from './types';
import type { InboxItem } from './inboxItems';
import { deriveInboxItems } from './inboxItems';

export type PresidentialBlockerAction = InboxItem['action'];

export interface PresidentialBlocker {
  id: string;
  title: string;
  subtitle: string;
  action: PresidentialBlockerAction;
  actionLabel: string;
  priority: number;
}

export function derivePresidentialBlockers(
  state: LoadedGameState | null,
  osidNameMap: Record<string, string> | null,
): PresidentialBlocker[] {
  const inboxItems = deriveInboxItems(state, osidNameMap);
  return inboxItems
    .filter((item) => item.severity === 'blocking' || item.type === 'peace_plan')
    .filter((item) => item.action !== 'army_hq_briefing' && item.action !== 'army_hq_opportunity' && item.action !== 'none')
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      action: item.action,
      actionLabel: actionLabelFor(item.action),
      priority: item.priority,
    }))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

function actionLabelFor(action: PresidentialBlockerAction): string {
  if (action === 'event_modal') return 'Open Decision';
  if (action === 'peace_plan_modal') return 'Review Peace Plan';
  if (action === 'dayton_modal') return 'Open Dayton Talks';
  if (action === 'paramilitary_review') return 'Review Authorization';
  if (action === 'convoy_decision_modal') return 'Review Convoy';
  if (action === 'autonomy_panel') return 'Review Proposal';
  if (action === 'army_reserve') return 'Review Reserve';
  if (action === 'army_hq_personnel') return 'Review Personnel';
  if (action === 'dismiss_intelligence_notification') return 'Acknowledge';
  return 'Review';
}
```

**Step 4: Run tests and confirm pass**

Run:

```powershell
npx.cmd vitest run tests\ui\presidential_blockers.test.ts --reporter=dot
```

Expected: pass.

---

## Task 2: Make Inbox Blocking Cards Direct and Explicit

**Files:**
- Modify: `src/ui/map/components/PresidentialInbox.tsx`
- Modify: `src/ui/map/data/inboxItems.ts`
- Test: `tests/ui/inbox_items.test.ts`
- Test: `tests/ui/inbox_dedup.test.ts`

**Step 1: Write failing tests**

Add/adjust tests so:

- Every blocking inbox item has an action that is not `army_hq_briefing`.
- Event decision card action is `event_modal`.
- Paramilitary card action is `paramilitary_review`.
- Dayton card action is `dayton_modal`.
- Blocking card subtitle says the concrete reason, not generic "review pending."
- Convoy card language does not print raw `route_faction` / `target_enclave`; use generic "humanitarian convoy request" language unless display labels exist.

**Step 2: Run tests and confirm failure if current language/actions are insufficient**

Run:

```powershell
npx.cmd vitest run tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts --reporter=dot
```

Expected: fail on any new expectations for direct language or raw-id suppression.

**Step 3: Implement minimal inbox cleanup**

In `src/ui/map/data/inboxItems.ts`:

- Keep current direct `event_modal`, `paramilitary_review`, `convoy_decision_modal`, `dayton_modal`, and `peace_plan_modal` actions.
- Replace convoy subtitle construction with player-facing wording:

```ts
subtitle: `${convoy.supply_amount} supply shipment awaits allow, block, or divert orders.`
```

- Replace reserve fallback corps name with a player-safe generic when no display label is available:

```ts
const corpsName = 'A corps command';
```

In `PresidentialInbox.tsx`:

- For blocking cards, render a clearer action hint: `Click to resolve this blocker`.
- Do not route blocking cards to Decision Room.

**Step 4: Run tests**

Run:

```powershell
npx.cmd vitest run tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts --reporter=dot
```

Expected: pass.

---

## Task 3: Replace Advance-Blocked Routing With a Blocker List

**Files:**
- Modify: `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- Modify: `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- Modify: `src/ui/map/App.tsx`
- Test: `tests/ui/advance_turn_button_gated_feedback.test.ts`
- Test: `tests/ui/pre_advance_command_review.test.ts`

**Step 1: Write failing tests**

Expected behavior:

- When advance is blocked by a concrete pending decision, the Warroom advance button opens a blocker list, not just Decision Room.
- The blocker list includes each blocker title and a direct action button.
- Clicking a blocker row invokes the same action dispatch path as Inbox.
- Generic Decision Room review remains available as a secondary action, not the primary blocker route.

**Step 2: Run tests and confirm failure**

Run:

```powershell
npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\pre_advance_command_review.test.ts --reporter=dot
```

Expected: fail because the current blocked advance path routes primarily to review priorities / Decision Room.

**Step 3: Add shared action dispatcher in `App.tsx`**

Extract the current inline `PresidentialInbox onAction` callback into a named function:

```ts
const handlePresidentialAction = (action: InboxItem['action'], itemId: string) => {
  // existing logic from PresidentialInbox onAction
};
```

Use it from:

- `PresidentialInbox`
- new advance blocker list
- any Warroom blocker action callback

**Step 4: Add blocker list UI**

Use `derivePresidentialBlockers(loadedGameState, osidDisplayNames)` in the blocked advance path.

Display:

- Header: `Resolve Before Advancing`
- Body: `The week cannot advance until these presidential decisions are resolved.`
- Rows: title, subtitle, action button.
- Secondary button: `Open Decision Room` for broader context.

Keep styling in the existing dark command-shell palette.

**Step 5: Run tests**

Run:

```powershell
npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\pre_advance_command_review.test.ts --reporter=dot
```

Expected: pass.

---

## Task 4: Make Decision Room Non-Blocking by Presentation

**Files:**
- Modify: `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- Modify: `src/ui/map/data/presidentialDecisionRoom.ts`
- Test: `tests/ui_presidential_decision_room_wiring.test.ts`

**Step 1: Write failing tests**

Expected behavior:

- Decision Room cards that represent direct blockers use action labels that point to the concrete owner: `Open Inbox` only if no direct modal action exists.
- Decision Room empty/non-action cards are visibly disabled.
- No card with `navigationTarget.kind === 'none'` is presented as if it can resolve a blocker.

**Step 2: Run tests and confirm failure where current presentation is ambiguous**

Run:

```powershell
npx.cmd vitest run tests\ui_presidential_decision_room_wiring.test.ts --reporter=dot
```

**Step 3: Adjust copy and fallback behavior**

Minimal changes:

- Change broad blocker text from "Review Queue" to "Resolve in Inbox" unless a direct blocker list owns it.
- Avoid wording that implies the Decision Room itself resolves decisions.
- Ensure disabled buttons are visually muted and have explanatory titles.

**Step 4: Run tests**

Run:

```powershell
npx.cmd vitest run tests\ui_presidential_decision_room_wiring.test.ts --reporter=dot
```

Expected: pass.

---

## Task 5: Verify and Document

**Files:**
- Modify: `docs/PROJECT_LEDGER.md`
- Optional Modify: `docs/40_reports/GUI_MASTER.md` if the implemented behavior changes the canonical GUI contract.

**Step 1: Run focused verification**

Run:

```powershell
npx.cmd vitest run tests\ui\presidential_blockers.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui_shell_navigation.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

Expected: all pass.

**Step 2: Add ledger entry**

Add a `2026-05-24` ledger entry summarizing:

- Inbox blockers now route to direct decision owners.
- Advance-blocked path now explains exact blockers.
- Decision Room remains context/synthesis, not the primary blocker resolver.
- Verification commands and results.

**Step 3: Optional browser check**

If time permits, run:

```powershell
npm.cmd run dev:map -- --host 127.0.0.1
```

Then inspect a save with pending decisions and confirm:

- Inbox card opens the concrete modal.
- Advance blocked screen names the blocker.
- The blocker row opens the same concrete modal.

---

## Non-Goals

- Do not redesign the full President's Desk in this slice.
- Do not remove Army HQ or Decision Room.
- Do not change simulation decision queues.
- Do not invent new decision families.
- Do not change tactical map controls.
