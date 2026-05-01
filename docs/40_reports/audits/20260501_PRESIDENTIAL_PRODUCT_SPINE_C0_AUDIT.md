# Presidential Product Spine C0 Audit

**Date:** 2026-05-01  
**Scope:** Architecture audit and implementation plan for the v0.9 presidential campaign loop.  
**Runtime impact:** None. Docs-only audit; no engine code, UI code, scenario data, painted targets, tests, or run artifacts changed.

---

## 1. Executive Verdict

The product spine exists, but it is not closed.

AWWV already has the major parts of a serious presidential grand-strategy loop: Warroom, tactical map, Army HQ, command briefing, presidential inbox, opportunity dossiers, AAR records, Chronicle, Codex, Cost Ledger, and VerdictScreen. The weakness is composition. The player can inspect many strong surfaces, but after pressing Advance Turn the product does not yet deliver a single presidential aftermath packet that says what happened, why it happened, what it cost, and what requires attention next.

The next substantial Codex/Claude work should therefore be Mega-Lane C: turn aftermath and review-loop closure. This is not a calibration lane. It is a product-spine lane that turns existing deterministic state into a coherent campaign rhythm.

**TL;DR:** the engine has the ingredients; the player loop needs a turn-after-action spine that connects report, review queue, cost, records, and next briefing.

---

## 2. Evidence Read

| Surface / contract | Current owner | Files inspected | C0 finding |
|---|---|---|---|
| Warroom shell and desk routing | Warroom as campaign shell | `src/ui/map/components/warroom/WarroomShellLayer.tsx`, `src/ui/map/utils/shellNavigation.ts` | Good shell hierarchy. Hotspots route to Army HQ, Chronicle, event log, strategic overview, and advance-turn confirmation. |
| Advance turn execution | Desktop IPC + shared UI action | `src/desktop/electron-main.cjs`, `src/ui/map/desktop/orderActions.ts`, `src/ui/map/components/warroom/AdvanceTurnModal.tsx`, `src/ui/map/components/PresidentialToolbar.tsx` | Deterministic execution path is unified. Missing: success path opens no aftermath surface. |
| Turn report delivery | Desktop bridge + store | `src/ui/map/hooks/useDesktopSession.ts`, `src/ui/map/store/gameStore.ts`, `src/sim/turn_pipeline_types.ts` | `turn-report-updated` is persisted as `lastTurnReport`, but current use is narrow: mostly officer succession / probe proof. |
| Persisted turn summary | Sim-side after-action model | `src/state/turn_summary.ts`, `src/ui/map/data/GameStateAdapter.ts` | Strong source already exists: battles, territory net, flips, displacement, formation events, supply deltas, events, snapshots. Not yet elevated into a presidential aftermath screen. |
| Command briefing | Sim-side briefing collector + tactical banner | `src/sim/briefing/collect_briefing.ts`, `src/ui/map/components/CommandBriefingLayer.tsx` | Strong next-briefing substrate. It is forward-looking, not a full "what just happened and what did it cost" surface. |
| Presidential inbox | Tactical decision queue | `src/ui/map/components/PresidentialInbox.tsx`, `src/ui/map/data/inboxItems.ts` | Good unified action entrypoint for event, peace, reserve, officer, opportunity, autonomy, and situation items. Needs to become the post-aftermath "next actions" destination. |
| Army HQ attention | Command-review surface | `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx`, `src/ui/map/components/army_hq/ArmyHQModal.tsx` | Correct owner for military review. Opportunity dossiers are counted locally here, while toolbar review count uses a narrower queue. |
| War summary / SITREP | Army HQ summary + tactical wrapper | `src/ui/map/components/WarSummaryModal.tsx`, `src/ui/map/components/army_hq/WarSummaryContent.tsx` | Good standing summary. It is not turn-scoped enough to be the primary aftermath experience. |
| Opportunity records and cost | Army HQ records + final reckoning | `src/ui/map/data/operationOpportunityLedger.ts`, `src/ui/map/data/operationOpportunityDossiers.ts`, `src/ui/map/components/VerdictScreen.tsx` | Opportunity history and final War Reckoning exist. Interim campaign cost/reckoning is partial. |
| Final judgment | VerdictScreen | `src/ui/map/components/VerdictScreen.tsx`, `src/ui/map/data/GameStateAdapter.ts` | Strong endgame presentation. Cost Ledger / historical comparison are currently derived only when `meta.game_over` is true. |

