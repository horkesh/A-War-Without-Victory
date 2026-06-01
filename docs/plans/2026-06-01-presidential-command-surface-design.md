# Presidential Command Surface (Warroom) — Design

**Status:** ACCEPTED 2026-06-01 (owner). Companion to `docs/plans/2026-06-01-presidential-command-model-design.md` (the five levers, all shipped #103–#107). This doc covers how those levers + the political/consequence layer **converge into a coherent presidential UI** instead of being scattered. Sourced from a two-specialist convening (warroom UI audit + presidential-UX design).

## 1. Diagnosis
The desktop "warroom" desk is a **launcher, not a destination**: its hotspots (`WarroomShellLayer`) route through `applyShellHandoffCommand` into the Army-HQ "briefing room" and then drop to the tactical map; only the wall calendar (advance-turn) stays in the room. The legacy `src/ui/warroom/*.ts` modals are dormant (never instantiated except Settings) — the live UI is the React `src/ui/map` app.

The five presidential levers are real and IPC-wired but **scattered and buried**: Request-op (text input), Stop-op (Stand Down), Replace-CO all live 2–3 clicks deep inside an Army-HQ *corps card*; Authorize-elite is on a tactical-map rail (`ArmyReservePanel`); Authorize-op is in the briefing attention panel. **None is presented as a presidential action.** Command Authority is the currency for all five (25 each) yet appears only as a thin toolbar gauge, disconnected from where it's spent.

Key asset: a `PresidentialDecisionRoom` view-model (`presidentialDecisionRoom.ts`) already aggregates every decision into cards/lenses/loop-steps — but its cards only **navigate** to the scattered panels. The fix is convergence, not new screens.

## 2. The command surface — Desk → Decision Room → Directive Card
Command Authority is the connective tissue. Keep the existing three-place spine; add no sixth modal.
- **Desk** (`PresidentDeskShell`) = the **scan**. Add an **Authority & Directives header**: current CA + the five levers as a legend with costs + count of live directives this turn. The desk becomes the home of *agency*, not just notifications.
- **Decision Room** (`PresidentialDecisionRoomPanel`, inside Army-HQ briefing) = the **single host of the levers** (LOCKED decision #1). Give the card model an optional `directive?: { lever: 'request_op'|'stop_op'|'force_launch'|'elite_deploy'|'replace_co'; corpsId; cost; payload }` so a card **issues the order inline** via the existing IPC (`stageOpDirectiveOrder`, `stageOpHaltOrder`, `stageOperationForceLaunch`, `approveReserveRequest`, `stageCoReplacementOrder`). Cards show CA cost inline and disable when `commandAuthority.current < cost` (reuse the existing guards). The scattered corps-card buttons remain as a commander's *deep-drill*, but are no longer the only path.
- **Directive Card** (the expanded dossier, `buildActiveDossier`) = the **act/confirm**. "Direct V Corps to take Bihać · 25 authority · your officer recommended postpone." **This is the home of the force-op pushback card** (the disposition-tinted objection shows here before confirm), and the directive **seeds promise→receipt** (`consequenceReceipts.ts`).

**Flow:** scan the Desk → step into the Decision Room → each lever-eligible card carries its directive → confirm in the dossier → advance → consequence surfaces in `TurnAftermathModal`. Review → direct → consequence, never plan → execute.

## 3. Dead-end modal → presidential repurpose
LOCKED decision #2: retire `StrategicDashboard`; merge `DecisionHistoryOverlay` + `EventLogPanel`.

| Modal | Today | Presidential repurpose | Quick win |
|---|---|---|---|
| `DiplomacyPanel` | read-only patron bands (support/constraint/commitment/isolation, sanctions), URL-only | **Patron Relations** desk — "what your patron will tolerate" before you spend authority; home for the patron-gated context (HRHB, RS blockade) | **YES** (data exists; pure re-route) |
| `EventLogPanel` | flat fired-event log | **Authored-Choices ledger** — filter to *player* decisions ("authorship of the tragedy" browsable); merge with `DecisionHistory` | **YES** (filter exists) |
| `EnclaveDashboard` | status list, bounces to briefing | Humanitarian/siege ledger (convoy + enclave relief) | partial |
| `EconomyPanel` | thin metrics | War-Footing card on Desk (mobilization/exhaustion the president governs) | partial |
| `StrategicDashboard` | duplicate metrics | **retire** (folds into Decision Room) | retire |
| `AiAdvisorPanel` | generic advice | Chief-of-Staff counsel on the active directive | partial |

## 4. Turn rhythm
A head of state's week, not a general's: scan the Desk (2–4 packets + the ConsequenceStrip showing last turn's price) → step into the Decision Room (the loop-steps brief→inspect→decide→execute already model this) → read the Chief of Staff, issue *at most a few* weighty directives (authority scarcity ~2/turn hard-caps micromanagement) → advance (the pre-advance gate `buildPreAdvanceCommandReviewView` already blocks on unresolved decisions) → live with the receipts in `TurnAftermathModal`.

## 5. Guardrails honored
- **No power fantasy / strategic-not-operational:** levers name *objectives/intent* (Request-op takes a target OSID; engine picks brigades/axes). Authority scarcity caps overrides. Brigade/axis micro stays DLC.
- **Consequence loop reinforced, not duplicated:** directives seed `consequenceReceipts`; aftermath/EventLog surface them as authored choices. Merge DecisionHistory+EventLog rather than add a screen.
- **Faction asymmetry from data:** RS revolt / HRHB patron-gating surface on the lever cards from officer-disposition + Diplomacy bands; never hardcoded.

## 6. LOCKED decisions (owner, 2026-06-01)
1. **Decision Room *issues* directives** (not just navigates) — YES. Changes the card contract; makes the Decision Room the canonical presidential path.
2. **Retire `StrategicDashboard`; merge `DecisionHistoryOverlay`+`EventLogPanel`** into the Authored-Choices ledger — YES.
3. **Desk = scan, Decision Room = act** (the canonical home for issuing levers) — YES.

## 7. Build order
0. **Quick wins (safe, no engine touch):** `DiplomacyPanel`→Patron Relations (wire into the Desk); `EventLogPanel`→Authored-Choices ledger (filter to player decisions + merge `DecisionHistory`).
1. **Decision Room directive integration:** add `directive` to the card model + wire the five levers' IPC + CA cost/disable; the Desk Authority & Directives header.
2. **Directive card = act surface:** the dossier confirm + **migrate the force-op pushback card here** (built surface-agnostic; relocate from `OperationsSection`).
3. **Retire/merge** StrategicDashboard + DecisionHistory/EventLog.
4. Deepen the partial repurposes (Enclave humanitarian ledger, Economy war-footing, AiAdvisor chief-of-staff).

All UI-layer; no calibration/determinism impact (the levers' engine paths are already shipped + byte-identical). Each slice updates this doc + the ledger + the command board (sync discipline).

## 8. Provenance
Owner direction 2026-06-01. Specialists: warroom UI audit + presidential-UX design. Related: `docs/plans/2026-06-01-presidential-command-model-design.md`, memory `player_command_model.md`. Files in play: `App.tsx`, `presidentialDecisionRoom.ts`, `army_hq/{PresidentialDecisionRoomPanel,OperationsSection,CommanderSection}.tsx`, `ArmyReservePanel.tsx`, `presidential_desk/PresidentDeskShell.tsx`, `utils/commandAuthority.ts`, `data/consequenceReceipts.ts`, `DiplomacyPanel.tsx`, `EventLogPanel.tsx`, `DecisionHistoryOverlay`.
