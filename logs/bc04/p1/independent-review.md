# BC04 P1 independent implementation review — 2026-09-07

**Verdict: GO for the bounded P1 candidate, pending the separately authorized campaign matrix.** No review finding remains in the three-file implementation scope.

The production diff at `data/scenarios/events/war_1993.json:1569-1580` replaces only the rejected municipality-majority predicate with the panel-approved, falsifiable perpetrators' basing-cell predicate: `territory_control(op:vitez:vitez_2, HRHB)`. It preserves `turn_min:54`, `turn_max:70`, War phase, `croat_bosniak_war_begins_1993`, `hvo_arbih_tensions_rising === true`, `once:true`, the cited sensitive-history narrative, +3 HRHB war crimes, and -25 HRHB international credibility. The diff contains no map, schema, evaluator, effect, P2, or ordering change.

`tests/event_timeline_integrity.test.ts:66-99` pins the exact ordered trigger, date window, prerequisite, tensions flag, absence of the victim-cell gate, once-only rule, effects and narrative. `tests/events_evaluate.test.ts:693-743` exercises the real loaded catalog and evaluator. Its positive fixture has HRHB only in `vitez_2` while the other two Vitez cells are RBiH; its negative fixture gives HRHB the two-cell municipal majority while RBiH holds `vitez_2`. This directly distinguishes the new predicate from the old one. It also proves the pre-window and missing-prerequisite blocks, applies both direct costs once, and proves the event cannot fire twice.

The retained RED evidence fails exactly three assertions under the old predicate: the exact timeline shape and both inverted basing-vs-majority evaluator cases (`logs/bc04/p1/focused-red.log`, exit 1). GREEN passes 63/63 (`focused-green.log`, exit 0). Scoped diff hygiene passes, and `war_1995.json` has no uncommitted P1 diff.

This verdict does not authorize P2, campaign execution, baseline changes, historical-date reinterpretation, a commit, or BC04 closure. The plan's owner-authorized clean P1 controlled/repeat/§6 evidence remains the acceptance gate.
