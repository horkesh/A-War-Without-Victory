# Fall-1995 Deferrals — E-A5 / E-A6 / E-B1 Combat-Engine Handoff Plan

**Date:** 2026-05-29
**Status:** DRAFT — read-only plan. NO code edits, NO commits, NO scenario runs in this doc.
**Author lane:** Operations Expert (+ Gameplay Programmer hat)
**Owner on execution:** calibration/combat team
**Authority:** Below canon. Inherits `docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md` (the E-A/E-B specs), `docs/plans/late-war-5th-corps-opportunities-design.md`, `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md`. Format exemplars: `docs/plans/late-war-5th-corps-opportunities-design.md` + `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md`.
**Command-board row:** P3 calibration/combat lane — "Fall-1995 deferred combat-math follow-ups (E-A5/E-A6/E-B1)".

---

## 1. Objective

Close the three deferred follow-ups from the 2026-05-23 Fall-1995 engine-synthesis packet. Each closes a distinct Fall-1995 representation/calibration gap that the SHIPPED Tier-A/Tier-B modifiers (E-A1..E-A4, E-B2, E-B3, E-B4) left half-wired:

- **E-A5 — 51:49 launch-gate consumer.** The `offensive_ops_suppression` effect kind, the `state.military.offensive_ops_suppressions` persisted array (save v31), and the reader `isFactionOffensiveOpsSuppressed` all already exist — but **no launch gate consumes the reader**, and **no event uses the effect or an area-ratio trigger**. The packet (§3 E-A5, lines 194-205) specs a `faction_area_ratio` trigger at `RS max_share 0.51` that suppresses RBiH/HRHB offensive ops for a window. Closing this CAPS the RBiH +29 territorial overshoot the Fall-1995 packet observed (RBiH over-captures past the historical 51:49 freeze line because nothing stops the advance).
- **E-A6 — Sloboda 95 / Velika Kladuša rear-clearing operation.** Packet §3 E-A6 (lines 207-210) + mechanism M9 (line 76). The Aug-Oct 1995 5th Corps clearing of the Velika Kladuša / APWB rear is currently NOT represented as a `CorpsOperation`. It is the historical precondition that frees 5th Corps forces for Sana 95. Must be authored as an emergent op (NOT a hardcoded brigade→OSID assignment).
- **E-B1 — corps coherence decay logic.** Packet §3 E-B1 (lines 214-224). The `FormationState.coordination_coherence?` field is **declared in `src/state/game_state.ts:782`** but has **zero readers and zero writers anywhere in `src/`**. The packet's E-B4 periphery discriminator was specced to key the "abandoned-periphery" ×0.80 defender penalty off `corps coherence < 0.6` (see `strategic_priorities.ts:6-9` docstring), but that consumer was never wired because the coherence value never decays. E-B1 implements the decay dynamics + the threshold consumers (op-launch block + the periphery penalty).

---

## 2. Scope, Non-Scope, Ordering

### 2.1 In scope
- E-A5: one event-trigger type (`faction_area_ratio`), one event-data edit, one launch-gate consumer call.
- E-A6: one new scripted/opportunity `CorpsOperation` definition (data + catalog wiring) with emergent prerequisites.
- E-B1: coherence decay update step + two threshold consumers (op-launch block; periphery defender penalty).

### 2.2 Non-scope (explicit)
- Tier-C items (E-C1 frontage overstretch, E-C2 rear paralysis, E-C3 discredited-corps start). Deferred per packet §3 Tier C.
- Any **initial OSID control override** (sacred rule). All three work via events / combat-math modifiers / op prerequisites.
- Any `avoided_osids_by_faction` (banned).
- Any new attack pathway. Ops-only-attacks preserved — E-A6 is a `CorpsOperation`; E-A5 only *blocks* op launches; E-B1 only *blocks* op launches + lowers defender power.
- 6th/7th Corps simulation (packet §7). Sana/Sloboda 7th Corps contribution stays folded into 5th Corps or HVO.
- Re-modeling APWB as a faction (the 2026-05-21 cut stands — Velika Kladuša stays RBiH-painted; E-A6 clears the *rear pocket* as an op objective set, not an APWB-faction flip).

### 2.3 Recommended ordering — three SEPARATE one-change-per-calibration-run changes

**E-A5 → E-A6 → E-B1.** Reasoning:

1. **E-A5 FIRST.** It caps a *known, measured overshoot* (RBiH +29). It is the lowest-risk, most-surgical change: the effect/state/reader infrastructure is already shipped and save-migrated (v31); only the trigger type + one event payload + one launch-gate call remain. Capping the overshoot first means E-A6 and E-B1 are measured against a *correctly-bounded* endgame, not an unbounded one — otherwise E-A6/E-B1 gains get masked or amplified by the uncapped advance.
2. **E-A6 SECOND.** Adds territory-capture *capability* (frees 5th Corps for Sana). Sequencing it after the cap means any new RBiH gains it produces are immediately bounded by the E-A5 51:49 freeze — we can read whether Sloboda→Sana reaches Sanski Most without runaway. **Cascade caveat (see §6):** op additions have non-local effects; isolate it on its own run.
3. **E-B1 LAST.** It is the most structural (new decay step + two consumers) and it *interacts* with both prior changes: coherence decay makes VRS periphery defenders more brittle (helps RBiH/HRHB capture), which must be measured against the already-capped (E-A5) and already-Sloboda-enabled (E-A6) baseline. Landing it last isolates the structural dynamics from the simpler data/gate changes.

Each item = its own commit set + its own 188w calibration run + its own sign-off. Never bundle (sacred rule: one change per calibration run).

---

## 3. Per-Item Design

### 3.1 E-A5 — 51:49 launch-gate consumer

#### Current-state findings
- Effect kind `offensive_ops_suppression` registered: `src/sim/events/event_vocabulary.ts:25`, typed `src/sim/events/event_types.ts:249`, cost floor `src/sim/events/apply_effects.ts:33`.
- Effect application writes the array: `apply_effects.ts:115-143` (`applyOffensiveOpsSuppression`).
- Persisted state: `src/state/game_state.ts:2337-2342` (`offensive_ops_suppressions?`), save-migration v31 `src/state/save_migration.ts:727`, validator `src/state/validateGameState.ts:566-571,968,1188-1189`, expiry sweep `src/sim/events/active_modifiers.ts:210-211`.
- Reader EXISTS but is UNUSED: `src/sim/events/active_modifiers.ts:64-77` (`isFactionOffensiveOpsSuppressed`). Repo-wide grep: only the docstring/type self-references — **no combat consumer**.
- Event currently uses neither: `data/scenarios/events/war_1995.json:1971-2005` (`us_halts_federation_advance_1995`) fires on a fixed `turn_min:182 / turn_max:184` gate and applies only `aggression_modifier −0.2` (soft, does not hard-stop launches).
- Trigger types: area-ratio gating exists for *anchors* (`src/scenario/historical_anchors.ts:33-41` `max_share`) and pressure eligibility (`src/sim/pressure/phase3a_pressure_eligibility.ts:72` `area_ratio`) but is NOT a wired *event* trigger predicate.

#### Proposed mechanic (grounded in packet §3 E-A5, lines 194-205)
Two halves:
1. **Trigger half** — add a `faction_area_ratio` event trigger predicate: fires when a faction's current controlled-OSID-area share crosses a `max_share` threshold (RS ≤ 0.51). Compute share from the same area source the anchors use (`data/derived/operational/osid_areas.json` via the anchor area helper) so the number is consistent with calibration scoring. This makes the halt *emergent from battlefield state* (RS dropped to 51%) rather than a fixed calendar turn — matching M21 (politically-chosen line, not VRS-resistance limit).
2. **Consumer half** — wire the existing `isFactionOffensiveOpsSuppressed(state, faction, turn)` reader into the op-launch gate.

#### Exact hook sites
- **Trigger predicate:** event-trigger evaluation site (the function that evaluates `trigger.requires_events` / `turn_min` for war events). Add a `trigger.faction_area_ratio?: { faction, max_share }` branch alongside the existing trigger checks. (Locate via the event-firing scanner that already reads `trigger.turn_min`/`requires_events`; the `us_halts_federation_advance_1995` payload is the first consumer.)
- **Consumer:** `src/sim/combat/sector_offensive.ts` — the op-launch transition at **`sector_offensive.ts:1146`** (`if (preparationReady || elapsed > planDuration || stagedEarly || forcedLaunch)`), guarded immediately *before* `op.phase = 'execution'` (line 1189). Add: `if (op.force_launch !== true && isFactionOffensiveOpsSuppressed(state, faction, turn)) { beginRecovery(op, turn, 'offensive_ops_suppressed', state); continue; }`. This sits next to the existing `force_ratio_estimate < launchFloorForOp(op)` gate (lines 1181-1188) — same shape, same `force_launch` bypass.
- **Event data:** `data/scenarios/events/war_1995.json:1971-2005` — replace the fixed turn-gate trigger with (or add) a `faction_area_ratio` trigger (RS `max_share: 0.51`); add an `offensive_ops_suppression` effect targeting RBiH and HRHB with `duration_turns ≈ 6` (packet `turn_window:6`).

