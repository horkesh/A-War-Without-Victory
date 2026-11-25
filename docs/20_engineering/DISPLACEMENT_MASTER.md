# Displacement System Master Reference

> Authoritative technical reference for AWWV's displacement mechanic.
> Covers all pipeline steps, trigger types, routing, loss fractions, state machines, and feedback loops.
>
> **Canon:** v0.7.3 single-phase model (War only). All canonical scenarios start in April 1992.
>
> **Architecture (2026-03-01, updated 2026-03-19):** Displacement is **OSID-based**, not municipality-based.
> Each OSID triggers its own displacement independently. Municipalities only serve as
> grouping for camps before routing. Minority flight is **disabled** — displacement
> triggers only from hostile OSID takeover (war-start seeding + ALL 5 control-flip paths).
>
> **n942 fix (2026-03-19):** All control-flip paths now seed displacement timers via
> `seedDisplacementTimerOnFlip()`: battle resolution, rear pocket consolidation,
> paramilitary sweep, JNA phantom captures. Previously only battle resolution fired.
> Routing overhaul: per-municipality Krajina routing, Drina split (Zvornik→Tuzla,
> Bratunac/Vlasenica→Srebrenica), Krajina flee-abroad (35% then; 55% since 2026-11-14), enclave reinforcement rate 0.005.
>
> **Siege displacement lane (2026-11-14):** The continuous siege/encirclement path (§2.3) is now live
> (it received legacy edges and never fired before), and flight abroad is set per people and region (§5).
>
> **RF-5B (2026-11-14; RB5 2026-11-24):** A third trigger with no control change: the minority-expulsion policy
> (§3.4; a human HRHB can halt it once, by the RB5 card). The HVO's 1993 expulsions of Bosniaks happened inside ground it already held, which the takeover
> trigger could not see.

## 1. Overview

Displacement models the forced movement of civilian populations during the Bosnian War. It is a core mechanic that:

- **Permanently reduces recruitment capacity** at origin municipalities (displaced_out is irreversible)
- **Generates refugee manpower** at destination municipalities (2% of routed displaced → militia pools; 0.5% for besieged enclaves)
- **Feeds exhaustion and humanitarian pressure** (trapped populations, siege conditions)
- **Tracks civilian casualties** (killed, fled abroad) as aggregate faction-level counters

The system uses **3 distinct trigger types** running at designated points in the War turn pipeline, with per-municipality per-ethnicity routing tables to determine where displaced people go.

### Historical Context

By January 1993 (week 40), approximately 1 million people had been displaced in Bosnia.

**Historical civilian casualties (full war 1992-1995):**
- Bosniaks: ~30,000 killed
- Serbs: ~6,000 killed
- Croats: ~2,000 killed

**Calibration history:**
| Run | Total displaced+lost | RBiH killed | HRHB killed | RS killed | Notes |
|-----|---------------------|-------------|-------------|-----------|-------|
| n284 | 4,360,000 | — | — | — | Municipality-based, minority flight active |
| n290 | 312,000 | 4,100 | 1,800 | 212 | Minority flight disabled, 2% kill |
| n291 | 312,000 | 20,900 | 9,200 | 1,100 | Kill fraction restored to 10% |
| n296 | 333,592 | 21,481 | 9,218 | 2,604 | OSID-based, war-start seeding, uniform 0.80 cap |
| n310 | 481,000 | 30,300 | 12,600 | 3,600 | Sustained displacement added |
| n319 | 668,202 | 45,722 | 15,020 | 5,998 | Per-OSID census data, sustained accounts for initial |

---

## 2. Pipeline Integration

Displacement runs at three points in the **War turn pipeline** (canon: War_Specification_v0_9_0.md §5). The order matters because each step can create state that subsequent steps read.

### 2.1 `war-hostile-takeover-displacement` (step 14) — **PRIMARY DRIVER**

**File:** `src/state/displacement_takeover.ts` → `processDisplacementTakeover()`

Runs every turn after attack resolution. The primary displacement writer since 2026-03-01; it also owns the RF-5B policy seed (step 0b, §3.4). The siege path (§2.3) and paramilitary sweeps are the other live writers.

**Sub-steps per turn (step 0b, the RF-5B policy seed, runs between steps 0 and 1; see §3.4):**

1. **Step 0 — War-start seeding:** On the first executed war turn (`currentTurn === warStartTurn + 1`), creates displacement timers for OSIDs in `political_controllers`. **Note:** `runTurn()` increments `state.meta.turn` BEFORE running phases, so `warStartTurn + 1` is the first actual execution turn (not `warStartTurn` itself). For each OSID, a timer is created for every minority faction at war with the controller — subject to **per-faction gating rules**:

   | Controller | Displaced | Fraction | Gate |
   |---|---|---|---|
   | HRHB | RS (Serbs) | **100%** | No gating — every HRHB OSID seeds |
   | RBiH | RS (Serbs) | **10%** | Sarajevo urban municipalities only |
   | RBiH | RS (Serbs) | **50%** | Front-adjacent OSIDs only |
   | RBiH | RS (Serbs) | **skip** | Deep-rear non-Sarajevo OSIDs |
   | Any | Any (default) | **70%** | No gating |

   Front-adjacency is determined from `state.war_front_edges_osid`. If no front edges are computed yet (first turn), all OSIDs are treated as front-adjacent (fallback). Sarajevo urban: `centar_sarajevo`, `novi_grad_sarajevo`, `novo_sarajevo`, `stari_grad_sarajevo`, `ilidza`, `vogosca`, `hadzici`.

2. **Step 1 — Battle-driven timers:** When attack resolution flips an OSID, a new timer is created for the losing faction's population in that OSID.

3. **Step 2 — Timer maturation:** After `TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` turns, the timer matures. Per-OSID population is looked up from the operational settlements census data (`population_total`); falls back to `floor(mun_pop / osid_count)` if unavailable. Hostile share is computed from per-OSID ethnic composition (cap 0.95); falls back to municipality-level `getDynamicHostileShare()` (cap 0.80). Initial displaced amount = `min(floor(osidPop × hostileShare × initFraction), remainingPop)`, where `initFraction` is determined by `getInitialDisplacementFraction(toFaction, fromFaction, munId, isFrontAdjacent)` (see per-faction table above; default 70%). Kill/flee fractions applied, survivors enter camp. `timer.cumulative_displaced` is set; remaining 30% flows through sustained displacement (Branch B).

**Also handles re-displacement pass-through (§10.6):** When a municipality with `displaced_in > 0` has a capture timer mature and the captor is then the municipality's majority holder, displaced people already sheltering there are re-routed to new friendly municipalities with **zero casualties and zero flee-abroad**. This prevents double-counting — a person displaced twice counts as 1 displaced person.

