# Convoy System Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the six convoy-system gaps surfaced by the 2026-05-16 end-to-end survey that ran on top of the Presidential Decision Surface Correctness Plan Task 1 lane fix.

**Architecture:** Treat humanitarian convoys as a first-class player decision family with a real modal, real pre-advance visibility, real engine-lifecycle test coverage, an explicit aging policy, and an explicit owner-semantics ruling. Do not invent canon — block on game-designer + historian rulings for the two policy-shaped tasks (3 and 4) and ship the engineering-tractable tasks (1, 2, 5) independently.

**Tech Stack:** TypeScript simulation/state code, React tactical-map modal + inbox, Vitest, JSON event catalogs not affected, desktop sim bundle not affected by this plan (parent plan owns the desktop gate).

**Implementation status 2026-05-16:** Tasks 1 and 2 are implemented. Task 5 documentation/regression closeout is partially complete. Tasks 3 and 4 remain blocked on canon/design rulings. Report: `docs/40_reports/implemented/20260516_CONVOY_SYSTEM_COMPLETION.md`.

---

## Scope

Source survey: chat-only output following the 2026-05-16 Presidential Decision Surface Correctness Plan Task 1 lane. Six gaps identified, none of which are addressed by the parent plan's remaining Codex lanes (Tasks 2–6):

1. **No dedicated convoy decision modal.** `SituationTab.tsx:150` is the only resolver UI today; the parent plan's `modal_required` gate policy implies a focused modal exists, but none does.
2. **Pre-advance review silently ignores convoys** (`src/ui/map/data/preAdvanceCommandReview.ts`). Player can advance with pending convoy decisions and not see them in the readiness checklist.
3. **No expiry / aging field on `PendingConvoyDecision`.** Pending convoys live forever in the queue. Real humanitarian convoy windows did not.
4. **Route-controller-vs-target-owner asymmetry** (`src/state/supply_reserves.ts:592`). Only the route-controlling faction sees the decision. Target-enclave owner has no surface, even when they are the political beneficiary.
5. **No engine-lifecycle test coverage.** `evaluateHumanitarianConvoys` and `applyHumanitarianConvoyDecisions` are exercised only implicitly by `tests/phase_c_supply_agency.test.ts`.
6. **Same-turn generate + apply** in `src/sim/turn_phases/war_phases.ts:2510-2521`. Works for player-route convoys because they persist into `remaining`, but a non-player-route convoy gets auto-resolved before any player ever sees it (sub-issue of gap 4).

This plan does **not** redesign the convoy economy, change IVP weights, change supply amounts, or change scenario outputs. Engineering tasks are byte-identical-baseline safe. Policy tasks ship behind canon rulings.

## Required Reading

- `docs/plans/2026-05-16-presidential-decision-surface-correctness-plan.md` (parent plan)
- `docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md`
- `src/state/game_state.ts` — `PendingConvoyDecision` interface (line 853)
- `src/state/supply_reserves.ts` — `evaluateHumanitarianConvoys` (line 551) and `applyHumanitarianConvoyDecisions` (line 580)
- `src/sim/turn_phases/war_phases.ts` lines 2510–2521 — `evaluate-humanitarian-convoys` step
- `src/desktop/convoy_ipc_contract.cjs` — staging helper landed in parent plan Task 1
- `src/desktop/electron-main.cjs` lines 2302–2317 — IPC handler
- `src/desktop/preload.cjs` line 84 — renderer binding
- `src/ui/map/desktop/useIPC.ts` lines 87, 283-284 — typed hook
- `src/ui/map/data/GameStateAdapter.ts` line 1069 — adapter view population
- `src/ui/map/data/types.ts` line 780 — `pendingConvoyDecisions` field on `LoadedGameState`
- `src/ui/map/data/inboxItems.ts` lines 175–186 — inbox card
- `src/ui/map/components/SituationTab.tsx` line 150 — current resolver UI
- `src/ui/map/App.tsx` line 838 — `war_summary_convoys` action route
- `src/state/player_decision_manifest.ts` lines 89–90 — manifest entry (already present)
- `src/ui/map/components/PeacePlanModal.tsx` — pattern reference for new modal
- `tests/phase_c_supply_agency.test.ts` — incidental coverage of the lifecycle

## Coordination With Parent Plan

