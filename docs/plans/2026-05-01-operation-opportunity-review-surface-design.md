# Operation Opportunity Review Surface - Design Doc

**Date:** 2026-05-01
**Status:** Product architecture / UI design contract, no code in this doc
**Owner lane:** Codex architect lane, parallel to Claude's force-quality evidence audit
**Authority:** Below canon and engine invariants. Does not change `docs/10_canon/`.
**Related docs:**
- `docs/plans/late-war-operation-opportunity-system-design.md`
- `docs/plans/2026-05-01-force-quality-operation-architecture-contract.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `docs/40_reports/GUI_MASTER.md`

## Purpose

The late-war opportunity model says historical operations should surface as proposals, not calendar-forced scripts. The force-quality contract says ARBiH/VRS trajectories should change operation readiness and delivery, not silently flip territory.

This doc defines the missing player-facing bridge: how an operation opportunity becomes a readable, actionable Army HQ dossier that the player can approve, delay, redirect, under-resource, or decline.

The goal is not to make a new combat path or a new free-form planner. The goal is to make the existing command shell show the player why an opportunity exists, what the staff thinks, what institutional traits matter, and what decision is being made.

## Architecture Decision

The canonical review surface is **Army HQ**, with a map-linked dossier.

| Candidate surface | Verdict | Reason |
|---|---|---|
| `AutonomyPanel` proposal cards | Too thin alone | Existing `domain: 'ops'` proposal cards prove the seam, but accept/reject cards cannot carry five responses, prerequisite evidence, map footprint, or sensitive-history guardrails. |
| Map-local `OperationsPanel` | Snapshot only | It already frames itself as "Field Ops Snapshot" and hands deep review back to HQ. It should highlight selected opportunity targets, not own authorization. |
| `OpsPlanningModal` | Reuse after approval / redirect | It is excellent for drafting a player-authored corps operation, but an opportunity is a staff dossier first. It should be entered only for redirect/edit variants, not for every opportunity. |
| `OperationBriefingModal` | Reuse after op creation | It owns launch/postpone/probe/abort after a `CorpsOperation` exists. Opportunity review happens before that lifecycle. |
| Army HQ modal | Primary owner | It already owns command review, corps cards, operations section, proposal attention, officer context, records, and player-safe command language. |

The product rule is:

> Opportunity review belongs to Army HQ. The tactical map can visualize the footprint, and the existing operation lifecycle executes the result, but the strategic authorization choice is an HQ command decision.

## Existing Seams To Reuse

| Existing seam | Current role | Opportunity-review use |
|---|---|---|
| `state.military.last_briefing` -> `SituationBriefing` | Presentation-only Army HQ briefing items | Add "operation opportunity pending" items as staff attention, not raw debug rows. |
| `AutonomyPanel` / `pending_proposal_reviews` | Assisted-command proposal review | Keep as a compact alert and fallback, but not the full dossier. |
| `OperationsSection.tsx` | Per-corps operation detail inside Army HQ | Add an "Opportunities" subsection adjacent to active and completed operations. |
| `OperationsPanel.tsx` | Map-local active operation snapshot | Add selection/highlight handoff after implementation; do not put approval controls here. |
| `OpsPlanningModal.tsx` | Four-phase player-authored planning flow | Reuse for redirect variants or manual drafting from an opportunity. |
| `OperationBriefingModal.tsx` | Decision gate after operation preparation | Reuse after approval creates a normal `CorpsOperation`. |
| `query-operation-prediction` | Read-only G2 estimate | Feed opportunity dossiers with optional prediction snapshots when enough axis data is available. |
| `stage-corps-operation-order` | Mutating order creation | Approval ultimately resolves through this family of owner paths, not a parallel op object. |
| `stage-operation-decision` | Launch/postpone/abort/probe after op exists | Separate from opportunity review; do not overload it before op creation. |

## Player Flow

1. The opportunity evaluator produces a deterministic eligible proposal.
2. The adapter exposes a player-safe `OperationOpportunityProposalView`.
3. Army HQ shows an attention item and an Opportunities queue count.
4. Opening the dossier focuses the relevant corps, highlights objectives/staging on the map, and presents staff evidence.
5. The player chooses one of five responses:
   - **Approve:** authorize conversion into the existing `CorpsOperation` lifecycle.
   - **Delay:** keep the opportunity pending until a deterministic re-evaluation turn.
   - **Redirect:** choose one authored variant, then optionally enter `OpsPlanningModal` for the variant draft.
   - **Under-resource:** approve with reduced commitment, no hidden combat bonus, and visible risk flags.
   - **Decline:** reject and apply the family-doc lockout / expiry behavior.
6. Bot factions use the same state and response vocabulary. Their choice is deterministic and personality-driven.
7. AAR and opportunity-resolution records close the loop for HQ records, Codex, Chronicle, and calibration reporting.

## Dossier Layout

The dossier should be dense, command-like, and scannable. It should feel like a staff packet, not a tutorial or landing page.

| Zone | Content | UI treatment |
|---|---|---|
| Header | Operation name, corps, faction, window, expiry, recommendation | Compact title row with status badge and countdown. |
| Why now | One to three player-safe reasons the opportunity is eligible | Staff language: "enemy reserve response is brittle", "staging access exists", "weather window open". |
| Map footprint | Staging area, axis arrows, objectives, risk areas | Use existing operation target highlight layers; labels must be display names, never raw OSIDs. |
| Prerequisite board | Date, political authorization, readiness, logistics, staging, weather, commander confidence, enemy weakness, alliance context | Nine chips: Ready / Strained / Blocked / N/A. Blocked opportunities should not be actionable; strained ones are visible risk. |
| Force-quality board | `operation_readiness`, `staging_reliability`, `axis_coordination`, `support_delivery`, `failure_recovery`, `reserve_response`, `collapse_susceptibility` | Seven trait bars or compact grades. Values are bands, not exact omniscient formulas. |
| Staff recommendation | Commander / Chief of Staff recommendation and dissent | Reuse command-strain and officer-profile language from `OperationBriefingModal`. |
| Choice row | Approve, Delay, Redirect, Under-resource, Decline | Icon buttons with labels; disabled states carry concise reasons. |
| Consequence notes | Ordinary military and political risk; T4 sensitive-history guard when relevant | No special atrocity choices; no benefit terms tied to civilian harm. |
| Evidence foldout | Optional debug/dev-only predicate trace | Hidden in normal player shell; useful for QA and deterministic audits. |

## Player-Safe DTO

The engine can keep richer internal state, but the UI should consume a reduced DTO. Field names are proposed, not final.

```ts
interface OperationOpportunityProposalView {
  proposalId: string;
  opportunityId: string;
  name: string;
  tier: 'T1' | 'T3' | 'T4';
  faction: 'RBiH' | 'RS' | 'HRHB';
  primaryCorpsId: string;
  primaryCorpsLabel: string;
  eligibleTurn: number;
  expiresTurn: number;
  status: 'pending_review' | 'delayed' | 'approved' | 'declined' | 'expired';
  recommendation: 'approve' | 'delay' | 'under_resource' | 'decline';
  recommendationLabel: string;
  whyNow: string[];
  objectives: Array<{ osid: string; label: string; risk: 'low' | 'medium' | 'high' }>;
  staging: Array<{ osid: string; label: string; axisId: string }>;
  prerequisiteAxes: PrerequisiteAxisView[];
  forceTraits: ForceTraitView[];
  availableActions: OpportunityActionView[];
  sensitiveHistoryNotice?: SensitiveHistoryNoticeView;
}

