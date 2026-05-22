# Strict-Null Derived Optional Fields Classification

**Date:** 2026-05-22
**Scope:** Classification of the 8 `derived` optional `GameState` fields reported by `tools/diagnostics/strict_null_inventory.cjs --field-domains`.

## Current Floor

The optional `GameState` contract floor remains:

| Domain | Count |
|---|---:|
| `derived` | 8 |
| `sim` | 296 |
| `state` | 173 |
| `scenario` | 0 |
| `ipc` | 0 |
| `ui_adapter` | 0 |
| `unknown` | 0 |
| **Total** | **477** |

## Classification

| Field | Class | Decision |
|---|---|---|
| `EndgameSnapshot.verdict` | save-shape risk | Keep optional. `freezeEndgameSnapshot(...)` writes best-effort derived verdict data, but older saves and derive-time exceptions may omit it. |
| `EndgameSnapshot.cost_ledger` | save-shape risk | Keep optional. The cost ledger is frozen best-effort and downstream adapters already handle absence by recomputing or degrading. |
| `EndgameSnapshot.historical_comparison` | save-shape risk | Keep optional. It depends on cost-ledger derivation and historical-baseline comparison; absence is expected for partial snapshots. |
| `EndStateSnapshot.exhaustion_totals` | save-shape risk | Candidate for a future migration/defaulting slice only. The current builder writes it, but older frozen snapshots may not. |
| `EndStateSnapshot.negotiation_spend` | save-shape risk | Keep optional unless a migration decides whether absent means no ledger or old snapshot. |
| `EndStateSnapshot.competences` | save-shape risk | Keep optional. Empty/absent currently has semantic weight for pre-competence snapshots. |
| `EffectivePostureExposureState.global_factor` | runtime optional diagnostic | Keep optional. It is present only when a global posture-cap factor applies to that edge exposure row. |
| `LossOfControlTrendExposureState.previous_turn_snapshot` | runtime optional diagnostic | Keep optional. First exposure turn has no previous-turn baseline by construction. |

## Decision

No source fields should be promoted to required from this derived group in a count-reduction pass. The only plausible future implementation candidate is an explicit migration/defaulting lane for `EndStateSnapshot.exhaustion_totals`, and that requires save-fixture proof before changing the type.

## Verification

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-domains
```

The command reports `derived: 8`, `unknown: 0`, and total optional fields `477`.