- **Parent plan Task 4 (UI Review Counts)** is expected to add `convoy_decision` family entries from the manifest summary into pre-advance review and Decision Room counters. THIS plan's Task 2 (modal) and Task 5 (visibility regression) assume that landed. If parent Task 4 does **not** include convoy_decision when it merges, add a fallback step here (see Task 5 contingency).
- **Parent plan Task 5 (Desktop Advance Gate)** wires `listBlockingPlayerDecisions` into `advance-turn`. THIS plan does not touch the gate; it only widens the *visibility* and *resolver* surfaces feeding into it.
- **Parent plan Task 1** is the IPC contract fix this plan stacks on. No conflicts.

## Parallelization

- **Task 1 (engine tests)** ships immediately. No dependencies.
- **Task 2 (modal)** can start once parent plan Task 4 (manifest-driven UI) merges. Pure UI, no engine touch.
- **Task 3 (expiry RFC)** blocks on a canon ruling. Implementation only after ruling.
- **Task 4 (owner-semantics RFC)** blocks on a canon ruling. Implementation only after ruling.
- **Task 5 (final regression + ledger)** runs last.

Tasks 1 and 2 can both ship without 3/4 ever being resolved. Tasks 3 and 4 are decoupled — either can ship without the other.

---

## Task 0: Baseline And Coordination Check

**Files:** read-only

**Step 1: Confirm parent plan state**

Run:

```powershell
git log --oneline -20 -- docs/plans/2026-05-16-presidential-decision-surface-correctness-plan.md src/state/player_decision_manifest.ts src/ui/map/data/preAdvanceCommandReview.ts src/ui/map/data/presidentialDecisionRoom.ts
git status --short
```

Expected: Identify whether Codex's lanes have merged. If parent Task 4 has shipped, confirm `convoy_decision` is in the manifest summary feeding pre-advance review.

**Step 2: Run focused baseline**

```powershell
npx.cmd vitest run tests\desktop_convoy_decision_contract.test.ts tests\phase_c_supply_agency.test.ts tests\ui\inbox_items.test.ts tests\ui\pre_advance_command_review.test.ts
```

Expected: All passing or any failures recorded as pre-existing (not introduced by this plan).

---

## Task 1: Engine Lifecycle Test Coverage

**Status 2026-05-16:** IMPLEMENTED. `tests/humanitarian_convoy_lifecycle.test.ts` covers generation, dedupe/sorting, player-route persistence, AI defaults, allow/block/divert effects, empty queue, and determinism. `tests\humanitarian_convoy_lifecycle.test.ts tests\phase_c_supply_agency.test.ts` passed 20/20.

**Files:**
- Create: `tests/humanitarian_convoy_lifecycle.test.ts`
- Do not modify engine code.

**Step 1: Write the failing-first test scaffolding**

Test cases (one `describe` per source-of-truth fixture):

A. `evaluateHumanitarianConvoys`
- emits zero convoys when `supply_reserves_enabled` is false
- emits zero convoys when no enclave has `siege_duration >= 4`
- emits zero convoys when no hostile faction borders the enclave
- emits convoys with deterministic IDs of form `convoy:TURN:ENCLAVE_ID:ROUTE_FACTION`
- dedupes by ID against `state.military.pending_convoy_decisions` already present
- sorts the resulting queue by `id.localeCompare`

B. `applyHumanitarianConvoyDecisions`
- pushes a player-route convoy with `decision` unset into `remaining` (persists for next turn)
- consumes a non-player-route convoy with `decision` unset, applying IVP-derived default (`composite_ivp > 0.5 → allow`, `< 0.3 → block`, else `divert`)
- `allow` adds `supply_amount` to `general_supply_reserve[target_enclave.faction_id]`, clamped to 100
- `block` adds to `enclave_humanitarian_pressure` and `route_patron.diplomatic_isolation` (HRHB route halves multiplier)
- `divert` splits supply 50/50 between target and route faction and adds smaller IVP / isolation deltas
- pending list mutates in-place to only contain `remaining` after the call
- early-returns without mutating IVP when the pending queue is empty

C. Determinism
- two back-to-back invocations on a frozen deep-cloned state produce byte-identical queues and reserve maps

**Step 2: Run and confirm green**

```powershell
npx.cmd vitest run tests\humanitarian_convoy_lifecycle.test.ts
```