#### Determinism / ops-only / byte-stability
- Determinism: area-share read is a pure sum over sorted OSIDs from a committed JSON; no randomness/timestamps. Suppression entries already sort/expire deterministically.
- Ops-only-attacks: the gate only *prevents* launches; no new attack path.
- Byte-stability: the consumer is a no-op (`isFactionOffensiveOpsSuppressed` returns `false`) until an event actually pushes a suppression entry. The `force_launch` bypass preserves the player override. Pre-event behavior byte-identical → the *capping* behavior change is the intended, authorized output movement.
- Emergent (not hardcoded): suppression fires off the RS *area share* crossing 0.51 — derived from live control, not a scripted turn or an OSID list.

---

### 3.2 E-A6 — Sloboda 95 / Velika Kladuša rear-clearing CorpsOperation

#### Current-state findings
- APWB ops were CUT (`docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md`) — Tigar-Sloboda 94 + APWB Pressure 94 removed from `operation_opportunity_catalog_5th_corps.ts`; `targets_friendly_overrides` retired; `'Operacija Tigar-Sloboda'` name removed from `operation_names.ts`. Velika Kladuša cluster stays RBiH-painted at all epochs.
- Sana 95 is authored as two T1 opportunities (`sana_95` + `sana_95_follow_on`) gated on `storm_oluja_theater_open` (design doc §4.7) — but **no pre-Sana rear-clearing op exists** to free 5th Corps forces, which is exactly the M9 gap (packet line 76) and gap G12 (packet line 136).
- `CorpsOperation` factories: `src/sim/combat/corps_operation_helpers.ts` (`buildCorpsOperation` etc.); lifecycle owner `src/sim/combat/sector_offensive.ts`; opportunity catalog pattern `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`; HV-attached pool + Una negative-control already wired (`sector_offensive.ts:384-396` + `hv_integration.ts`).

#### Proposed mechanic (grounded in packet §3 E-A6, lines 207-210)
Author `operation_sloboda_95` as a 5th-Corps (`arbih_5th_corps`) rear-clearing `CorpsOperation` / opportunity:
- **Objective OSIDs:** Velika Kladuša cluster in RS/contested hands at the time (the rear pocket), NOT RBiH-painted cores. Confirm exact slugs against painted control + `osid_areas.json` before authoring (design doc §10 lists `op:velika_kladusa:velika_kladusa_2`, `op:velika_kladusa:poljana_2` etc.).
- **Prerequisites (emergent, NOT date-only):** Bihać pocket intact/relieved; `storm_oluja_theater_open` true (or `state.meta.operation_storm_triggered`); 5th Corps has spare brigades after local defense. Window turn-gate ≈ 152-157 (Aug 1995 weeks) as an *eligibility floor*, not a forcing date.
- **Consequence:** on success, frees 5th Corps brigades (they return to the available pool via normal op-completion/recovery) — that freed capacity is the precondition Sana 95 reads. Model as a `predecessor`/eligibility signal for `sana_95`, NOT a hard chain (design doc §4.7: "any path that creates the corridor can unlock it").

