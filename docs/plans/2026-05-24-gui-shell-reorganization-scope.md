# Full Presidential GUI Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the AWWV GUI around a presidential decision loop where every actionable event has one clear owner, one direct resolver, player-safe copy, and a visible consequence trail.

**Architecture:** Promote decisions from scattered UI projections into a single Decision Surface Registry consumed by President's Desk, Inbox, Advance Clearance, Warroom docket, Army HQ, and modal routing. Add shell coordination so Warroom, Tactical Map, Army HQ, Records/Chronicle, Codex, and modal layers cannot stack into competing owners.

**Tech Stack:** React, TypeScript, Vite tactical-map shell, Electron IPC, Zustand store, existing `src/state/player_decision_manifest.ts`, Vitest, Puppeteer/browser visual audit, Electron smoke tests.

---

Date: 2026-05-24
Branch: `codex/presidential-desk-flow`
Status: implementation started. Task 1 is implemented; Task 2 has the advance-error/toast copy layer implemented. Do not treat the earlier blocker-flow code slice as merge-ready until the broader Desk/shell work is completed.

## Product Thesis

The player is the president. The main loop should be:

1. Read the desk packet.
2. Take or defer presidential decisions.
3. Call Army HQ when military advice or command-chain action is needed.
4. Inspect the war map when geography matters.
5. Advance only after hard blockers are resolved.
6. Review what changed and why.

The UI should not feel like a brigade command tool by default. The player can inspect the tactical map and can intervene directly, but direct intervention is exceptional and should be framed as presidential override through the command chain.

## Browser Audit Coverage

Live target inspected: `http://127.0.0.1:3002/?view=warroom`, using Chrome/Puppeteer against the local dev server. The RS fallback campaign was loaded and these surfaces were captured:

| Surface | Screenshot artifact | Current finding |
|---|---|---|
| Startup/side picker | `docs/plans/gui-audit-warroom.png` | Faction choice is functional, but disabled toolbar chrome still shows behind the modal. |
| Warroom home | `docs/plans/gui-audit-tactical-start.png` | Warroom image works, but the right rail and top toolbar still make the room feel like a map app with an overlay. |
| Warroom ops snapshot | `docs/plans/gui-audit-ops.png` | Field Ops panel says Army HQ owns review but still opens as a right overlay on the desk, adding another partial owner. |
| Army HQ briefing | `docs/plans/gui-audit-army-hq-briefing.png` | Huge blank paper area plus dense Decision Room below; "Decision Room" is not a clear resolver. |
| Army HQ personnel | `docs/plans/gui-audit-army-hq-personnel.png` plus user screenshot | Wide roster rows waste space and expose raw officer stats like `C:4.0 A:4.0`. |
| Advance modal | `docs/plans/gui-audit-advance-modal.png` plus user screenshot | Advance review is a generic checklist. Hard blockers need full resolver modals, not "open inbox" detours. |
| Chronicle | `docs/plans/gui-audit-chronicle.png` | Chronicle overlays the Warroom with a blurred scene and right dossier, but it behaves like another full shell stacked on the same room. |
| Codex | `docs/plans/gui-audit-codex.png` | Codex/pause layering shows modal stacking risk. |

The attached user screenshots add two critical Electron-only observations:

- `pending_required_decisions` leaks as a raw engine error from `src/desktop/electron-main.cjs` through `src/ui/map/desktop/orderActions.ts`.
- A paramilitary blocker can trap the player: the Inbox flags work, Advance blocks, but the visible review route does not open a full paramilitary decision modal that explains the issue and options.

## Current GUI Inventory

| Area | Current code owner | What it should own | Current problem |
|---|---|---|---|
| Warroom shell | `WarroomShellLayer.tsx`, `WarroomStatusBar.tsx` | Physical president desk, campaign home, high-level status, object-based navigation | Still hosts top toolbar, Inbox rail, Ops rail, Advance tray, and background modals in parallel. |
| Presidential toolbar | `PresidentialToolbar.tsx` | Global navigation while on Tactical Map | Too many primary commands: Warroom, Chronicle, Summary, Records, Ops, Events, Codex, Inbox, reserve, CA, Advance, dev controls. |
| President's Inbox | `PresidentialInbox.tsx`, `inboxItems.ts` | Actionable presidential queue | It is only one projection. It does not own full decision routing or hard-block explanation. |
| Decision Room | `PresidentialDecisionRoomPanel.tsx`, `presidentialDecisionRoom.ts` | Army HQ strategic-priority synthesis | It became a task board and makes blockers feel indirect. |
| Advance modal | `AdvanceTurnModal.tsx`, `preAdvanceCommandReview.ts` | Final clearance packet | It mixes hard blockers, review suggestions, and SITREP warnings without opening the exact resolver by default. |
| Army HQ briefing | `ArmyHQModal.tsx`, `ChiefOfStaffBriefing.tsx`, `SituationBriefing.tsx` | Staff advice, CO calls, command review | It mixes a paper letter, commander dossier, counters, Decision Room, attention panel, SITREP rows, and corps cards in one scroll. |
| Army HQ personnel | `PersonnelContent.tsx` | Officer/staff dossiers and personnel decisions | Exposes raw stat abbreviations and wastes wide-screen space. |
| Tactical map | `App.tsx`, `MapContainer.tsx`, rails/panels | Spatial inspection and direct intervention | It still competes as the default campaign shell and has multiple rails/overlays. |
| Ops planning | `ops_modal/*`, `OperationBriefingModal.tsx`, `CommanderSelectionModal.tsx` | Army CO/operations call flow | Stronger than most surfaces, but its decision status should report back to Desk/Advance through registry. |
| Records/Chronicle | `RecordsContent.tsx`, `ChronicleOverlay.tsx` | Consequence history and campaign memory | Similar content appears in Army HQ, Chronicle, War Summary, Turn Aftermath, and right rails. |
| Codex | `CodexPanel.tsx` | Reference library | It should never appear as a blocker or modal stack participant. |
| Error/toast | `LoadErrorToast.tsx`, `orderActions.ts` | Recovery/help only | Raw error keys leak into player view. |

