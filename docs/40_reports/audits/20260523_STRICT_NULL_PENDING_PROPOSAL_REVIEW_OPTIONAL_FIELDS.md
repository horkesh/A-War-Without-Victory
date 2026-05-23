# Strict-Null Audit: PendingProposalReview Optional Fields

Date: 2026-05-23

Scope: `PendingProposalReview` in `src/state/game_state.ts`.

## Finding

`PendingProposalReview` contributes nine optional fields to the strict-null `optional_fields_game_state` inventory:

| Field | Classification | Evidence |
|---|---|---|
| `accepted` | State-machine optional | Absent means unresolved; desktop accept/reject IPC writes `true` or `false`; operation-opportunity rich decisions may resolve without this legacy binary flag. |
| `opportunity_decision` | Family-specific optional | Present only for operation-opportunity rich decisions; stance and `APPROVE_OP` proposal rows do not use it. |
| `opportunity_decision_options` | Family-specific optional | Present only when rich opportunity decisions need redirect/delay/commitment metadata. |
| `redirect_variant_id` | Decision-option optional | Only meaningful for redirect decisions inside `opportunity_decision_options`. |
| `delay_turns` | Decision-option optional | Only meaningful for delay decisions inside `opportunity_decision_options`. |
| `commitment_profile` | Decision-option optional | Only meaningful for under-resource/reinforcement-style opportunity decisions. |
| `resolved_turn` | State-machine optional | Absent while pending; written by desktop IPC or headless auto-resolution when the player/bot resolves a row. |
| `current_value` | Proposal-family optional | Stance and current/pending review rows use it; not every proposal family has a meaningful current value. |
| `proposed_value` | Proposal-family optional | Stance/opportunity recommendation rows use it; rich decisions may carry intent in `opportunity_decision` instead. |

## Producer/Consumer Review

- `generateLevel1StanceProposals(...)` writes stance rows with `current_value` and `proposed_value`, leaving resolution fields absent.
- `generateLevel1OpProposals(...)` writes operation approval rows with `current_value: 'pending'` and `proposed_value: 'approved'`, leaving resolution fields absent.
- `generateOpportunityProposalReviews(...)` writes opportunity-review rows with `current_value: 'pending_review'` and recommendation `proposed_value`.
- `accept-proposal` and `reject-proposal` in `electron-main.cjs` write legacy `accepted` plus `resolved_turn`.
- `resolve-operation-opportunity-decision` writes `opportunity_decision`, optional `opportunity_decision_options`, and `resolved_turn`.
- `autoResolveOpportunityProposalReviews(...)` writes deterministic headless `opportunity_decision` plus `resolved_turn` for unresolved opportunity rows.
- `applyResolvedOpportunityDecisions(...)` consumes rows whose action starts with `OPPORTUNITY:` and which carry either a normalized rich decision or legacy binary `accepted`.
- Renderer adapters intentionally filter unresolved rows by `accepted == null`; forcing `accepted` to a required boolean would erase the pending state.

## Decision

Do not promote these nine fields generically in the strict-null cleanup lane.

The optional shape is the state-machine contract:

1. Pending rows must distinguish absent resolution from accepted/rejected decisions.
2. Stance proposals, ordinary op approvals, and operation-opportunity reviews are separate proposal families sharing one queue.
3. Rich opportunity decisions carry structured options only for decision types that need them.

Reducing these optionals requires a schema redesign, such as a discriminated union by proposal family and resolution state. That would be a real state contract/migration lane, not a counted optional-field cleanup.

## Verification

Fresh inventory command:

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
```

Current result still includes `PendingProposalReview` with nine optional fields, intentionally classified rather than reduced.

## Roadmap Impact

This burns down the `PendingProposalReview` state optional-field group by classification. Future work should either leave this sparse state machine intact or replace it through a migration-backed discriminated-union contract.
