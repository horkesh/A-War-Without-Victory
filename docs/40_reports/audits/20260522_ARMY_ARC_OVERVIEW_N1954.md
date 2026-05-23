# Army Arc Overview — n1954 (188w, apr1992_definitive)

**Date:** 2026-05-22
**Author:** scenario-creator-runner-tester (skill: `F:/A-War-Without-Victory/.claude/skills/scenario-creator-runner-tester/SKILL.md`)
**Run dir:** `F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1954`
**Run hash:** `210e69404d054959` (n1954, w188)
**Plan reference:** `docs/plans/2026-05-22-force-trajectory-wiring-plan.md` (W1+W2+W2.5+W2.6 DONE, W3/W5 PENDING) — confirmed exists at line 39 §3 execution-state table.
**Frame of analysis:** "VRS competent army → competent rubble" vs "ARBiH rebel-formations → competent army" curve. Historical anchors: BB2 p.555 ("inordinately low frontline manning by autumn 1994"); ARBiH peak 261.5k early 1993, organizational consolidation mid-1993; HVO ~50–55k Washington-frozen; per `docs/40_reports/REAL_WAR_MASTER.md` historical/doctrinal blindspot audit.

## §1. Per-faction data tables

### Dimension data sources

All numbers derived from:
- `final_save.json` paths: `military.formations[].{personnel, status, kind, morale, cohesion, officer_quality, composition.{infantry,tanks,artillery,aa_systems}}`, `military.casualty_ledger[faction]`, `political.political_controllers`, `political.war_exhaustion`, `factions[].{profile.exhaustion, embargo_profile, capability_profile, patron_state}`, `operation_history`, `turn_summaries[].{arc_transitions, formation_destructions, formation_spawns, territory_snapshot}`
- `initial_save.json` (same paths for w0 baseline)
- `weekly_report.jsonl` (188 lines, one per week): `factions[].exhaustion`, `corps_summary`, `combat_causality`, `operation_diagnostics`, `brigade_dissolution`
- `operation_aars.json` (19 entries: outcomes, casualties_inflicted/suffered, equipment_destroyed/lost/captured)
- `destroyed_brigades.json` (41 entries: brigade lifecycle terminations)
- `formation_delta.json`
- `data/derived/operational/osid_areas.json` (areas) and `data/source/calibration/painted_control_oct1995.json` (paint target)

### Table 1 — Per-faction snapshot, start (w0/w1) vs end (w188)

