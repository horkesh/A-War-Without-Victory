# Combat-fatigue owner RED contract

Question: does one real `resolveAttackOrdersOsid` defended battle apply the canonical +2 attacker / +1 primary-defender fatigue once, or do the inline resolver writers and `applyCombatFatigue` both charge it?

The self-contained fixture is derived from the maintained real-resolver fixture in `tests/attack_resolution_osid_intel_friction.test.ts`. It issues one ordinary brigade attack order and calls the production resolver once. It starts both fatigue values at zero and expects exactly 2 and 1 after the recorded battle.

Canon: `docs/10_canon/Systems_Manual_v0_9_0.md:1109` and `docs/10_canon/context.md:301` specify +2 per attacker / +1 per defender battle, cap 30. History: inline defended/undefended attacker fatigue predates the extracted helper; `applyCombatFatigue` describes itself as an exact reproduction of a formerly-inline block, while the current resolver invokes both.

One preserved focused invocation only, 60-second cap, no retry. Pass criterion for diagnosis is a focused assertion failure showing actual attacker 4 and defender 2, with the battle itself processed. Any fixture/startup/timeout/other failure stops without implementation. Undefended inline +0.5 is outside this defended reproduction and remains explicitly preserved in any proposed correction.