**Minority flight** (`processMinorityFlight()`) is **retired and deleted**: it was switched off in the pipeline on 2026-03-01 and the module `src/state/minority_flight.ts` was deleted on 2026-06-09 (#360, "dead minority_flight removal"). The earlier note here that it was active (about 493k displaced in 52 weeks) is superseded; displacement is carried by takeover displacement, the war-displacement triggers and the stranded-brigade lifecycle (EH-3). *(Corrected 2026-11-17, steward, on the orchestrator's ruling that the minority family is dead.)*

### 2.2 `war-displacement-triggers` (settlement-level)

**File:** `src/sim/phase_f/displacement_triggers.ts` → `evaluateDisplacementTriggers()`

Evaluates displacement deltas for front-active settlements based on conflict intensity and front pressure. Produces per-settlement deltas that are applied and aggregated to municipality level.

- Guard: `state.meta.phase === 'war'`
- Base delta for front-active settlements: `PHASE_F_BASE_FRONT_ACTIVE_DELTA = 0.02`
- Pressure contribution: `pressureSum × PHASE_F_PRESSURE_SCALE (0.001)`, capped at `PHASE_F_MAX_PRESSURE_CONTRIBUTION = 0.03`
- Total cap: `PHASE_F_MAX_DELTA_PER_TURN = 0.05`

### 2.3 `update-displacement` (continuous pressure)

**File:** `src/state/displacement.ts` → `updateDisplacement()`

Runs every turn. The war step (`update-displacement` in `war_phases.ts`) feeds it the OSID front (`computeFrontEdgesOsid`) and OSID supply (`computeSupplyReachabilityOsid`) through `buildOsidDisplacementPressureInputs`. One pass runs per municipality and side holding settlements there:

| Condition | Threshold | Displacement Rate |
|-----------|-----------|-------------------|
| Siege | The side's settlements touch an at-war front and none is supplied for 3 consecutive turns (`UNSUPPLIED_PRESSURE_TURNS`) | 0.1% per week of the holder's own people (`UNSUPPLIED_DISPLACEMENT_FRACTION`) |
| Encirclement | Under front pressure, and every held settlement lies outside the side's main territorial body, in a body holding at most 15% (`POCKET_MAX_SHARE`) of the side's settlements at turn 0 | 0.1% per week of the holder's own people (`ENCIRCLEMENT_DISPLACEMENT_FRACTION`) |

- When both fire the larger rate applies, never the sum.
- Only the holder's people leave and only the holder's manpower pool loses people. Departures are booked to the pressing side (`resolvePressingFactions`, pro rata between two besiegers), with killed 0 and no flight abroad. Each departure is routed to municipalities the holder's side holds; people with nowhere to go stay.
- The rate is sourced from Krstić TJ (UNHCR evacuations from Srebrenica, 1993), UNCOE S/1994/674/Add.2 Annex VI and the Tabeau and Galić demographic report (2002).
- The old 5%, 10% and 3% rates, the front-breach trigger (it read `front_pressure`, which nothing wrote) and the 1.5 sustainability-collapse multiplier (sustainability marks 109 of 110 municipalities collapsed) are removed.
- Siege deaths in place (shelling, sniping, starvation) are still not modelled.

---

## 3. Trigger Types

### 3.1 Hostile Takeover (OSID-Based) — **PRIMARY TRIGGER**

The primary displacement trigger since 2026-03-01: capture displacement flows through this path. The other live writers are the siege path (§3.3, live since 2026-11-14), paramilitary sweeps, the policy expulsion (§3.4, RF-5B; a human HRHB can halt it, RB5) and the pocket-fall step (§3.5, A9 P0-A). The negotiated-evacuation convoy (§3.6, A9 P1) moves people out of a squeezed separate pocket inside the siege step. As of 2026-03-05, sustained displacement is active: initial wave = 70% of minority, sustained trickle = 3%/turn on remaining 30% until < 10 people remain.

**Two trigger sources:**

1. **War-start seeding (Step 0):** At `currentTurn === warStartTurn + 1` (first executed war turn — `runTurn()` increments turn before phases), iterate all OSIDs in `political_controllers`. For each OSID, create timers for every minority faction at war with the controller. This means ALL minorities begin displacement from day one.

2. **Battle-driven (Step 1):** When attack resolution flips an OSID, a timer is created for the displaced faction.

**Timer key format:** `${osid}|${fromFaction}` — supports multiple displaced ethnicities per OSID (e.g., an RS-controlled OSID gets separate timers for RBiH and HRHB displacement).

**Sequence:**
1. Timer created (war-start or battle flip)
2. `areFactionsAtWar()` check passes (factions are at war)
3. Timer starts: `HostileTakeoverTimerState { mun_id, from_faction, to_faction, started_turn }`
4. After `TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` turns, timer matures
5. Per-OSID population from census (fallback: `floor(mun_original_population / osid_count_in_mun)`)
6. Hostile share from per-OSID ethnic data (fallback: `getDynamicHostileShare()`)
7. Displaced amount = `min(floor(osidPop × hostileShare), remainingPop)`
7. Kill fraction applied, flee-abroad fraction applied, survivors enter camp
8. Camp holds for `CAMP_REROUTE_DELAY_TURNS = 4` turns
9. Camp routes to destination municipalities via per-ethnicity routing tables

**Dormant records and the bounded return rule (RB9, 2026-11-16, §6 panel, three rounds):**
- **No timer forgets who it expelled.** A timer that holds a count (`cumulative_displaced` > 0, fired or inherited) becomes a dormant record (`dormant_since_turn`) instead of being deleted. This happens when:
  - the expelled side retakes the OSID;
  - the sides make peace;
  - a policy holder loses the OSID;
  - the sustained drain runs out.

  A dormant record never fires. The next capture, flip seed or policy seed of the same OSID and group replaces it and inherits `cumulative_displaced`, `cumulative_routed` and `cumulative_pool_cut`. So the same people are never expelled twice from the 1991 census (#623 extended to every timer). A timer with no count is still deleted.
- **Return rule.** Suppose a dormant record's OSID is held for `RETURN_HOLD_WEEKS` = 12 unbroken weeks by the group's own side, or by a side that has never yet been at war with the group. RS has been at war with both from the start; RBiH and HRHB from `rbih_hrhb_state.war_started_turn`. The expeller is never a safe holder. Then the routed survivors (`cumulative_routed`) come home:
  - the same number leave that group's refugee population: the origin camp first, then `displaced_in` in the cohort's bilateral routing order;
  - origin `displaced_out` falls by the same number;
  - the returnees' share of the expulsion's home-pool cut goes back to the home militia pool;
  - the return is logged as a displacement event (`returned`, with no expulsion fields), and the per-OSID departed tally falls to match.

  The killed and the fled abroad never return and stay on the record. People no longer found in any refugee population are not invented. `refugees_created` is untouched: the expulsion happened. A shorter hold returns nobody. The rule is faction-blind and names no places.
- **Measured** (188w, against main at the same commit): about 80k return by w188 (Serbs ~58k, Bosniaks ~20k, Croats ~5k), of which the historian finds about 60k follow the wartime pattern. About 20k undo phantom t5 expulsions (register RB9-R1).
- **Limits:**
  - Returns change manpower, because refugees feed host militia pools every turn. Control moves; the lost cells are on the calibration list.
  - The restore is not netted against the pool-size floor (register RB9-R24).
  - Cross-front returns before Dayton are excluded by design.

**Hostile share:** Two-tier computation (as of n319):

1. **Per-OSID census data** (preferred): Uses `population_bosniaks`, `population_serbs`, `population_croats`, `population_others` from operational settlements GeoJSON. Faction alignment: RBiH = bosniak + other, RS = serb, HRHB = croat. Cap: 0.95.
2. **Municipality-level fallback**: `getDynamicHostileShare()` from 1991 census, adjusted for incoming displaced. Cap: 0.80.

Per-OSID data is loaded from `data/derived/operational/operational_settlements.geojson` via the `osidSettlements` parameter.

**Re-displacement pass-through (§10.6):** When a capture timer matures on a municipality that has `displaced_in > 0` and the captor is then its majority holder, those already-displaced people are re-routed to new friendly municipalities with:
- **Zero casualties** (no kill fraction)
- **Zero flee-abroad** (no abroad fraction)
- **No double-counting** (displaced_total does not increment for pass-through)

### 3.2 Minority Flight — **DISABLED**

As of 2026-03-01, `processMinorityFlight()` was **not called** in `turn_pipeline.ts`; the module `src/state/minority_flight.ts` was then deleted on 2026-06-09 (#360) and no longer exists. *(Corrected 2026-11-17: the earlier text said the code remained for potential future use.)*

**Rationale:** Displacement should only trigger from hostile OSID takeover (war-start seeding handles the "minorities flee from day one" case that minority flight previously covered).

### 3.3 Continuous Pressure

Ongoing displacement from operational conditions — no direct battle required.

Two triggers, each checked per municipality and per side holding settlements there (full rules in §2.3):

1. **Siege:** the side's settlements touch an at-war front and none is supplied for `UNSUPPLIED_PRESSURE_TURNS = 3` consecutive turns → 0.1% per week of the holder's own people (`UNSUPPLIED_DISPLACEMENT_FRACTION = 0.001`)
2. **Encirclement:** under front pressure and every held settlement lies in a body outside the side's main territory that held at most `POCKET_MAX_SHARE = 0.15` of the side's settlements at turn 0 → 0.1% per week (`ENCIRCLEMENT_DISPLACEMENT_FRACTION = 0.001`)

The larger of the two applies. Departures are booked to the pressing side with killed 0 and no flight abroad.

**Trapped in a separate pocket (A9 B3, 8-seat §6 ruling D10, unanimous 2026-11-25).** Leavers go to A5's destinations (supplied ground in the side's main body) only when the pocket's municipality is linked to the main body, by the same linked-body test as the B2 pass-through resolver (the bodies of the side's settlements there, or any body next to one of the municipality's settlements), or when the leavers' own body holds the near end of a sourced crossing (§10.3; one entry). Otherwise the pocket is separate and its leavers are TRAPPED: nobody leaves, nothing is booked, nobody is killed, the carry still advances on `wanted`, and the trapped count is written to Ledger line 2 below. Goražde, Srebrenica, Žepa and Bihać have no sourced civilian exit; only the P1 convoy rule (§3.6) can open one. Tests: `tests/state/siege_b3_trapped_pocket.test.ts`.

**Siege outflow carry (batch A row A6, SD9, 2026-11-24).** The weekly outflow is computed in integer parts per million (`SIEGE_OUTFLOW_PPM_SCALE`): `total = heldPeople * ppm + carry`, `wanted = min(floor(total / 1e6), heldPeople)`, `carry = total % 1e6`, with `ppm = round(fraction * 1e6)` (1,000 at 0.1%). Before A6, `floor(heldPeople * 0.001)` was 0 every week for any pocket under 1,000 people, so Žepa (about 764 held) lost nobody in 107 weeks of encirclement. The carry lives in `DisplacementState.siege_outflow_carry_by_side` per side, always in [0, 1e6), absent when zero. It is updated right after `heldPeople` is known, before the `wanted <= 0` continue, and advances on the attempted outflow (`wanted`), not on the routed count, so trapped weeks build no debt and capacity opening later releases no burst. It is deleted when the side no longer holds settlements in the municipality (holder change, enclave fall), when neither trigger holds, and when nobody remains. Tests: `tests/state/siege_outflow_carry.test.ts`.

**Ledger line 2, "unable to leave" (§6 + §4 panels, `s6_ledger12`, 2026-11-25).** A write-only display stock: `DisplacementState.unable_to_leave_by_side[side] = { amount, turn }`, written from each week's A5 trapped record (`wanted - routed`, integer, only when at least 1) with `turn = meta.turn`, and cleared from every municipality as the first statement of `updateDisplacement`. It is never summed across weeks and nothing in the simulation reads it (source-scan test). The desktop projection keeps only the player's own side (none without a player); the Ledger and the player's own enclave cards show it only when its stamp is the current turn and hide it otherwise (never a "0"). Live since B3 (measured on the B3 188w pair): line 2 carries a trapped stock in Bihać in all 188 weeks, Srebrenica t2-t170, Goražde t70-t188, Žepa (Rogatica) t70-t171, Orašje, and the HRHB Lašva/Kiseljak pocket t41-t97; weekly stocks are at most 48 people. Before B3 (hands-off 188w on post-B1 main) A5 trapped was 0 in every week, because the side's supplied destinations always had room for the 0.1% weekly outflow and nothing checked what lay between. Tests: `tests/state/siege_destination_a5.test.ts`, `tests/s6_ledger_lines_write_only.test.ts`, `tests/ui/ledger_line2_render.test.ts`.

The consecutive-turn counter is saved state: `DisplacementState.unsupplied_pressure_by_side` holds it per side, with the turn it was last counted. It replaces the old module-level cache (`pressureStateCache` and `resetDisplacementPressureCache()`), which is deleted, so the counter now survives save and load. `applyDisplacementFromFlips` and the `displacement-apply` step are also deleted; they were never reached.

---

### 3.4 Policy Expulsion (RF-5B; human halt card RB5)

Owner: `processDisplacementTakeover` step 0b (`src/state/displacement_takeover.ts`). §6 broader bright-line panel record: `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 (RF-5B).

- **Who:** a faction listed in `BOT_MINORITY_EXPULSION_POLICY` (HRHB only) **while bot-controlled** (`state.meta.player_faction !== faction`, or `headless_scenario_auto_control`), or **human-controlled unless the player's own halt is on record** (RB5, 2026-11-24; player-override model 2026-11-25, H-20: the read is `!== 'refused'`, so silence and no decision on record seed on the bot's turn). The card `hrhb_minority_policy_1993` fires the turn after the war begins (before step 0b), answerable once; its historical default is no halt (at every level, Observer included, it waits at the pause before combat, so the halt is reachable before the first wave; left unanswered there, the staff answer it with that default); `order_halt` sets `hrhb_minority_policy_halted` and costs `patron_confidence` −10 (modelled, unsourced). A halt on record also retires every policy wave not yet matured. Fail closed: a malformed own row is a refusal, an automatic row never is, and a filed, unapplied halt is not a decision. The player can order a halt, never an expulsion. RBiH has no entry: no ARBiH joint criminal enterprise or expulsion policy was charged or found (Hadžihasanović and Kubura; Halilović). The HRHB entry follows the Prlić et al. joint-criminal-enterprise finding (TJ 2013, affirmed 2017).
- **When:** once per faction, on the first turn on which `rbih_hrhb_state.war_started_turn` is set and the pair is at war (in the 188w campaign: t50). The applied turn is recorded in event flag `hrhb_minority_policy_applied_turn`.
- **Where:** every OSID the faction then holds inside a `POLICY_EXPULSION_SCOPE` municipality. A timer `${osid}|RBiH` with `cause: 'policy_expulsion'` is seeded; wave B timers start `POLICY_WAVE_B_DELAY_TURNS` (12) later.

| Wave (matures) | Municipality: share of the OSID's declared Bosniaks displaced | Source (Historian seat) |
|---|---|---|
| A (seed + 4; t54, mid-April 1993) | Vitez 0.50, Busovača 0.40, Kiseljak 0.40, Žepče 0.30, Gornji Vakuf 0.40, Jablanica 0.75 | Kordić TJ ¶646, ¶511; BB2 p.444; Prlić TJ (Gornji Vakuf, Sovići/Doljani) |
| B (seed + 16; t66, early July 1993) | Mostar 0.40, Stolac 0.75, Čapljina 0.75, Prozor 0.75, Ljubuški 0.50 | Prlić TJ v2 ¶¶814, 875, 922, 981, 1936, 277; Prlić TJ summary (Ljubuški) |
| Out of scope | Kakanj, Travnik, Bugojno, Fojnica, Konjic, Novi Travnik, Vareš, Orašje, Livno, Tomislavgrad | HVO lost these towns or the record is Croat flight (BB1 p.217); Vareš overlaps the ARBiH capture; joint HVO-ARBiH front in Posavina; no expulsion finding |

- **How much:** one wave per OSID of `floor(osidPop × bosniakShare × fraction)`, where `bosniakShare` counts **declared Bosniaks only** (the standing convention adds 1991 "others", largely Yugoslavs; the policy found by the court targeted the Muslim population). Pair kill share 3%; flight abroad per §5 (Bosniak 0.20; Čapljina and Stolac 0.40). Booked `caused_by` the holding faction. **No sustained drain** (Branch B skips policy timers). **No pass-through re-route**: the holder does not change, so people already sheltering in the municipality are not moved on (§10.6; panel Calibration C1: re-routing handed HRHB ~12k reserve manpower).
- **Clears:** a recapture by the expelled side, a third side's capture (the holder no longer holds the OSID; a flip-seeded timer replaces a stale policy timer), or a restored alliance, before the wave.
- **After the wave:** if a third side captures the OSID after the wave fired, the captor's timer (flip helper or battle capture) inherits the wave's `cumulative_displaced`; its initial wave takes its fraction of the community that remains (`floor(osidPop × hostileShare) − prior`) and its sustained drain stops at the same bound, so nobody is expelled twice (Codex review on #623). A recapture by the expelled side still deletes the timer, and a later capture starts from the census again; that reset is the standing behaviour for every timer (out-of-scope register).
- **Bright line:** the first wave that displaces anyone records one authorized war crime for the faction (`recordWarCrime`, `src/state/war_crimes_record.ts`, sole writer of `war_crimes_events_emergent`), guarded by event flag `hrhb_minority_policy_war_crime_recorded`. §2a condemnation (emergent mode only).
- **Changing it:** any change to the table, fractions, wave delay or target basis is its own measured change under the RF-5B §6 record; an RBiH entry needs a judicial finding and its own broader panel.
- **Known limits:** men were historically detained (Heliodrom, Dretelj, Gabela) but are displaced with families here (camps stay unmodelled, Ring 3 #2); no incoming Croats fill vacated homes; Stari Vitez (held out) shares the Vitez town OSID; Žepče fires ~10 weeks early (fighting began late June 1993) and Mostar's first round ~8 weeks late (9 May); Busovača and Gornji Vakuf January 1993 episodes predate the war start; Prozor October 1992 (~5k, outside the JCE) and Vareš (October 1993) are not seeded; flight-abroad shares are not tiered per the Historian (Ljubuški 0.50, west Mostar 0.30, Central Bosnia 0.10); the April wave comes without an HVO attack behind it (the HVO offensive is owner Option C, post-1.0). Survivors are routed by the standing tables, never inside their own municipality and without regard to front lines: West Mostar, Stolac and Čapljina expellees reach Jablanica and Konjic rather than East Mostar and Blagaj; Kiseljak's reach Travnik across HVO-held ground; Ljubuški's reach Zenica rather than going abroad via Croatia. The 3% kill share is applied in Herzegovina, where deaths during removal were about 1%; it stands in for unmodelled detention-camp deaths (Dretelj, Heliodrom, Gabela). The Humanitarian Ledger and `refugees_created` count killed and abroad twice for takeover-path events, policy waves included, because the takeover writer's `displaced` already contains them (pre-existing on main; out-of-scope register). The ledger figure therefore overstates the people moved by about 30%; the run 7 people figure is 27,839. The rule keys on `player_faction`, not the autonomy level: a campaign with a human HRHB, including Observer level 3, has no policy waves, so it shows fewer 1993 HVO expulsions than history and drifts from the calibration line; no surface may present that as restraint or a better outcome. A `player_faction` change mid-campaign leaves timers already seeded in place. Livno's supply population factor rises at t188 (0.91 to 1.00, because its 1992 Krajina refugees are not moved on once east Mostar holds Bosniak expellees); this is inert only because Livno has no production facility, and the B5 no-reward re-run must re-check it if one is added or local production gains another consumer.

### 3.5 Pocket fall (P0-A)

Owner: `processPocketFalls` (`src/state/pocket_fall.ts`), war step `pocket-fall`. Ruling: 8-seat broader bright-line §6 panel, unanimous 8/8 in round 3, 2026-11-25 (D1-D6, D12, D13), with the orchestrator's clarifications (i)-(iii) of 2026-11-25, which implement the ruling's own tests and add no new rule. Record: `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 (P0-A).

- **Slot:** right after `update-displacement`, so after every control writer (battle, takeover, event effects), in the same turn as the control write. A test checks that the firing turn equals the control-write turn. Sides and municipalities are walked in `strictCompare` order.
- **Trigger (stateless; no GameState counter):** for side X in municipality M, all of: X holds zero settlements in M; a stock exists; the B2 pass-through resolver (with P0-B, §10.6) gives X no destination. If the resolver gives one, the sheltered stock moves there instead: same body, no kill, no record. A body split cannot fire the step while X holds ground in M.
  - (iv) **The link at an own-enclave fall** (orchestrator clarification, 2026-11-25, part of the same tests): where M contains a Ring 1 `ENCLAVE_DEFINITIONS` settlement of X's enclave, the resolver tests the link from the enclave settlements X still holds there, which by the trigger is none. An enclave is a separate pocket, so no linked body is reachable and its people go to the main body or abroad (D4). Measured on the 188w pairs: testing from every settlement of the municipality, or from every listed enclave cell (some taken by RS in 1993), found a "destination" in another besieged pocket across RS-held ground (Srebrenica's cells touch Žepa, Rogatica's touch Goražde). That delayed Srebrenica's booking from t171 to t173 and kept Žepa from firing at all. Tests: the Žepa-shaped and Srebrenica-shaped cases in `tests/state/pocket_fall.test.ts`.
- **Stock:** X's sheltered people in M (`displaced_in_by_faction[X]`) plus X's original residents (its census share of the remaining residents, original − out − lost). The originals are scoped:
  - (i) only where M contains a Ring 1 `ENCLAVE_DEFINITIONS` settlement of an enclave whose faction is X (the ruling's own A3 enclave-definition test, applied to the originals). Measured on the B3 188w run at t188: without this scope the originals test matched 25 municipalities where X never held ground and nothing fell (for example Zenica for HRHB; Grude, Posušje and Neum for RBiH; Cazin for RS) and would have deported census-share minorities at t1.
  - (ii) a takeover timer `osid|X` in M blocks the originals only while it is pending (not yet matured) or dormant; then the takeover writer keeps the originals and the step takes the sheltered stock only. A matured timer does not block, because its wave is already booked in `displaced_out`. So Žepa fires (red-team case X2): Srebrenica and Rogatica both carry matured RBiH timers from the 1992-93 combat captures.
  - (iii) **booked once per municipality and side; a second turn finds stock 0.** The optional marker `DisplacementState.pocket_fall_originals_booked_by_side[X]` (the turn of the booking; absent until then; old saves load) is written and read only by `pocket_fall.ts`, never by score, credit, the Ledger or any other reader. Without it the census share of the remaining residents would take a new slice every week. Srebrenica's booking never blocks Žepa's.
  - The captor's own residents and sheltered people are never touched (Rogatica's RS-sheltered stay).
- **Killed:** only where M contains a Ring 1 `ENCLAVE_DEFINITIONS` settlement of X's enclave: killed = `ASSAULTED_POCKET_FALL_KILL_RATIO` (0.19) × the stock (source and scope in §10.1). Every other firing books killed 0; its stock is "left" and "fled abroad" only.
- **Negotiated fall:** the authored `zepa_falls_1995` event also sets the flag `zepa_negotiated_evacuation` (authored event data only, never computed; the same mechanism as `srebrenica_fell`; no schema change; it enables no Ring-3 event). The step reads it in the same turn and records killed as "not recorded" (`null`), never 0 (UN A/54/549 para 431: 118 unaccounted for). Without the flag a fall counts as assaulted.
- **Routing:** the survivors (stock − killed) go to X's supplied main body (A5's destination list, §3.3) within receiving capacity (§4.3). Overflow is booked as `fled_abroad`, never left in place. Conservation: killed + left = the stock taken, where left = routed + fled abroad.
- **No credit:** the survivors are ordinary displaced people with no recruitment bonus. There is no pacification effect, no score term, no condemnation or penalty input, and no manpower or territory credit to the captor; RS recruitment loses the stock (`VICTORY_AND_PYRRHIC_SCORING.md` §3.2).
- **Record:** write-only `state.displacement.pocket_fall_records` (`PocketFallRecord`: turn, `mun_id`, side, captor, left, routed, fled_abroad, killed or `null`, negotiated, reason `pocket_fall`), kept sorted by (turn, `mun_id`, side), aggregates attributed to the captor's forces, no age or sex split. Display only: the Humanitarian Ledger column "Left the enclave" and the enclave card. Nothing in the simulation reads it (source-scan test). It does NOT go through `appendDisplacementEvent`, `displacement_humanitarian_aggregates` or `civilian_casualties`, which feed scoring, capital and reconstitution Path B (`displacement_origin_dest_arrivals`).
- **Formations:** losses stay in `casualty_ledger`. The step touches civilians only, never re-slots formations, and leaves military personnel unchanged; the Žepa formation set stays disbanded.
- **Firing census:** zero firings before t100 unless each is listed and ruled; every originals-branch firing, and any firing outside Srebrenica and Žepa, is listed and ruled.
- **Tests:** `tests/state/pocket_fall.test.ts`, `tests/pocket_fall_records_write_only.test.ts`.

### 3.6 Negotiated evacuation (P1)

Owner: the convoy rule inside `updateDisplacement` (`src/state/displacement.ts`), war step `update-displacement`, run per municipality after every side's siege trickle (§3.3), so no war step is added and the trickle is unchanged. This implements the 8-seat broader bright-line §6 panel's unanimous ruling D9 (2026-11-25) and the orchestrator's binding on it (named constants with sources); it adds no rule of its own. Record: `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 (P1).

- **Opens** for side X's people in municipality M when all hold, every term read from state that turn:
  - (a) **separate:** X's ground in M is a territorial body cut off from X's main body, by B3's test (`siegeLeaversReachMainBody` false: no linked main body, no sourced crossing, §3.3 and §10.3);
  - (b) **siege:** the A5 siege trigger holds for X in M (under front pressure and unsupplied for `UNSUPPLIED_PRESSURE_TURNS` = 3 consecutive turns; encirclement alone does not count);
  - (c) **at capacity:** M's people (original + in − out − lost) are at or above its receiving-capacity line, `floor(original × getReceivingCapacityFraction(M))` (§4.3: 1.5, Sarajevo area 1.1);
  - (d) **squeeze:** within the last `UNSUPPLIED_PRESSURE_TURNS` turns (this turn and the two before), a pressing side P took from X one of the pocket's own Ring 1 enclave cells, read from `political.control_events` (setup writes excluded). The pocket's own cells are M's settlements that belong to an `ENCLAVE_DEFINITIONS` enclave whose faction is X: the same static test as the pocket fall (`ownEnclaveSettlements`, shared in `src/state/own_enclave_settlements.ts`). A municipality with no such cell never meets (d), and a capture next to the pocket's body does not count. P is a side `resolvePressingFactions` names for X in M; with two, the heavier weight first (ties in canonical order);
  - **intent:** P holds a takeover timer against X's people with `cumulative_displaced` > 0 (any municipality), or `getDynamicHostileShare(M, X)` > 0 (X's people are present in M; `displacement_takeover.ts`, exported unchanged).