## External Pattern Research

These are patterns to borrow or reject, not a request to clone another game.

| Game/pattern | Useful lesson | AWWV implication |
|---|---|---|
| Hearts of Iron IV top alerts and national panels | The interface keeps national issues visible through top alerts and routes them to owned panels, while the map remains the spatial layer. Source: [HOI4 player guide, interface section](https://steamsolo.com/guide/player-s-guide-for-hearts-of-iron-iv-hearts-of-iron-iv/). | Borrow severity alerts and direct panel ownership. Reject default army micro as the presidential loop. |
| Europa Universalis outliner | Outliner rows are scrollable, customizable, and deep-link to the relevant place/interface. Source: [EU4 Outliner](https://orcz.com/Europa_Universalis_4%3A_Outliner). | Borrow "row click opens exact owner" and hide empty categories. Every AWWV blocker row must deep-link to its exact modal. |
| Paradox event popups | Event decisions use modal option choice with effect preview and time pressure. | AWWV event families need modal contracts: situation, source, options, effects, risk, consequence link. |
| AGEOD/Civil War II message log and Strategic Atlas | Important red messages can open details or map context; decision cards and historical events are explicit campaign systems. Sources: [Civil War II Steam page](https://store.steampowered.com/app/306630/Civil_War_II/) and [Civil War II map/message panel reference](https://cw2.fandom.com/wiki/THE_MAP). | Borrow message ledger plus decision-card feel. Reject burying required decisions inside a log. |
| Civil War II WEGO turn structure | The player commits orders, then simultaneous resolution creates suspense. Source: [Civil War II Steam page](https://store.steampowered.com/app/306630/Civil_War_II/). | Advance should feel like signing a clearance packet, not clicking through a generic "pending orders" warning. |

## Core Design Rules

1. **One shell at a time.** Warroom, Tactical Map, Army HQ, Chronicle, Codex, and President's Desk must have explicit ownership. They may link to each other, but not stack as partial owners.
2. **One modal owner per event family.** Event, paramilitary, convoy, peace plan, Dayton, reserve, officer, autonomy, operation opportunity, counter-offer, and intelligence notification all need named resolver surfaces.
3. **Advance never explains blockers through an error toast.** A blocked turn opens the clearance packet or the first hard-blocker modal. Raw error keys are mapped to player copy.
4. **Inbox is a launchpad, not a maze.** Clicking a row opens the exact resolver. It does not route to another generic review page unless the item itself is a review.
5. **Army HQ advises and receives presidential instructions.** It should not look like a universal task queue or an omniscient debug dashboard.
6. **Tactical Map inspects geography.** It can stage direct interventions, but presidential decisions remain desk/modals.
7. **No raw implementation labels.** No `pending_required_decisions`, `C:4.0 A:4.0`, raw IDs, OSIDs, route factions, internal tags, or non-player-facing names in player copy.
8. **Every decision leaves a trace.** The decision modal previews expected effects, records what was chosen, and links to Turn Aftermath/Records after resolution.

## Target Information Architecture

### President's Desk

This is not a modal inside the Warroom. It is the primary desk layer of the Warroom home.

Owned content:
- current desk packet
- hard blockers
- active decision cards
- recent consequences
- "call Army HQ" handoffs
- "inspect on map" handoffs
- "advance clearance" entry

Access:
- default Warroom home after faction/campaign load
- toolbar `DESK`
- Warroom folio/folder hotspot
- Inbox badge
- Turn Aftermath "next" action
- failed Advance when blockers exist

### Warroom

Owned content:
- physical background scene
- object-based navigation
- campaign atmosphere
- high-level phase/date/faction state

Warroom should not own:
- full decision list
- personnel roster
- operations detail
- records browser
- debug/dev controls

### Army HQ

Owned content:
- CO briefing and advice
- corps readiness
- operations review
- reserve requests
- personnel matters
- records/AAR detail

Needed redesign:
- top: "Call Army CO" command card, not a huge blank paper.
- briefing: compact packet with 3-5 actionable sections.
- decisions: only military/staff reviews, with direct action buttons.
- personnel: commander/staff dossier grid, not raw stat rows.
- posture: frame as "Issue army-wide guidance to CO", with confirmation and consequences.

### Tactical Map

Owned content:
- map, fronts, settlements, formations
- map modes and selected-context inspection
- local direct interventions

Needed redesign:
- collapse persistent right rails unless user selects context.
- route decision rows back to Desk/modals.
- hide dev controls in a dev drawer.
- replace `+MORE` and toolbar sprawl with stable modes.

### Records, Chronicle, Codex

Records:
- structured AAR, operation history, decision log, consequence ledger.

Chronicle:
- narrative timeline and campaign memory.

Codex:
- static reference and unlocked essays.

They should be separate full shells or focused overlays, not extra panels layered over active decision modals.

## Decision Surface Registry

The existing `src/state/player_decision_manifest.ts` is useful but not sufficient. It declares family/gate policy, but the UI still duplicates routing in `inboxItems.ts`, `presidentialDecisionRoom.ts`, `preAdvanceCommandReview.ts`, `presidentialBlockers.ts`, `App.tsx`, and the modals.

Add a UI-level registry that consumes the state manifest and owns player routing:

Create: `src/ui/map/data/decisionSurfaceRegistry.ts`

Fields per family:

```ts
interface DecisionSurfaceDefinition {
  familyId: PlayerDecisionFamilyId | 'counter_offer' | 'intelligence_notification' | 'situation';
  playerLabel: string;
  severity: 'hard_block' | 'modal_required' | 'advisory' | 'info';
  ownerShell: 'desk' | 'army_hq' | 'tactical_map' | 'records' | 'chronicle';
  resolverSurface:
    | 'event_modal'
    | 'paramilitary_review_modal'
    | 'convoy_decision_modal'
    | 'peace_plan_modal'
    | 'dayton_modal'
    | 'reserve_request_modal'
    | 'officer_matter_modal'
    | 'operation_opportunity_dossier'
    | 'autonomy_panel'
    | 'counter_offer_modal'
    | 'intelligence_brief_modal';
  opensAs: 'modal' | 'shell_panel' | 'records_link';
  gatePolicy: 'hard_block' | 'modal_required' | 'advisory' | 'info';
  copySanitizer: (raw: unknown) => PlayerFacingDecisionCopy;
  resolveAction: string;
  consequenceRecord: string;
}
```

Initial family mapping:

| Family | Resolver | Advance behavior |
|---|---|---|
| `event_decision` | `EventDecisionModal` | hard block |
| `paramilitary_request` | `ParamilitaryReviewModal` | hard block |
| `peace_plan` | `PeacePlanModal` | modal required |
| `dayton_negotiation` | `DaytonNegotiationModal` | modal required |
| `convoy_decision` | `ConvoyDecisionModal` | modal required |
| `reserve_request` | new `ReserveRequestModal` or Army HQ reserve detail | advisory unless design changes |
| `officer_event` | new `OfficerMatterModal` or Army HQ personnel detail | advisory unless replacement is required |
| `operation_opportunity` | `OperationOpportunityDossierPanel` | advisory/urgent |
| `autonomy_proposal` | `AutonomyPanel` | advisory |
| `counter_offer` | counter-offer modal | blocking when active |
| `intelligence_notification` | `IntelligenceBriefModal` or dismissible desk card | info |
| `situation` | Desk/Records link | info |

## Decision Modal Contract

Each event/decision modal must show:

1. **Title:** player-facing, no internal key.
2. **Source:** who is putting this on the president's desk: Chief of Staff, Army CO, UN mediator, foreign patron, intelligence, local authorities.
3. **Why this matters:** one paragraph.
4. **Options:** each option has label, immediate effect, risk, and later consequence.
5. **Advisor view:** optional Army HQ or diplomatic note.
6. **Map/record link:** inspect geography or prior record when relevant.
7. **Resolution:** after action, card disappears and a record is written.

Hard blocker modals must open directly from:
- Inbox row click
- Advance clearance row click
- blocked Advance button when there is exactly one hard blocker
- Warroom priority docket row click

## Player-Safe Copy And Leak Prevention

Create: `src/ui/map/utils/errorCopy.ts`

Required mappings:

| Raw key | Player copy |
|---|---|
| `pending_required_decisions` | `Presidential decisions are still unsigned. Review the highlighted desk item before advancing.` |
| `level_2_plus_not_yet_enabled` | `This command channel is not available in the current build.` |
| missing IPC/bridge | `This action requires the desktop app.` |

Add static/runtime guards:
- scan rendered text in focused UI tests for `pending_required_decisions`.
- scan for raw snake_case IDs in visible labels, with allowlist for dev-only surfaces.
- scan for `C:\d` and `A:\d` in personnel UI.
- scan for player-hidden faction labels in opposing/enemy contexts.

## Layout And Shell Coordination

Add a single shell coordinator layer:

Modify: `src/ui/map/store/gameStore.ts`

Introduce:

```ts
type PrimaryShell = 'desk' | 'warroom' | 'tactical_map' | 'army_hq' | 'chronicle' | 'codex';
type RightRailOwner = 'none' | 'inbox' | 'selection' | 'ops_snapshot' | 'event_log' | 'codex';
type ModalOwner =
  | 'none'
  | 'advance_clearance'
  | 'event_decision'
  | 'paramilitary_review'
  | 'convoy_decision'
  | 'peace_plan'
  | 'dayton'
  | 'operation_briefing'
  | 'commander_selection'
  | 'pause';
```

Rules:
- opening a primary shell closes incompatible right rails.
- opening a decision modal closes non-critical overlays.
- opening Codex/Chronicle closes Desk rails unless intentionally split-screen.
- only one critical modal at a time.
- dev controls are not part of player shell state.

## Visual And Asset Direction

AI image assets should enrich comprehension, not become vague decoration.

Use generated/curated images for:
- Warroom scene plates by faction/year.
- Decision family cards: folder, cable, radio transcript, convoy document, diplomatic note, operation map clipping.
- Event modal header images when the event is narrative/political.
- Newspaper/chronicle clippings after turn resolution.
- Commander/staff dossier cards with neutral portrait treatment, insignia, or document-photo frame.

Avoid:
- image cards as primary tabs before navigation ownership is solved.
- exact invented photoreal likenesses of real named people unless source policy is settled.
- gore or atrocity imagery.
- text embedded inside images that the UI relies on.
- image-only buttons.

Recommendation: use image cards inside President's Desk packets and modal headers, not as the main shell navigation. The top-level nav should remain text/icon based because players need fast scanning.

## Implementation Plan

### Checkpoint: 2026-05-24 Task 1 / Task 2 Foundation

Implemented:
- `src/ui/map/data/decisionSurfaceRegistry.ts` defines one player-facing owner/resolver/action contract for every manifest-backed family plus counter-offer, intelligence, and situation supplemental families.
- Inbox, presidential blockers, and Decision Room/pre-advance manifest cards now consume registry action/copy instead of maintaining separate labels.
- Pending paramilitary requests now surface as blocking presidential decisions whenever the queue contains player-faction requests, even if the renderer state lacks `paramilitaryPolicy: 'ask'`.
- `src/ui/map/utils/errorCopy.ts` maps raw advance/blocker error keys before they reach `orderActions` or `LoadErrorToast`.

Verified:
- `npx.cmd vitest run tests\ui\decision_surface_registry.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\presidential_blockers.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui_map_order_actions.test.ts tests\load_error_toast.test.ts tests\ui\error_copy_contract.test.ts --reporter=dot` passed: 9 files, 47 tests.
- `npm.cmd run typecheck` passed.

### Task 0: Confirm Scope And Baseline

**Files:**
- Read: `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
- Read: `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- Read: `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`
- Read: `docs/40_reports/GUI_MASTER.md`
- Read: `src/ui/map/App.tsx`
- Read: `src/ui/map/store/gameStore.ts`

**Steps:**
1. Run `git status --short`.
2. Decide whether to keep the narrow blocker-flow edits on this branch or reset them before the broad implementation. Do not merge them as the final answer to this plan.
3. Run focused baseline tests that cover decision surfaces and toolbar/advance behavior.
4. Capture current Warroom, Tactical Map, Army HQ briefing, Army HQ personnel, Advance, Chronicle, and Codex screenshots.

**Verification:**
- Baseline failures are recorded as pre-existing.
- Screenshot paths are listed in this plan or follow-up report.

### Task 1: Add Decision Surface Registry

**Files:**
- Create: `src/ui/map/data/decisionSurfaceRegistry.ts`
- Modify: `src/ui/map/data/inboxItems.ts`
- Modify: `src/ui/map/data/preAdvanceCommandReview.ts`
- Modify: `src/ui/map/data/presidentialDecisionRoom.ts`
- Modify: `src/ui/map/data/warroomPriorityDocket.ts`
- Test: `tests/ui/decision_surface_registry.test.ts`

**Steps:**
1. Write tests requiring every `PLAYER_DECISION_FAMILIES` entry to have one UI surface definition.
2. Write tests for direct route/action labels per family.
3. Implement registry definitions and helper builders.
4. Migrate Inbox labels/actions to registry.
5. Migrate Advance and Decision Room blocker/action labels to registry.

**Verification:**
- Each decision family has one owner, one resolver, one gate policy, and one copy sanitizer.

### Task 2: Add Player-Safe Error Copy

**Files:**
- Create: `src/ui/map/utils/errorCopy.ts`
- Modify: `src/ui/map/desktop/orderActions.ts`
- Modify: `src/ui/map/components/LoadErrorToast.tsx`
- Test: `tests/ui/error_copy_contract.test.ts`
- Test: `tests/ui/no_raw_player_labels.test.ts`

**Steps:**
1. Write failing test for `pending_required_decisions`.
2. Map raw errors to player copy.
3. Update advance failure path to open clearance/decision resolver when possible.
4. Add rendered text guards for raw snake_case and stat abbreviations.

**Verification:**
- `pending_required_decisions` never appears in player-facing rendered UI.

### Task 3: Build President's Desk Shell

**Files:**
- Create: `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx`
- Create: `src/ui/map/components/presidential_desk/DeskPacket.tsx`
- Create: `src/ui/map/components/presidential_desk/DecisionCard.tsx`
- Create: `src/ui/map/components/presidential_desk/ConsequenceStrip.tsx`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/store/gameStore.ts`
- Test: `tests/ui/president_desk_shell.test.ts`

**Steps:**
1. Write tests for Desk as default Warroom home after side load.
2. Render active blockers first, then advisory decisions, then recent consequences.
3. Route Desk card clicks through the registry.
4. Keep Warroom object hotspots as secondary access paths.

**Verification:**
- Player can resolve every hard blocker from Desk without visiting Decision Room.

### Task 4: Make Advance A Clearance Packet

**Files:**
- Modify: `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- Modify: `src/ui/map/components/PresidentialToolbar.tsx`
- Modify: `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- Test: `tests/ui/advance_clearance_packet.test.ts`

**Steps:**
1. If exactly one hard blocker exists, blocked Advance opens that blocker modal directly.
2. If multiple hard blockers exist, blocked Advance opens clearance with hard blockers only at top.
3. Disable final Advance while hard blockers remain.
4. Keep advisory review rows below blockers.
5. Remove "Open Inbox" as the primary action for known modal families.

**Verification:**
- Paramilitary request opens `ParamilitaryReviewModal`.
- Convoy opens `ConvoyDecisionModal`.
- Event opens `EventDecisionModal`.
- No raw error toast on blocked advance.

### Task 5: Modalize Or Direct Every Event Family

**Files:**
- Modify: `src/ui/map/App.tsx`
- Modify: existing modals: `EventDecisionModal.tsx`, `ParamilitaryReviewModal.tsx`, `ConvoyDecisionModal.tsx`, `PeacePlanModal.tsx`, `DaytonNegotiationModal.tsx`, `AutonomyPanel.tsx`, `OperationOpportunityDossierPanel.tsx`
- Create as needed: `ReserveRequestModal.tsx`, `OfficerMatterModal.tsx`, `IntelligenceBriefModal.tsx`
- Test: `tests/ui/decision_family_modal_lifecycle.test.ts`

**Steps:**
1. For each family, create fixture state with one pending item.
2. Assert Desk/Inbox shows one row.
3. Click row and assert correct modal/panel opens.
4. Mock resolver success.
5. Assert item disappears or becomes recorded.

**Verification:**
- "Each event should have a modal" is enforced family by family.

### Task 6: Rework Army HQ Briefing

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- Modify: `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`
- Modify: `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- Modify: `src/ui/map/components/army_hq/SituationBriefing.tsx`
- Test: `tests/ui/army_hq_briefing_layout.test.ts`

**Steps:**
1. Replace the huge paper-first area with a compact "CO call packet": commander, top issues, recommended calls, latest status.
2. Move general decision routing back to Desk unless the item is military/staff-owned.
3. Keep Strategic Position but make it secondary.
4. Remove duplicate SITREP cards from multiple sections.

**Verification:**
- Wide briefing screen has no giant blank left area.
- Decision Room no longer feels like the blocker resolver.

### Task 7: Rework Personnel

**Files:**
- Modify: `src/ui/map/components/army_hq/PersonnelContent.tsx`
- Reuse: `src/ui/map/components/OfficerProfile.tsx`
- Test: `tests/ui/personnel_player_safe_display.test.ts`

**Steps:**
1. Replace raw `C:`/`A:` display with labeled chips: Command, Initiative, Defense, Reliability/Concern where available.
2. Add a selected officer dossier side panel or modal.
3. Group officers by role/status/assignment instead of two-column wide rows.
4. Keep numeric values in tooltips or detail view only if labeled.

**Verification:**
- No `C:\d` or `A:\d` in rendered personnel tab.
- The roster uses space efficiently on ultrawide screenshots.

### Task 8: Simplify Tactical Map Navigation And Rails

**Files:**
- Modify: `src/ui/map/components/PresidentialToolbar.tsx`
- Modify: `src/ui/map/components/panelRail.ts`
- Modify: `src/ui/map/components/OOBSidebar.tsx`
- Modify: `src/ui/map/components/BottomStatusStrip.tsx`
- Test: `tests/ui/shell_navigation_ownership.test.ts`

**Steps:**
1. Replace toolbar sprawl with stable commands: Desk, War Map, Army HQ, Records, Codex, Advance.
2. Move dev controls into a collapsed dev drawer shown only in dev mode.
3. Enforce one right rail owner at a time.
4. Make selected-context panels close when Desk/Army HQ/Codex opens.

**Verification:**
- No overlapping right rail panels.
- War Map is inspection-first, not the default decision queue.

### Task 9: Records, Chronicle, And Consequence Trail

**Files:**
- Modify: `src/ui/map/components/TurnAftermathModal.tsx`
- Modify: `src/ui/map/components/army_hq/RecordsContent.tsx`
- Modify: `src/ui/map/components/chronicle/ChronicleOverlay.tsx`
- Create: `src/ui/map/data/decisionConsequenceLedger.ts`
- Test: `tests/ui/decision_consequence_trail.test.ts`

**Steps:**
1. After each resolved decision, create or surface a record entry.
2. Link Desk/Turn Aftermath to that entry.
3. Keep Chronicle narrative and Records structured detail separate.
4. Ensure no blocker is only visible in Chronicle/Records.

**Verification:**
- A decision can be traced from pending card -> modal -> result record.

### Task 10: Visual Asset Pass

**Files:**
- Create: `docs/plans/2026-05-24-gui-ai-asset-brief.md`
- Modify relevant components only after asset plan approval.

**Steps:**
1. Define asset slots for Desk cards and modal headers.
2. Write AI prompt specs for neutral documentary/folder/dispatch imagery.
3. Add placeholders that degrade cleanly when no image exists.
4. Do not convert top-level tabs into image cards in this phase.

**Verification:**
- UI remains usable with zero images.
- Images clarify decision family or mood, not navigation basics.

### Task 11: Full Electron And Browser QA

**Files:**
- Create/update: `tools/ui/presidential_gui_smoke.cjs`
- Test: `tests/ui/no_raw_player_labels.test.ts`
- Test: `tests/ui/modal_stack_contract.test.ts`

**Steps:**
1. Run Vitest focused decision/UI suite.
2. Run typecheck.
3. Run browser screenshots at desktop, ultrawide, and mobile-ish widths.
4. Run Electron packaged app or dev Electron smoke because decisions depend on IPC.
5. Test paramilitary, event, convoy, peace, and Dayton fixtures through advance.

**Verification:**
- No raw error keys or implementation names.
- No modal stacking.
- Hard blockers are directly resolvable.
- Advance succeeds after resolution.

## Acceptance Criteria

The GUI restructure is acceptable when:

1. Every generated player decision family has a registry entry, visible card, direct resolver, gate policy, and consequence route.
2. Pressing Advance with unresolved hard decisions opens a resolver or clearance packet, never a raw error.
3. President's Desk is the clear home for decisions.
4. Army HQ feels like a call/briefing from command staff, not a generic issue queue.
5. Tactical Map is for inspection and direct intervention only.
6. Personnel no longer exposes raw `C:`/`A:` stats or wastes ultrawide space.
7. Top-level navigation has no duplicate owners.
8. Browser and Electron smoke tests cover the full turn-blocker loop.

## Implementation Progress - 2026-05-24

Completed in `codex/presidential-desk-flow`:

1. Decision surface registry foundation:
   - Added a central decision-surface registry for player-facing labels, modal owners, inbox action routing, and gate policy.
   - Inbox, pre-advance review, blockers, and Decision Room now resolve labels through the registry instead of leaking raw keys.

2. Advance/blocker loop:
   - `pending_required_decisions` is mapped to player-facing copy.
   - A single hard blocker now opens its resolver directly from advance clearance instead of sending the player back to an ambiguous review list.
   - Paramilitary requests are surfaced whenever pending for the player faction, not only when policy is `ask`.

3. President's Desk shell:
   - Added a Warroom-owned President's Desk shell with decision packet, strategic status, direct Army HQ/map/records handoffs, and consequence strip.
   - Desk remains responsive instead of forcing a two-column layout on narrower windows.

4. Decision-family modals:
   - Reserve requests, personnel matters, and intelligence notifications now have modal surfaces instead of immediate generic-panel routing or immediate dismissal.
   - Counter-offers now open a focused negotiation modal from advance/Warroom review targets instead of a dead Decision Room handoff.
   - Inbox actions no longer force the player back to the tactical map unless the selected action explicitly opens a map/HQ panel.

5. Modal stack priority:
   - Event decision auto-launch now waits while the peace-plan modal is active.
   - Browser audit confirmed the Vance-Owen peace proposal no longer stacks under the "What Is Bosnia?" decision modal.

6. Army HQ briefing and personnel:
   - Briefing is reflowed into two continuous lanes: Chief of Staff report + presidential work on the left; commander/strategic/sitrep evidence on the right.
   - Personnel and commander selection views no longer render raw `C:` / `A:` commander stat notation; they use labeled quality chips.

7. Tactical map navigation:
   - The tactical toolbar now exposes a smaller command set: Desk, War Map, Army HQ, Records, Codex, Advance.
   - Summary, Ops, Events, and Chronicle are no longer duplicated as top-level tactical-map buttons.
   - Dev load/run/save controls are collapsed behind a dev drawer instead of occupying player chrome.
   - Desk, War Map, Army HQ, Records, and Codex navigation now clears map-owned selections/panels before switching owner.
   - Tactical detail rails are suppressed while Operations, Army HQ, Codex, or Chronicle owns the surface.
   - Tactical map chrome is mounted only while the game shell owns the screen, so Warroom/Desk no longer shows the map toolbar or OOB rail underneath it.

8. Decision consequence trail foundation:
   - Added a shared decision-consequence ledger derived from filed decision events and operation-opportunity records.
   - President's Desk Recent Consequences now shows filed decision count and latest decision records.
   - Army HQ Records now includes a Decision Log tab for presidential choices that already entered the campaign record.
   - Army reserve accepted/declined/terminated decisions now flow from persisted `reserve_request_history` into the same consequence ledger.
   - Resolved peace-plan responses now flow from persisted `military.negotiation.peace_plan_history` into the same consequence ledger and Chronicle path.
   - Resolved Dayton settlements now flow from the endgame `gameVerdict.dayton_result` into the same consequence ledger and Chronicle path.
   - Resolved humanitarian convoy choices now file deterministic `military.convoy_decision_history` records and flow into the same consequence ledger.
   - Resolved paramilitary authorizations now file deterministic `paramilitary_decision_history` records and flow into the same consequence ledger.
   - Resolved officer/personnel acknowledgements, overrides, and replacement acceptances now file deterministic `military.officer_decision_history` records and flow into the same consequence ledger.
   - Chronicle now projects shared decision-ledger records into timeline cards instead of depending only on generic turn-summary event cards.
   - Chronicle now suppresses old turn-summary event cards when the same resolved decision is already represented by the decision ledger.

9. Desk-first player-facing route cleanup:
   - Advance Clearance and Warroom priority docket now label decision blockers as `Open Desk` instead of `Open Inbox` or `Open Decision Room`.
   - The quiet inbox capsule and opening brief now route to the Desk handoff id rather than the retired decision-room route id.
   - Coachmarks and onboarding copy now teach the President's Desk as the decision owner and Army HQ as the staff-priority/advice owner.
   - The hidden retired toolbar `InboxBadge` route has been removed from `PresidentialToolbar`; the field toolbar keeps only the severity pip and stable shell commands.
   - Advance/Decision Room metric copy now uses player-facing labels (`Opportunities`, `Costly Turns`) instead of terse `OPS` / `Hard Turns` shorthand.
   - `tools/ui/presidential_loop_smoke.cjs` now validates the redesigned loop rather than the retired top-level Decision Room/Chronicle path: clean side-pick campaign -> President's Desk -> Call Army HQ -> War Summary inspection -> Advance Clearance -> Records -> Desk.

Current verification:

- `npm.cmd run typecheck` passes.
- Focused Vitest suites pass for decision registry, blockers, advance gating, modal family surfaces, modal stack priority, President's Desk, personnel player-safe labels, inbox items, and staff-priority wiring.
- Wider GUI restructure regression passes: `tests\ui\decision_family_modals.test.ts tests\ui\decision_surface_registry.test.ts tests\ui\error_copy_contract.test.ts tests\ui\modal_stack_priority.test.ts tests\ui\personnel_player_safe_display.test.ts tests\ui\president_desk_shell.test.ts tests\ui\presidential_blockers.test.ts tests\ui\shell_navigation_ownership.test.ts tests\ui\panel_rail_ownership.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\inbox_dedup.test.ts tests\ui\coachmark_layer.test.ts tests\ui\onboarding_track_d_consolidation.test.ts` (16 files, 55 tests).
- Focused toolbar/navigation Vitest suite passes: `tests\ui\shell_navigation_ownership.test.ts`, `records_button_behavior`, `stale_state_resets`, `advance_turn_button_gated_feedback`, and `presidential_toolbar_severity_pip` (5 files, 19 tests).
- Panel ownership regression passes: `tests\ui\panel_rail_ownership.test.ts` (2 tests).
- Shell ownership browser verification on `http://127.0.0.1:3001/?view=warroom` confirmed the Warroom/Desk no longer exposes tactical toolbar buttons (`Desk`, `RECORDS`) or the OOB `COMMAND/SITUATION` rail while the Warroom owns the screen.
- Decision consequence trail regressions pass: `tests\ui\decision_consequence_trail.test.ts`, `decision_consequence_records_panel`, `chronicle_decision_ledger`, and `president_desk_shell`.
- Focused consequence/Chronicle regression passes: `tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_ui.test.ts tests\ui\president_desk_shell.test.ts` (6 files, 17 tests).
- Peace-plan history consequence regression passes: `tests\ui\decision_consequence_trail.test.ts tests\ui_adapter_boundary.test.ts` (2 files, 20 tests), after red/green coverage for `peace_plan_history` projection.
- Dayton endgame settlement consequence regression passes: `tests\ui\decision_consequence_trail.test.ts` (6 tests), after red/green coverage for `gameVerdict.dayton_result`.
- Wider consequence/Chronicle/adapter regression passes: `tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_ui.test.ts tests\ui\president_desk_shell.test.ts tests\ui_adapter_boundary.test.ts` (7 files, 34 tests).
- Convoy and paramilitary resolver-history regressions pass: `tests\humanitarian_convoy_lifecycle.test.ts tests\paramilitary_sweep.test.ts` (2 files, 49 tests), after red/green coverage for filed decision histories.
- Convoy/paramilitary adapter and consequence regressions pass: `tests\ui\decision_consequence_trail.test.ts tests\ui_adapter_boundary.test.ts` (2 files, 24 tests), after red/green coverage for player-faction history projection.
- Combined affected consequence suite passes: `tests\humanitarian_convoy_lifecycle.test.ts tests\paramilitary_sweep.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui_adapter_boundary.test.ts` (6 files, 75 tests).
- Officer decision-history regressions pass: `tests\desktop_officer_decision_history.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui_adapter_boundary.test.ts tests\desktop_packaging_contract.test.ts` (4 files, 30 tests), after red/green coverage for desktop filing, packaged helper inclusion, player-faction adapter projection, and Records ledger copy.
- Expanded affected consequence suite passes: `tests\humanitarian_convoy_lifecycle.test.ts tests\paramilitary_sweep.test.ts tests\desktop_officer_decision_history.test.ts tests\desktop_packaging_contract.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui_adapter_boundary.test.ts` (8 files, 81 tests).
- Counter-offer modal regression passes: `tests\ui\decision_family_modals.test.ts tests\presidential_decision_room_counter_offer.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts` (4 files, 14 tests), after red/green coverage for the missing modal route.
- Chronicle duplicate-decision regression passes: `tests\ui\chronicle_decision_ledger.test.ts` (2 tests), after red/green coverage for suppressing duplicate turn-summary event cards when a filed decision ledger entry owns the same event id.
- Browser DOM verification on `http://127.0.0.1:3001/?view=map` after loading latest run confirmed the simplified toolbar labels and absence of top-level `SUMMARY`, `OPS`, `EVENTS`, and `CHRONICLE`.
- Desk-first route cleanup regressions pass: `tests\ui\pre_advance_command_review.test.ts`, `warroom_priority_docket`, `inbox_dedup`, `shell_navigation_ownership`, `coachmark_layer`, and `onboarding_track_d_consolidation` (6 files, 30 tests).
- `npm.cmd run desktop:map:build` passes with existing Vite externalization/chunk-size warnings.
- `npm.cmd run desktop:release:check` passes, including tactical-map build, desktop sim bundle, and Warroom build.
- `npm.cmd run desktop:package:probe` passes; packaged Electron booted Warroom, operational tactical map, and sandbox map windows, loaded startup `RBiH` state, and received deterministic game-state and turn-report pushes through the packaged desktop bridge.
- `node tools\ui\presidential_loop_smoke.cjs` passes against `http://127.0.0.1:3001/?view=warroom` using the clean RBiH side-picker path. Fresh evidence is in `docs/40_reports/implemented/visual_validation/20260524_presidential_desk_flow/summary.json` and screenshots `01_desk.png` through `06_next.png`.
- Final broad GUI regression passes: `tests\ui\decision_family_modals.test.ts tests\ui\decision_surface_registry.test.ts tests\ui\error_copy_contract.test.ts tests\ui\modal_stack_priority.test.ts tests\ui\personnel_player_safe_display.test.ts tests\ui\president_desk_shell.test.ts tests\ui\presidential_blockers.test.ts tests\ui\shell_navigation_ownership.test.ts tests\ui\panel_rail_ownership.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_ui.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\inbox_dedup.test.ts tests\ui\coachmark_layer.test.ts tests\ui\onboarding_track_d_consolidation.test.ts tests\presidential_decision_room_counter_offer.test.ts tests\ui_adapter_boundary.test.ts` (21 files, 89 tests).
- Targeted advance-copy/smoke-tool regressions pass: `tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\shell_navigation_ownership.test.ts tests\ui\decision_family_modals.test.ts` (5 files, 22 tests).
- Browser DOM verification on `http://127.0.0.1:3001/?view=warroom` after loading latest run confirmed a loaded save shows `PRESIDENT'S DESK`, no visible `Decision Room` / `Open Inbox`, no raw `pending_required_decisions`, and no tactical `COMMAND/SITUATION` rail under the Desk. The visible peace-plan modal is expected because that save contains an unresolved modal-required diplomatic decision.
- Browser DOM/screenshot verification on `http://127.0.0.1:3001/?view=warroom` after peace-ledger work confirmed `PRESIDENT'S DESK` remains visible and no `pending_required_decisions`, `Open Inbox`, `Decision Room`, raw `C:`/`A:` stats, or tactical `COMMAND/SITUATION` rail text is visible. Screenshot: `docs/plans/gui-verify-warroom-after-peace-ledger.png`.
- Browser DOM/screenshot verification after the final copy pass confirmed Advance Clearance shows `OPPORTUNITIES` and `COSTLY TURNS` and does not show `OPS`, `HARD TURNS`, `pending_required_decisions`, `Open Inbox`, `Decision Room`, raw `C:`/`A:` stats, or player-hidden `VRS` copy in the RBiH desk path.
- `git diff --check` exits clean except the existing CRLF normalization warning on `src/ui/map/App.tsx`.
- Browser screenshots captured under `docs/plans/gui-verify-*.png`; in-app screenshot capture timed out on the loaded map during Task 8 verification, so Task 8 visual evidence currently relies on DOM/browser inspection until the next capture pass.

Remaining high-value work:

1. The automated packaged probe now covers Electron boot/bridge/window/state-push health, while desktop resolver mutations are covered by focused IPC/helper contract tests. A future manual Electron pass is still useful for feel, but no known blocker remains in the decision routing model.
2. Asset policy and prompts are documented separately in `docs/plans/2026-05-24-gui-ai-asset-brief.md`; no image integration should start until assets are selected.

## Open Decisions For User Review

1. Should President's Desk fully replace the current right-side Inbox rail, or should the rail remain as a compact fallback while Desk is built?
2. Should reserve requests become modal decisions or remain Army HQ reserve-panel work?
3. Should commander portraits use generated generic dossier art, sourced historical portraits, or no portraits until an asset policy is written?
4. Should the Warroom remain the visual background for Desk, or should Desk also have a flat document-board fallback for low-asset builds?