| # | Dimension | Field path | VRS (RS) | ARBiH (RBiH) | HVO (HRHB) |
|---|---|---|---|---|---|
| 1 | Personnel sum (active brigades, kind=brigade) | `military.formations[*].personnel where status=active && kind=brigade` | 82,550 → 42,400 (−48.6%) | 48,504 → 208,787 (+330.4%) | 23,800 → 58,841 (+147.2%) |
| 1a | Personnel sum, ALL active formations (includes corps_asset / paramilitary) | same incl. all kinds | 117,750 → 80,924 (−31.3%) | 48,504 → 208,787 (+330.4%) | 31,800 → 58,841 (+85.0%) |
| 2 | Total formations | `military.formations[*]` count | 102 → 149 (+47) | 85 → 132 (+47) | 39 → 52 (+13) |
| 2a | Active brigades | `formations[*] where status=active && kind=brigade` | 77 → 53 (−24) | 78 → 125 (+47) | 29 → 32 (+3, but 11 dissolved through "inactive") |
| 2b | Status breakdown (final) | `formations[*].status` | active=61, **inactive=88** | active=130, inactive=2 | active=37, inactive=15 |
| 2c | Formations dissolved (war-phase) | `weekly_report.brigade_dissolution[]` cumulative | **31** | 4 | 5 |
| 2d | `destroyed_brigades.json` lifecycle terminations | array filter | **30** | 2 | 9 |
| 2e | Formations spawned during war | `turn_summaries[].formation_spawns` aggregate | 5 brigades + 58 paramilitary + 1 army_hq | 47 brigades | 9 brigades + 6 paramilitary |
| 2f | Morale-collapse-override-dissolved | status `morale_collapsed`/`morale_overridden` | 0 | 0 | 0 (override shadow-flag not yet flipped to active behavior, per Trip session 2 §6.2.4) |
| 3 | Casualties — KIA | `casualty_ledger[fac].killed` | **19,119** | **70,013** | **5,955** |
| 3a | Casualties — Wounded | `casualty_ledger[fac].wounded` | 39,870 | 135,749 | 11,307 |
| 3b | Casualties — Missing/captured | `casualty_ledger[fac].missing_captured` | 22,193 | 57,221 | 4,110 |
| 3c | Casualty total (KIA+WIA+MIA) | sum | 81,182 | 262,983 | 21,372 |
| 4 | Equipment — tanks (sum of active brigade `composition.tanks`) | `formations[].composition.tanks` (active brigades) | 560 → 511 (−9%) | 32 → 79 (+147%) | 16 → 66 (+312%) |
| 4a | Equipment — artillery | `formations[].composition.artillery` | 1,365 → 1,101 (−19%) | 102 → 309 (+203%) | 52 → 155 (+198%) |
| 4b | Equipment — AA systems | `formations[].composition.aa_systems` | 196 → 137 (−30%) | 8 → 9 (+12%) | 4 → 14 (+250%) |
| 4c | Equipment — total heavy, operational | `formations[].equipment_state.operational_heavy` (active brigades) | 4,389 → **0** (collapse) | 468 → 738 (+58%) | 841 → 870 (+3%) |
| 4d | Equipment — total heavy, all states | `formations[].equipment_state.total_heavy` | 4,389 → 3,021 (−31%) | 468 → 738 | 841 → 948 |
| 4e | `equipment_quality_modifiers` (faction map) | `military.equipment_quality_modifiers` | **`[]` empty array, decorative substrate** | `[]` empty | `[]` empty |
| 4f | Equipment lost (cumulative) | `casualty_ledger[fac].equipment_lost.{tanks,artillery,aa_systems}` | tanks=147, artillery=161, aa=0 | tanks=0, artillery=58, aa=0 | tanks=0, artillery=29, aa=0 |
| 5 | Cross-faction equipment destroyed | sum of `operation_aars[].equipment_destroyed` per attacker faction | RS destroyed: tanks=0, art=0, aa=0 | RBiH destroyed: 0 across the board (no ops) | HVO: 0 |
| 5a | Equipment lost in operations | `operation_aars[].equipment_lost` per attacker | RS lost in ops: tanks=5, art=4, aa=0 | RBiH lost in ops: 0 (no ops) | 0 |
| 5b | Equipment captured in ops | `operation_aars[].equipment_captured` | 0 | 0 | 0 |
| 6 | Operations launched (full ops, AAR-recorded) | `operation_history` filter | **18** (12 fail, 4 success, 2 partial) | **0** | 1 (failure) |
| 6a | Operation entries via weekly diagnostics (incl. probes) | `weekly_report.operation_diagnostics` faction count | 187 entries / 57 unique op names (mostly `probe_*`) | **12 entries / 1 unique op name ("Operation Donji Vakuf 95")** | 99 entries / 47 unique (almost all `probe_*`) |
| 7 | Brigade tier distribution | `formations[].distinction_potential` | tier_1=0, tier_2=0, tier_3=0, none=149 | tier_1=0, tier_2=0, tier_3=0, none=132 | tier_1=0, tier_2=0, tier_3=0, none=52 |
| 7a | Arc transitions (degraded direction) | `turn_summaries[].arc_transitions` aggregate | garrison→destroyed=22, garrison→shattered=10, shattered→destroyed=9, bloodied→shattered=7, garrison→bloodied=5, veteran→shattered=2 | shattered=11 entries net, mostly bloodied→risen=28, shattered→risen=4 | garrison→destroyed=8, garrison→bloodied=4, bloodied→risen=3 |
| 7b | Arc transitions (improved direction) | same | garrison→veteran=19, veteran→risen=2, garrison→risen=1 | garrison→bloodied=69 (combat exposure), bloodied→risen=28, garrison→veteran=5, shattered→risen=4 | bloodied→risen=3, garrison→veteran=1 |
| 8 | `political.war_exhaustion[fac]` final | top-level `political.war_exhaustion` | 100.001762 | 100.001762 | 100.001762 (identical across all three) |
| 8a | `political.war_exhaustion[fac]` w1 | weekly_report.jsonl line 1 | 10.0016275 | 7.9416275 | 10.0016275 |
| 8b | `political.war_exhaustion[fac]` saturation week | first week ≥100 | w21 | w21 | w21 |
| 8c | `factions[].profile.exhaustion` final | save root | 0.31257983 | 0.31257983 | 0.31257983 (identical) |
| 9 | Avg morale (active brigades) | `formations[*].morale where status=active && kind=brigade` mean | 60.0 → **16.1** | 60.0 → **91.5** | 60.0 → 77.3 |
| 9a | Avg cohesion (active brigades) | `.cohesion` mean | 67.4 → **28.8** | 46.5 → **75.5** | 57.8 → 37.7 |
| 9b | Avg officer_quality (active brigades) | `.officer_quality` mean | **0.549 → 0.455** (modest decline) | **0.081 → 0.838** (10× growth) | 0.225 → 0.248 (flat) |
| 9c | Avg experience (active brigades w/ field present) | `.experience` mean (43 RBiH / 29 RS / 8 HRHB brigades) | 0.110 (29 brigades) | 0.129 (43 brigades) | 0.281 (8 brigades) |
| 10 | Area-weighted territory at end | `political.political_controllers` × `osid_areas.json` | 50.58% → **60.31%** (+9.73 pp) | 33.70% → **28.13%** (−5.57 pp) | 15.72% → **11.57%** (−4.15 pp) |
| 10a | Settlement-count territory at end | end_report `Net control counts` | 275 → 354 (+79) | 330 → 281 (−49) | 107 → 77 (−30) |