Expected: All cases pass against current engine. If a case fails, the engine has an undocumented behavior — STOP and report instead of "fixing the test" to match.

**Step 3: Verify no calibration drift**

```powershell
npm.cmd run sim:scenario:run:40w
```

Expected: same hash as the last committed 40w baseline. Tests do not exercise the scenario harness; this is paranoia.

---

## Task 2: Convoy Decision Modal

**Status 2026-05-16:** IMPLEMENTED. `ConvoyDecisionModal` is mounted from `App.tsx`, Inbox convoy cards route to `convoy_decision_modal`, and `player_decision_manifest` now lists `convoy_decision_modal` as the owner surface. `tests\ui\convoy_decision_modal.test.ts tests\ui\inbox_items.test.ts tests\player_decision_manifest.test.ts` passed 36/36.

**Files:**
- Create: `src/ui/map/components/ConvoyDecisionModal.tsx`
- Modify: `src/ui/map/components/PresidentialInbox.tsx` (or wherever the inbox action dispatch lives)
- Modify: `src/ui/map/App.tsx` (action routing at line 838)
- Modify: `src/ui/map/data/inboxItems.ts` (the `action` literal type and the convoy item's `action` value)
- Create: `tests/ui/convoy_decision_modal.test.ts`

**Step 1: Add the new action literal**

In `src/ui/map/data/inboxItems.ts` line 30, replace `'war_summary_convoys'` in the `action` union with `'convoy_decision_modal'`. Update the convoy item at line 183 to emit the new action.

In `src/ui/map/App.tsx` line 838, replace the `'war_summary_convoys'` route with `'convoy_decision_modal'` that opens the new modal. The Situation tab's row buttons call `ipc.stageConvoyDecision` directly (`SituationTab.tsx:150`) and are not reached through the inbox action, so removing the old action does not break the tab. Grep `'war_summary_convoys'` across `src/` and `tests/` and remove every reference — singular ownership.

**Step 2: Implement the modal**

`ConvoyDecisionModal.tsx` shape (mirror `PeacePlanModal.tsx`):

```tsx
interface ConvoyDecisionModalProps {
  convoy: PendingConvoyDecisionView | null;
  onClose: () => void;
  onDecide: (decision: 'allow' | 'block' | 'divert') => Promise<void>;
}
```

Visible content:
- header: "Humanitarian Convoy — {target_enclave}"
- subtitle: route faction, supply amount, current IVP context (composite_ivp from adapter)
- three decision buttons: Allow, Block, Divert, with one-sentence consequence summaries derived from the engine's effect math (no new numbers — display what the engine will actually apply)
- disable buttons while in-flight; show `result.error` if `ok: false`
- close on success and rely on `game-state-updated` broadcast to refresh the inbox

No new state — the modal reads from `LoadedGameState.pendingConvoyDecisions`, writes via `ipc.stageConvoyDecision`.

**Step 3: Tests**

`tests/ui/convoy_decision_modal.test.ts`:
- renders all three buttons enabled for a pending convoy with no `decision` field
- disables the matching button when `decision` is already set
- calls `stageConvoyDecision(convoy.id, 'allow')` when Allow is clicked
- closes on `{ ok: true }` result
- surfaces `error` text on `{ ok: false }` result
- shows nothing when `convoy` prop is null

Run:

```powershell
npx.cmd vitest run tests\ui\convoy_decision_modal.test.ts tests\ui\inbox_items.test.ts
```

**Step 4: Visual verification (if practical)**

```powershell
npm.cmd run dev:map
```

Manually load a save with a pending convoy decision; click the inbox card; verify the modal opens; click Allow; verify the decision applies on next turn. If a save with a pending convoy is not handy, fabricate one by editing a save's `state.military.pending_convoy_decisions` array.

---

## Task 3: Convoy Aging / Expiry Policy (RFC + Implementation)

**Status:** BLOCKED ON CANON RULING. Do not implement until a game-designer + historian ruling lands. Use the RFC structure below.

**Files (after ruling lands):**
- Modify: `src/state/game_state.ts` (extend `PendingConvoyDecision`)
- Modify: `src/state/supply_reserves.ts` (apply aging in either generate or apply path)
- Modify: `tests/humanitarian_convoy_lifecycle.test.ts` (add aging cases)
- Optional: `data/scenarios/*` (no, only if a turn-window constant needs scenario-overridability — default to a hardcoded constant)

**RFC: pick one option.**

Option A — Hard expiry, auto-resolve.
- Add `created_turn: number` to `PendingConvoyDecision`.
- When `applyHumanitarianConvoyDecisions` runs and `state.meta.turn - convoy.created_turn >= CONVOY_DECISION_TIMEOUT`, force the AI default branch even for player-route convoys.
- `CONVOY_DECISION_TIMEOUT` default 3 turns. Historian to weigh in on real Bosnian aid-convoy decision windows.

Option B — Soft decay.
- Add `created_turn: number` and decay `supply_amount` each turn unresolved (`supply_amount *= 0.8` per turn).
- Drop from queue when `supply_amount < 0.05`. Drop applies no IVP delta — "the convoy gave up and turned around" is its own narrative.

Option C — Indecision pressure.
- No new field. Each turn that a player-route convoy sits in `remaining`, add a small IVP / route-patron `diplomatic_isolation` delta. Player pays a continuing cost for not deciding.
- No auto-resolve; convoy persists until decided.

**Decision needed from:** `/game-designer`, `/historian`, with `/canon-compliance-reviewer` sign-off.

**Recommendation:** Option C (indecision pressure) is the least canon-invasive — it doesn't change the schema, doesn't change supply math, and doesn't take agency away from the player. Options A and B both delete player choices and may surprise. Final call belongs to game-designer.

**Until ruling lands:** Document the gap in `docs/40_reports/COMBAT_MASTER.md` or a new `docs/40_reports/HUMANITARIAN_CONVOY_MASTER.md` so it is not forgotten.

---

## Task 4: Route-Controller-vs-Target-Owner Semantics (RFC)

**Status:** BLOCKED ON CANON RULING. Do not implement until a game-designer + historian ruling lands.

**Files (after ruling lands):**
- Modify: `src/state/supply_reserves.ts` lines 592–595 (who gets pushed into `remaining`)
- Modify: `src/state/game_state.ts` (`PendingConvoyDecision` may need a `notified_factions: FactionId[]` field if multi-surface)
- Modify: `src/ui/map/data/inboxItems.ts` lines 175–186 (the inbox card derivation)
- Modify: `tests/humanitarian_convoy_lifecycle.test.ts` (new semantics regressions)

**RFC: pick one option.**

Option A — Status quo. Route controller decides, target owner has no UI.
- Pro: Matches the historical reality that whoever holds the road holds the keys. VRS blockades of Goražde convoys were VRS decisions.
- Con: A player whose enclave is being besieged has zero perceived agency over the aid. UX is dead.

Option B — Two-surface advisory.
- Route controller is the decider (canonical).
- Target owner sees a read-only advisory inbox item: "Humanitarian convoy pending through {route_faction} territory to {target_enclave}." No action buttons.
- Pro: Restores target-owner situational awareness without changing the underlying decision authority.
- Con: One more inbox card to dismiss; modest UI churn.

Option C — Escalation path.
- Route controller decides allow/block/divert as today.
- If route controller is non-player and composite IVP is above a threshold, the target owner gets a one-shot "request UN escalation" decision that adds international pressure. Resolves through a new IVP delta, not a new convoy outcome.
- Pro: Two-sided agency. Matches Srebrenica / Goražde history where the besieged side appealed to international bodies.
- Con: New mechanic. Needs careful balance. Out of scope for a "completion" plan — flag as v0.9.x backlog if chosen.

**Decision needed from:** `/game-designer`, `/historian`, `/war-or-game` (read-only realism critique only; not a vote), with `/canon-compliance-reviewer` sign-off.

**Recommendation:** Option B is the right ship. Option A leaves target-owner UX dead; Option C is a feature, not a fix. Final call belongs to game-designer.

**Sub-issue (gap 6) folds in here.** If Option B or C ships, the same-turn generate-and-apply step at `war_phases.ts:2510-2521` should be split into two steps — `evaluate-humanitarian-convoys` (generate + persist player-visible) at current location, and `apply-humanitarian-convoys` at end-of-turn — so the target owner can see the advisory before the AI default fires. If Option A ships, no split needed.

---

## Task 5: Final Regression, Docs, Ledger

**Files:**
- Modify: `docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md` (extend "implemented" footer with completion-plan tasks)
- Modify: `docs/PROJECT_LEDGER.md` (append a completion-plan entry per task that ships)
- Create: `docs/40_reports/implemented/20260516_CONVOY_SYSTEM_COMPLETION.md` (optional, after at least Task 1 and Task 2 ship)
- Modify: `docs/plans/MASTER_ROADMAP.md` (mark completed items)
- Optional new master doc: `docs/40_reports/HUMANITARIAN_CONVOY_MASTER.md` if Task 3 or Task 4 RFCs land — track decisions and rationale.

**Step 1: Integrated test run**

```powershell
npx.cmd vitest run tests\humanitarian_convoy_lifecycle.test.ts tests\ui\convoy_decision_modal.test.ts tests\desktop_convoy_decision_contract.test.ts tests\phase_c_supply_agency.test.ts tests\ui\inbox_items.test.ts tests\ui\pre_advance_command_review.test.ts
```

Expected: PASS. If `pre_advance_command_review.test.ts` does not see convoys in its readiness count, parent plan Task 4 has not landed yet — coordinate with Codex before proceeding.

**Step 2: Build / type gates**

```powershell
npm.cmd run typecheck
npm.cmd run desktop:map:build
git diff --check
```

Expected: typecheck clean, map build clean modulo pre-existing Vite externalization warnings, no whitespace errors.

**Step 3: Calibration safety**

```powershell
npm.cmd run sim:scenario:run:40w
```

Expected: byte-identical to last committed 40w baseline. If a hash shifts, STOP — this plan claims engineering-only delta and any shift is a contract break.

**Step 4: Ledger**

Append per-task entries to `docs/PROJECT_LEDGER.md`:

- Task 1: `[YYYY-MM-DD] test(supply): cover humanitarian convoy lifecycle` — engineering only, byte-identical baseline, vitest command + outcome.
- Task 2: `[YYYY-MM-DD] feat(ui): add convoy decision modal` — UI delivery, no engine touch, vitest + visual verification.
- Task 3 (if shipped): `[YYYY-MM-DD] feat(state): add convoy decision aging` — canon ruling reference, vitest + 40w hash.
- Task 4 (if shipped): `[YYYY-MM-DD] feat(state): widen convoy decision surfacing` — canon ruling reference, vitest + 40w hash.

**Step 5: Update audit doc**

Append to `docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md` a "Convoy completion plan" footer pointing to this file and listing which gaps were closed.

**Step 6: Roadmap**

In `docs/plans/MASTER_ROADMAP.md`, mark completed items. Note future decision families should register in the manifest AND implement a dedicated modal AND surface in pre-advance review (the three-legged-stool rule this plan establishes).

---

## Acceptance Criteria

- `evaluateHumanitarianConvoys` and `applyHumanitarianConvoyDecisions` have direct unit-test coverage that locks generation thresholds, ID format, dedup, player-route persistence, AI default branching, supply/IVP effects, and determinism.
- Pending convoy decisions surface through a dedicated modal reachable from the Presidential Inbox.
- Pre-advance command review lists pending convoy decisions (via parent plan Task 4 manifest summary).
- A canon ruling exists for convoy aging (Task 3) and convoy owner semantics (Task 4), regardless of which option is chosen.
- 40w scenario hash unchanged through any engineering-only deltas (Tasks 1, 2, 5). Calibration drift requires a separate documented sign-off.
- Ledger entries per shipped task.

## Determinism Safeguards

- No `Date.now()`, no `Math.random()`, no timestamps introduced anywhere.
- New tests use frozen-state fixtures and `localeCompare`-sorted iteration where applicable.
- Tasks 3 and 4 implementation, when it lands, must include a 40w hash run and explicit ledger sign-off; if the hash shifts, that shift must be the documented expected delta.
- New `created_turn` field, if Task 3 Option A or B ships, must be deterministic (= `state.meta.turn` at creation, sorted by convoy ID).

## Out Of Scope

- Convoy economy rebalance (supply amounts, IVP weights, decay multipliers beyond the Task 3 option chosen).
- New convoy types (medical, evacuation, prisoner exchange) — separate plan.
- Convoy interaction with peace plans, Dayton negotiation, or paramilitary requests — separate plan if cross-cuts emerge.
- AI route-faction strategy (when to allow / block / divert non-player convoys) — current heuristic stays.
- Migration of the same-turn generate+apply step independently of Task 4 — bundled with Task 4 because the necessity depends on the ruling.
