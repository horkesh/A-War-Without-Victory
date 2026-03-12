## 6. Game Design & Mechanics

**Grade: B+**  
Design intent is clearly documented in Game Bible, Rulebook, and Systems Manual, and most core mechanics (control-only-via-attack, faction doctrines, exhaustion monotonicity, supply gating, displacement) are implemented and consistent with canon. Points off for Phase 3B being off by default (negative-sum coupling underused), unresolved design/realism tensions (ARBiH passivity, morale), and calibration gaps (RS over-capture, HVO passivity) that affect how strongly “negative-sum, constrained agency” is felt in play.

---

### What works well

1. **Territorial control only via attack or corps ops** — Game Bible §5.1, §7; Rulebook §4.3; Systems Manual §2.1. Political control is a stable substrate; control change happens only through attack resolution or corps/frontline operations. No passive pressure flip. Implemented and enforced in pipeline and invariants.

2. **Faction doctrines and temporal posture** — Rulebook §17 (doctrine and progression); Systems Manual §6.5, Appendix. RS has two doctrine phases (early 0–20w higher aggression/max_attack_share, late reduced); ARBiH standing order `general_defensive` with corps objective windows (e.g. defensive-only to w56, then counter/offensive); HRHB doctrine phases (e.g. Lasva). Driven by `getActiveDoctrinePhase`, `FACTION_DOCTRINE_PHASES`, and timeline `doctrine_phases`; army stance and corps stance flow into combat and bot directives.

3. **Exhaustion as irreversible strategic currency** — Game Bible §13; Rulebook §11; Systems Manual §7.2, §18. Exhaustion is monotonic, accrued from static fronts and supply pressure (`exhaustion.ts`), and (when enabled) from Phase 3B pressure→exhaustion coupling. Used for Washington Agreement, Operation Storm, and ceasefire gates. Command friction uses exhaustion. Aligns with “narrows options, drives negotiation.”

4. **Supply and reserves constraining operations** — Game Bible §12; Systems Manual §14. Supply state (adequate/strained/critical) and reserves (general + heavy munitions) gate combat power, bombardment, and bot behavior (critical→defend, strained→victory-only, corps strip offensives when critical_fraction > 0.5). Enclave/siege and patron aid are modeled. Supports “logistics central; interdiction erodes capacity.”

5. **Displacement and population as constraint** — Game Bible §10; Systems Manual §12. Per-OSID census, routing tables, takeover logic, sustained pool accounting. Displacement feeds exhaustion and humanitarian pressure; population is finite and exhaustible. Implementation matches design for depth and routing.

---

### What needs improvement

1. **Phase 3B (pressure→exhaustion) off by default** — Systems Manual §7.2 defines pressure→exhaustion as the negative-sum coupling; Phase 3B implements it but is feature-gated (`getEnablePhase3B()` default false). Exhaustion still grows from static fronts and supply pressure, but the documented “sustained pressure converts into irreversible exhaustion” path is inactive in normal runs. Either enable for canonical scenarios or document current exhaustion sources and Phase 3B as optional/future.

2. **ARBiH general_defensive through w56 vs historical counteroffensives** — Canon (Rulebook/Systems Manual; napkin “RBiH general_defensive through week 56”) is implemented: army stance and corps objective windows keep ARBiH defensive until w56. REAL_WAR_MASTER H6 argues 5th Corps (Bihać) and 2nd Corps (Tuzla) had notable counteroffensives and that at least 5th Corps should be `balanced`. Tension between “design: defensive through w56” and “realism: some corps more active.” Needs canon clarification or an explicit exception (e.g. 5th Corps balanced from w12).

3. **Morale: no victory boost and no zero-morale consequence** — Rulebook §11 and Systems Manual §4 define morale and retreat resistance; population affinity and encirclement drive drift. REAL_WAR_MASTER #5/#10: no morale increase from winning, and formations at morale 0 with full strength keep fighting. Design does not specify victory-based morale or consequences for sustained zero morale. Either add to canon (and implement) or explicitly defer and document.

