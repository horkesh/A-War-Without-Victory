# Victory Conditions (Scenario Harness)

## Scope

Victory conditions are optional scenario-level rules evaluated at end-of-run in the harness.

Implemented in:
- `src/scenario/scenario_types.ts`
- `src/scenario/scenario_loader.ts`
- `src/scenario/victory_conditions.ts`
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_end_report.ts`

## Scenario schema

```json
{
  "victory_conditions": {
    "by_faction": {
      "RBiH": {
        "min_controlled_settlements": 120,
        "max_exhaustion": 65,
        "required_settlements_all": ["S166499", "S155551"]
      },
      "RS": {
        "min_controlled_settlements": 180
      },
      "HRHB": {
        "max_exhaustion": 70
      }
    }
  }
}
```

## Evaluation logic

For each faction, all configured checks must pass:
- `min_controlled_settlements`: current controlled settlement count >= threshold.
- `max_exhaustion`: faction profile exhaustion <= threshold.
- `required_settlements_all`: faction controls every listed SID.

Outcome:
- one passing faction -> `winner`
- multiple passing factions -> `co_winners`
- none passing -> `no_winner`

## Outputs

When configured, victory evaluation is emitted to:
- `run_summary.json` (`victory` field),
- `end_report.md` (`Victory evaluation` section).

This feature is read-only reporting and does not alter turn mechanics.

