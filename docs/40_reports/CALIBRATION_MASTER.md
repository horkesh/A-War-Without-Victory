# AWWV Calibration Master Reference

## CURRENT BASELINE OF RECORD — 188w 616/712, hash `deab3c26f13c3e17` (2026-06-07)

- **188w: OSID 616/712 (86.52%), anchors 28/30, benchmarks 6/6, 0 critical anomalies. Hash `deab3c26f13c3e17`.**
- **HVO west robustness re-floor `09c63bc0f06def46` → `deab3c26f13c3e17` (+2 OSID).** Routed the Glamoč/Livno shoulder (`pribelja`, `kovacevci_2`, `gubin_2`) through the deterministic Mistral 1 catalog op instead of fragile idle-brigade opportunism (historically Operation Summer '95, Gotovina OG Rujani, Jul 1995). The +2 matched = `op:sipovo:pribeljci_2` + `op:sipovo:volari_2` (RS→HRHB, painted-match); 0 OSIDs lost; both failing anchors (`brijesnica_donja_2`, `zvornik`) carry over identically; Srebrenica/Žepa still fall (§6 intact). 40w `bb0462f4d37dab2d` byte-identical (ops fire t≥160). The 1 anomaly the fix induced (`combat_ineffective_concentration` on `vrs_2nd_krajina`) is a DOCUMENTED structural artifact downgraded to `info` (the 2nd Krajina Corps was historically a hollow shell shattered by Storm/Maestral; `anomaly_detector.STRUCTURALLY_HOLLOW_CORPS_FROM_TURN`) — net 0 critical, owner-approved. The HVO liberation is now perturbation-independent, unblocking the clean Zvornik garrison lane.
- **(prior) CALIBRATION-FLAT re-floor `0abca945388ddb59` → `09c63bc0f06def46` (Ring-3 informational events).** PROVEN flat: the full 188w flips list + all three factions' control sets are BIT-IDENTICAL to the prior floor; the ONLY state delta is `military.event_fire_counts` gaining `srebrenica_column_breakout_1995: 1` + `un_safe_area_enforcement_1995: 1` (two inert `narrative`-effect timeline records that fire in the 1995 window). OSID/anchors/benchmarks/critical ALL unchanged. 40w stays `bb0462f4d37dab2d` byte-identical (events fire turn≥160, outside 40w/52w).
- **40w: OSID 653/712 (91.71%), anchors 30/30, 6/6, 0 critical. Hash `bb0462f4d37dab2d`** — restored by the COMBAT-P14 revert (#257); this CORRECTS the stale `e086afbefcef01e6` / 655 figure carried in the prior header.
- **52w: re-floored green through #260.**
- **Two failing 188w anchors:**
  1. `brijesnica_donja_2` — chronic / known (Spreča-gain lane, long-standing separate lane).
  2. `op:zvornik:zvornik` — **NEW since the 618 baseline = a REGRESSION.** Three dual-horizon fix attempts were NO-GO'd (a surgical OOB change, a `must_hold` change, and an event `control_change`). Root cause: `arbih_245th_mountain` recaptures it at ~w85 (a 2.03:1 decisive victory) and holds to w188. This is NOT a #200 side-effect (disproven) and NOT a missing initial flip — the `zvornik_takeover_1992` event DOES flip it RS at w10, but it is retaken. The fix is on the bot-AI / OOB side (245th too strong / RS Drina defender too weak / bot mis-targets); tracked open. See `docs/plans/2026-06-07-owner-decision-backlog.md`.
- **PROVENANCE — the 618 → 614 drift is AUTHORIZED v0.9.x OOB-fidelity work, not an unexplained regression.** Lineage:
  - #180 / #199 / #200 / #208 — each verified 40w-ONLY at merge (the 188w tail was never measured at the time) — landed the baseline at 613 / `2669bd0eecce5013`.
  - #256 (COMBAT-P14) moved 613 → 609; #257 reverted it byte-identical back to 613.
  - #260 (Sana) moved 613 → 614 (`0abca945388ddb59`; `budimlic_japra` recovered).
  - #261-#267 are byte-identical.
- Golden-baseline manifest (`data/derived/scenario/baselines/manifest.json`) re-floored accordingly (`npm run test:baselines` green on main).
- NOTE: the dated sections below — including the prior `618` / `a1a7c167f0b05411` header (2026-05-31), the R15 → n2003 → R-series, and the Free War / Presidential Command notes that still cite the old `a1a7c167` / `e086afbefcef01e6` baseline — are HISTORICAL / superseded by the above. This header is the current pointer.

## Free War Model — calibration is now the SIM-HEALTH check (2026-06-01)

- The **Free War Model** shipped to `main` (HEAD `2b2a7218`). New field `state.meta.decision_mode: 'historical' | 'emergent'`. **The game is the emergent war; `decision_mode='historical'` is now the internal calibration health-check** — the objective "can the engine still reproduce the real 1992–95 war?" indicator. Calibration scenarios stay `historical`.
- **All free-war work is emergent-gated**, so the baseline-of-record above is UNCHANGED and **40w/52w/188w stayed byte-identical throughout** the Free War Model phases (Phase 0 / 0.5 / 1 / 3 / 5 + distance-from-history read-model). No calibration numbers, hashes, anchors, or benchmarks moved. The 188w `a1a7c167f0b05411` / 40w `e086afbefcef01e6` baseline-of-record still stands.
- Calibration discipline is unchanged: one change per run, historical-default path, byte-identity proof. The one OWNER-gated free-war follow-up that *would* touch calibration (systematic-Drina reward neutralization) is held precisely because it moves the baseline — do not pick it up under the autonomous calibration lane without owner sign-off.
- Design doc: `docs/plans/2026-06-01-free-war-model-design.md`. Active lane: `docs/plans/COMMAND_BOARD.md` (P0 Free War Model).
- **Presidential Command Model (LOCKED 2026-06-01):** the five presidential command levers (authorize / request / stop op, elite deploy, replace CO) are **player-only / emergent-staging / byte-identical by construction → NO calibration impact** — the baseline-of-record above is unchanged. Design doc: `docs/plans/2026-06-01-presidential-command-model-design.md`.

## R15 baseline — 82.0% area-weighted (2026-05-25) [HISTORICAL — superseded]

- **NEW 188w baseline: R15 hash `59560840d2b4d976`; area-weighted match 82.0% (42072/51337 km²); count match 83.8% (597/712).** +2.8pp area over R14a (79.2%).
- Per-faction sim vs painted: HRHB 90 (painted 80, Δ +10), RBiH 301 (painted 247, Δ +54), RS 321 (painted 385, Δ −64).
- Benchmarks: 6/6. Op Sana: 16/16 objectives captured (full Una-Sana basin).
- **Change:** `BIHAC_PETROVAC_OBJECTIVES` adjacency gap repaired — removed `op:bihac:trubar` (NOT adjacent to vrtoce) and `op:bosanski_petrovac:krnjeusa`. New sequence: ripac → racic → orasac_2 → vrtoce → prkosi → vodjenica → kolonic_2 → bosanski_petrovac_2 → dobro_pelo_2 → jasenovac_2. All adjacencies verified from `operational_contact_graph.json`.
- **Regression resolved:** Bosanski Petrovac cluster (vrtoce/prkosi/vodjenica/kolonic_2/bosanski_petrovac_2) all RBiH at w188. bosanski_petrovac_2 no longer regresses to RS.
- Commit: `f8080ca4`. Run dir: `runs/apr1992_definitive_188w__b9af2327fe0c3c10__w188_n19`.
- **Note on KRAJINA mismatches:** orasac_2/racic/ripac/krupa objectives now showing painted=RS, sim=RBiH — these are correct Oct 1995 territorial outcomes from Op Sana, not present in jan1993 painted target.

## Historical-default baseline — n2003 79.21% (2026-05-23)

- **NEW 188w baseline: n2003 hash `47438d249146d1af`; spatial match_ratio 79.21%** (564/712 OSIDs). +0.70pp over n2002 (78.51%).
- Per-faction accuracy (sim vs painted target): HRHB 67.29% (86 vs 107, Δ -21), RBiH 79.07% (301 vs 290, Δ +11), RS 78.15% (325 vs 315, Δ +10).
- **Supersedes n1999 (81.18%) as the calibration reference**, even though headline match_ratio is lower: n1999 silently failed to apply 15 RBiH event consequences (Carter ceasefire, Washington Agreement, Contact Group, US 51:49 halt, etc.) because the scenario_runner defaulted player_faction='RBiH' in headless runs, queueing those events forever. n2003 ships the headless-undefined-player_faction contract (3 sites) and historical-default bot retunings — its score is honest historical fidelity.

**Headless contract (3 commits):**
- `f7c8baed` scenario_runner.ts:1412 — leaves player_faction undefined when no value authored
- `b875f95a` save_migration.ts v14 — skips backfill when headless_scenario_auto_control=true
- `0b7d0d93` validateGameState.ts — mirrors the migration exemption

Together: in headless harness runs, `playerFaction != null` evaluates false, all events route through bot auto-respond paths, no decisions queue-pending-forever.

**Historical-default retunings (commit `8c1e6f5e`):**
- `gornji_vakuf_clashes_1993`: `capital_based` → `historical` (escalate, historical Jan 1993)
- `strategic_posture_review_hrhb`: `strategic_weighted` → `historical` (press_croat_objectives, historical mid-1993)
- `ic_rbih_restraint_post_washington`: `strategic_weighted` → `historical` (acknowledge_pressure, historical post-Washington)
- `washington_agreement_1994` effects extended: morale_change HRHB +3→+8, +cohesion_change HRHB +15, +cohesion_change RBiH +5 (Federation military integration models the CB-war combat-penalty reset)

**Principle established:** Bots default to `historical` (options[0] = historical choice). Calibration is for the historical-outcome path. Non-historical paths are player + AI variation; engine handles them as designed but they are not the calibration target.

**Strategic-depth corps_asset filter fix (commit `a018f79b`):** E-B3 strategic_depth now populates on all corps (16 in n2003); was 0 in n1999/n2002 due to `kind === 'corps'` filter missing engine OOB's `'corps_asset'` tagging.

**Audit trail (commit `73f36de4`):** New `state.military.event_decision_log[]` records `{event_id, response_id, decision_source, faction, turn}` for every event-decision resolution. n2003 has 37 entries (RBiH 15 + RS 16 + HRHB 6) across decision_source `bot_v1` and `bot_political`.

**Open shortfall:** HRHB -21 OSIDs vs painted 107. Washington reset gave +3 OSID partial recovery from n2002. Remaining gap is structural (Bosnian Croat manpower limits) — next lever is expanding HV-attached brigade pool from 4 → 6-8 brigades to match Mistral 2 OG North + South + West composition (~9 HV brigades historically).

## Fall-1995 mechanics packet — n1999 81.18% (2026-05-23, superseded by n2003)

- **New 188w baseline: n1999 hash `914e6c7700f91b22`; spatial match_ratio 81.18% (578/712 OSIDs).** +2.67pp / +19 matches over n1998 (78.51%).
- Per-faction accuracy n1998 → n1999:
  - HRHB **62.62 → 77.57** (+14.95pp) — single biggest correction in any Phase since metric introduction
  - RS **76.05 → 78.10** (+2.05pp); sim count 334 → 296 reflects 2KK collapse (painted 315)
  - RBiH **80.13 → 78.06** (−2.07pp) — overshoots by 29 OSIDs (was +7); deferred E-A5 51:49 halt would cap this
- 5 new combat-math modifiers + 2 new scenario events + 5 new state surfaces. See `docs/PROJECT_LEDGER.md` entry of same date for full mechanism list (E-A1 through E-B4).
- Calibration architecture: painted file is reference-only — does NOT affect sim determinism. Goražde companion fix `5660c8ec` reverted slatina_2 + ustipraca_2 to RS (Novo Goražde muni, RS post-Dayton; VRS 1st/2nd/4th/5th Podrinje Brigades captured May 1993).
- 40w window untouched: all new events fire turn ≥ 159, byte-stable on the calibration window. All consumers gated `if (multiplier !== 1.0)`.
- Tier B follow-ups for next iteration: E-A5 launch-gate consumer (cap RBiH overshoot), E-A6 Sloboda 95 scripted op (Velika Kladuša rear-clearing precondition for Sana 95), E-B1 corps coherence decay logic (most invasive; unblocks fragmenting behavior).
- Report: `docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md` + 6 research dispatches at `docs/40_reports/proposals/20260523_RESEARCH_*.md`.

## Operation idle objective-skip repair (2026-05-22)

- Sector-operation lifecycle accounting no longer advances `current_objective_index` from idle no-movement / no-attack turns.
- Resolved combat failures still use the existing consecutive-failure objective-advance path.
- Fresh 188w `n1954` result: final hash `955c0e5fd25e97cc`; Oct 1995 painted area match 72.1%.
- Donji Vakuf finding: `donji_vakuf_95` remains active at turn 188 with 7 real attacks/captures through `prusac_2`; `jemanlici`, `korenici`, and `oborci_2` remain RS-held rather than being silently skipped.
- Baseline regression required and received a manifest refresh for expected 52w behavior-output drift.
- Residual: Donji delivery now needs real remaining-turn/objective delivery work, not lifecycle skip-through. Oct 1995 remains diagnostic-only.
- Report: `docs/40_reports/implemented/20260522_OPERATION_IDLE_OBJECTIVE_SKIP.md`.

## COHA expiry operation delivery (2026-05-22)

- `coha_expires_1995` now clears `coha_active` while setting `coha_expired`, matching the intended Cessation of Hostilities lifecycle: combat is suppressed during the ceasefire, then re-enabled after expiry.
- Operation combat diagnostics now expose live axis current objectives, resolver-seen participant attack targets, and resolver skip rows. This separates pre-resolution bot order evidence from the OSID resolver input boundary.
- Fresh 188w `n1949` result: final hash `8e701775661f0995`; final flags `coha_active: false`, `coha_expired: true`; Oct 1995 painted area match 72.4%.
- Donji Vakuf finding: accepted Donji orders now reach the resolver and record battles/captures in weeks 178-182 instead of zero-battle `attack_orders_without_battles` rows.
- Residual: Donji still does not complete the whole painted target set, and Oct 1995 remains diagnostic-only. Next lanes remain Jajce/Mrkonjic/Krajina catalog delivery and force-trajectory wiring, not painted-target promotion.
- Report: `docs/40_reports/implemented/20260522_COHA_EXPIRY_OPERATION_DELIVERY.md`.

## Operation attack-through path boundary (2026-05-22)

- Operation attack-through candidates are now bounded to targets that reduce tactical distance to the current objective through friendly or objective-controller territory.
- Fresh 188w `n1945` result: final hash `150d112d2ae6958a`; Oct 1995 painted area match improves slightly to 71.8%.
- Donji Vakuf finding: `donji_vakuf_95` remains approved but undelivered, now as clean `did_not_launch` / `no_logged_attempt` / `NO_OPENING_ATTACK:1` evidence rather than unrelated non-current attack orders.
- Baseline regression passed with no manifest update.
- Report: `docs/40_reports/implemented/20260522_OPERATION_ATTACK_THROUGH_PATH_BOUNDARY.md`.

## Operation attack-order target trace (2026-05-22)

- Weekly `operation_combat_diagnostics[]` rows now include `attack_order_targets[]` and `participant_attack_orders[]` so accepted operation under-delivery can be audited at target and brigade-location level.
- Fresh 188w `n1944` result: final hash `5766d470125f1220`, matching n1943; the change is output/reporting-only for the sim final-state hash.
- Donji Vakuf finding: weeks 180-182 target `op:donji_vakuf:komar_2` while current objective is `op:donji_vakuf:babin_potok_2`; weeks 183-184 target `op:bugojno:brizina`, `op:skender_vakuf:donji_koricani`, and `op:teslic:blatnica_2`. All traced attack targets record zero battles and do not match the current objective.
- Residual: repair the operation-pinned order-target boundary before combat odds, force-trajectory tuning, or painted-target promotion.
- Report: `docs/40_reports/implemented/20260522_OPERATION_ATTACK_ORDER_TARGET_TRACE.md`.

## Operation battle-feedback accounting (2026-05-22)

- Sector-operation result accounting now requires actual resolver battle feedback before posture beside an objective can increment failed combat attempts. Per-axis `battles_this_turn` / `total_battles` counters prevent one multi-axis battle from certifying another axis.
- `resolveAttackOrdersOsid(...)` now uses tactical adjacency, including live `war_front_edges_osid`, so resolver eligibility matches the bot and predictor boundary.
- Fresh 188w `n1943` result: final hash `5766d470125f1220`; Oct 1995 painted area match remains 71.6%. `donji_vakuf_95` still surfaces and approves at turn 177, but now exits `no_logged_attempt` / `NO-OPENING-ATTACK` instead of `max_failures`.
- Residual: weeks 180-184 still show Donji operation attack orders without battles. Next lane is final attack-order target versus participant-location/tactical-adjacency tracing, not combat odds or painted-target tuning.
- Report: `docs/40_reports/implemented/20260522_OPERATION_BATTLE_FEEDBACK_ACCOUNTING.md`.

## Donji Vakuf launch feasibility (2026-05-22)

- Scenario-runner proof mode now marks `state.meta.headless_scenario_auto_control = true`, allowing bot brigade orders for every faction in non-interactive runs while preserving desktop/player-faction exclusion.
- `donji_vakuf_95` now uses the live 3rd Corps owner, a single `op:travnik:turbe_2 -> op:donji_vakuf:komar_2` opening axis, and the documented Vlasic/Komar brigade set.
- Fresh 188w `n1941` result: `donji_vakuf_95` approves at turn 177, reaches a linked AAR, records 1 attack, and exits `failed` / `max_failures` with `UNDERDELIV:1`; reachability warnings are 0.
- Residual: this closes no-launch/no-contact classification for Donji Vakuf, not final outcome. All ten Donji Vakuf painted target OSIDs remain RS, and Oct 1995 painted area match remains 71.6%. Next lane is under-delivery/combat prediction, not catalog presence.
- Report: `docs/40_reports/implemented/20260522_DONJI_VAKUF_LAUNCH_FEASIBILITY.md`.

## Headless opportunity decision bridge (2026-05-22)

- Scenario harness runs are non-interactive, so player-faction Operation Opportunities no longer remain permanently pending when no IPC marks the review row.
- Level 1 review rows are marked with their staff recommendation, and any remaining `eligible_pending_review` opportunities are resolved with the existing deterministic bot/staff decision path under `playerFaction = null`.
- Fresh 188w `n1938` result: `sana_95` approves at turn 175 and `donji_vakuf_95` approves at turn 177 with linked AARs; opportunity proof reports `surfaced_executed: 2`, no broken AAR links, and no unlinked approvals.
- Residual: both accepted ops still fail launch/delivery (`Sana`: `NO_OPENING_ATTACK:2`; `Donji Vakuf`: `NO-CONTACT-PATH:2` / `defender_power_too_high`), and Oct 1995 painted area match remains 71.7%. Next calibration lane is launch/opening-attack feasibility, not W3 casualty schema by itself.
- Report: `docs/40_reports/implemented/20260522_HEADLESS_OPPORTUNITY_DECISION_BRIDGE.md`.

## Defender trajectory weakness predicate (2026-05-22)

- `sana_95`, `sana_95_follow_on`, and `mistral_2_95` now read VRS 2nd Krajina defender-corps trajectory when active subordinate defender brigades are present.
- The predicate combines defender `collapse_susceptibility`, inverse `operation_readiness`, and active RS equipment-quality degradation; when defender-corps evidence is absent, prior live-objective posture behavior is preserved.
- Fresh 188w `n1936` result: `sana_95` reaches eligible at turn 175 with `enemy_weakness` opened by VRS Krajina degradation; `mistral_2_95` is still blocked by Federation authorization and Kupres/Cincar staging, so W2 is not the remaining Mistral blocker.
- Report: `docs/40_reports/implemented/20260522_DEFENDER_TRAJECTORY_WEAKNESS_PREDICATE.md`.

## War exhaustion tempo threshold repair (2026-05-22)

- The attack-tempo penalty from `political.war_exhaustion` now operates in the canonical 0-100 range: drag begins above 30 and saturates at 80.
- This repairs the previous dead 500/800 threshold band while preserving the existing multiplier shape (`1.0` down to `0.85`).
- Army HQ campaign-drag readout now uses the same 30 threshold.
- Report: `docs/40_reports/implemented/20260522_WAR_EXHAUSTION_TEMPO_THRESHOLD_REPAIR.md`.

## Donji Vakuf 95 opportunity catalog fill (2026-05-22)

- `donji_vakuf_95` is now a T1 Central Bosnia operation opportunity for ARBiH 7th Corps in the September 1995 window.
- It targets the ten Donji Vakuf OSIDs that are mostly RS-held in the Apr 1995 painted map and RBiH-held in the Oct 1995 painted map, gated on Operation Storm theater rupture, Bugojno staging, live RS-held objectives, 7th Corps readiness, RBiH supply, commander state, and axis coordination.
- Single-owner cleanup: `vlasic_ridge_95` no longer exposes the spring `bugojno_support` redirect variant for Donji Vakuf cells.
- Report: `docs/40_reports/implemented/20260522_DONJI_VAKUF_95_OPPORTUNITY.md`.

## Opportunity lifecycle trace (2026-05-22)

- `state.military.operation_opportunity_traces` now records compact Operation Opportunity lifecycle rows for blocked, eligible, expired, decision, spawn-failed, approved, and T3 no-offensive outcomes.
- Calibration use: future 156w/188w painted runs can now distinguish operation catalog/gating failure from accepted-but-not-launched or accepted-and-launched delivery failure before changing late-war operation outcomes.
- Report: `docs/40_reports/implemented/20260522_OPPORTUNITY_LIFECYCLE_TRACE.md`.

## Late-war force-trajectory gating audit (2026-05-22)

- Read-only audits: `docs/40_reports/audits/20260522_OPS_FORCE_TRAJECTORY_GATING.md` and `docs/40_reports/audits/20260522_FORCE_TRAJECTORY_ENGINE_INVENTORY.md`.
- Verdict: current late-war opportunity operations are necessary but not sufficient for the Oct 1995 Krajina-collapse gap. They gate macro availability and attacker readiness, but do not yet compare attacker force trajectory against VRS defender theater degradation.
- Calibration implication: keep Oct 1995 RS diagnostic-only; do not tune outcomes from painted deltas alone. Next implementation should persist opportunity lifecycle trace rows so eligible/block/launch/validation/under-delivery cases are separable before adding `donji_vakuf_95` or a Krajina defender-trajectory predicate.

## n1932-n1935 fresh painted-compare reconciliation (2026-05-22)

- Fresh compare artifacts replace the stale n1597-n1599 diagnostic files at `tools/diagnostics/_phase5a_painted_compares/painted_{40w_jan1993,104w_apr1994,156w_apr1995,188w_oct1995}.txt`.
- Evidence runs: n1932 40w `3649b3861a87e6ea`, n1933 104w `13abfd609800bba2`, n1934 156w `fdb0f7cf25f31032`, n1935 188w `210e69404d054959`.
- Fresh headline: Jan 1993 remains strong (91.2% count / 93.2% area); Apr 1994 improves to 87.6% count / 88.5% area; Apr 1995 improves to 86.4% count / 86.8% area; Oct 1995 improves to 75.3% count / 71.7% area.
- Anchor-planning implication: Apr 1995 RS area share is now a Tier 1 contract-anchor candidate (61.0% inside the 60-67% band), while Oct 1995 RS is demoted to diagnostic-only (61.0% vs the 47-51% Dayton band). The missing Krajina-collapse / Operation Mistral-Sana-Storm mechanics dominate the Oct 1995 gap.
- Report: `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md`.

## n1918/n1919 Operation Koridor Brcko closure (2026-05-19)

- **40w run. Hash: `5c6e7b62fa6670c0`. Anchors: 27/27. Benchmarks: 6/6.** Byte-identical to n1916 because the 40w scenario already paints `op:brcko:brcko = RS`; the new Koridor objective is filtered as already controlled.
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1918`.
- **188w run. Hash: `7b57a8592f668137`. Anchors: 27/27. Benchmarks: 6/6.** This is the first clean 188w anchor sweep in the v0.9.x line.
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1919`.
- Scope: closes the chronic `op:brcko:brcko` 188w residue by adding Brcko proper to Operation Koridor's `brcko_corridor` objective contract. In n1919 the axis captures `op:brcko:brcko` at turn 5 by combat, then captures `op:brcko:krepsic` and `op:brcko:skakava_donja`; Operation Koridor ends turn 10 as a 4-star Solid Victory.
- Hash drift from n1917 is authorized under the same LANE-V09X player-faction re-anchor envelope consumed by the Teocak repair. Drift is bounded and positive for the lane: 40w remains byte-identical, 188w moves from 26/27 to 27/27 anchors, sensitive-history watched controllers for Srebrenica/Zepa/Gorazde/Teocak remain unchanged, and the known collateral `op:teslic:kamenica_2 = HRHB` remains a non-anchor/non-benchmark minor residue to watch in later front-edge calibration.
- `validate_run_consistency.cjs` on n1919 exits nonzero with 49 long-run structural sector/intel signals; this is not a determinism pass. `diagnose_run.cjs` reports 0 errors / 26 warnings. Golden baseline comparison passes with the preserved four-artifact manifest; an `UPDATE_BASELINES=1` probe produced no existing tracked-hash changes, so no manifest refresh is committed.
- Report: `docs/40_reports/implemented/20260519_OPERATION_KORIDOR_BRCKO_CLOSURE.md`.

## n1916/n1917 Teocak singleton enclave repair (2026-05-19)

- **40w run. Hash: `5c6e7b62fa6670c0`. Anchors: 27/27. Benchmarks: 6/6.**
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1916`.
- **188w run. Hash: `6dcf925afdb30e3b`. Anchors: 26/27. Benchmarks: 6/6. Sole failure: `op:brcko:brcko` (chronic, deferred).**
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1917`.
- Scope: closes the `op:ugljevik:teocak_krstac_2` 188w anchor regression introduced by `04c750e3` (player_faction default fix) by adding Teocak as a singleton ENCLAVE_DEFINITIONS entry mirroring the existing Žepa pattern. Mechanically analogous to Žepa: lone Bosniak holdout near Ugljevik/Majevica, 255th Slavna Mountain Brigade "Hajrudin Mesić" garrison, BB1 p.509.
- Hash drift authorized by 04c750e3's "Re-anchor pending under LANE-V09X-PLAYER-FACTION-CONTRACT if drift exceeds noise" handoff. test:baselines refreshed (4-artifact trim preserved per Batch 20 precedent). Sensitive-history regression suite 41/41 PASS; sensitive-history surfaces (Srebrenica/Žepa/Goražde controllers + rupture event status) unchanged vs prior baselines.
- Brcko residue documented as a separate STOP-AND-ASK lane in `docs/40_reports/audits/20260519_LATE_WAR_188W_ANCHOR_RESIDUE.md`.
- Commit: `efec3323`. Branch: `codex/late-war-188w-anchor-repair-2026-05-19`.
- **2026-05-19 Brčko diagnostic update (Batch D, audit §10):** Mechanical inspection of n1917 artifacts proves the prior Batch A hypothesis was wrong — RS never captures `op:brcko:brcko` in 188w. Zero control_events for that OSID across 188 turns; initial controller RBiH, final controller RBiH. Operation Koridor's `brcko_corridor` axis omits `op:brcko:brcko` itself from its objectives and collapses (`launch_blocker: zero_eligible_axis`, 0 captures, 641 KIA / 1175 WIA) against the 2 RBiH peripheral OSIDs (`krepsic`, `skakava_donja`) it does target. The 40w anchor passes because the 40w scenario paints brcko = RS at turn 0 via `initial_osid_controllers` / `osid_control_overrides`; the 188w scenario lacks those keys by design. Decision: STOP-AND-ASK (no code, no scenario, no canon edit) — adding brcko to the axis cannot succeed without also strengthening the axis (broader retune), which crosses the lane's explicit STOP gate. Decision packet (4 follow-up options) recorded in audit §10.

## n1867/n1868 RBiH-HRHB Phase C + supply closure integration probe (2026-05-17)

- **40w integrated-context run. Hash: `583aaa2f33875d8c`. Anchors: 27/27. Benchmarks: 6/6.**
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1867`.
- Scope: RBiH-HRHB Phase C2-C5 formation diversion, bilateral displacement cascade, ceasefire redeployment, Washington mixed-municipality restoration/joint pressure, supply-design completion Tasks 5-6, and strict-null Phase 1 validator narrowing on top of the n1864 implementation wave.
- **188w integrated-context run. Hash: `3700a34cd255c99c`. Anchors: 25/27. Benchmarks: 6/6.**
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1868`.
- Late-war caveat: failed anchors remain `op:ugljevik:teocak_krstac_2` and `op:brcko:brcko`; this is still the inherited late-war drift class, not a clean accepted endgame replacement for n1844.
- Strict-null caveat: Phase 1 reduced state-validator escape hatches without save-shape/default changes. Optional `GameState` field promotion remains blocked on explicit save migration/default decisions.

## n1864/n1863 integrated supply/paramilitary/fatigue/RBiH-HRHB wave (2026-05-17)

- **40w integrated run. Hash: `c0d8212847398b8f`. Anchors: 27/27. Benchmarks: 6/6.**
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1864`. Matches the lane-local n1862 hash.
- Scope: RBiH-HRHB Phase B territorial incidents and Phase 0 handoff, supply-design diagnostic/live-truth/bot-awareness work, paramilitary consequence/flavor phases, fatigue Owner D late-war exhaustion residue, and strict-null inventory baseline.
- **188w integrated run. Hash: `c757c82da8cd8b67`. Anchors: 25/27. Benchmarks: 6/6.**
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1863`.
- Fatigue evidence: sector-front `pct_zero` improved from `100.000` to `58.416`, inside the selected 40-70% design band and above the 30% over-correction stop gate.
- Late-war caveat: Teocak/Brcko remain the inherited current late-war drift profile from the dirty n1847/n1854 line, not a new 40w anchor regression. Srebrenica remains not all-RS at 188w, with residual review risk recorded in the fatigue report.

## n1853/n1854 integrated B3/Sarajevo/embargo wave (2026-05-17)

- **40w integrated run. Hash: `c16ba5bc33b79277`. Anchors: 27/27. `diagnose_run.cjs`: 0 errors / 28 warnings. `validate_run_consistency.cjs`: PASS.**
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1853`.
- Scope: B3 negotiation counter-offer docket, Sarajevo Branch B numeric override substrate, and RBiH arms-embargo phase resolver/events/caps.
- **188w integrated run. Hash: `1f81ab4263ace3e9`. Anchors: 25/27, failed `op:ugljevik:teocak_krstac_2` and `op:brcko:brcko`. `diagnose_run.cjs`: 0 errors / 29 warnings. `validate_run_consistency.cjs`: 52 failures.**
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1854`.
- Attribution note: the 188w Teocak/Srebrenica drift matches the earlier rejected dirty n1847 line (`4d4bd75c1c6739de`, 25/27 anchors). Local probes with neutralized embargo caps (n1855) and disabled B3 counter-offer phase (n1856) produced the same hash as n1854, so this wave records the inherited late-war follow-up instead of reclassifying it as an embargo/B3 regression.

## n1848 integrated 40w logistics/save-migration proof (2026-05-17)

- **40w integrated run. Hash: `c09a498b7dc9ccae`. Anchors: 27/27. Benchmarks: 6/6. `diagnose_run.cjs`: 0 errors / 28 warnings. `validate_run_consistency.cjs`: PASS.**
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1848`.
- Control alignment matches the preceding n1846 timing run counts: HRHB 87, RBiH 254, RS 371 against the Jan 1993 target universe. The final-save hash changes under the schema-v12 save/output contract; do not interpret the hash delta alone as a logistics-priority behavior drift.
- Scope: integrated verification after Logistics Priority canonical path wiring and save migration hardening. No priority is staged in the default scenario, so the command lever is neutral (`1.0`) during this run.

## n1844 accepted 188w endgame evidence (2026-05-17 verification)

- **188w accepted artifact. Hash: `ccd3f9f770052614`. Anchors: 26/27, failed `op:brcko:brcko`. Benchmarks: 6/6.**
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844`.
- Verification report: `docs/40_reports/audits/20260517_ENDGAME_188W_VERIFICATION.md`.
- Baseline correction: the older n1741 tuple `a4bf8b8095050881` is retained as historical evidence, but the 2026-05-17 endgame-verification lane accepts n1844 as the current documented 188w artifact. The dirty-worktree n1847 artifact (`4d4bd75c1c6739de`, 25/27 anchors) is rejected.
- Signals to route into follow-up lanes: Sarajevo attacker:defender casualty outlier, absent serialized `patron_pressure` despite persisted patron relationship state, RS/HRHB late-war personnel growth, fatigue collapse, and HRHB morale/officer-quality inverse trends. The four checked P0s remain latent at t188.

## n1840 formation-life active-never-fights classification (2026-05-15)

- **40w retained run. Hash: `0cb626c032204372`. `diagnose_run.cjs`: 0 errors / 29 warnings. `validate_run_consistency.cjs`: PASS.**
- `brigade_never_fights` was detector-split without behavior change: loan=3, operation_participant=4, sector_front=61, sector_reserve=3, sector_rear=7.
- Calibration implication: do not tune global combat, personnel, reconstitution, HRHB/HVO gates, or formation lifecycle from the blended aggregate. The next behavior packet should trace the 61 `sector_front` cases against pressure, stance, objective selection, and target scoring.
- Report: `docs/40_reports/implemented/20260515_ACTIVE_NEVER_FIGHTS_INTERPRETATION.md`.

**Purpose:** Persistent lessons-learned record for war-phase calibration (April 1992 onward). 40w primary, 104w force trajectory.
**Updated:** 2026-05-10 (post-force-quality reassessment on n1768 40w + n1741 188w artifacts)

## n1729 (2026-05-07) — 188w post-5-lane

- **188w. Hash: `e85303890ff4b601`. 26/27 anchors. 5/6 → 6/6 benchmarks post RBiH-t40 reanchor (`d377e07b`). §6 floors PASS.**
- Lanes contributing on top of `e4c661d5`: 5-lane batch (NW Bosnia OOB `be7e0715` + Persona prompt restructure `cb13e605` + SRK siege-morale `aa115a99` + JNA withdrawal consequences `ecae99da` + Jajce cascade `ec837dca`) + 3-lane backlog closure (RBiH-t40 reanchor `d377e07b` + SRK siege Phase 0 DDR `bb0e449e` + Stupčanica name-collision fix `759a35cd`).
- Persona system observable via `data/derived/_debug/d_lane_persona_decisions.jsonl` when env flags set (`CLAUDE_AS_PRESIDENT_*` / `CLAUDE_AS_COMMANDER_*` / `CLAUDE_AS_CORPS_*`). Default OFF — byte-stable.
- D3.3 v2 triage: 253 LLM observations across full-stack persona; ~11.5% genuine signal rate (statistically indistinguishable from API-Bridge baseline 12-15%); persona shifted SHAPE of noise, not QUALITY. No commander cited ICTY/BB volume in any of 253 observations.

## n1728 (2026-05-07) — 40w post-5-lane

- **40w. Hash: `79fa407377b40083`. 26/27 anchors. 6/6 benchmarks (post RBiH-t40 reanchor `d377e07b`).**
- Source commits: 5-lane batch (`be7e0715` NW Bosnia OOB + `cb13e605` persona prompt + `aa115a99` SRK siege-morale + `ecae99da` JNA + `ec837dca` Jajce) + 3-lane backlog (`d377e07b` benchmark reanchor + `bb0e449e` SRK siege DDR + `759a35cd` Stupčanica name-collision).
- **Q1 hvo_northwest_bosnia engine-gate fix REVERTED at `8ccdbff8`** (-17% RBiH territory loss from deferring all 5 HVO OZ corps to w10). Proper fix at Lane 2 (`be7e0715`) is OOB-data alignment per BB1 p.181-182 (3 brigades + corps `available_from` reset).
- **Stupčanica name-collision discovery (`759a35cd`):** "Operacija Stupčanica" was in bot-pool `operation_names.ts` despite the file's own comment claiming exclusion. Bot ops at any turn could be assigned the canonical name → phantom canon-violation in AARs. Fix removes the literal from the pool. Reinforces SENSITIVE_HISTORY_DESIGN_GATE data-comment alignment principle.
- **D-lane Claude-roleplay-as-all-3-layers (`e25c18c3` + `deeff462` + `bfcc9258` + `59805cd6` + `a2d564e6`):** persona infrastructure + run orchestration + telemetry side-channel; A1-A5 + B1-B2 + C1-C2 + D1-D2 + API-Directive Bridge. Per-layer × per-faction env flags; auto-swap on A4 roster.
- Realm vs side-effect-suppression discipline: 5-lane batch had Stupčanica appear absent in n1728 window via cohesion/morale/stance shifts; proper-fix lane refused to declare resolution and went hunting for the actual cause (KNOWLEDGE entry "Side-effect suppression is NOT a canonical resolution").

---

## Trip Session 2 Run Trail (2026-05-03, on top of `e4c661d5`)

| Run | Hash | Lane | Verdict | Notes |
|---|---|---|---|---|
| **n1627** | `a2a51d4a9994a7f5` | R2 six-lane (R2-1+R2-2 engine) | NARROW BEHAVIORAL DRIFT (calibration-flat) | orders 134→131 (RS −2 / RBiH −1 / HRHB 0); flips_applied 43=43; control_alignment BYTE-IDENTICAL; anchors 26/27 (same brka_2 carryover); benchmarks 6/6; defender casualties −2,979; defender_present_battles 84→73. Drift shape consistent with R2-1 must_hold tightening; R2-2 events inert in 40w. /war-or-game: SHIP. |
| **n1626** | `876597582e7ae8f7` | R2-4 perf baseline | Audit-only (instrumentation reverted) | Per-turn mean 3,094 ms (30.9× over <100ms target); supply-osid 18.2%; bot orders 562ms combined; 5.6MB/turn RSS growth from 286MB cold to 510MB peak. P0 flagged: every turn >1s. Audit: `docs/40_reports/audits/20260503_PERF_BASELINE_ROUND2.md`. |
| **n1625** | `8c33da5b1f2ba80b` | A2-only baseline (N4 engine stashed) | Reference baseline | Used to isolate N4 contribution from A2 contribution. Confirms N4 with flag OFF is byte-identical at behavior layer (only 4/313 formations differ — `morale_low_streak` field additive). |
| **n1624** | `3b0426b1ca73a547` | N4 morale-collapse override (flag OFF) | STATE-SHAPE-ONLY DRIFT | 313/313 formations match; only `morale_low_streak` field present on 4 records (values 0, 9, 10, 11). Headline behavior IDENTICAL to predecessor. Foundational claim of "B" approval honored. |

## Trip Session 1 Run Trail (2026-05-02, on top of `45d39ad7`)

## Review Methodology

Every calibration run is reviewed by a two-tier expert panel before any action is taken.

**Tier 1 — Investigators** (read raw run data, report facts):
`/scenario-creator-runner-tester`, `/anomaly-triage`, `/war-or-game`, `/operations-expert`, `/sector-expert`, `/formation-expert`, `/historian`

**Tier 2 — Analysts** (read Tier 1 reports, propose solutions):
`/gap-finder` *(unique authority: may dispatch agents + question specialists directly)*, `/game-designer`, `/corps-army-commander`, `/modern-wargame-expert`, `/canon-compliance-reviewer`

**Orchestrator** synthesizes, gives go/no-go, updates this file + PROJECT_LEDGER.md.

## Painted Target Workflow

Scenario evaluation must compare against the painted control target for the scenario date, not against Jan 1993 by habit.

Current built-in target slots:

| Target | Intended use | OSID universe |
|---|---|---:|
| `jan1993` | 40w / early-war baseline yardstick | 712 |
| `apr1994` | April 1994 scenario-health evaluation | 712 |
| `apr1995` | April 1995 scenario-health evaluation | 712 |
| `oct1995` | October 1995 / late-war endgame evaluation | 712 |

Use:

```bash
node tools/compare_painted_vs_sim.cjs runs/<run_dir> --target apr1994
node tools/compare_painted_vs_sim.cjs runs/<run_dir> --target apr1995
node tools/compare_painted_vs_sim.cjs runs/<run_dir> --target oct1995
```

The painter UI loads 744 operational geometry features, but the current simulation controller/evaluation universe is 712 OSIDs. Built-in painted targets must stay aligned to the 712-key Jan 1993/current-sim universe until the political-controller substrate is intentionally expanded. Geometry-only exposed features are a map/substrate backlog item, not scenario-date variation.

Relevant report: `docs/40_reports/implemented/20260430_SCENARIO_PAINTED_CONTROL_TARGET_TOOL.md`.

## Open P1: Force-Quality Trajectory Calibration

**Opened:** 2026-05-01
**Plan:** `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`
**Audit status:** Required broad audit packet complete as of 2026-05-10. Current report: `docs/40_reports/audits/20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md`.

The current long-run evidence suggests the engine is under-realizing the full-war faction arcs recorded later in this file:

- **VRS:** professional / JNA-inheriting army -> degraded but still locally dangerous force.
- **ARBiH:** 1992 militia / Territorial Defense fragments -> competent 1995 corps-level army.
- **HRHB/HVO:** capable militia -> overstretched and increasingly dependent on Croatian support.

Late-war painted targets and operation experiments are evaluation tools, not the fix. If 1994-1995 territorial movement only appears when historical operations are forced as naked calendar scripts, then the deeper calibration failure is the force-quality trajectory model: officer learning/brain drain, cohesion/morale, equipment maintenance, war exhaustion, operation-readiness gates, corps coordination, and commander doctrine are not yet producing enough asymmetric change over time.

**Classification:** separate calibration/design issue, not a scripted-op content issue. The broad Force Quality Trajectory Audit is now complete on current artifacts; next work should be focused owner lanes, not another broad audit. Current evidence says RBiH professionalization and RS officer degradation are visible, while the unresolved gaps are RS/HRHB average personnel growth, fatigue reset, HRHB late-war shape, and late-war operation capture delivery. Do not apply global multipliers or forced late-war map rails without owner-specific evidence.

## n1622 (2026-05-02) — B-1 PLANNING_INVALIDATED_COOLDOWN behavioral surface

- **40w post-fix smoke. Hash: `322bb9ed33e30006`. Drift from predecessor 40w lineage `0c2fc264112dec1f`.**
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1622`
- Lane: `4ed59457` `feat(combat): planning_invalidated feeds CO objective-failure cooldown`. Removed the explicit `planning_invalidated` skip in `sector_offensive.ts:322 recordFailedObjectives` so failed planning ops feed the existing `failed_offensive_objectives` cooldown (threshold=2, 8-turn cooldown). Bounds the 6× re-emission loop observed at vrs_1st_krajina/Doboj corridor in n1621 (Operacija Jesen/Hrast/Gvožđe/Obruč/Štit/Sadejstvo all `planning_invalidated`/0 attacks against identical target_osids).
- **Faction-balanced delta** (per /canon-compliance condition 1): pre-fix n1620 RS=3/15 ops; post-fix n1622 RS=3/15 ops — identical raw count in 40w window. The fix doesn't suppress nor introduce events; it bounds RE-EMISSION (visible only over longer 188w window). Hash drift comes from new `failed_offensive_objectives` entries persisted on CorpsCommandState.
- **Registered behavioral consequence** (anticipated by /game-designer pre-merge gate "Could shift brcko/gradacac_2 anchors — both already P0/P1 watch items"): `op:brcko:brka_2` flips RBiH→RS at 40w. Surfaced as `tests/integration_deployment_health.test.ts` failure post-vitest-baseline; also drove `tests/scenario_golden_baselines_h2_3.test.ts` activity_summary hash mismatch. Golden baseline manifest refreshed in `018cacd3` as canonical maintenance. **brcko anchor still requires /scenario-tester + /historian verdict** — is RS-control the honest emergent outcome of bot AI no longer spam-attacking hardened OSIDs, or sim regression? Open at end of trip session 1.
- Pre-merge gate verdicts: /game-designer APPROVED (§ 8.3 (a) honest mechanic, predictor-honesty parity); /canon-compliance-reviewer APPROVED-CONDITIONAL (Engine Invariants / Phase Specs silent on cooldown semantics; Systems Manual §6.4 distinction is DIAGNOSTIC not COOLDOWN; conditions honored — faction-balanced delta + §6.4 propagation).
- Lane tests 4/4 GREEN; focused regression 120/120 across 12 suites; tsc clean. Report: `docs/40_reports/implemented/20260502_PLANNING_INVALIDATED_COOLDOWN.md`.

## n1621 (2026-05-02) — A1 PER_TURN_BRIGADE_SNAPSHOT (observability null-result)

- **188w. Hash: `4ba56cfd4fae9824`. BYTE-IDENTICAL to predecessor n1619 lineage** (expected null result for observability-only lane).
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1621`
- Lane: `fb847504` `feat(harness): per-turn brigade-keyed snapshot emit`. Added pure observability emit `<run_dir>/brigade_temporal_log.jsonl` (20 fields per row × per brigade × per turn). Closes the artifact gap that previously blocked classifying "active throughout but absent from late-game ops" brigades.
- Hash byte-stability confirmed by /scenario-creator-runner-tester: GameState unchanged because the emit is harness-side only. Cost ~10-20 MB at 188w (within `weekly_report.jsonl` precedent).
- This run is the post-A1 evidence base used by Mission B Tier 1 panel (7 specialists in parallel) for the 4 lanes that followed (B-1, B-2, B-3, D#1).
- **Diagnostic suite snapshot:** Srebrenica RS=1/11, Žepa RBiH=1/1, srebrenica_genocide_1995 NOT FIRED. Krivaja-95 force_ratio 0.094/0 attacks (planning_invalidated). Stupčanica-95 force_ratio 0.831/1 attack (max_failures). 8 DELIV / 11 UNDERDELIV / 23 NO-CONTACT-OTHER / 4 NO-CONTACT-PATH / 5 PRE-FRIENDLY ops. 6/6 bot benchmarks PASS. 0 errors / 25 warnings (diagnose_run). 42 failures (validate_run; 3 undefended subsegments + ~10 adjacent uncontested territories — all attributed by /sector-expert to vrs_drina hollowing + corps misallocation, not sector-system bugs).
- Sensitive-history `OPEN_P0` carries unchanged from predecessor n1619. Named successor lanes either § 6 BLOCKED (OOB Skelani re-seeding, atrocity rupture predicate) or Ring 3 BLOCKED (bot-AI roster awareness — god-mode hindsight per /game-designer).

## n1572 (2026-04-14) — Exhaustion Rescale + HRHB Directive Scope + Pressure Floor

- **93.6% area-weighted. 27/27 anchors. 6/6 benchmarks. Hash: bd7e8d59508b858a.**
- Run dir: `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1572`
- Changes: (1) Fix 1A — `situation_score` exhaustion rescaled from 0-100 clamp to /6 normalization (values ~400 at w40 now read as ~67, not 100). (2) Fix 3 — HRHB patron directive per-corps scope: Posavina exempt from defensive ceiling, Herzegovina/Central Bosnia/Tomislavgrad scoped individually. (3) Fix 1B — negotiation pressure erodes RS territory floor gap (up to -15pp at pressure ~4000).
- HRHB attack orders: **6** (was 2 in n1570). Posavina no longer capped at defensive — historically correct.
- Calibration improved +0.1pp (93.6% vs 93.5%). Zero regressions.
- n1571 (Fix 1A alone): same hash as n1570 — zero-delta for 40w (peace plans not evaluated in this window).

## n1570 (2026-04-14) — jajce_falls turn_min Historical Correction

- **93.5% area-weighted. 27/27 anchors. 6/6 benchmarks. Hash: 6810f0c64713e7f6.**
- Run dir: `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1570`
- Changes: `jajce_falls_1992` event `turn_min` 40→28 (historical fall Oct 29, 1992 ≈ w28). Plus: stale ssid safety net in `final_sector_truth_reconciliation.ts` (zero-delta in practice).
- Event now fires at turn 28 (was unreachable before turn 40). All 10 Jajce OSIDs RS-controlled — historically correct.
- Zero calibration regression from n1568/n1569.
- 0 critical anomalies, 1 warning, 7 info.

## n1568 (2026-04-14) — Exhaustion Commander Wiring

- **93.5% area-weighted. 27/27 anchors. 6/6 benchmarks. Hash: cd3083a0295af31b.**
- Run dir: `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1568`
- Changes: `faction_war_exhaustion` wired into commander plan scoring via `factionExhaustionDrag` multiplier (1.0 at 0 exhaustion → floor 0.3 at 600+). Offensive intents (`stage_operation`, `launch_opportunity`) now suppressed as nation exhausts. Defensive intents unaffected.
- Hash changed from previous baseline — confirms real behavior change. Zero calibration regression (93.5% vs previous ~93.2%).
- 0 critical anomalies, 1 warning (thin arbih_1st_corps:11 sector — accepted variance), 7 info.
- 0 invalid operations, 0 zero-eligible-attacker operations (historic low).
- 94 total battles (74 defender-present), 125 attack orders (RS=112, RBiH=11, HRHB=2), 44 flips.
- Battleless weeks: 0, 24, 32-39. Late-war quiet period (w32-39) is the exhaustion drag producing natural operational tempo decay — historically plausible for late 1992 front stabilization.
- War exhaustion at w40: RS=400, HRHB=400, RBiH=271.
- **No panel dispatch** — this is a nightshift campaign run. Raw data collected and compared. No P0/P1 regressions.

## n1302 (2026-04-02) — NEW ATH
- **93.7% area-weighted. 25/25 anchors. 6/6 benchmarks. Hash: 0cf989330bd36cc8.**
- Run dir: `apr1992_definitive_40w__d452d2a10f3d69af__w40_n1294`
- Changes: Commander Intelligence Overhaul n1294–n1301 — must_hold wiring (Brcko/Doboj 1.5× garrison), org readiness gate, op scale cap by main_effort_count, enemy_concentration_zones from intel, multi-brigade coordination ±4%/pt officer competence, strength-based opportunity target ranking.
- gradacac_2 **PASS** (was failing n1290–n1293, recovered). vozuca_2 **PASS** (was failing n1293, recovered).
- DRINA regressed ~1.5pp (86.6%) — RS overcapturing Bratunac/Foča/Rogatica/Srebrenica/Višegrad/Vlasenica. Possible cause: must_hold corridor changes freed Drina Corps brigades.
- ZEA rate elevated: 47% (was ~39% at n1281). Op-scale cap narrowing eligible attacker pools may be a factor.
- Order counts identical to n1289: RS=62, RBiH=22, HRHB=7, 91 total, 32 weeks with orders.
- ~~P1 open: Casualty ratio discrepancy~~ — **RESOLVED 2026-04-14.** Root cause: anomaly detector counted frontline friction engagements (battle_id `*:friction:*`) mixed with battle casualties. Fix: filter friction out, report separately. The two sources now measure the same pool.
- **P1 open:** 112 adjacent-uncontested OSIDs (pre-existing brigade concentration thinning).
- **WOG verdict: APPROVE WITH CONCERNS.** No P0 blockers.
- Commits: c63c2313 (n1294–n1296) + b0d06442 (n1297) + 6f6f3c52 (n1298) + 0f3b05df (n1299) + ce6f2b97 (n1300) + fe7c5630 (n1301).

---

## n1293 (2026-04-02)
- **~93.2% area-weighted. 23/25 anchors (gradacac_2 pre-existing + vozuca_2 NEW). 6/6 benchmarks. Hash: 594bffac65edb783.**
- Change: `preparation_max_turns = max(getPreparationMaxTurns(aggressiveness), op.planning_duration ?? 0)` in `tickPreparation()`. Pre-planned ops now honour their declared window as a minimum floor. `planning_duration` 5→7 on Op Teočak. `arbih_120th_liberation_black_swans` restored to axis.
- Op Teočak fires at w22 (7 turns from injection). `was_concentrated: true`. rastosnica_2 = RBiH. ✓
- New FAIL: vozuca_2 (RS→RBiH). Root cause: seam between arbih_2nd_corps and arbih_3rd_corps AoR. Op Teočak's 4-week delay freed 2nd Corps brigades during w18–22, which auto-generated ops targeting vozuca_2 (on the 2nd/3rd Corps boundary). Under investigation.
- Assembly zone corps-wide expansion (n1291) confirmed inert — identical hash, reverted.
- **Doboj/Ozren investigation (2026-04-02):** Full panel analysis of boljanic_2 persistent FAIL and Ozren pocket collapse.
  - **boljanic_2 (Doboj city) root cause confirmed:** `arbih_3rd_corps` auto-generates ops that pick up `boljanic_2` via adjacency walk from `petrovo_2` (Gračanica — RS-held Ozren foothold). `findTargetOsidsFromMunicipalities()` has no depth filter. `vrs_1st_krajina` directive has no `hold_osids` for Doboj OSIDs — garrison budget gets drained north by Posavina corridor ops. `rs_2nd_armored` brigade displaced to petrovo_2 (856 pers, morale 35) — only `rs_1st_krnjin` defending boljanic_2 against 15-brigade ARBiH operation; falls turn 31.
  - **Ozren pocket collapse (all 4 RS positions flip):** `petrovo_2` (1st Ozren home), `brijesnica_donja_2` (2nd Ozren home), `vozuca_2` (4th Ozren home) all flip RBiH. Historical: Ozren pocket fell September 1995 (Operation Farz) — well after 40w window. Falling by w31 is a ~3-year acceleration. Root cause: no dedicated garrison protection for the 4 Ozren brigades' home OSIDs.
  - **Anchor gap:** `petrovo_2` and `brijesnica_donja_2` are NOT in `HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992`. Only `vozuca_2` is anchored. Fix direction: add both as `expected_controller: 'RS'` anchors.
  - **Fix directions:** (1) Add Doboj OSIDs to `vrs_1st_krajina` `hold_osids` directive. (2) Add `petrovo_2 → RS` and `brijesnica_donja_2 → RS` to anchor array in `scenario_runner.ts`. (3) Fix seam between 2nd/3rd Corps for vozuca_2.

---

## n1289 (2026-04-01)
- **93.2% area-weighted. 25/25 anchors (HISTORIC FIRST — all passing including brcko). 6/6 benchmarks. Hash: a95995f2b1ab899c. Commit: a61a8344.**
- Changes: 7 combat factor gaps (P1–P4, P7, P8, P10) + sector merge guard (`areSectorsFrontEdgeAdjacent`)
- brcko P0 resolved by P1 (defensive fire) alone — no must_hold needed
- Open P0s: gradacac_2 (RS overperforming, pre-existing)
- Open P1s: vrs_east_bosnian ZEA, estimateTurnsActive suspend counter, HRHB patron directive, jajce turn_min 40→28, 3 stale ssid refs, P5/P6/P9 deferred

---

## n1288 (2026-04-01)
- **93.3% area-weighted. 23/25 anchors (brcko recovered, gradacac_2 fail). 6/6 benchmarks.**
- Change: sector merge guard first pass — `frontEdgeAdj` dead local promoted to active parameter
- brcko recovered vs n1287; Herzegovina cross-sector merge still present

---

## n1287 (2026-04-01)
- **92.8% area-weighted. 23/25 anchors. 6/6 benchmarks. Hash: 25ef181d6e3daaae.**
- Change: ready-plan suspension fix — `ready` plans excluded from `checkSuspendConditions`; brigade depletion check uses brigade existence not surplusPool
- brcko still failing: uncontested occupation at t29 (garrison density, not ops). Run D needed.
- Secondary bug identified: `estimateTurnsActive` broken suspend counter — plans can't self-abandon via MAX_SUSPENSION_TURNS.

### Root cause: brcko P0 (definitive)
`op:brcko:brcko` falls via uncontested occupation at t29. No ARBiH operation — simply no RS defender present. Corridor zone: 3 brigades, garrison_budget=3, zero surplus. Brigades distributed to tisina, potocari_2, krepsic; none covers brcko itself. Bijeljina zone has 5 surplus brigades but wrong zone. Fix: Run D — `must_hold: true` on brcko corridor sector in scenario JSON.

### Historian verdict (ICTY)
Brčko held RS continuously from ~1–3 May 1992 through January 1993. ARBiH never retook it. Posavina Corridor never cut. Sources: *Jelisić* TJ §§24–27, *Todorović* SJ, Burg & Shoup pp.130–134. brcko=RBiH at w40 is historically wrong — P0 is valid.

### Open P0s after n1287
1. **brcko** — corridor garrison density. Fix: must_hold=true on corridor sector (Run D).
2. **gradacac_2** — RS overperforming on newly-covered fronts. Pre-existing.

### Open P1s after n1287
- vrs_east_bosnian zero-attacks: all non-Koridor ops total_attacks=0. BFS reachability or stale objective filter. Part of 39% ZEA anomaly.
- `estimateTurnsActive` broken suspend counter: suspendedTurns goes negative, plans can't self-abandon. Hardening pass.

---

## n1284–n1285 (2026-04-01)
- Both identical hash 4f1e6cd04e3835e9. Zero delta. Fixes were no-ops (code already correct, or wrong code path targeted).

---

## n1283 (2026-04-01)
- **92.7% area-weighted. 23/25 anchors. 6/6 benchmarks. Hash: 4f1e6cd04e3835e9.**
- Change: stance screening gate — `threat_ratio < 1.5` required for `screening` in `computeStanceChanges`
- Recovered: boljanic_2. Failing: brcko, gradacac_2.
- RBiH orders 29 (down 3), RS 57. Stance fix working: vrs_east_bosnian all sectors → defend.

---

## n1282 FIX 1 — DEPLETION LOOP REPAIR (2026-04-01)
- **92.7% area-weighted (40w). 22/25 anchors. 6/6 benchmarks. 84 battles.**
- **final_state_hash: 2bcd55343b6fb99f**
- Orders by faction: RS=60, RBiH=32, HRHB=9 (total=101).
- RBiH orders recovered from 23 (n1281 collapsed) to 32 (+39%). No territorial overcorrection.
- Benchmarks held 6/6. Area flat vs n1281. ZEA marginal improvement: 157→142.
- **brcko re-failed** (23→22 anchors). Hypothesis: Fix 1 lowered MIN floor for ALL factions; thin RS Brčko corridor ops (now 2-brigade viable) may be pulling garrison brigades into attack, leaving brcko under-defended. Investigation needed.

### Change vs n1281
`emit.ts buildOperations()`: `MIN_BRIGADES_FOR_PLAN` floor lowered to 2 when `primarySector` is identified (was 3 unconditional). Without an anchor (fallback path) the corps-wide floor of 3 remains. The force_ratio_estimate predictor handles thin ops at execution via shorter predicted_max_turns.
`tests/integration_formation_integrity.test.ts`: Added `DISSOLUTION_PERSONNEL_CAP` guard — brigades above 800 personnel are demoralized but not dissolved (mirroring actual dissolution logic).

### Open P0s after n1282
1. **brcko** (`op:brcko:brcko`) — re-failed after n1281 recovery. Hypothesis: thin 2-brigade RS ops in Brčko corridor draining garrison. Investigate RS op pool selection near Brčko.
2. **boljanic_2** — ARBiH operational pressure on Doboj, insufficient RS garrison. Pre-existing.
3. **gradacac_2** — RS overperforming on newly-covered fronts. Pre-existing.

---

## n1281 SECTOR-ANCHORED LAUNCH CONTRACT (2026-04-01)
- **92.7% area-weighted (40w). 23/25 anchors. 6/6 benchmarks.**
- **final_state_hash: a968a166ebc237a6**
- Net +2 anchor recoveries vs n1280: brcko (`op:brcko:brcko`) ✅, rastosnica_2 ✅.
- Persistent failures: boljanic_2, gradacac_2 (pre-existing P0s, unrelated to this change).

### Change vs n1280
`emit.ts buildOperations()`: primary sector now determined FIRST; participant pool derives from that sector's assigned brigades (∩ surplusSet ∩ reachable). Adjacent-sector brigades may attach up to `ADJACENT_SECTOR_ATTACH_RATE=0.33` of their assigned count (≥1 residual left behind). No corps-wide broad-pool fallback. New `CorpsOperation` fields: `primary_sector_brigades`, `attached_brigades`, `supporting_sector_ids`, `reinforcement_source`. UI: "Sector Anchor" block in `OperationDetail.tsx`.

### Anomaly: Zero-Eligible-Attacker Ops
157/402 operations (39%) executed with no eligible brigades. Sector scoping correctly restricts the pool but some ops now launch against a sector anchor whose assigned brigades are all in-transit, disrupted, or otherwise unavailable at execution time. Not a gate failure; warrants follow-up investigation.

### Open P0s after n1281
1. boljanic_2 — ARBiH operational pressure on Doboj, insufficient RS garrison. FAILED APPROACHES: Phase B corps-wide check, Phase B sector-wide check, sub_segment first-pass penalty. Next: Proposal 3 (commitment-ratio Phase B eligibility filter) OR investigate ARBiH 2nd Corps op targeting.
2. gradacac_2 — RS overperforming on newly-covered fronts; sector assignment scope tuning needed.

---

## n1280 SUB-SEGMENT ID COLLISION FIX (2026-04-01)
- **93.2% area-weighted (40w). 21/25 anchors. 6/6 benchmarks.**
- **final_state_hash: 80647861cf5a24f3**
- VRS at-front: **74.4%** (61/82) — recovered from 52.4% in n1279, above pre-fix baseline of ~71%.
- Failing anchors: brcko, boljanic_2, gradacac_2, rastosnica_2.

### Change vs n1279
- `src/sim/combat/sector_splitting.ts`: 4 sub-segment ID generation sites changed from `subseg:${sector.corps_id}:split${ci}` / `ftsplit${ci}` / `merged${indexHint}` to `subseg:${sector.sector_id}:split${ci}` / `ftsplit${ci}` / `merged${indexHint}`. `sector_id` is unique per sector; `corps_id` is shared by all sectors in a corps, causing silent Map overwrites when a corps had >1 sector.

### Root Cause Fixed
`vrs_1st_krajina:split0` was being generated twice (once per sector in that corps). The commander correction pass builds a `sub_segment_id → friendly_osids` Map; the second entry silently clobbered the first. 23 brigades assigned to the overwritten split0 were invisible to all correction logic — they kept wrong march orders and wrong transit states indefinitely.

### Key Findings
- Zero wrong-destination march orders after fix. Zero duplicate sub-segment IDs. `komar_2` pileup (was 5–12 brigades) resolved.
- `brcko` anchor (`op:brcko:brcko`) failing. Previous "structurally orphaned" diagnosis was a naming mismatch — `op:brcko:brcko_2` does not exist; real cause of anchor failure is unknown.
- `gradacac_2` / `rastosnica_2` regressions: RS brigades now correctly covering fronts they were absent from before. Calibration drop reflects RS overperforming on newly-covered fronts — not a wrong fix, requires sector assignment tuning.
- 3 brigades with stale `assigned_sub_segment_id` (705th Slavna Mountain, Bileća Brigade, 1st Laktaši) — dead IDs from renamed/merged sectors. P1.

### Open P0s after n1280
1. brcko (`op:brcko:brcko`) — anchor failing; previous structural-gap diagnosis was a naming mismatch. Real cause unknown — investigate.
2. boljanic_2 — ARBiH operational pressure on Doboj, insufficient RS garrison.
3. gradacac_2 / rastosnica_2 — RS overperforming on newly-covered fronts; sector assignment scope tuning needed.

---

## n1279 correctTransitStates + sector_splitting PATH GUARDS (2026-04-01)
- **93.5% area-weighted (40w). 22/25 anchors. 6/6 benchmarks. 84 battles.**
- **final_state_hash: b45b8937b29fe849**
- VRS at-front: **52.4% (BROKEN)** — worse than n1275 baseline (~71%). Root cause: duplicate sub-segment IDs (fixed in n1280).
- New anchor failure: gradacac_2 (sim=RS, expected=RBiH). rastosnica_2 also failing.

### Changes vs n1278
1. `src/sim/combat/commander_march_correction.ts` — added `correctTransitStates()`: scans `brigade_movement_state` for in-transit brigades whose transit destination falls outside their assigned sub-segment `friendly_osids`; cancels the transit state and issues a corrected BFS march order. Runs after `correctMarchOrders` in the `commander-correct-march-orders` step (step 153).
2. `src/sim/combat/sector_splitting.ts` Path 1 — `splitNonContiguousSectors` strict Case B block: `else if (meta.side_b === faction)` → bare `else`. Prevents empty `friendly_osids` when an OSID is contested or null at snapshot time.
3. `src/sim/combat/sector_splitting.ts` Path 2 — added `allFriendly` rebuild guard: when `allFriendly` is empty due to upstream corruption, rebuilds directly from `edgeMeta` using the same faction-side logic as `findSubSegments`.

### Root Cause Identified (fixed in n1280)
`splitNonContiguousSectors` used `corps_id` as sub-segment ID prefix; counter resets per call → `vrs_1st_krajina:split0` appeared twice. Commander correction pass Map lookup silently overwrote the first entry; 23 brigades became invisible to all correction logic.

---

## n1278 COMMANDER MARCH CORRECTION PASS + HOME_OSID REMOVAL (2026-04-01)
- Calibration not recorded — intermediate run, issue discovered immediately (correction pass blind to in-transit brigades).

### Changes
- `src/sim/combat/commander_march_correction.ts` (new file): `correctMarchOrders(state, adjacency)` — for each active brigade with `assigned_sub_segment_id`, if its march order destination is outside the sub-segment's `friendly_osids`, overrides with nearest reachable `friendly_osid` by BFS. Fully emergent: no brigade IDs or OSID names hardcoded.
- `src/sim/turn_phases/war_phases.ts`: new step `commander-correct-march-orders` (step 153) inserted after `generate-bot-corps-orders`. Step count 152→153.
- `src/sim/combat/brigade_front_distribution.ts`: removed `home_osid` tiebreaker from `pickLeastStackedTarget`; added `in_transit` guard at top of Phase B loop (`if (movementState?.[bid]?.status === 'in_transit') continue`).
- `src/sim/combat/subsegment_assignment.ts`: removed `HOME_AFFINITY_BONUS` from brigade×sub-segment affinity scoring.

### Issue Found
`correctMarchOrders` only checked `brigade_movement_orders`. But `osid-column-movement` (step 576) runs before the commander pass and converts pending orders into `brigade_movement_state`. Brigades already in transit retained wrong destinations. Fix: `correctTransitStates()` added in n1279.

---

## n1237 TWO-TIER PANEL — CONDITIONAL NO-GO for v0.8.1 (2026-03-31)
- **92.3% area-weighted (40w). 22/22 anchors. 6/6 benchmarks. 78 battles. 31/40 combat weeks.**
- **final_state_hash: d63148930f19ee35**
- valid_for_combat_calibration: false (319 invalid ops, 166 zero-eligible executions)
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1237`

### Changes vs n1234
- [CMD]/[VIA] debug traces removed from `emit.ts` and `plan.ts`
- 16 pre-existing test failures fixed (13 event_timing baseline refresh, 2 stacking threshold, 1 anomaly threshold)
- Zero-eligible-execution root cause fixed: `is_home_defense` + `morale` added to BrigadeEvaluation; `selectBrigadesForPlan` filters home_defense_active brigades; `emit.ts` homeDefenseSet guard added
- New pipeline step: `check-brigade-dissolution-post-combat` after morale-drift (151→152 steps)
- Op Prsten: `northern_ring` split into `northern_ring` (Vogošća, 4 brigades) + `ilijas_ring` (Ilijas, 3 brigades incl. 2 new JNA phantoms: `jna_ilijas_garrison_det` + `jna_ilijas_north_to_tg`)

### Panel Verdict: CONDITIONAL NO-GO for v0.8.1
Two P0s found during panel and fixed (not yet validated by a run):

**P0-A — allocate.ts home_defense surplus contamination**
- Home_defense brigades were included in surplus pool → inflated plan viability → plans launched with brigades that could never execute
- Fix: `allocate.ts` surplus pool filter adds `&& !ev.is_home_defense`

**P0-B — morale gate absent from selectBrigadesForPlan**
- Critically low morale brigades (≤15) were selected for ops → guaranteed zero-eligible execution at brigade_posture.ts
- Fix: `plan.ts:selectBrigadesForPlan` adds `ev.morale > CRITICAL_MORALE_THRESHOLD` (15) filter

### Panel Design Decisions
- **SRK siege containment role confirmed:** No artificial ops for SRK. Post-Prsten inertia is by design — SRK holds the ring, doesn't push. Not a calibration defect.
- **ARBiH emergent suppression confirmed (Option A):** Let calibration enforce ARBiH suppression naturally via equipment asymmetry and entrenchment; do not add artificial throttles.
- **HRHB "5-8%" claim corrected:** Historian's historical reference is the Jan 1993 painted map. That IS the historical reference — no discrepancy to fix.

### P1 Tracking (post-panel, not blocking n1238)
1. vrs_herzegovina geographic targeting — ops pulling toward Foca, not Mostar corridor
2. SRK post-Prsten inertia — by design, confirmed; monitor for regression
3. Jajce timing — sim captures w40 (late), historical fall was w26; structural (1KK op chain)
4. vrs_1st_krajina idle brigades — ~22/36 drifted, no active ops after Corridor secured
5. UI prerequisites for v0.8.1 — 4 items identified; prerequisite for release, not for calibration

### Pending: n1238
n1238 not yet run. Will validate: P0-A (allocate.ts filter) + P0-B (morale gate) + Op Prsten Ilijas split. If 319 invalid ops and 166 ZEA counts drop substantially, proceed to War-or-Game re-review. If not, re-panel.

## n1234 P0 DROUGHT FIXED — 6 plan.ts/zone_detection.ts bugs (2026-03-31)
- **92.2% area-weighted (40w). 22/22 anchors. 6/6 benchmarks. 103 battles. 38/40 weeks with combat.**
- **final_state_hash: 45d8fde0a760c080** (deterministic, verified n1235 same hash)
- P0 confirmed fixed: weekly distribution 1-6 battles/week throughout; one zero week (w22) normal variance.
- Six compounding bugs in `plan.ts` and `zone_detection.ts`:
  1. Concentration progress used physical brigade location (`countBrigadesInZone`) — no movement system executes concentration orders → always 0 → `concentrating` forever. **Fix: time-based progress.**
  2. Zone IDs were array-index based (`zone:corps:compIdx`) → unstable across turns → `staging_zone` lookup fails. **Fix: OSID-anchored IDs.**
  3. Zone re-anchoring when zone grows → stored staging_zone stale → viability=0. **Fix: OSID-content fallback.**
  4. Viability penalized assigned brigades (committed brigades left surplus pool → "lost"). **Fix: count assigned_brigades as effective.**
  5. Suspend check used `surplusPool.length < required` (raw pool fluctuates with garrison) → immediate suspend. **Fix: count assigned brigade availability.**
  6. Abandoned plans persisted in state, blocking new plan creation. **Fix: clear on next entry.**
- Remaining: `operation_zero_eligible_execution` on some ARBiH/HVO commander ops (separate issue). HVO 0 orders expected pre-April 1993.
- Calibration slightly below n1233 ATH (92.6%) but P0 resolved is the dominant result.
- War-or-Game: PENDING (not re-reviewed after drought fix).
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1234`

## n1233 CONCENTRATION + ZONE STABILITY FIXES (2026-03-31)
- **92.6% area-weighted (40w) — ATH.** 22/22 anchors. 6/6 benchmarks. 71 battles.
- Applied bugs 1-3 (time-based concentration, OSID-anchored zones, staging fallback). Plans reaching ready/executing.
- Still had abandoned plan persistence (bug 6) → 71 battles only.
- final_state_hash: 7e8306d160694c40
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1233`

## n1226–n1232 INSTRUMENTATION + INCREMENTAL FIXES (2026-03-31)
- Instrumentation added: `[CMD]` per-corps per-turn emit/skip trace, `[VIA]` viability path trace.
- Identified plan lifecycle bugs via trace analysis. Bugs 1-4 applied incrementally.
- Battle counts: ~62 throughout (drought continued until all 6 bugs fixed).
- Hash range: various (62-71 battles).

## n1225 INERT FIX — hasAvailableSlot() never called by emit.ts (2026-03-31)
- **92.5% area-weighted (40w). 22/22 anchors. 6/6 benchmarks. 61 battles. 11 battleless weeks.**
- **final_state_hash: 132eb2163d156168** — byte-for-byte identical to n1224. Fix had ZERO effect.
- Fix applied: `hasAvailableSlot()` in `corps_operation_helpers.ts:10` — filter `op.phase !== 'recovery'` before slot cap comparison.
- Root cause of zero effect: `commander/emit.ts` **never calls `hasAvailableSlot()`**. It has its own inline slot guard at line ~525 that already filters `phase !== 'recovery'` (added in the n1218 fix session). The fix patched a utility function the commander loop doesn't use.
- `hasAvailableSlot()` IS called by `bot_corps_directives.ts`, `bot_corps_operations.ts`, `bot_corps_corridor.ts` — but those are non-commander (baseline bot) op paths, not the drought source.
- **P0 drought root cause still UNKNOWN.** The commander pipeline (briefing→plan→decide→emit) is completely silent on why it stops emitting ops post-w22. No skip reasons logged anywhere.
- **Fix reverted** — `corps_operation_helpers.ts` back to original.
- **Next required action:** instrument commander pipeline with per-corps per-turn decision trace before any further fix attempts. Diagnosing from static code reading has failed 8 consecutive times.
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1225`

## n1224 min_attack_outcome STALEMATE on commander ops (2026-03-31)
- **92.5% area-weighted (40w) — NEW ATH**. 22/22 anchors PASS. 6/6 benchmarks PASS.
- **61 battles. 11 battleless weeks [1,16,23,24,25,26,27,30,35,39,40]. War-or-Game: NOT APPROVED.**
- Fix: `emit.ts` — set `min_attack_outcome: 'stalemate'` on commander-generated `sector_attack` ops. Lowers attack threshold from `costly_victory` (≥1.0 power ratio) to `stalemate` (≥0.7). After w22 entrenchment buildup, ≥1.0 is unachievable everywhere → 0 attack orders from all commander ops.
- Battles improved 50→61. Drought improved 16→11 weeks (w23-27 gap remains).
- All 17 commander ops still had 0 battles — improvement came entirely from baseline bot, not commander loop. Commander loop broken independently.
- final_state_hash: 132eb2163d156168
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1224`

## n1223 WRONG FIX — trimming exemption for op participants (2026-03-31, REVERTED)
- **47 battles (WORSE)**. Previous baseline ~50. Fix made combat worse.
- Fix applied: exempted op participant brigades from per-corps trimming in `bot_brigade_ai_osid.ts:551-568`.
- Diagnosis was wrong: `attack_attempt_count` stayed 0 in all commander ops — attack orders were never generated, not trimmed. Trimming is irrelevant when no attack orders exist to trim.
- Diagnostic field `eligible_attacker_count` was misleading: it counts ALL corps brigades adjacent to enemy, not op participants specifically. Op participants never reached `canDirectAttackObjective=true` because `isOutcomeSufficientForAttack` failed (entrenched defenders, power ratio < min_attack_outcome threshold).
- **Reverted immediately.** `bot_brigade_ai_osid.ts` back to original.
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1223`

## n1219–n1222 INTERMEDIATE DEBUGGING RUNS (2026-03-31)
- Fixes from n1218 panel diagnosis (bot_brigade_eval_attack.ts op participant exemption + plan.ts staging-zone scope):
  - **n1219**: `bot_brigade_eval_attack.ts:96` — op participant exemption from sector-front gate (`isActiveSectorOperationParticipant` guard). KEEP.
  - **n1220**: `bot_brigade_eval_front.ts:69` — removed `|| offAssignedFront` condition. KEEP.
  - **n1221–n1222**: Intermediate investigation runs. Battle counts not recorded (investigation runs, not calibration-significant).
- These fixes addressed the brigade oscillation / ZEA (zero-eligible-attacker) issue from n1218 panel. Drought continued — these fixed a secondary issue, not the P0.
- Runs: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1219` through `_n1222`

## n1218 SLOT CAP FIX (emit.ts phase!=='recovery') (2026-03-30)
- **91.8% area-weighted (40w)**. 21/22 anchors (brka_2 FAIL — same as n1216). 6/6 benchmarks PASS.
- **55 battles. 9-week zero-battle drought (w28-36). COMBAT STILL BROKEN.**
- Slot cap fix applied (emit.ts filters recovery-phase ops). Drought improved 18→9 weeks — fix was correct but insufficient.
- **Root cause identified by two-tier panel:** `bot_brigade_eval_attack.ts:96` — `assignedBrigadeNotOnSectorFrontOsids` fires BEFORE `isActiveSectorOperationParticipant` check. Op participants who march toward objectives are silently rerouted back to home sector, producing movement oscillation. This generates all 204 ZEA turns and 190 recovery-without-attempt ops.
- Secondary cause: `plan.ts checkSuspendConditions` suspends on ANY high-threat zone, not just staging zone. ARBiH corps perpetually suspended, never reach `ready` state.
- att:def ratio: 0.34 (worsened from 0.43). Game-designer: do not touch casualty constants — reassess after drought fix (selection bias, not math error).
- 7/16 corps with 0 battles. 112 brigades never fight. HRHB 0 orders (structural feature — no war enemies in 40w).
- 57 brigades drifted >4 hops. vrs_1st_krajina: 22/36 drifted. Home-recall FLAGGED by canon (must not pull from active ops).
- War-or-Game: **NOT APPROVED**. Historian: **NOT APPROVED**. Orchestrator: **NO-GO**.
- **P0 fix:** `bot_brigade_eval_attack.ts:96` — wrap `assignedBrigadeNotOnSectorFrontOsids` with `!isActiveSectorOperationParticipant` (1 line). Batch with `plan.ts checkSuspendConditions` staging-zone scope (~5 lines). Run n1219.
- UI gap: all 6 key findings INVISIBLE or PARTIALLY VISIBLE. `generateBriefing` has no time-series pattern detection. P1 debt.
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1218`

## n1217 COMMANDER FIXES 1+2+4+5 (2026-03-30)
- **92.2% area-weighted (40w)**. 22/22 anchors PASS. 6/6 benchmarks PASS. MAP HOLDS.
- **38 battles. 18-week zero-battle drought (w23-40). COMBAT BROKEN AGAIN.**
- Regression vs n1216 (69 battles, 2-week max). Fix 1 (slot cap) overcorrected: recovery-phase ops count against the single slot, blocking new op emission for 2-3 turns per cycle.
- Root cause: `briefing.active_operations.length` includes recovery-phase ops. With cap=1 (12 brigades), any completed op blocks the slot until `advanceSectorOffensives` removes it.
- Fix 2 partially inert: `operation_history` is written but `plan.ts` never reads it — no cooldown on re-targeting.
- `valid_for_combat_calibration: false` — 155 zero-eligible-attacker ops (down from 493).
- vrs_2nd_krajina: 1 op (was 40 zombies in n1213). Fix 1 effective for accumulation prevention.
- War-or-Game: **NOT APPROVED**.
- **P0 fix needed**: exclude `phase === 'recovery'` from slot cap check in `emit.ts buildOperations`.
- Run: `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1217`

## n1216 REACHABILITY FILTER + TASKS 1-5 (2026-03-30)
- **91.8% area-weighted (40w)**. 21/22 anchors PASS (brka_2 FAIL: sim=RS, expected=RBiH). 6/6 benchmarks PASS.
- 69 battles, 10 silent weeks, longest stretch 2 weeks. **P0 combat drought FIXED at macro level.**
- `valid_for_combat_calibration: false` — 493 zero-eligible-attacker ops, 1,028 invalid op events.
- RS w40: 51.3% vs 55.3% target (-4pp, barely within ±5pp tolerance). RS stalls after w21.
- HRHB: 0 battles, 0 attack orders across 40 weeks. hvo_central_bosnia + hvo_tomislavgrad dead fronts.
- War-or-Game: **NOT APPROVED**.
- **4 railroads found:** (1) Slot cap bypass in emit.ts → zombie op accumulation. (2) operation_history never written → same objectives planned forever. (3) No brigade cooldown → 5th Corps Bihać paralysis (7 brigades stuck at brekovica_2 × 6 op generations). (4) initial_strength not set → power-attrition abort dead.
- **6 fixes proposed** (see ledger 2026-03-30). Priority: Fix 1 (slot cap) → Fix 4 (initial_strength) → Fix 2 (op history) → Fix 5 (besieged gate) → Fix 6 (HRHB stance) → Fix 3 (brigade cooldown).
- Files: `src/sim/combat/commander/emit.ts`, `plan.ts`, `decide.ts`.

## n1213 v0.8 CORPS COMMANDER (2026-03-30 Night Shift)
- **92.2% area-weighted (40w)**. 22/22 anchors PASS. 6/6 benchmarks PASS. Ties ATH (n1146).
- +2.0pp from n1211 baseline. Commander: PERCEIVE->DECIDE->EXECUTE per-corps loop.
- Sarajevo HELD (7 brigades, garrison allocation working). Gorazde HELD (4 brigades).
- **P0: 19 consecutive silent weeks (w21-w39).** 36 battles (was 62, -42%). War dies at w20.
- RS w40: 0.510 vs 0.553 target (-0.043, 86% toward fail boundary).
- Regions: Krajina 99.6%, Posavina 94.5%, Herzegovina 93.2%, Central Corridor 90.3%, Sarajevo 89.9%, Central Bosnia 87.2%, Drina 83.6%.
- War-or-Game: NOT APPROVED — territory correct, combat activity catastrophically low.
- Att:Def ratio 0.27:1 (worsened from 0.43). 86% decisive victories. Power ratios up to 83:1.
- 0 tanks across all factions (equipment tracking broken or not populated).
- Files: `src/sim/combat/commander/` (10 files, ~3,800 lines), `bot_corps_ai.ts`, `serializeGameState.ts`.

## n1211 TRUE BASELINE (2026-03-30) — With Enriched Contact Graph
- **90.2% area-weighted (40w)**. 21/22 anchors (Sarajevo Centar FAILED). 5/6 benchmarks.
- Previous 90.9% was measured in worktree without shared_segments enrichment.
- 48 point-only contacts now filtered — 0.7pp drop is real cost of correct adjacency.
- Sarajevo fell: 13 brigades column-marched out, paramilitary sweep captured empty city turns 9-11.
- Root cause: concurrent ops → aggressive redistribution → garrison stripped.
- v0.8 Corps Commander Intelligence designed to fix this structurally.

## n1211 (2026-03-29) — Concurrent Corps Operations + Krajina Fixes
- **90.9% area-weighted (40w)** (worktree, without contact graph enrichment). 22/22 anchors. 5/6 benchmarks.
- Concurrent ops: `active_operations[]` replaces `active_operation`. Slot cap = floor(brigades/12).
- Krajina paramilitary scope expanded (+6 municipalities). MAX_POCKET_CLUSTER 3→6.
- +3.0pp from paramilitary fixes. Krajina 99.0%, Posavina NE 93.9%.
- RS w40 benchmark FAILS (49.7% vs 55.3%). Sarajevo -3.5pp regression.
- 59 consolidation flips, 22 combat flips, 63 total orders.
- Previous: n1210=87.7%, n1205=92.1%.

## n1210 (2026-03-29) — 5 fixes: Visegrad OOB + siege calc + JNA ghosts + sector reassignment + MIN_SECTOR_BRIGADES

**Run:** `apr1992_definitive_40w__77cac5e01d3c929e__w40_n1210`
**Hash:** `bbe19ee145f749f1`
**Area-weighted:** 87.7%
**Regional breakdown:** Krajina: 93.8%, Posavina: 83.3%, Drina: 74.1%, Central Corridor: 89.3%, Central Bosnia: 84.9%, Sarajevo: 87.6%, Herzegovina: 93.2%
**RS delta:** -54
**Consistency:** FAIL (1 unassigned brigade)
**Changes:** (1) Visegrad Brigade OOB moved to vrs_drina (was misassigned). (2) Sarajevo siege calc SID→OSID fix — now returns PARTIAL not phantom BESIEGED. (3) JNA ghost brigades — 3 infantry-only phantoms for Op Prsten + Op Foca; Op Prsten objectives reordered. (4) Sector reassignment dead code — evaluateSectorMarch now processes reassignment orders. (5) MIN_SECTOR_BRIGADES=2 — small corps get fewer sectors.
**Reverted:** Brigade drift home recall (59% abandonment), Op Prijedor JNA ghosts (broke 1KK chain → lost Jajce), 2nd Herzegovina home→konjic (enemy territory).
**Key observation:** -4.4pp from n1205. Regression is from removing phantom BESIEGED siege status that artificially inflated calibration. Both OOB and siege fixes are mechanically correct and must not be reverted. Recovery path: concurrent corps ops (lets 1KK run Corridor + Jajce simultaneously). Plan: `docs/plans/2026-03-29-concurrent-corps-operations.md` (15 tasks, 28 files).
**Open issues:** Derventa anchor FAILED (HRHB holds derventa_2, 1KK timing cascade). Herzegovina structural gap (8 brigades, 81 front edges). Ilijas 4 OSIDs need early-war seizure event. 68+ brigade drifts (structural feedback loop, fix approach wrong).

## n1205 (2026-03-29) — Power-neutral casualty-asymmetric support model

**Run:** `apr1992_definitive_40w__77cac5e01d3c929e__w40_n1205`
**Hash:** `3e3456f5d3d68969`
**Area-weighted:** 92.1% (fully recovered from n1204's 90.9%)
**OSID match:** 640/712 (89.9%) — identical to n1203
**Consistency:** PASS
**Change:** SUPPORT_POWER_MULT 0.70→1.0, MAIN_CASUALTY_MULT=1.40 (new), SUPPORT_CASUALTY_MULT 0.40→0.55. Renormalized casualty distribution preserves total. Expert consensus: BB1 p.182 confirms supporting attacks were full ground attacks from different axes, not reduced-power fire support. Power-neutral is correct.
**Key observation:** Identical to n1203 because SUPPORT_POWER_MULT=1.0 means power calculation unchanged. Casualty redistribution toward main effort doesn't affect territory.
**War-or-Game:** Pending (n1204 was APPROVED WITH CAVEATS — same underlying dynamics apply).

## n1204 (2026-03-29) — SpatialContext + 7 architectural fixes + multi-brigade ops

**Run:** `apr1992_definitive_40w__77cac5e01d3c929e__w40_n1204`
**Hash:** `604e712d424dcedb`
**Area-weighted:** 90.9% (down from n1203 92.1% due to multi-brigade support modifier)
**OSID match:** 633/712 (88.9%)
**Consistency:** PASS (0 peak violations, 0 unassigned, 0 ghosts, intel live)
**Faction deltas:** RS=-30, RBiH=+18, HRHB=+12
**Casualties:** RS taken=23,751 inflicted=30,086. RBiH taken=72,510 inflicted=10,109. HRHB taken=6,419 inflicted=4,015.
**Changes:** SpatialContext (Phases 0-4), corps launch feasibility, ops reevaluation, emergency retreat reachability, phantom defender fix, bfsDistance friendly-only, multi-brigade main/support (70%/40%).
**Key observations:** Multi-brigade support modifier reduced RS offensive power (~1.2pp). n1203 (pre-multi-brigade) was 92.1%. The -1.2pp from support modifier is mechanically correct — support brigades contributing 70% vs 100% power makes operations slightly weaker.
**War-or-Game verdict:** APPROVED WITH CAVEATS.
**P0-1:** HRHB ghost faction after w13 — 0 orders w21-40, two corps with zero battles. Biggest realism gap.
**P0-2:** RBiH casualties pathological (72k vs RS 24k, 2.9:1). 0% ARBiH objective completion w21+. Entrenchment too punitive.
**P1:** RS +43 OSIDs but -5.2pp area (small settlements, missing large blocks). 79 brigades (39%) never fight. SRK ring thinning. Op Herzegovina Consolidation zombie.
**Positive:** Enclave formation correct, RS→RBiH tempo arc mirrors history, Op Corridor partial (accurate), displacement scale realistic.

## n1203 (2026-03-29) — SpatialContext + 6 fixes (pre-multi-brigade)

**Run:** `apr1992_definitive_40w__77cac5e01d3c929e__w40_n1203`
**Hash:** `a9e025117a6afe80`
**Area-weighted:** 92.1% (+2pp from n1198, matching n1150 ATH)
**Changes:** Same as n1204 minus multi-brigade. +2pp from retreat fix (no more teleportation), phantom defender fix (shared casualties), corps feasibility (fewer zombie ops), bfsDistance fix.

## n1194 (2026-03-29) — Fresh 40w baseline + paramilitary dissolution fix

**Run:** `apr1992_definitive_40w__77cac5e01d3c929e__w40_n1194`
**Hash:** `d3542bbae8c59c9d`
**Area-weighted:** 88.4% (regression from n1170 90.0% — dirty working tree)
**Anchors:** 20/22 (failed: brka_2 Brčko, zepa_2 Žepa)
**Benchmarks:** 5/6
**Battles:** 136 (up from 103)
**Orders:** 149 (RS:62, RBiH:81, HRHB:6)

### Findings
- **Paramilitary dissolution bug FIXED**: `dissolveParamilitary()` in `paramilitary_sweep.ts` set `status: 'inactive'` but never zeroed `personnel`. 52 RS paramilitaries carried 21,300 ghost troops. Real RS strength: 99,030 (90 active brigades), not 120,330/142 reported. Fix: `f.personnel = 0` on dissolution.
- **ARBiH 81 orders in 1992 — emergent decision failure**: Root cause is NOT missing doctrine gates. The combat predictor uses `stalemate` (ratio >= 0.7) as default attack threshold — bots attack even when they predict they're weaker than the defender. Combined with supply filter relaxation (strained brigades now attack), counter-attack broadening (2/sector/turn), and fog of war flat 15% discount on defender power, ARBiH bots don't emergently know not to attack VRS in 1992.
- **OPSEC system 70% dead code**: `offensive_signs` requires confidence >= 0.8 AND recon_range >= 2. Only 2/109 intel records reach 0.8, only RBiH has range 2. Defensive reaction (2× threat boost) never fires. Defenders are blind to enemy staging.
- **Probe pipeline flaw**: `getSectorIntelConfidence` returns mean across all enemy sectors. Probe refreshes ONE sector but mean stays below threshold → triggers another probe. `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT=2` forces full attack after 2 probes regardless of predicted outcome.

### Planned fixes (5 items)
1. Probe freshness per-sector-pair, remove forced commitment
2. Attack threshold stalemate→costly_victory (1.0)
3. OPSEC offensive_signs threshold lowered, defensive reaction enabled
4. Fog of war scaled by intel confidence
5. Counter-attacks gated through combat predictor

### Real troop strengths (excluding paramilitaries)
- RS: 90 active, 99,030 personnel
- RBiH: 126 active (+1 dissolved), 149,964 personnel
- HRHB: 38 active (+3 dissolved), 41,359 personnel

### Casualties (from brigade_history)
- RS: 18,940 taken, 24,450 inflicted
- RBiH: 29,796 taken, 16,992 inflicted
- HRHB: 3,440 taken, 3,249 inflicted

**n1170 (2026-03-28) — Territory reconciliation + probe pipeline + casualty ratio fix:**
- Territory Phase 1.5: brigades matched to sectors by location_osid vs territory_osids. 0 empty contested sectors (was 5).
- Probe pipeline: evaluateOperationProgress skips probe/feint (double processing). Probes don't trigger cooldown. Supply filter: only critical excluded (strained allowed with 0.75× penalty).
- Casualty ratio fix: attCasMult was computed but never applied. Now applied in attack_resolution_osid.ts and combat_predictor.ts.
- **90.0% area-weighted, 22/22 anchors, 5/6 benchmarks** (consolidate_gains failed: 0.493 vs 0.553 expected).
- 103 battles (was 68), 113 orders (was 76), RBiH 47 orders (was 12). Att casualties 19786 (was 10808), Def 28114 (was 19649). Att:Def ratio 0.70 (was 0.55).
- Passive brigades: 72/238 (30.3%, was 92/236 = 39%).
- -2.2pp from n1150 baseline: mechanically correct corrections exposed artificial inflation.
**UPCOMING: Point-only polygon contact fix (2026-03-28, post-n1170):** Contact graph has 46 edges with `min_dist=0` that are point-only contacts (shared vertex, 0 boundary segments) — artifacts from polygon derivation. 12 are cross-faction, creating phantom front edges. Key case: sela_2-golubici_2 bridges Trnovo-Kalinovik into one sector (arbih_1st_corps:7). Fix: enrich contact graph with `shared_segments`, filter to `shared_segments >= 1`. Expected impact: sela_2 becomes isolated enclave, sector 7 splits. Calibration may shift from changed sector topology (similar to n1029 min_dist fix which dropped 93.1% to 92.0%).
**n1103 (2026-03-25) — Gorazde Consolidation + Hrasnica Fix:** Operation Circle event flips 3 Gorazde periphery OSIDs (glamoc, kamen, sopotnica) from RS to RBiH via `control_change`. 102nd Motorized relocated from Ilidza to Hadzici (refugee brigade, `displaced_from: "ilidza"`). **91.7% area-weighted** (+0.1pp from Gorazde). Remaining: `op:gorazde:kolovarice` mismatch (painted RS, sim RBiH, census inconclusive).
**n1096 (2026-03-25) — Pool War Weariness Decay:** Per-turn decay on pool.available (HRHB 2.5%, RS 2.0%, RBiH 1.2%). Enclave municipalities exempt. Combined with exhaustion accounting overhaul (A1+A2+A3): RS w104 149k→124k (target 110-120k, 4k over), HRHB 68k→58k (target 50-55k, 3k over), ARBiH 194k→199k (target 165-180k). **40w: 91.2%** (-0.1pp, within noise). Pipeline step `pool-war-weariness-decay` after `ongoing-mobilization`. New file: `src/sim/combat/pool_decay.ts`. Diagnostic: `tools/diagnose_pool_exhaustion.cjs`.
**n1090-1095 (2026-03-25) — Exhaustion Accounting Overhaul:** Three pool accounting bugs fixed: (A1) pool.available added to exhaustion numerator, (A2) initial OOB personnel counted as committed (38k RS invisible), (A3) strategic reserve sweeps tracked as committed. Casualty feedback unified to 75% (frontline/siege attrition were 25%, handling 95% of losses). RS/HRHB surge curves lowered post-w52 (RS 0.9/0.8/0.5→0.4/0.2/0.1, HRHB 0.8/0.5/0.35→0.3/0.15/0.1). A-series alone: RS w104 149k→139k (-10k). Key finding: accounting fixes alone insufficient — pool surplus from w1-52 sustains growth even with zero new mobilization. Pool decay (above) needed as secondary mechanism. **40w: 91.3%** (zero regression from accounting fixes alone).
**n1029 (2026-03-23) — Contact Graph min_dist Enrichment:** `operational_contact_graph.json` had 0/2047 edges with `min_dist` — ALL adjacency threshold filters (`frontEdgeAdj`, `strictAdj`, `caseBSplitAdj`) were no-ops since n982 micro-OSID merge (or earlier). Strict Case B contiguity check (n682) was dead code. Sectors spanned disconnected territory across enemy pockets (e.g. "1st Corps - Trnovo, Kalinovik" spanning both sides of RS wedge). Fix: `tools/enrich_contact_graph_min_dist.cjs` computes `min_dist` from polygon geometry. `merge_micro_osids.cjs` preserves `type`/`min_dist` fields. 2025 shared (<5.5m), 22 distant (>33m). **92.0% area-weighted.** Previous 93.1% was inflated by broken sector defense of unreachable territory. New baseline.
**n1029 known regressions (to investigate):** (1) **Posavina** — 96.1% → 91.7%, HRHB gaining 4 extra OSIDs. (2) **Srebrenica** — RS holds OSIDs near Srebrenica that it shouldn't. Both likely cascade from changed sector topology after min_dist fix.
**Pre-existing calibration issues (not regressions):** (1) ~~**Simin Han at Tuzla** (`op:tuzla:simin_han_2`) — RS holds, should be RBiH.~~ **RESOLVED** (2026-03-25): Tuzla barracks event now flips Simin Han via `control_change` effect. +0.4pp calibration.
**n1024 (2026-03-22) — v0.6.0-beta Event Migration + Foundational Decisions:** 19 events in 1992 set (was 18). Phases 1-7 complete. 4 wallpaper cut, 6 tweaked with dimensions/flags, 8 rewritten calendar→emergent (pressure configs), 3 foundational decisions (RS Strategic Goals, RBiH State Identity, HRHB Political Goal — ICTY-sourced), Drina cleansing RS decision, camps revealed RS decision (rewritten), Mostar liberation reimplemented. Bot picks historical on all foundational decisions. Zero calibration regression from event migration. **93.1% area-weighted. 644/712 count (90.4%). 6/6 benchmarks PASS. RS w40 0.511.** War-or-Game SIGNED OFF.
**n1021 (2026-03-22) — v0.6.0-alpha Event Infrastructure (nightshift):** Pressure system, strategic dimensions (6×3 hybrid base+modifier), event flags, 14 new condition types, event constraint bus (aggression modifier wired, operation blocks, scope restrictions), TurnIncidents, bot response v1 (personality-weighted), recurrence model, 3/turn queue cap, pipeline step (update-event-readiness). Emergency posture sweep in Army HQ. All backward compatible — infrastructure inert, no events use new features yet. 1317 tests (+56). **93.1% area-weighted** (identical to n1020 baseline).
**n1020 (2026-03-21) — Settlement Timeline session (merged to main):** Engine tracking (control_events persistence, turn_summaries unlimited, brigade movements, supply transitions, historical events) + displacement adapter fix (displaced field includes killed/fled as subsets — was double-counting, inflating OSID removals ~40%). Deck.gl settlement labels. Units toggle fix. Op Drina vitinica_2→djulici objective change from main. **93.1% area-weighted (new ATH).** **4/4 enclaves.** RS w40 0.511 PASS. Krajina 99.6%, Posavina 96.1%, Drina 80.5%, Central Corridor 90.3%, Central Bosnia 90.1%, Sarajevo 86.8%.
**n3-worktree (2026-03-21) — Žepa-Teočak Seesaw Fix:** Žepa and Teočak inversely coupled through VRS Drina Corps. Fixing one breaks the other. Solution: simultaneous fix — (1) 285th Light bumped 600→1500 (historical Žepa Brigade strength, 64% mobilization of ~2,350 military-age Bosniaks in Rogatica), (2) Op Teočak strengthened: +2nd Tuzla (3000 pers), available_from 25→20. Result: Žepa holds (1st Bratunac stalemate w22, repulsed w23), Teočak connected (rastosnica_2 captured w24 by 242nd decisive r=2.01). 4/4 enclaves PASS. **91.5% area-weighted.** RS w40 0.494 (marginal fail, -0.009 below 0.503). Trade-off: 900 extra ARBiH pers tips RS w40 below threshold — needs recovery from other calibration.
**n1005 (2026-03-21) — vitinica_2 anchor fix:** Removed vitinica_2 (painted RBiH) from Op Drina objectives — VRS was capturing it at w6. Reduced to 4 objectives. Teočak connected, Žepa falls (separate issue from Posavina cascade). **91.9% area-weighted.** RS w40 0.504 PASS.
**n1002 (2026-03-21) — Posavina Corridor Restructure (Operation Corridor 92):** Removed premature triggered Op Derventa (w4, 2 brigades). Strengthened 1KK pre-planned Op Corridor: +16th Krajina Motorized, +5th Kozara, +1st Trebava Infantry (redeployed from Op Prijedor). 5 brigades on Corridor East axis + 1st Doboj on Corridor South. `min_attack_outcome: 'repulsed'`. Combined with EBK Posavina Flank: 9 VRS (~8,200 pers) vs ~5,350 HVO. Emergent timeline: Modriča w10 (decisive), Odžak w12 (costly), Derventa w18-19 (stalemate→costly), **Bosanski Brod w27** (costly; historical w28). Orašje holds. All Derventa/Brod/Modriča/Odžak OSIDs → RS. No hardcoded flips. **91.9% area-weighted** (+0.9pp). Posavina NE 94.9%. RS w40 0.507 PASS. 3/4 enclaves. REAL_WAR_MASTER #34 → FIXED. Derventa HRHB holding problem → RESOLVED.
**n998 (2026-03-21) — Op Derventa + Teočak Corridor Fix (SUPERSEDED by n1002):** Triggered Op Derventa (1st Krajina, w4, cerani_2 staging) targets derventa_2/garevac_2/domaljevac_2. Captures derventa_2 at w5 but HRHB retakes (holding problem). Op Drina Zvornik Sweep: +krizevici/vitinica_2 as replacement objectives for merged drinjaca/paljevici (restores 5-objective tempo, prevents VRS from taking rastosnica_2 before Op Teočak). Posavina Flank staging: pisari_2 (non-existent) → crkvina_2. Op Višegrad SE-first reorder REVERTED (caused Djulici encirclement 200km away). **91.0% area-weighted.** **RS w40 0.510 PASS** (first time). RS w20 0.520 (+2.7pp). Teočak connected (71). 4/4 enclaves. Derventa HRHB holding = remaining work.
**n987 (2026-03-21) — REVERTED.** Op Višegrad SE-first reorder caused RS to take Kalesija OSIDs 200km away, encircling Djulici/Vitinica RBiH brigades. Reverted to post-merge baseline.
**n982 (2026-03-21) — Micro-OSID Merge (744→712):** 32 micro-OSIDs (< 1 km²) merged into neighbors via `tools/merge_micro_osids.cjs`. All data files, OOB (11 home_osid redirects), operations, enclave lists, local truces, benchmarks, painted targets updated. Baseline: 91.2% area-weighted. Caused butterfly effects: Op Drina tempo change cut Teočak corridor (fixed n992), pisari_2 staging exposed (fixed n998).
**n975 (2026-03-21) — Supply-Based Offensive Constraint:** Brigades on `critical` or `strained` supply OSIDs excluded from corps offensive pool. No hardcoded enclave check — supply system's `findHeartlandComponent` naturally detects disconnected territory (Sarajevo 4 OSIDs, Srebrenica 20, Bihać 22). Sarajevo supply source (`stari_grad`) not in heartland → `strained` → brigades defend only. Bihać sources in heartland → `adequate` → can still attack (historically correct). JNA Rajlovac Barracks phantom added to Op Prsten northern ring (no equipment). **92.0% area-weighted** (session ATH, +0.5pp from n967). **Sarajevo 86.8%** (+3.3pp). RS w40 **0.507**. Drina 84.2%. Replaces hardcoded enclave gate (n973) with emergent supply constraint.
**n973 (2026-03-21) — SUPERSEDED by n975.** Hardcoded enclave operations gate (same results but wrong approach — replaced with supply-based constraint).
**n967 (2026-03-21) — SRK Cold Front Misclassification Fix:** Brigades inside besieged enclaves (Sarajevo, Goražde, Srebrenica, Žepa) excluded from corps offensive brigade pool. Defense-only: reactive sector defense + home defense, no corps operation participation. Bihać pocket exempt (Croatian supply corridor, historical offensives). JNA Rajlovac Barracks phantom added to SRK Operation Prsten northern ring (no equipment — personnel only, withdrawal w5). RS w40 benchmark reverted to 0.503 (now passing at 0.504). **91.6% area-weighted**. **Sarajevo 86.8%** (+3.3pp from n967). Drina 84.2% (stable). Krajina 98.8%. Central Corridor 88.4%. Known remaining: 165th Mountain (Visoko) deployed to Čajniče — 1st Corps spans too wide, needs corps boundary constraint.
**n967 (2026-03-21) — SRK Cold Front Misclassification Fix:** `isSectorColdFront()` false positive — all SRK sectors classified as Graz Accords cold fronts because `opposing_factions` included HRHB (Kiseljak pocket adjacency) alongside RBiH (Sarajevo enclave). Fix: cold front only when opponents are exclusively the truce pair (RS↔HRHB). SRK entrenchment_turns: 8/9 brigades at 0.0 → 6/9 at 12.0. Stances: all `screening` → `elastic`+`defend`. **91.5% area-weighted** (-0.3pp from n965 — small cascade from changed SRK posture). Sarajevo 83.5% unchanged. Structurally correct fix: siege ring was fundamentally broken by zero entrenchment.
**n964-n966 (2026-03-21) — Drina Corps OOB Correction:** Removed phantom `rs_rogatica_brigade` (duplicate of 1st Podrinje Light Infantry Brigade — same unit renamed when transferred from SRK to Drina Corps Nov 1992). Fixed `rs_1st_podrinje` home: Milići→Rogatica (correct HQ per Wikipedia/ICTY sources). Added `rs_skelani_battalion` (Independent Infantry Battalion Skelani, 450 pers, light infantry, Srebrenica municipality — historically attested in July 1995 Drina Corps manning table at 426 pers). 1st Milići bumped 1000→1200 (conservative vs 1,538 July 1995 peak). Net: -1150 Drina personnel. RS w40 benchmark lowered 0.503→0.497 (phantom brigade was inflating RS territory beyond historical — investigation showed RS→RBiH losses are in Višegrad/Čajniče zone, not compensable by Drina manpower). **91.8% area-weighted** (+0.8pp). **Drina 84.2%** (+6pp). RS w40 0.500 PASS (0.497 floor). 3/6 benchmarks (RS w20, RS delta, enclaves pre-existing). Hash n965 `da924d9f6ce4e71b`.
**n955 (2026-03-19) — Battle of the Barracks + ARBiH Tank Capture Overhaul:** 4 conditional barracks seizure events at w4-6 (Sarajevo 4T+8A, Tuzla 6T+10A, Zenica 2T+5A, Visoko 1T+3A). New effect types: `equipment_grant`, `aggression_modifier`. Fractional scavenge accumulator (both-sides, loser 15%). Scarce tank protection (<10 tanks: half rate, no min-1). Defensive capture minimum. Abandoned rate 0.0004. Per-brigade tracking wired. 12 accolades. Corps panel equipment. RBiH tanks **24→39 (+15)**. RS 677→563. **91.2% area-weighted** (-0.9pp from supply/morale boost — acceptable for historically accurate ARBiH equipment).
**n948 (2026-03-19) — Equipment System Overhaul:** Fixed 240 phantom corps_asset tanks (`ensureBrigadeComposition` kind guard), JNA handoff mech/moto priority for tanks, dynamic recruitment no JNA override, abandoned equipment capture on uncontested occupation, battle report equipment fields. RS tanks 677→560 (-117, realistic). ARBiH captured 5 tanks + 12 artillery from abandoned positions. **92.1% area-weighted** (-0.1pp, noise).
**n943 (2026-03-19) — Front Line Overhaul + Stale Front Edge Fix:** Added `rederive-osid-front-segments` pipeline step (138 total) — recomputes front edges after all control mutations. Eliminates stale front edges in saves (was ~20+, now 0). Front line rendering: uniform thickness, vertex-snapping fallback for 37 missing shared-arc pairs, sector highlight aligned to front-lines source. No sim behavior change from n942 — same calibration result. **92.2% area-weighted**, 13/13 anchors, 1204 tests. KRAJINA 99.6%, POSAVINA 94.5%, DRINA 81.8%, CENTRAL_CORRIDOR 90.3%, CENTRAL_BOSNIA 87.3%, SARAJEVO 90.1%, HERZEGOVINA 94.2%.
**n942 (2026-03-19) — Displacement Fix + Routing Overhaul + Sokolac OSID Fix:** Bug fix: 4/5 OSID control-flip paths (rear pocket, paramilitary, JNA phantom, null-claim) skipped displacement timer creation. 21.6% of RS OSIDs had zero Bosniak displacement. `seedDisplacementTimerOnFlip()` shared helper wired to all paths. Battle-driven timer also fixed to seed ALL minority factions. Routing overhaul: Drina split (`DRINA_ZVORNIK` → Tuzla, `DRINA_ENCLAVE` → Srebrenica), per-municipality Krajina routing, Krajina Bosniak flee-abroad 35% (ICRC convoys), Posavina Croat split (Brod/Derventa → south). Enclave-specific reinforcement rate 0.005. Sokolac 3 OSIDs to RS via `osid_control_overrides`. 9 micro-OSIDs removed from `operational_political_control.json` (753→744). **92.2% area-weighted.** Sarajevo 90.1% (+28.8pp from n916). Every region improved. Parameters: `REINFORCEMENT_RATE=0.02`, `ENCLAVE_REINFORCEMENT_RATE=0.005`, `DISPLACED_CONTRIBUTION_CAP=300`, `KRAJINA_BOSNIAK_FLEE_ABROAD=0.35`.
**n916 (2026-03-19) — Force-Scaled Objective Cap:** `maxObjectives = min(6, floor(brigades * 0.5))` — prevents small corps from launching overambitious multi-axis operations (3 brigades = 1 obj, 12 = 6). Operation arrows UI reworked (single arrow per op/axis). SID→OSID centroid key mismatch fixed (legacy SID keys enriched via `canonical_to_operational_map.json`). **91.0% area-weighted** (within noise of n915), **13/13 anchors**, 1193 tests (97 suites). Polygon topology investigation: 37 OSID pairs lack shared polygon edges; topology rebuild regresses calibration (quantization); vertex snapping approach planned. See `docs/40_reports/MAP_GEOMETRY_MASTER.md`.
**n915 (2026-03-18) — Corps-Level Operations:** Operations decoupled from sectors. `evaluateCorpsOffensiveLaunch` replaces per-sector loop with single corps-level launch: corps-wide brigade pool (all active subordinates with pers≥400, not disrupted) + corps-wide enemy OSID union across all sectors. Contiguity seed from ALL corps sectors' friendly OSIDs. Staging picks nearest to first objective. Probes remain sector-scoped. Removed sector cluster expansion + `computeReinforcementPool` (-69 net lines). **91.1% area-weighted** (+0.8pp from n913), **13/13 anchors**, 4/6 benchmarks (RBiH/RS w40 marginal). 92 orders (RS 69, RBiH 13, HRHB 10), 71 battles (44 present + 27 absent), att cas 10k, def cas 24k. 7 new tests (1191 total, 97 suites). Hash `b617a9a3137a6e20`. Full report: `docs/40_reports/implemented/20260318_CORPS_LEVEL_OPERATIONS.md`.
**n884 (2026-03-17) — AI Commander Engine Improvements:** Stance-aware density gate: offensive=0.08, balanced=0.12, defensive=0.167 (was fixed 0.167 for all). Offensive cooldown: SECONDARY_OP_COOLDOWN_TURNS_OFFENSIVE=3 (was 8 for all stances). Entrenchment effective cap: ENTRENCHMENT_EFFECTIVE_CAP_TURNS=26 (bonus plateaus at 1.36×). Alliance rebalance: DEFAULT_INIT_ALLIANCE 0.35→0.75, PATRON_PRESSURE_COEFF 0.015→0.018, war_earliest_turn 26→40. Conditional events: 3 events converted (corridor, jajce, camps) — fire on game state conditions. Corps status_reason field + op_launch_trace diagnostic. **90.4% area-weighted** (matches n875 baseline — zero regression from 6 engine changes). 1101 tests (was 1086), 89 suites. AI Commander API run: **91.0% area-weighted** with corps-level API decisions (680 API calls, $1.21). 321 diagnostic observations (0 bugs, 191 calibration, 22 design gaps, 108 historical divergences). Top findings: alliance decay still too fast, ARBiH over-mobilized (150k vs 80-90k historical), late-war stasis persists.
**n842 (2026-03-17):** Brigade front distribution pipeline step. `distribute-brigades-to-front` after `assign-brigades-to-subsegments` (133 total steps). Phase A: redistribute fresh (entrenchment<1) stacked brigades to adjacent empty front OSIDs. Phase B: column march for rear brigades (max 8 hops). Exempts siege corps, ops participants, disrupted. **89.5% area-weighted**, 13/13 anchors, **5/6 benchmarks** (RBiH w40 marginal). Stacking 46→36 (-22%), far-from-front 36→29 (-19%), at-front 177→187 (+6%). 144 orders, 74 flips. Hash `57a721ada60dc404`. 13 new tests (974+ total).
**n835 (2026-03-16):** Three structural fixes: (1) Stale-count oscillation — `columnAssignments` Map tracks planned movements during per-brigade eval, preventing all stacked brigades from marching to same destination. Bihac 7-stack GONE. (2) Centroids passthrough to `splitNonContiguousSectors` — `isCaseBBridge` angle check now fires. (3) Position viability — 5th commander override criterion pulls exposed brigades to safety. **89.4% area-weighted**, 13/13 anchors, **5/6 benchmarks** (RBiH w40 marginal +0.054 vs 0.05 tolerance). 151 orders (RS 97, RBiH 37, HRHB 17). 121 battles (+10 from n824). Hash `e6eac4450e598a41`.
**n824 (2026-03-16):** Army HQ override activation. Three fixes: (1) `corps_asset` kind bug — `generateArmyHQOverrides` was dead code, zero overrides generated. (2) Organic Sarajevo stance — E2 unconditional defensive replaced with army-HQ-aware bias. (3) Sarajevo Probing priority (weight 60, w15-56). **89.4% area-weighted** (+0.4pp from n819), **Drina 80.4%** (+2.7pp), **6/6 benchmarks PASS**, 13/13 anchors. 135 orders (RS 97, RBiH 27, HRHB 11). 111 battles. Att cas 19.7k, def cas 38.2k. Hash `0ecdd419df84b491`.
**n819 (2026-03-16):** Commander Override Layer Phase A. Four-criteria commander review: mission compliance, non-priority excess, offensive staging, defensive coherence. Supply-aware graduated operation sizing replaces binary gate. Reachability guard prevents cross-component transfers. **89.0% area-weighted**, **6/6 benchmarks PASS** (both previously failing benchmarks fixed: RBiH w40 0.378 vs 0.329 target dev +0.0495, RS w40 0.507 vs 0.553 target dev -0.0457). 13/13 anchors. 132 orders (RS 92, RBiH 28, HRHB 12). 109 battles. Att cas 19.6k, def cas 38.1k. Troop strength: RS 101k, RBiH 147k, HRHB 41k. War-or-Game APPROVED. Hash `829e9f2b691e42f6`.
**n697–n700 (2026-03-14):** Four realism fixes. (1) **n697 Graz faction-level RS→HRHB block**: `shouldGrazBlockAttack` now has a faction-level check — when Herzegovina truce is active, any RS corps not in `GRAZ_EXEMPT_RS_CORPS` (`vrs_1st_krajina`, `vrs_2nd_krajina`) is blocked from HRHB territory. Prevents SRK/Drina from generating HRHB offensive targets. 10 new vitest tests. (2) **n698 sector power/threat recompute**: `recomputeSectorPowerAndThreat()` extracted from `classifyBrigadesByTerritory` to Step 8c in `buildFactionSectors`, running AFTER `ensureMinimumSectorCoverage` — sectors rescued from 0→1 brigade now show correct `defensive_power` and `threat_ratio`. 3 new vitest tests. (3) **n699 SRK hold-the-ring**: New `hold_municipalities` field on `ArmyOperationPriority`; Sarajevo Siege priority adds 5 municipalities; `bot_corps_directives.ts` processes them unconditionally (unlike `defensive_priorities` which skips offensive corps). SRK directive has 29 hold_osids at w40. (4) **n700 NWB stance fix**: `orasje` removed from `HRHB corridor_municipalities` — hvo_northwest_bosnia no longer forced to `defensive`; now correctly `balanced`. Posavina Corridor Relief army priority added with explicit `target_osids` (reverseMap doesn't include Posavina municipalities). Supply gate (critical_fraction=1 for besieged pocket) correctly prevents actual offensive ops — historically accurate. **Results: 88.6% area-weighted** (unchanged from n696), **6/6 benchmarks PASS**, 606 vitest tests pass (+10). Hash `7988bff8c990c3d8`.
**n696 (2026-03-14):** Commander-driven brigade assignment. Four changes: (1) **Phase 2a home affinity — need gate removed**: brigades always go to home-municipality sector regardless of whether sector is already at capacity. (2) **Phase 2b competence gate**: commanders with competence ≥ 0.35 (normalized 0–1) deliberately shape pool assignment — aggressive (aggr ≥ 0.6) concentrates at highest threat-ratio sector; defensive (aggr ≤ 0.4) fills thinnest sector; balanced falls through to BFS. Low-competence commanders (< 0.35) skip entirely to BFS. (3) **Phase 2c BFS cap 8→4 hops** (`PHASE_2C_MAX_HOPS`): surplus brigades more than 4 hops from any sector front stay in place rather than marching across the map. (4) **Phase 2d pre-op staging weight**: active operation in `intel_gathering` phase multiplies sector need by 1.5×; `force_staging`/`assessment`/`ready` by 3.0×. `buildCorpsCommanderProfiles()` reads `named_officers` + `corps_command.active_operation` per corps. `CorpsCommanderProfile` interface encapsulates personality snapshot. Officer competence normalized from 1–5 scale. **Results: 88.6% area-weighted** (same as n695), **6/6 benchmarks PASS** (improved from n692's 5/6). 69 sectors at w40 final, 0 disconnected. RS w40 0.515, RBiH w40 0.373. 11 new tests (596 total vitest). Hash `5bd0de05277f63e5`.
**n695 (2026-03-14):** Sectorless brigade bug fix — `reclassifyRearBrigades` silently dropped non-winning reserve candidates. Brigades 1 hop behind the front that lost the 1-reserve-slot competition were being removed from `assigned_brigade_ids` but never added to `reserve_brigade_ids`, disappearing from all sector lists. Fix: non-winning candidates returned to `keepAssigned`. Fixes 4 brigades (803rd Light/Goražde, 282nd/Srebrenica, 443rd/Konjic, 4th Muslim Light/Konjic). **88.6% area-weighted** (+1.3pp from n694). Sarajevo +20pp (803rd now defending Goražde). 0 bug-category sectorless brigades. 10 remaining sectorless are all expected (7 HVO Central Bosnia deferred + 3 disconnected pockets). tsc clean. 585 tests pass. Hash `679c476d945fe2bf`.
**n694 (2026-03-14):** Topological sector geometry fix (P0 + P1). Two structural fixes: (1) **`isCaseBBridge()` — Case B angle check**: vectors from hostile centroid H to friendly centroids fi/fj; if angle >165°, the connection wraps around an enemy pocket and is rejected. Wired into both `buildEdgeAdjacency` and `buildEdgeAdjacencyStrictCaseB`. Enabled by OSID centroid restoration (expert session — all 744 nodes now have lat/lon in contact graph). (2) **Step 3c home-brigade protection**: `consolidateIsolatedCorpsPockets` now skips reassignment when a brigade of the correct corps is physically stationed in the pocket (`location_osid` guard). Fixes 3rd Corps Zavidovici being swallowed by 1st Corps. Infrastructure: `OsidCentroid`/`OsidCentroidMap` types, `loadOperationalCentroids()` loader, `OperationalDataCache.centroids`, loaded in parallel and passed through to `buildCorpsFrontSectors`. Also: RS/HRHB warroom backgrounds wired to WebP assets (all years 1991–1995). **Results confirmed**: hajderovici_2 (Zavidovici) now in 3rd Corps sector 5; kamensko_2 (Olovo) now in 2nd Corps sector 9 — gornja_borovica_2 bridge severed. 1st Corps correctly scoped to Sarajevo-area only. **87.3% area-weighted** (−0.5pp from n693, within noise — geometry change reshuffles combat dynamics). **0 disconnected sectors**. tsc clean. **585/585 tests pass**. Hash `dc1668eb74af26e5`.
**n693 (2026-03-14):** Phase 2b brigade proximity fix — distance-weighted scoring `score = need / (1 + distance)`, hard cap `MAX_ASSIGNMENT_HOPS = 8`. Fixes Gračanica→Zvornik and Hadžići→Višegrad brigade displacement. **87.8% area-weighted**, **6/6 benchmarks PASS**. 131 sectors, 0 disconnected. Hash (committed as n693).
**n692 (2026-03-13):** Case B split threshold 5.5m→16.6m + merge safety. Exploits natural gap in Case B distance distribution (15.5–24.6m has zero connections). **88.2% area-weighted**, **5/6 benchmarks** (RBiH w40 over by 0.9pp). 131 sectors, 0 disconnected. Hash `5a49833cdfbdbeef`.
**n682 (2026-03-13):** Strict Case B at 5.5m — cross-enemy sector elimination. **87.1% area-weighted**, **6/6 benchmarks PASS**. 144 sectors, 0 disconnected. Hash `80ed2277198190ec`.
**n668 (2026-03-13):** Layer B — Independent sector stances. Five stances (Fortify/Defend/Elastic/Active Defense/Screening) with own reactive bonus and entrenchment rate. Bot AI evaluates per-sector (threat ratio, cold fronts, staging ops, offensive targets). Corps stance sets ceiling. Player override persists. Stance reactive bonus multiplies Layer A reactive reserves. Entrenchment rate modifier on per-turn growth. Results: **89.0% area-weighted** (−0.3pp from n667, within noise). **6/6 benchmarks PASS**. RS w40 **0.519**. RS delta **−22**. 54 test files, 585 tests. Hash 78a9d9943486d996. Zero calibration regression — Layer B modulates defense without disrupting territorial outcomes.
**n667 (2026-03-13):** Layer A tuning — HOME_DEFENSE_REACTIVE_BONUS 1.5→1.3 (war-or-game audit: 1.5 structurally favored ARBiH). Results: **89.3% area-weighted**, **6/6 benchmarks PASS** (RBiH preserve_survival_corridors now within tolerance: dev +0.0495 vs 0.05). RS w40 **0.517**. RS delta **-24**. 172 orders, 151 battles, att cas 24.4k, def cas 35.0k (att:def 0.70:1). Hash fc7804b179de4b50. The 1.3 bonus correctly represents home-territory motivation without over-strengthening ARBiH concentrated defenses.
**n666 (2026-03-13):** Layer A — Distance-weighted reactive defense. Per-brigade reserve contribution weighted by BFS hop distance (decay `0.60^hops`, max 5) + home-municipality motivation bonus (1.5×). Casualty distribution proportional to same weights (replaces 50/50 primary/secondary split). `munFromOsid()` extracted to shared `osid_adjacency.ts`. New `bfsDistanceFriendly()` and `getReactiveDistanceWeight()` in `combat_math.ts`. Resolver and predictor both reworked. 20 new tests (565 total vitest). Results: **89.1% area-weighted** (up from 87.9% at n653). **5/6 benchmarks** — RBiH `preserve_survival_corridors` soft fail (RBiH TOO STRONG: 0.380 vs 0.329, +0.051 dev — home bonus makes concentrated defense more effective). RS w40 **0.515** (down from 0.522). RS delta **-25**. 170 orders (RS 133, RBiH 25, HRHB 12), 148 battles, att cas 23.6k, def cas 36.2k (att:def 0.65:1). 84 OSID flips. Hash d6bb204e84324efb. **Analysis:** Home-municipality bonus (1.5×) strengthens concentrated defenses at key points (Sarajevo, Tuzla, Bihać). Thin spots are genuinely thinner (distance decay) but the net effect is pro-defender — defense quality UP. This is historically correct: Bosnian units fighting for their hometowns were fanatically motivated.
**n647 (2026-03-12):** Drina Corps reinforcement + Operation Podrinje Sweep. Three changes: (1) 1st Guards Motorized (`rs_1st_guards_motorized`) transferred from `vrs_main_staff` to `vrs_drina`, home_osid changed to `op:rogatica:stara_gora`. (2) 65th Protection Motorized (`rs_65th_protection_motorized_regiment`) transferred from `vrs_main_staff` to `vrs_drina` (home_osid unchanged, Han Pijesak). (3) New pre-planned Operation Podrinje Sweep queued after Operation Drina — two axes: Rogatica-Sokolac (4 brigades: 1st Guards, 65th Protection, 2nd Romanija, 1st Podrinje) + Srebrenica Ring (3 brigades: 1st Bratunac, 1st Milići, 1st Birač). Results: **88.8% area-weighted** (up from 86.0% in n645/n646). RS w40 **0.489** (up from 0.482). Drina region **82.3%** (up from 73.5%). 12/14 benchmarks (Brčko + Gradačac anchors still fail). 117 battles (RS 92, RBiH 19, HRHB 6). RS 89.1% success rate. **Concerning:** 0.1:1 defender-heavy casualty ratios (sector cascade overcorrection from n590). Srebrenica Ring axis: 0/6 objectives. Podrinje Sweep ran 23 weeks for 7 captures. RS still below 0.503 floor — count-based deficit is 45 small OSIDs in Drina (26) and Central Bosnia (14).
**n645 (2026-03-12):** Movement-only stall detection fix in `sector_offensive.ts`. Two bugs: (1) Stall check gated behind `attack_attempt_count === 0` — ops that attacked early then stalled forever never aborted (SRK Operation Prsten blocked for 40 weeks). (2) `movement_only_execution_turns` never reset on objective attacks/captures — was monotonic lifetime counter, not consecutive. Fix: removed gate from both multi-axis (line 851) and single-axis (line 1000) stall checks; added reset to 0 on objective attacks (lines 808, 952) and captures (lines 779, 931). Results: RS w40 **0.482** (up from 0.470), SRK now launches 3 ops with 11 captures, total RS battles 90 (up from 88). Still below 0.503 floor — blitz intensity insufficient to compensate for march-first battle count reduction.
**n636 (2026-03-12):** Three fixes: (1) **Attack-through march-first (CRITICAL)** — during operation execution, brigades not adjacent to objective were attacking easiest adjacent target by power_ratio regardless of direction (code comment lied about "prefer closer to objective" — no distance calc existed). Fix: march through friendly territory FIRST; attack-through only when no friendly path. Also filters attack-through to same-faction targets. (2) **Enclave explicit OSID lists** — Srebrenica (13), Žepa (1), Goražde (16) now use painted Jan 1993 OSID lists instead of prefix matching. (3) **Brigade timing** — 107th Gradačac/108th Brčko available_from 8→2. Results: 12/14 benchmarks, **86.3% area-weighted**, RS w40 **0.470** (BELOW 0.503 floor — march-first significantly reduced RS conquest, needs rebalancing). **Lesson:** `.find()` on power_ratio-sorted list ≠ "prefer closer to objective." Always verify sort key matches comment.
**n635 (2026-03-12):** Disconnected brigade assignment fix — 20→0 disconnected sector assignments. Three fixes: (1) `classifyBrigadesByTerritory` Phase 2b fallback: skip brigade when no reachable sector (was falling back to any corps sector, ignoring connected components). (2) No-sectors-for-corps fallback: skip corps (was dumping into sectors[0]). (3) Cross-component density transfer guard: `frontTerritoryOsids` set ensures rear brigades only eligible if located in front sector territory (prevents pulling pocket/enclave brigades). Results: 6/6 benchmarks PASS, **86.3% area-weighted** (+0.5pp from n631), RS w40 0.505, RS delta -33, 0 disconnected (was 20). Hash 4a0306c7e6b1c0b7.
**n631 (2026-03-12):** Two P1 bot AI fixes: (1) `hasEligibleAttackersForLaunch()` pre-screen in `sector_offensive.ts` — checks ≥1 brigade has personnel≥400, active, not disrupted before launching operation. (2) Cross-component rear-to-front density transfer in `bot_corps_directives.ts` — after same-component pass, scans rear sectors (0 front edges) for idle brigades and issues column march to deficit front sectors (max 2 per deficit). Results: 6/6 benchmarks PASS, **85.8% area-weighted** (+2.4pp from n626), RS w40 0.518 (hold), 193 orders (RS 141, RBiH 30, HRHB 22), 170 battles. Zero-eligible per-turn count 66 (mid-execution degradation, expected — pre-screen prevents hopeless launches but can't prevent brigades degrading during multi-turn execution). Hash 8a830346d250192c. Calibration target ≥85% MET.
**n588 (2026-03-11):** Low-morale desertion in `morale_drift.ts`. Morale 0: 5%/turn personnel loss (was 5% after 3-turn delay). Morale 1-14: 2%/turn (new). Removed `zero_morale_turns` delay — desertion now immediate. Results: 6/6 benchmarks, 85.8% area-weighted (identical to n587), RS delta -31, 220 orders. **Insanity check:** morale-0 zombies actively draining (posusje 1030→805, 2nd ozren 579→429, 4th ozren 786→709). 12 low-morale active (was 4 at morale≤5 in n587 — more caught in the 5-15 range now, all draining). No regression.
**n587 (2026-03-11):** Corps AoR BFS bug fixed — Phase 1b municipality guard prevents 4th Corps from stealing Sarajevo. 6/6 benchmarks, 85.8% area-weighted, RS delta -31, 220 orders (RS 164, RBiH 41, HRHB 15), 202 battles, ~58k total casualties. **Insanity check findings:** (1) Equipment IS working (field is `composition`, not `equipment` — RS 535 tanks, 1158 arty). (2) Operations ARE healthy (6→12 active ops across 40 weeks, not "2" — `.ops` is config flag). (3) **REAL issues found:** 4 morale-0 zombie brigades (dissolution criteria gap), 50:1 catastrophic casualty ratios (defender near-invulnerable), no probe/recon operations (corps attack blind). See REAL_WAR_MASTER.md #17, #18, #21.
**n500 (2026-03-10):** Three structural combat engine changes: (1) **Ops-only attack doctrine** — brigades NEVER attack independently; all attacks flow through CorpsOperation. `evaluateOffensive`, `evaluateDefensive`, `evaluateReorganize`, `evaluateHomeDefense` stripped of independent attack logic. Counter-attacks (retake lost position) sole brigade-level exception. (2) **Unified sector defense** — defense at any OSID = `totalPower * (1/sector_edges) * densityMod`. No brigade-at-OSID vs sector-coverage distinction — front is a continuous locked line. Casualty distribution: 50% primary (closest brigade), 50% proportional by personnel to rest of sector. SECTOR_COVERAGE_PENALTY eliminated. (3) **Attack-through** — brigades in execution attack best adjacent enemy OSID when not adjacent to objective (score 800 vs 900 for direct objective). Operation lifecycle tracks intermediate attacks as approach progress via `anyAttackedObjective`/`anyAttackedAnything` split. Additional: **Corps exhaustion decay** (EXHAUSTION_DECAY_IDLE=3/turn, EXHAUSTION_DECAY_ACTIVE=1/turn — prevents permanent operation lockout). **Brigade no-destruction** (`forceRetreatWithPenalties()` replaces all 5 destruction paths; EMERGENCY_RETREAT_PERSONNEL_RETAIN=0.60, COHESION_LOSS=20, DISRUPTED_TURNS=3). **Probe threshold** lowered to 'repulsed' (brigades follow orders). **Results:** 6/6 benchmarks PASS. 126 attacks (was 68 in n493). RS 55.0% w40 (target 55.3%). RBiH 32.9% (target 32.9%). 100% attack success rate (defense per-edge too weak — tuning needed). Att cas 7.3k, def cas 19.3k. War continues through w36 (was dead at w26 pre-exhaustion-decay). **Anchor failures:** Bihać falls to RS (should hold), Orašje falls. **Remaining:** 100% attack success rate needs defense floor per edge. HRHB 0 attacks. Casualties ~26k (below 40-60k historical). Maneuverable brigade tagging not yet implemented.
**n458 (2026-03-09):** Corps HQ formations removed from map (no location_osid). hvo_central_bosnia un-exempted (7 brigades get sectors). Exempt-corps brigades filtered from pre-planned ops. Area-weighted: 87.7% (up from 87.2%). RS delta -53. 195 active brigades: 131 front (67.2%), 58 reserve, 6 unassigned. 6/17 mech/moto in active operations. Troops: RS ~106k, RBiH ~120k, HRHB ~44k.
**N304 Combat Mechanics Overhaul (2026-03-08):** Three critical bugs fixed that were suppressing combat dynamics for the entire simulation. (1) **Fatigue reset bug** (`formation_fatigue.ts:358`): `Number.isInteger(1.5) === false` caused `updateFormationFatigue` to reset all fractional fatigue values to 0 every turn — `FRONTLINE_FATIGUE_PER_TURN=1.5` never persisted. Fix: replaced `Number.isInteger` guard with `typeof !== 'number' || isNaN()`. Impact: 189 formations now accumulate fatigue (avg 29.6, max 30). RS offensives naturally stall by ~w30 without hardcoded phase switches. (2) **OSID attack path missing equipment losses** (`attack_resolution_osid.ts`): The live OSID battle resolution path had ZERO equipment loss logic — tanks and artillery were immortal. Added `TANK_LOSS_RATE=0.08`, `ARTILLERY_LOSS_RATE=0.04` (defender at 0.5× rates). Minimum-1 loss floor prevents rounding to zero with small counts. Equipment now degrades: RS tanks 674→428, artillery 502→413; ARBiH tanks 25→4; HRHB tanks 90→52. (3) **Frontline attrition rate** (`frontline_attrition.ts`): `BASE_ATTRITION_RATE` raised 0.003→0.005 — with fatigue and equipment working, the lower rate produced insufficient casualties. **Results:** ATH improved 87.0%→93.8% area-weighted (+6.8pp) purely from mechanical fixes — no new overrides. Total casualties 121.8k (KIA 31.4k). RS casualties 53.2k, RBiH 51.1k, HRHB 17.5k. Troop strength: RS=97.3k, RBiH=102.8k, HRHB=30.4k. **Key insight:** VRS doctrinal arc (professional→degraded) now emerges organically from fatigue accumulation + equipment attrition, exactly as canon requires. HRHB supply at 0 is near-equilibrium (income 1.576 vs drain 1.575/turn) — historically plausible. Remaining gaps: HRHB troop strength 30.4k vs 41.5k target; RS casualties > RBiH (historically should be opposite).
**Paramilitary Sweep Subsystem (2026-03-08 update):** New `'paramilitary'` FormationKind for autonomous rear pocket cleanup. Small units (150 personnel) spawn when graph analysis detects enemy OSID clusters (1-3 connected same-controller OSIDs where ALL external neighbors are faction-controlled). Instant capture (PARAMILITARY_MARCH_TURNS=0) — rear pockets are already surrounded. Active weeks 0-20 only (PARAMILITARY_FADE_WEEK). Faction-differentiated spawn rates: RS=0.85, HRHB=0.55, RBiH=0.30. Casualties (military + civilian) count toward faction totals via `recordBattleCasualties()` with standard KIA/WIA/MIA split. Civilian casualties properly initialized via `??=` (fix: `civilian_casualties` object was optional and silently dropped when not present). Player faction: `paramilitary_policy` standing order + per-request decisions. Bot factions: auto-approve. n326 results: 27+ pockets detected and swept, civilian casualties recorded (RBiH +1,800, HRHB +500, RS +500). Bot corps AI defers to paramilitaries (excludes paramilitary target OSIDs from opportunistic targeting). Pipeline steps: `paramilitary-detect` and `paramilitary-advance` after `partition-corps-front-sectors`. Excluded from reinforcement, bot AI, formation spawn. Deployment count tracked per faction for future consequence scaling. Full report: `docs/40_reports/implemented/20260307_PARAMILITARY_SWEEP_FEATURE.md`.
**N290 Sector-Only Operations + JNA Ghost Kupres (2026-03-07):** Three structural fixes to bot corps operation creation. (1) **Rear-area brigade dump removed** (`bot_corps_ai.ts:1821-1828`): When a sector cluster had <3 front-line brigades, code dumped ALL remaining corps subordinates into the operation — for 1KK (36 brigades), this meant 31 participating in one op for 3 objectives. Fix: only sector-assigned brigades participate; if sector lacks brigades, no launch — corps density balancing reinforces first. (2) **MAX_PARTICIPATING_BRIGADES=12** cap added in `sector_offensive.ts` — prevents bloated sector offensives even with large sectors. (3) **Old catalog-based `generateCorpsOperationOrders` disabled** — non-sector-aware path picked 5 brigades from entire corps pool using hardcoded municipality templates. Redundant with sector offensive path in `generateCorpsDirectives`. (4) **JNA ghost phantom for Kupres**: `jna_9th_corps_tg` captures `op:kupres:goravci` + `op:kupres:kupres_2` at spawn (turn 0) via `capture_osids`, dissolves at turn 4 without equipment handoff (`no_equipment_handoff: true`). No 2KK pre-planned operation — adding one caused −6.7pp regression. (5) **post_op_stance/stance_cap mechanism reverted** — removed from `game_state.ts`, `sector_offensive.ts`, `bot_corps_ai.ts`, `pre_planned_operations.ts`. Result: 88.1% area-weighted (+0.4pp over n278 baseline 87.7%), KRAJINA 96.9% (was 90.1%), RS count delta −23 (was −68). Key lesson: Operations must be sector-sourced — pulling brigades from entire corps pool creates bloated ops that disrupt force balance across the front.
**N252/N254 Phase E Municipality Support (2026-03-07):** Deferred player-agency Phase E is now implemented as an asymmetric, faction-specific municipality-support layer: `RBiH` stages `weapons_shipment`, `RS` stages `staff_priority`, `HRHB` stages `croatian_support_package`. 40w verification run `n252` stayed green where it matters for this lane: final hash `79a01c403c82038c`, `valid_for_combat_calibration = true`, `invalid_operation_count = 0`, benchmark suite `6/6`. Informational 52w run `n254` also preserved combat-causality validity (`invalid_operation_count = 0`) but remained historically weak (`2/6` benchmarks; failed anchors at `bihac`, `op:zvornik:sapna`, `op:ugljevik:teocak_krstac_2`). Interpretation: the new mechanic itself is dormant without staged player orders, so `n254` should be treated as branch-level long-horizon drift evidence, not as proof that Phase E changed bot behavior. Full implementation report: `docs/40_reports/implemented/20260307_PLAYER_AGENCY_IMPLEMENTATION_A_TO_H.md`.
**N249 Player-Agency Closure (2026-03-07):** Documentation closure after Phases A/B/C/F/G/H implementation and final refactor pass. Latest verified run remains the player-agency closure lane: final hash `f5e0e48c6d2538ab`, `invalid_operation_count = 0`, `valid_for_combat_calibration = true`, benchmark suite `6/6`. The branch is now combat-calibration-valid again after `n248`, with `n249` preserving the same final state hash through cleanup-only changes. Remaining drift is anchor-level, not engine-integrity-level: municipality `srebrenica` and OSID `op:brcko:brka_2`. Full implementation report: `docs/40_reports/implemented/20260307_PLAYER_AGENCY_IMPLEMENTATION_A_TO_H.md`.
**N241 Calibration (2026-03-07):** Systematic override expansion n235→n241. Area-weighted: 89.2%→93.6% (+4.4pp). 98 RS control overrides; 3 RS avoided_osids. Gains: KRAJINA 89.4%→97.8% (HRHB-held cells forced RS); CENTRAL_BOSNIA 83.5%→90.7% (donji_vakuf/jajce/kladanj/konjic/travnik anchors); CENTRAL_CORRIDOR 87.4%→92.1% (ilijas cells); POSAVINA_NE 92.7%→94.0% (bijeljina/zvornik); DRINA 91.9%→92.7% (zapolje_2, miljevina_2, gacko); HERZEGOINA 91.7%→93.9%; SARAJEVO 78.1%→80.3%. CASCADE LESSONS: (1) HRHB-cell overrides must be isolated by region — adding all at once (n237) caused POSAVINA_NE −9.9pp and SARAJEVO −9.3pp cascade; (2) avoided_osids cannot stop consolidation-captured cells — VRS redirects combat effort elsewhere (n240: POSAVINA_NE −12.2pp); (3) bijeljina cells redirect Bijeljina corps into Tuzla basin. CEILING: ~93.6% with current mechanics. Remaining mismatches require enclave mechanics (gorazde/srebrenica/žepa consolidation cascade), HRHB-to-VRS Jajce transition mechanic, VRS aggression cap for Tuzla basin, and Sarajevo siege model. Report: docs/40_reports/implemented/20260307_CALIBRATION_N235_N241_AREA_WEIGHTED_93PCT.md
**N218 Deep Analysis (2026-03-07):** Full Pyrrhic team 40w analysis. 84.2% area-weighted stable (same as n214). **Root cause of plateau:** Drina corps and East Bosnian corps go dormant after their pre-planned operation (3–4 weeks) and generate NO further operations for remaining 36 weeks — brigades frozen in home municipalities. Brcko regressed (RS lost 2 OSIDs it started with). This is an engine bug in corps operation relaunch path, not a data/scenario problem. Secondary issues: 504th ARBiH brigade not spawning (leaves Bihać:orasac_2 undefended → 2nd Krajina opportunistically captures, tipping bihac anchor); RBiH civilian killed 13,766 (~2× historical → DISPLACEMENT_KILLED_FRACTION_RBIH_FROM_RS=0.02 recommended); att:def 3.4:1 slightly high. Bihac municipality anchor is FALSE ALARM — fix to OSID-level `op:bihac:bihac_2`. Expected impact of fix: Drina 69%→85%+, Posavina/NE 72%→82%+, overall 84.2%→92–95%.
**N159 Deep Audit (2026-03-06):** 5-phase calibration addressing 14 issues from the full Paradox 40w engine audit.
- **Phase A (P0 bugs):** All three resolved without code changes — brigade_history working, posture lifecycle correct, displaced_out reporter already fixed.
- **Phase B (casualty tuning):** BASE_ATTRITION_RATE 0.005→0.003, BOMBARDMENT_EXPOSURE_RATE 0.012→0.008, BASE_ATTACKER_LOSS_RATE 0.045→0.04, BASE_DEFENDER_LOSS_RATE 0.02→0.028. Att:def ratio target 2.5-3:1 (was 4.78:1).
- **Phase C (organic VRS tempo decay):** RS doctrine phases reduced to 2 (both offensive — no artificial defensive regression). RS stays offensive permanently; tempo decay is organic via fatigue, supply, entrenchment. Fatigue now meaningful: recovery every 2 turns, +0.5/turn frontline duty, cap 30 (was 20), fatigue directly degrades combat power (×0.6-1.0 attack, ×0.75-1.0 defense). Entrenchment diminishing returns (sqrt curve). FATIGUE_MAX consolidated to single shared constant.
- **Phase D (supply & exhaustion):** MAINTENANCE_DRAIN_PER_FORMATION 0.025→0.045 (RS general 68% by w40, was 100%). RBiH patron commitment reduced (0.6→0.3 in 1992 — arms embargo). HRHB patron raised (0.5→0.6). UN airdrops capped (15→3/turn). HRHB initial supply 55→75.
**Canonical target run:** n65 (ATH 99.2% area-weighted, commit a689d83)

**Current ceiling (post–Trust-and-Baseline Phase B, 2026-03-08):** The **accepted current best-known ceiling** for the branch after the Trust-and-Baseline execution plan (Phase A serialization contract, Phase B re-prove) is **n415 at 89.4% area-weighted** (supply balance + morale collapse). Verification run **n439** (2026-03-08): scenario `apr1992_definitive_40w`, run ID `apr1992_definitive_40w__05c8e7a070f0350d__w40_n439`, `final_state_hash`: `df2f5e61abedd929`. Artifacts: `runs/apr1992_definitive_40w__05c8e7a070f0350d__w40_n439/` (run_summary.json, weekly_report.jsonl, control_change_attribution, behavioral_health). Control-change attribution: combat=102, total=103. Combat-causality: valid_for_combat_calibration=false (14 invalid ops; zero_eligible_attacker_operation_count=13). This run confirms deterministic 40w completion on the current branch; the ceiling figure (89.4%) remains n415 until a dedicated calibration run with area-weighted comparison updates it.

**Latest calibration run:** n916 (Force-scaled objective cap + operation arrows + SID→OSID fix. 91.0% area-weighted, 13/13 anchors. 1193 tests.)
**Previous calibration run:** n915 (Corps-level operations. 91.1% area-weighted, 13/13 anchors. 1191 tests. Hash b617a9a3137a6e20.)
**Previous calibration run:** n835 (Stale-count oscillation fix + centroids passthrough + position viability. 89.4% area-weighted, 5/6 benchmarks. 151 orders, 121 battles. Hash e6eac4450e598a41.)
**Previous calibration run:** n824 (Army HQ Override Activation: corps_asset kind fix + organic Sarajevo stance + Sarajevo Probing priority. 89.4% area-weighted, 6/6 benchmarks. Hash 0ecdd419df84b491.)
**Previous calibration run:** n696 (Commander-driven brigade assignment: competence gate, home affinity, pre-op staging. 88.6% area-weighted, RS w40 0.515. 6/6 benchmarks. Hash 5bd0de05277f63e5.)
**Previous calibration run:** n695 (reclassifyRearBrigades reserve-cap silent drop fix. 88.6% area-weighted, RS w40. 6/6 benchmarks. Hash 679c476d945fe2bf.)
**Previous calibration run:** n694 (isCaseBBridge angle check + Step 3c home brigade protection. 87.3% area-weighted. Hash dc1668eb74af26e5.)
**Previous calibration run:** n693 (Phase 2b distance-weighted scoring + MAX_ASSIGNMENT_HOPS=8. 87.8% area-weighted, 6/6 benchmarks.)
**Previous calibration run:** n692 (Case B split threshold 5.5m→16.6m + merge safety. 88.2% area-weighted, 5/6 benchmarks. Hash 5a49833cdfbdbeef.)
**Previous calibration run:** n669 (Layer C — Player Visibility UI. 89.0% area-weighted, RS w40 0.519. 6/6 benchmarks. Hash ecef32e0f82f1543. Zero regression — UI-only changes. Defense heat map, AAR defender breakdown, home badges, defense tooltip, map mode 7.)
**Previous calibration run:** n668 (Layer B sector stances. 89.0% area-weighted, RS w40 0.519. 6/6 benchmarks. Hash 78a9d9943486d996.)
**Previous calibration run:** n667 (Layer A tuning — HOME_DEFENSE_REACTIVE_BONUS 1.5→1.3. 89.3% area-weighted, RS w40 0.517. 6/6 benchmarks. Hash fc7804b179de4b50.)
**Previous calibration run:** n666 (Layer A — distance-weighted reactive defense. 89.1% area-weighted, RS w40 0.515. 5/6 benchmarks — RBiH soft fail. Hash d6bb204e84324efb.)
**Previous calibration run:** n664 (Sector contiguity fix — triple-junction split + shared front-edge territory. 88.7% area-weighted, RS w40 0.525. 6/6 benchmarks. Hash 0ca780c065365530.)
**Previous calibration run:** n653 (Uncontested occupation + Kotor Varos overrides. 87.9% area-weighted, RS w40 0.522. 6/6 benchmarks. Hash 10a33b05dbcb94a9.)
**Previous calibration run:** n647 (Drina elite units + Podrinje Sweep. 88.8% area-weighted, RS w40 0.489.)
**Previous calibration run:** n646 (Blitz attack_share 0.35→0.42 — zero effect, reverted. Same as n645.)
**Previous calibration run:** n645 (Stall detection fix: movement_only_execution_turns reset + gate removal. RS w40 0.482, still below 0.503 floor.)
**Previous calibration run:** n635 (Disconnected brigade assignment fix: Phase 2b + no-sectors fallback + frontTerritoryOsids guard. 6/6 benchmarks, 86.3% area-weighted, RS w40 0.505, 0 disconnected. Hash 4a0306c7e6b1c0b7.)
**Previous calibration run:** n620 (Sector split shared-OSID connectivity fix: `splitNonContiguousSectors` replaced triple-junction adjacency with shared-OSID connectivity — two front edges adjacent iff they share at least one OSID endpoint. Prevents sectors spanning physically disconnected fronts (Srebrenica/Cerska bridged through distance_contact adjacencies). `splitDisconnectedTerritorySectors` removed (dead code — territory BFS couldn't split connected RBiH territory). `settlements_parse.ts` `parseEdges` fixed to copy `type` and `min_dist` from contact graph edges. Results: 6/6 benchmarks PASS, **82.8% area-weighted** (was 86.3%), RS delta **-23**, hash 269533c89e00314e. Sectors ~78. Srebrenica/Cerska correctly split.)
**Previous calibration run:** n618 (Morale-victory feedback Stage 1: battle habituation `1/(1+count×0.03)`, faction sensitivity (victory: RS 0.8, RBiH 1.3, HRHB 1.0; defeat: RS 1.3, RBiH 0.7, HRHB 1.0), faction home morale floors (RBiH 30, HRHB 25, RS 20 — replaces flat 15), RBiH existential floor (25 at co-ethnic >50%). Drift path only — shock in attack_resolution_osid.ts untouched. Results: 6/6 benchmarks, **86.3% area-weighted** (unchanged), RS delta **-24**, **216 orders** (RS 154, RBiH 32, HRHB 30), att cas 32.2k, def cas 41.0k. Zero regression from n617. 19 new tests (520 total vitest). REAL_WAR_MASTER #5/#10 addressed.)
**Previous calibration run:** n617 (Intel-gated operations: bot AI checks sector intel confidence before launching. Low-confidence → probe op (max 2 brigades, 1-turn planning, 'repulsed'). Thresholds: RS 0.25, RBiH 0.40, HRHB 0.30. RS blitz (w0-12) exempt. MAX_CONSECUTIVE_PROBES=2. `getSectorIntelConfidence()` + `shouldLaunchProbeInstead()`. State: `CorpsCommandState.consecutive_probes`. Results: 6/6 benchmarks, **86.3% area-weighted** (stable from 86.5%), RS delta **-24**, **216 orders** (RS 154, RBiH 32, HRHB 30), att cas 32.2k, def cas 41.1k. RS w40 **improved 0.505→0.517** — more headroom. RBiH orders +60% (20→32, probes generating activity). REAL_WAR_MASTER #21 CLOSED. Supply gate fix: op participants bypass critical supply for movement. 12 new tests, 501 total vitest.)
**Previous calibration run:** n590 (Sector casualty base fix: `personnelDefender` now uses total sector brigade personnel instead of primary-only. Root cause of 44:1 outliers — sector defense power aggregated 5+ brigades but casualty base used one brigade's 500 men. Combined with n589 outcome mod fix (0.3→0.7). Overall att:def **0.88:1** (was 1.07:1). Worst outlier **22.7:1** (was 44.5:1). Avg catastrophic ratio **8.5:1**. Zero 50:1 battles. 6/6 benchmarks, **86.3% area-weighted** (+0.5pp), RS delta **-23** (improved). 221 orders (RS 161, RBiH 38, HRHB 22). Def cas **40,058** (+23%). 2 morale zombies. **BOTH resolver AND predictor fixed in sync.**)
**Previous calibration run:** n589 (Catastrophic casualty ratio fix: `OUTCOME_DEFENDER_MOD['catastrophic']` raised 0.3→0.7 in `combat_math.ts`. Overall att:def ratio 1.07:1. 6/6 benchmarks, 85.8% area-weighted, RS delta -31. Outlier ratios still 22-44:1 — led to n590 sector base fix.)
**Previous calibration run:** n588 (Low-morale desertion: morale 0=5%/turn, morale 1-14=2%/turn. 6/6 benchmarks, 85.8% area-weighted, RS delta -31, identical to n587. Zombies actively draining. No regression.)
**Previous calibration run:** n587 (Corps AoR BFS fix: Phase 1b municipality guard. 6/6 benchmarks, 85.8% area-weighted, RS delta -31, 220 orders, 202 battles, ~58k casualties. Insanity check: equipment=OK (composition field), ops=OK (6→12), morale-0 zombies=OPEN, 50:1 catastrophic ratios=OPEN, no probe ops=OPEN.)
**Previous calibration run:** n554 (sector contiguity point-contact bridging fix + dev/live map split. `buildSharedBoundaryAdjacency` filters min_dist>0 edges. Threaded through sector pipeline Case B. Removed ~220 lines dead code. 78 sectors, 0 spanning Srebrenica+Visegrad. Area-weighted 88.5% (up from 87.0%). RS delta -29. Report: `20260310_SECTOR_CONTIGUITY_FIX_AND_DEV_LIVE_MAP_SPLIT.md`.)
**Previous calibration run:** n532 (triple-junction front-line-following fix in `buildEdgeAdjacency`, `splitNonContiguousSectors`, `isSegmentAdjacent`. Old approach walked through interior friendly territory — connected edges on opposite sides of enemy salients. Fix: two front edges connect iff they meet at a polygon triple junction: (A) same friendly + hostile adj, (B) same hostile + friendly adj. Code cleanup: removed duplicate edge parsing loop, replaced inline `isAdj` closures with `isOsidAdjacent` helper, removed unused params, fixed O(n³) in `consolidateIsolatedCorpsPockets` with reverse index. Sectors 52→77. Area-weighted 87.0%. RS delta -19 (was +104). 5/6 bot benchmarks PASS.)
**Previous calibration run:** n528 (sector contiguity enforcement: 3rd Corps 9→4 sectors, 0 isolated pockets. RS delta +117 (was +104). Troop: RBiH=136.8k, RS=114.5k, HRHB=49.3k. No benchmark regression. See `docs/40_reports/implemented/20260310_SECTOR_CONTIGUITY_AND_DEMARCATION_CLEANUP.md`.)
**Previous calibration run:** n500 (ops-only + unified sector defense + attack-through: 6/6 benchmarks, 126 attacks, RS 55.0%, RBiH 32.9%. 100% attack success — defense needs floor. See n500 entry above. **NOTE:** attack-through was later found buggy — brigades picked easiest target by power_ratio, not closest to objective. Fixed in n636 with march-first priority.)
**Previous calibration run:** n458 (corps HQ cleanup, central Bosnia sectors, op participant filter: 87.7% area-weighted. RS delta -53. 195 active brigades: 131 front, 58 reserve, 6 unassigned.)
**Previous calibration run:** n452 (territory-based classification + mech/moto staging + reserve cap removal: 87.5% area-weighted. Territory_osids lookup replaces broken Priority 5 BFS in classifyBrigadesByTerritory — unassigned non-exempt brigades: 3 (down from 44). Reserve cap removed from sector_rearrangement.ts — corps gets full visibility of all manpower. Mech/moto staging pass in bot_corps_directives.ts — corps AI proactively stages offensive tools. RS delta -46.)
**Previous calibration run:** n438 (power-ratio casualty scaling + home defense op exemption + sector offensive tuning: 87.2% area-weighted (-2.2pp from n415). Cube-root (0.33) defender-only casualty scaling (`getPowerRatioCasualtyMult`). Home defense exemption for operation participants in execution phase. Sector offensive failure limits relaxed (3→5 total, 2→3 consecutive). Idle stall threshold >=1→>=2 (pipeline phase-ordering fix). Op Teocak redesigned (Kalesija brigades, available_from 25). RS delta -50. Regression expected — increased defender attrition changes territorial dynamics.)
**Previous calibration run:** n415 (supply balance + morale collapse: 89.4% area-weighted. MAINTENANCE_DRAIN 0.045→0.035 (RS OOB grew to 112 fmns). Critical morale penalty below 15 (0.3-1.0× combat power). Cohesion decay 2/turn at critical morale. RS delta -50 (improved from -70). KRAJINA 96.3%, DRINA 78.4% (+8.4pp), CENTRAL_BOSNIA 83.8%, POSAVINA 93.4%, CORRIDOR 89.5%, HERZEGOVINA 91.5%, SARAJEVO 86.2%.)
**Previous calibration run:** n414 (frozen front cascade fixes: 87.4% area-weighted. Concentration bonus (2=1.15×, 3=1.25×, 4+=1.30×), entrenchment degradation (-0.5/battle), hold OSID corps scoping, target adjacency filter, aggression floor (offensive=0.0). 711 attacks (RS=375), 539 battles, 44 flips. KRAJINA 94.9%, POSAVINA 93.6%, CORRIDOR 90.8%, HERZEGOVINA 90.3%, DRINA 70.0%. RS delta: +14 from painted.)
**Previous calibration run:** n366 (frontline attrition sector port + entrenchment reduction: 88.2% area-weighted. Ported from legacy `brigade_front_assignment` to `corps_front_sectors` `assigned_brigade_ids` lookup. `isColdFront()` rewritten for structured sector data. Entrenchment reduces passive attrition (sqrt diminishing returns, floor 0.40). KRAJINA 97.9%, HERZEGOVINA 91.5%, CORRIDOR 88.1%. KIA: RBiH=8.8k, RS=8.9k, HRHB=1.2k. Personnel: RBiH=127.2k, RS=105.9k, HRHB=44.5k. RS delta −70.)
**Previous calibration run:** n345 (cold-front attrition fix + pool recalibration: 86.8% area-weighted. RS↔HRHB cold fronts exempt from passive attrition + bombardment FP. HRHB siege drain skipped under Graz Accords. HRHB pool scale 1.60→1.05, RBiH 0.18→0.25. HRHB KIA 6.3k→1.6k (target headroom for 1993+ Croat-Bosniak war). Troop strength: RBiH=119.2k, RS=103.3k, HRHB=43.4k — all within tolerance. RS delta still −60.)
**Previous calibration run:** n326 (cluster pocket detection + paramilitary fixes: 85.8% area-weighted. Cluster BFS pocket detection (1-3 connected enemy OSIDs), instant paramilitary capture (MARCH_TURNS=0), civilian casualty initialization fix, bot corps AI deference to paramilitary targets. RS delta −60 — RS aggression recalibration needed.)
**Previous calibration run:** n304 (combat mechanics overhaul: 93.8% area-weighted (+6.8pp). Three critical bug fixes — fatigue reset, OSID equipment losses, frontline attrition rate. Total casualties 121.8k/31.4k KIA. Equipment degradation working. VRS doctrinal arc emerges organically. Report: this entry.)
**Previous calibration run:** n290 (sector-only ops + JNA ghost Kupres: 88.1% area-weighted. Three structural fixes — rear-dump removed, MAX_PARTICIPATING_BRIGADES=12 cap, old catalog ops disabled. JNA ghost captures Kupres at spawn, dissolves without equipment. KRAJINA 96.9%. RS delta −23.)
**Previous calibration run:** n218 (deep analysis run — same 84.2% area-weighted as n214. 168 attack orders, 141 battles, 44 combat-attributed flips. Troop strengths: RS=109.5k ✓, RBiH=121.7k ✓, HRHB=40.5k ✓. Root cause identified: Operation Drina misses djulici/drinjaca/krizevici/paljevici/donja_kamenica; Operation Koridor missing Brcko. Att:def 3.4:1. Bihać municipality anchor is false alarm — OSID-level bihac_2=RBiH correct. Zvornik anchor real fail. Report: docs/40_reports/convenes/20260307_N218_40W_CALIBRATION_DEEP_ANALYSIS.md)
**Previous calibration run:** n214 (rear pocket consolidation + corps AI pocket targeting: RS=330 OSIDs (44.4%), RBiH=302, HRHB=112. 84.2% area-weighted. Rear pockets 26→12 via `consolidate-rear-pockets` pipeline step (auto-flip surrounded enemy OSIDs without combat). Corps AI rear pocket bypass for municipality + sector filters. Home-defense exception for truly undefended targets.)
**Previous calibration run:** n192 (P3 priority municipality bypass for undefended targets: RS=331 OSIDs (44.5%), RBiH=303, HRHB=110. 83.2% area-weighted. 151 attack orders, 124 battles, 53 combat-attributed control changes. Krajina 85.5%. Combat-causality GREEN.)
**Previous calibration run:** n191 (strategic reserve + faction-differentiated surge: RS=102.6k (w40) → 110.1k (w80) ✓, RBiH=121.0k (w40) → 175.4k (w80), HRHB=41.5k (w40) → 49.8k (w80) ✓. Multi-checkpoint troop strength calibration — all factions within or near historical bands at both w40 and w80.)
**Previous calibration run:** n166 (n159 audit Phase E verification: deterministic rerun of n165. 84.2% area-weighted, RS=321/HRHB=110/RBiH=313 OSIDs. 146 attacks, 118 battles, 103 captures. Att:def casualty ratio 3.26:1. RS weekly attacks decline 8→1 (organic tempo decay confirmed). All VRS corps still offensive at t26 with aggression 0.0-0.1 (was 0.4-0.45 at t1). Bot benchmarks 2/6 PASS — RS/RBiH targets need recalibration for organic model. Combat-causality gate green.)
**Latest recovery-gated run:** n158 (live sector-rearrangement + planning-movement recovery: combat-causality gate green, behavioral-health gate green, planning now includes movement into approach positions, live sector concentration restored)
**Previous calibration run:** n137 (combat-causality gate green again after runtime rollback: valid_for_combat_calibration=true, 86 attack orders, 74 battles, 30 combat-attributed control changes; deterministic rerun of n136 after removing live sector rearrangement from corps-AI runtime)
**ALL-TIME HIGH:** n65 (99.2% area-weighted — systematic OSID override strategy + pool exhaustion 25% fix, 2026-03-05)
**Calibration validity gate (2026-03-05):** n77/n78/n79 later exposed that branch-level territory deltas can occur with **zero battles**. n65 remains the ATH reference, but from 2026-03-05 onward no combat-calibration claim is accepted without explicit combat-causality evidence (attack orders, battles, and flip attribution).
**Previous ATH:** n466/n469 (92.0% area-weighted — pre-lockout code, Kalesija/Kupres dynamic)
**Regression note (resolved):** commit `acdd4b9` dig_in movement lockout caused −6.4pp regression. Recovery via Tasks #13-18 + systematic override strategy achieved new ATH at n65.
**Reverted:** n424 (Drina Sweep/Hold: add srebrenica, drop kalinovik/cajnice/rudo — DRINA 78→75.6, global 91.3→91.1%; reverted.)
**Previous calibration run:** n403 (88.0% count-based, 90.4% area-weighted — Officers System two-tier: 63 named officers + per-brigade officer_quality. ARBiH 131k, VRS 88k, HVO 42k. Three regions improved: Central Bosnia +6pp, Sarajevo +3.2pp, Posavina +2.7pp. Drina -8pp from per-corps variance.)
**Previous calibration run:** n407 (90.5% area-weighted ATH, 86.7% count-based — Phase D: supply reserves enabled by default, UN airdrops for RBiH enclaves, bot supply-aware targeting.)
**Previous calibration run:** n392 (88.6% count-based ATH — comprehensive combat formula: officer quality, ethnic homeland defense, bombardment exposure attrition. Krajina 98.5%. ARBiH KIA 9,831 toward 11,500 target.)
**Previous calibration run:** n374 (87.6%, ceiling removal + emergent growth via pool mechanics.)
**Previous calibration run:** n364 (87.4%, verification run — combat summaries pipeline step added, zero behavioral change.)

---

## Combat-Causality Acceptance Gate (2026-03-05)

**Primary report:** `docs/40_reports/convenes/20260305_CALIBRATION_P0_COMBAT_CAUSALITY_DEBUG_BRIEF.md`

### Why this gate exists

The n77/n78/n79 investigation showed that a branch can appear to improve while the combat loop is functionally inert:

- `weekly_report.jsonl` recorded **0 battles**
- pre-planned operations cycled without proven objective attacks
- territory deltas came from non-combat effects rather than battle-driven progress

Therefore count-based or area-weighted improvements alone are **insufficient** evidence of healthy combat behavior.

### Invalid run for combat calibration

Treat a run as **invalid for combat calibration** if any of the following is true:

1. `weekly_report.jsonl` contains zero battles for the full run.
2. The evaluated faction shows zero attack orders for the relevant offensive window.
3. Territory changes are discussed without separating combat flips from consolidation, demographic drift, or init-override effects.

### Minimum evidence for future calibration claims

No future branch/run should be written up as a combat-calibration success unless it includes:

1. Non-zero attack orders for the faction being evaluated.
2. Non-zero battles in `weekly_report.jsonl`.
3. A short attribution summary for territory change:
   - combat-caused flips
   - demographic drift / displacement-driven flips
   - init override effects

### Practical rule

`CALIBRATION_MASTER.md` remains the single source of truth for calibration status.

When working a calibration session:
- read this file first
- record causality status while the session is active
- treat a run as non-calibratable if the harness marks `combat_causality.valid_for_combat_calibration = false`

### One-change-then-verify protocol (MANDATORY, 2026-03-11)

**Every calibration change follows this cycle. No exceptions.**

1. **Change exactly ONE parameter or fix ONE bug.** Never bundle multiple changes into a single run. If you changed two things and the results regressed, you can't tell which caused it. This was learned the hard way — n500 bundled three structural changes (ops-only doctrine, unified sector defense, attack-through) and when defense collapsed, attribution was impossible.

2. **Run a fresh 40w scenario** (`npm run sim:scenario:run:40w`).

3. **Run the comparison tool** (`node tools/compare_painted_vs_sim.cjs <run_dir>`) and record: area-weighted %, RS delta, benchmark pass/fail, order counts, casualty totals.

4. **Run a war-or-game insanity check** (invoke `/war-or-game` or manually inspect the save). This is NOT optional. Check at minimum:
   - **Brigade states**: Any morale-0 active? Any combat-ineffective (<400 pers) still attacking? Any stuck in deep rear?
   - **Casualty ratios**: Any battles with >20:1 attacker:defender? Defender near-invulnerable?
   - **Operational tempo**: Battles per week by period. Any zero-battle weeks? Any faction with 0 attacks?
   - **Troop strengths**: RS ~96-106k, RBiH ~110-130k, HRHB ~35-45k at w40.
   - **Equipment**: RS should have 400-600 tanks, 900-1200 artillery (field: `composition`, NOT `equipment`).
   - **The smell test**: Read 5 individual battles. Would a real commander recognize them?

5. **Record the result** in this file (append to latest calibration run entry). If the change regressed, revert it before trying anything else.

**Why this matters:** Without the insanity check, bugs like "brigades idling in deep rear" (#1), "83% catastrophic attacks from posture bug" (#2), and "zero equipment from wrong field name" (#16) went undetected for multiple calibration runs. The scenario metrics (area%, benchmarks) don't catch behavioral absurdities — only a realism audit does.

### Harness artifact contract (implemented 2026-03-05)

Combat causality is now emitted directly by the scenario harness:

- `weekly_report.jsonl`
  - `combat_causality.valid_for_combat_calibration`
  - `combat_causality.total_attack_orders`
  - `combat_causality.total_objective_attempts`
  - `combat_causality.total_objective_captures`
  - `combat_causality.total_battles`
  - `combat_causality.invalid_operation_count`
  - `combat_causality.zero_eligible_attacker_operation_count`
  - `combat_causality.invalidation_reasons`
- `run_summary.json`
  - `combat_causality`
  - `combat_causality_weekly`

Current invalidation reasons:

- `zero_battles`
- `operation_execution_without_attack_orders`
- `operation_execution_without_eligible_attackers`
- `operation_attack_orders_without_battles`
- `operation_recovery_without_logged_attempt`
- do not label a run "improved" unless it passes the gate above

### Proof scenario lane update (2026-03-06)

- Dedicated deterministic proof fixture now exists at `data/scenarios/apr1992_vrs_operation_proof_4w.json`.
- Acceptance test: `tests/scenario_vrs_operation_proof.test.ts` runs the fixture twice and requires:
  - non-zero RS attack orders
  - non-zero processed attack orders
  - at least one VRS operation with `attack_attempt_count > 0`, `objective_capture_count > 0`, and `current_objective_index > 0`
  - byte-identical `final_save.json` across both runs
- Current proof artifact: `.tmp_proof_report/apr1992_vrs_operation_proof_4w__1142cedd3e0e4d62__w4_n0/run_summary.json`
  - `RS attack orders = 17`
  - `total battles = 12`
  - `total objective attempts = 6`
  - `total objective captures = 4`
  - `zero_eligible_attacker_operation_count = 2`
  - proof scenario passes the existence-of-combat/progress gate but still correctly fails full combat calibration because not all VRS opening ops are healthy yet

### Combat-causality recovery result (2026-03-06)

- `n126` is the first repaired April 1992 40-week run in this lane to pass the combat-causality gate again:
  - `combat_causality.valid_for_combat_calibration = true`
  - `total_attack_orders = 91`
  - `total_battles = 81`
  - `total_objective_attempts = 66`
  - `total_objective_captures = 66`
  - `invalid_operation_count = 0`
  - `zero_eligible_attacker_operation_count = 0`
  - `recovery_without_logged_attempt_count = 0`
- `n126` also reports live control-change attribution:
  - `combat = 26`
  - `consolidation = 0`
  - `abandoned = 0`
  - `init_overrides = 0`
  - `other = 0`
  - `total_changes = 26`
- Interpretation rule:
  - this is sufficient evidence that the combat loop and operation pipeline are healthy again for this scenario
  - it is not a blanket claim that repo-wide merge/integration issues are resolved

### Live harness attribution contract (2026-03-06)

- The live scenario harness no longer uses `control_events.jsonl` as its control-change contract.
- `control_events.jsonl` was a leftover early-war flip-era artifact and has been removed from the active harness path.
- The live reporting contract is now:
  - `weekly_report.jsonl -> control_change_attribution`
  - `run_summary.json -> control_change_attribution`
- Attribution buckets currently tracked:
  - `combat`
  - `consolidation`
  - `abandoned`
  - `init_overrides`
  - `other`
- Practical rule:
  - do not use legacy flip-log artifacts as evidence for war-phase control behavior
  - use the attribution fields above when discussing why territory changed

### Reporting split and historical-fit hardening (2026-03-06)

- `n130` preserves the repaired combat result from `n126`/`n128` while hardening the reporting contract:
  - `run_summary.json -> behavioral_health`
  - `run_summary.json -> historical_fit`
  - `run_summary.json -> control_change_attribution`
  - `weekly_report.jsonl -> behavioral_health`
- `behavioral_health` is now the canonical place to read:
  - combat-causality validity
  - attack orders
  - battles
  - objective attempts/captures
  - control-change attribution
- `historical_fit` is now the canonical place to read:
  - historical alignment
  - anchor checks
  - bot benchmark evaluation/status
  - override inventory
- Compatibility note:
  - legacy top-level fields remain in `run_summary.json` and `weekly_report.jsonl`
  - new calibration discussion should cite the grouped families above first
- Serializer gotcha fixed in this lane:
  - `run_summary.json` must preserve fractional share/ratio/tolerance/deviation values
  - benchmark rows with `actual_control_share`, `expected_control_share`, `tolerance`, or `deviation` are invalid if rounded to integers during summary normalization

### Runtime regression and recovery guard (2026-03-06)

- `n135` briefly regressed the live 40-week scenario after the reporting/UI hardening slice:
  - `valid_for_combat_calibration = false`
  - `total_attack_orders = 69`
  - `total_battles = 57`
  - `zero_battles` invalidation from weeks 26-40
- Root cause was not the reporting work. It was a separate live AI-path mutation:
  - `src/sim/combat/sector_rearrangement.ts` had been wired into `generateAllCorpsOrders()` in `src/sim/combat/bot_corps_ai.ts`
  - helper-tested sector rearrangement was rewriting live corps sectors without scenario-level acceptance coverage
- Architect decision:
  - keep sector rearrangement code and unit tests
  - remove it from the live corps-AI runtime path until it has scenario-gated acceptance
- Recovery evidence:
  - `n136`: `valid_for_combat_calibration = true`, `86` attack orders, `74` battles, `30` combat-attributed control changes
  - `n137`: same `final_state_hash = 334a4d3260894b0c` as `n136`
- Practical rule:
  - do not wire sector-topology experimentation directly into live corps directive generation unless it passes the same 40-week combat-causality gate as any other combat-path change

### Live sector rearrangement and planning-phase maneuver recovery (2026-03-06, runs n152→n158)

- Final verified recovery baseline for this slice is `n158`:
  - `final_state_hash = 3bfada3e56322112`
  - `behavioral_health.valid_for_combat_calibration = true`
  - `combat_causality.valid_for_combat_calibration = true`
  - `total_attack_orders = 124`
  - `total_battles = 103`
  - `invalid_operation_count = 0`
  - `zero_eligible_attacker_operation_count = 0`
  - `battleless_weeks = [27, 39]`
- Engine changes behind `n158`:
  - planning-phase `sector_attack` brigades now move into first-objective approach positions during planning, not only toward `staging_osid`
  - `advanceSectorOffensives()` may end planning once brigades are either staged or already on friendly approach positions after at least one real planning turn
  - live corps AI keeps sector rearrangement and now also uses offensive concentration to cluster adjacent thin sectors into launchable attack windows
  - combat-causality no longer flags post-capture objective advancement as inert execution
- Gate refinement:
  - weekly `zero_battles` is now an invalidation only when attack orders existed but resolved to no battles
  - quiet weeks with no attack orders and no invalid operations remain visible under `behavioral_health.battleless_weeks`, but do not by themselves invalidate an otherwise healthy run
- Practical rule:
  - treat planning as operational maneuver/preparation, not just a timer
  - keep sector rearrangement live, but verify it through full-run combat-causality evidence rather than unit tests alone
  - full-run zero combat still hard-fails calibration eligibility

### Sector fix session (2026-03-06, runs n138→n142)

**Problem:** 5 corps had zero front sectors (vrs_2nd_krajina, vrs_east_bosnian, vrs_herzegovina, hvo_southeast_herzegovina, hvo_northwest_bosnia). 50 brigades misassigned to wrong corps. 30 empty non-pocket sectors.

**Root causes:**
1. **BFS seeding** — `friendlyOsids` only from edge-graph adjacency keys, excluding deep-interior OSIDs. Corps/brigades at interior locations couldn't seed BFS.
2. **consolidateCrossCorpsFronts** — over-aggressively stripped minority-corps edges with no protection for corps that would lose ALL their edges.
3. **OOB tag mismatches** — Brigade `corps` tags in `oob_brigades.json` used legacy IDs (e.g. `rs_drina_corps`) that didn't match canonical formation IDs (e.g. `vrs_drina`).
4. **Thin sector consolidation** — `break` bug stopped all subsequent consolidation when first unmergeable sector found; also had `THIN_SECTOR_MAX_EDGES=3` limit preventing larger empty sectors from merging.
5. **HVO SE Herzegovina HQ** — was at `op:mostar:kruzanj_2` (RBiH-controlled), moved to `op:citluk:citluk_2` (HRHB-controlled).

**Fixes applied:**
- `corps_front_sectors.ts`: Expanded `friendlyOsids` to include all `political_controllers` entries for faction. Added `protectedCorps` set in consolidation to prevent total edge stripping.
- `oob_brigades.json`: Fixed 15 tag mismatches across 8 legacy→canonical mappings.
- `oob_corps.json`: HVO SE Herzegovina HQ → Čitluk.
- `sector_rearrangement.ts`: Removed `THIN_SECTOR_MAX_EDGES=3`; any 0-brigade sector eligible for merge. Fixed `break`→`continue` with `unmergeable` tracking. Added `MAX_SECTOR_EDGES` cap on merge targets.

**Result (n142):** All 15 corps have front sectors. 25 misassigned brigades (down from 50). 0 empty non-pocket sectors. Area-weighted match 81.5% (down from 83.4% — expected regression: previous calibration was achieved with broken sector assignments; correct assignments change combat behavior).

**Note:** Corps HQs are abstractions (not physical map entities). BFS seeding uses political_controllers, not HQ OSID positions. HQ locations are for GUI display only.

### N159 Deep Engine Audit (2026-03-06, runs n165→n166)

14-issue deep engine audit addressing all findings from the full Paradox 40w team review. Core directive: organic VRS tempo decay — no artificial stance transitions.

**Phase A (P0 bugs):** All three investigated, no code changes needed. brigade_history working, posture lifecycle correct, displaced_out already fixed.

**Phase B (casualty tuning):**
- `BASE_ATTRITION_RATE`: 0.005→0.003; `BOMBARDMENT_EXPOSURE_RATE`: 0.012→0.008
- `BASE_ATTACKER_LOSS_RATE`: 0.045→0.04; `BASE_DEFENDER_LOSS_RATE`: 0.02→0.028
- Target att:def ratio 2.5-3:1 (was 4.78:1). Achieved: 3.26:1 at n166.

**Phase C (organic VRS tempo decay):**
- `getFatigueMult()` — fatigued units fight worse (attack floor 0.6×, defense floor 0.75×)
- `FATIGUE_MAX`: 20→30, consolidated to `formation_constants.ts`
- Fatigue recovery: every 2 turns (was every turn), +0.5/turn frontline duty
- Entrenchment: sqrt-based diminishing returns (first turns of digging in matter most)
- RS doctrine phases: 3→2 (both offensive — no defensive regression at w20/w40)
- RS_EARLY_WAR_END_WEEK=20 still marks reduced aggression (0.15→0.05) and max_attack_share (0.28→0.22)

**Phase D (supply & patron rebalancing):**
- `MAINTENANCE_DRAIN_PER_FORMATION`: 0.025→0.045 (RS general supply 68% by w40, was 100%)
- UN airdrops: `AIRDROP_MAX_SUPPLY_PER_TURN` 15→3, `AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE` 1.5→0.5
- Patron commitment: historical faction-specific bases (RBiH 0.3 in 1992 under embargo, RS 0.8, HRHB 0.6)
- Initial supply: HRHB 55→75 (Croatian pipeline open early war)

**Phase E (verification):**
- n166: 84.2% area-weighted, 146 attacks, 118 battles, 103 captures
- RS weekly attacks decline 8→1 by w40 (organic tempo decay confirmed)
- All VRS corps still offensive at t26; aggression naturally declining 0.4→0.0
- Bot benchmarks 2/6 PASS — RS/RBiH targets need recalibration for organic model
- Combat-causality gate GREEN

**Deferred items from n159 audit:**
- **B2 (Serb civilian casualties):** Investigation complete. Logic correct, tuning issue: 4% DISPLACEMENT_KILLED_FRACTION applied uniformly. Sim: 10,860 RS civ killed (history: ~4k). Fix: per-context kill fractions (RS from RBiH ~1%, RS from HRHB ~1-2%, non-Serb from RS keep 4%). File: `displacement_loss_constants.ts`.
- **B4 (HVO personnel shortfall):** Deferred — low priority, HRHB reaching adequate levels.
- **Bot benchmark recalibration:** RS `early_territorial_expansion` and `consolidate_gains` targets assume old aggressive w20 blitz model; need new targets for organic tempo.
- **Canon/engineering doc propagation:** Completed as part of Phase E close-out.

### Current resume point

- N159 deep engine audit complete (Phases A-E). Organic VRS tempo decay confirmed.
- Sector partitioning correct for all 15 corps.
- Combat causality gate is green.
- Area-weighted match at 84.2% (up from 81.5% post-sector-fix).
- Runtime sector rearrangement (thin consolidation + pocket containment) is live and validated.
- Historical tuning may resume, but only under the recovery-plan rule:
  - cite both `behavioral_health` and `historical_fit`
  - do not call a run “better” if map fit improves while behavioral health regresses

### Recovery-lane lessons and rules (2026-03-06)

Use these as the permanent operating rules for post-recovery calibration work:

1. Good map fit is not proof of healthy combat.
   - Read `behavioral_health` first.
   - Then read `historical_fit`.
   - Then explain `control_change_attribution`.
2. Planning is a maneuver phase, not a timer.
   - Operation-owned brigades should move into staging/approach positions during planning.
   - Planning may end early once the force is actually ready.
3. Quiet weeks are not the same as broken combat causality.
   - Quiet weeks with no attack orders and no invalid operations are warnings.
   - Attack-orders-without-battles is still a failure.
   - Whole-run zero battles is still a failure.
4. Sector rearrangement is a scenario-scale acceptance problem.
   - Unit tests are necessary but not sufficient.
   - Keep live sector-topology changes only when 40-week combat-causality stays green.
5. Operation ownership must remain real.
   - Do not let generic corps logic, reserve logic, or `home_defense_active` silently retake operation brigades while the op is live.

### Do / Don’t for resumed calibration

Do:

- use `CALIBRATION_MASTER.md` as the control file before changing tuning
- cite run ids and both reporting families when discussing results
- verify operation-path changes with the proof scenario before broad full-run claims
- update the master file during the session when a gate or interpretation rule changes

Don’t:

- call a run “better” because area-weighted fit improved while behavioral health regressed
- use legacy early-war flip-log thinking for current war-phase analysis
- hide engine failures behind scenario overrides
- treat planning dead time as acceptable operational behavior

### Opening-operation debug lane updates (2026-03-05)

The VRS opening-operation repair lane produced several reusable constraints that now govern further debugging:

1. The real April 1992 startup path is `recruitment_mode: "player_choice"`, not just the legacy OOB entry helper. Any brigade-placement fix must therefore hold in both:
   - `src/scenario/oob_early_war_entry.ts`
   - `src/sim/recruitment_engine.ts`
2. Explicit brigade `home_osid` placement is valid in this lane, but it only sticks if the chosen start OSID is already friendly-controlled at scenario start. If the start OSID is enemy-controlled, spread/re-homing logic will displace the brigade.
3. Political-control overrides are banned in this lane. Do not "fix" VRS opening operations by changing starting controller from `RBiH` to `RS`; only brigade placement, operation roster, sector, staging, and target selection are in scope.
4. Named VRS opening operations now generate real combat again (`n104`: `53` attack orders, `53` battles), but the run remains invalid for combat calibration because execution-phase operations still exist with zero emitted attack orders (`invalid_operation_count = 24`).
5. Operation ownership must override corps logic while the operation is live. Brigades assigned to a named operation should follow the operation's planning/execution/recovery flow and ignore corps-chain behaviors such as `home_defense_active`, reserve assignment, and generic corps targeting until the operation is explicitly ended/cleared.
6. `n109` exposed an engine-wide phase-conflict: `sector_attack` operations were being advanced both by `advanceOperations()` in `src/sim/combat/corps_command.ts` and by `advanceSectorOffensives()` in `src/sim/combat/sector_offensive.ts`. That double ownership forced some operations into `execution` early and kept them there under the wrong timing model.
7. `n110` restored the single-owner rule and added no-progress failure budgeting for execution-phase sector attacks. Result: invalid-operation count dropped from `60` (`n109`) to `4` (`n110`), while preserving live VRS combat (`61` RS attack orders / `55` battles). The run still fails the gate because some weeks remain battleless and a small number of execution windows still emit zero attack orders.
8. `n112` proved that the remaining `execution_without_attack_orders` windows in `n110/n111` were mostly diagnostic false positives, not live deadlocks. Execution-phase operation participants can spend a turn maneuvering with `brigade_movement_orders` and zero attack orders; that is still healthy operation progress and must not be counted as an invalid execution window.
9. `n113` exposed a second cadence bug: sector offensives could sit in `planning` for the full fixed duration even after every assigned brigade had already reached `staging_osid`. Engine fix: once at least one real planning turn has elapsed, `advanceSectorOffensives()` may transition early to `execution` when all active participants are staged. Result: `Operacija Lukavac` now enters execution on turn 12 instead of idling until turn 16, and run totals improved to `59` RS attack orders / `51` battles with `invalid_operation_count = 0`.
10. After the `n112`/`n113` fixes, the remaining combat-causality failure mode is isolated zero-battle weeks, not operation deadlock. Current lane priority is therefore offensive cadence overlap and planning/recovery downtime, not more brigade-order debugging.

Practical rule for this lane:
- choose only friendly-held staging/home OSIDs
- treat brigade placement and political control as separate systems
- record whether each named operation reached `execution`, emitted attack orders, and produced battles before discussing territorial improvement
- when an operation owns a brigade, debug it through the operation path first; do not assume corps directives are authoritative
- if a `sector_attack` is live, only `sector_offensive.ts` should advance its phase timing
- if an operation spends repeated execution turns with no objective attempt, spend failure budget and let it skip or end instead of hanging indefinitely

---

## Target State (January 1993 / Week 40)

### Territory (OSIDs of 744 total; was 753 before degenerate merge 2026-03-03)
| Faction | Target | n284 | n295 | n303 | n335 | n359 | n362 | n364 | n374 | n392 | n407 | Delta (n407) | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RS | 416 | 392 | 393 | 382 | 387 | 432 | 409 | 409 | 411 | 420 | **426** | +10 | Near-target |
| RBiH | 248 | 271 | 273 | 277 | 273 | 236 | 260 | 260 | 256 | 246 | **230** | -18 | Below target |
| HRHB | 89 | 90 | 87 | 94 | 93 | 85 | 84 | 84 | 86 | 87 | **88** | -1 | Near-target |

### Army Strengths (end of 40w)

**Historical bands from knowledge base** (see §Historical OOB Baselines below for full citations):

| Faction | Dec 1992 Target Band | Full-War Peak | n284 | n374 | n392 | n191 w40 | n191 w80 | Growth Mechanism | Status (n191) |
|---|---|---|---|---|---|---|---|---|---|
| VRS (RS) | **90k–100k** | 100k–110k (1993–94) | ~120k | **97k** | **85k** | **102.6k** | **110.1k** | Emergent (strategic reserve + faction surge) | **In band** (w40 +2.6k over, w80 in peak range) |
| ARBiH (RBiH) | **110k–130k** | 180k–200k (1995) | ~149k | **127k** | **119k** | **121.0k** | **175.4k** | Emergent (strategic reserve + faction surge) | **In band** (w40 in band, w80 within wider estimates) |
| HVO (HRHB) | **40k–45k** | 50k–55k (1993) | ~52k | **46k** | **41k** | **41.5k** | **49.8k** | Emergent (strategic reserve + faction surge) | **In band** (w40 in band, w80 near peak) |

**NOTE:** `FACTION_HISTORICAL_PEAK` ceiling system REMOVED (n369). Personnel totals now emerge organically from pool demographics, mobilization rates, exhaustion thresholds, and combat attrition — no hardcoded caps. See §Ceiling Removal (n369–n374) below.

**NOTE (n191):** Strategic reserve system (2026-03-06) solves municipality-locked pool topology mismatch — rear municipalities accumulated 75k+ surplus while front-line pools were empty. Faction-differentiated mobilization surge curves added. See §Strategic Reserve System (n191) below.

### Casualties (40 weeks, n254)
- **Attacker total:** ~24,000 — dominated by RS (318 attack orders vs RBiH 87 vs HRHB low)
- **Defender total:** ~3,100
- **Attacker:Defender casualty ratio:** ~7.7:1

**Historical full-war KIA targets (3.5 years = 182 weeks):**
| Faction | Full-War KIA | Yr 1 Est (~50%) | At w40 (~77% of Yr 1) |
|---|---|---|---|
| VRS (RS) | ~24,000 | ~12,000 | ~9,200 |
| ARBiH (RBiH) | ~30,000 | ~15,000 | ~11,500 |
| HVO (HRHB) | ~8,000 | ~3,200 | ~2,500 |
| **Total** | **~62,000** | **~30,200** | **~23,200** |

**n254 distribution concern:** RS is listed as attacker in 318/405 (~78%) orders. At that rate, RS loses ~18.7k attacker casualties — 2× their estimated year-1 historical total. The issue is NOT total casualties but that **RS is fighting too much, including against wrong targets (HRHB), while ARBiH attacks 87 times (still too many historically).**

### Displacement (n319 — per-OSID census depth)
- **Total displaced:** 668,202 (RBiH 457,716, HRHB 150,360, RS 60,126)
- **Historical target:** ~1M by Jan 1993
- **Key improvements (n310→n319):** Per-OSID census data replaced municipality-level even-split averaging. Hostile share cap raised from 0.80 to 0.95 for per-OSID data. Sustained pool accounting fixed (cumulative_displaced initialized to initial fire amount).
- **Ljubija (Prijedor):** 5,331→13,399 initial fire (+151%). 80% Bosniak OSID now correctly shows near-complete displacement.
- **Minority flight:** 0 (disabled — `enable_rbih_hrhb_dynamics: false`)
- **Note:** Engine counts only War-phase takeover-triggered + pressure displacement. Pre-war mass displacement is baked into `init_control` snapshot. Displacement system complete as of n319. See `docs/40_reports/20260301_DISPLACEMENT_DEPTH_CALIBRATION.md`.

### Match Rate vs Painted Targets (n422/n423, latest)
Overall count-based: **88.2%** (656/744 OSIDs correct); **Area-weighted: 91.3% (46,870/51,337 km²) — ALL-TIME HIGH**

| Region | n374 Match | n392 Match | n407 Match | n422/n423 Match | n422/n423 Area | Key Issues (n422) |
|---|---|---|---|---|---|---|
| KRAJINA | 95.5% (126/132) | 98.5% (130/132) | 93.1% (122/131) | **95.4%** (125/131) | — | Stable |
| POSAVINA_NE | 81.7% (89/109) | 81.7% (89/109) | 81.7% (89/109) | **89.0%** (97/109) | — | +8.3pp from EBK/lopare trim |
| DRINA | 81.3% (104/128) | 82.0% (105/128) | 78.0% (96/123) | **78.0%** (96/123) | — | Next improvement target |
| CENTRAL_CORRIDOR | 90.4% (85/94) | 90.4% (85/94) | 88.3% (83/94) | — | — | Minor drift |
| CENTRAL_BOSNIA | 88.0% (146/166) | 87.3% (145/166) | 85.9% (140/163) | — | — | — |
| SARAJEVO | 87.1% (27/31) | 87.1% (27/31) | 87.1% (27/31) | — | — | Stable — Trnovo/Pale edges |
| HERZEGOVINA | 88.2% (82/93) | 92.5% (86/93) | 94.6% (88/93) | **95.2%** | — | Best result — Kupres edges |

Note: Area-weighted metric better reflects historical territory; count-based penalizes small eastern settlements that RS didn't hold in history.

---

## Calibration Run History

| Run | Scenario Hash | RS | RBiH | HRHB | Notes |
|---|---|---|---|---|---|
| n233 | 52w | 526 | 163 | 64 | Old 52w run, front frozen w35 |
| n246 | 4524ee926374c26f | 406 | 265 | 82 | First 40w baseline, all 6 benchmarks pass |
| n252 | 4524ee926374c26f | — | — | — | Same hash as n246 — avoided_osids silently dropped |
| n253 | 26e02206211e085d | 392 | 279 | 82 | Vozuca anchor PASS; RS dropped 14 from Vozuca fix |
| **n254** | 26e02206211e085d | **422** | **248** | **83** | **OOB home fixes. Best run. RBiH exact.** |
| n255 | 54295acf83337756 | 406 | 265 | 82 | Bulk avoided_osids made things worse — reverted |
| **n268** | 00750db9480be428 | **437** | **235** | **81** | Phase M mechanics (morale, ZoC virtual defense, enclave OOB, displacement routing). 81.0% match (610/753). 6/6 benchmarks. Drina enclave overexpansion (+24 RBiH OSIDs). |
| n275 | 00750db9480be428 | 425 | 246 | 82 | P2 (enclave morale 55), P5 (RS pool 0.25), P5b (cas mult), Bugojno 3rd Corps. 81.5% match (614/753). RS-12, RBiH+11. **But** Drina WORSE (65.6% vs 68.8%) — morale drift nullified P2 in 3 turns. VRS 117k (pool scale had no effect — recruitment capital drives growth). KIA 5,587 (lower — fewer absorptions). |
| **n276** | 205b3676c8fe3ce4 | **432** | **238** | **83** | **Supply-CRITICAL morale suppression + RS recruitment reduction.** 83.3% match (627/753). Drina 72.7% (+7.1% from supply fix). Sarajevo 74.2% (+6.5%). Herzegovina 94.6%. VRS still 117k (mandatory OOB, not recruitment capital). KIA 5,404. |
| n277 | 205b3676c8fe3ce4 | 432 | 238 | 83 | Enclave tag gate + 3rd Corps weights (60→100, 120→150). **Identical OSIDs to n276** — tags weren't propagated (bug). Same hash as n276 sans tag. |
| **n279** | 205b3676c8fe3ce4 | **437** | **233** | **83** | **Enclave tag propagation fix** (oob_loader + recruitment_engine). 83.7% match (630/753). Enclave brigades capped at initial personnel. Drina 73.4%. Sarajevo 80.6% (+6.4). RS +5 overall (enclave weakening let RS take more). |
| n280 | 205b3676c8fe3ce4 | 432 | 237 | 84 | REVERTED — added Srebrenica/Gorazde to Drina Sweep + RS attack share 0.28→0.22 + enclave personnel reduced. 81.9% match. Drina COLLAPSED to 67.2%. Adding fortified enclaves to Drina Sweep diluted attacks. |
| n281 | 205b3676c8fe3ce4 | 431 | 240 | 82 | REVERTED — enclave personnel only (Gorazde 1100→700, Srebrenica 900→600). 81.8% match. Drina 65.6%. Paradoxically worse — cascade effects from weaker enclaves. |
| n283 | d88dbeb669b72a6f | 404 | 259 | 90 | REVERTED — blunt corps target cap (max(5, 0.75×subordinates)). 82.7% match (623/753). Drina WORSE (69.5%) — cap starved small corps. Central Corridor better but overall worse. |
| **n284** | **e12111ddb29e02ab** | **392** | **271** | **90** | **P3: Opportunistic target municipality filter.** 85.1% match (641/753). Central Corridor 87.2% (+5.3pp). Posavina 84.4% (+7pp). Krajina 97.0%. Drina 71.9% (still weakest). 6/6 benchmarks. 11/14 anchors. VRS 120k, ARBiH 149k, HVO 52k. |
| n291 | 205b3676c8fe3ce4 | 390 | 276 | 87 | Pre-local-fronts baseline. 84.7% match (638/753). 6/6 benchmarks. Posavina 83.5%, Central Bosnia 80.7%. |
| **n295** | **205b3676c8fe3ce4** | **393** | **273** | **87** | **Local Fronts + defense_terrain_bonus.** 85.1% match (641/753). +3 OSID fixes (Brčko krepsic, Kalesija gojcin, Lopare jablanica). Posavina 85.3% (+1.8pp). Central Corridor 90.4% (+3.2pp from n284). 6/6 benchmarks. VRS 122k, ARBiH 205k, HVO 65k. |
| n297 | 205b3676c8fe3ce4 | 393 | 273 | 87 | Baseline re-run. local_fronts was empty (bug: compute-local-fronts ran with canonical SID segments; OSID segments only in refreshFrontEdgeSnapshot). Identical OSIDs to n295. |
| n298 | 205b3676c8fe3ce4 | 393 | 273 | 87 | Fix 1: buildLocalFronts added to refreshFrontEdgeSnapshot. 9 local fronts now populated but corps assigned_front_ids still 0 (same root cause — sync-front-segments used canonical edges). |
| **n299** | **205b3676c8fe3ce4** | **389** | **273** | **91** | **Fix 2: sync-front-segments prefers OSID edges.** 86.3% match (650/753). **+9 from n295.** Corps now have assigned fronts. 13 local fronts with density modifiers active. Central Bosnia 83.7% (+2.4pp). Posavina 86.2% (+0.9pp). Sarajevo 80.6% (+3.2pp). Herzegovina 93.5% (+3.2pp). Drina still 71.9%. RS-27 (from -23), HRHB+2 (from -2). |
| n300 | 205b3676c8fe3ce4 | 293 | 339 | 121 | REVERTED — Corps front sectors with per-sector density. 77.6% match. Severe regression: VRS thin sectors (0.08-0.17 density) got 0.6× penalty, collapsing RS lines everywhere. Per-sector density too punishing for overextended factions. |
| n302 | 205b3676c8fe3ce4 | 321 | 321 | 111 | REVERTED — Same but with broader brigade assignment to sectors. 78.6% match. Same root cause: per-sector density penalizes VRS which is inherently thin per-corps. |
| **n303** | **205b3676c8fe3ce4** | **382** | **277** | **94** | **Corps front sectors (targeting only, density unchanged).** 86.7% match (653/753). **+3 from n299.** Sectors partition front edges by corps via multi-source BFS from HQs. Corps offensive targets filtered to sector-adjacent OSIDs, preventing sprawl. Central Bosnia 88.0% (+4.3pp from sector targeting). Drina 72.7% (+0.8pp). Density modifier unchanged (faction-level aggregation). 14 sectors, 18 corps. |
| n311 | 205b3676c8fe3ce4 | 389 | 272 | 92 | **Phase A: Multi-sector promotion.** 86.3% match (650/753). Sub-segments >= 5 edges promoted to independent sectors. 4 multi-sector corps (ARBiH 2nd/3rd, VRS 2nd Krajina/SRK). Per-sector brigade assignment + sector_targets in directives. |
| n312 | 205b3676c8fe3ce4 | 389 | 272 | 92 | **Phase B: Supply gating.** 87.4% match (658/753). **+5 from n303.** Critical supply → forced defend. Strained → victory-only, no pioneer. Corps supply health gating. Drina 75.0% (+2.3pp). Central Corridor 91.5% (+2.1pp). |
| **n314** | **205b3676c8fe3ce4** | **389** | **272** | **92** | **Phase A+B+C: Multi-sector + supply gating + sector offensives.** 87.4% match (658/753). **+5 from n303.** Sector offensive infrastructure (named operations, momentum, lifecycle) wired but inactive in 40w window (year-1 defensive doctrine). See L37. |
| n310 | 205b3676c8fe3ce4 | — | — | — | Pre-displacement-depth baseline. Displacement: 481k total (RBiH 269k, HRHB 120k, RS 37k). Municipality-level even-split averaging. |
| **n319** | **42ad78a39746d166** | **—** | **—** | **—** | **Per-OSID census displacement depth.** 86.7% match (653/753). Displacement: **668k total** (RBiH 458k, HRHB 150k, RS 60k). Ljubija: 5,331→13,399 (+151%). Sustained pool double-count fix. Displacement system complete. See 20260301_DISPLACEMENT_DEPTH_CALIBRATION.md. |
| n338 | 205b3676c8fe3ce4 | — | — | — | **Supply Reserves Phase A verification.** 86.9% match (654/753). Supply reserves implemented but gated off (`supply_reserves_enabled=false`). Zero behavioral change confirmed — identical within noise of n335. 14 calibration constants, 13 unit tests, pipeline step compute-supply-reserves. See 20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md. |
| n348 | — | 415 | 261 | 77 | **Reserve proportional cap + rear pocket targeting.** 84.9% match (639/753). Reserve cap `RESERVE_PER_EDGE_CAP=0.5`. Rear pocket targeting (enemy pockets with all neighbors faction-controlled). |
| n354 | — | — | — | — | **Baseline before sector offensive activation.** 85.8% match. Reference run for n359 comparison. |
| **n359** | **—** | **432** | **236** | **85** | **Sector offensive activation.** 86.7% match (653/753). 26 sector offensives in 40w (was 0). Fixes: (1) skip sector_attack in evaluateOperationProgress() — sole handler is advanceSectorOffensives(); (2) supply readiness returns 1.0 when supply_reserves_enabled=false; (3) allow new launches during recovery phase (+15 exhaustion); (4) min objectives 2→1. VRS 1st Krajina=7 ops, East Bosnian=6, Drina=6, 2nd Krajina=4; ARBiH 5th Corps=3 counteroffensives. See L42, L43. |
| **n362** | **205b3676c8fe3ce4** | **409** | **260** | **84** | **ALL-TIME HIGH: 87.4% match (658/753).** Winter strengthening + Bihać DTB + Bosniak abroad routes. VRS 103k, ARBiH 124k, HVO 43k — **ALL THREE FACTIONS NOW WITHIN HISTORICAL DEC 1992 BANDS** (VRS 90–100k near, ARBiH 110–130k, HVO 40–45k). 12/14 anchors (zvornik + bihac fail). Krajina 96.2%, Herzegovina 92.5%, Central Corridor 91.5%, Sarajevo 90.3%, Central Bosnia 88.0%, Posavina 81.7%, Drina 75.0%. Casualties: ARBiH 27.4k, VRS 33.5k, HVO 10.6k (71.5k total military). |
| **n364** | **205b3676c8fe3ce4** | **409** | **260** | **84** | **Verification run — combat summaries pipeline step.** 87.4% match (658/753). Identical OSIDs to n362. New `compute-combat-summaries` step produces aggregate CombatSummary on corps/army_hq formations (read-only aggregation, zero behavioral change). 16 formations with combat_summary. State hash `d4e0b2ff59a5cb38`. |
| n369 | 205b3676c8fe3ce4 | 412 | 256 | 85 | **Ceiling removal — first iteration.** 87.5% match (659/753). Removed `FACTION_HISTORICAL_PEAK` ceiling system. Mobilization scales RBiH 0.28, RS 0.16, HRHB 0.50. Exhaustion 0.15/0.25. JNA 12k. Personnel: ARBiH **151k** (OVER), VRS **79k** (UNDER), HVO **55k** (OVER). 13/14 anchors (bihac PASS, zvornik FAIL). |
| n370 | 205b3676c8fe3ce4 | 410 | 257 | 86 | **Ceiling removal — iteration 2.** 87.4% match (658/753). Scales RBiH 0.16, RS 0.22, HRHB 0.30. JNA restored 15k. Personnel: ARBiH **134k** (near), VRS **96k** (IN BAND), HVO **50k** (over). 12/14 anchors (zvornik + bihac FAIL). |
| n371 | 205b3676c8fe3ce4 | 411 | 256 | 86 | **Ceiling removal — iteration 3.** 87.6% match (660/753). Scales RBiH 0.14, RS 0.22, HRHB 0.24. Personnel: ARBiH **129k** (IN BAND), VRS **97k** (IN BAND), HVO **49k** (over). Drina 81.3% (+6.3pp from n362). 12/14 anchors. |
| n372 | 205b3676c8fe3ce4 | 411 | 256 | 86 | Scales HRHB 0.18 (ongoing mob). Identical OSIDs to n371. HVO 48k — ongoing mobilization not the driver; FACTION_POOL_SCALE is. |
| n373 | 205b3676c8fe3ce4 | 411 | 256 | 86 | FACTION_POOL_SCALE HRHB 2.10→1.80. HVO 46k. Identical OSIDs to n371. |
| **n374** | **205b3676c8fe3ce4** | **411** | **256** | **86** | **ALL-TIME HIGH: 87.6% (660/753).** Ceiling removal complete. FACTION_POOL_SCALE HRHB 1.70. Personnel: ARBiH **127k** (IN BAND), VRS **97k** (IN BAND), HVO **46k** (near band, +1k). Casualties: ARBiH 21.6k, VRS 32.2k, HVO 11.4k (65.2k total). 12/14 anchors (zvornik structural, bihac VRS overran). Drina **81.3%** (+6.3pp from n362). No hardcoded personnel caps — growth emerges from pool demographics, mobilization, exhaustion, and attrition. |
| **n375** | **205b3676c8fe3ce4** | **409** | **260** | **84** | **Comprehensive combat formula: officer quality + ethnic defense + bombardment.** 88.3% match (665/753). Three new mechanics: `getOfficerQualityMult()` (VRS 1.10→decays, ARBiH 0.85→grows, HVO 0.97), `getEthnicDefenseBonus()` (+12% for defending co-ethnic majority OSID), `getBombardmentCasualtyMult()` (1.0–1.8× defender casualties from attacker heavy weapons). HRHB pool 1.70. |
| n376–n381 | 205b3676c8fe3ce4 | — | — | — | **Parameter exploration**: bombardment scaling (2.0/50, 2.5/40), morale absorption (1.75, 2.5), morale resist floors (45/60/52), BASE_DEFENDER_LOSS_RATE (0.03). All showed diminishing returns or paradoxical cascade effects. Reverted to n375 values. |
| n382 | 205b3676c8fe3ce4 | 418 | 248 | 87 | **n375 verification with HRHB pool 1.55.** 88.3% match (665/753). Confirmed n375 baseline. HRHB pool 1.70→1.55 reduced HVO 47k→46k. |
| n383 | 205b3676c8fe3ce4 | 416 | 250 | 87 | **Bombardment exposure v1 (linear deficit).** 88.0% match (663/753). First bombardment exposure attrition in frontline_attrition.ts. ARBiH KIA 8,057 (+843). HVO over-penalized (4,577 KIA, 41k). |
| n385 | 205b3676c8fe3ce4 | — | — | — | **Bombardment exposure v2 (linear, tuned).** 88.4% match (666/753). RATE=0.012, DIVISOR=12. ARBiH KIA 9,287 (+2,073). VRS 88k, HVO 42k. |
| n386 | 205b3676c8fe3ce4 | 416 | 251 | 86 | RATE=0.015, DIVISOR=10. ARBiH KIA 10,292 but HVO 39k (below band), VRS 88k. Regressed to 88.0%. |
| n387 | 205b3676c8fe3ce4 | — | — | — | **Bombardment exposure v3 (ratio-based).** 88.2%. Log-ratio model: `ln(incoming/own) / SCALE`. Better ARBiH/HVO differentiation. RATE=0.015 too aggressive (VRS 85k). |
| **n392** | **205b3676c8fe3ce4** | **420** | **246** | **87** | **ALL-TIME HIGH (count-based): 88.6% (667/753).** Ratio-based bombardment exposure (RATE=0.012, SCALE=2.0). Krajina **98.5%** (+3.0pp). ARBiH KIA **9,831** (target 11,500, 85% achieved). Personnel: ARBiH 119k (in band), VRS 85k (below band -5k), HVO 41k (in band). Total military KIA: 25,805. Civilian killed: 27,868. |
| **n407** | **2da7a05b322452f6** | **426** | **230** | **88** | **ALL-TIME HIGH (area-weighted): 90.5% (46,470/51,337 km²).** Supply reserves enabled by default (`supply_reserves_enabled: true`). Count-based 86.7% (645/744). Phase D: UN airdrops (RBiH enclave supply 7.5 at w40), bot supply-aware targeting, MAINTENANCE_DRAIN 0.15→0.04. Krajina **96.1%**. Herzegovina **95.2%**. ARBiH KIA **12,054** (historically plausible for year-1 intensity; 11.5k was a floor estimate). VRS KIA 13,170. HVO KIA 5,904. Personnel: ARBiH 129k, VRS 77k, HVO 38k. Civilian killed: 28,159. |
| **n408** | **2da7a05b322452f6** | **426** | **230** | **88** | **Phase E1: PATRON_AID_SCALE 1→12; JNA inheritance +40 heavy munitions for RS (start=100).** ATH maintained at 90.5% area-weighted. Total KIA 31,128. RS heavy_munitions=100 at w40 (JNA bonus), general_supply→0 (siege drain accumulation — deferred). |
| **n409** | **2da7a05b322452f6** | **426** | **230** | **88** | **Phase E2: heavy munitions gates getBombardmentCasualtyMult + getArtillerySuppression via getHeavyMunitionsMult().** ATH maintained at 90.5%. E2 mechanism inert at 40w (RS heavy_munitions stays at 100; drain rate too low to deplete in 40 weeks from JNA start). |
| **n422** | **2da7a05b322452f6** | — | — | — | **Bot strategy: EBK drop brcko, Tuzla drop lopare, Herzegovina Hold + Drina munis.** 88.2% count, **91.3% area-weighted** (ATH). POSAVINA_NE 89.0% (+8.3pp). DRINA 78.0% (unchanged). Kept. |
| **n423** | **2da7a05b322452f6** | — | — | — | Drina munis moved from Herzegovina Hold to Drina Hold. Hash changed; metrics identical to n422. Kept for clarity. |
| **n424** | 2da7a05b322452f6 | — | — | — | REVERTED — Drina Sweep/Hold: add srebrenica, drop kalinovik/cajnice/rudo. DRINA 78→75.6, global 91.3→91.1%. |
| **n425** | 2da7a05b322452f6 | — | — | — | INERT — Drina Sweep weight 130→138. Same hash as n423; 88.2% count, 91.3% area-weighted. Reverted. |
| **n403** | **d8657a4dfd1fc276** | **408** | **246** | **90** | **Officers System two-tier (Phases A–D).** 88.0% count-based (655/744), 90.4% area-weighted. 63 named officers + per-brigade officer_quality. Brigade quality: RS avg 0.390, RBiH 0.076, HRHB 0.211. Named officers: 25 active, 1 killed, 2 retired, 21 assigned. Three regions improved: Central Bosnia 93.3% (+6pp), Sarajevo 90.3% (+3.2pp), Posavina 84.4% (+2.7pp). Drina 74.0% (-8pp, per-corps variance). Personnel: ARBiH 131k, VRS 88k, HVO 42k. KIA: ARBiH 9,604, VRS 10,445, HVO 5,606. **Critical fix:** normalizeScenario whitelist — war_timeline was never loading in previous runs. |
| **n413** | **500504bd91fe8fc1** | **411** | **246** | **87** | **Supply Phase E: heavy weapon maintenance drain + isolated source detection.** 89.7% area-weighted (83.2 km² area from 51,337). RS general=26.5 (strained), RS heavy=42.9 (strained) at w40. E2 bombardment differentiation now ACTIVE (0.75× mult). ARBiH 120k, VRS 77k, HVO 41k. KIA: ARBiH 10,852, VRS 12,701, HVO 6,534. DRINA 77.2%/83.3%. Regression from n425 (91.3%) due to Supply Phase E structural changes + OOB rework + war timeline externalization. |
| n435 | 500504bd91fe8fc1 | 411 | 246 | 87 | **Session restart baseline.** 89.6% area (86.6% count). RS share=0.24/aggr=-0.05 (regression from n413 — share was reduced in commit 2675045). RS=411 (+0 vs painted), DRINA 28 mismatches (77.2%/83.3%). Confirmed regression. |
| n436 | 500504bd91fe8fc1 | 425 | 229 | 90 | RS share 0.24→0.26, aggr -0.05→0.13. **89.9% area** (+0.3pp). DRINA unchanged (77.2%/83.3%). |
| n437 | 500504bd91fe8fc1 | — | — | — | Added 'visegrad' to Herzegovina Hold + 'rogatica' to SRK Sarajevo Siege targets. 89.9%. Brigade positions unchanged — targeting didn't help (brigades can't reach). |
| n438 | 500504bd91fe8fc1 | 450 | 205 | 89 | REVERTED — Added all 18 OSID overrides incl. Rogatica 5 + Srebrenica 6 + Cajniče 2. Sarajevo COLLAPSED 86.2%→70.4% area. RS=450 (+39 vs painted). Cascade: Rogatica→Trnovo→Hadžići→Sarajevo. |
| **n439** | **500504bd91fe8fc1** | **425** | **229** | **90** | **BEST (this session): 90.5% area-weighted (87.8% count). NEW SAFE OVERRIDES: 13 cells (Višegrad 7, Bratunac 2, Foča:ustikolina, Rudo:gornja_strmica, Brčko 2). ARBiH homeland last stand (≥50% Bosniak → absorbs 'victory' + 'costly_victory'). Morale resist floor: RBiH 62→50, HRHB 65→60. DRINA 82.9%/87.2% (+5.7pp count). POSAVINA_NE 89.0%/91.4%. SARAJEVO 87.1%/86.2% (stable). ARBiH 118k, VRS 76.5k, HVO 40.8k. KIA: ARBiH 10.7k, VRS 12.9k, HVO 6.6k.** |
| n440 | 500504bd91fe8fc1 | 425 | 232 | 87 | REVERTED — Re-added Rogatica 5 cells. Sarajevo collapsed again (80.6%/70.4%). Same as n438. |
| n441 | 500504bd91fe8fc1 | — | — | — | REVERTED — Only 3 Rogatica cells (rogatica_2, varosiste_2, kovanj). Still Sarajevo collapse (80.6%/70.4%). Rogatica_2 itself is adjacent to Trnovo cascade path. |
| n442 | 500504bd91fe8fc1 | — | — | — | REVERTED — All Rogatica overrides + RS avoided_osids (Trnovo + Hadžići). CENTRAL_BOSNIA collapsed 78.5%/75.9%. RS AI redirected attacks elsewhere. |
| n443 | 500504bd91fe8fc1 | 425 | 229 | 90 | INERT — Lowered homeland defense threshold 0.60→0.50. **Identical to n439 (90.5%)**. No cells with Bosniak share 0.50-0.60 are contested at w40. |
| n444 | 1130bddd883bc61c | — | — | — | REVERTED — Added Srebrenica perimeter 6 cells + Cajniče 2 + Bratunac:glogova. Drina improved (89.4% count) but POSAVINA_NE collapsed (83.5%/87.5%, Zvornik town lost). Drina Corps redeploys from Zvornik when Srebrenica staging added. |
| n445 | 500504bd91fe8fc1 | 416 | 241 | 87 | REVERTED — RS share 0.26→0.25, aggr 0.13→0.10. 90.4% area (-0.1pp). RS=416 (+5 vs painted) — less over-capture. DRINA dropped 80.5%/85.2%. Confirmed 0.26/0.13 is better. |
| n446–n448 | 500504bd91fe8fc1 | 425 | 229 | 90 | **Baseline verification × 3.** All confirm 90.5% area, 87.8% count. Deterministic. |
| n449 | 532265e325c2dd0f | 389 | 254 | 101 | REVERTED — RS-HRHB attack penalty (-400) + Cajniče 2 cells + Glogova + Bosanski Samac overrides. 89.1% area (-1.4pp). CENTRAL_CORRIDOR +4.3pp, CENTRAL_BOSNIA +1.9pp. KRAJINA -3.8pp (HRHB runs unchallenged), POSAVINA_NE -5.5pp (Zvornik collapse), SARAJEVO -8.6pp. Cascade: HRHB unchallenged → attacks RS in Krajina. |
| n450 | 9a08839a64863729 | 395 | 252 | 97 | REVERTED — RS-HRHB penalty (-200, weaker) + Glogova + Bosanski Samac (no Cajniče). 90.1% area (-0.4pp). CENTRAL_CORRIDOR +4.3pp, CENTRAL_BOSNIA +1.9pp, SARAJEVO +3.2pp. POSAVINA_NE still -5.5pp (Zvornik collapse persists). Penalty too strong even at -200. |
| n451 | 500504bd91fe8fc1 | 425 | 229 | 90 | Isolation test: penalty disabled (0) + Glogova + Bosanski Samac overrides. 90.1% area. POSAVINA_NE 87.9% area (-3.5pp vs baseline 91.4%). Confirmed: Bosanski Samac override causes POSAVINA cascade even without penalty. |
| n452 | 7a7bcf2e00ef80d4 | 425 | 229 | 90 | REVERTED — Glogova override only (no Bosanski Samac, penalty disabled). 90.3% area (-0.2pp). POSAVINA_NE 89.9% (-1.5pp vs baseline). DRINA unchanged 87.1%. Glogova costs POSAVINA -1.5pp, not worth keeping. |
| n453 | 500504bd91fe8fc1 | 414 | 236 | 94 | REVERTED — RS-HRHB penalty -80 (no overrides beyond n439 baseline). 90.1% area (-0.4pp), 88.3% count (+0.5pp). POSAVINA_NE held at 91.4% (penalty itself does NOT cascade there). KRAJINA -1.5pp, HERZEGOVINA -1.1pp. Central gains: CORRIDOR +3 count, CENTRAL_BOSNIA +1.0pp, SARAJEVO +0.5pp. Net negative overall (large regions offset small gains). Isolation finding: RS-HRHB penalty at any level hurts KRAJINA/HERZEGOVINA. |
| **n454** | **d9e1e09c579f8fee** | **418** | **233** | **93** | **NEW ATH: 90.7% area (88.6% count). RS avoided_osids: 4 Visoko cells (visoko_2, gornja_vratnica_2, podvinjci_2, stuparici_2). CENTRAL_CORRIDOR: 88.5% area (+1.7pp vs n439). No cascades. POSAVINA_NE 91.4%, KRAJINA 96.1%, DRINA 87.2%, HERZEGOVINA 94.5% — all stable.** |
| n455 | 3ec15f08d41e29d1 | 422 | 229 | 93 | REVERTED — Cajniče 2 overrides (miljeno_2, todorovici). DRINA +1.5pp (good), SARAJEVO COLLAPSED -8.3pp (77.9%), POSAVINA_NE -1.5pp. New mismatch: trnovo:delijas (large cell, RS captured via Cajniče → Trnovo cascade). STRUCTURAL BARRIER confirmed: Any SE BiH RS gain (Cajniče, Rogatica, Foča perimeter) → Trnovo → Sarajevo cascade. |
| **n456** | **538d4aa56286c9c8** | **416** | **235** | **93** | **NEW ATH: 90.8% area (88.8% count). n454 + HRHB overrides for kiseljak_2/borina + RS avoided_osids expanded (breza:mahala/zupca_2, kakanj:biljesevo, zavidovici:cardak_2). CENTRAL_CORRIDOR: 89.2% area (+0.7pp vs n454). No cascades. Kiseljak overrides neutral (cells already fixed by Visoko geographic isolation in n454). Note: kakanj:biljesevo + zavidovici:cardak_2 still mismatch = consolidation-captured, avoided_osids cannot stop.** |
| **n457** | **1660468c034ada5c** | **406** | **246** | **92** | **MASSIVE NEW ATH: 91.7% area (89.7% count). n456 + RS avoided_osids: bugojno:prijaci/vesela_2, vares:budozelje_2/ravne, doboj:brijesnica_velika/klokotnica_2/matuzici_2 + HRHB override travnik:cukle_2. CENTRAL_BOSNIA +3.9pp (86.2%), CENTRAL_CORRIDOR +1.5pp (90.7%), SARAJEVO +0.5pp, HERZEGOVINA +1.7pp. POSAVINA_NE -2.4pp (89.0%): 3 new Zvornik mismatches (donja_kamenica + krizevici RS-should-hold but lost; rastosnica_2 RS over-capture). Cause: EBK redirects from Doboj → Zvornik disorganization.** |
| n458 | 2afac524fb883eee | 412 | 238 | 94 | Isolation test: removed Doboj avoided_osids + kept Zvornik overrides (donja_kamenica/krizevici RS overrides + rastosnica_2 RS avoided). 91.1% area (-0.6pp vs n457). POSAVINA_NE improved to 89.5% (+0.5pp vs n457) but not recovered. CENTRAL_CORRIDOR -1.3pp, CENTRAL_BOSNIA -1.1pp, HERZEGOVINA -1.7pp — all worse. Conclusion: Doboj avoided_osids are worth keeping despite POSAVINA regression. n457 > n458. |
| **n459** | **ae6f59be15bb2f23** | **408** | **244** | **92** | **NEW ATH: 91.8% area (89.9% count). n457 + Zvornik overrides (donja_kamenica + krizevici → RS) + zvornik:rastosnica_2 → RS avoided. CENTRAL_BOSNIA +0.6pp (86.8%), POSAVINA_NE +0.3pp (89.3%). Note: zvornik:rastosnica_2 still mismatch (consolidation-captured, avoided_osids doesn't stop it). New POSAVINA mismatches: lukavac:dobosnica_2/smoluca_donja_2, zvornik:djulici (EBK redirect cascade from Zvornik stabilization). travnik:cukle_2 HRHB override FAILED — VRS recaptured it during sim.** |
| n460 | — | 399 | 250 | 95 | REVERTED — n459 + RS avoided_osids for turbe_2, olovo_2, cukle_2. 91.3% area (-0.5pp), 89.2% count. cukle_2 RS avoided + HRHB override caused HRHB expansion: +8 HRHB over painted (5 new HRHB over-captures: kiseljak:brnjaci_2, jablanica:doljani_2, novi_travnik:rat_2, prozor:prozor_2, teslic:kamenica_2). olovo:olovo_2 still RS despite avoided_osid (consolidation-captured). CENTRAL_BOSNIA 86.1% (-0.7pp). Finding: combining HRHB override + RS avoided for same OSID frees HRHB from VRS pressure → HRHB over-expands. |
| n461 | — | 400 | 250 | 94 | REVERTED — DIRECTION ERROR. Tried RS avoided_osids for Donji Vakuf (4) + Travnik gornje_krcevine/paklarevo/varosluk (3) — but these are RS UNDER-captures (painted=RS, sim=RBiH), not over-captures! Adding avoided_osids for RS under-captures makes RS even less likely to capture cells it should hold. 91.1% area (-0.7pp vs n459), 89.2% count. New mismatches: travnik:puticevo_2 (RS over-capture from varosluk redirect). Also cukle_2 showed sim=RBiH (ARBiH took HRHB territory via turbe_2 redirect dynamics). KEY LESSON: RS avoided_osids fix RS OVER-captures (painted=RBiH/HRHB, sim=RS). RS overrides fix RS UNDER-captures (painted=RS, sim=RBiH/HRHB). |
| n462 | — | 411 | 240 | 93 | KEPT — n459 + Kladanj 4 RS overrides (brgule/kladanj_3/staric_2/vucinici_2). 91.5% area (-0.3pp vs ATH), 89.8% count. CENTRAL_BOSNIA 89.6% count (+2.5pp, 146/163). Kladanj cascade effect: staric_2 + vucinici_2 held + cascaded to fix donji_vakuf:jemanlici/korenici/prusac_2 + kalesija:seher_2 via consolidation (7 cells improved). New RS over-captures from VRS redirect: travnik:turbe_2, bugojno:udurlije, kalesija:kalesija_selo, brcko:maoca_2, zvornik:vitinica_2 (5 new). Net area -0.3pp (new over-captures are large cells). Kladanj overrides confirmed positive; VRS redirect side-effects need mopping. POSAVINA_NE: swap of 2 Lukavac (fixed) for brcko:maoca_2 + zvornik:vitinica_2 (new). |
| n463 | — | 404 | 246 | 94 | REVERTED — n462 + RS avoided_osids for turbe_2, bugojno:udurlije, kalesija_selo (3 new over-captures from n462). 91.4% area (-0.1pp vs n462), 89.5% count. CENTRAL_BOSNIA 88.3%/86.5% (-1.3pp area). turbe_2 avoided broke Donji Vakuf cascade: donji_vakuf jemanlici/korenici/prusac_2 REVERTED to mismatch (were fixed in n462 via consolidation from turbe_2 as stepping stone). New mismatch: travnik:travnik_2 (large RS over-capture). CRITICAL FINDING: turbe_2 RS over-capture is LOAD-BEARING for the Donji Vakuf consolidation cascade in n462. Fixing it with avoided_osid breaks the cascade → net loss. Do NOT add turbe_2 to RS avoided_osids. |
| n464 | — | 407 | 243 | 94 | REVERTED — n462 + donji_vakuf:donji_vakuf_2 RS override. 91.5% area (=n462), 89.8% count (=n462). CENTRAL_BOSNIA 89.6%/87.3% (+0.1pp area vs n462). Adding donji_vakuf_2 override fixed donji_vakuf_2 (1 cell) but broke Donji Vakuf cascade → jemanlici/korenici/prusac_2 reverted. New mismatch: travnik:travnik_2 (RS over-capture of Travnik town). Exact net neutral — CENTRAL_BOSNIA count 146/163 same as n462 but different cells. Conclusion: donji_vakuf_2 override + cascade-based fixing are mutually exclusive; pick one or the other. |
| n465 | — | 411 | 240 | 93 | REVERTED — n462 + HRHB avoided_osids for jablanica:doljani_2, kiseljak:brnjaci_2, novi_travnik:rat_2, prozor:prozor_2 (4 HRHB over-captures). 91.5% area (=n462), 89.8% count (=n462). ZERO effect. HRHB sim still 93 (painted 87). CONFIRMED: HRHB over-captures are consolidation-captured (same principle as RS consolidation captures). HRHB avoided_osids cannot fix cells that HRHB acquires via consolidation expansion, only bot-targeted captures. Cannot fix jablanica/kiseljak/travnik/prozor HRHB over-captures this way. |
| **n466** | **1b35b0b6ea283b9b** | **409** | **243** | **92** | **NEW ATH: 92.0% area (90.1% count, 670/744). n459 + kalesija:seher_2/gojcin_2 RS overrides. CENTRAL_BOSNIA 90.2% count (147/163, +5pp vs n459). HERZEGOVINA 96.8% area (90/93 count, +2.3pp): bonus fix of kupres:kupres_2 (now correctly RS via VRS dynamics change). No cascades. POSAVINA_NE 89.5% area (=n462). Kalesija overrides enabled VRS to redirect resources to Kupres direction (geographic effect). 20 overrides total. Clean result.** |
| n467 | — | 411 | 240 | 93 | REVERTED — n466 + Kladanj 4 RS overrides. 91.5% area (-0.5pp vs n466 ATH). Kladanj overrides disrupted the VRS force allocation that fixed kupres:kupres_2 in n466 — it reverted to HRHB mismatch. New over-captures: kalesija:kalesija_selo, travnik:podstinje. Only kladanj:staric_2 held (1 of 4). CRITICAL: kalesija overrides → kupres:kupres_2 fix is a FRAGILE DEPENDENCY. Kladanj overrides break it by redirecting VRS forces away from Kupres corridor. Cannot stack Kladanj on top of Kalesija. |
| n468 | 1b35b0b6ea283b9b | 409 | 243 | 92 | Baseline verification of n466 ATH. 92.0% area, 90.1% count. Deterministic. |
| n469 | 1b35b0b6ea283b9b | 408 | 244 | 92 | Baseline verification of n466 ATH. 92.0% area, 90.2% count. Deterministic (tiny persona variance). |
| n470 | 7d8d3fbd1a912da3 | 422 | 233 | 89 | REVERTED — New scenario config attempt. 89.8% area (-2.2pp vs n466 ATH). RS over-captures increased. |
| n471 | 137cf28f1ee0a9c8 | 420 | 235 | 89 | REVERTED — New scenario config. 90.0% area (-2.0pp vs ATH). **RUN PRE-LOCKOUT** (before commit acdd4b9). |
| n472 | 137cf28f1ee0a9c8 | 395 | 252 | 97 | REVERTED — Fine-tune attempt. 89.7% area (-2.3pp vs ATH). **RUN PRE-LOCKOUT** (before commit acdd4b9). Last pre-lockout run. |
| n18 | 137cf28f1ee0a9c8 | 327 | 300 | 117 | REVERTED — Op Kupres pre-planned + dig_in balanced removed. 82.9% area (-6.8pp vs n472). Op Kupres forces 2KK offensive → Krajina/POSAVINA_NE collapse. |
| n19 | 137cf28f1ee0a9c8 | 327 | 300 | 117 | REVERTED — Op Kupres pre-planned only (dig_in reverted). 83.0% area. Confirms Op Kupres alone causes regression. |
| n20 | 137cf28f1ee0a9c8 | 333 | 296 | 115 | REVERTED — All code reverted but rs_7th home_osid=pribraca_2 still in OOB. 83.4% area. Confirms home_osid alone has neutral-to-negative effect (Kupres area undefended). |
| n21 | 137cf28f1ee0a9c8 | 333 | 296 | 115 | REVERTED — All changes fully reverted (clean main code). 83.4% area. **Establishes post-lockout baseline** (−6.4pp vs n472 pre-lockout). Lockout commit acdd4b9 is root cause. |
| **n22** | **137cf28f1ee0a9c8** | **331** | **298** | **115** | **KEPT — dig_in fix for balanced corps (Rule 6: balanced → defend, not dig_in). 83.3% area (+0.1pp vs n21). Current baseline. Logical improvement but lockout regression not fully recovered.** |

---

## Officers System (n403)

### Two-Tier Architecture

**Tier 2 (brigade):** Per-brigade `officer_quality` [0.05, 0.90]. Growth from combat (0.01/turn) and frontline (0.005/turn), diminished at high quality. Loss from casualties. Faction learning rates: RBiH 1.5×, RS 0.7×, HRHB 1.0×. VRS brain drain -0.001/turn after w40.

**Tier 1 (named officers):** 63 historical officers. Corps mod: `0.90 + comp×0.03 + rating×0.01` (range 0.94–1.10). Acting commander flat 0.92. HVO political sorting + 4-turn delay. VRS finite pool (no regeneration). ARBiH pool regeneration every 12 turns.

**Bot AI integration:** Corps aggressiveness shift, ARBiH warlord friction (pre-w78), VRS Mladić override for general_offensive operations.

### Officer Quality at w40 (n403)

| Faction | Start | w40 Avg | Expected Range | Status |
|---------|-------|---------|----------------|--------|
| VRS | 0.55 | 0.390 | 0.45–0.55 | Below (attrition heavier than expected) |
| HVO | 0.225 | 0.211 | 0.35–0.45 | Below (growth rate low) |
| ARBiH | 0.05 | 0.076 | 0.30–0.40 | Below (40w insufficient for full learning arc) |

Quality values are lower than projected. The learning effect will be more visible over 52+ week runs. The two-tier interaction produces correct relative ordering (VRS > HVO > ARBiH) and the calibration guard passes.

### Calibration Impact

| Region | Pre-Officers | n403 | Delta | Analysis |
|--------|-------------|------|-------|----------|
| Central Bosnia | 87.3% | **93.3%** | **+6.0pp** | Per-corps variance helps ARBiH 3rd Corps hold |
| Sarajevo | 87.1% | **90.3%** | **+3.2pp** | SRK corps commander modifiers tune siege |
| Posavina | 81.7% | **84.4%** | **+2.7pp** | VRS 1KK officer quality boosts corridor hold |
| Krajina | 98.5% | 94.7% | -3.8pp | Minor shifts at Bihać pocket edges |
| Central Corridor | 90.4% | 88.3% | -2.1pp | Doboj/Maglaj area shifts |
| Herzegovina | 92.5% | 91.4% | -1.1pp | Kupres edges |
| Drina | 82.0% | 74.0% | -8.0pp | Enclave periphery flips from per-corps variance |

### Critical Finding: normalizeScenario Whitelist Bug

`war_timeline` field was being stripped by the scenario loader's `normalizeScenario()` whitelist. This means **all runs n335–n409 used hardcoded timeline fallbacks instead of the externalized JSON data.** The fix adds `war_timeline`, `init_officers`, `supply_reserves_enabled`, and `osid_control_overrides` to the normalizer. This may explain some prior calibration differences since timeline data was never actually being loaded.

---

## Comprehensive Combat Formula (n375–n392)

### New Mechanics Added

**1. Officer Quality** (`combat_math.ts:getOfficerQualityMult`)
Faction-level command effectiveness curve modeled on historical doctrinal arcs:
- **VRS**: 1.10 peak (JNA officers), decays 0.002/week after w20, floor 0.95 (brain drain, no replacement officers)
- **ARBiH**: 0.85 floor (no officers, rabble), grows 0.003/week, cap 1.05 (professionalization)
- **HVO**: constant 0.97 (Croatian backing, stable cadre)
Applied to both `computeAttackerPower` and `computeDefenderPower`.

**2. Ethnic Homeland Defense** (`ethnic_defense.ts`)
Defenders fight harder in co-ethnic majority OSIDs:
- ≥60% co-ethnic population → +12% defense power
- 30–60% → graduated bonus
- <30% → no bonus
Shared module (`OsidEthnicComposition`), wired into resolver, predictor, and bot AI.

**3. Bombardment Casualty Multiplier** (`combat_math.ts:getBombardmentCasualtyMult`)
Attacker heavy weapons inflict extra defender casualties even on stalemate/repulsed outcomes:
- `(artEff + tankEff×0.5) / 80` → 1.0–1.8× defender casualties
- Models VRS artillery causing ARBiH losses while ARBiH never yields

**4. Bombardment Exposure Attrition** (`frontline_attrition.ts`)
Passive attrition from enemy heavy weapons — the major new mechanic for closing the casualty gap:
- Ratio-based vulnerability: `ln(incoming/ownFP) / SCALE`
- Brigades with very low own firepower facing high enemy firepower are exponentially more vulnerable
- ARBiH (own FP ~1.8, incoming ~13) → ln(7.2)/2.0 = 0.99 → near-full effect
- HVO (own FP ~5, incoming ~13) → ln(2.6)/2.0 = 0.48 → half effect
- VRS (own FP ~17, incoming ~2) → ln(0.13) < 0 → zero effect
- BOMBARDMENT_EXPOSURE_RATE = 0.008 (was 0.012, reduced in n159 audit), BOMBARDMENT_RATIO_SCALE = 2.0
- Enemy FP distributed across all non-enemy brigades (not just own faction)
- **Entrenchment reduction**: both base attrition and bombardment exposure scaled by `entrenchmentMod = max(0.40, 1.0 - sqrt(entrenchment_turns) * 0.10)`. Fortifications reduce exposure to shelling.

### Calibration Iterations (n375–n392)

| Run | Model | RATE | DIVISOR/SCALE | ARBiH KIA | VRS P | HVO P | OSID |
|---|---|---|---|---|---|---|---|
| n382 | none | — | — | 7,214 | 91k | 46k | 88.3% |
| n383 | linear deficit | 0.005 | DIV=20 | 8,057 | — | 41k | 88.0% |
| n385 | linear deficit | 0.012 | DIV=12 | 9,287 | 88k | 42k | 88.4% |
| n386 | linear deficit | 0.015 | DIV=10 | 10,292 | 88k | 39k | 88.0% |
| n387 | **ratio ln()** | 0.015 | SCALE=2.0 | 10,403 | 85k | 39k | 88.2% |
| **n392** | **ratio ln()** | **0.012** | **SCALE=2.0** | **9,831** | **85k** | **41k** | **88.6%** |

### Key Finding: Cascade Dynamics
Increasing bombardment attrition weakens ARBiH/HVO → VRS attacks more successfully → VRS takes more attacker casualties → VRS personnel drops. RS pool scale is extremely sensitive: 0.25→0.27 crashed OSID match from 88.6% to 85.7% (VRS over-extension). The VRS at 85k is an emergent consequence of historically aggressive VRS offensive behavior.

### Remaining Gap
- ARBiH KIA: 9,831 vs target 11,500 (85% achieved, 1,669 gap)
- Gap likely requires siege-specific mechanics (Sarajevo daily shelling, enclave bombardment) rather than further parameter tuning
- VRS at 85k: below 90k band, driven by combat cascade — accepted as emergent behavior

---

## Ceiling Removal (n369–n374)

### Problem
`FACTION_HISTORICAL_PEAK` ceiling system applied hardcoded caps (RBiH 130k, RS 185k, HRHB 45k) via soft/hard cap ratios. Values were factually wrong (ARBiH peak should be 180-200k, VRS peak 100-110k) and violated the design principle of emergent growth.

### Solution
Removed ceiling system entirely. Tuned mobilization parameters so personnel naturally settles within historical bands:

| Parameter | Before | After (n374) | File |
|---|---|---|---|
| `FACTION_HISTORICAL_PEAK` | RBiH 130k, RS 185k, HRHB 45k | **DELETED** | `formation_constants.ts` |
| `FACTION_SOFT_CAP_RATIO` | 0.85 | **DELETED** | `formation_constants.ts` |
| `FACTION_HARD_CAP_RATIO` | 0.95 | **DELETED** | `formation_constants.ts` |
| `ABOVE_SOFT_CAP_REINFORCEMENT_MULT` | 0.25 | **DELETED** | `formation_constants.ts` |
| `getFactionCeilingMult()` | Soft/hard cap gating | **DELETED** | `formation_spawn.ts` |
| `getFactionTotalPersonnel()` | Personnel counter for ceiling | **DELETED** | `formation_spawn.ts` |
| `FACTION_MOBILIZATION_SCALE.RBiH` | 0.40 | **0.14** → 0.10 (n191) | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.RS` | 0.25 | **0.22** → 0.12 (n191) | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.HRHB` | 0.90 | **0.18** → 0.29 (n191) | `ongoing_mobilization.ts` |
| `EXHAUSTION_THRESHOLD` | 0.20 | **0.15** → 0.25 (n191) | `ongoing_mobilization.ts` |
| `EXHAUSTION_HARD_CAP` | 0.35 | **0.25** → 0.50 (n191) | `ongoing_mobilization.ts` |
| `FACTION_POOL_SCALE.HRHB` | 2.10 | **1.55** | `pool_population.ts` |

### Calibration iterations
| Run | RBiH mob | RS mob | HRHB mob | HRHB pool | ARBiH | VRS | HVO | Match |
|---|---|---|---|---|---|---|---|---|
| n364 (baseline) | 0.40 + ceiling | 0.25 + ceiling | 0.90 + ceiling | 2.10 | 124k | 103k | 43k | 87.4% |
| n369 | 0.28 | 0.16 | 0.50 | 2.10 | 151k | 79k | 55k | 87.5% |
| n370 | 0.16 | 0.22 | 0.30 | 2.10 | 134k | 96k | 50k | 87.4% |
| n371 | 0.14 | 0.22 | 0.24 | 2.10 | 129k | 97k | 49k | 87.6% |
| n374 | 0.14 | 0.22 | 0.18 | 1.70 | 127k | 97k | 46k | 87.6% |

### Design principle confirmed
Personnel totals emerge from: census demographics (initial pool size) → mobilization rate × surge × exhaustion (ongoing growth) → reinforcement rate ramp (pool→brigade transfer) → combat attrition (drain) → pool depletion (finite manpower). No hardcoded limits needed.

---

## Strategic Reserve System (n191)

### Problem: Municipality-Locked Pool Topology Mismatch
Municipality-locked militia pools created a structural mismatch: rear municipalities accumulated large surplus pools (brigades at max 3,000 cap, pool growing each turn) while front-line municipalities had empty pools (brigades consume faster than mobilization generates). Increasing mobilization surge factors only added to the rear surplus — it never reached the front-line brigades that needed it. At n182, RS had 27k surplus in rear pools while front brigades were under-strength.

### Solution: Faction-Level Manpower Redistribution
After brigade reinforcement, excess `pool.available` above `OVERFLOW_THRESHOLD` (5,000) flows into a faction-wide strategic reserve (`state.strategic_reserves`). Under-strength brigades then draw from the reserve at a reduced rate (logistics friction).

**Historical basis:** All three factions redistributed manpower across their territory. VRS rotated units between fronts, ARBiH moved forces to Sarajevo/corridor operations, HVO shuttled between Herzegovina and Central Bosnia.

### Pipeline Order
```
phase-ii-ongoing-mobilization → phase-ii-brigade-reinforcement →
  phase-ii-strategic-reserve-collection → phase-ii-strategic-reserve-reinforcement
```

### Constants and Parameters

| Parameter | Value | Rationale | File |
|---|---|---|---|
| `OVERFLOW_THRESHOLD` | 5,000 | Local buffer for spawn/reinforcement | `strategic_reserve.ts` |
| `FACTION_RESERVE_DRAW_RATE.RS` | 0.25 | JNA logistics inheritance | `strategic_reserve.ts` |
| `FACTION_RESERVE_DRAW_RATE.HRHB` | 0.25 | Croatian support, compact territory | `strategic_reserve.ts` |
| `FACTION_RESERVE_DRAW_RATE.RBiH` | 0.02 | Poor early logistics until 1994 professionalization | `strategic_reserve.ts` |

### Faction-Differentiated Mobilization Surge (n181–n191)
Global surge curve replaced with per-faction curves reflecting historical mobilization arcs:

| Faction | w1-12 | w13-26 | w27-52 | w53-78 | w79-104 | w105+ | Rationale |
|---|---|---|---|---|---|---|---|
| RS (VRS) | 2.0× | 1.8× | 1.3× | 1.1× | 1.0× | 0.6× | JNA inheritance → organized, lower rush, more sustained |
| RBiH (ARBiH) | 2.8× | 2.2× | 1.3× | 0.8× | 0.45× | 0.3× | Desperate mass mobilization → fast burnout |
| HRHB (HVO) | 2.5× | 2.0× | 1.4× | 1.0× | 0.6× | 0.4× | Capable early → two-front stress decline |

### Mobilization Scale (final values, n191)

| Parameter | Before (n374) | After (n191) | File |
|---|---|---|---|
| `FACTION_MOBILIZATION_SCALE.RBiH` | 0.14 | **0.10** | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.RS` | 0.22 | **0.12** | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.HRHB` | 0.18 | **0.29** | `ongoing_mobilization.ts` |
| `RS_JNA_INHERITANCE_BONUS` | 12,000 | **10,000** | `pool_population.ts` |
| `EXHAUSTION_THRESHOLD` | 0.15 | **0.25** | `ongoing_mobilization.ts` |
| `EXHAUSTION_HARD_CAP` | 0.25 | **0.50** | `ongoing_mobilization.ts` |

### Calibration Iterations (n181–n191)

| Run | Change | RS w40 | RS w80 | RBiH w40 | RBiH w80 | HRHB w40 | HRHB w80 | Notes |
|---|---|---|---|---|---|---|---|---|
| n182 | Faction surge (no reserve) | 97.3k | 85.9k | 124.8k | 161.5k | 39.6k | 42.5k | RS declining, HRHB stalled |
| n184 | + strategic reserve (0.5× draw) | — | 106.6k | — | 254.2k | — | 52.0k | Reserve too effective |
| n185 | Reserve threshold 2k→5k, draw 0.25× | — | 101.0k | — | 236.2k | — | 50.7k | RBiH still explosive |
| n186 | + RBiH draw 0.02 | — | 93.3k | — | 195.3k | — | 46.3k | RBiH moderated |
| n191 | + RBiH scale 0.16→0.10, tuning | **102.6k** | **110.1k** | **121.0k** | **175.4k** | **41.5k** | **49.8k** | **All factions in/near band** |

### Strategic Reserves at w80 (n191)
```json
{"HRHB": 0, "RBiH": 70262, "RS": 0}
```
RS and HRHB reserves fully consumed by under-strength brigades. RBiH accumulates large reserve but very low draw rate (0.02) limits distribution — reflects poor logistics until 1994 professionalization.

### Design Principle
The strategic reserve solves the topology mismatch without artificial caps or scripted behavior. Manpower flows from surplus (rear) to deficit (front) at faction-specific rates reflecting historical logistics capability. Combined with faction-differentiated surge curves, this produces historically accurate growth trajectories across multiple time checkpoints (w40, w80) from purely organic mechanics.

---

## Front System Analysis (n314)

### Corps Front Sectors (end of 40 weeks)

The corps sector system partitions front edges by corps via multi-source BFS from HQ locations. Sub-segments with >= 5 edges promote to independent sectors; small sub-segments merge into nearest. Multi-sector corps get per-sector targeting. Sectors are used for **targeting only** (not density modifiers).

| Corps | Faction | Stance | Sectors | Total Edges | Total Brigades |
|---|---|---|---|---|---|
| arbih_1st_corps | RBiH | defensive | 1 | 14 | 10 |
| arbih_2nd_corps | RBiH | offensive | **3** | 68 | 21 |
| arbih_3rd_corps | RBiH | offensive | **2** | 33 | 10 |
| arbih_4th_corps | RBiH | offensive | 1 | 19 | 4 |
| arbih_5th_corps | RBiH | offensive | 1 | 9 | 2 |
| vrs_1st_krajina | RS | defensive | 1 | 95 | 11 |
| vrs_2nd_krajina | RS | defensive | **2** | 23 | 6 |
| vrs_drina | RS | defensive | 1 | 52 | 7 |
| vrs_east_bosnian | RS | balanced | 1 | 20 | 1 |
| vrs_sarajevo_romanija | RS | defensive | **2** | 88 | 3 |
| vrs_herzegovina | RS | defensive | 1 | 17 | 2 |

**Multi-sector corps (bold):** ARBiH 2nd (3 sectors — covers Tuzla/Majevica/Posavina), ARBiH 3rd (2 sectors — covers Central Bosnia), VRS 2nd Krajina (2 sectors — covers Doboj/Corridor), VRS SRK (2 sectors — covers Sarajevo siege ring).

### Key Design Decision: Density stays at faction level

n300-n302 tested per-sector density modifiers — catastrophic regression (77-78%). VRS is inherently thin per-corps (0.03-0.26 density) because RS has ~80 brigades across 420+ front edges spread over 6 corps. Per-sector density applied 0.6× THIN penalty to EVERY VRS sector, collapsing RS lines. Faction-level mega-front aggregation (80/167 = 0.48 density) hid this truth but matched historical outcomes better.

**Lesson L35:** Do not use per-corps density for the THIN/DENSE modifier. VRS overextension is real but managed by distributing forces. The density modifier should reflect faction-level front density, not per-corps. Per-sector density should only apply to attack sectors (Phase 3 — future work).

### Local Fronts (density modifier — faction-level aggregation)

| Front | Faction | Brigades | Edges | Density | Flag |
|---|---|---|---|---|---|
| RBiH-RS Bratunac mega | RBiH | 150 | 171 | 0.877 | — |
| RBiH-RS Zvornik | RBiH | 25 | 65 | 0.385 | THIN |
| HRHB-RS Bugojno-1 | HRHB | 10 | 3 | 3.333 | DENSE |
| HRHB-RS Bugojno-2 | HRHB | 8 | 24 | 0.333 | THIN |
| HRHB-RS Jajce | HRHB | 8 | 12 | 0.667 | — |
| HRHB-RS Orašje | HRHB | 2 | 5 | 0.400 | THIN |
| HRHB-RS Neum | HRHB | 1 | 4 | 0.250 | THIN |
| HRHB-RS Vareš | HRHB | 3 | 1 | 3.000 | DENSE |

### Corps-Front Mapping

All 15 corps now have front assignments. Most VRS corps map to the RBiH-RS mega-front. Key mappings:
- **ARBiH 1st Corps**: 1 front (mega) — Sarajevo defense through mega-front
- **ARBiH 2nd Corps**: 3 fronts — Banovići-Vozuća + mega + Zapolje
- **ARBiH 3rd Corps**: 2 fronts — Banovići-Vozuća + Donji Vakuf
- **ARBiH 5th Corps**: 1 front — Bihać (isolated, correct)
- **VRS 1st Krajina**: 6 fronts — spans HRHB and RBiH boundaries (correct — largest corps)
- **VRS Drina**: 1 front (mega) — correct assignment but mega-front too large

### Structural Issue: Mega-Front

The front segmentation algorithm (`deriveAssignableFrontSegments`) groups edges into contiguous connected components. The entire RBiH-RS border is one connected graph → one segment → 167 edges with 80 brigades. This makes front density modifiers less meaningful (density 0.479 = modest THIN penalty across entire front, rather than per-sector variation).

**Needed:** Corps-level front splitting. Each corps should "own" a section of the mega-front based on brigade AoR/position, creating 5-8 smaller fronts with more meaningful density variation.

---

## Historical OOB Baselines

### VRS Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~80,000 | JNA inheritance, full heavy weapons |
| December 1992 (w40 target) | ~90,000–100,000 | Expansion + consolidation |
| 1993–1994 peak | ~100,000–110,000 | Plateau |

**Corps breakdown (April 1992):**
| Corps | HQ | Strength | Mission |
|---|---|---|---|
| 1st Krajina | Banja Luka | ~40,000 | Strongest; offensive; Posavina corridor |
| 2nd Krajina | Drvar | ~15,000 | Weakest; besieging Bihać |
| East Bosnian | Bijeljina | ~25,000 | Corridor security; northeastern ops |
| Drina | Vlasenica | ~15,000 | Siege of Srebrenica, Žepa, Goražde |
| Sarajevo-Romanija | Lukavica | ~20,000 | Static siege of Sarajevo |
| Herzegovina | Bileća | ~10,000 | **DEFENSIVE** — southern BiH; Goražde ops |

**Key point:** Herzegovina Corps was DEFENSIVE. VRS attacking HRHB in Herzegovina = misuse of Herzegovinian forces they didn't have to spare.

**Equipment inherited from JNA:**
- Tanks: ~200–300 (T-55, T-72, T-34) — by end 1992 ~300–400
- APCs/IFVs: ~400–500 (M-80, BOV)
- Artillery: Extensive JNA stockpiles — 155mm, 122mm, 105mm, mortars
- Ammunition: Abundant (full JNA depots)

### ARBiH Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~60,000–80,000 | Many UNARMED; arms embargo from day 1 |
| December 1992 (w40 target) | ~110,000–130,000 | Growing but still outgunned |
| 1995 peak | ~180,000–200,000 | Fully organized |

**Corps at w40 (December 1992):**
| Corps | HQ | Est. Strength | Mission |
|---|---|---|---|
| 1st Corps | Sarajevo | ~20,000–30,000+ | Defending besieged capital (1,425 days) |
| 2nd Corps | Tuzla | ~10,000–15,000 | Industrial base; some counter-pressure on corridor |
| 3rd Corps | Zenica | ~15,000–20,000 | Central Bosnia defense (incl. Bugojno); two-front war forming 1993 |
| 4th Corps | Mostar | ~5,000–10,000 | Neretva valley defense; Konjic/Jablanica |
| 5th Corps | Bihać | ~10,000–15,000 | ISOLATED POCKET; no resupply; internal Abdić crisis forming |

**Enclave commands — survival posture ONLY:**
| Enclave | Fighters | Equipment | Supply | Historical Mission |
|---|---|---|---|---|
| Srebrenica | 1,000–2,000 | **Small arms only** (hunting rifles, captured weapons) | **NONE** — besieged | Survival; Orić raids were desperate foraging, not offensive |
| Goražde | 2,000–3,000 | **Small arms only** | **NONE** — besieged | Survival; relied on UNPROFOR presence |
| Žepa | 500–800 | **Small arms only** | **NONE** — besieged | Survival |

**Critical constraint:** ARMS EMBARGO throughout entire war. No tanks, no artillery at start. Equipment only via capture or black market. At week 40, enclave brigades have zero resupply, zero logistics, no ammunition reserves.

### HVO Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~25,000–35,000 | Establishing control in Croat-majority areas |
| December 1992 (w40 target) | ~40,000–45,000 | Expanded; Croatian supply lines functional |
| 1993 peak (war with ARBiH) | ~50,000–55,000 | Maximum expansion |

**Operational Zones at w40:**
| OZ | HQ | Strength | Mission |
|---|---|---|---|
| Southeast Herzegovina | Mostar (west) | ~10,000–15,000 | Strongest; Croatian supply; defensive vs VRS |
| Central Bosnia | Vitez/Busovača | ~8,000–12,000 | Besieged enclaves; helicopter supply from Split |
| Posavina NW | Orašje | ~5,000–8,000 | Isolated pockets; fighting VRS WITH ARBiH |
| Tomislavgrad | Tomislavgrad | ~5,000–8,000 | Western sector; defensive |

---

## Faction Doctrinal Arcs (Full War)

**CRITICAL CALIBRATION PRINCIPLE — memorize and apply always.**

### VRS (RS): Professional → Degraded
- **Starts** as a professional, well-equipped army. Inherits JNA officer corps, heavy weapons, logistics, doctrine. Capable of coordinated multi-corps offensive operations (Corridor '92, Drina sweep).
- **Ends** as mostly rabble without the starter officer corps. Attrition, brain drain, and inability to replace trained NCOs/officers degrades operational capability over 3.5 years. Still capable of defensive operations and local counterattacks, but increasingly unable to sustain large-scale offensives.
- **Calibration implication:** VRS early-war effectiveness should be HIGH (good morale, high experience, low war weariness). Late-war VRS should show degraded cohesion, officer loss penalties, rising insubordination/war weariness. Equipment advantage persists but crew quality drops.

### ARBiH (RBiH): Rabble → Professional
- **Starts** as rabble. No officer corps, no heavy weapons, no logistics, many fighters unarmed. Relies on militia formations, Territorial Defense remnants, and sheer numbers in urban defense.
- **Ends** as a professional army. Still under-equipped compared to VRS (arms embargo throughout), but capable of larger coordinated operations (1994–1995 offensives). Trained officer corps developed organically through combat experience and foreign training.
- **Calibration implication:** ARBiH early-war should have LOW experience, LOW morale, LOW cohesion — but HIGH willingness to hold ground (desperation, defending homes). Late-war ARBiH should show rising experience, better coordination, ability to conduct corps-level offensives. Equipment gap narrows but never closes.

### HVO (HRHB): Capable Militia → Overstretched
- **Starts** as capable militia with Croatian state backing. Good equipment pipeline from Croatia, motivated fighters in Croat-majority areas.
- **Ends** overstretched by two-front war (VRS + ARBiH from 1993). Equipment advantage over ARBiH but manpower-limited. Increasingly reliant on Croatian Army (HV) support.
- **Calibration implication:** HVO should be regionally strong but unable to project power far from Croat heartland. Manpower ceiling reached early. Two-front war from 1993 should strain resources.

### Design Rule
These arcs must emerge **organically** from game mechanics (experience gain, attrition, recruitment exhaustion, war weariness) — NOT from hard-coded phase switches or artificial caps. The sim should produce these trajectories as natural consequences of the faction starting conditions and the mechanics acting on them over time.

---

## RS-HRHB Relations in 1992

**Classification: "Ambiguous Ally" — NO OPEN WAR between VRS and HVO in 1992.**

| Area | Reality | Implication |
|---|---|---|
| Posavina | HVO and ARBiH fighting TOGETHER against VRS | RS vs HRHB conflict is ACCEPTABLE here |
| Kupres (April 1992) | HVO cooperated with VRS to take from ARBiH | Exception — specific, brief |
| Herzegovina | **No VRS-HVO combat in 1992** | RS attacking HRHB here = AHISTORICAL |
| Central Bosnia | Competing territorial claims; uneasy cooperation | No open fighting |

**Calibration rule:** If RS is attacking HRHB territory in Herzegovina or Central Bosnia, the root cause is that **RS doesn't have enough brigades in its actual priority areas** (Drina corridor, Central Corridor). The fix is correct brigade positioning and a large scoring penalty, not behavioral blocks.

**RS-HRHB scoring rule (to implement):** RS attacking HRHB-controlled OSIDs outside Posavina = -400 score penalty. "VRS would not spend Serb blood for Croatian land unless strategically compelled."

---

## Displacement System Reference

### Implementation Files
- `src/sim/early_war/displacement_hooks.ts` — early-war (one-time flip trigger)
- `src/state/displacement.ts` — war-phase continuous pressure triggers
- `src/state/displacement_takeover.ts` — 4-week timer + camp maturation
- `src/state/displacement_routing_data.ts` — Routing tables by faction/region
- `src/state/displacement_state_utils.ts` — Brigade presence check for routing gate

### Timer System (War-Phase Takeover)
- `TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` — settlement flip → displacement initiation
- `CAMP_REROUTE_DELAY_TURNS = 4` — camp creation → population routed to receiving municipality
- Total: **8 turns** from settlement flip to displaced population visible at destination
- Stored in `state.hostile_takeover_timers` keyed by MunicipalityId

### Kill and Flight Fractions
| Scenario | Killed | Flee Abroad | Internal Camp |
|---|---|---|---|
| RS displaced (Serb) | 10% | 30% | 60% |
| HRHB displaced (Croat) | 10% | 25% | 65% |
| RBiH displaced (Bosniak) | 10% | 0% (no external state) | 90% |
| Posavina Croats (regional override) | 10% | 70% | 20% |
| **Enclave overrun** (RS takes RBiH enclave) | **35%** | — | 65% |
| No 1991 census available | 20% lost | — | 15% displaced per flip |

### Camp Routing (Motherland Preference)
- **RBiH displaced**: Tuzla → Zenica → Travnik → Goražde → Srebrenica → Sarajevo → Bihać
- **HRHB displaced**: Mostar → Livno → Gradačac → Brčko → Orašje
- **RS displaced**: Pale/Sokolac/Han Pijesak (if Sarajevo area) → Banja Luka → Bijeljina → Doboj

**Routing gate:** Displaced can only route to municipalities where the **receiving faction has a brigade present**. If no brigade: population stays in camp awaiting future brigade deployment. This is critical for enclave supply simulation.

### War-Phase Continuous Pressure Triggers
- Unsupplied 3+ consecutive turns: 5% per turn
- Encirclement (no friendly adjacency path): 10% per turn
- 2+ concurrent front breaches: 3% per turn
- Max per turn: 5% remaining population (PHASE_F_MAX_DELTA_PER_TURN)

### Calibration Context
- n254: ~43k routed + ~5.7k fled + ~5.7k killed for war-phase displacement only
- Early-war displacement (historical: ~1M+ by Jan 1993) is baked into `init_control` snapshot
- Minority flight disabled (`enable_rbih_hrhb_dynamics: false`)
- **The engine is correct**. The discrepancy vs historical 1M+ is by design — early-war chaos is not re-simulated.

---

## Engine Combat Mechanics Reference

### Existing "Last Stand" Logic (`attack_resolution_osid.ts` lines 610–629)
```
if (retreatDests.length === 0) {
  defenderPower ×= 1.5        // defender fights harder
  lastStandCasMult = 2        // BOTH sides take double casualties
}
```
Triggers only when defender has **zero valid retreat destinations** (complete encirclement).

### Casualty Rate Constants
- `BASE_ATTACKER_LOSS_RATE = 0.04` (4% of attacker personnel per engagement; was 0.03→0.045→0.04, Phase A n343 + n159 audit)
- `BASE_DEFENDER_LOSS_RATE = 0.028` (2.8%; was 0.015→0.02→0.028, Phase A n343 + n159 audit). Att:def ratio target 2.5-3:1.
- `KIA_FRACTION = 0.30` (30% of casualties are killed; 55% wounded; 15% MIA; was 0.25/0.60, Phase A n343)
- **Morale retreat resistance**: per-faction via `getMoraleResistFloor()`: RBiH=55, RS=70, HRHB=65 (was flat 70)
- **Frontline attrition**: 0.5%/week passive loss for front-assigned brigades (`frontline_attrition.ts`). **Entrenchment reduction**: `mult = max(0.40, 1.0 - sqrt(turns) * 0.10)` applied to both base attrition and bombardment exposure. At 6 turns: 24.5% reduction. At 52 turns: 60% reduction (floor). Matches combat_math.ts sqrt diminishing returns model.
- Outcome multipliers: decisive\_victory → attacker 1.0×/defender 2.5×; stalemate → 1.0×/0.8×; repulsed → 2.0×/0.5×

### Cohesion Mechanics
- Cohesion is a **direct multiplier** on combat power (`coh/100` × other factors)
- `RBiH cohesion floor`: rises from 35 (week 0) → 62 (week 52) — enforcing professionalization
- `RS cohesion ceiling`: falls from 85 (week 0) → 68 (week 52) — enforcing decay
- `surrenderCascade`: cohesion < 10 AND powerRatio > 2.5 → forced decisive victory, defender eliminated in place

### Local Front Density Modifier (n295+)
```
density = assigned_brigades / coverage_length (edge count)
density < 0.5  →  penalty: 0.6× to 1.0× (linear interpolation)
0.5 ≤ density ≤ 1.0  →  normal: 1.0×
density > 1.0  →  bonus: 1.0× to 1.25× (linear, capped at 2× threshold)
```
Applied to both `computeDefenderPower` and `computeZocDefenderPower`.
Derived each turn in `compute-local-fronts` pipeline step (`local_front_defense.ts`).

### Per-Brigade Defense Terrain Bonus (n295+)
```
defenderPower ×= (1 + formation.defense_terrain_bonus)
```
OOB field. Applied in direct defense AND ZoC projection. Synced between resolver + predictor.
Current assignments: 255th Slavna (+0.30), 246th Vitezka (+0.25), 328th/351st Mountain (+0.20).
Stacks multiplicatively with honor (slavna 1.10×, viteska 1.20×).

### What Does NOT Exist
- No "desperation" parameter (encirclement does not boost morale)
- No "homeland defense" multiplier (home municipality not weighted)
- No retreat reluctance (defenders always retreat if a friendly OSID is adjacent)
- Entrenchment increases defender **power** but does not reduce **casualty rates**
- No background attrition (artillery bombardment between formal combats)

---

## Root Cause Analysis (n254 Gaps)

### Gap 1: Enclave Brigades Attack Outward [DRINA 62.5%]
- **Symptom:** ~36 OSIDs wrong — Srebrenica 5 brigades + Goražde 7 brigades push into RS territory
- **Root cause:** Enclave brigades are given same equipment and supply as regular ARBiH brigades. No material constraint prevents them from scoring attacks as worthwhile.
- **Historical reality:**
  - Srebrenica: Naser Orić's "raids" were desperate food-foraging into surrounding villages, not coordinated offensive operations
  - Goražde/Žepa: Pure survival. No ammunition reserves. UNPROFOR presence.
  - These brigades had **no tanks, no artillery, no supply lines**
- **Wrong fix:** `avoided_osids` — proven to redirect attacks to other RS targets (n255: RS dropped 422→406)
- **Correct fix:** Material deprivation — enclave brigade compositions with zero heavy weapons; enclave supply status = CRITICAL by definition
- **Engine leverage:** RBiH CRITICAL supply penalty = -300 per attack score. If enclave brigades are always marked CRITICAL supply, attacks score negative and they stop.

### Gap 2: RS Attacks HRHB Territory [HRHB territory −6 OSIDs; Central Bosnia wrong]
- **Symptom:** RS holds Kupres, Orasje (HRHB pocket), some Bugojno/Konjic/Herzegovina OSIDs
- **Root cause:** RS brigades are not covering their actual priority areas (Drina, Central Corridor) densely enough. Attack scoring finds HRHB-adjacent OSIDs as convenient targets.
- **Historical reality:** VRS Herzegovina Corps was DEFENSIVE. VRS had no reason to attack HVO territory in 1992 — they weren't at war.
- **Correct fix 1:** Large scoring penalty for RS attacking HRHB-controlled OSIDs outside Posavina (~-400)
- **Correct fix 2:** Remaining OOB home municipality corrections — more RS brigades in Drina Corps AOR

### Gap 3: Central Corridor — RS Overruns ARBiH Territory [CORRIDOR 77.7%]
- **Symptom:** ~13 extra RS OSIDs in Tešanj, Zavidovići, Kakanj, Maglaj
- **Root cause:** ARBiH 3rd Corps brigades (Zenica, ~15–20k men) not defending organically. Current weight=80 insufficient vs RS 1st Krajina pressure.
- **Historical reality:** 3rd Corps held a continuous corridor through Tešanj-Maglaj-Zavidovići-Žepče throughout 1992–1993. This was their core defensive mission.
- **Correct fix:** Increase 3rd Corps "Central Corridor Counter" weight (80→110–120) AND/OR ensure 3rd Corps brigades spawn in corridor municipalities (OOB home_mun review)

### Gap 4: ARBiH Attacks Too Much (87 orders over 40 weeks)
- **Symptom:** RBiH issues 87 attack orders. Even this is too many for an arm-embargoed army defending from siege.
- **Root cause:** `general_defensive` stance still allocates attack shares. Most attacks likely from enclave brigades or 2nd Corps opportunism.
- **Historical reality:** ARBiH was almost entirely defensive in 1992. No ammunition for offense. Defending urban centers.
- **Correct fix:** Enclave brigades: attack_share = 0.0 (when supply=CRITICAL, attack_score will anyway be negative). Global ARBiH attack_share reduction for early war period.

### Gap 5: Casualty Distribution Wrong — ARBiH Absorbs Too Few Casualties
- **Symptom:** Total n254 casualties: ~27k (attacker+defender combined). At KIA_FRACTION=0.25 → ~6.75k KIA. Historical target at w40: ~20–23k KIA total. Deficit: ~3×.
- **Deeper symptom:** Defender casualties (~3.1k) are minimal. ARBiH historically had MORE total KIA than VRS (30k vs 24k over full war) despite being predominantly defenders. In the game, ARBiH defenders barely bleed.
- **Historical reality (BB evidence):**
  - 5th Corps fought "harder and more grimly" as pushed back — inverse of normal morale collapse (BB2 p556)
  - Srebrenica engagements: VRS lost 30 KIA + 100 wounded in ONE action (BB2 p405) — defenders also bled heavily
  - HV 81st Guards (400–500 elite) took 40 casualties to dislodge 120 VRS defenders at Previle Pass (BB1 p456)
  - "Bitterly contested" Donji Vakuf — some of the hardest-fought ground of the entire war (BB2 p484)
  - ARBiH fighters used "iron pipes filled with nails" and still fought hard (BB2 p416)
- **Root cause:** Defenders who CAN retreat DO retreat, taking minimal casualties. The engine models this correctly for conventional defense, but ARBiH defenders often chose NOT to retreat because retreat = abandoning civilians/families, and there was nowhere safe to go. The "no retreat option" → higher absorption — this is only partially modeled (lastStand at complete encirclement). Between encirclement and free defense lies the "homeland defense" zone that the engine does not capture.
- **Correct fix:** "Homeland Determination" mechanic — when a brigade defends its home municipality or an enclave, apply a power multiplier (+20–30%) and casualty multiplier (×1.3–1.5) that shifts outcomes toward stalemate/costly while raising total casualties on both sides.

### Gap 6: VRS Troop Count 116k vs 100k Target
- **Symptom:** VRS spawns ~116k personnel; target is ~100k (historically ~90–100k by December 1992)
- **Root cause:** `FACTION_POOL_SCALE` RS=0.35 generates excess recruits
- **Correct fix:** Lower to RS=0.30 (estimated result: ~97–100k)

---

## Lessons Learned

### L1 — OOB home municipalities matter enormously
**Session:** 2026-02-28 (n253→n254)
Brigade spawn location (home_mun) determines initial placement. Correcting 4 brigades
(107th Gradačac, 108th Brčko, 115th Zrinski, VRS 2nd Sarajevo) moved RS from 392 to 422
— a +30 OSID swing for 4 OOB fixes. Brigade spawn is the highest-leverage calibration knob.
**Do instead:** Before any AI tuning, audit all brigade home municipalities against OOB master docs.

### L2 — avoided_osids is a crutch, not a fix
**Session:** 2026-02-28 (n254→n255)
Adding avoided_osids for 36 RBiH Drina OSIDs caused RS to DROP from 422 to 406.
Blocking RBiH from attacking Drina redirected their attack slots to OTHER RS targets.
Net effect: worse. The correct fix changes the AI's incentive structure materially.
**Exception:** Single specific historical anchors (e.g., op:zavidovici:vozuca_2) are
acceptable when there is a clear historiographic reason and no better structural fix.

### L3 — Co-ethnic scoring (-80..+80) alone is insufficient
**Session:** 2026-02-28
RS still attacks HRHB-held OSIDs despite penalty. -80 does not overcome strategic
scoring bonuses. Need explicit RS-HRHB scoring penalty (~-400 outside Posavina):
"VRS would not spend Serb blood for Croatian land unless strategically compelled."

### L4 — Enclave brigades need material deprivation, not behavioral blocks
**Session:** 2026-02-28 (REVISED from initial behavioral fix proposal)
Srebrenica/Goražde/Žepa enclave brigades attack outward. The fix is NOT behavioral
(avoided_osids, attack_share=0 in strategy) but MATERIAL:
- Enclave brigade OOB composition: infantry=1000, tanks=0, art=0, aa=0
- Enclave supply status: always CRITICAL (besieged = no supply)
- CRITICAL supply penalty (-300 for RBiH) makes attack scoring negative → organically stops attacks
**Do instead:** Fix the material conditions. Behavior follows from conditions.

### L5 — normalizeScenario is a whitelist — new fields must be explicitly added
**Session:** 2026-02-28
`scenario_loader.ts:normalizeScenario()` explicitly extracts each known field. Any new
field MUST be added in both return objects. Otherwise silently dropped (same hash).
This burned 2 runs (n252 same as n246).

### L6 — Scenario hash depends on scenario JSON, not OOB data
**Session:** 2026-02-28
Changing `oob_brigades.json` does not change the scenario hash. Always check run folder
name (hash) AND actual territory counts. Same hash ≠ same results if OOB changed.

### L7 — Central Corridor: RS pushes too deep
**Session:** 2026-02-28 (n254 analysis)
RS holds ~13 extra OSIDs in Tešanj/Zavidovići/Kakanj that should be RBiH.
ARBiH 3rd Corps Counter (weight=80) not sufficient. Historical: 3rd Corps held
continuous corridor Tešanj-Maglaj-Zavidovići-Žepče throughout 1992–1993.

### L8 — Sarajevo OSID distribution: count correct, positions wrong
**Session:** 2026-02-28 (n254)
Sarajevo faction counts perfect (RS=21/21, RBiH=10/10). But specific OSIDs wrong —
Trnovo extra RS, Ilidža/Vogošća RS deficit. Positional issue, not quantity. Harder to fix.

### L9 — Early-war bypassed: init_control is a snapshot
**Session:** 2026-02-28
The canonical 40w scenario starts in war phase with init_control: "apr1992". April chaos
is not simulated. Casualties and displacement in run summaries do NOT include the early-war period.
This is deliberate — calibrating early-war is harder than starting from known snapshot.

### L10 — "Last stand" mechanic exists but triggers too rarely
**Session:** 2026-02-28 (engine research)
The engine has `lastStandCasMult=2` and defender power ×1.5 when `retreatDests.length === 0`
(complete encirclement). This is correct but only fires in extreme geographic isolation.
Historically, defenders fought like cornered soldiers even when technically adjacent to
one more friendly OSID — because that OSID was just the next position in the last stand.
**Do instead:** Extend the determination mechanic to "homeland defense" (not just encirclement).

### L11 — RS attacking HRHB = RS too weak in priority areas, not too aggressive
**Session:** 2026-02-28 (user correction)
If RS attacks HRHB territory (Herzegovina, Bugojno, Kupres), the diagnosis is NOT
"RS is over-aggressive" but "RS doesn't have enough brigades covering its actual
priorities (Drina valley, Central Corridor, Posavina)." Fix RS brigade positioning first;
then add co-ethnic RS-HRHB penalty to prevent residual attacks.

### L12 — ARBiH was almost entirely defensive in 1992
**Session:** 2026-02-28 (user directive + OOB research)
87 ARBiH attack orders in 40 weeks is already too many. Historical: ARBiH had no
ammunition reserves, no heavy weapons, no logistics. Defending Sarajevo, Tuzla, Zenica,
Bihać. Any attack capability is emergent from 2nd Corps (Tuzla) only. Enclave brigades
(Srebrenica, Goražde, Žepa) had ZERO offensive capability.

### L13 — Homeland defense = last stand psychology even without encirclement
**Session:** 2026-02-28 (BB2 research)
BB2 p556: 5th Corps fighters fought "harder and more grimly" as pushed toward original positions.
BB2 p484: 7th Corps (Donji Vakuf displaced men) were "coldly determined to return to their homes."
Abdić insight (BB2 p538): kept civilians in Pecigrad because defenders lose willingness if
civilians evacuate — population proximity IS the willingness mechanic.
This pattern does NOT require complete encirclement to activate. Brigades fighting in their
home municipality or in an enclave fight with elevated determination organically.
**Engine implication:** `home_mun === defending_mun` is the data hook. No new fields needed.
The OOB already encodes home municipality. Use it as the determination trigger.

### L14 — Defender casualties are structurally too low
**Session:** 2026-02-28
n254: defender total ~3.1k for 40 weeks. Historical ARBiH KIA alone: ~11.5k by week 40.
Gap of ~10k. Root: defenders retreat when adjacent friendly exists (taking minimal casualties).
ARBiH historically did NOT retreat like conventional armies — they absorbed casualties.
Fix: Homeland determination mechanic must RAISE defender casualty rate in home/enclave
positions even when they succeed in holding. A stalemate in their home municipality should
bleed the defender at 0.8× rate (current) × 1.35 (homeland mult) = 1.08× — meaningful.

### L15 — Morale is separate from cohesion; population affinity drives retreat resistance
**Session:** 2026-02-28 (user directive)
Cohesion = tactical effectiveness (how organized/trained a unit is).
Morale = willingness to fight and resist (how much a unit WANTS to hold).
These are distinct. A badly organized militia defending its home village has LOW cohesion but HIGH morale.
A professional unit fighting for territory it doesn't care about has HIGH cohesion but LOW morale.
Currently the engine conflates both into cohesion. Morale needs to be a separate field.

**Population affinity as the data hook (NOT home_mun):**
The retreat/determination decision should be based on the 1991 CENSUS POPULATION of the OSID
being defended — not the brigade's home_mun (which is a coarser proxy).
- OSID with 80% Bosniak population → ARBiH defenders EXTREMELY reluctant to retreat
- OSID with 80% Serb population → ARBiH defenders more likely to yield (fighting for enemy land)
- OSID with mixed population → intermediate determination
This data already exists in the engine (1991 census drives displacement calculations).
Population affinity = fraction of OSID population sharing ethnicity with the defending faction.
**Effect:** High-affinity defense → morale bonus → retreat requires worse outcome → casualties absorbed instead of territory yielded.

### L16 — Both attacker and defender bleed more in homeland defense engagements
**Session:** 2026-02-28 (BB1/BB2 evidence)
BB1 p456: 40 attacker casualties to dislodge 120 mountain defenders. BB2 p405: 130 VRS
casualties in one Srebrenica action. The pattern: determined defense costs BOTH sides dearly.
The engine's lastStand mechanic (×2 casualties both sides) captures this at encirclement.
Homeland determination should extend this (×1.35 casualty mult) to home-municipality defense.
Net effect: more total casualties in contested areas, VRS bleed higher when hitting
determined ARBiH positions, ARBiH defender casualties rise toward historical.

### L17 — Command hierarchy is already correct — brigades don't freelance
**Session:** 2026-02-28 (BB research + engine research)
BB1 p417, BB2 p540: All VRS operations were corps-directed or Main Staff-coordinated.
BB2 p401, p506: ARBiH organized under Corps → Operational Groups → Brigades.
The engine's three-tier bot AI (Army → Corps → Brigade) matches history.
CorpsDirective generates offensive_targets; brigades execute from the list.
**Exception:** Enclave brigades (Srebrenica, Goražde) were de facto autonomous due to
isolation, but formally under 1st Corps / 28th Division / 81st Division.

### L18 — Rear-area cleanup was a distinct early-war phase for all sides
**Session:** 2026-02-28 (BB research)
VRS systematically secured Serb-majority areas by eliminating hostile populations (Prijedor,
Sanski Most, Kotor Varoš, Ključ, Zvornik). Used paramilitaries + police + regular forces.
Corps-directed, Main Staff-coordinated. (BB1 PATTERN_REPORT, BB1 pp496-501)
ARBiH also cleaned isolated settlements (Bilješevo, Čardak — user-confirmed, not in BB KB).
This is a phase-specific priority: weeks 0-10, corps directives should include "cleanup"
targets — undefended hostile-population OSIDs behind the front line.
**Data hook:** Population composition (1991 census). High hostile population + undefended =
high cleanup priority. Not faction-coded — emerges from population data.

### L19 — ZoC-locked frontlines need defense extension
**Session:** 2026-02-28 (engine research)
Current linked ZoC blocks enemy MOVEMENT but provides NO DEFENSE. An unoccupied OSID in a
ZoC chain has no defender if attacked — easy victory. Historically a brigade covers its
entire sector, not just the settlement it sits in. Patrols, outposts, firing positions span
the whole zone.
**Fix:** ZoC-locked brigades should defend adjacent OSIDs in their linked ZoC chain at 100%
readiness. When an attacker targets an empty ZoC'd OSID, the nearest locked brigade in the
chain provides the defense. This simulates continuous frontline defense.
**Implication:** Fewer "free" OSID captures. More combat, more casualties. Front stabilizes
faster. This is probably the single biggest behavior fix for realistic front lines.

### L20 — Cut-off brigades need breakthrough/escape mechanic
**Session:** 2026-02-28 (BB research)
Current engine: cut-off = last stand → win or die (personnel=0, inactive). No escape.
Historical: HVO brigades from Derventa/Modriča retreated to Orašje through hostile territory.
Orasje Corps originally had 6 brigades (101st-106th, BB1 p437-438). After "heavy combat
losses in 1992 and early 1993" they consolidated at Orašje (3,000 dead + 10,000 WIA total
war, BB1 p462).
**Fix:** Cut-off brigades should attempt breakthrough toward nearest friendly territory.
High-casualty movement through hostile OSIDs. Not guaranteed — may fail and be destroyed.
But better than instant annihilation.

### L21 — Player-proofing: model conditions, never assumptions
**Session:** 2026-02-28 (user directive)
"A real player will take a bot side at some point and we don't want HVO breaking from Livno
to Banja Luka just because RS bot 'knows' HRHB won't attack."
HRHB didn't attack RS because: (A) no offensive power — light infantry, no tanks, limited
artillery → low attack scores vs entrenched VRS. (B) no strategic incentive — war aims don't
include RS territory. Both must be modeled through CONDITIONS:
- (A) HVO equipment composition: historically accurate → material limit on offensive capability
- (B) HVO army priorities: no targets in RS territory → bot doesn't generate offensive orders
If a player takes HRHB: they ALSO can't attack RS because equipment composition makes it
impossible to overcome VRS entrenchment. Not because of a bot rule.
RS bot defensive posture should be based on threat assessment (power ratios, brigade counts),
not on faction-specific "HRHB won't attack" assumptions.

### L22 — Displacement system is complete and deterministic
**Session:** 2026-02-28 (research finding)
The engine has a full displacement system: 4-turn takeover timer + 4-turn camp maturation,
kill fractions by ethnicity (10% normal, 35% enclave overrun), flee-abroad fractions
(RS=30%, HRHB=25%, RBiH=0%, Posavina Croats=70%), and brigade-gated routing.
The n254 displacement numbers are not wrong — they reflect war-phase only.
Early-war (~1M+ historical) is captured in the init_control snapshot, not re-simulated.

### L26 — Enclave morale drift nullifies initial_morale reduction
**Session:** 2026-03-01 (n275 analysis)
Enclave brigades get +2/turn (affinity: Bosniak majority) + +3/turn (encirclement + own pop)
= **+5 morale/turn**. Starting at morale 55 → reaches 70 (resist floor) in 3 turns.
P2 (morale 70→55) was effectively nullified. Drina match rate went from 68.8% to 65.6% (WORSE).
**Do instead:** Don't rely on initial_morale alone. Must either cap morale drift for supply-CRITICAL
brigades, or mark enclave supply as permanently CRITICAL and add supply drain on morale.

### L27 — FACTION_POOL_SCALE affects init pools, not ongoing recruitment
**Session:** 2026-03-01 (n275 analysis)
RS pool scale 0.28→0.25 reduced init militia pools but VRS end strength went UP (115k→117k).
Ongoing troop growth is driven by `recruitment_capital_trickle` (5/turn) and `max_recruits_per_faction_per_turn`
(4 brigades/turn) in the scenario JSON, not by FACTION_POOL_SCALE.
**Do instead:** To reduce VRS end strength, lower RS `recruitment_capital_trickle` and/or `recruitment_capital`
in the scenario JSON. Pool scale is a minor lever.

### L28 — Morale absorption casualty multiplier needs sufficient absorption events
**Session:** 2026-03-01 (n275 analysis)
P5b (MORALE_ABSORPTION_CAS_MULT = 1.35) implemented but total KIA dropped from 6,082 to 5,587.
Root cause: fewer morale absorptions (enclave morale started at 55 → fewer absorptions) offset the
per-event multiplier. The casualty mult is correct design but needs a steady population of
high-morale defenders to have significant aggregate effect.
**Do instead:** Fix the enclave overexpansion first (so more regular ARBiH vs VRS engagements
occur with morale ≥ 70), then the casualty mult will have its intended effect.

### L24 — Bugojno is 3rd Corps (Zenica), not 4th Corps (Mostar)
**Session:** 2026-03-01 (user correction)
Bugojno-Konjic Defense army priority was assigned to `arbih_4th_corps` (Mostar/Neretva).
Historically, Bugojno is in the 3rd Corps (Zenica) area of responsibility. 4th Corps
covers Neretva valley only (Jablanica, Konjic, Mostar). Fixed in `bot_strategy.ts`:
`corps_id: 'arbih_4th_corps'` → `'arbih_3rd_corps'` for Bugojno-Konjic Defense.
**Do instead:** Always cross-check army priority corps assignments against OOB tables above.

### L25 — Displacement continuous pressure pathway uses wrong routing
**Session:** 2026-03-01 (user correction)
`src/state/displacement.ts` (continuous pressure) routes displaced via **supply reachability**
— which fails for besieged factions. `displacement_routing_data.ts` has correct static
routing tables (47 sub-regions × 3 ethnicities, Phase M4). The continuous pressure pathway
must be connected to these tables. Supply has nothing to do with refugee routing — people
flee on foot along roads. Prijedor Bosniaks → Travnik/Jajce/Zenica/Bihac (not Tuzla).
**Do instead:** All displacement pathways must use the same routing tables.

### L29 — DO NOT add Srebrenica/Gorazde to Drina Sweep targets
**Session:** 2026-03-01 (n280 analysis — 81.9% match, reverted)
Adding Srebrenica and Gorazde to the RS Drina Sweep target_municipalities DILUTED Drina Corps
attacks. With only 2 attack slots per turn, the weight-160 priority sent attacks toward heavily
fortified enclave concentrations (7 brigades at Gorazde, 5 at Srebrenica) where they FAIL,
instead of targeting weaker Bratunac/Visegrad/Cajnice where they succeed.
Drina match rate COLLAPSED from 73.4% to 67.2%.
**Rule:** Never add fortified positions to sweep priorities. Sweeps should target lightly
defended or undefended areas. Enclaves are containment targets, not sweep targets.

### L30 — DO NOT reduce enclave personnel below 900/1100
**Session:** 2026-03-01 (n281 analysis — 81.8% match, reverted)
Reducing Gorazde 1100→700 and Srebrenica 900→600 paradoxically made Drina WORSE (65.6%
vs 73.4%). The cascade: weaker enclave brigades change battle outcomes and force
redistribution patterns throughout the Drina valley. RS ends up with FEWER Drina OSIDs (73
vs 81). The exact mechanism is unclear but reproducible.
**Rule:** Enclave personnel levels (1100 Gorazde, 900 Srebrenica, 600 Zepa) are calibrated.
Do not change without understanding the cascade effects.

### L31 — Reducing RS attack share globally hurts all regions
**Session:** 2026-03-01 (n280 analysis)
RS w0-20 attack share 0.28→0.22 reduces 1KK attacks from 7 to 5 per turn BUT also reduces
Drina/EBK/SRK attacks proportionally. Net effect: RS loses territory everywhere, not just
Central Corridor. Overall match rate dropped. The Central Corridor overruns come from
OPPORTUNISTIC targets (all front-line enemy OSIDs during general_offensive), not from
priority-based targeting. Reducing share doesn't selectively reduce opportunistic targets.
**Do instead:** Need per-corps attack budget or corps-level avoid mechanisms.

### L32 — OOB tags must be propagated through ALL formation creation paths
**Session:** 2026-03-01 (n277-n279 investigation)
Tags added to `oob_brigades.json` were silently dropped because:
1. `OobBrigade` interface had no `tags` field → loader ignored them
2. `oob_phase_i_entry.ts` builds tags from scratch (`mun:`, `corps:` only)
3. `recruitment_engine.ts` also builds tags from scratch (adds `equip:`)
In `player_choice` mode, brigades go through `recruitment_engine.ts` (which adds `equip:` tag),
not `oob_phase_i_entry.ts`. Fixed all three: loader, phase_i_entry, and recruitment_engine.
**Rule:** Any new OOB field must be propagated through ALL formation creation paths.
The `equip:` tag on the formation reveals which path created it.

### L33 — Opportunistic target municipality filter is the correct P3 fix
**Session:** 2026-03-01 (n283-n284)
A blunt count-based corps target cap (`max(5, floor(0.75 × subordinates))`) starved small corps with
legitimate sweep missions (Drina Corps: 10 brigades, capped from 30→7 targets). n283 dropped to 82.7%.
The correct approach: filter opportunistic targets (undefended_front, weak_enemy_osids) to only include
OSIDs in municipalities that appear in the corps's active army priorities. This preserves:
- All priority targets from `findTargetOsidsFromMunicipalities` (unlimited)
- Rear-area cleanup targets (no municipality filter)
- Named operation targets (no municipality filter)
- Pocket targets (always attack surrounded enemies)
While preventing corps from sprawling into non-priority municipalities. n284: 85.1% (641/753).
**Rule:** Corps opportunistic targets must be filtered by priority municipalities, not count-capped.
**Key result:** 1KK stopped sprawling into tesanj/maglaj/zavidovici (not in any RS priority).

### L34 — Blunt corps target cap HURTS small corps with big AoR
**Session:** 2026-03-01 (n283)
`max(5, floor(0.75 × subordinates))` caps Drina Corps (10 brigades) at 7 targets from 30+.
Drina has 12 priority municipalities with many target OSIDs — capping these destroys the Drina Sweep.
83.7% → 82.7% (−7 matches). REVERTED. Use municipality filter instead.

### L35 — Local front density modifier improves defensive calibration
**Session:** 2026-03-01 (n291→n295)
Front density = assigned_brigades / coverage_length (edge count). Below 0.5 density → defense penalty
(down to 0.6×); above 1.0 density → mutual support bonus (up to 1.25×). Applied multiplicatively to
both `computeDefenderPower` and `computeZocDefenderPower` in resolver + predictor.
**Result:** +3 OSIDs (84.7% → 85.1%). Rewards concentrated defense without penalizing it.
Correctly identifies thin RS fronts as vulnerable and concentrated NE positions as strong.
**File:** `src/sim/combat/local_front_defense.ts`. Pipeline step `compute-local-fronts`.
**Rule:** Front density is a DERIVED state (recomputed each turn). Never serialize as ground truth.

### L36 — Per-brigade defense_terrain_bonus captures unit-specific terrain mastery
**Session:** 2026-03-01 (n295)
OOB field `defense_terrain_bonus` → FormationState → `× (1 + bonus)` in defender power.
Distinct from per-OSID terrain (geographic) — this is unit quality: years of fighting in same terrain.
Assigned: 255th Slavna (Teočak, +30%), 246th Vitezka (Šapna, +25%), 328th/351st Mountain (Zavidovići, +20%).
Stacks multiplicatively with honor: 246th Vitezka (1.20× honor × 1.25× terrain = 1.50× total defense).
**Key insight:** honors are offensive + defensive; defense_terrain_bonus is defense-only. This lets
specialized defenders hold without making them better attackers (which they weren't historically).
**Rule:** defense_terrain_bonus must be synced between attack_resolution_osid.ts and combat_predictor.ts.

### L38 — Honor-based DTB effectively protects enclaves/pockets
**Session:** 2026-03-01 (n335)
Auto-derived defense_terrain_bonus from honor designation: slavna +10%, viteska +15%.
Falls back to honor DTB when no explicit OOB defense_terrain_bonus set.
Combined effect: viteska brigades get 1.20× honor + 1.15× DTB = 1.38× total defense.
**Key outcome:** Bihać pocket (5th Corps, multiple viteska brigades) now **survives**.
Previously falling to RS in n334. Historically accurate — these units earned honors through defense.
**Rule:** Explicit OOB defense_terrain_bonus overrides honor DTB (not additive).

### L39 — Brčko initial control override insufficient alone
**Session:** 2026-03-01 (n335)
Setting `op:brcko:brcko` and `op:brcko:krepsic` to RS at init doesn't prevent RBiH recapture.
East Bosnian Corps Operacija Koridor has 1-OSID objective (`op:modrica:garevac_2`), too narrow.
**Fix needed:** Expand Koridor targets to include Brčko-area OSIDs, or increase EBC force commitment.

### L40 — OSID-based operations improve targeting precision but may reduce opportunism
**Session:** 2026-03-01 (n335)
Municipality-scanned targets produced operations attacking wrong priorities.
OSID-specific targets ensure each operation pushes exactly where intended.
Overall match: 87.6% vs 87.4% (n314) — marginal. But Drina +10.2pp and Sarajevo +9.7pp.
Posavina NE dropped to 72.5% — tighter targeting misses some opportunistic captures.
**Rule:** OSID targets are correct approach; expand per-operation target lists rather than reverting to mun scan.

### L41 — Planning phase creates correct 1-turn execution delay
**Session:** 2026-03-01 (n335)
Operations inject at turn 0 in `planning` phase, execute at turn 1.
Historically more accurate — JNA plans existed but needed coordination.
Staging_osid during planning phase ensures brigades concentrate before attacking.
**Rule:** Do NOT revert to turn-0 execution. The 1-turn delay is intentional.

### L42 — Supply readiness gate must respect supply_reserves_enabled
**Session:** 2026-03-02 (n359)
`computeSupplyReadiness()` in `sector_offensive.ts` read OSID supply reachability data even when
`supply_reserves_enabled=false`. The `deriveSupplyStateByOsid()` pipeline step runs unconditionally,
producing reachability data that flagged forward VRS positions as 0% adequate supply at game start.
This silently aborted ALL 5 pre-planned VRS operations on turn 1 (`supply_readiness=0.00 < SUPPLY_READINESS_ABORT=0.4`).
**Fix:** Early return `1.0` when `!state.meta?.supply_reserves_enabled`.
**Rule:** Any function gated by supply data must check `supply_reserves_enabled` before using reachability/reserve values.

### L43 — Each operation type needs exactly one lifecycle manager
**Session:** 2026-03-02 (n359)
`evaluateOperationProgress()` in `bot_corps_ai.ts` handled ALL operations including `sector_attack`,
using global `PLANNING_DURATION=2` instead of the op's own `planning_duration`. Meanwhile
`advanceSectorOffensives()` in `sector_offensive.ts` is the dedicated sector_attack handler with
per-op duration. Both managing planning→execution transitions caused race conditions and wrong timing.
**Fix:** `if (op.type === 'sector_attack') continue;` in `evaluateOperationProgress()`.
**Rule:** Operation type handlers must be exclusive — one handler per type, no overlap.

### L23 — Orasje pocket: 3 HVO brigades stay, Derventa/Modrica brigades fall back
**Session:** 2026-03-01 (user directive)
3 HVO brigades currently under ARBiH 2nd Corps coordination are supposed to REMAIN in
the Orasje pocket throughout the war. These are the Posavina NW OZ garrison.
Separately, HVO brigades from Derventa, Modrica, and other Posavina municipalities that
RS captures in weeks 1–8 must fall back to Orasje (not be destroyed in place).
Historical: HVO Orasje Corps originally had 6 brigades (101st–106th, BB1 p437–438) —
the 3 garrison brigades plus retreating Derventa/Modrica units that consolidated there.
After heavy combat losses in 1992–early 1993, they consolidated at ~3,000 dead + 10,000
WIA total war (BB1 p462).
**Two fixes needed:**
1. **OOB:** Assign 3 brigades to `hvo_northwest_bosnia` (currently 0) with home_mun in
   Orasje area. These must NOT be reassignable.
2. **Breakthrough retreat:** When RS captures Derventa/Modrica, HVO brigades there must
   attempt high-casualty retreat toward Orasje instead of being destroyed.
   This is the primary historical test case for the N8 breakthrough mechanic.
**Do instead:** Fix the OOB (3 brigades at Orasje) FIRST — this alone may fix the
Orasje gap. Breakthrough retreat is the second layer for Derventa/Modrica fallback.

### L44 — Municipality-locked pools create topology mismatch — strategic reserve solves it
**Session:** 2026-03-06 (n181→n191)
Raising mobilization surge factors by 30-50% only changed RS w80 by +907 (from 85,984
to 86,891). Root cause: the extra mobilization goes into rear surplus pool (75k+
available in municipalities whose brigades are at max 3,000 cap), not into front brigades
whose pools are empty. The problem is topological, not parametric.
**Do instead:** Strategic reserve system — excess pool.available above OVERFLOW_THRESHOLD
flows to faction reserve; under-strength brigades draw from reserve at faction-specific
rates reflecting historical logistics (RS/HRHB=0.25, RBiH=0.02). Combined with
faction-differentiated mobilization surge curves, this produces historically accurate
multi-checkpoint trajectories from purely organic mechanics.

### L45 — Faction-specific reserve draw rate is critical — uniform rate causes RBiH explosion
**Session:** 2026-03-06 (n184→n186)
First reserve implementation with uniform 0.5× draw rate caused RBiH to explode to 254k
at w80 (target 140-160k). RBiH's massive population generates enormous pool surplus;
uniform draw rate feeds it all to brigades. Fix: faction-specific draw rates — RBiH=0.02
(poor logistics until 1994 professionalization) vs RS/HRHB=0.25 (JNA/Croatian logistics).
**Do instead:** Always differentiate faction logistics capability in reserve draw rates.

**L46: P3 priority municipality filter blocks undefended territory capture**
**Session:** 2026-03-06 (n192)
VRS had brigades sitting idle in Krajina despite adjacent undefended territory because the P3
priority municipality filter in bot_corps_ai.ts filtered opportunistic targets to only
`army_priorities` municipalities. Krajina municipalities (`prijedor`, `banja_luka`, `prnjavor`)
appeared only in `defensive_priorities`, never in offensive priority entries. Fix: bypass P3 for
truly undefended targets (`graphAnalysis.undefended_front` + `weak_enemy_osids` with
`reason === 'undefended'`). Weak-but-defended targets still respect P3 to prevent corps sprawl.
Result: 1KK targets jumped from ~15 to 66 at Turn 1; Krajina match 85.5%.
**Do instead:** Never filter undefended territory through priority municipality gates — taking
empty land costs nothing and all factions historically consolidated undefended areas without
needing explicit orders. Only apply strategic filters to targets requiring actual combat.

---

## Known Gaps (as of n295 — 85.1% match rate, 641/753)

| # | Region | Gap (n295) | Root Cause | Fix | Priority |
|---|---|---|---|---|---|
| 1 | DRINA (71.9%) | RS=77 vs painted=99 (−22). Enclaves hold correctly (Srebrenica/Gorazde/Zepa RBiH PASS), but Bratunac(4), Cajnice(4), Visegrad(5), Rudo(2), Foca(2), Vlasenica(4) still RBiH-held. RS Drina Corps too small to sweep 12 muns in 20w. | Structural: initial control gives RBiH holdouts across Drina valley; RS Drina Corps needs more firepower. **L29: DO NOT add enclaves to Drina Sweep. L30: DO NOT reduce enclave personnel.** | More RS Drina Corps brigades (OOB) OR Drina offensive window extension OR initial control adjustment | **HIGH** |
| 2 | CORRIDOR (90.4%) | RS=44 vs painted=38 (+6). Improved from 87.2% (n284). Maglaj(3), Doboj(3), Visoko(1), Zavidovici(1). Local fronts + defense_terrain_bonus (328th/351st Mountain) helped. | P3 filter + local front density. Remaining overruns: Doboj is correct RS priority; Maglaj structural. | 3rd Corps strengthening or initial control tuning. Much improved. | **MEDIUM** |
| 3 | C. BOSNIA (81.3%) | RS=37 vs painted=42 (−5). Bugojno still 8+ RS overruns. HRHB takes some Jajce/Travnik. Konjic/Kladanj go RBiH (should be RS). | Mixed: Bugojno overrun persists (2KK Krajina Sweep). Konjic/Kladanj/Jajce are initial-control edge cases. HRHB takes Jajce/Prozor/Novi Travnik (alliance dynamics). | RS 2KK avoid Bugojno muns; HRHB-RBiH alliance tuning | **MEDIUM** |
| 4 | POSAVINA (85.3%) | RS=53 vs painted=65 (−12). Zvornik(8 wrong direction), Brcko(4 RBiH instead RS). Improved from 84.4% (n284) — Lopare jablanica fixed by front density. | Zvornik: Sapna/Teocak holdouts structural. Brcko: 1KK targets it but RBiH holds south bank. defense_terrain_bonus on 246th Vitezka (Šapna) + 255th Slavna (Teočak) helps but doesn't fully solve. | Zvornik initial control; Brcko south structural | **MEDIUM** |
| 5 | VRS strength | 122k vs 100k target (+22k) | All RS brigades mandatory, max_personnel too high. n295 VRS slightly higher than n284 (fewer casualties from stronger defense). | OOB: reduce RS brigade count or max_personnel | **MEDIUM** |
| 6 | SARAJEVO (77.4%) | RS=22 vs painted=21 (+1). Trnovo(3 RS overruns), Ilidza(2 should be RS), Pale(1), Vogosca(1). | Trnovo overruns, Ilidza edges. Unchanged from n284. | Sarajevo Corps priority tuning | **LOW** |
| 7 | HERZEGOVINA (90.3%) | Livno(7 RS→HRHB), Duvno(3), Nevesinje(1), Trebinje(1). Regressed from 94.6% (n284). RS taking Livno/Duvno from HRHB. | RS Herzegovina Corps + 2KK targeting Livno area — may be n291→n295 code delta effect on RS early-war expansion. | Check RS Herzegovina target priorities for Livno/Duvno | **MEDIUM** |
| 8 | Anchors | Zvornik (RS→RBiH), Bihac (RBiH→RS), Teocak (RBiH→RS). | Zvornik holdout, Bihac RS sweep, Teocak structural (255th Slavna spawns w26, pocket may fall before then) | Structural | **LOW** |

---

## Next Actions (Structural, Not Artificial)

**Rule:** Every fix must change material conditions, not impose behavioral blocks.

### N0 — Morale + Population Affinity [Gap 5 — Casualty Distribution] ← SUPERSEDED by Mechanic 1
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 1

The original `home_mun` trigger has been replaced by population affinity from 1991 census data.
Morale is now a separate field from cohesion. Key changes from original N0:
- Trigger: census-based population affinity of OSID, not `home_mun`
- Morale gates retreat resistance (high-morale defenders absorb costly_victory without retreating)
- Encirclement of own-population defenders → morale SPIKE (not collapse)
- Morale drift system: +3/turn for high-affinity defense, −2/turn for low-affinity
- Both sides bleed more in high-affinity contests (1.2× defender, 1.8× attacker for absorbed costly_victory)
- Symmetric: works for all factions equally — VRS also fights hard for Serb-majority OSIDs

### N1 — Enclave Brigade Material Deprivation [Gap 1, 5]
Change enclave brigade OOB compositions in `data/source/oob_brigades.json`:
- Srebrenica brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.4
- Goražde brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.45
- Žepa brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.35
And ensure these brigades are always marked CRITICAL supply in their municipality context.
Expected effect: attack scoring goes negative (-300 CRITICAL penalty) → no offensive orders

### N2 — RS-HRHB Co-Ethnic Penalty [Gap 3]
In `bot_brigade_ai_osid.ts`, add scoring penalty for RS attacking HRHB-controlled OSIDs:
- Outside Posavina corridor: -400 score ("VRS won't bleed for Croat land")
- Within Posavina (Orasje/Brcko area): -100 score (some RS-HVO conflict is historical)
Expected effect: RS redirects attacks to RS priority areas (Drina, Corridor)

### N3 — ARBiH 3rd Corps Corridor Weight [Gap 2]
In `bot_strategy.ts`, increase 3rd Corps "Central Corridor Counter" weight: 80 → 120
Consider also adding specific hold_osids for Tešanj, Maglaj, Zavidovići, Žepče in 3rd Corps directive.
Expected effect: RS pushed back to ~77% → 85%+ in Corridor region

### N4 — VRS Troop Count [Gap 4]
In `src/sim/early_war/pool_population.ts`, lower `FACTION_POOL_SCALE` RS: 0.35 → 0.30
Expected result: VRS ~97–100k (currently 116k)

### N5 — Run n256 [Verification]
After implementing N1–N4:
- Drina should improve significantly (enclave brigades stop attacking)
- Central Corridor should improve (3rd Corps holds)
- HRHB territory should improve (RS-HRHB penalty redirects RS)
- VRS troop count should drop to target range
- RBiH attack orders should drop significantly (enclave brigades go quiet)
- Target: >85% overall match rate

### N6 — ZoC Frontline Defense Extension [Gap 6 — Free OSID Captures]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 2
ZoC-locked brigades defend adjacent empty OSIDs at 50% entrenchment, 50% casualty exposure.
Expected: free OSID captures drop from ~188 to <50; more actual combat required.

### N7 — Per-Municipality Displacement Routing [Displacement Correctness]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 8
Replaces generic `FALLBACK_ROUTES_BY_FACTION` with origin-specific routing tables for all
110 municipalities, 8 geographic regions, and 3 displaced ethnicities. Adds OSID-level tracking
of displacement origins and destinations. Design complete — ready for implementation.

### N8 — Cut-Off Brigade Breakthrough + Orasje OOB [HVO Posavina] ← SEE L23
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 4
**Two-part fix (per L23):**
1. **OOB first:** Assign 3 HVO brigades to `hvo_northwest_bosnia` with home_mun in Orasje area.
   These are the garrison that STAYS. This alone may fix the Orasje gap (currently 0 brigades).
2. **Breakthrough retreat second:** HVO brigades from Derventa/Modriča attempt high-casualty
   retreat toward Orasje when RS captures those municipalities. Primary historical test case.
Historical: HVO 101st–106th Brigades (BB1 p437–438). Derventa/Modriča units fell back to
Orašje and consolidated there. 3 brigades under 2nd Corps coordination must stay at Orasje.

### N9 — Rear-Area Cleanup Priority [Early-War Territory]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 3
Census-driven corps directive priority for weeks 0-10: secure hostile-population OSIDs
behind front line. Player-proof (available to all factions equally).

### N10 — Phase Restructuring [Architecture]
Peace Phase → War Phase. No Phase 0/I/II distinction. When war starts, all mechanics active.
`init_control: "apr1992"` is turn 0 of War Phase. Displacement runs from turn 0.

### N11 — Deferred: 52w Validation
After 40w converges to >85%, run 52w to verify front freezes appropriately at w40–52.

---

## Post-n268 Iteration Plan (2026-03-01)

**Status of N0–N11 after Phase M:**
- N0 (Morale + population affinity): **PARTIAL** (Phase M2). Morale field, drift, retreat resistance implemented. **BUT: casualty multiplier NOT implemented.** Morale ≥ 70 prevents retreat on costly_victory, but absorbed engagement does NOT increase casualties for either side. L13–L16 (homeland determination → ×1.35 casualty mult) is documented but missing from `attack_resolution_osid.ts`. This is the primary reason defender casualties are 2,718 total vs ~11,500 historical ARBiH KIA at w40.
- N1 (Enclave material deprivation): **PARTIAL** (Phase M3). Enclave OOB infantry-only + morale 70, but morale 70 = resist floor → they NEVER retreat and counterattack. Needs morale 70→55.
- N3 (3rd Corps corridor weight): **DONE** (Phase M4). Weight 80→120. Still insufficient — RS overruns +16 in corridor.
- N4 (VRS troop count): **PARTIAL**. Pool scale lowered 0.35→0.28. Still 115k vs 100k target. Needs 0.28→0.25.
- N6 (ZoC frontline defense): **DONE** (Phase M2 + n295). Virtual ZoC defense at 50% readiness + Local Fronts density modifier (P6). defense_terrain_bonus for key brigades.
- N7 (Per-municipality displacement routing): **DONE** (Phase M4). 47 sub-regions × 3 ethnicities.
- N8 (Orasje OOB + breakthrough): **NOT STARTED**. See L23.
- N9 (Rear-area cleanup): **DONE** (Phase M4). REAR_CLEANUP_END_WEEK = 12.
- N10 (Phase restructuring): **DONE**. Peace/War lifecycle migration complete. See Phase M refactor-pass report.

### Post-n268 Next Actions (Priority Order)

#### P1 — Continuous displacement under hostile control [Gap 7]
When faction X controls a municipality, non-X population should drain at a configurable
rate per turn (e.g. 5–10% of hostile population per week). This does NOT need settlement
flips — it models ongoing ethnic cleansing as a consequence of territorial control.
Current displacement requires a settlement flip + 4-turn timer. Hundreds of thousands of
Bosniaks in RS-controlled Banja Luka, Prijedor, Bijeljina, Zvornik are never displaced.

**CRITICAL BUG (user-identified, 2026-03-01):** The continuous pressure pathway in
`src/state/displacement.ts` uses **supply reachability** for routing — NOT the static
routing tables in `displacement_routing_data.ts`. Supply reachability fails for besieged
factions (no supply path exists), so 98% of displaced_out → lost_population. The routing
tables already exist (Phase M4, 47 sub-regions × 3 ethnicities) and are correct:
- Prijedor Bosniaks → `KRAJINA_NORTHWEST` → Travnik, Jajce, Zenica, Bihać (NOT Tuzla)
- Supply has **nothing** to do with refugee routing — people flee on foot along roads

**Implementation:** New pipeline step in war turn: for each municipality, if controller ≠
population majority ethnicity, drain `HOSTILE_DRAIN_RATE × hostile_pop` per turn into
displacement routing. Use existing routing tables from `displacement_routing_data.ts`.
Also fix continuous pressure pathway to use same routing tables instead of supply reachability.

#### P2 — Enclave morale 70→55 [Gap 1 — CRITICAL, single biggest territory improvement]
Enclave brigade `initial_morale` in OOB: 70 → 55. Since `MORALE_RESIST_FLOOR = 70`,
this means enclave brigades at morale 55 WILL retreat on costly victories instead of
absorbing them. They stop counterattacking outward because morale < floor means retreat
resistance doesn't activate. Expected improvement: ~24 OSIDs in Drina alone.
**One-line OOB change** for 13 enclave brigades in `data/source/oob_brigades.json`.

#### P3 — Reduce corps target sprawl [Gap 8 — enables concentration]
Corps directives currently pass ALL army priority targets through as offensive_targets.
VRS 1st Krajina: 35 brigades / 35 targets = 1.0 brigades per target — no concentration
is physically possible. Pioneer + concentration mechanics are inert.
**Fix:** Cap directive `offensive_targets` to `floor(assigned_brigades × 0.5)`, selecting
the highest-priority subset. With 35 brigades → 17 targets → ~2 brigades per target.
Corps can rotate targets over time. This naturally creates the concentration the pioneer
mechanic needs to function.

#### P4 — ~~Increase free-capture casualties~~ **RESOLVED — militia already inflicts casualties**
**Correction (2026-03-01):** The earlier "180 attacks with 0 casualties" was WRONG. Even
militia-only defense (`pop × MILITIA_DEFENSE_RATIO × 0.25 = ~37.5 power`) produces a real
battle with a decisive_victory outcome. Attackers take `3% × personnel × 1.0 outcome mod`
= ~45 casualties per 1,500-man brigade. Over 180 militia engagements: ~8,100 casualties
(~2,025 KIA). Virtual militia casualties are NOT tracked (no formation), but attacker
casualties ARE recorded via `recordBattleCasualties()`. **No code change needed.**
The real KIA gap (6,082 vs ~16,000) comes from: (a) P5b — morale absorption doesn't raise
casualties, (b) too few total engagements (312 in 40w), (c) no inter-battle attrition.

#### P5 — RS FACTION_POOL_SCALE 0.28→0.25 [Gap 5]
Brings VRS from 115k toward 100k target. Simple constant change in `pool_population.ts`.

#### P5b — Homeland determination casualty multiplier [Gap 6 — KIA too low]
N0 morale retreat resistance is implemented (Phase M2), but the **casualty multiplier** from
L13–L16 is NOT. When a brigade absorbs a costly_victory due to morale ≥ resist floor,
casualties should increase for both sides (attacker ×1.8, defender ×1.2 per L16 design).
Currently: morale check prevents retreat, but `computeCasualties()` runs BEFORE the morale
check — casualties are identical whether the defender retreats or absorbs.
**Fix:** In `attack_resolution_osid.ts`, when morale resistance triggers (outcome = costly_victory
AND morale ≥ MORALE_RESIST_FLOOR AND defender stays), apply post-hoc casualty multiplier:
defender ×1.35, attacker ×1.35 (both sides bleed more in determined defense per BB evidence).
This is the primary lever for closing the KIA gap (6,082 → ~16,000 target).

#### P6 — Front segment assignment (replaces ZoC as defensive model) [Structural] — **DONE (n295)**
~~Current linked ZoC provides only 35% defense power to adjacent OSIDs.~~

**Implemented as Local Fronts mechanic (n295, 2026-03-01):**
- `local_front_defense.ts`: builds `LocalFront` from `assignable_front_segments` + `brigade_front_assignment`
- Coverage density = assigned_brigades / edge_count → defense multiplier (0.6× to 1.25×)
- Applied to both direct defense and ZoC projection in resolver + predictor
- Pipeline step `compute-local-fronts` after `ensure-brigade-front-assignment`
- Derived state (recomputed each turn per Engine Invariants §13)
- **Result:** +3 OSIDs (84.7% → 85.1%). Thin RS fronts weaker, concentrated positions stronger.
- **Complement:** `defense_terrain_bonus` OOB field for historically fortified brigades (255th Slavna +30%, 246th Vitezka +25%, 328th/351st Mountain +20%). Multiplicative, defense-only.
- **What it DOES NOT do:** Force attackers to engage the whole segment. Individual OSIDs are still targetable — density modifier models the softer reality that thin fronts are weaker everywhere.
- **Future:** Could add segment-level concentration requirement (attacker must overcome segment density, not just OSID defender). Deferred until density-only proves insufficient.

#### P7 — Orasje OOB + breakthrough retreat [Gap 4, L23]
Two-part fix per L23:
1. OOB: 3 HVO brigades at Orasje (immediate)
2. Breakthrough retreat for Derventa/Modrica HVO (mechanic)

### Verification Target
~~After P1–P5: expect 85–88% match rate. After P6–P7: expect 88–90%+.~~
**Updated (n295):** P6 done. Current 85.1%. After P1–P5 + P7: expect 87–90%+. Drina gap (71.9%) remains the ceiling constraint — structural OOB/initial-control fix needed for >88%.
### Rear pocket consolidation (2026-03-07) — DELETED

- ~~Pipeline step `consolidate-rear-pockets` auto-flipped surrounded enemy OSIDs (MAX_FLIPS_PER_TURN=8)~~
- **DELETED 2026-03-07:** `consolidate_rear_pockets.ts` and `consolidation_flips.ts` removed. This was the root cause of Goražde/Srebrenica/Žepa being swallowed — surrounded cells auto-flipped without combat.
- Territory now changes hands ONLY through combat.
- Corps AI pocket targeting retained: rear pockets bypass municipality + sector filters in `generateCorpsDirectives()`
- Home-defense brigades: exception for truly undefended adjacent targets (decisive_victory + !defender_has_brigade)

## 2026-03-05 Ongoing engine audit gotchas

- **FormationState field names — DO NOT use wrong names in diagnostic scripts:**
  - **Equipment**: Field is `formation.composition` (with `tanks`, `artillery`, `aa_systems`, `infantry`, condition sub-objects). There is NO `formation.equipment` field — it doesn't exist. `equipment_state` is a separate aggregated tracking object (`operational_heavy`, `degraded_heavy`, etc). Confirmed n587: RS=535 tanks, 1158 artillery; RBiH=106/329; HRHB=33/115.
  - **Fatigue**: Field is `formation.ops.fatigue`, NOT `formation.fatigue`. The `ops` sub-object holds runtime operational state.
  - **Weekly report `.ops`**: This is a config flag `{enabled: boolean, level: number}` for baseline_ops scenario action — NOT operation count. Actual operations live in `weekly_report.operation_diagnostics[]` array. Confirmed n587: w1=6 ops (VRS corps), w10=7 (+HVO), w20=11 (+ARBiH), w30=12.
  - **Weekly report `.week_index`**: NOT `.week` or `.turn`. The week number field is `week_index`.
- **Catastrophic casualty ratios (n590 — FIXED):** Two root causes: (1) `OUTCOME_DEFENDER_MOD['catastrophic']` was 0.3 (raised to 0.7 in n589). (2) `personnelDefender` used only primary brigade personnel, not total sector — sector with 5 brigades/4,000 men based defender casualties on one brigade's 500 men (fixed in n590). After both fixes: worst outlier 22.7:1 (at Lukavica — most fortified Sarajevo position), avg catastrophic 8.5:1, aggregate 0.88:1. Remaining outliers are geographically plausible (fortified positions). If you see >25:1, check whether it's Sarajevo/Lukavica first — those ARE expected to be extreme.
- Tactical fog-of-war is only partially active in the current live path. The engine derives `sector_intel` every war turn, but [`src/ui/map/data/GameStateAdapter.ts`](F:\A-War-Without-Victory\src\ui\map\data\GameStateAdapter.ts) and [`src/ui/map/map/builders/buildFogOfWarGeoJSON.ts`](F:\A-War-Without-Victory\src\ui\map\map\builders\buildFogOfWarGeoJSON.ts) still consume legacy `recon_intelligence.confirmed_empty`. Live evidence: [`runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n110/final_save.json`](F:\A-War-Without-Victory\runs\apr1992_definitive_40w__7c821fa7d934716d__w40_n110\final_save.json) has `sector_intel` and no `recon_intelligence`. Treat current map fog as a UI-layer legacy overlay, not proof that sector-intel-driven FoW is functioning end-to-end.
- Autonomous corps operation planning exists, but the path is internally split. [`src/sim/combat/bot_corps_ai.ts`](F:\A-War-Without-Victory\src\sim\combat\bot_corps_ai.ts) still creates generic named operations in `generateCorpsOperationOrders()`, then later in the same `generateAllCorpsOrders()` pass allows `generateCorpsDirectives()` to replace any non-`sector_attack` active operation with a new sector offensive. Treat generic named-op behavior as partially shadowed until this ownership is unified.
