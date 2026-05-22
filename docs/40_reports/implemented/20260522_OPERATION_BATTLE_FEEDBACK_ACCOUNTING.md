# Operation Battle Feedback Accounting - 2026-05-22

## Scope

This packet tightens sector-operation lifecycle accounting so unresolved attack posture is not treated as a resolved combat failure.

## Changes

- `resolveAttackOrdersOsid(...)` now resolves attack orders across live tactical front contacts from `state.military.war_front_edges_osid`, matching the bot and predictor tactical-adjacency boundary.
- Multi-axis operations now persist per-axis `battles_this_turn` and `total_battles` counters.
- `advanceSectorOffensives(...)` resets per-axis battle counters each turn.
- `updateSectorOffensiveResults(...)` counts failed direct-objective and intermediate attack attempts only when the operation or axis received actual battle feedback from the resolver. Attack posture without a resolved battle is classified as approach/movement-only progress, not as a max-failures combat attempt.

## Evidence

- Red/green unit coverage proves a live war-front contact outside the movement graph can resolve in `resolveAttackOrdersOsid(...)`.
- Red/green unit coverage proves attack posture beside an objective does not increment combat attempts or failures when no battle was resolved.
- Existing catastrophic-stall tests were updated to mark their synthetic history fixtures as battle-feedback fixtures via `battles_this_turn: 1`.

## 188w Proof

Fresh 188w run:

- Run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1943`
- Final hash: `5766d470125f1220`
- Oct 1995 painted area match: `71.6%`
- Donji Vakuf 95 now exits `no_logged_attempt` / `NO-OPENING-ATTACK` instead of fake max-failure delivery.
- Opportunity proof: `donji_vakuf_95` is still surfaced and approved at turn 177, but exits `did_not_launch` with `NO_OPENING_ATTACK:1`.
- Baseline regression manifest was refreshed for the expected 52w behavior-output drift, and a clean follow-up `npm.cmd run test:baselines` passed.

## Residual

This is not outcome tuning and does not claim Donji Vakuf delivery. The remaining Donji blocker is now narrower: the bot emits operation attack orders in weeks 180-184, but the resolver records zero battles. The next lane should trace the final attack-order targets against participant locations and tactical adjacency, then repair the order-target boundary before changing combat odds or painted targets.