#### Exact hook site
- **Definition:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` — add `SLOBODA_95_OPPORTUNITY` def + axes + emergent predicates, following the surviving op-def pattern in that file. Register it in the catalog export the same way the existing 5th-Corps ops are.
- **Factory:** ops instantiated through `buildCorpsOperation` (`corps_operation_helpers.ts`); lifecycle via `sector_offensive.ts` (no new entry point).
- **Name pool:** if a display name is needed, add to `src/sim/combat/operation_names.ts` **by data** (memory rule: bot generators exclude canonical names by data, not comments). `'Operacija Sloboda'` is distinct from the removed `'Operacija Tigar-Sloboda'`.

#### Determinism / ops-only / byte-stability / emergent
- Ops-only-attacks: it IS a `CorpsOperation` — fully compliant; no hardcoded brigade→OSID assignment. Brigade selection flows through the normal op staging/assignment system from battlefield signals (proximity, availability).
- Emergent: prerequisites are live-state predicates (pocket status, theater-open flag, spare brigades), not a scripted result. Bot may decline; a collapsed 5th Corps does not receive it (design doc guardrails §11).
- Determinism: opportunity eligibility is pure-state; ordering via existing sorted op-iteration.
- Byte-stability: a *new op* WILL move output once it becomes eligible and launches. There is no `!== 1.0` shield for an op addition — this is authorized output movement, isolated on its own run.

---

### 3.3 E-B1 — corps coordination-coherence decay

#### Current-state findings
- Field declared, fully unwired: `src/state/game_state.ts:782` (`coordination_coherence?: number`). Repo-wide grep: zero readers, zero writers in `src/` (only the schema declaration + a doc cross-ref at `game_state.ts:787`).
- Sibling pattern to copy: `src/sim/combat/strategic_depth.ts` — `computeStrategicDepth` (per-corps pure derivation), `updateStrategicDepth` (sorted-iteration per-turn writer), `initStrategicDepth` (init), `getStrategicDepth` (canonical read accessor with 1.0 default). E-B1 should mirror this module exactly.
- Defender-power composition site (where multipliers gate `!== 1.0`): `src/sim/combat/combat_math.ts` `computeDefenderPowerBreakdown` — `strategicDepthMult` block at **`combat_math.ts:1543-1553`** and `krajinaCollapseMult` at **`1568-1571`**. The periphery penalty consumer slots in here.
- E-B4 periphery classification exists (`src/sim/combat/strategic_priorities.ts` `getOsidPriority`) and is consumed by reserve allocation (`strategic_reserve.ts:183-184`) — but the packet-specced "periphery + corps coherence < 0.6 → ×0.80 abandoned penalty" defender consumer (`strategic_priorities.ts:6-9` docstring) is NOT in `combat_math.ts` because coherence never decays. E-B1 supplies the missing coherence signal AND wires that periphery penalty.
- Op-launch gate (the `< 0.7` "corps cannot launch new operations" consumer, packet line 219): same site as E-A5's consumer, `sector_offensive.ts:1146`/`1189`.

#### Proposed mechanic (grounded in packet §3 E-B1, lines 214-224)
New module `src/sim/combat/coordination_coherence.ts` mirroring `strategic_depth.ts`:
- `computeCoordinationCoherenceDecay(state, corpsId)` — pure per-corps. Decay inputs (packet line 216): adjacent OSID losses this turn, C2 suppression active (NATO Deliberate Force window — read the same suppression the E-A1 equipment multiplier uses), low `strategic_depth` (E-B3 already computes it — direct input per `game_state.ts:787`), parallel-command-crisis event flag (M16). Clamp `[0.1, 1.0]`, default 1.0.
- `updateCoordinationCoherence(state)` — sorted-iteration writer over corps formations, called once per war-phase turn (same step neighborhood as `updateStrategicDepth`).
- `getCoordinationCoherence(corps)` — canonical read accessor, 1.0 default.
- **Consumer 1 (defender power, packet line 219 `< 0.5` brittleness + E-B4 periphery):** in `combat_math.ts:computeDefenderPowerBreakdown`, after the `krajinaCollapseMult` block (`1571`), add a `peripheryAbandonmentMult`: if `getOsidPriority(targetOsid, defenderFaction) === 'periphery'` AND `getCoordinationCoherence(defenderCorps) < 0.6`, apply ×0.80; else 1.0. Gate `!== 1.0`.
- **Consumer 2 (op-launch block, packet line 218 `< 0.7`):** at `sector_offensive.ts:1146`/`1189`, block new offensive op launch when `getCoordinationCoherence(launchingCorps) < 0.7` (unless `force_launch`). Same shape as the E-A5 gate and the existing force-ratio floor.
- **Defer** the `< 0.3` "corps fragments / brigades transfer administrative control" tier (packet line 220) to a follow-up — it touches brigade-assignment ownership and is higher-risk; not required to reproduce the 2KK collapse signal (the `<0.6` periphery penalty + `<0.7` launch block carry the mechanism). Note this explicitly at execution.

#### Determinism / ops-only / byte-stability / emergent
- Determinism: sorted-iteration corps loop; integer/fraction math; reads only committed/derived state. No randomness/timestamps (copy `strategic_depth.ts` discipline).
- Ops-only-attacks: consumers only *block* launches and *reduce* defender power; no new attack path.
- Byte-stability: `coordination_coherence` starts at 1.0 for all corps; both consumers gate `!== 1.0` / `< threshold`, so until decay actually drops a corps below threshold the change is byte-identical. Authorized output movement once VRS Krajina corps decay in autumn 1995.
- Emergent (not hardcoded): coherence decays from live battlefield signals (territory loss, C2 suppression, depth) — faction-symmetric in shape (corps-id/flag gated like `strategic_depth.ts`'s SVK/Krajina lists, NOT a faction predicate). No OSID is forced to flip; the periphery defender just becomes more brittle, letting captures *emerge*.

---

## 4. Step-by-Step Implementation (discrete commits)

### E-A5 (run + sign-off after)
1. **Commit A1 — trigger predicate.** Add `faction_area_ratio` trigger type to event-trigger evaluation + the trigger type in `event_types.ts`. Focused unit test: trigger fires iff RS area share ≤ 0.51.
2. **Commit A2 — launch-gate consumer.** Wire `isFactionOffensiveOpsSuppressed` at `sector_offensive.ts:1146`/`1189` with `force_launch` bypass + new `beginRecovery` reason. Focused test: suppressed faction's op enters recovery, not execution; forced op bypasses.
3. **Commit A3 — event data.** Edit `us_halts_federation_advance_1995` (`war_1995.json`) to add the `faction_area_ratio` trigger + `offensive_ops_suppression` effect for RBiH+HRHB. Event-data test: payload validates; effect pushes suppression entries.
4. **Run** 40w (expect byte-identical — event is turn ≥182, outside 40w) + 188w (expect RBiH overshoot capped). Sign off.

### E-A6 (run + sign-off after)
5. **Commit A6a — op definition.** Add `SLOBODA_95_OPPORTUNITY` to `operation_opportunity_catalog_5th_corps.ts` + register in catalog export. Add display name to `operation_names.ts` by data if needed.
6. **Commit A6b — Sana eligibility link.** Surface Sloboda as an eligibility signal/predecessor for `sana_95` (soft, corridor-style, not hard-chain).
7. **Commit A6c — tests.** Catalog-coverage test (op exists, prereqs emergent); eligibility test (declines when pocket collapsed / theater not open).
8. **Run** 40w (expect byte-identical — op gated turn ≥152) + 188w. Sign off.

### E-B1 (run + sign-off after)
9. **Commit B1a — coherence module.** New `coordination_coherence.ts` (compute/update/init/get). Unit tests for decay monotonicity, clamp, determinism.
10. **Commit B1b — per-turn update step.** Call `updateCoordinationCoherence(state)` in war_phases near `updateStrategicDepth`. Init at scenario load.
11. **Commit B1c — defender periphery penalty consumer.** Add `peripheryAbandonmentMult` to `combat_math.ts:computeDefenderPowerBreakdown` (after `1571`), gated `!== 1.0`. Add to the returned breakdown object (parallel to `krajinaCollapseMult`).
12. **Commit B1d — op-launch block consumer.** Add the `< 0.7` coherence launch block at `sector_offensive.ts:1146`/`1189`.
13. **Commit B1e — tests + diagnostics.** Defender-breakdown test (periphery+low-coherence = ×0.80; core or high-coherence = unchanged); launch-block test. Add per-corps coherence snapshots to `run_summary.json` (packet §6 line 343) at turns 154/160/166/175/180.
14. **Run** 40w (expect byte-identical — VRS corps stay high-coherence pre-autumn) + 188w. Sign off.

---

## 5. Test / Verification Gates

Per item, before its run:
- `npx tsc --noEmit` clean.
- `npm run test:vitest` clean (focused new combat/op/event tests + full suite).
- `npm run desktop:map:build` (smoke triad).
- Focused tests named per commit above.

Per item, the calibration gate:
- **188w is the relevant endgame scenario** (`apr1992_definitive_188w.json`; spatial match_ratio vs `painted_control_oct1995.json` at turn 188). Capture hash + match_ratio + per-faction accuracy + 27/27 anchors + 6/6 benchmarks.
- **40w** run as a byte-stability sanity check: all three changes should be 40w byte-identical (E-A5 fires ≥t182, E-A6 gated ≥t152, E-B1 decay only bites in autumn). **If 40w hash moves, STOP and explain** — it means a byte-stability gate leaked.
- **Baseline discipline:** 188w output WILL move (E-A5 caps, E-A6 adds capture capability, E-B1 brittles periphery). This is **authorized re-canonicalization** — re-bless 188w baseline only after the per-item run is reviewed and signed off. Never re-bless 40w unless a change legitimately owns a 40w output move (none expected here).
- **One change per calibration run:** never bundle E-A5/E-A6/E-B1 into one run. Three runs, three sign-offs.

Expected direction (packet §6, lines 323-338): RBiH accuracy up (capped overshoot), HRHB accuracy up (Mistral/Sana territory reachable + periphery brittleness), RS Banja Luka core stays RS (E-A5 freeze + E-B4 core priority). Sanski Most reachable by t180 after E-A6+E-B1.

---

## 6. Risks, Rollback, Dependencies, DoD

### Risks
- **Calibration regression / cascade non-locality.** Memory: activating a Drina Corps op disrupted R22's HRHB cascade — op additions (E-A6) have non-local effects. Mitigation: isolate each item on its own 188w run; compare full per-faction + anchor deltas, not just the headline %.
- **Over-correction on E-A5.** If the 51:49 trigger fires too early (RS dips to 51% transiently mid-collapse then the cap freezes a still-moving front), RBiH could *under*-capture. Mitigation: `duration_turns` window (≈6) lets it re-evaluate; tune the `max_share` (0.51 vs reading live painted RS share at trigger time — packet open-question §8.3). Keep the `force_launch` bypass.
- **E-B1 decay too aggressive.** If coherence decays faster than autumn 1995, VRS periphery collapses prematurely (over-capture) or pre-1995 corps decay leaks into the 40w window (byte-stability break). Mitigation: gate decay onset on the same Storm/Deliberate-Force signals E-A1/E-B3 use; verify 40w byte-identical first.
- **E-A6 + E-B1 interaction.** Sloboda freeing forces AND periphery brittleness could double-count the same captures. Mitigation: strict ordering — measure E-A6 alone, then E-B1 alone on top.
- **Trigger-type generality (E-A5).** A new `faction_area_ratio` trigger is reusable by other events; ensure it is conservative and only `us_halts_federation_advance_1995` consumes it initially.

### Rollback
- Each item is its own commit set + its own baseline re-bless. Revert = `git revert` the item's commits and restore the prior 188w baseline manifest. E-A5/E-A6 are isolated (event/op additions); E-B1's new module + two consumers revert cleanly because both consumers gate `!== 1.0`/`< threshold` (removing them returns to byte-identical default-1.0 behavior).

### Dependencies
- E-A5: relies on shipped v31 `offensive_ops_suppressions` infra (present) + anchor area helper (`historical_anchors.ts` / `osid_areas.json`).
- E-A6: relies on Storm theater-open flag (`operation_storm_triggered` / `storm_oluja_theater_open`) + surviving 5th-Corps catalog + painted Velika Kladuša slugs.
- E-B1: relies on E-B3 `strategic_depth` (shipped) as a decay input + E-B4 `getOsidPriority` (shipped) for the periphery consumer. **E-B1 should land after E-A5/E-A6** so its structural dynamics are measured against a bounded, Sloboda-enabled endgame.

### Definition of Done
- All three items implemented, each on its own commit set, each with its own 188w run + sign-off + re-blessed baseline.
- 40w byte-identical for all three (or STOP-and-explained).
- `tsc` + vitest + map-build green per item.
- New tests: E-A5 trigger+gate, E-A6 catalog+eligibility, E-B1 decay+periphery+launch-block.
- `run_summary.json` carries per-corps coherence snapshots (E-B1 diagnostic).
- Docs propagated: `docs/PROJECT_LEDGER.md` per item; this plan marked executed; COMMAND_BOARD P3 row updated; packet §3 E-A5/E-A6/E-B1 marked shipped; canon propagation per `propagate-to-canon` if behavior canon shifts. Do NOT edit `docs/10_canon/FORAWWV.md`.

---

## 7. Sacred-Rule Compliance Summary

| Rule | E-A5 | E-A6 | E-B1 |
|---|---|---|---|
| Canonical faction IDs only | ✅ | ✅ | ✅ |
| No initial OSID override | ✅ event/area-ratio gate | ✅ op prereqs | ✅ combat-math modifier |
| No `avoided_osids_by_faction` | ✅ | ✅ | ✅ |
| Determinism | ✅ pure area sum | ✅ pure-state prereqs | ✅ sorted iteration |
| Ops-only attacks | ✅ blocks launches only | ✅ IS a CorpsOperation | ✅ blocks launch / lowers defender |
| No hardcoded brigade→OSID | ✅ | ✅ emergent staging | ✅ emergent brittleness |
| Byte-stability gating | ✅ no-op until event | ⚠️ op addition = authorized move | ✅ `!== 1.0` / default 1.0 |
| One change per run | ✅ separate runs enforced |  |  |
| Never edit FORAWWV.md | ✅ | ✅ | ✅ |

— End of plan —