---

## 3. Loop Inventory

| Loop step | Player question | Canonical surface | Current status | Gap |
|---|---|---|---|---|
| Brief | What is the situation? | Warroom + Army HQ briefing | Live | Warroom routes well; briefing is already sim-owned. |
| Inspect | Where is it happening? | Tactical Map | Live | No C0 blocker. |
| Decide | What can I do? | Presidential Inbox + Army HQ attention | Live but split | Counts and entrypoints are not yet one post-turn review funnel. |
| Execute | What happens when I end the turn? | Desktop `advance-turn` + war pipeline | Live | Execution is strong; presentation is thin. |
| Report | What happened this turn? | Missing primary aftermath surface | Partial | `TurnSummary` and `lastTurnReport` exist, but no first-class player screen owns them. |
| Cost | What did it cost? | War summary + Cost Ledger | Partial | War summary has casualties/displacement; Cost Ledger is final-only in UI adapter. |
| Judge | How does history read this? | Chronicle, Codex, VerdictScreen | Partial | Final judgment is strong; per-turn consequence/judgment bridge is not. |
| Next | What needs attention now? | Inbox + Army HQ | Partial | Inbox exists, but advance-turn does not guide the player into it after aftermath. |

---

## 4. Contradictions And Missing Handoffs

1. **Advance turn has no presidential aftermath owner.**  
   `advanceTurnAndSync(...)` calls IPC, reloads state, and clears staged orders. The desktop sends `turn-report-updated`, and the store keeps `lastTurnReport`, but no modal or panel transforms `lastTurnReport + latestTurnSummary + next review queue` into a presidential after-action packet.

2. **Review counts are close but not unified.**  
   `PresidentialInbox` derives a broad queue from `deriveInboxItems(...)`. `PresidentialAttentionPanel` adds opportunity dossier count to `presidentialReviewQueue`. `PresidentialToolbar` receives `pendingReviews` from `presidentialReviewQueue?.pendingCount`, so opportunity dossiers can be represented in Inbox/HQ while the red `REVIEWS` alert remains narrower. This is not fatal, but it is a product-spine mismatch.

3. **Cost is split between standing summary and final reckoning.**  
   `WarSummaryContent` can show casualties, displacement, supply, and operational sitrep. `GameStateAdapter` derives `costLedger` and `historicalComparison` only when `meta.game_over` is true. That means the final judgment has a strong reckoning surface, but the active campaign lacks a unified "cost so far / cost this turn" presidential packet.

4. **Command briefing is forward-looking but aftermath is backward-looking.**  
   `CommandBriefingLayer` correctly answers "what needs attention now." It should not also become the after-action owner. The missing surface is a bridge between the previous turn and this briefing.

5. **Records are strong but passive.**  
   Army HQ Records and opportunity records are good retrospective surfaces, but they are user-pulled. A post-turn flow should push the most important AAR/record links as part of the aftermath packet, then let the player dive deeper.

---

## 5. Implementation Mega-Lane C1

This should be a substantial lane, not a small packet. It can be implemented without changing combat, OOB, scenario data, painted targets, or opportunity catalog topology.

### Phase 1 - Turn Aftermath Read Model

Create a pure UI read-model builder that consumes:

- previous `LoadedGameState` if available
- next `LoadedGameState`
- `LastTurnReport`
- `next.latestTurnSummary`
- `next.pendingProposalReviews`
- `next.operationOpportunityRecords`
- `next.presidentialReviewQueue`
- `next.armyReserveQueue`

Proposed file:

- `src/ui/map/data/turnAftermath.ts`

Output should be deterministic and player-scoped:

- turn/date
- territory gains/losses from `TurnSummary.territory_net` and `notable_flips`
- battles and AAR links from `TurnSummary.battles` plus `operationHistory`
- displacement and formation events from `TurnSummary`
- supply and equipment pulse from `TurnSummary.supply_deltas` / `heavy_munitions_deltas`
- next-review summary from existing inbox/review queues
- links to Army HQ Records, Summary, Opportunity dossiers, and map highlights

### Phase 2 - Store And Shared Advance-Turn Hook

Extend the shared advance-turn path so both toolbar and Warroom calendar use the same post-success behavior:

- capture previous loaded state before `ipc.advanceTurn()`
- load next state
- build `TurnAftermathView`
- store it in `gameStore`
- open the aftermath surface

Candidate ownership:

- `src/ui/map/desktop/orderActions.ts`
- `src/ui/map/store/gameStore.ts`
- minimal call-site wiring in `PresidentialToolbar.tsx` and `AdvanceTurnModal.tsx`

Keep this UI-side. Do not mutate engine state.

### Phase 3 - Presidential Aftermath Surface

Add a first-class surface:

- `src/ui/map/components/turn_aftermath/TurnAftermathModal.tsx` or `src/ui/map/components/TurnAftermathModal.tsx`

It should be compact and action-oriented:

- headline: net result and date
- tabs or bands: Results, Costs, Command, Next
- buttons: Open Map Focus, Open Army HQ Briefing, Open Records, Open Inbox, Continue

It must not duplicate Records or War Summary depth. It should route to them.

### Phase 4 - Review Queue Unification

Create one derived count model for top-level review urgency so Inbox, Toolbar, and Army HQ do not calculate slightly different "matters await" meanings.

Candidate file:

- `src/ui/map/data/presidentialReviewItems.ts` or extend `inboxItems.ts`

Do not invent a second queue. The model should derive from existing state:

- event decisions
- peace/dayton
- reserve requests
- officer events
- autonomy proposals
- operation opportunities

### Phase 5 - Cost And Records Bridge

Add active-campaign cost/reckoning summary using existing safe sources before final VerdictScreen:

- `TurnSummary` for this-turn cost
- War summary aggregates for current campaign totals
- opportunity records for decisions/outcomes so far

Do not expose final historical comparison as if the war has ended. The active campaign should say "cost so far," not "final judgment."

### Phase 6 - Tests And UI Proof

Required tests:

- pure `buildTurnAftermathView(...)` fixtures
- `advanceTurnAndSync` or wrapper opens aftermath after success and not after blocked turn
- Inbox/Toolbar/HQ count consistency
- player-faction scoping
- no raw OSID text in player-facing aftermath rows where display labels exist

Required UI proof:

- run or load a current save
- advance one turn from toolbar
- advance one turn from Warroom calendar
- verify aftermath opens in both paths
- verify links route to Army HQ / Records / Inbox

---

## 6. Stop Gates

Stop and ask only if:

- a proposed aftermath row would need sensitive-history wording not covered by existing event/AAR text
- implementation would require engine combat, scenario, OOB, painted target, or operation catalog changes
- player-visible truth cannot be scoped without leaking hidden enemy detail
- Claude and Codex are actively editing the same UI/data files

---

## 7. Recommended Ownership

Codex should own architecture and review. Claude can implement the C1 lane after the current opportunity topology lane settles.

Minimum Claude parallel agents for C1:

- `/architect` or `/technical-architect` for shell ownership and data flow
- `/ui-ux-developer` for surface design and flow
- `/qa-engineer` for tests and UI proof
- `/determinism-auditor` for ordering, store updates, and player-scoped serialization/read model
- `/game-designer` for presidential meaning and action hierarchy

No historian is required unless C1 adds new historical prose; it should mostly render existing event/AAR text.

---

## 8. Next Prompt Shape

Use the mega-lane prompt pattern from `docs/plans/2026-05-01-v09-product-spine-megalane-plan.md`. Do not ask Claude for a one-modal patch. The lane should include read model, store bridge, UI surface, review-count unification, tests, browser proof, docs, ledger, knowledge, and phase commits.