### Table 2 — Faction strategic/embargo state (w188 only)

| Field | path | VRS (RS) | ARBiH (RBiH) | HVO (HRHB) |
|---|---|---|---|---|
| Heavy equipment access | `factions[].embargo_profile.heavy_equipment_access` | 0.9 | 0.2 | 0.65 |
| Ammunition resupply rate | `factions[].embargo_profile.ammunition_resupply_rate` | 0.8 | 0.3 | 0.6 |
| Smuggling efficiency | `factions[].embargo_profile.smuggling_efficiency` | 0 | 0.282 | 0 |
| Maintenance capacity (base) | `factions[].maintenance_capacity.base_capacity` | 0.74 | 0.68 | 0.65 (n/a) |
| Organizational maturity | `factions[].capability_profile.organizational_maturity` | 0.70 | **0.85** | 0.70 |
| Training quality | `factions[].capability_profile.training_quality` | 0.65 | **0.85** | 0.75 |
| Patron commitment | `factions[].patron_state.patron_commitment` | 0.413 | 0.697 | 0.735 |
| Diplomatic isolation | `factions[].patron_state.diplomatic_isolation` | 1.0 | 1.0 | 1.0 |

---

## §2. Arc-shape narrative per faction (188w trajectory)

### VRS (RS) — "competent army → competent rubble"

