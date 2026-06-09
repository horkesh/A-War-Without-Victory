# Orphaned-Wiring Audit — Engine + State Domain (2026-06-09)

READ-ONLY audit of `src/sim/`, `src/state/`, `src/scenario/`. Hunts the
"planned-but-never-wired / forgotten" pattern (the motivating example: an art
`image?` field declared on the event type + UI but never rendered/populated —
note that art pipeline was since wired in commit `347d0d573`, so it is NOT a
finding here).

Categories:
1. **DECLARED-NOT-CONSUMED** — field/config written or declared, never read by
   live code (or read only to be hardcode-overridden).
2. **EXPORTED-NOT-CALLED** — function/module exported with zero live (non-test)
   call sites.
3. **REGISTERED-NOT-EFFECTIVE** — war-phase step / hook that runs but is a no-op
   or only writes a diagnostic field nothing consumes.
4. **FLAG-NOT-WIRED** — feature flag / default-off toggle that gates nothing in
   runtime, or was never turned on AND never wired into a consumer.

Determinism note: no findings below introduce nondeterminism; several are
explicitly documented as byte-stable no-op substrate. No runs performed.

---

## Part A — Seed confirmation

| # | Seed | Verdict on main | Evidence |
|---|------|-----------------|----------|
| S1 | `minority_flight.ts::processMinorityFlight` dead | **RESOLVED (module removed)** but **field orphan REMAINS** | Module deleted in #360 (commit `ddee39e2b`). However `displacement.minority_flight_state` (a `Record`) still survives: declared `game_state.ts:2954`, serialized `serialize.ts:136`, migrated `save_migration.ts:605`, validated `validateGameState.ts:3260`, init'd empty `index.ts:51` / `warroom.ts:205`. No writer, no reader. DECLARED-NOT-CONSUMED leftover. |
| S2 | `supply_by_osid` never consumed → briefing hardcodes 0.8 (BRIEF-GAP-1) | **REFUTED (now wired)** | Consumed: `belief.ts:343,356`, `assess.ts:105`, `force_eval.ts`, `emit.ts:200`. Real per-faction supply read, no 0.8 hardcode in this path. |
| S3 | `recent_territory_change` hardcoded 0 in `assessCorps()` (BRIEF-GAP-6) | **REFUTED (now computed)** | `army_hq_gathering.ts::assessCorps` (line 242) calls `computeRecentTerritoryChange()` (line 271, def 376) which scans `political.control_events`. Consumed at `:524-530` for doctrine; also read by `bot_strategy.ts`. Not a stub. |
| S4 | `recruitment_modifier` "dead-channel" | **REFUTED for mobilization (wired); residual note for combat-math** | `getActiveRecruitmentMultiplier` (`active_modifiers.ts:17`) is multiplied into the mobilization pool at `ongoing_mobilization.ts:315` (consumed lines 306,387). The original "ZERO drift" observation is the 40w-hash-neutral note at `combat_math.ts:1396` — i.e. no event fires the modifier in the historical scenario, so the *channel* is live but *no content triggers it* in calibration. Substrate, not dead code. |
| S5 | AAR casualty split hardcodes 0.30/0.55 in `operation_casualty_attribution.ts` (#73) | **CONFIRMED** | `KIA_FRACTION=0.30`, `WIA_FRACTION=0.55` (`operation_casualty_attribution.ts:21-22`) vs canonical `KIA 0.22 / WIA 0.74 / MIA 0.04` (`attack_casualty_distribution.ts:27-29`, used by battle_resolution / morale_absorption / frontline_attrition). AAR layer's split diverges from the real combat split. |
| S6 | `displacement.refugees_received` always 0 (append sites set dest_mun not dest_osid) | **CONFIRMED** | `refugees_received` only increments when `event.dest_osid` is set (`displacement_event_log.ts:101`). All append sites set `dest_mun` (and `origin_osid`) but never `dest_osid`: `displacement_takeover.ts:408,746,869`; `displacement.ts:447`; `paramilitary_sweep.ts:625`. Consumers exist and read it — `compute_capital.ts:251` (Dayton negotiation capital), `VerdictScreen.tsx:745` — so the **end-game "refugees received" stat is permanently 0**. |

---

## Part B — New findings

| # | Finding | Category | File:line | Evidence it's unwired | Player-facing impact | 1.0 assessment |
|---|---------|----------|-----------|-----------------------|----------------------|----------------|
| N1 | **Phase 3A→3D pressure/exhaustion/collapse pipeline is registered as 4 war-phase steps but inert in all runtime** | REGISTERED-NOT-EFFECTIVE + FLAG-NOT-WIRED | `war_phases.ts:3696-3772` (steps); `phase3a_pressure_eligibility.ts:19-32`, `phase3b…:66-83`, `phase3c…:33`, `phase3d_collapse_resolution.ts:38` | `getEnablePhase3A/B/C/D()` all return `false` unless `setEnablePhase3X()` is called; the setters are invoked **only** from `src/cli/phase3abc_audit_harness.ts` / `phase3a_ab_harness.ts` — never from `scenario_runner` or any sim entrypoint. Each step body (or its `applyPhase3X`) short-circuits with `reason:'feature_flag_disabled'`. Steps still execute every turn (CPU cost, diagnostic write) but mutate nothing. | None today; the entire civilian-pressure → faction-exhaustion → political-collapse propagation model (a core "negative-sum" pillar) does not run in the shipped sim. | **intentional-future-substrate** (v0.9.x Consequence work per MEMORY) — but the 4 always-on no-op steps are a latent perf/clarity wart; document the gate or guard the step registration. Not a 1.0 blocker unless the collapse model is in the 1.0 DoD. |
| N2 | **`pressure_exposure.ts::computePressureExposureByEntity` transitively dead** | EXPORTED-NOT-CALLED (transitive) | `pressure_exposure.ts:39` | Sole consumer is `phase3c_exhaustion_collapse_gating.ts:550`, which is itself never enabled in runtime (N1). So the per-settlement pressure-exposure computation never runs in live sim. | None. | polish (dead pending N1 activation). |
| N3 | **`emergence/rear_zone_detection.ts` — entire module dead** | EXPORTED-NOT-CALLED | `rear_zone_detection.ts:37,75,94` | `deriveRearPoliticalControlZones`, `isSettlementInRearZone`, `getRearZoneAuthorityStabilizationFactor` have **zero** callers outside the module itself (line 100 self-call) and tests. The "rear zones get 0.5× authority-stabilization" mechanic was built and never plugged into authority degradation. | Rear-area authority never gets the intended stabilization bonus — rear municipalities degrade at the same rate as the front (likely contributes to over-fragmentation away from the line). | polish / intentional-future-substrate — confirm whether the 0.5× was meant to feed `authority_degradation.ts`. |
| N4 | **`emergence/aor_instantiation.ts::deriveAoRMembership` + `isSettlementFrontActive` dead** | EXPORTED-NOT-CALLED | `aor_instantiation.ts:42,146` | Only non-test references to these two exports are inside the dead `rear_zone_detection.ts`. (Sibling `getFrontActiveSettlements` at :159 IS live — scenario_runner, displacement_triggers — so the file is not wholly dead.) | None. | cosmetic / dead code; safe to remove with N3. |
| N5 | **`displacement.minority_flight_state` orphan field** | DECLARED-NOT-CONSUMED | `game_state.ts:2954`; `serialize.ts:136`; `save_migration.ts:605`; `validateGameState.ts:3260`; init `index.ts:51`, `warroom.ts:205` | After the #360 module removal, the state field, its serializer entry, save-migration ensureRecord, and validator all remain but nothing writes or reads it. Pure schema cruft persisted into every save. | None (empty `{}` in every save). | cosmetic — schema-cleanup candidate; touches save_migration so needs a version bump if removed. |
| N6 | **Refugee-column map overlay can never render** | DECLARED-NOT-CONSUMED (downstream of S6) | `buildRefugeeColumnOverlay.ts:156-159,187` | The overlay requires both `origin_osid` AND `dest_osid` present and `origin_osid !== dest_osid`. Since no append site sets `dest_osid` (S6), the column-flow overlay always produces zero columns. (UI layer, but root cause is the engine-side append gap.) | The "refugee movement arrows" map layer is permanently empty. | polish — fix is engine-side: populate `dest_osid` at the displacement append sites (same fix unblocks S6's `refugees_received`). |
| N7 | **AAR vs canonical casualty-fraction divergence (= S5) compounds in op AAR rollups** | DECLARED-NOT-CONSUMED (wrong constant shadows canon) | `operation_casualty_attribution.ts:21-25` | Local `KIA/WIA/TANK/ART` constants re-derive a split from `attacker_casualties/defender_casualties` instead of using the canonical fractions the battle engine already applied. The AAR's KIA/WIA breakdown therefore disagrees with the actual ledger. | Operation After-Action Reports show a KIA/WIA mix (30/55) that doesn't match the casualties the sim actually booked (22/74) — player-visible inconsistency in op debriefs. | polish — import the canonical fractions; verify byte-stability (AAR is a read-model so likely calibration-flat). |

---

## Part C — Checked and found HEALTHY (not findings)

- `equipment_quality_modifiers` substrate — fully wired: `combat_math.ts:1397,1559`, `sector_offensive.ts`, `operation_opportunity_defender_weakness.ts:45`, `observer_threshold_flags.ts:97`. `!== 1.0` byte-stable fast-path honored. Healthy substrate.
- PDP gate sub-flags — `patron_confidence` + `military_credibility` DEFAULT-ON and consumed; `intl_standing` + `internal_cohesion` are documented dormant guards (FLAG-NOT-WIRED-by-design, MEMORY-tracked). Not "forgotten" — explicitly gated future channels. Not flagged.
- `army_hq_overrides` (ARMY-GAP-1 neighbor) — written `army_hq_gathering.ts:973`, **consumed** `bot_corps_stance.ts:196`. Wired.
- `front_pressure` + `diffusePressure` + `front_emergence` + `pressure_eligibility` + `getFrontActiveSettlements` — populated by `accumulateFrontPressure` (`war_phases.ts:3675`) and read by `front_breaches.ts`, `loss_of_control_trends.ts`, `displacement_triggers.ts`, `simple_general_bot.ts`. Live.
- `front_emergence_report` — diagnostic-looking but **consumed** in `scenario_runner.ts:2522` under `static_front_only`/`fluid_front_only` scope modes. Conditionally live.
- `BotManager`/`SimpleGeneralBot` — gated behind scenario `runBots` flag (Apr1992–Jan1993 path), not the default 188w calibration path, but reachable. Not dead.

One genuinely diagnostic-only sink worth noting (low severity): `context.report.phase_e_pressure_update` (`war_phases.ts:3414`) is written but only referenced again by its type decl — pure report sink, no downstream consumer. `diffusePressure` does still mutate `state.military.front_pressure`, so the *step* is effective; only the *report field* is unconsumed. Cosmetic.

---

## Top findings for relay

**No hard 1.0 BLOCKERs found** in the strict "ships broken" sense — the orphans
are either future-substrate (collapse model) or read-model/cosmetic.

Highest-value:
1. **S6 / N6 — `dest_osid` never populated at displacement append sites** → the
   Dayton-endgame "refugees received" negotiation-capital stat AND the refugee
   map overlay are both permanently zero/empty. One engine-side fix (set
   `dest_osid` when routing displaced civilians) unblocks both. Player-facing in
   the endgame verdict screen.
2. **N1 — Phase 3A→3D collapse pipeline inert** — four always-on no-op war-phase
   steps; the civilian-pressure→exhaustion→collapse pillar doesn't run. Verify
   against the 1.0 DoD whether this model is in scope; if not, the dead steps are
   a perf/clarity wart.
3. **S5 / N7 — AAR casualty split (0.30/0.55) disagrees with canon (0.22/0.74)** —
   player-visible inconsistency in operation debriefs.
4. **N3/N4/N5 — dead modules/fields** (`rear_zone_detection.ts`,
   `deriveAoRMembership`/`isSettlementFrontActive`, `minority_flight_state`) —
   safe cleanup; N3's rear-zone authority-stabilization was a designed mechanic
   that never got plugged in.