interface PrerequisiteAxisView {
  axis:
    | 'date_window'
    | 'political_authorization'
    | 'corps_readiness'
    | 'logistics'
    | 'staging_access'
    | 'weather_season'
    | 'commander_confidence'
    | 'enemy_weakness'
    | 'alliance_context';
  state: 'ready' | 'strained' | 'blocked' | 'not_applicable';
  label: string;
  reason: string;
}

interface ForceTraitView {
  trait:
    | 'operation_readiness'
    | 'staging_reliability'
    | 'axis_coordination'
    | 'support_delivery'
    | 'failure_recovery'
    | 'reserve_response'
    | 'collapse_susceptibility';
  band: 'strong' | 'adequate' | 'strained' | 'poor';
  label: string;
  reason: string;
}

interface OpportunityActionView {
  action: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline';
  enabled: boolean;
  label: string;
  disabledReason?: string;
}
```

DTO constraints:

- Resolve corps and OSID labels before render.
- Do not expose exact hidden enemy rosters outside debug-only surfaces.
- Sort proposals by `(expiresTurn, opportunityId, proposalId)` for display stability.
- Sort axes, objectives, and actions deterministically.
- Keep all mutation outside the DTO. It is read-only.

## IPC Boundary

The read path can ride on the existing `game-state-updated` payload through `GameStateAdapter`, because proposals are state.

The mutation path needs one richer decision endpoint. The implementation packet can choose the exact shape, but the clean contract is:

```ts
interface StageOperationOpportunityDecisionPayload {
  proposalId: string;
  decision: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline';
  redirectVariantId?: string;
  delayTurns?: number;
  commitmentProfile?: 'minimum' | 'standard' | 'reinforced';
}
```

Preferred implementation options:

| Option | Shape | Recommendation |
|---|---|---|
| Extend autonomy proposal handlers | Encode opportunity decisions through `acceptProposal` / `rejectProposal` plus proposal metadata | Too cramped for redirect, delay, and under-resource. Useful only as a fallback. |
| Add `stage-operation-opportunity-decision` | One mutating IPC handler that resolves a pending proposal into existing operation/order state | Recommended. It is a small bridge, not a new lifecycle. |
| Reuse `stage-operation-decision` | Add pre-operation decisions to the existing launch/postpone/abort channel | Reject. That channel owns decisions after a `CorpsOperation` exists. |

Adding a decision invoke does not create a new operation owner. It only stages the player's response to the opportunity proposal, after which the existing operation factories and lifecycle own the work.

## Sensitive-History Handling

T4 opportunities use the same dossier shape and the same five responses. They do not get special player levers.

Allowed:

- Territorial military opportunity review.
- Staff warning that political and humanitarian consequences are grave.
- Linkage to existing locked consequence systems in the eventual AAR / Cost Ledger.

Refused:

- Any "authorize atrocity" choice.
- Any civilian-harm minimization slider.
- Any reward, modifier, or fast-clear bonus tied to civilian harm.
- Any ability to suppress, trade, or soften locked rupture consequences.

The review surface should make the military decision legible without pretending civilian consequences are optional player optimization knobs.

## UI Placement

Minimum viable placement:

1. Army HQ `SUMMARY` / attention stack: show "Operation opportunity pending" cards.
2. Army HQ `OPS` or per-corps expanded card: show an `Opportunities` subsection above active operations.
3. Dossier modal or right-side HQ panel: full proposal review.
4. Tactical map: highlight selected proposal objectives and staging, using operations-mode layers.
5. OperationsPanel: show only "Pending opportunity at HQ" handoff when relevant; no approval controls.

Do not place the primary review in Warroom reports. Warroom may mention that Army HQ has pending operational decisions, but detailed authorization belongs in Army HQ.

## Implementation Phases

| Phase | Slice | Value | Tests |
|---|---|---|---|
| P0 | Add static fixture/story for `OperationOpportunityProposalView` and dossier layout | Lets us evaluate density and player language before engine wiring | Storybook/render smoke, a11y labels, no raw OSIDs in fixture text |
| P1 | Adapter read path from proposed opportunity state to player-safe DTO | Real proposals become visible without decisions | Unit tests for filtering, sorting, labels, player-faction scoping |
| P2 | Army HQ queue and dossier read-only surface | Player can inspect opportunities and map footprint | Component tests for queue, dossier sections, empty states |
| P3 | Mutating decision IPC | Player can approve/delay/decline; redirect/under-resource can land behind feature flags | IPC tests: sorted deterministic mutation, invalid proposal refusal, no state mutation on bad payload |
| P4 | Existing operation lifecycle linkage | Approved opportunity becomes normal `CorpsOperation`; AAR links back | Operation lifecycle tests, opportunity-resolution record tests |
| P5 | Force-quality trait display | Claude audit outputs become visible in the dossier | Trait band tests, diagnostic/AAR evidence tests |
| P6 | Bot/autonomy parity | Bot factions use same proposal and response vocabulary | Determinism tests for bot decisions and replay |

Minimum viable cutoff is P2 for inspection, P4 for playable decisions, P5 for the force-quality architecture to become visible.

## Acceptance Criteria

- The player can see why an opportunity is available without reading raw OSIDs, corps ids, or debug predicates.
- The player has the five canonical choices from the opportunity-system design.
- Approval creates or stages a normal operation; it does not create a second combat lifecycle.
- Delay, redirect, under-resource, and decline are persisted as opportunity-resolution facts.
- T4 opportunities do not expose forbidden sensitive-history choices.
- The tactical map visualizes footprint; Army HQ owns authorization.
- The operations snapshot panel remains a snapshot and handoff surface.
- Proposals and displayed lists are deterministic under replay.
- Force-quality traits can be shown as bands once Claude's evidence audit confirms their live owners.

## Non-Goals

- No code in this doc.
- No implementation of the opportunity evaluator.
- No operation-family authoring.
- No combat tuning.
- No new painted-target logic.
- No new sensitive-history mechanics.
- No free-form player operation editor beyond existing `OpsPlanningModal` and authored redirect variants.

## TL;DR

Opportunity review should be an **Army HQ dossier** with map-linked objectives, prerequisite chips, force-quality trait bands, staff recommendation, and five choices: approve, delay, redirect, under-resource, decline. The tactical map visualizes; existing operation systems execute; Army HQ owns authorization. This keeps late-war operations player-driven without becoming brigade micromanagement, calendar rails, or sensitive-history toy mechanics.