- **Personnel**: 117,750 → 80,924 (−31% overall, **−48.6% in active brigades only**). Net decline shape is correct in direction; magnitude exceeds historical (BB-cited ~22–24k war-dead, plus desertions, but final ~155k stable personnel) — sim drops VRS roster well below historical end state.
- **Brigade count**: 77 active → 53 active. 88 formations sit in `inactive` status at end. 31 dissolutions logged in `weekly_report.brigade_dissolution`. 30 lifecycle terminations in `destroyed_brigades.json`. The trajectory is clearly destructive; first VRS dissolutions begin at t=48 (rs_1st_kotor_varo_light_infantry), accelerate through 1993–1994.
- **Equipment**: tanks 560 → 511 (−9%), artillery 1,365 → 1,101 (−19%), AA 196 → 137 (−30%). `operational_heavy` collapsed to **0** while `total_heavy` retains 3,021 — i.e. the maintenance-deficit pathway has driven all VRS heavy to non-operational status by w188. Direction is right; magnitude (0% operational) reads as engine overshoot vs historical "structurally degraded but still firing artillery into Sarajevo through Oct 1995".
- **Force-quality (the brigade state machine)**: morale 60 → 16.1, cohesion 67.4 → 28.8, officer 0.549 → 0.455. The "competent rubble" curve **is being produced at the brigade level** — VRS officer corps degraded modestly, morale collapsed substantially. This matches the n1741 audit signal (`docs/40_reports/audits/20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md`) the plan §1 cites.
- **Operations**: 18 ops attempted, 4 success, 12 fail, 2 partial. Almost all successes are early-war (Prijedor/Drina/Koridor/Donji Vakuf turns 0–16). All 7 ops after t=40 are failures (Cerska-Kamenica, Štit, Gvožđe, Redut, Oklop, Javor, Foca). VRS operational productivity does decline through time — direction correct.
- **Territory**: 50.58% → **60.31%**. VRS expands its area share over the run — wrong direction for an October 1995 anchor where the Krajina collapse and Federation gains should have reduced VRS area to ~48.72% (painted target). Net flips RBiH→RS = 78 settlements, RS→RBiH = only 21.

### ARBiH (RBiH) — "rebel-formations → competent army"

- **Personnel**: 48,504 → **208,787 (+330%)**. ARBiH grows substantially; net magnitude is well below the historical 261.5k peak but final ~210k is within plausible band of the historical late-war ARBiH force.
- **Brigade count**: 78 active → 125 active. **47 new brigades spawned during the war**, matching the historical organizational growth from territorial detachments → numbered brigades → corps structure. 4 dissolutions total (vs 31 VRS). Direction strongly correct.
- **Equipment**: tanks 32 → 79 (+147%), artillery 102 → 309 (+203%), AA 8 → 9 (+12%), heavy operational 468 → 738 (+58%). Growth is in the right direction (Iran/Saudi/Croatia arms pipeline, captured equipment) but magnitude lags historical — ARBiH at w188 still has 1/7 the tanks and 1/3.5 the artillery of VRS, while historically the gap narrowed.
- **Force-quality**: morale 60 → **91.5**, cohesion 46.5 → **75.5**, officer **0.081 → 0.838** (10× growth). This is the textbook "competent army" curve. The arc state machine is functioning perfectly for ARBiH.
- **Operations**: **ZERO ops in `operation_history`. ONE op-name in weekly diagnostics ("Operation Donji Vakuf 95")** — the W2.6 Donji-Vakuf-95 launch. 7 objectives captured (per plan §3 W2.6 entry, "7 real Donji captures through `prusac_2`"). No Sana-95, no Maestral-2, no other ARBiH offensives in 4 years of war. This is the dominant arc-breaking finding.
- **Territory**: 33.70% → **28.13%** (−5.57 pp). Wrong direction. Painted target is 30.69%, so sim is **−2.56 pp from target** despite ARBiH's quality arc being correct.

### HVO+HV (HRHB) — Washington-Agreement-frozen

- **Personnel**: 31,800 → 58,841 (+85%). Roughly tracks historical 50–55k stable end-state.
- **Brigade count**: 29 → 32 active brigades. 9 brigades spawned (includes HV-attached `hv_1st_guards_tigers`, `hv_4th_guards_split`, etc — Croatian Army integration per `hv_integration.ts:38`).
- **Equipment**: tanks 16 → 66, artillery 52 → 155, AA 4 → 14. Strong heavy-weapons growth, consistent with HV technology transfer post-Washington Mar 1994.
- **Force-quality**: morale 60 → 77.3 (improved), **cohesion 57.8 → 37.7 (declined)**, officer 0.225 → 0.248 (flat). Mixed signal — morale up, cohesion down. Cohesion decline matches HVO's chronic structural instability and post-Washington reorganization friction.
- **Operations**: only 1 full op (Operation Jackal, failure t=8–13). 47 unique probe operations (`probe_hvo_*`) recorded in diagnostics. No Maestral-2/Storm-aligned Sept–Oct 1995 ops. HVO is operationally inert past w13.
- **Territory**: 15.72% → **11.57%** (−4.15 pp). Wrong direction. Painted target is 20.59%. Sim is **−9.02 pp from target** — the biggest faction gap.

