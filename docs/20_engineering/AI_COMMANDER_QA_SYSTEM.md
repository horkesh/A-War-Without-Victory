# AI Commander QA System

## Overview

Three AI agents play all faction army commanders in a 40-week scenario:

| Faction | Commander | Notes |
|---------|-----------|-------|
| RS | Mladic | VRS army commander throughout |
| RBiH | Halilovic -> Delic | ARBiH transition mid-war |
| HRHB | Petkovic | HVO army commander |

They make strategic decisions (corps stances, sector stances) and produce diagnostic observations about engine behavior. The system serves two purposes: (1) validate that the formula bot can execute human-plausible strategy, and (2) surface engine bugs, calibration issues, and design gaps via structured observations.

## Architecture

```
Per faction, per turn:
  1. Read game state (territory, corps health, supply, events)
  2. Generate army-level decisions (corps stances) -- reactive or API
  3. Optionally: corps-level API decisions (sector stances)
  4. Inject decisions as ai_army_decisions on GameState
  5. Formula bot respects AI overrides in generateCorpsStanceOrders()
  6. Diagnostic engine compares expectations vs reality
```

Decision injection happens via `ai_army_decisions[faction]` on GameState. The formula bot checks this before writing its own stance, so AI decisions take priority without replacing the bot pipeline.

## Modes

| Mode | Decision source | Cost | Deterministic |
|------|----------------|------|---------------|
| `cadet` | Pre-scripted strategies from JSON | Free | Yes |
| `reactive` | Heuristic decisions from game state per personality | Free | No |
| `api` | Claude API calls per turn | ~$0.45/run army-only, ~$1.21/run with corps | No |

- **Cadet** is the cheapest regression test: fixed strategies verify the injection pipeline works.
- **Reactive** uses commander personality traits (aggressiveness, competence) to derive stances from game state heuristics. No API calls.
- **API** sends the full game state context to Claude for each faction each turn. Army-only mode decides corps stances; army+corps mode also decides sector stances within each corps.

## npm Scripts

```bash
npm run sim:qa:commanders          # reactive mode (default QA)
npm run sim:qa:commanders:cadet    # cadet mode
npm run sim:qa:commanders:api      # API mode (requires ANTHROPIC_API_KEY in .env)
npm run sim:qa:diagnostics         # parse and summarize diagnostic report
```

## Files

| File | Purpose |
|------|---------|
| `tools/claude_plays_vrs/run_three_commanders.ts` | Main runner (all modes) |
| `tools/claude_plays_vrs/api_commander.ts` | Army-level API decision generation |
| `tools/claude_plays_vrs/api_corps_commander.ts` | Corps-level API decision generation |
| `tools/claude_plays_vrs/generate_co_assessments.ts` | CO cross-assessment generator |
| `tools/claude_plays_vrs/summarize_diagnostics.cjs` | Diagnostic parser and report summarizer |
| `tools/claude_plays_vrs/commanders/rs_mladic.json` | RS commander profile |
| `tools/claude_plays_vrs/commanders/rbih_halilovic.json` | RBiH commander profile |
| `tools/claude_plays_vrs/commanders/hrhb_petkovic.json` | HRHB commander profile |
| `tools/claude_plays_vrs/diagnose_no_ops.cjs` | Diagnostic: why no operations launched |

## Engine Integration Points

| Location | Integration |
|----------|-------------|
| `bot_corps_stance.ts` ~line 216 | Checks `ai_army_decisions[faction]` before writing stance |
| `bot_corps_directives.ts` | Stance-aware density gate, offensive cooldown, `status_reason`, `op_launch_trace` |
| `event_types.ts` | `EventCondition` type + `evaluateCondition()` |
| `game_state.ts` | `CorpsStatusReason` type, `status_reason` + `op_launch_trace` on `CorpsCommandState` |

The `status_reason` and `op_launch_trace` fields were added to make corps decision-making observable. Without them, the AI commanders could not distinguish "corps chose not to attack" from "corps was blocked by a gate."

## Diagnostic Observation Categories

| Category | Meaning | Example |
|----------|---------|---------|
| `bug` | Mechanical failure | 0 brigades assigned, broken state machine |
| `calibration` | Parameter mismatch | Force strength too high, morale drift wrong sign |
| `design_gap` | Missing capability | Cannot express a valid strategic intent |
| `historical_divergence` | Outcome contradicts record | Territory held that was historically lost |

Observations are structured (category, severity, description, turn, faction, corps) and collected across the full 40-week run, then clustered by theme in the diagnostic summary.

## Key Constants Changed

Constants modified as a result of AI commander observations:

| Constant | Old | New | File |
|----------|-----|-----|------|
| `STRAINED_DENSITY_THRESHOLD` | 0.167 (fixed) | 0.08/0.12/0.167 (by stance) | `bot_corps_directives.ts` |
| `SECONDARY_OP_COOLDOWN_TURNS_OFFENSIVE` | 8 (shared) | 3 | `bot_corps_directives.ts` |
| `ENTRENCHMENT_EFFECTIVE_CAP_TURNS` | uncapped | 26 | `combat_math.ts` |
| `DEFAULT_INIT_ALLIANCE` | 0.35 | 0.75 | `alliance_update.ts` |
| `PATRON_PRESSURE_COEFF` | 0.015 | 0.018 | `alliance_update.ts` |
| `war_earliest_turn` default | 26 | 40 | `alliance_update.ts` |

## Results (2026-03-17)

| Run | Area-Weighted | Observations | Bug | Calibration | Design Gap | Divergence |
|-----|--------------|-------------|-----|-------------|------------|------------|
| Formula bot baseline (n884) | 90.4% | -- | -- | -- | -- | -- |
| API army-only | 90.9% | 375 | 93* | -- | -- | -- |
| API army+corps | 91.0% | 321 | 0 | 191 | 22 | 108 |

*93 false bugs from territory prompt (fixed in subsequent run).

Top findings from AI commanders:
- Alliance decay too fast (patron pressure coefficient too low)
- ARBiH over-mobilized relative to historical
- Late-war stasis (entrenchment uncapped, making attacks pointless)
- Operations not producing visible combat (cooldown too long, density gate too strict)

## Self-Correction Loop

```
1. Run AI commanders -> collect observations
2. Cluster by theme -> identify engine fix
3. Implement fix -> re-run AI commanders
4. Compare observation counts -> verify improvement
5. Repeat until commanders stop complaining
```

The loop is manual (human reviews clusters and decides fixes), but the observation pipeline is automated. Each cycle typically addresses 1-3 themes and reduces total observations by 10-30%.
