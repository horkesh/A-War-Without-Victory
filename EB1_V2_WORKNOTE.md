# E-B1 v2 worknote (feat/eb1-corps-coherence-v2)

Floor (origin/main a5e7e4e3f): 188w 649/712, hash 89ef697dfb27c989, anchors 30/30, 6/6 bench, 0 crit; 40w 235c61f408dc3d95; 52w 515e0e07ab32db82.
Target cells E-B1 should ENABLE: op:kljuc:sanica_2 + op:sipovo:pribeljci_2 (western Krajina, VRS over-held).

## Implementation
- NEW src/sim/combat/coordination_coherence.ts (mirrors strategic_depth.ts).
  Decay gated: operation_storm_triggered === true AND corps in KRAJINA_COLLAPSE_CORPS.
  Value = 0.6*strategic_depth + 0.4*c2(equipQualMult), clamp [0.1,1.0]. Else 1.0 (byte-stable).
- Consumer-1 ONLY in combat_math.computeDefenderPowerBreakdown: peripheryAbandonmentMult
  = 0.80 iff coherence < PERIPHERY_ABANDONMENT_THRESHOLD AND getOsidPriority(targetOsid, defenderFaction)==='periphery'.
  Consumer-2 (the <0.7 launch-block) DROPPED entirely (the NO-GO suspect).
- war_phases step 'update-coordination-coherence' before 'advance-sector-offensives'.
- init in scenario_runner.ts next to initStrategicDepth.
- Constants combat_math.ts: PERIPHERY_ABANDONMENT_THRESHOLD=0.6, PERIPHERY_ABANDONMENT_DEFENDER_MULT=0.80.

## Iteration plan (one change per 188w, STOP at first GO >=649)
- V1: Consumer-1 only, threshold 0.6.  [BUILT]
- V2: lower threshold 0.6 -> 0.5.
- V3: scope mechanic to KRAJINA_COLLAPSE adjacency (already scoped via gate — would tighten further).

## Gate per run
188w >=649 AND anchors 30/30 AND Zvornik RS AND 6/6 bench AND 0 crit AND srebrenica_2+zepa_2 fall AND killed not worse.
Plus full vitest 0-fail + tsc clean.

## Scoring workflow
1. node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs
2. node tools/compare_painted_vs_sim.cjs <run_dir> --target oct1995   (matched/712 + mismatches)
3. end_report.md in run_dir = anchors/benchmarks/criticals.

## Status
- tsc clean. focused tests 8/8 pass. war_phase_step_order updated 187->188 (intentional new step).
- V1 188w (threshold 0.6) run dir runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n0:
  - MATCHED 649/712 (== floor). hash 0139467881353b9b (moved from 89ef697dfb27c989).
  - anchors 30/30 (oct1995 resolver). benchmarks 6/6 PASS. 0 critical anomalies.
  - op:zvornik:zvornik=RS. srebrenica_2=RS (falls). op:rogatica:zepa_2=RS (falls).
  - op:lukavac:brijesnica_donja_2=RBiH (anchor holds).
  - TARGET CELLS RECOVERED: op:kljuc:sanica_2=RBiH, op:sipovo:pribeljci_2=HRHB (both now MATCH painted; not in mismatch list).
  - casualties A/D 113896/158710 (=272,606 total). Floor compare PENDING.
  - GATE: 649>=649, 30/30, zvornik RS, 6/6, 0 crit, sreb+zepa fall — ALL MET if killed not worse.
- Floor 188w re-run (origin/main, temp worktree): hash 89ef697dfb27c989 (reproduces floor exactly),
  649/712, casualties A/D 113896/158710, 0 critical, sanica_2=RBiH, pribeljci_2=HRHB ALREADY at floor.
- V1 vs floor: **0 OSID control diffs**, casualties byte-identical. V1 is CALIBRATION-FLAT.
  Hash moves ONLY because coordination_coherence is now serialized on corps formations.
- ROOT CAUSE V1 inert: end-state coherence vrs_1st_krajina=0.76, vrs_2nd_krajina=0.904, all others=1.0.
  Both Krajina corps ABOVE the 0.6 threshold -> peripheryAbandonmentMult never fires. c2=1.0 at t188
  (NATO suppression expired); decay = 0.6*depth+0.4 bottoms at 0.76.
- NOTE: the target cells (sanica_2/pribeljci_2) are NOT VRS-retained at the floor — they already match
  painted. The first-build diagnosis ("VRS retained them, -2") does NOT reproduce on the current 649 floor.