---

## §3. Grade table — actual vs desired arc

Scale: A = matches desired arc cleanly · B = partial · C = flat / no arc · D = wrong direction.

| Dimension | VRS | ARBiH | HVO | Notes |
|---|---|---|---|---|
| Personnel arc shape | **B** | **A** | **B** | VRS overshoots collapse (active −48% vs historical mild); ARBiH +330% strong and well-shaped; HVO +85% plausible but no post-Storm spillover spike in west. |
| Equipment quality differential at Oct 1995 | **C/D** | **B** | **B** | VRS `operational_heavy=0` is mechanism overshoot — all heavy went non-operational rather than "degraded but firing"; per-brigade composition decline is correct in direction. Plus `equipment_quality_modifiers` field is empty `[]` — the canonical faction-level modifier is decorative substrate. |
| Officer/cadre quality differential | **C** | **A** | **C** | RBiH officer 0.081→0.838 (10×) is excellent. VRS officer 0.549→0.455 declines only modestly when the historical signal should be sharper (Mladić-Krajišnik split, Krajina-Serb integration, cadre death). HVO flat. |
| Morale + cohesion differential at Oct 1995 | **A** | **A** | **B** | VRS morale 16/cohesion 29 vs RBiH morale 92/cohesion 76 is a textbook "competent rubble vs competent army" gap. HVO cohesion drops with morale rising — historically defensible but not the desired clean curve. |
| Casualty ratio | **D** | **D** | **C** | Sim KIA: RBiH 70,013 / RS 19,119 / HVO 5,955. Historical: ARBiH ~31k military KIA / VRS ~22–24k / HVO ~7.8k. ARBiH KIA is **2.25× historical**; VRS is ~85% of historical (close); HVO ~76% (close). The ARBiH:VRS KIA ratio in sim is 3.66:1; historical is roughly 1.4:1. Defender (ARBiH) is taking too many losses for too little to show. |
| Operations productivity | **B** | **D** | **D** | VRS shows correct decline shape (4/4 early successes, 7/7 late failures). ARBiH ran **zero** ops in `operation_history` and exactly 1 op-name in diagnostics across 188 weeks. HVO ran 1 op (failure). The whole opfor pipeline for the Federation is silent. |
| Territorial outcome (Oct 1995) | **D** | **D** | **D** | Sim 60.31/28.13/11.57 vs painted 48.72/30.69/20.59. RS over by +11.59pp, RBiH under by 2.56pp, HVO under by 9.02pp. Despite force-quality signals being correct, area conversion mechanism is not translating quality differential into territorial outcomes. |
| **Mean grade** | **C+ / B−** | **B / B−** | **C** | Quality substrate is functioning; operations + territory wiring is failing to convert it. |

---

## §4. Overall verdict + top 3 things still wrong with the curve

**Verdict — mean grade across all three factions and seven dimensions: roughly C+ (between C and B−).** The quality arc IS being produced inside the brigade-level state machine — morale, cohesion, officer_quality, arc_transitions all show the correct shape. The five-specialist plan's W1+W2+W2.5+W2.6 have demonstrably moved the needle on substrate visibility (war_exhaustion now reaches 100, Donji-95 launched, 7 objectives captured) — but the substrate→outcome wiring still has three load-bearing breaks:

### Top 3 things still wrong with the curve

