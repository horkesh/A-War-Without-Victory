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

## 9. Image-category-card surface (ACCEPTED 2026-06-01 — owner wants generatable art)
The Desk's flat button grid (`PresidentDeskShell`) becomes a strip of **six image-backed category cards**, each deep-linking into the Decision Room *pre-filtered to that category's lens* (the Decision Room stays the act-host; the cards are the entry/organization tier). Each card shows a pending-count + urgent pip (reuse `presidentialDecisionRoom.ts` `lenses`/`urgentCount`).

**Navigation — LOCKED 2026-06-01 = COMBO (warroom scene is the front door; its OBJECTS open the card strip).** The diegetic `WarroomShellLayer` hotspot scene stays primary/immersive; clicking a desk/room object opens the **card strip pre-filtered to the thematically-matched category** (rewire the existing `regionToShellHandoff`/`applyShellHandoffCommand` so hotspots open the strip+category instead of routing into the Army-HQ briefing room). Object→category mapping (illustrative — refine to the actual hotspots): **telephone → Diplomacy & Patrons; war map / situation map → War Direction; briefing folio / coat-rack → Command & Personnel; newspaper stack → The War's Record; supply/ledger → Home Front; wall calendar → Advance**. The card strip is also reachable directly (accessibility). So immersion (objects) + organization (cards) coexist; both converge on the Decision Room lens.

**Six categories** (map onto the existing `PresidentialDecisionRoomCategory` union — a regrouping view, no new card sources): **1 War Direction** (authorize/request/stop op, force-launch, op-opportunities, autonomy) · **2 Diplomacy & Patrons** (peace plans, counter-offers, Dayton, convoy relief, patron relations) · **3 Home Front** (recruitment, logistics, municipality support, OPSEC) · **4 Command & Personnel** (replace CO, elite deployment, officer matters, front visit) · **5 Conscience & Atrocity** (paramilitary review — kept separate to protect the bright line) · **6 The War's Record** (consequence ledger, war-cost verdict, Your-War-vs-History).

**Tech (`CommandCard`):** art lives at `src/ui/map/assets/command_cards/<id>.webp`, **ES-imported** (NOT top-level `assets/` — that breaks in the packaged build; ES imports hash into `dist/tactical-map` → shipped via existing `extraResources`, no packaging-contract change). Use `import.meta.glob` for drop-in-no-code-edit. Reuse `DecisionCard.tsx` markup (`object-cover` img + bottom-gradient title safe-area + badge). **Fallback:** faction-tinted CSS placeholder when art is absent → the feature works before any art exists. Pure presentation; no engine/determinism touch. **New (thin):** `presidentialCategories.ts` (6 cats → source-categories + counts), `PresidentDeskCategoryStrip.tsx`, a Decision-Room `lens` deep-link param, `CommandCard.tsx`.

**Image asset manifest** (owner generates; style = muted sepia/parchment period photo-illustration, 1992-95 BiH, faction ink tint RBiH-green/RS-red/HRHB-blue, **non-graphic — no casualties/atrocity**): category cards 4:3 @1024×768 — `cat_war_direction` (situation map, grease-pencil front), `cat_diplomacy` (conference table, flags, dossier), `cat_home_front` (crated supplies, ledger, depot), `cat_command` (empty officers' briefing room, wall map, field phone), `cat_conscience` (grave empty council chamber, lamp, ledger — no people), `cat_record` (newspaper stack, typewriter, archive). Action cards 16:9 @1280×720 — `act_front_visit` (staff car on mountain road toward trench, no contact), `act_replace_commander` (officer's cap + signed order), `act_patron_relations` (two flags + empty chairs), `act_authorize_op` (ops map + stamped "ODOBRENO"), `act_convoy` (UN-white truck convoy, snow).

**LOCKED 2026-06-01 (owner):** (a) the 6-category taxonomy — confirmed as listed; (b) navigation — COMBO (warroom objects open the card strip, per above); (c) front-visit cost = CA 10 + the event's own 5×/10-turn cap (§10).

## 10. Player-initiated leadership/morale actions — front visit (+ enclave constraint)
Ship ONE new initiatable action now: **front visit** (the rest — address-the-nation, decorate-a-unit — defer; they need new authored content). **Zero new sim code:** a thin `initiate-front-visit` IPC force-queues the existing `visit_to_front_<faction>` event (war_1993.json:6291/6582/6858; morale+5/cohesion+3/patron_pressure-3/standing shifts) into `state.military.pending_event_decisions` (mirror `evaluate_events.ts:577`); `EventDecisionModal` surfaces it. **Cost ~CA 10** (mirror `stabilize-command-relationship` electron-main.cjs:2191/2243); **cooldown/cap reuse the event's own** max_fires 5 / cooldown 10t. Surfaces as a card in Command & Personnel showing last-visit / fronts-available / morale stake / availability. The morale/standing shifts ARE the consequence-receipt.

**⚠ OWNER CONSTRAINT (2026-06-01): the president CANNOT visit a CUT-OFF enclave** (Srebrenica/Žepa/Goražde, Bihać-when-encircled). Visit targets are **gated by REACHABILITY** — only fronts with a friendly ground corridor to the rear are visitable, checked **dynamically per turn** (corridors open/close). Besieged ≠ cut-off: **Sarajevo via the Butmir tunnel** = corridored → visitable; truly encircled enclaves = not. **Implementation:** reuse the SUPPLY-CONNECTIVITY signal (cut-off enclaves already register supply-isolated, `supply_reserves.ts`) as the gate — do NOT invent new encirclement detection (engine lacks clean BFS-isolation; see memory `enclave_mechanics_research`); fallback = small BFS-from-capital over friendly-controlled OSIDs. Filter/disable unreachable branches before queuing. Sensitive-history gate intact (blocked `visit_press_*` sub-options unchanged).

## 8. Provenance
Owner direction 2026-06-01. Specialists: warroom UI audit + presidential-UX design + (round 2) action-card IA + GUI image-card pipeline + initiatable-leadership-actions. Related: `docs/plans/2026-06-01-presidential-command-model-design.md`, memory `player_command_model.md`. Files in play: `App.tsx`, `presidentialDecisionRoom.ts`, `army_hq/{PresidentialDecisionRoomPanel,OperationsSection,CommanderSection}.tsx`, `ArmyReservePanel.tsx`, `presidential_desk/PresidentDeskShell.tsx`, `utils/commandAuthority.ts`, `data/consequenceReceipts.ts`, `DiplomacyPanel.tsx`, `EventLogPanel.tsx`, `DecisionHistoryOverlay`.
