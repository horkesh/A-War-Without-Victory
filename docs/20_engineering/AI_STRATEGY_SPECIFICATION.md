# AI Strategy Specification (Phase A1)

## Purpose

Define deterministic smart-bot strategy profiles, benchmark targets, and difficulty behavior for scenario harness runs.

This spec covers:
- faction profiles (`RBiH`, `RS`, `HRHB`),
- deterministic tactical decision rules,
- difficulty presets (`easy`, `medium`, `hard`),
- benchmark targets used for evaluation and tuning.

## Determinism contract

- No `Math.random()` in simulation or bot logic.
- Bot decisions must use seeded RNG input only.
- Candidate sets (edges, formations) must be sorted before selection.
- Same scenario + seed + difficulty => identical bot decisions and artifacts.

## Faction strategy profiles

- `RBiH`
  - Early-war posture: defensive survival with selective probing.
  - Late-war posture: increased local offensives where pressure improves.
  - Priority SIDs: `S166499`, `S155551`, `S162973`.
  - Benchmarks:
    - Turn 26: hold core centers (`expected_control_share=0.20`, `tolerance=0.10`)
    - Turn 52: preserve survival corridors (`expected_control_share=0.25`, `tolerance=0.12`)

- `RS`
  - Early-war posture: aggressive expansion.
  - Late-war posture: consolidation-first.
  - Priority SIDs: `S200026`, `S216984`, `S200891`.
  - Benchmarks:
    - Turn 26: early territorial expansion (`expected_control_share=0.45`, `tolerance=0.15`)
    - Turn 52: consolidate gains (`expected_control_share=0.50`, `tolerance=0.15`)

- `HRHB`
  - Early-war posture: opportunistic offensives with retention of key lines.
  - Late-war posture: balanced hold/probe posture.
  - Priority SIDs: `S166090`, `S120880`, `S130486`.
  - Benchmarks:
    - Turn 26: secure Herzegovina core (`expected_control_share=0.15`, `tolerance=0.08`)
    - Turn 52: hold central Bosnia nodes (`expected_control_share=0.18`, `tolerance=0.10`)

## Difficulty presets

- `easy`
  - lower push share,
  - lower reassignment bias,
  - lower tactical churn.
- `medium`
  - baseline behavior for historical plausibility.
- `hard`
  - higher push share and reassignment bias,
  - faster adaptation to front pressure.

## Decision model (deterministic)

1. Build relevant edges (`side_a==faction || side_b==faction`) and sort by `edge_id`.
2. Score each edge by:
   - disadvantage under current front pressure,
   - objective SID bonus,
   - pressure magnitude.
3. Assign posture:
   - top-ranked edge subset => `push`,
   - mid-ranked with pressure/objective signal => `probe`,
   - remainder => `hold`.
4. Assign formations:
   - sorted active formations only,
   - deterministic target selection over ranked edge list,
   - movement decision uses seeded RNG only.

## Time-adaptive doctrine

Bots support optional `scenario_start_week` (weeks since Jan 1992) from scenario input.

- `global_week = scenario_start_week + state.meta.turn`
- Aggression tapers deterministically from early-war to late-war profile across weeks.
- Broad aggression is additionally moderated by:
  - **front length** (more edges -> lower broad push share),
  - **manpower pressure** (low active personnel + pool -> lower broad push share).
- Planned operations remain viable via `planned_ops_min_aggression` and objective-SID prioritization.

This allows behavior such as:
- **RS 1992:** broad aggressive expansion.
- **RS 1995:** lower broad aggression due to overextension/manpower pressure, but still able to run planned objective operations.

## Integration points

- `src/sim/bot/bot_strategy.ts`
- `src/sim/bot/bot_interface.ts`
- `src/sim/bot/simple_general_bot.ts`
- `src/sim/bot/bot_manager.ts`
- `src/scenario/scenario_types.ts` (`bot_difficulty`)
- `src/scenario/scenario_loader.ts`
- `src/scenario/scenario_runner.ts`

