# Force Quality Trajectory Evidence Audit

**Date:** 2026-05-01
**Status:** Evidence audit complete; Codex-reviewed and accepted as a docs/diagnostic packet.
**Scope:** Read-only consumer trace, unit-mismatch verification, date-window metrics extraction, owner classification, and four targeted cross-checks for the open force-quality calibration lane.
**Non-scope:** No engine code, simulation data, scenario, OOB, painted-target, or operation-definition edits. No tuning.
**Related issue:** `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`
**Related research:** `docs/research/2026-05-01-force-quality-trajectory-research-and-proposals.md`
**Related architecture contract:** `docs/plans/2026-05-01-force-quality-operation-architecture-contract.md`
**Diagnostic script (permanent artifact):** `tools/diagnostics/force_quality_audit_metrics.cjs`

---

## 1. Executive Verdict

(a) The suspected officer-learning unit-mismatch bug is **CONFIRMED**. `officer_quality_update.ts:124` reads `learning_rate` from the timeline JSON as a multiplier on `COMBAT_GROWTH_BASE = 0.01`, but `data/scenarios/timelines/apr1992.json` supplies values like `RBiH=0.015`, `RS=0.007`, `HRHB=0.010` that match the *absolute-rate* shape of the base, not the multiplier shape (`1.5`, `0.7`, `1.0` fallback at `officer_quality_update.ts:46-49`). When the timeline is loaded, effective per-turn growth is suppressed by exactly `100×` for ARBiH (`0.01 * 0.015 = 0.00015` instead of `0.01 * 1.5 = 0.015`).

(b) `faction_officer_maturity` and per-faction `capability_profile` are **decorative in war phase**. `faction_officer_maturity` is written by `officer_experience.ts:184` and never read by any war-phase combat, operation, commander, or readiness path. `capability_profile` is read only by `early_war/control_flip.ts:561,564` and `early_war/washington_agreement.ts:209-211` — both early-war owners — plus a player-display path in `ui/warroom/components/DiplomacyModal.ts:281`.

(c) Operation readiness does not consume the doctrinal arc. `operation_preparation.ts`, `sector_offensive.ts`, `army_hq_gathering.ts`, `bot_corps_directives.ts`, and the `commander/` tree contain zero references to `officer_quality`, `capability_profile`, or `faction_officer_maturity`.

(d) One calendar-driven railroad confirmed: VRS brain drain via `VRS_BRAIN_DRAIN_START_WEEK = 40` and `VRS_BRAIN_DRAIN_RATE = 0.001` (`officer_quality_update.ts:39-42`), applied unconditionally to every active RS brigade after week 40 (`officer_quality_update.ts:134-136`).

(e) Observed metrics confirm the design failure: ARBiH never produces a multi-axis op (`axes>=2`) in any window, captures collapse to 0 in the 156-188w window across all 188w runs, and the VRS officer-quality curve at 156-188w (`mean ~0.26`) is depressed by the brain drain railroad rather than degraded by mechanics.