4. **Graz Accords as blanket RS–HRHB truce** — Local truces (Vienna Declaration at w4) filter RS↔HRHB from offensive targets except Posavina/Jajce exceptions. REAL_WAR_MASTER #7: HVO was active in Posavina, Jajce, and Mostar; 11 attacks in 40 weeks is too low. Design may intend “sector-specific exceptions”; current implementation is broad truce with a fixed exception list. Clarify whether Graz is global-with-exceptions or should be region-specific (e.g. Herzegovina vs Posavina).

5. **Constrained agency visibility** — Command friction (exhaustion-based), supply gating, and posture/cohesion limits exist and bound player actions (Rulebook §14, §15). Whether the player “feels” constrained agency depends on UI exposure (e.g. effective vs intended posture, exhaustion and supply in command briefing). Design intent is present; consistency with player experience is a UX/feedback question.

---

### Interoperability

**(a) Bot behavior and calibration targets**  
Doctrine phases and standing orders drive bot aggression, corps stance, and target selection (`bot_strategy.ts`, `bot_corps_directives.ts`, `getActiveDoctrinePhase`). Calibration targets (territory deltas, outcome distribution, casualties) live in CALIBRATION_MASTER; REAL_WAR_MASTER flags outcomes that contradict design or history (e.g. 83% catastrophic → fixed n482; RS over-capture +104; HVO passivity; morale). Design flows into bot via timeline and doctrine; realism audit closes the loop by identifying where mechanics produce “gamey” or ahistorical results.

**(b) Player-facing UI and feedback**  
Rulebook §14.3 and §15 list war-phase tools (postures, sector stance, operations, supply decisions, OPSEC). Exhaustion, supply reserves, and command briefing are exposed in warroom and map (GameStateAdapter, turn events, SupplyPanel). Fog of war derives from sector intel. Design intent (constrained agency, no total control) flows into UI via state surfaces; full “feel” of constraint depends on how clearly exhaustion, friction, and supply consequences are presented.

**(c) Realism (REAL_WAR_MASTER / War-or-Game)**  
REAL_WAR_MASTER is the main realism ledger; War-or-Game skill owns it. Findings either drive code fixes (posture bug, deep-rear trapping, cold-front attrition) or surface design tensions (ARBiH too passive, morale, HVO Graz over-suppression). Design does not invent mechanics; when War-or-Game flags something, Game Designer evaluates whether canon needs a clarification or an exception, and whether the fix is calibration, mechanic change, or documented trade-off.

---

### Recommendations

1. **Resolve Phase 3B vs negative-sum design** — Decide whether canonical runs should enable Phase 3B (pressure→exhaustion). If yes, enable it for the main scenarios and note in CALIBRATION_MASTER. If no, update Systems Manual §7.2 (or add an implementation-note) to state that exhaustion is currently from static fronts and supply pressure only, and Phase 3B is optional/future. Prevents design/implementation drift on “negative-sum coupling.”

2. **Clarify ARBiH defensive posture vs historical counteroffensives** — With REAL_WAR H6 in mind, either (a) add a canon exception (e.g. 5th Corps may use `balanced` from w12) and implement in timeline/bot, or (b) document in Rulebook/Systems Manual that “general_defensive through w56” is the design baseline and that historical local counteroffensives are reflected in objective windows and min_outcome, not in army stance. Then align bot/objectives accordingly. Resolves canon vs realism tension without inventing mechanics.

3. **Define morale victory coupling and zero-morale consequence** — Add to Systems Manual §4 (or Rulebook §11): (a) whether morale may increase on victory (and how), and (b) whether sustained zero morale triggers refusal, dissolution, or desertion. Then either implement (e.g. in morale_drift / attack_resolution) or explicitly defer and document. Aligns sim with “exhaustion and morale shape outcomes” and addresses REAL_WAR #5/#10 from a design standpoint.
