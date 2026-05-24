# Strict-Null Audit: GameState Top-Level Optional Fields

Date: 2026-05-23

Scope: top-level `GameState` optional fields in `src/state/game_state.ts`.

## Finding

`GameState` currently contributes five top-level optional fields to the strict-null `optional_fields_game_state` inventory:

| Field | Classification | Evidence |
|---|---|---|
| `turn_summaries` | Persisted history optional | Written by the turn-summary pipeline; consumers consistently tolerate absence with `?? []` or empty-state behavior. |
| `operation_history` | Persisted history optional | Written by operation AAR finalization; diagnostics, UI adapters, commander planning, and endgame cost ledger preserve absence as no completed operations. |
| `pending_paramilitary_requests` | Transient decision-queue optional | Populated only when player-faction paramilitary requests are pending; consumed/cleared by decision handling. |
| `paramilitary_policy` | Player policy optional | Runtime logic defaults absence to `ask`; migration/legacy reports show this root field needs a separate schema reconciliation before promotion. |
| `paramilitary_deployment_count` | Consequence/accounting optional | Runtime initializes a per-faction record when needed; existing migration/report evidence shows legacy root normalization drift that should not be locked in generically. |

## Producer/Consumer Review

`src/state/serializeGameState.ts` allowlists all five fields as canonical top-level save keys when present.

`src/state/save_migration.ts` version 12 recognizes these as a top-level optional family, but it is intentionally conditional on at least one member being present. It also contains legacy shape drift for `paramilitary_policy` and `paramilitary_deployment_count`; the current `GameState` type expects policy as `'always_allow' | 'always_deny' | 'ask'` and deployment counts as `Record<FactionId, number>`, while that migration normalizes to `{}` and `0`.

Consumers preserve sparse behavior:

- `compileTurnSummary(...)` writes `turn_summaries`, while political/personality, negotiation, events, UI, and anomaly consumers tolerate absence or empty history.
- Operation AAR finalization appends `operation_history`, while diagnostics, cost ledger, triggered operations, commander planning, and UI adapters use empty history fallbacks.
- `paramilitary_sweep.ts` defaults absent `paramilitary_policy` to `ask`, creates `pending_paramilitary_requests` only when the player must decide, clears the queue after resolution, and initializes deployment counts when incrementing them.
- `player_decision_manifest.ts`, desktop IPC, and UI inbox code treat pending paramilitary requests as a queue that may legitimately be absent or empty.

## Decision

Do not promote these five fields generically in the strict-null cleanup lane.

`turn_summaries` and `operation_history` are persisted history buffers, but absence is a supported old/minimal-save state. `pending_paramilitary_requests` is a transient queue and should not be forced into every save. `paramilitary_policy` and `paramilitary_deployment_count` need a focused save-schema reconciliation because the current migration/default story does not match the declared top-level type.

Safe reduction requires a dedicated top-level save-contract lane:

1. Decide whether history buffers should be required empty arrays at save creation and migration.
2. Keep transient queues optional or move them into an explicit decision-queue contract.
3. Reconcile `paramilitary_policy` and `paramilitary_deployment_count` migration shapes with the declared `GameState` type.
4. Add save roundtrip, real-save migration, and UI adapter tests before changing requiredness.

## Verification

Fresh inventory command:

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
```

Current result still includes `GameState` with five optional fields, intentionally classified rather than reduced.

## Roadmap Impact

This burns down the small top-level `GameState` optional-field group by classification. It does not reduce the 477 optional-field floor. The follow-up is a save-contract/schema lane, not broad optional promotion.