1. **ARBiH and HVO are operationally inert. The Federation does not attack.** Across 188 weeks, ARBiH has 0 entries in `operation_history` and exactly 1 op-name in weekly diagnostics (Operation Donji Vakuf 95 — the W2.6 wired op). HVO has 1 full op (Jackal, failed t=13) and otherwise only `probe_hvo_*` ops. The Sept–Oct 1995 historical offensives (Maestral-2, Sana-95, Storm spillover) are not launching despite W2's defender-readiness predicate being shipped. This is the dominant cause of the +11.59pp VRS-area surplus at w188.
   - **Symptom evidence**: `watched_operations.json` shows Krivaja-95 and Stupčanica-95 (VRS Srebrenica/Žepa ops) blocked by `build_defender_power_too_high` at turn 188 because ARBiH 280th–284th East Bosnian Light brigades sit there at full power having fought zero offensive engagements. Defensive power accumulates without depletion; offensive opportunities never resolve.
   - **Plan correspondence**: W2 predicate is wired only for `sana_95`/`mistral_2_95`/`sana_95_follow_on`. W2.6 launch-boundary is wired only for Donji. The other ARBiH/HVO catalog ops are still upstream-blocked at `enemy_weakness` or `commander_confidence`. Plan §3 W2.6 row confirms: "Sana is no longer an accepted no-launch case under broad headless auto-control; it is blocked upstream by `enemy_weakness` and `commander_confidence`, so handle Sana as a separate predicate/trajectory lane."

2. **`equipment_quality_modifiers` is an empty array, and `factions[].profile.exhaustion` and `political.war_exhaustion` are identical across all three factions.** The post-W1 fix correctly moved war_exhaustion from "always 0" to "nonzero and reaching threshold." However the value reaches saturation (100) **at w21 for all three factions simultaneously and stays there for 167 weeks**, with byte-identical numerical values per faction. This is the Issue #47-style "decorative substrate" smell — the field is now populated but does not differentiate factions. `factions[].profile.exhaustion=0.31257983` is identical down to 8 decimal places across RBiH/RS/HRHB. `equipment_quality_modifiers` is `[]` (empty array, not a record). The arc visibility infrastructure exists; the per-faction differentiation does not.
   - This is consistent with plan §3 W1 risk note: "if `state.military.war_exhaustion[faction]` at w188 still reads <10 after W1 ships, accumulation is broken." The value is now >10, so W1 cleared its own stop-gate, but the *differentiation* assumed by combat-math tempo penalty is absent because all three factions hit the cap at the same week.

3. **VRS `operational_heavy` collapses to 0 while `total_heavy` retains 3,021 — a mechanism overshoot in equipment decay.** The `equipment_state.operational_heavy` summed across VRS active brigades reads zero at w188, while `total_heavy = 3021` (and `composition.tanks=511, artillery=1101, aa=137` still listed). This means every VRS heavy weapon is registered as non-operational, which contradicts the historical "competent rubble still firing artillery into Sarajevo through Dayton". The maintenance-deficit pathway (driven by `maintenance_deficit=0.93` on VRS corps) overshoots the historical degradation — historically VRS had partial but real heavy-weapons capability through Oct 1995. The W3 casualty-trajectory consumer (PENDING in plan §3) is the matched lane to recalibrate the late-war equipment decay curve; without W3 the only equipment-quality signal reaching combat math is the per-brigade `equipment_state` which now reads all-non-operational for VRS.

---

## §5. Painted-target comparison (Oct 1995)

Painted target: `data/source/calibration/painted_control_oct1995.json` (meta counts RS:319 / RBiH:286 / HRHB:107). Area-weighted via `data/derived/operational/osid_areas.json` (51,337 km² total, 712 OSIDs).

| Faction | Painted target (Oct 1995) area-weighted | Sim n1954 w188 area-weighted | Delta (sim − target) |
|---|---|---|---|
| RS | **48.72%** | 60.31% | **+11.59 pp** |
| RBiH | **30.69%** | 28.13% | −2.56 pp |
| HRHB | **20.59%** | 11.57% | **−9.02 pp** |