**Recommended next packet:** the cross-cutting **scenario-config harmonization** (gap #12 — three sibling scenarios diverge on whether `war_timeline` is applied at all), then **P0 officer learning_rate units fix in isolation** with hash-baseline preserved before any tuning.

---

## 2. Methodology

This audit aggregated four investigation tracks plus four cross-checks, all read-only with respect to source/data:

| Track | Output |
|---|---|
| T1.A — Live-consumer trace | Map writers/readers of officer_quality, faction_officer_maturity, capability_profile, war_exhaustion in `src/sim/`, `src/state/`, `src/ui/`. |
| T1.B — Officer learning_rate units | Verify whether `officer_config.learning_rate` is multiplier-shaped or absolute-shaped, and quantify the suppression factor. |
| T1.C — Date-window metrics | Run `tools/diagnostics/force_quality_audit_metrics.cjs` against latest 40w/104w/156w/183w/188w final saves; tabulate officer quality, equipment, capability profile, and operations-by-window. |
| T2.A — Owner classification | Classify each gap as formula-unit / decorative / commander / operation-readiness / combat / equipment / morale / reporting; surface railroads; flag determinism risks. |
| CC1 | Diff `officer_config` and `war_timeline` references across the three sibling apr1992_definitive scenario files. |
| CC2 | Confirm zero war-phase consumers of `faction_officer_maturity`. |
| CC3 | Confirm zero war-phase consumers of `capability_profile` (excluding early_war and ui). |
| CC4 | Enumerate tests that pin officer_quality / learning_rate numerics for the determinism-auditor handoff. |

**Hash-determinism baselines preserved during audit (no code edits):**

| Window | Run dir | Final state hash |
|---|---|---|
| 40w | `apr1992_definitive_40w__f9f143f4221f767c__w40_n941` | `bd0d3a9c5c0c6b3e` |
| 104w | `apr1992_definitive_104w__3e41e64e390a2768__w104_n1594` | `6b6daa39dcaf66f7` |
| 156w | `apr1992_definitive_188w__38158c1babaf1590__w156_n1595` | `57f742a558d8e619` |
| 183w | `apr1992_definitive_188w__e51a693239cc130c__w183_n1596` | `dd2d560c3e68a443` |
| 188w | `apr1992_definitive_188w__210e69404d054959__w188_n1587` | `09fc9beb9f0004c3` |

Source for these tables: `tools/diagnostics/_force_quality_run_output.md` (committed read-only artifact).

---

## 3. Live-Consumer Trace Summary (T1.A)

| Subject | Live consumers (war phase) | Decorative consumers | Early-war-only | Dead | Verdict |
|---|---|---|---|---|---|
| `formation.officer_quality` | `combat_math.ts:458,544` (`getBrigadeOfficerMod`, `getThreeTierOfficerMod`); `attack_post_battle_effects.ts:62-66`; `brigade_reconstitution.ts:357`; `officer_quality_update.ts` self | `ui/map/components/FormationDetail.tsx:329-334`, `ui/map/utils/combatEffectiveness.ts:72`, `ui/map/components/army_hq/OrbatSection.tsx:59` | — | — | LIVE |
| `state.military.faction_officer_maturity` | (none) | — | — | Schema: `game_state.ts:1875`. Writer: `officer_experience.ts:181-184`. | DECORATIVE — never read |
| `faction.capability_profile` | (none in war phase) | `ui/warroom/components/DiplomacyModal.ts:281` (HRHB own-faction; documented exception) | `early_war/control_flip.ts:561,564`; `early_war/washington_agreement.ts:209-211` | — | DECORATIVE in war phase |
| `getFactionCapabilityModifier` | (none in war phase) | — | `early_war/control_flip.ts:561,564` only | — | EARLY-WAR-ONLY |
| Named-officer competence (`named_officer_data[*].competence`) | `combat_math.ts:495-538` (corps/army/operation commander modifier in `getThreeTierOfficerMod`) | — | — | — | LIVE |
| `state.political.war_exhaustion` (combat) | `combat_math.ts:1126` (`getWarExhaustionTempoMult`, attacker-only [0.85, 1.0] mult); `command_friction.ts:36` | UI: `warroom/data/war_data_extractor.ts:588`, `warroom/data/warroom_state.ts:103`, `warroom/data/turn_event_generator.ts:362-367` | `early_war/bilateral_ceasefire.ts:75,79`; `early_war/washington_agreement.ts:142-143`; `combat/operation_storm.ts:61-62` | — | LIVE but uniform across factions |
| Cohesion (`formation.morale`/`cohesion`) | combat resolution + commander tier classification (`force_eval.ts`) | — | — | — | LIVE |
| Equipment composition (`composition.tanks`/`artillery`/`tank_condition`/`artillery_condition`) | combat resolution | — | — | — | LIVE; modest faction trickles via `faction_progression.ts` |
| Operation readiness (`computeCorpsOperationReadiness` or equivalent) | (no readiness function consumes the doctrinal arc) | — | — | — | DEAD wiring — see contract doc |

**Bottom line:** the only live force-quality signals in war phase are per-brigade `officer_quality` and named-officer competence. Both feed combat power directly. The two seams the design needs for late-war professionalization (`capability_profile`, `faction_officer_maturity`) are written every turn and never read in combat, operation generation, commander stance derivation, or readiness gating.

---

## 4. Officer learning_rate Units Finding (T1.B) — **P0**

**Verdict: CONFIRMED unit-mismatch bug. Effective per-turn officer growth in scenarios that load `apr1992` timeline is suppressed by exactly `1/COMBAT_GROWTH_BASE = 100×` for ARBiH and HRHB, and by `~100×` for RS, relative to the hardcoded fallback path used when the timeline is absent.**

**Code site (one chokepoint):** `src/sim/combat/officer_quality_update.ts:108`
```
const learningRate = timelineConfig?.learning_rate ?? (FACTION_LEARNING_RATE[faction] ?? 1.0);
```
Both branches feed the same expression at `officer_quality_update.ts:124,127`:
```
const growth = COMBAT_GROWTH_BASE * learningRate * (1.0 - quality * 0.5);
```
where `COMBAT_GROWTH_BASE = 0.01` and `FRONTLINE_GROWTH_BASE = 0.005` (`officer_quality_update.ts:24,27`).

**Hardcoded fallback (multiplier-shaped):** `officer_quality_update.ts:46-49`
```
RBiH: 1.5, RS: 0.7, HRHB: 1.0
```

**Timeline JSON (absolute-shaped):** `data/scenarios/timelines/apr1992.json:386-411`
```
RS.learning_rate    = 0.007
RBiH.learning_rate  = 0.015
HRHB.learning_rate  = 0.010
```

**Effective combat-growth-per-turn at quality = 0.30 (factor `(1.0 - 0.30*0.5) = 0.85`):**

| Faction | Fallback (multiplier) used | Timeline (treated as multiplier) used | Suppression |
|---|---:|---:|---:|
| RBiH | 0.01 × 1.5 × 0.85 = 0.01275 | 0.01 × 0.015 × 0.85 = 0.0001275 | **100×** |
| RS | 0.01 × 0.7 × 0.85 = 0.00595 | 0.01 × 0.007 × 0.85 = 0.0000595 | **100×** |
| HRHB | 0.01 × 1.0 × 0.85 = 0.0085 | 0.01 × 0.010 × 0.85 = 0.0000850 | **100×** |

**Effective combat-growth-per-turn (frontline, quality = 0.30):**

| Faction | Fallback path | Timeline path | Suppression |
|---|---:|---:|---:|
| RBiH | 0.005 × 1.5 × 0.85 = 0.006375 | 0.005 × 0.015 × 0.85 = 0.00006375 | 100× |
| RS | 0.005 × 0.7 × 0.85 = 0.002975 | 0.005 × 0.007 × 0.85 = 0.00002975 | 100× |
| HRHB | 0.005 × 1.0 × 0.85 = 0.00425 | 0.005 × 0.010 × 0.85 = 0.0000425 | 100× |

The `1/100` ratio is the same `1/COMBAT_GROWTH_BASE` ratio that the timeline values would have if they were authored as **absolute per-turn growth rates** (i.e. expecting the formula `growth = learning_rate * (1.0 - quality * 0.5)` rather than `growth = COMBAT_GROWTH_BASE * learning_rate * ...`).

**Cross-validation from observed runs.** This is empirically confirmed by the cross-scenario anomaly in §6: 104w runs (which lack `war_timeline`, see CC1) hit RBiH mean officer quality `0.601` and RS `0.657`, while 156w/183w/188w runs (which load the timeline) bottom out at RBiH mean `0.083-0.092` and RS `0.261-0.275`. The 100× suppression turns the 104w "matures normally" path into the 188w "barely grows at all" path.

**Three minimal fix shapes (DO NOT IMPLEMENT IN THIS PACKET).**

| Shape | One-liner |
|---|---|
| **A. Treat timeline value as absolute rate.** | Drop `COMBAT_GROWTH_BASE *` from the timeline branch only — keep the fallback path multiplying the `1.5/0.7/1.0` numbers; commit determinism-auditor sign-off because all current 104w/183w/188w hashes will move. |
| **B. Rewrite JSON to multiplier shape.** | Keep code identical; rewrite `apr1992.json` learning_rate values to multiplier shape (`1.5/0.7/1.0`), explicitly marking units in JSON schema. Same hash impact. |
| **C. Split the field name.** | Introduce `learning_rate_abs` and `learning_rate_mult` in the timeline schema, deprecate the ambiguous `learning_rate`, fail fast if both are present. Adds schema work but eliminates future trap. |

Recommendation flagged in the contract doc and §11: ship a single shape, alone, with hash baselines refreshed deliberately, before any tuning packet.

---

## 5. Date-Window Metrics (T1.C)

Run inventory used for this audit (single long-run scenario, several waypoints):

| Run | Weeks | Hash | Source scenario |
|---|---:|---|---|
| `apr1992_definitive_40w__f9f143f4221f767c__w40_n941` | 40 | `bd0d3a9c5c0c6b3e` | `apr1992_definitive_40w.json` |
| `apr1992_definitive_104w__3e41e64e390a2768__w104_n1594` | 104 | `6b6daa39dcaf66f7` | `apr1992_definitive_104w.json` |
| `apr1992_definitive_188w__38158c1babaf1590__w156_n1595` | 156 | `57f742a558d8e619` | `apr1992_definitive_188w.json` |
| `apr1992_definitive_188w__e51a693239cc130c__w183_n1596` | 183 | `dd2d560c3e68a443` | `apr1992_definitive_188w.json` |
| `apr1992_definitive_188w__210e69404d054959__w188_n1587` | 188 | `09fc9beb9f0004c3` | `apr1992_definitive_188w.json` |

### 5.1 Officer quality (faction means/medians)

| Window | RBiH mean | RBiH median | RS mean | RS median | HRHB mean | HRHB median |
|---|---:|---:|---:|---:|---:|---:|
| 40w | 0.080 | 0.058 | 0.451 | 0.549 | 0.197 | 0.225 |
| 104w | 0.601 | 0.661 | 0.657 | 0.719 | 0.458 | 0.496 |
| 156w | 0.083 | 0.061 | 0.275 | 0.337 | 0.211 | 0.230 |
| 183w | 0.092 | 0.063 | 0.263 | 0.325 | 0.212 | 0.231 |
| 188w | 0.092 | 0.063 | 0.261 | 0.320 | 0.212 | 0.232 |

**Cross-scenario consistency anomaly:** the 104w run shows fundamentally different officer-quality dynamics than the 156w/183w/188w runs. This anomaly is fully explained by CC1 below: the 104w scenario file does not bind `war_timeline` and therefore consumes the multiplier-shaped fallback, while the 188w scenario file binds `war_timeline: "apr1992"` and consumes the suppressed timeline path. **There is no run in the audit corpus that uses the timeline path beyond turn 40 with the fallback baseline; that comparison requires an additional planned run after the units fix.**

### 5.2 faction_officer_maturity

| Window | RBiH | RS | HRHB |
|---|---:|---:|---:|
| 40w | 3.444 | 3.533 | 3.125 |
| 104w | n/a | n/a | n/a |
| 156w | 4.200 | 3.400 | 3.250 |
| 183w | 4.200 | 3.455 | 3.250 |
| 188w | 4.200 | 3.400 | 3.250 |

The 104w `n/a` row reflects either an `init_officers` omission or a serialization gap (see CC1 — 104w lacks `init_officers: "apr1992"`). The 156w-188w rows confirm RBiH > RS in faction_officer_maturity by w156, but no system reads this signal — see §3.

### 5.3 capability_profile (war-phase decorative; year/training/org/eq)

| Window | Faction | Year | Training | Org | Equipment | Doctrine summary |
|---|---|---:|---:|---:|---:|---|
| 40w | RBiH | 1992 | 0.350 | 0.250 | 0.150 | ATTACK=0.500 DEFEND=0.600 INFILTRATE=0.600 |
| 40w | RS | 1992 | 0.800 | 0.850 | 0.900 | ARTILLERY_COUNTER=1.000 ATTACK=0.900 STATIC_DEFENSE=0.950 |
| 40w | HRHB | 1992 | 0.500 | 0.450 | 0.600 | ATTACK=0.650 DEFEND=0.700 |
| 104w | RBiH | 1994 | 0.750 | 0.700 | 0.400 | ATTACK=0.800 DEFEND=0.850 INFILTRATE=0.850 |
| 104w | RS | 1994 | 0.700 | 0.750 | 0.600 | ARTILLERY_COUNTER=0.750 ATTACK=0.650 STATIC_DEFENSE=0.800 |
| 104w | HRHB | 1994 | 0.500 | 0.450 | 0.500 | ATTACK=0.550 DEFEND=0.700 |
| 156w | RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900 DEFEND=0.900 INFILTRATE=0.900 |
| 156w | RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650 ATTACK=0.550 STATIC_DEFENSE=0.750 |
| 156w | HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800 COORDINATED_STRIKE=0.900 DEFEND=0.850 |
| 183w | RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900 DEFEND=0.900 INFILTRATE=0.900 |
| 183w | RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650 ATTACK=0.550 STATIC_DEFENSE=0.750 |
| 183w | HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800 COORDINATED_STRIKE=0.900 DEFEND=0.850 |
| 188w | RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900 DEFEND=0.900 INFILTRATE=0.900 |
| 188w | RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650 ATTACK=0.550 STATIC_DEFENSE=0.750 |
| 188w | HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800 COORDINATED_STRIKE=0.900 DEFEND=0.850 |

The desired curves are encoded correctly in `state/capability_progression.ts` and update on schedule (RBiH 0.350→0.850 training, RS 0.800→0.650 training, HRHB 0.500→0.750 training across 1992→1995). They have **zero** war-phase effect — see §3 (CC3).

### 5.4 Equipment totals & condition (faction)

| Window | Fac | Brigades | Inf | Tanks | Art | AAA | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 40w | RBiH | 125 | 98000 | 20 | 142 | 6 | 11 | 8 | 1 | 142 | 0 | 0 |
| 40w | RS | 81 | 64800 | 562 | 1343 | 202 | 294 | 222 | 45 | 1263 | 80 | 0 |
| 40w | HRHB | 29 | 23350 | 10 | 53 | 3 | 6 | 4 | 1 | 51 | 3 | 0 |
| 104w | RBiH | 118 | 92500 | 56 | 233 | 7 | 4 | 47 | 5 | 197 | 38 | 0 |
| 104w | RS | 83 | 66400 | 247 | 1076 | 185 | 2 | 205 | 40 | 658 | 382 | 36 |
| 104w | HRHB | 40 | 36200 | 144 | 199 | 22 | 90 | 45 | 9 | 182 | 15 | 2 |
| 156w | RBiH | 122 | 95750 | 100 | 264 | 9 | 2 | 98 | 1 | 235 | 38 | 0 |
| 156w | RS | 83 | 66400 | 186 | 544 | 136 | 1 | 163 | 21 | 62 | 423 | 59 |
| 156w | HRHB | 40 | 36200 | 125 | 207 | 21 | 50 | 66 | 9 | 195 | 10 | 2 |
| 183w | RBiH | 124 | 97350 | 100 | 287 | 9 | 1 | 99 | 0 | 261 | 36 | 0 |
| 183w | RS | 83 | 66400 | 179 | 452 | 124 | 1 | 161 | 16 | 23 | 386 | 43 |
| 183w | HRHB | 40 | 36200 | 103 | 214 | 21 | 32 | 63 | 8 | 202 | 10 | 2 |
| 188w | RBiH | 124 | 97350 | 100 | 294 | 9 | 1 | 99 | 0 | 268 | 35 | 0 |
| 188w | RS | 83 | 66400 | 179 | 446 | 124 | 1 | 162 | 15 | 19 | 387 | 41 |
| 188w | HRHB | 40 | 36200 | 103 | 215 | 21 | 32 | 64 | 8 | 203 | 10 | 2 |

RBiH equipment grows modestly (20→100 tanks, 142→294 art) but operational tank count collapses to ~1 by 156w. RS art_op falls catastrophically (1263→19) while art_deg stays large. HRHB tank_op holds at ~30-90. None of this conditioning influences operation acceptance — see §3.

### 5.5 Operations by faction × date window (counts/captures/multi-axis)

(Source: 188w n1587 final state, the longest run; 104w shown for the alternate scenario.)

| Window | Faction | ops | attempts | captures | success | move_only | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 2 | 3 | 0 | 0 | 0 | 1 | 1 | 0 | 5 | 1 |
| 0-40w | RS | 12 | 28 | 27 | 3 | 4 | 10 | 7 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 1 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 3 | 3 | 1 | 0 | 1 | 2 | 0 | 0 | 3 | 1 |
| 40-104w | RS | 6 | 2 | 0 | 0 | 4 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

ARBiH never reaches `axes≥2` in any window. 104-156w and 156-188w drop to zero ops across all factions — independent of the painted-target / scripted-op packet evidence already noted in `20260501_LATE_1995_SCRIPTED_OPS_PACKET.md`. **Unobtainable metrics** (require future instrumentation): per-corps multi-axis attempts, "support threshold" decisions, opportunity-score components, opportunity vs capture correlation.

---

## 6. Cross-Check Results

### CC1 — Scenario-config drift on `officer_config` / `war_timeline`

The three sibling scenarios diverge on whether they bind the timeline at all:

| File | `war_timeline` field | `init_officers` field | `officer_config` block? |
|---|---|---|---|
| `data/scenarios/apr1992_definitive_40w.json` | `"apr1992"` | `"apr1992"` | inherited via timeline |
| `data/scenarios/apr1992_definitive_104w.json` | **absent** | **absent** | **none — falls back to hardcoded multipliers** |
| `data/scenarios/apr1992_definitive_188w.json` | `"apr1992"` | `"apr1992"` | inherited via timeline |
| `data/scenarios/apr1992_definitive_52w.json` | absent | (not surveyed) | none |
| `data/scenarios/apr1992_definitive_56w.json` | absent | (not surveyed) | none |

The shared timeline file at `data/scenarios/timelines/apr1992.json:386-411` is the only `officer_config` block in the scenario tree (Grep confirmed: `data\scenarios\timelines\apr1992.json` is the unique match in `data/scenarios/`).

**Implication:** the 104w officer-quality numbers in §5.1 (`RBiH=0.601`, `RS=0.657`, `HRHB=0.458`) are produced by the multiplier-shaped fallback path because the scenario silently does not bind a timeline. The 40w and 188w scenarios both bind the timeline and consume the suppressed values. **The cross-cutting fix is to harmonize all sibling scenarios on the timeline binding** before any P0 / P1 tuning, otherwise any baseline-hash refresh after the units fix will only land on two-thirds of the runs.

This corroborates the gap-finder's gap #12 (scenario-config drift) and adds the concrete observation that 104w lacks both `war_timeline` and `init_officers`.

### CC2 — `faction_officer_maturity` consumers

Grep over `src/sim/combat/`, `src/sim/turn_phases/`, `src/sim/operations/` (does not exist as directory; covered via combat tree), and `src/sim/commander/` (lives at `src/sim/combat/commander/`; covered) plus `src/state/`:

| Citation | Classification |
|---|---|
| `src/state/game_state.ts:1875` | schema |
| `src/sim/combat/officer_experience.ts:180-184` | writer (`updateFactionOfficerMaturity`) |
| `tests/officer_experience.test.ts:171-178` | test |

**Zero readers.** Confirmed decorative in war phase. The contract doc's expected consumers (operation_readiness / multi_axis_limit / capture_delivery) are aspirational.

### CC3 — `capability_profile` consumers (excluding `early_war/control_flip.ts`, `early_war/washington_agreement.ts`, and `src/ui/**`)

| Citation | Classification |
|---|---|
| `src/state/game_state.ts:920` | schema |
| `src/state/capability_progression.ts:145` | writer (`updateCapabilityProfiles`) |
| `src/state/capability_progression.ts:151` | reader inside `getFactionCapabilityModifier` (only called from early_war path — see below) |
| `src/state/capability_progression.ts:149` | function `getFactionCapabilityModifier` definition |

`getFactionCapabilityModifier` callers (after the prompt's exclusions): **none.** The only callers are `src/sim/early_war/control_flip.ts:561,564` (excluded). UI consumers: `src/ui/warroom/components/DiplomacyModal.ts:281` (excluded — UI, narrow HRHB own-faction display documented as intentional).

**Zero war-phase readers.** Confirmed decorative in war phase.

### CC4 — Tests pinning officer numerics

| Test file | Lines pinning `officer_quality` or `learning_rate` | Notes |
|---|---|---|
| `tests/officer_quality.test.ts` | 93, 98, 106, 113-114, 127, 134, 147-153, 157-161, 167-197, 203-244, 248-260, 264-272 | `getBrigadeOfficerMod` / `updateBrigadeOfficerQuality` numeric pins; growth-direction asserts; floor/cap asserts |
| `tests/officer_system.test.ts` | 298, 315, 328, 353, 367, 376-377 | `officer_quality: 0.50` fixtures (delete + default test) |
| `tests/officer_experience.test.ts` | 171-178 | `faction_officer_maturity['RS']==4.0`, `RBiH==3.0` |
| `tests/officer_config_consumers.test.ts` | full file (validation harness) | enumerates "dead config" allow-list; flags fields with no consumer-side reads in `src/`; will detect any new dead field added to the timeline |
| `tests/ui_map_officers_phase_e.test.ts` | (UI presentation only — no numeric pin on growth math) | UI only |
| `tests/newspaper_modal_officer_boundary.test.ts` | (boundary contract — no growth math) | UI only |

For the determinism-auditor handoff in P0: a learning-rate units fix will move every numeric pin in `officer_quality.test.ts` that asserts an exact growth-result-after-N-turns; growth-direction asserts (`> 0.10`) survive intact. The faction-default tests in `officer_experience.test.ts` are not affected by the `learning_rate` fix.

---

## 7. Owner Classification (T2.A)

Symptom → primary owner mapping. Each row gets exactly one owner.

| # | Symptom | Primary owner | Surface | Severity |
|---|---|---|---|---|
| 1 | ARBiH and HRHB officer growth ~100× too slow when timeline is bound | formula-unit | `officer_quality_update.ts:108,124,127` × `apr1992.json:386-411` | **P0** |
| 2 | RS officer growth ~100× too slow when timeline is bound | formula-unit | same as #1 | **P0** |
| 3 | `faction_officer_maturity` written every turn, never read | dead wiring | `officer_experience.ts:184` writer with no reader | P1a (consumer design) |
| 4 | `capability_profile` keyframes correct but war-phase decorative | dead wiring | `capability_progression.ts:145` writer; readers only in early_war + UI | P1a (consumer design) |
| 5 | Operation readiness gates static — no doctrinal-arc input | operation-readiness owner | `army_hq_gathering.ts`, `bot_corps_directives.ts`, `commander/plan.ts` (zero references to officer_quality/capability_profile/maturity) | P1c |
| 6 | ARBiH never reaches `axes≥2` even at 156w/183w | operation-readiness owner | observed metric §5.5 | P1c (downstream of #5) |
| 7 | VRS brain drain unconditional after w40 — calendar railroad | bot-doctrine railroad | `officer_quality_update.ts:39-42,134-136` | P1b |
| 8 | War-exhaustion combat effect uniform across factions (single global tempo mult) | combat math | `combat_math.ts:1126-1132` (no faction asymmetry beyond raw exhaustion value) | P2 |
| 9 | 104-156w / 156-188w show 0 ops across all factions | command + readiness | observed §5.5; not directly traceable in this audit (likely downstream of #5) | P2 (observation, owner TBD) |
| 10 | RS art_op collapse 1263→19 while art_deg balloons | maintenance / equipment_decay | `composition.artillery_condition` (likely `equipment_decay.ts` if present) | P3 (separate audit) |
| 11 | `move_only` op outcomes (attempts == 0) common | operation-execution / staging | observed §5.5 (RS 4 of 6 in 40-104w) | P3 / soft railroad watch |
| 12 | Sibling scenarios diverge on whether `war_timeline`/`init_officers` are bound | scenario-config drift | `apr1992_definitive_*.json` set; CC1 | **Cross-cutting (must precede P0)** |

The audit's classification deliberately gives the cross-cutting scenario harmonization (#12) precedence over P0 because the units fix's hash-baseline implications are scenario-dependent until #12 is closed.

---

## 8. Railroads / Forced Behaviors

### Confirmed calendar-driven railroad

`officer_quality_update.ts:39-42`:
```
export const VRS_BRAIN_DRAIN_START_WEEK = 40;
export const VRS_BRAIN_DRAIN_RATE = 0.001;
```
Applied unconditionally at `officer_quality_update.ts:134-136`:
```
if (faction === 'RS' && turn >= brainDrainStart) {
    quality -= brainDrainRate;
}
```
This violates the design rule already canonized in `CALIBRATION_MASTER.md` "Faction Doctrinal Arcs": faction arcs must emerge from mechanics, not hardcoded calendar curves. The railroad fires regardless of officer pool depth, recent battlefield outcomes, casualties suffered, supply state, exhaustion, alliance posture, or any signal that would make the loss endogenous.

This becomes **the most visible determinant of late-war RS officer quality** because the units bug suppresses combat-driven growth: a RS brigade losing `0.001` per turn for 148 turns past w40 floors out via the `OFFICER_QUALITY_FLOOR = 0.05` clamp at `officer_quality_update.ts:139`. The §5.1 numbers are consistent with this — RS p25 hits the floor (`0.050`) at 156w/183w/188w.

### Designed constraints (not railroads)

- Cohesion floor / ceiling (`OFFICER_QUALITY_FLOOR = 0.05`, `OFFICER_QUALITY_CAP = 0.90`) — bounded, mechanic-coupled via attrition + growth.
- `capability_profile` annual keyframes — designed institutional curve. Currently decorative, but if/when wired into operation readiness (P1a) the curves themselves are intentional.

### Soft railroad watch

`move_only` ops (attempts == 0). Observed at non-trivial frequency in §5.5 (RS 40-104w: 4 of 6 ops; HRHB 0-40w: 1 of 1). The semantics — what makes an op finish with zero attacks — should be re-audited against the operation lifecycle in a follow-up packet to confirm it represents either successful intimidation/staging-only seizure or aborted movement; either way, it is not a railroad on its own.

---

## 9. Determinism Risk Flags

For each candidate fix shape from §4:

### Shape A — drop `COMBAT_GROWTH_BASE *` from timeline branch only
- **Save shape:** unchanged (still writes `formation.officer_quality: number`).
- **Cascade:** every numeric pin in `tests/officer_quality.test.ts` after N turns of growth changes; faction averages diverge across all timeline-bound runs (40w / 188w / future); 104w unaffected unless CC1 is fixed.
- **Pinned tests at risk:** see CC4. Growth-direction asserts (`>` comparisons) survive; specific-value asserts must be updated.
- **Hash baselines:** every committed final_state_hash for a timeline-bound run **moves**.
- **Determinism property preserved:** yes — pure arithmetic, sorted iteration unchanged.

### Shape B — rewrite JSON to multiplier shape
- **Save shape:** unchanged.
- **Cascade:** identical hash impact to shape A; same test impact.
- **Risk unique to B:** the JSON change is invisible to anyone who does not also read `officer_quality_update.ts` — the gap-finder's "future trap" remains open. Mitigate with explicit unit comment in JSON or schema rejection of out-of-range values.

### Shape C — split into `learning_rate_abs` and `learning_rate_mult`
- **Save shape:** unchanged.
- **Cascade:** the schema change to `WarTimeline.officer_config` propagates to `officer_config_consumers.test.ts`, the timeline loader, and `getFactionOfficerMaturity` if the field is also read there (it is not, per §3).
- **Hash baselines:** identical impact to A/B once one of the new fields is set.
- **Risk unique to C:** any external scenario or test that pre-sets `officer_config` must be updated. CC4 enumerates all current test sites.

### Cross-cutting determinism note (CC4 surface)
- `tests/officer_config_consumers.test.ts` already enforces a "dead config" allow-list. A units fix should not silently un-dead a field; if it does, the test fails first, which is the intended forcing function. No change to the test list is required from the units fix alone.
- `tests/officer_experience.test.ts:171-178` pins `faction_officer_maturity['RS']==4.0` as a *write-side* assertion. A units fix does not touch maturity. The P1a packet that wires maturity into operation readiness will need to update this test.

---

## 10. Recommended Packet Order

Single recommendation: **do nothing inside this audit packet**. Sequence the next packets as follows.

1. **Cross-cutting — scenario-config harmonization.** Author or remove `war_timeline: "apr1992"` and `init_officers: "apr1992"` consistently across all `apr1992_definitive_*.json` files. Bind the timeline everywhere, OR remove it everywhere; do not leave the 40w/104w/188w split. Hash impact is bounded to the runs that gain or lose the timeline. No behavioral change to the engine. Owner: `/scenario-creator-runner-tester`. Expected output: three or four scenarios convergent on a single binding posture, with hashes refreshed deliberately.
2. **P0 — officer learning_rate units fix in isolation.** Pick exactly one of shapes A / B / C from §4. Add or update tests under `tests/officer_quality.test.ts` so growth-magnitude is asserted in the fixed unit. Refresh every timeline-bound hash baseline. No other change in the same packet. Owner: `/gameplay-programmer` + `/determinism-auditor` sign-off.
3. **P1a — capability_profile + faction_officer_maturity into operation readiness.** Implement `computeCorpsOperationReadiness(...)` per the contract doc (`docs/plans/2026-05-01-force-quality-operation-architecture-contract.md`); name each trait it produces; surface in AAR. Do not change combat math. Owner: `/operations-expert` + `/corps-army-commander`.
4. **P1b — replace VRS brain drain calendar railroad with mechanic-coupled decay.** Drive officer-pool erosion from cumulative casualties, supply state, simultaneous-front pressure, and isolation; remove or guard `VRS_BRAIN_DRAIN_START_WEEK`. Determinism baselines refresh deliberately. Owner: `/game-designer` + `/historian` + `/gameplay-programmer`.
5. **P1c — operation-readiness consumers.** Wire the readiness traits from P1a into `army_hq_gathering.ts`, `bot_corps_directives.ts`, and `commander/plan.ts` so they actually gate operation acceptance, multi-axis limits, and staging tolerance. Owner: `/operations-expert` + `/corps-army-commander`.
6. **P2 — war_exhaustion faction asymmetry + late-war ops dropoff investigation.** The 104-156w / 156-188w 0-ops result deserves a separate packet once 1-5 are in. Owner: `/anomaly-triage`.
7. **P3 — equipment maintenance / decay and `move_only` semantics audit.** Smaller follow-ups. Owner: `/qa-engineer` + `/operations-expert`.

---

## 11. Critical Open Questions

1. **Semantic unit of `faction_officer_maturity`.** It is computed in `getFactionOfficerMaturity` (`officer_experience.ts:160-172`) as the mean of `competence` over active named officers, falling back to `3.0`. P1a needs `/game-designer` to commit on whether maturity is "average competence" (current write semantic) or "institutional command-bench depth" (which would imply a different formula). Without this commit, P1a cannot consume the value.
2. **104w scenario divergence — settled.** CC1 settles the 104w mystery: 104w lacks `war_timeline` and `init_officers`. The follow-up question is whether 104w is an intentional fallback-test scenario (in which case it should be renamed) or a copy-paste omission (in which case the cross-cutting harmonization closes it).
3. **`MAX_SUSPENSION_TURNS` path liveness.** Memory entry flags this as an open hardening item: `estimateTurnsActive` broken suspend counter, plans that cannot self-abandon. Not directly in scope here but interacts with P1c (operation-readiness wiring) — `/qa-engineer` should surface its current state before P1c lands.

---

## 12. Codex Review Notes

- No engine/source simulation, data, scenario, OOB, painted target, operation definition, or canon file was modified by this audit.
- Diagnostic script: `tools/diagnostics/force_quality_audit_metrics.cjs`; Codex review tightened deterministic sorting to use bytewise `strictCompare` instead of locale-dependent sort callbacks.
- Diagnostic output artifact: `tools/diagnostics/_force_quality_run_output.md`.
- This report: `docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md`.
- Ledger entry: appended to `docs/PROJECT_LEDGER.md`.
- Knowledge entries: durable findings appended to `docs/PROJECT_LEDGER_KNOWLEDGE.md`.
- Codex review verdict: accepted as evidence; next work should be the integrated Force Quality Foundation lane, not another narrow audit.