- IMPLICATION: lowering threshold 0.6->0.5 (V2) fires EVEN LESS (both corps >0.5) -> also inert/flat.
  To make Consumer-1 bite, the decay must drop a Krajina corps BELOW threshold. Needs analysis.

## Browser-safe + snapshot fixes (post-V1 full-suite)
- Full vitest after V1: 10 failed. Root causes:
  - ui_map_browser_safe_imports + (would-be) bundle: combat_math importing getOsidPriority pulled
    strategic_priorities.ts's top-level node:fs/node:path into the browser bundle. FIXED by splitting
    the disk read into strategic_priorities_node.ts (self-registering via _registerStrategicPrioritiesDiskLoader);
    strategic_priorities.ts is now browser-safe (cache + EMPTY_INDEX fallback -> 'periphery' default).
    Node consumers (scenario_runner, strategic_reserve, the two tests) side-effect-import the node loader.
  - startup_snapshot_contract (2): initCoordinationCoherence at scenario load wrote coordination_coherence=1.0
    onto every corps -> staled the baked apr_1992 snapshot. FIXED by REMOVING the init seed (per-turn
    update step computes it before first combat; pre-Storm constant 1.0 so no behavioral loss).
  - audit_state_of_game_determinism (3) / data_extract1990 (1) / political_control_audit_cli (2):
    ENVIRONMENT failures ('tsx not recognized' = missing .bin shims; missing Excel). REPRODUCE IDENTICALLY
    on the clean floor worktree (origin/main) -> NOT caused by E-B1.
- After fixes: snapshot + browser + priority + coherence + step-order = 25/25 pass. tsc clean.
## V1b (final code) authoritative 188w — run dir __w188_n1
- MATCH 649/712. hash 0139467881353b9b (IDENTICAL to first V1 run; init-seed removal didn't change outcome).
- anchors 30/30. benchmarks 6/6. 0 critical anomalies.
- Zvornik RS. Srebrenica RS (falls). Žepa (op:rogatica:zepa_2) RS (falls). brijesnica_donja_2 RBiH (anchor holds).
- sanica_2=RBiH, pribeljci_2=HRHB (both match painted).
- casualties A/D 113896/158710 = byte-identical to floor.
- 0 OSID-control diffs vs floor (proven). => V1 is CALIBRATION-FLAT; periphery consumer inert at end-state.
- ALL GATES MET (>=649, 30/30, Zvornik RS, 6/6, 0 crit, sreb+zepa fall, killed identical).

## Vitest full suite (post-fix): 10 failed are ALL environment (tsx-missing/Excel) — reproduce on clean floor.
   E-B1-relevant suites: 25/25 pass (snapshot, browser-safe, priority, coherence, step-order).

## DECISION INPUT (for scenario expert)
- V1 literally passes all gates but is a NO-OP: it recovers nothing new because the target cells
  (sanica_2/pribeljci_2) are ALREADY matched at the 649 floor. The first-build NO-GO premise (those cells
  VRS-retained) was against an OLDER 647 floor; superseded.
- Variants 2 (threshold 0.6->0.5) and 3 (scope-tighten) would BOTH also be inert: end-state coherence is
  0.76/0.904 for the two Krajina corps (> 0.6 > 0.5), so the periphery penalty never trips under any of
  the three specced variants with this depth-based decay.
- To make Consumer-1 bite would require redesigning the DECAY itself (drop Krajina coherence < threshold),
  which is beyond the three specced threshold/scope variants and is a calibration-moving change of its own.

## VERDICT (scenario expert, 2026-06-08): PARK. NO PR.
- V1 is behaviorally inert (0/712 OSID diffs vs floor; hash moved only via field serialization).
  calibration.md L75: an inert change = STOP-and-investigate, NOT a ship signal.
- Three specced variants exhausted: thresholds 0.6 & 0.5 both below the realized coherence floor (0.76);
  scope-tightening only removes corps already at 1.0. Cannot make Consumer-1 bite without a DECAY REDESIGN.
- The target cells (sanica_2/pribeljci_2) are already correctly held at the 649 floor -> no calibration
  deficit remains for E-B1 to close. Deep-objective-ceiling-adjacent, like the Ključ micro-axis.
- Risk of shipping dormant: adds to AWWV's dead-wired-consumer debt (Teočak/op-history/hasAvailableSlot
  pattern). Mechanic is SOUND + historically grounded (ICTY Mladić §3437-3450, BB v2 ch28) but does not
  earn its place while inert. DO NOT merge to main.
- Decision: PARK the branch with this analysis. A future "E-B1 decay redesign" lane (drop Krajina coherence
  below threshold via a steeper/longer-onset decay) can resume from feat/eb1-corps-coherence-v2.