The 6–8pp closure that plan §2 forecast for Tier 1 wiring (W1–W5) is not yet visible. From the Codex-confirmed W1+W2+W2.5+W2.6 shipped state, the gap to painted has moved (vs the plan's reference baseline of 61.0/26.4/12.6 pre-W1) by:

- RS: 61.0 → 60.31 (−0.69 pp closer to target)
- RBiH: 26.4 → 28.13 (+1.73 pp closer)
- HRHB: 12.6 → 11.57 (−1.03 pp further)

Net: **partial progress on ARBiH side from Donji Vakuf 95's 7 captures**; HVO regressed slightly; VRS shifted by less than 1pp. The W3 casualty-consumer + the additional W2 predicate wirings for non-Sana ops are the remaining levers identified by the plan to close the residual ~10pp combined gap.

---

## Reported back to caller

(a) **Overall arc grade letter (mean across dimensions): C+ (between C and B−).** Quality substrate is producing the correct shape (RBiH morale 60→91.5, RS morale 60→16.1, RBiH officer 0.081→0.838); but operations productivity, territorial outcome, and casualty ratio dimensions grade D for two of three factions.

(b) **Three most surprising findings**:
1. ARBiH ran **zero ops in operation_history and one op in weekly diagnostics** across 188 weeks. Federation is operationally inert; the only ARBiH launch is the W2.6 Donji Vakuf 95.
2. VRS `operational_heavy` is **0 across all active brigades** at w188 (out of `total_heavy = 3021`). Heavy-weapons decay overshoots the historical late-war partial-functioning state.
3. `political.war_exhaustion` and `factions[].profile.exhaustion` are **byte-identical across all three factions** at w188 (100.00176167 and 0.31257983 respectively). W1 cleared its own stop-gate (value > 10) but produces zero faction differentiation — the field is populated but undifferentiated.

(c) **W-changes from the plan: working vs not**:
- **W1 (war_exhaustion threshold repair) — PARTIALLY WORKING.** Value now reaches 100 (vs always-0 pre-fix). Stop-gate cleared. However, all three factions converge to identical exhaustion values from w21 onward, so the combat-math tempo penalty cannot differentiate which faction should be penalized — the per-faction trajectory shape is flat-shared instead of divergent. Mechanic alive but not yet expressive.
- **W2 (defender-corps readiness predicate) — WORKING for Sana/Maestral-2 catalog ops, NOT REACHING THEM.** Predicate exists but Sana is blocked upstream by `enemy_weakness` / `commander_confidence` per plan §3 W2.6 note. No `sana_95` launch in this run.
- **W2.5 (headless decision bridge) — WORKING.** Donji Vakuf 95 reached eligible_pending_review and was approved, evidenced by 1 ARBiH op in diagnostics + 7 captures through `prusac_2`.
- **W2.6 (opening-attack launch feasibility) — WORKING FOR DONJI.** Operation Donji Vakuf 95 launched, 7 objectives captured, `jemanlici`/`korenici`/`oborci_2` remain RS-held (honest under-delivery rather than silent advancement, as plan §3 W2.6 row attests). Sana still blocked upstream.
- **W3 (casualty-trajectory consumer) — PENDING.** Casualty_ledger writes but is not read by combat math. ARBiH:VRS KIA ratio of 3.66:1 (vs historical 1.4:1) is the symptom — defender takes 70k KIA with no faction-level combat penalty applied to the attacker side that's inflicting them.
- **W4 (Sana readiness floor) — NOT NEEDED PER PLAN; confirmed by plan §3.**
- **W5 (officer-maturity consumer) — PENDING.** RBiH officer_quality reached 0.838 by w188 (10× growth) but this never feeds combat math, so the "competent army" power-multiplier loop is not closed.

(d) **Memo exists**: yes — `docs/plans/2026-05-22-force-trajectory-wiring-plan.md` confirmed present; §3 execution-state table read; W1+W2+W2.5+W2.6 confirmed DONE in plan body; W3/W5 confirmed PENDING; W4 confirmed NOT NEEDED.