- **Episode:** `DisplacementState.negotiated_evacuation_by_side[X]` = `{ opened_turn, convoys, people, last_convoy_turn, refused_turn }`, optional (absent until first written; old saves load). It is created the first turn the full predicate (a)-(d) and intent opens, and deleted when (d) fails or X holds no ground in M. A new squeeze is a new episode. **(c) only opens an episode.** Each convoy week of an open episode re-checks (a), (b), (d) and intent, never (c). A week in which (a) or (b) fails runs no convoy but does not end the episode. At the cap the episode runs no more convoys and stays on record until (d) fails, so a continuing squeeze cannot open a second episode.
- **How D9's own text and tests are met (orchestrator rulings 2026-11-25, not a new rule).** The first P1 build re-checked (c) every week and counted any capture in M or next to the pocket's body. The 188w pair at `169d18bec` (both modes identical) measured convoys at Srebrenica t56 (3,000), Goražde t72 (3,000, where the ruling needs 0) and Pale's RBiH part t72 (325, not listed). Srebrenica's episode ended after one convoy because (c) went false the next week. **(c) opens only:** D9 replaced "closes the turn any condition fails" with "closes when (d) fails or the episode cap is reached", and a convoy itself drops the pocket below its line, so re-checking (c) would end every episode after its first convoy. **(d) counts own enclave cells only:** one enclave test serves P0-A and P1, with no new constant and no named place, and Goražde had no mass convoy in 1993.
- **Convoy:** at most one a week (`last_convoy_turn`), at most `NEGOTIATED_EVACUATION_CONVOY_MAX` = 3,000 people, never past `NEGOTIATED_EVACUATION_EPISODE_CAP` = 9,000 people an episode. Load = min(3,000, cap left, X's sheltered stock in M + X's residents there by the siege path's census share). Sheltered people board first, then residents. Destinations: X's supplied main body only (A5's list, `buildSiegeDestinationsBySide`), within receiving capacity, in the siege path's route order with P as the causer. Only people with a place to go board; the rest stay. **Conservation:** people leaving M = people arriving in the main body; no kill, no flight abroad, no overflow. The rule closes when (d) fails or the cap is reached; there is no UN safe-area close.
- **Constants** (`src/state/displacement_loss_constants.ts`; rule bounds, not scripted populations; the calibration pass may revisit them): `NEGOTIATED_EVACUATION_EPISODE_CAP` = 9,000 (Krstić TJ IT-98-33-T para 16; UN SG report A/54/549 paras 39-40, the convoys moved about 8,100 in all; Tolimir TJ about para 176, "approximately 8,000 to 9,000" by the end of April 1993). `NEGOTIATED_EVACUATION_CONVOY_MAX` = 3,000 (A/54/549 para 40: the 14-truck loads were 2,100-3,000 people, mean about 1,700). No date, no place name and no population is written into the rule.
- **Evacuees are ordinary displaced people:** sheltered evacuees move like the B2 pass-through (out of M's `displaced_in`, into the destination's), residents add to M's `displaced_out`. No recruitment bonus, no credit to the besieger, never counted as killed. Pools follow the usual recruitment ceiling (§8.2).
- **Record:** write-only `state.displacement.negotiated_evacuation_records` (`NegotiatedEvacuationRecord`: turn, `mun_id`, side, besieger, people, from_sheltered, from_residents, convoy number, episode total, reason `negotiated_evacuation`), kept sorted by (turn, `mun_id`, side), for the Humanitarian Ledger only. Nothing in the simulation reads it (source-scan test). Like the pocket fall (§3.5) it does NOT go through `appendDisplacementEvent`, the humanitarian aggregates or civilian casualties. Each convoy's routing rows carry reason `negotiated_evacuation` in the turn report.
- **Refusal (HISTORY IF LEFT ALONE, AGENCY IF PLAYED):** bots, staff and headless runs keep the historical default, ALLOW. A human RBiH president may refuse: `recordNegotiatedEvacuationRefusal(state, M, 'RBiH')` writes `refused_turn` on the open episode (false and no write without one, or for a side that is not a human RBiH). The rule reads a refusal only while RBiH is human-controlled (`player_faction` RBiH, not headless). It lasts until the episode ends, carries the siege cost (the people stay trapped) and earns nothing. **Decision surface (refusal card PR, 2026-11-25):** the RBiH president's Enclaves surface (`EnclaveDashboard.tsx`) shows each open episode of an own pocket on its enclave card: the people evacuated so far "with the consent of" the besieger (only when at least 1 is recorded), the cost line, and a secondary "Refuse further convoys" button with an inline confirm. The confirm sends IPC `refuse-negotiated-evacuation` (`electron-main.cjs`), which calls the hook; nothing else writes it, so a game nobody clicks in carries no refusal (silence = allow, live = headless). A refused episode shows the stopped line with the same cost; at the episode cap no decision is offered. The copy shows no saved or prevented figure and writes no Ledger, chronicle or inbox line. For Srebrenica only, the card notes that the government opposed the evacuations as contributing to the ethnic cleansing of the territory (Krstić TJ para 16; A/54/549 paras 39, 52) and that a local ban was not obeyed (A/54/549 para 40); the sources cover no other pocket. The renderer projection (`player_visible_state.cjs`) passes the player's own episodes and convoy records only. The Humanitarian Ledger gets no evacuation note: the convoys are not in its tables (ruling 6).
- **Turn report:** `DisplacementStepReport.negotiated_evacuation`, one row per separate pocket and per pocket with an open episode: (a)-(d), the enclave cells captured in the window (`squeeze_cells`, `osid@turn`), the besieger, intent, open (the opening predicate), convoy week (an open episode with (a), (b), (d) and intent), refused, cap reached, this week's convoy and the episode total. Report only, never GameState.
- **Tests:** `tests/state/negotiated_evacuation_p1.test.ts` (the Goražde-shaped predicate first, with (d) false for a capture outside the enclave cells; then the convoy rules, a Srebrenica-shaped three-convoy episode ending at exactly 9,000 with (c) true only in its first week, a (b)-false week that keeps the episode, and a Pale-shaped municipality that never opens), `tests/negotiated_evacuation_write_only.test.ts`.

## 4. Routing System

### 4.1 Architecture

**File:** `src/state/displacement_routing_data.ts`

Routing is organized by **8 geographic regions** × **3 ethnicities** (Bosniak/Croat/Serb), with sub-regional routing for finer granularity. Canon: Systems_Manual_v0_9_0.md §12.1.

**Lookup:** `getDisplacementRouteForMun(originMun, ethnicity)` → ordered list of destination municipalities

**Routing order at camp reroute time** (`displacement_takeover.ts:getRoutingOrder()`):
1. **Primary route** from per-municipality routing table
2. **Fallback routes** from `FALLBACK_ROUTES_BY_FACTION`
3. **Large urban municipalities** from `LARGE_URBAN_MUN_IDS`

All three are concatenated and deduplicated (first occurrence wins).

### 4.2 Runtime Validation

Each destination in the routing order must pass **all three checks:**
1. **Faction-controlled:** destination municipality has ≥1 OSID controlled by the displaced person's faction
2. **Brigade present:** `factionHasBrigadeInMunicipality()` confirms a friendly brigade is located there
3. **Below receiving capacity:** current population < `original_population × receivingCapacityFraction`

If a destination fails any check, it is skipped and the next destination in order is tried.

### 4.3 Receiving Capacity

| Municipality Type | Capacity Fraction | Meaning |
|-------------------|-------------------|---------|
| Standard | `1.50` (150% of pre-war pop) | `DISPLACEMENT_RECEIVING_CAPACITY_FRACTION` |
| Sarajevo area (9 muns) | `1.10` (110% of pre-war pop) | `SARAJEVO_SIEGE_RECEIVING_CAPACITY_FRACTION` |

**Sarajevo area municipalities:** centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo, ilidza, hadzici, vogosca, ilijas, trnovo

When a destination is at capacity, overflow routes to the next municipality in the routing order.

### 4.4 Fallback Routes

When per-municipality routing is exhausted or no route is defined:

| Faction | Fallback Destinations |
|---------|----------------------|
| RBiH | tuzla, zenica, travnik, gorazde, srebrenica, centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, bihac |
| RS | banja_luka, bijeljina, doboj, prijedor, zvornik, brcko |
| HRHB | mostar, livno, travnik, brcko |

### 4.5 Routing Tables

#### Bosniak Routes (19 sub-regions)

| Sub-Region | Destinations |
|------------|--------------|
| KRAJINA_NORTHWEST | travnik, jajce, zenica, bihac |
| KRAJINA_BANJALUKA | travnik, jajce, tesanj, zenica, tuzla |
| KRAJINA_WEST | bihac, cazin, velika_kladusa |
| KRAJINA_POSAVINA | doboj, tesanj, tuzla, zenica |
| KRAJINA_KOTOR | travnik, tesanj, zenica, tuzla |
| KRAJINA_MOUNTAIN | jajce, travnik, bugojno, zenica |
| POSAVINA_BIJELJINA | kalesija, zivinice, tuzla, srebrenik |
| POSAVINA_BRCKO | gradacac, srebrenik, tuzla |
| POSAVINA_SAMAC | gradacac, gracanica, tuzla |
| POSAVINA_DOBOJ | tesanj, maglaj, zenica, tuzla |
| POSAVINA_DERVENTA | tesanj, doboj, tuzla, zenica |
| POSAVINA_BROD | tesanj, doboj, zenica |
| DRINA_NORTH | srebrenica, kalesija, tuzla, kladanj |
| DRINA_SOUTH | gorazde, centar_sarajevo, zenica |
| DRINA_SEKOVICI | kladanj, olovo, tuzla |
| SARAJEVO_RS_HELD | centar_sarajevo, stari_grad_sarajevo, novo_sarajevo, novi_grad_sarajevo, hadzici, visoko, zenica |
| CENTRAL_BOSNIA | travnik, zenica, kakanj, visoko |
| HERZEGOVINA | jablanica, konjic, zenica, travnik |
| HERCEG_EAST | gorazde, centar_sarajevo |
| BIHAC_EDGE | bihac, cazin, velika_kladusa |


Known limit (A8, 2026-11-24): both writers fill a route first-fit, each destination up to its cap, so arrivals concentrate in list order and a later-listed municipality receives only overflow. SARAJEVO_RS_HELD lists RBiH-held Novo Sarajevo before Novi Grad: with Novi Grad first, Novo Sarajevo received 0 arrivals over 188 weeks, a modelling artefact of list order. Novi Grad now receives later. DRINA_SOUTH and HERCEG_EAST name only centar_sarajevo in the city and are unchanged (an open limit).

#### Croat Routes (15 sub-regions)

| Sub-Region | Destinations |
|------------|--------------|
| KRAJINA_ALL | livno, kupres, mostar, capljina |
| KOTOR_VAROS | travnik, vitez, kiseljak, mostar |
| POSAVINA_ORASJE | orasje |
| POSAVINA_REST | orasje, gradacac |
| DOBOJ_AREA | tesanj, zepce, travnik |
| CENTRAL_BOSNIA_LASVA | kiseljak, kresevo, mostar, livno |
| CENTRAL_BOSNIA_JAJCE | livno, mostar |
| CENTRAL_BOSNIA_KUPRES | livno, duvno, mostar |
| CENTRAL_BOSNIA_PROZOR | mostar, jablanica |
| KAKANJ_BREZA | kiseljak, fojnica, travnik, vitez |
| ZENICA_TRAVNIK | novi_travnik, vitez, busovaca, kiseljak |
| TESANJ_MAGLAJ | zepce, travnik |
| VARES | kiseljak, fojnica, busovaca |
| SARAJEVO | kiseljak, fojnica, travnik, mostar |
| BUGOJNO_GORNJI_VAKUF | gornji_vakuf, prozor, livno, mostar |

#### Serb Routes (12 sub-regions)

| Sub-Region | Destinations |
|------------|--------------|
| TUZLA_AREA | bijeljina, lopare, doboj, banja_luka |
| MAGLAJ_TESANJ | doboj, teslic, banja_luka |
| ZENICA_KAKANJ | ilijas, pale, doboj, banja_luka |
| TRAVNIK | skender_vakuf, mrkonjic_grad, banja_luka |
| EAST_CORRIDOR | vlasenica, han_pijesak, bijeljina, zvornik |
| SARAJEVO | pale, sokolac, han_pijesak, rogatica |
| MOSTAR | nevesinje, gacko, trebinje, bileca |
| LIVNO | glamoc, bosansko_grahovo, banja_luka |
| KONJIC | kalinovik, foca, pale |
| BIHAC_POCKET | bosanski_petrovac, kljuc, banja_luka, prijedor |
| CENTRAL_BOSNIA | mrkonjic_grad, sipovo, banja_luka |
| VARES | ilijas, sokolac, pale, banja_luka |

---

## 5. Loss Fractions

### 5.1 Standard Loss Constants

**File:** `src/state/displacement_loss_constants.ts`

| Constant | Value | Meaning |
|----------|-------|---------|
| `DISPLACEMENT_KILLED_FRACTION` | Per-faction (see below) | **OVERHAULED n905 (2026-03-18).** No longer uniform. RBiH displaced by RS = 4%, HRHB displaced by RS = 1%, RS displaced by non-RS = 1%, default = 2%. Was 0.04 uniform. See `getDisplacementKillFraction()` in `displacement_loss_constants.ts`. |
| `FLEE_ABROAD_FRACTION_RS` | 0.30 | 30% of surviving displaced Serbs leave BiH (range 0.25-0.40; ICTY OTP floor 0.23) |
| `FLEE_ABROAD_FRACTION_HRHB` | 0.40 | 40% of surviving displaced Croats leave BiH (was 0.25; range 0.30-0.55) |
| `FLEE_ABROAD_FRACTION_RBIH` | 0.20 | 20% of surviving displaced Bosniaks leave BiH (was 0.00; range 0.15-0.30) |

Sources: ICTY OTP demographic report (Tabeau, Bijak et al., 2003, 47 municipalities, OSCE voters register 1997-98) and host-country figures at Dayton (about 1.2 million abroad: Germany about 320,000, FRY about 250,000, Croatia about 170,000). The OTP shares (Muslims 48%, Croats 78%, Serbs 23%) are registrations after onward migration, so the shares at the moment of displacement are lower in the east and the defaults sit below them.

### 5.2 Special Cases

| Constant | Value | Location | Meaning |
|----------|-------|----------|---------|
| `POSAVINA_CROAT_FLEE_ABROAD` | 0.70 | `displacement_takeover.ts` | Posavina Croats: 70% flee to Croatia |
| `KRAJINA_BOSNIAK_FLEE_ABROAD` | 0.55 | `displacement_takeover.ts` | Krajina Bosniak convoys (ICRC/UNHCR to Croatia): 55% (was 0.35) |
| `BOSNIAK_EAST_SARAJEVO_RING_FLEE_ABROAD` | 0.08 | `displacement_takeover.ts` | Bosniaks from eastern Bosnia and the Sarajevo ring: 8% (expellees went into Srebrenica, Žepa, Goražde, Sarajevo, Tuzla) |
| `BOSNIAK_EXIT_FLEE_ABROAD` | 0.40 | `displacement_takeover.ts` | Bosniaks from Bijeljina, Posavina, Čapljina, Stolac (exits toward Serbia and Croatia): 40% |
| `BILATERAL_HRHB_FLEE_ABROAD` | 0.35 | `displacement_takeover.ts` | Croats displaced by RBiH: 35% |
| Drina enclave falls | 0 | `displacement_takeover.ts` | Nobody goes abroad when Srebrenica, Goražde or Žepa falls; those forcibly transferred went to Kladanj and Tuzla (Krstić TJ) |
| `ENCLAVE_OVERRUN_KILL_FRACTION` | 0.19 | `displacement_takeover.ts` (= `ASSAULTED_POCKET_FALL_KILL_RATIO`, `displacement_loss_constants.ts`) | Srebrenica/Gorazde/Zepa overrun: 19% killed (was 0.35; sourced and unified with the pocket-fall step, §10.1) |

The former Bosniak border override (0.10) is deleted. Siege-path departures carry no flight abroad at all. No-census municipalities split by the national 1991 sums (`census_fallback_national`); the former `LOST_POPULATION_FRACTION` (0.20) was removed in SC2.

### 5.3 Loss Calculation Order

For each displacement event:
1. Compute `displacementAmount` from trigger
2. `killed = floor(displacementAmount × killFraction)` (per-faction rate via `getDisplacementKillFraction()`, or 19% for enclave overrun, §10.1)
3. `survivors = displacementAmount - killed`
4. `fledAbroad = floor(survivors × fleeAbroadFraction)` (per people, with regional overrides in §5.2; 0 when a Drina enclave falls)
5. `routedToCamp = survivors - fledAbroad` (enters camp state machine)
6. Record `killed` and `fledAbroad` in `state.civilian_casualties`

### 5.4 Posavina Municipalities (70% Croat Flee-Abroad)

brcko, bosanski_samac, odzak, orasje, gradacac, derventa, modrica, bosanski_brod, bosanska_gradiska, doboj, bijeljina

---

## 6. Camps and Timers — The State Machine

### 6.1 Lifecycle

```
War Start → Seed ALL OSIDs with timers (Step 0)
   OR
Battle → OSID Flips → Timer Starts (Step 1)
                                |
                    Timer key: ${osid}|${fromFaction}
                          4 turns wait
                                |
                    ┌── Timer Matures (Step 2) ──┐
                    │                             │
             Branch A: Initial               Branch B: Sustained
             (matured_turn set,              (each subsequent turn)
              cumulative = amount)
                    │                             │
     Per-OSID displaced =                  remainingMinority =
     min(osidPop×share, pop)               initial - cumulative
                    │                      (starts from initial fire)
        ┌───────┴────────┐                        │
        │                │                3% of remaining per turn
        │                │                        │
  Native pop      Displaced-in             Kill/flee pipeline
        │         (pass-through)                  │
  Kill 10%        Zero casualties          Direct route to
  Flee-abroad     Re-route                 friendly municipalities
  → Camp                                   (no camp intermediate)
        │                                         │
   4 turns wait                            5% → militia pool
        │
   Camp Routes Out
        │
   Route to destinations
        │
   5% → militia pool

Sustained displacement continues until:
  - OSID recaptured by displaced faction
  - Factions no longer at war
  - Remaining minority < 10 persons
```

### 6.2 Timer State

```typescript
interface HostileTakeoverTimerState {
    mun_id: MunicipalityId;
    from_faction: FactionId;    // faction losing population
    to_faction: FactionId;      // faction gaining control
    started_turn: number;       // turn timer began
    matured_turn?: number;      // set when initial displacement fires (undefined = still in countdown)
    cumulative_displaced?: number; // total persons displaced from this OSID (initial + sustained)
    cause?: 'policy_expulsion';    // RF-5B: seeded by the minority-expulsion policy (§3.4); one wave, no Branch B
}
```

**Key format:** `${osid}|${fromFaction}` (e.g., `op:zenica:zenica_1|RS`)
- Supports multiple timers per OSID (one per displaced ethnicity)
- Timer keys are stored in `state.hostile_takeover_timers: Record<string, HostileTakeoverTimerState>`

**Created by:**
1. War-start seeding (Step 0): one timer per minority faction per OSID, at `warStartTurn + 1` (first executed war turn)
2. Battle-driven flips (Step 1): one timer per flip, keyed by `${battle.osid}|${fromFaction}`
3. Policy expulsion (Step 0b, RF-5B): once per bot faction with a policy, `cause: 'policy_expulsion'` (§3.4); deleted, never fired, when the holder loses the OSID

- Only created when factions are at war (`areFactionsAtWar()`)
- Existing timer for same key is not overwritten (first-come wins)
- After initial maturation: timer stays alive with `matured_turn` set (enters sustained mode)
- Deleted when: OSID recaptured, factions not at war, or remaining minority < 10

### 6.3 Camp State

```typescript
interface DisplacementCampState {
    mun_id: MunicipalityId;
    population: number;          // total camp population
    started_turn: number;        // turn camp was created
    by_faction: Partial<Record<FactionId, number>>;  // per-ethnicity breakdown
}
```

- Created when timer matures and survivors > 0
- Routes after `CAMP_REROUTE_DELAY_TURNS = 4` turns
- Each ethnicity routes independently using its own routing table
- Camp deleted when population reaches 0
- Multiple timers can feed into the same camp (populations accumulate)

### 6.4 Event Log

```typescript
interface DisplacementEvent {
    turn: number;
    origin_mun: MunicipalityId;
    origin_osid?: string;        // optional OSID-level tracking
    dest_mun: MunicipalityId;
    dest_osid?: string;          // optional OSID-level tracking
    ethnicity: FactionId;
    displaced: number;           // people displaced from origin
    killed: number;
    fled_abroad: number;
    settled: number;             // people settled at destination
}
```

Two events are logged per displacement cycle:
1. **Origin event** (timer maturation): `displaced > 0, settled = 0`
2. **Arrival event** (camp reroute): `displaced = 0, settled > 0`

Events are sorted by `(turn, origin_mun)` for deterministic ordering.

---

## 7. GameState Fields

All displacement-related fields on `GameState` (`src/state/game_state.ts`):

| Field | Type | Purpose |
|-------|------|---------|
| `displacement_state` | `Record<MunicipalityId, DisplacementState>` | Per-municipality population tracking |
| `hostile_takeover_timers` | `Record<string, HostileTakeoverTimerState>` | Active takeover timers (keyed by `${osid}\|${fromFaction}`) |
| `displacement_camp_state` | `Record<MunicipalityId, DisplacementCampState>` | Active camps awaiting reroute |
| `displacement_event_log` | `DisplacementEvent[]` | Per-turn event buffer; streamed/aggregated, then cleared at end of turn |
| `displacement_humanitarian_aggregates` | `Record<string, Record<string, {...}>>` | Cumulative caused-by / receiver humanitarian totals |
| `displacement_origin_dest_arrivals` | `Record<string, Record<string, number>>` | Cumulative origin-municipality/ethnicity to destination-municipality settled totals |
| `displacement_recent_by_turn` | `Record<number, number>` | Per-turn refugee-created totals for cosmetic 4-turn war-dispatch windows |
| `minority_flight_state` | `Record<SettlementId, MinorityFlightStateEntry>` | Per-settlement gradual flight tracking |
| `civilian_casualties` | `Record<FactionId, { killed, fled_abroad }>` | Aggregate civilian loss counters |
| `negotiated_evacuation_records` | `NegotiatedEvacuationRecord[]` | A9 P1: write-only convoy records for the Humanitarian Ledger (§3.6) |

### 7.1 DisplacementState (per municipality)

```typescript
interface DisplacementState {
    mun_id: MunicipalityId;
    original_population: number;     // immutable baseline
    displaced_out: number;           // cumulative, irreversible
    displaced_in: number;            // cumulative arrivals
    displaced_in_by_faction?: Partial<Record<FactionId, number>>;  // arrivals by ethnicity
    lost_population: number;         // killed + fled abroad
    last_updated_turn: number;
    displaced_out_by_osid?: Record<string, number>;   // OSID-level origin tracking
    displaced_in_by_osid?: Record<string, number>;    // OSID-level destination tracking
    unsupplied_pressure_by_side?: Partial<Record<FactionId, { turns: number; last_turn: number }>>;  // siege counter per holding side, with the turn last counted
    siege_outflow_carry_by_side?: Partial<Record<FactionId, number>>;  // A6: integer ppm siege-outflow remainder per holding side, in [0, 1e6), absent when zero
    negotiated_evacuation_by_side?: Partial<Record<FactionId, NegotiatedEvacuationEpisode>>;  // A9 P1: open convoy episode per people (§3.6)
}
```

**Key invariant:** `displaced_out` only increases. Once people are displaced, they never return to origin.

**Effective remaining population:** `original_population - displaced_out - lost_population + displaced_in`

---

## 8. Recruitment Integration

### 8.1 Militia Pool Contribution

When displaced people are routed to a destination municipality, a fraction enters the local militia pool:

| Constant | Value | Meaning |
|----------|-------|---------|
| `REINFORCEMENT_RATE_ACUTE` | 0.04 | 4% of routed displaced become militia manpower (first 8 weeks) |
| `REINFORCEMENT_RATE_SUSTAINED` | 0.01 | 1% (after 8 weeks) |
| `DISPLACED_CONTRIBUTION_CAP` | 800 | Maximum contribution per mun per turn from displaced |

**Calculation:** `contribution = min(floor(routedAmount × rate), 800)` where rate depends on war week (acute vs sustained phase)

Added to `state.militia_pools[poolKey].available` where `poolKey = militiaPoolKey(targetMun, faction)`.

### 8.2 Source Depletion

When displacement occurs at origin, the source municipality's militia pool is reduced proportionally:

```
ratio = displacementAmount / currentPopulation
reduction = floor(pool.available × ratio)
pool.available = max(0, pool.available - reduction)
```

This ensures that displaced municipalities lose both civilian population and military recruitment capacity.

---

## 9. Alliance and War-State Guards

### 9.1 At-War Check

`areFactionsAtWar(a, b)` in `displacement_takeover.ts`:

- Different factions are always at war **except** RBiH-HRHB pair
- RBiH-HRHB are at war only when:
  - `state.meta.turn >= state.meta.rbih_hrhb_war_earliest_turn` AND
  - `state.war_alliance_rbih_hrhb <= RBIH_HRHB_ALLIED_THRESHOLD (0.20)`

### 9.2 Impact

When RBiH-HRHB are **allied** (alliance > 0.20):
- No hostile takeover timers created between RBiH and HRHB
- No minority flight between RBiH and HRHB territories
- Their populations coexist without displacement triggers

---

## 10. Special Cases

### 10.1 Enclave Overrun

**Municipalities:** srebrenica, gorazde, zepa

When an enclave municipality is overrun (from_faction = RBiH, to_faction != RBiH):
- Kill fraction rises from the standard per-pair fraction (§5.1) to **19%** (`ENCLAVE_OVERRUN_KILL_FRACTION` = `ASSAULTED_POCKET_FALL_KILL_RATIO`, `displacement_loss_constants.ts`)
- Models the historical high-lethality events (Srebrenica genocide)
- Flight abroad: **0** (those forcibly transferred went to Kladanj and Tuzla)

**One sourced rate for both writers (A9 P0-A, 8-seat §6 ruling D3, unanimous 8/8, 2026-11-25).** `ASSAULTED_POCKET_FALL_KILL_RATIO` = 0.19 is derived from Srebrenica: the Trial Chamber's 7,000-8,000 killed (Krstić TJ IT-98-33-T para 84) over about 40,000 people, where 40,000 is a PARTY figure (prosecution 38,000-42,000, para 592; defence 40,000, para 593); 7,500 / 40,000 is about 0.19. It is a modelled consequence, not a body count. It is attributed to the captor's forces and feeds no score, no §2a flag and no `war_cost_index`. The 7,000-8,000 band is a sanity check on a run, never a target to calibrate towards. Two writers read it:
1. **The takeover writer's combat overrun of an enclave** (`getTakeoverKillFraction` with `isEnclaveOverrun`, `displacement_takeover.ts`: a timer maturing in srebrenica, gorazde or zepa, RBiH people taken by a non-RBiH captor), in the initial wave and the sustained drain (§10.7). It was 0.35, with no source, and is unified onto the same constant in the P0-A change, so the same population is never killed at two rates depending on whether it was sheltered or resident. **Reach (measured, P0-A pair p0a3 against p0b, 2026-11-25).** This writer is not limited to the 1995 falls. It applies to every takeover row of RBiH people in Srebrenica and Goražde municipalities across the war, from the 1992 village captures on. The unification lowered those rows' killed from 4,929 to 2,522 (−2,407; the same people are displaced instead), and the run differs from t5. The writer books nothing at the 1995 falls themselves; those are the pocket-fall step's. The `zepa` entry is not a municipality id (Žepa lies in Rogatica), so Rogatica never reads this rate.
2. **The pocket-fall step** (§3.5), on the stock it takes where the municipality contains a Ring 1 `ENCLAVE_DEFINITIONS` settlement of the falling side's enclave, whether the last settlement fell by combat or by an event control write (§10.8). Its overflow beyond receiving capacity is booked as fled abroad (§3.5).

No hands-off run has a combat enclave overrun, so the unification is expected to be hash-neutral; the P0-A pair is the proof.

### 10.2 Posavina Croats

**Municipalities:** brcko, bosanski_samac, odzak, orasje, gradacac, derventa, modrica, bosanski_brod, bosanska_gradiska, doboj, bijeljina

- Flee-abroad fraction: **70%** (vs standard 40% for Croats)
- Models the historical pattern where Posavina Croats overwhelmingly fled to Croatia

### 10.3 Sarajevo Siege

**Municipalities:** centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo, ilidza, hadzici, vogosca, ilijas, trnovo

- Receiving capacity capped at **110%** of pre-war population (vs 150% standard)
- Models siege conditions limiting absorption of refugees

**The airport crossing (A9 B3, 8-seat §6 ruling D10b, unanimous 2026-11-25).** Government-held Sarajevo (Centar, Stari Grad, Novi Grad, Novo Sarajevo, `vogosca:hotonj`) is a territorial body separate from RBiH's main body in all 188 weeks of a hands-off run; after t2 RBiH holds no Ilidža, Hrasnica, Butmir or airport cell. Under B3 (§3.3) a separate pocket's siege leavers are trapped, but the A5 rate itself is sourced to government-held Sarajevo's outflow after 1992 (UNCOE S/1994/674/Add.2 Annex VI; Tabeau), and that outflow left across the airport runway: the BiH authorities issued permits, 80-300 people a night in some periods, under SRK fire (Galić TJ IT-98-29-T paras 411-413, fn 1448). So the routing data lists exactly one sourced crossing, `POCKET_CROSSINGS` in `displacement_routing_data.ts`: `sarajevo_airport_crossing`, keyed by its Sarajevo-side settlement (`op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo`, Dobrinja's end), never by date. While RBiH holds that settlement in the leavers' own body, the body's leavers go to A5's main-body supplied list at the existing rate; there is no new number. The far end is "the main body, supplied", not a settlement. The leavers never feed the 1st Corps pool that week (they go to the main body). The Dobrinja-Butmir tunnel is not listed: its civilian scale is not sourced (supply only). The Ledger never presents the crossing as a player-run evacuation. Measured receipt: Sarajevo's weekly outflow rows equal B2's.

### 10.4 Dynamic Hostile Share

`getDynamicHostileShare()` computes the ethnic share of the displaced faction from 1991 census data. A uniform cap is applied:

```typescript
hostileShare = Math.min(getDynamicHostileShare(...), 0.80);
```

No per-faction overrides. All faction pairs use the same 0.80 cap. This replaced earlier per-pair modifiers (RS→RBiH was 0.30×, others were min 0.80) which suppressed Serb displacement unrealistically.

### 10.5 OSID-Based Ethnic Displacement

When a faction captures an OSID and holds it for 4 weeks (timer maturation), it expels the **enemy-aligned ethnic population** of that OSID — not a flat percentage of total OSID population.

The computation:

```typescript
// 1. Per-OSID population = municipality total / OSID count (equal split)
const osidCount = osidCountByMun.get(munId) ?? 1;
const osidPop = Math.floor(dispState.original_population / osidCount);

// 2. Ethnic share of the expelled faction (from 1991 census)
//    e.g., if RS captures OSID → fromFaction = 'RBiH' → hostileShare = Bosniak %
let hostileShare = getDynamicHostileShare(munId, fromFaction, dispState, population1991ByMun);
hostileShare = Math.min(hostileShare, 0.80);  // cap at 80%

// 3. Displacement amount = ethnic population of that OSID
const displacementAmount = Math.min(Math.floor(osidPop * hostileShare), remainingPop);
```

**Example:** RS captures 1 of 11 OSIDs in Prijedor (pop 112,543, 44% Bosniak). Per-OSID pop = 10,231. Bosniak share = 0.44. Displacement = floor(10,231 × 0.44) = 4,501 Bosniaks expelled from that OSID. Of those: kill fraction applied per-faction (RBiH displaced by RS = 4%, i.e. ~180 killed), remainder routed to camps then to friendly municipalities. RS must hold the OSID for 4 continuous weeks before displacement fires.

### 10.6 Re-Displacement Pass-Through

When a municipality that has received displaced people (`displaced_in > 0`) is itself taken over:
1. **Native population** is displaced normally (with kill/flee fractions)
2. **Already-displaced people** (`displaced_in_by_faction`) are re-routed to new friendly municipalities
3. Re-routing applies **zero casualties** and **zero flee-abroad** — these people were already counted once
4. This prevents double-counting: a person displaced twice counts as 1 displaced person total

**When it runs (A9, SD13, broader bright-line panel round 1, 2026-11-24):** the pass-through runs only when the capture leaves the captor as the municipality's majority holder (`getMunicipalityController`, `src/sim/early_war/control_strain.ts`: majority of OSIDs, strictCompare tie-break). A capture of an outlying settlement that does not change the municipality's holder moves no sheltered group. Before A9, any single matured capture moved every non-captor group out of the whole municipality. The policy-wave rule (RF-5B) and the captor's-own-group rule (A4) are unchanged.

**Reachability (A9 B2, owner rulings 2-3 of 2026-11-24, inside the round-1 A5b shape).** `buildPassThroughDestinationResolver` (`displacement.ts`) reads this turn's territorial bodies and supply when the first pass-through fires. A group whose side still holds a supplied settlement in the municipality stays (a held, supplied pocket is never emptied by a rule). Any other group goes only to ground its side holds in a body linked to the source: the body of its own settlements there, or a body next to one of the municipality's settlements. With none reachable it stays. Measured: the cross-line pass-through rows fell from 9 (34.1k people) to 0.

**Zero ground (A9 P0-B, 8-seat §6 ruling D7, unanimous 2026-11-25).** When the side holds no settlement in the municipality, linked ground qualifies without the supply requirement; receiving capacity still applies. The step runs after every control writer, so a group is never moved onto ground that falls the same turn. It is not booked as an evacuation. Trace (a) found the supply filter alone stranding Kiseljak's group at t74 (15.1k) and Kreševo's at t98 (2.2k). Tests: `tests/displacement_pass_through_reachability.test.ts`.

**Event falls (A9 P0-A).** An event fall (the `control_change` effect of a sensitive-history event, as at the 1995 Srebrenica and Žepa falls) seeds no takeover timer, so the pass-through never runs there. The pocket-fall step (§3.5), which runs after every control writer, handles the zero-ground case: where the resolver gives a destination it moves the sheltered stock there (same body, no kill, no record), and otherwise it takes the stock at the fall.

Known limit (A9): takeover-cohort destinations (the captured municipality's own residents) are not checked for reachability.

**Ledger line 1, "forced to move again" (§6 + §4 panels, `s6_ledger12`, 2026-11-25).** A write-only cumulative counter by people: `displacement.moved_on_at_capture_by_people[group] += floor(routed)` at the `capture_pass_through` report site, never an event, so it equals the sum of the pass-through report rows. Nothing in the simulation reads it (source-scan test); the Humanitarian Ledger shows it. Measured on post-B1 main (188w, both modes): 35 rows, 90,294 people (HRHB 3,101, RBiH 71,837, RS 15,356), with 0 week-level mismatches. B2 will remove the 9 cross-line rows and the line will fall with them; the copy does not change.

**Accounting invariant:** `Sum(displaced_out) = Sum(displaced_in) + Sum(camp_population)` — verified as exactly 0 in every run.

### 10.7 Sustained Displacement

After the initial 4-turn timer fires (Branch A), the OSID enters **sustained displacement mode** (Branch B). This models ongoing ethnic cleansing — historical patterns like Prijedor camps, Bijeljina forced expulsions, and Foča systematic terror were multi-month processes, not one-shot events.

**Constants:**
- `SUSTAINED_DISPLACEMENT_RATE = 0.03` — 3% of remaining minority per OSID per turn
- `SUSTAINED_MIN_REMAINING = 10` — stop when remaining minority falls below threshold

**Mechanic:**
1. Each turn after `matured_turn`, compute `remainingMinority = initialMinority - cumulative_displaced`
2. `sustainedAmount = floor(remainingMinority × 0.03)`, capped at municipality remaining population
3. Standard casualty pipeline: 10% killed (or 19% for enclave overrun, §10.1), flee-abroad fraction applied
4. Survivors route **directly** to friendly municipalities (no camp intermediate — sustained = civilian flight, not organized military evacuation)
5. 5% of routed population contributes to destination militia pools

**Lifecycle:**
- Timer stays alive with `matured_turn` set after initial fire
- Each subsequent turn: sustained displacement fires automatically
- Timer deleted when: OSID recaptured by `from_faction`, factions no longer at war, or `remainingMinority < 10`
- Recapture check uses `from_faction`: timer deleted when displaced faction regains control. Third-faction takeover continues sustained displacement.

**Per-OSID granularity:** Partial municipal control (e.g., Bratunac RS holds 4/8 OSIDs) naturally yields proportional sustained rate. Consistent with initial displacement model.

### 10.8 Enclave falls (Srebrenica, Žepa)

The 1995 Srebrenica and Žepa falls are event control writes (`control_change` effects of sensitive-history events; `SENSITIVE_HISTORY_DESIGN_GATE.md` §1), not combat captures.

**Defect before P0-A (measured).** The event writes control and touches no civilian state, and it seeds no takeover timer, so neither the takeover writer (§3.1) nor the pass-through (§10.6) runs there. On the B2 run Srebrenica kept 55.8k people after its t171 fall: the people of an enclave that had fallen stayed in it on the books.

**Since P0-A (8-seat §6 ruling, unanimous 8/8, 2026-11-25).** The pocket-fall step (§3.5) fires in the same turn as the event's control write, for the side that no longer holds any settlement in the municipality. It takes that side's sheltered stock and, at the side's own Ring 1 enclave, its original residents once (a matured 1992-93 RBiH timer does not block them; §3.5 (ii)). At an assaulted fall it books killed = 0.19 × the stock (§10.1); at the Žepa fall the authored flag `zepa_negotiated_evacuation` makes killed "not recorded", never 0. The survivors go to the side's supplied main body within capacity, overflow abroad, with no credit to the captor. The rupture `srebrenica_genocide_1995` and the `srebrenica_fell` record are unchanged; P0-A writes no control, so FORAWWV is unchanged.

**Pre-registered receipts (D13).** For each fallen pocket, at t(fall)-1, t(fall), +1, +3 and t188, in both modes, t(fall) taken from `control_events`: the component totals; killed + left = the stock taken; exactly one `pocket_fall` record per municipality and side; Rogatica's RS-sheltered stock untouched; military personnel unchanged by P0-A; the hash prefix equal to the previous pair's until the first firing; "not recorded" shown, never 0. Srebrenica stays within 36,000-46,000 at the pinned t170 snapshot (before its fall); Goražde at least 45,000 with 0 P0-A firings; Sarajevo 0 firings.

---

## 11. Diagnostic Checklist

### 11.1 Current State (n296, 40w)

| Metric | Value | Full-War Target |
|--------|-------|-----------------|
| Total displaced+lost | 333,592 | ~1M by Jan 1993 |
| RBiH killed | 21,481 | ~30K |
| HRHB killed | 9,218 | ~2K |
| RS killed | 2,604 | ~6K |
| RBiH displaced settled | 189,411 | — |
| HRHB displaced settled | 22,335 | — |
| RS displaced settled | 15,003 | — |
| Accounting (out-in-camp) | 0 | 0 |

### 11.2 Open Issues

1. ~~**HRHB killed too high (9.2K vs 2K full-war target)**~~ **RESOLVED n905 (2026-03-18):** Per-faction kill fractions implemented. HRHB displaced by RS = 1% (was 4% default). Croat civilian killed % now 8% (was 28%). See `getDisplacementKillFraction()` in `displacement_loss_constants.ts`.

2. **RS killed slightly low (2.6K vs 6K full-war target at 40w):** War-start seeding improved this from 2.1K to 2.6K. May reach target at 52w, or the 0.80 hostile share cap may still be too aggressive.

3. **Top municipalities by displaced_out** (n296): Prijedor 19.6K, Doboj 17.4K, Livno 17K, Bosanska Krupa 14.7K, Bugojno 9.8K — these align with historically displaced areas.

### 11.3 Resolved Issues

1. ~~Minority flight contributing 69% of displacement~~ → Disabled; only hostile takeover triggers displacement
2. ~~Municipality-based displacement inflating numbers~~ → Now OSID-based; capturing 1/7 OSIDs displaces 1/7 of population
3. ~~Double-counting from re-displacement~~ → Pass-through with zero casualties
4. ~~Serb displacement suppressed by 0.30× multiplier~~ → Uniform 0.80 cap for all factions
5. ~~Negative population municipalities~~ → Per-OSID remaining pop cap prevents overdraw (22 negative muns → 0)

### 11.4 Key Diagnostic Metrics

- `displaced_out` vs `displaced_in` per municipality (net flow)
- Kill/abroad totals by faction from `civilian_casualties`
- Camp occupancy over time (how many camps, how long they persist)
- Accounting invariant: `Sum(out) - Sum(in) - Sum(camp) = 0`
- Per-OSID timer count (war-start seeding creates O(OSIDs × factions) timers)

---

## 12. Source File Index

| File | Lines | Purpose |
|------|-------|---------|
| `src/state/displacement.ts` | ~1003 | Continuous pressure displacement; routing (BFS-based) |
| `src/state/displacement_takeover.ts` | ~550 | Hostile takeover: OSID-based timers, war-start seeding, timer→camp→route state machine, re-displacement pass-through |
| `src/state/minority_flight.ts` | (deleted 2026-06-09, #360) | Settlement-level minority flight, retired and removed; kept in this table as history |
| `src/state/displacement_routing_data.ts` | ~273 | Per-municipality per-ethnicity routing tables (19+15+12 sub-regions) |
| `src/state/displacement_state_utils.ts` | ~94 | Shared helpers: getOrInitDisplacementState, factionHasBrigadeInMunicipality, recordCivilianDisplacementCasualties |
| `src/state/displacement_loss_constants.ts` | ~30 | Kill/flee-abroad fractions (single source of truth) |
| `src/sim/phase_f/displacement_triggers.ts` | ~139 | Settlement-level displacement deltas (front pressure) |
| `src/state/game_state.ts` | (types) | DisplacementState, HostileTakeoverTimerState, DisplacementCampState, DisplacementEvent, MinorityFlightStateEntry |

### Pipeline Integration

**`TakeoverBattleRecord`** (passed from `turn_pipeline.ts`):
```typescript
{ location: string; attacker: FactionId; defender: FactionId;
  settlement_flipped: boolean; osid?: string; }
```
The `osid` field carries the OSID identity from attack resolution into the displacement system. If absent, falls back to `sid:${location}`.

### Canon References

- `docs/10_canon/Phase_Specifications_v0_9_0.md` — two-phase model (Peace / War)
- `docs/10_canon/War_Specification_v0_9_0.md` §5 — War pipeline step order (step 14: `war-hostile-takeover-displacement`)
- `docs/10_canon/Systems_Manual_v0_9_0.md` §12.1 (per-municipality routing), §12.2 (OSID-level tracking)
- `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 8 (routing table design)
