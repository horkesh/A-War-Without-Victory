# ADR-0007: Standing OG Defensive Model — reserve commitment and contribution truth

## Status

**Accepted 2026-06-07 (owner-authorized).** Live doctrine wording converged with shipped behavior on 2026-07-31. The superseded experiment and its probe trail are quarantined in the historical-record section below and have no live behavior or roadmap authority.

ADR-0006 owns the entity decision: corps sectors implement standing Operational Groups. This ADR owns the narrower defensive behavior contract. It does not change combat behavior, schema, calibration, or the baseline of record.

## Context

ADR-0005 defines temporary, donor-backed Tactical Groups for offensive operations. ADR-0006 defines a corps sector as the standing Operational Group used to organize the defensive front. Earlier wording blurred three different things: assignment membership, eligibility for a reserve move, and actual participation in one resolved battle. That blur implied effects the engine does not apply.

The governing distinction is now explicit:

1. sector membership is spatial assignment;
2. reserve commitment is a bounded movement decision;
3. combat participation is whatever the resolver actually records for that battle; and
4. post-battle defender aftermath remains primarily attached to the primary defender.

## Decision — live standing-OG defensive model

A corps sector is the **standing-OG spatial assignment entity**. It groups a corps front, sub-segments, and formation assignments for command and defensive calculations. It has **no political-control meaning** and does not itself own territory; political control remains OSID state.

### Bounded reserve commitment

Live ADR-0007 Phase B commits **at most one eligible reserve or rear formation per threatened-sector distribution pass**. An **active-operation** participant, a **disrupted** formation, a formation **in transit**, or a formation with an **existing movement order** is ineligible. The selected formation moves toward the threatened front; selection does not add every reserve or rear member to a battle roster.

### Actual contribution, not membership

Standing-OG **membership alone does not make a formation a reactive defender**. **Actual combat-resolver contributors** share only the immediate casualties and fatigue already assigned to them by the combat path. **Defender casualties are weighted across those contributors**, and any **contributor-specific immediate fatigue remains on its named recipient**.

The separate **post-battle defender-fatigue write and downstream aftermath remain primarily on the primary defender**. That includes the current primary-defender ownership of defender fatigue, cohesion/entrenchment aftermath, morale/disruption consequences, equipment-loss follow-up, and other resolver aftermath unless a specific production path names another recipient. Sector membership cannot widen that recipient set by implication.

## Historical grounding and model boundary

The depletable-depth idea remains historically grounded without turning every standing-OG member into a battle participant. *Balkan Battlegrounds* describes the VRS “Vlasić” Operational Group with the 1st Kneževo Light Infantry Brigade deployed behind the 22nd Brigade and later notes that the OG's reserves were nearly exhausted while the line barely held (BB2 pp. 510, 512). That evidence supports bounded second-echelon commitment. It does not prescribe a particular casualty/fatigue algorithm or a political-control layer.

Encirclement and reachability remain authoritative. A formation that cannot legally reach or contribute to the threatened OSID receives no participation effect merely because it shares a sector. Active offensive-operation assignments also take precedence over reserve commitment.

## Consequences

- The sector/standing-OG reconciliation remains a naming and spatial-assignment decision, not a new ownership system.
- Phase B remains live and depletable, but its one-formation commitment and eligibility exclusions are explicit.
- Battle reports and casualty distribution may name multiple actual defender contributors without turning the sector's full membership list into participants.
- Primary-defender aftermath remains the live behavior contract. A future widened aftermath model requires an explicit ADR, tests, calibration proof, and baseline decision.
- No runtime, schema, save, scenario, package, or release state changes follow from this wording convergence.

## Determinism and verification

This doctrine convergence is behavior-neutral. Contract tests pin the four governing documents, reject retired identifiers and claims from live text, and scan production TypeScript for deleted identifiers. Existing standing-OG defense, brigade distribution, distance-weighted defense, casualty distribution, and post-battle aftermath tests remain the behavioral proof.

## Retired Phase C — historical record

Everything in this section is **historical evidence only**. Phase C was **retired and deleted** on 2026-06-08 by owner decision after the unanimous Pyrrhic review. None of the names, proposed rules, probe results, or roadmap gates below describe live behavior.

The retired draft was titled around **shared-attrition combat** and described **shared sector-defense attrition**. It proposed widening defense to the standing OG's **whole reachable roster**, distributing defender fatigue beyond the primary defender, capping non-primary casualties, and using a **predictor/resolver split** for the reactive-defense cap. Flag-on probes produced a Guardrail-1 wrong-sign result of roughly a 2% aggregate war-cost reduction, so the experiment weakened the negative-sum design instead of proving it.

The retired implementation identifiers were deleted rather than parked:

- `ENABLE_SHARED_SECTOR_DEFENSE`
- `SHARED_NON_PRIMARY_DEFENDER_CASUALTY_CAP_FRACTION`
- `SHARED_SECTOR_REACTIVE_DEFENSE_RATIO`
- `getSectorReactiveDefensePredictionRatio`
- `getSectorReactiveDefenseResolutionRatio`
- `detectStandingOgSoloDefenderHotspots`

The deletion also removed experiment-only branches from attack resolution, the predictor, operation preparation and launch feasibility, resource aftermath, and casualty-distribution plumbing. The pre-existing distance-weighted defense path, `DefenderContribution` battle-report records, and weighted casualties among contributors selected by the live resolver were retained.

### Probe trail retained for audit

- Temporary combined probes `n33`, `n38`, and `n39` improved formation-health symptoms but did not prove the war-cost or battle-throughput gate. `n38` recorded 165 orders, 125 battles, 84 defender-present battles, 23,607 attacker casualties, and 25,187 defender casualties; the then-current default path remained stronger on battle volume and defender-present battles.
- The isolated experiment probe `n37` improved over earlier probes after the reactive-cap split but still remained below the default-path proof threshold.
- Later default-path operation-delivery and sector-reconciliation repairs were independently accepted. Default-off 188-week run `n87` (`82af4ca1d89dd3c4`) passed consistency and sector-coverage checks; that evidence did not revive the deleted experiment.
- Retirement deletion was byte-identical to the then-current floor in the recorded 40-week (`235c61f408dc3d95`) and 188-week (`89ef697dfb27c989`) checks because the retired flag had remained default-off.

### Historical sources and implementation references

- *Balkan Battlegrounds*, Vol. II, pp. 510–512 — the “Vlasić” Operational Group, its rear-deployed brigade, and exhaustion of its reserves.
- ADR-0005 — temporary offensive Tactical Groups.
- ADR-0006 — corps sectors as standing Operational Groups.
- `src/sim/combat/brigade_front_distribution.ts` — live bounded reserve commitment and eligibility.
- `src/sim/combat/attack_resolution_osid.ts` and `attack_casualty_distribution.ts` — actual defender contributors and weighted casualties.
- `src/sim/combat/attack_resource_aftermath.ts` and `attack_post_battle_effects.ts` — primary-defender fatigue and downstream aftermath.
