# Event-System Saturation & Pacing — Scenario-Tester Report

Run: `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390/weekly_report.jsonl` (188 weeks, field `events_fired`, week key is `week_index`).
All figures below re-derived from the run and the six catalog files, not from the handed-over JSON alone.
**MEASURED** = read off run/data/code. **INFERRED** = my judgement.

---

## 1. Verification of the handed-over numbers

**MEASURED — everything material reproduces exactly.**

| Claim | Verdict |
|---|---|
| 178 firings / 188 weeks, mean 0.95/wk, 178 unique ids | ✅ exact |
| histogram `0:84, 1:58, 2:33, 3:7, 4:1, 5:3, 7:2` | ✅ exact, all seven buckets |
| w4=7, w54=7, w96=5, w102=5, w14=5, w97=4 + membership | ✅ exact, id-for-id |
| period density 50/1.25/28%, 58/1.12/37%, 41/0.79/58%, 29/0.66/55% | ✅ exact, all four periods |
| 122 never-fired; 110 of them in consequences.json | ✅ exact (110/135 = 81.5% of that file) |
| turn_min %10: 131/299 overall; 111/135 consequences; 20/164 war_* | ✅ exact |
| cohort sizes w60=23, w50=20, w70=20, w80=16, w84=12, … | ✅ exact |
| `graz_accords` absent from catalog, hardcoded | ✅ `war_phases.ts:1062-1066`, pushed into `result.fired` |
| `MAX_EVENTS_PER_TURN = 4`, decisions only | ✅ `evaluate_events.ts:39`; partition at `:546-576` |
| timeline[] vs run, all 188 weeks | ✅ **0 mismatches** |

### Two corrections

**(a) Drought count — "plus six 3-week gaps" is five, not six.** MEASURED, complete list of event-firing droughts ≥3:
`31-34(4)`, `41-43(3)`, `84-86(3)`, `91-93(3)`, `107-109(3)`, `112-116(5)`, `124-128(5)`, `132-134(3)`, `140-144(5)`, `146-155(10)`, `184-188(5)`.
Six of length ≥4, **five** of length 3. Cosmetic.

**(b) The 178/122 arithmetic hides `graz_accords`.** MEASURED: 178 unique fired = **177 catalog events + `graz_accords`** (not in the catalog). So 177 + 122 = 299 ✅. The brief's "178 unique fired" against a 299 catalog would otherwise imply 300 defs. Worth stating because it means the hardcoded event is invisible to any catalog-coverage metric.

### One substantive correction that changes the conclusion

**The Dayton chain's root cause is NOT `turn_min 190 > 188`.** MEASURED:

- `federation_ground_offensive_1995` **DID fire, at w172**. Its prerequisite is satisfied.
- `ceasefire_1995` (`war_1995.json`, tmin 181, tmax 200) therefore passes `requires_events`.
- Its *only* remaining gate is `{"type":"flag_not_set","flag":"coha_active"}`.

`flag_not_set` is implemented at **`src/sim/events/event_types.ts:830-833`** as:

```ts
case 'flag_not_set': {
    const flags = state.military.event_flags ?? {};
    return !(condition.flag in flags);
}
```

**Key-presence, not truthiness.** And `coha_expires_1995` (fired **w156**) writes `sets_flags: {"coha_active": false, "coha_expired": true}` (`war_1995.json:84`). Writing `false` *inserts the key*. From w139 (`coha_ceasefire_begins_1995`, fired w139, `war_1995.json:48`) the key is permanently present, so `flag_not_set: coha_active` is **permanently false for the rest of the game** — including the entire w181-200 window.

This is a one-line semantic mismatch, not a scenario-length problem. Details in §3/§5. See also §1(c).

**(c) Scope of the bug is exactly one event.** MEASURED — I scanned all six files for flags ever written `false` (`coha_active`, `joint_operations_agreement_active`, `svk_corps_active`) and cross-referenced every `flag_not_set` condition. **`ceasefire_1995` is the only victim.** Narrow bug, but it sits on the keystone of the endgame.

---

## 2. Is the w4 barracks cluster a defect?

**Verdict: NOT a defect. Correct history-shaped compression — and it costs the player nothing.**

MEASURED, `war_1992.json`. The seven w4 events decompose as:

| Event | `response_options`? | Load type |
|---|---|---|
| `hrhb_political_goal` (tmin 3, tmax 7) | yes | **DECISION** |
| `rbih_paramilitary_policy_1992` (tmin 3, tmax 9) | yes | **DECISION** |
| `battle_of_the_barracks_sarajevo` (tmin 4, tmax 6, `novo_sarajevo` ≥0.3) | no | auto |
| `battle_of_the_barracks_tuzla` (tmin 4, tmax 6, `tuzla` ≥0.3) | no | auto |
| `battle_of_the_barracks_visoko` (tmin 4, tmax 6, `visoko` ≥0.3) | no | auto |
| `battle_of_the_barracks_zenica` (tmin 4, tmax 6, `zenica` ≥0.3) | no | auto |
| `graz_accords` | n/a (hardcoded) | auto |

So w4's headline "7" is **2 decisions + 5 notifications** — half the cap of 4.

Three reasons this is right, not wrong:

1. **History-shaped.** The Battle of the Barracks was a genuinely simultaneous, countrywide event: ARBiH/TO forces besieged JNA garrisons across Bosnia in the first week of May 1992. Four cities lighting up in the same week is *the* historical signature. Note also the conditions differ per event (`novo_sarajevo` / `tuzla` / `visoko` / `zenica`), so they are four independent municipal checks that happen to co-satisfy — not one event copy-pasted.
2. **Structurally correct authoring.** `turn_min 4 / turn_max 6 / once:true` with a controls-municipality gate is exactly how you say "this happens as soon as the faction holds the town, within this window." They co-fire because the initial control map already satisfies all four at w4 — that is the *data* being historically right, not the *trigger* being lazy.
3. **They are notifications.** They carry no `response_options`, so they bypass the cap by design (`evaluate_events.ts:546-576`) and impose no decision load. They are the game telling the player the war has started in four places at once. That is the intended dramatic effect.

**INFERRED — the only real concern is presentational**, not systemic: if the UI renders five notifications as five sequential modals, w4 feels like paperwork. That is a UI-batching question ("Battle of the Barracks — Sarajevo, Tuzla, Visoko, Zenica" as one card), not a scenario-authoring one. I would not touch the data.

---

## 3. Defect ranking for a played campaign (D2 context)

First, the number that reorders everything. **MEASURED — decision load, the only load a player actually feels:**

- 84 of 299 catalog defs are decision events; **73 of 178 firings (41%) are decisions**.
- Decision-events-per-week histogram: **`0:132, 1:44, 2:9, 3:1, 4:2`**.
- **The cap is never exceeded. Max observed is 4, hit exactly twice (w96, w97).** No overflow field appears in any weekly report.

**There is no oversaturation problem in this run.** 132 of 188 weeks — **70% of the campaign — present the player with zero decisions.** The system's failure mode is silence, not noise.

### Ranked

**#1 — (d) The Dayton chain, and with it the campaign's ending. SEVERITY: BLOCKING for D2.**

MEASURED, the last 15 weeks:

```
w179 operation_mistral_2_1995, operation_sana_1995
w180 (none)   w181 (none)
w182 csq_arbih_resistance_revival_RS
w183 holbrooke_ceasefire_demand_oct95 [DECISION]   <-- last thing that ever happens
w184 (none)  w185 (none)  w186 (none)  w187 (none)  w188 (none)
```

The campaign ends on **five consecutive silent weeks**. The player fights 188 weeks — through Srebrenica, Deliberate Force, Storm, the Federation offensive — and the game simply stops. No ceasefire, no talks, no Dayton, no closure. `holbrooke_ceasefire_demand_oct95` fires at w183 and is then answered by nothing.

Cause is the `flag_not_set` key-presence bug in §1, which kills the chain three deep:
`ceasefire_1995` (blocked) → `dayton_talks_begin_1995` (tmin 184, requires ceasefire) → `dayton_signed_1995` (tmin 184, requires talks) → `rs_/hrhb_dayton_acceptance_1995` (tmin 190, requires ceasefire).

**Important scoping correction:** three of these five (`ceasefire_1995`, `dayton_talks_begin_1995` @184, `dayton_signed_1995` @184) are **inside** the 188-week window and would become reachable on a fix. Only the two `*_dayton_acceptance_1995` rows at tmin 190 are genuinely beyond scenario length. So the brief's framing — an out-of-range window — is true for 2 of 5; the load-bearing 3 are killed by a one-line bug.

This is #1 because it is the difference between a campaign that concludes and one that runs out of tape, and because a negative-sum game about a war nobody won *needs* its ending to land. INFERRED: this is also the cheapest fix in the report.

**#2 — (b) Decision droughts, concentrated in the endgame. SEVERITY: HIGH.**

MEASURED, decision droughts ≥8 weeks: **`57-64` (8w), `130-137` (8w), `139-159` (21w), `161-173` (13w)**.

Weeks **139-173 contain exactly one player decision** (`un_hostage_crisis_1995`, w160) across 35 weeks. That is nine months of 1995 — the most consequential stretch of the war — as a spectator sport.

Partly legitimate: w139-156 is the COHA ceasefire, and `coha_active` is a hard combat gate at six sites (`attack_resolution_osid.ts:531`, `bot_brigade_ai_osid.ts:880`, `frontline_attrition.ts:209`, `sector_offensive.ts:1198` and `:1734`, `tactical_group_lifecycle.ts:424`). The four-month Dec-94/May-95 ceasefire *was* quiet, and freezing combat is correct.

But INFERRED: "combat is frozen" is precisely when a president has the *most* to decide — rearm, reposition, negotiate, handle the patron. Modelling the ceasefire as a content vacuum rather than a political interval is a design miss, not a historical fidelity win. Decision firings by period: 1992 **19**, 1993 **22**, 1994 **25**, **1995 only 7 across 44 weeks**. The content curve runs backwards from the drama curve.

**#3 — (c) Dead catalog. SEVERITY: MEDIUM, and mostly by design.**

`event_loader.ts:43-46` states outright that consequences.json is *"gated on ahistorical flags — calibration-safe by construction since they literally cannot fire on the historical path."* So 110 dead rows in a bot-default historical run is **expected**, not broken — for most of them. See §4 for where that defence stops holding.

The sharper finding is the **12 dead events in the authored war_* files**, which have no such excuse (MEASURED, full list):

| Event | File | Window | Why dead |
|---|---|---|---|
| `nato_ultimatum_sarajevo_1994` | war_1994 | **96-96** | requires `markale_massacre_1994`, which fires *at w96* — see below |
| `sarajevo_exclusion_zone_1994` | war_1994 | 97-98 | requires the above (cascade) |
| `ceasefire_1995` | war_1995 | 181-200 | `flag_not_set` bug (#1) |
| `dayton_talks_begin_1995` | war_1995 | 184-210 | cascade |
| `dayton_signed_1995` | war_1995 | 184-215 | cascade |
| `rs_dayton_acceptance_1995` | war_1995 | 190-212 | cascade + out of range |
| `hrhb_dayton_acceptance_1995` | war_1995 | 190-212 | cascade + out of range |
| `us_halts_federation_advance_1995` | war_1995 | 182-188 | `faction_area_ratio RS at_most 0.51` not met |
| `ahmici_massacre_1993` | war_1993 | 54-70 | needs flag `hvo_arbih_tensions_rising` = true |
| `gorazde_pocket_consolidation_1992` | war_1992 | 18-24 | needs RBiH control of `op:gorazde:glamoc` + `:kamen` |
| `vrs_cerska_offensive_1993` | war_1993 | 44-52 | needs RS control of `op:vlasenica:cerska_2` |
| `operation_lukavac_93` | war_1993 | 69-71 | needs RS control of `trnovo` ≥0.5 |

**The one-turn-window bug is worth calling out separately.** `nato_ultimatum_sarajevo_1994` has `turn_min == turn_max == 96` and requires `markale_massacre_1994`. `triggerMatches` (`event_types.ts:717-719`) reads `state.military.fired_event_ids`, which is populated *by* the firing pass — so a same-turn prerequisite can never be satisfied during candidate eligibility. The window is one turn wide, so it closes forever.

**This is proven, not inferred.** `rbih_nato_ultimatum_compliance_1994` has the *same* prerequisite (`markale_massacre_1994`) but a window of 96-98 — and it **fired at w97**. Same prerequisite, one turn of slack, fires. The only difference is the window width.

INFERRED on the last four rows: `ahmici_massacre_1993` is the one that should worry the team. It is an ICTY-documented atrocity, it is §6-adjacent, and it silently never happens because a tension flag never gets written. A campaign in which Ahmići does not occur is making a historical claim nobody signed off on.

`us_halts_federation_advance_1995` is a near-miss, not a bug: final control is RS 331 / RBiH 281 / HRHB 100 OSIDs (46.5% by count), and the gate reads area-weighted `territory_snapshot` (`event_types.ts:978-988`) against ≤0.51. INFERRED: RS area share sits just above the threshold. This is calibration-sensitive and will flip on its own as the floor moves — leave it.

**#4 — (a) Oversaturation. SEVERITY: LOW / not currently a defect.**

Peak decision load is 4/week, at the cap, twice in 188 weeks, with no overflow. The seven-event weeks are 2 decisions + 5 notifications (w4) and 2 + 5 (w54). **INFERRED:** the only live risk is presentational — five notification modals in one week reads as a queue. Batch notifications in the UI; do not touch the cap or the data.

---

## 4. Classification of the 110 dead consequences.json events

MEASURED. Classified by first blocking reason, in the order: unwritten-flag → broken chain → flag-value-never-matched → threshold.

| Class | Count | Meaning |
|---|---|---|
| **A. Flag never written by any event *or* any code** | **66** | Reads a flag with zero producers anywhere |
| **B. Flag written, but the value never matched** | **32** | Ahistorical branch not taken by the bot |
| **C. Broken `requires_events` chain** | **10** | Prerequisite is itself dead |
| **D. Threshold never crossed** | **2** | Genuine state-condition miss |
| **Total** | **110** | |

**Class B (32) and Class D (2) are working as designed.** Class B is exactly what `event_loader.ts:43-46` describes: e.g. `csq_minority_defections_1992` and `csq_bosniak_unity_1993` both require `rbih_state_identity == "bosniak_national"`; `csq_accelerated_camps_discovery_1992` requires `rs_strategic_goals == "aggressive"`. The flags *are* written — the bot takes the historical option, so the counterfactual branch stays dark. That is the free-war model functioning. **Do not touch.**

**Class C (10) is mechanical fallout**, dominated by two dead parents: `csq_bihac_pocket_collapses_1994` (Class D) kills `csq_northwest_rs_consolidation_1995` and `csq_bihac_refugee_crisis_1994`; `csq_drina_partisan_resistance_1992` kills `csq_drina_supply_disruption_1993`, `csq_drina_corps_pinned_1993`, `csq_drina_population_resilience_1993`.

### Class A is the real finding — and the loader's defence does not cover it

These 66 events are **not** gated on ahistorical *choices*. They read **28 distinct flags that describe engine state** — casualty totals, exhaustion, streaks, supply-route status — and **not one of them has a producer**.

MEASURED — I grepped every one of the 28 across `src/**/*.ts`. **25 have zero hits.** The 3 that hit are false positives:

- `alliance_low_water_mark_below_0_10`, `rbih_hrhb_war_active` → `src/sim/endgame/cost_ledger_templates/index.ts:65-66`, a **string list of state paths**, not a write.
- `peace_plan_offered` → `src/ui/map/audio/audioAssets.ts:88` and `sound_manifest.ts:154`, an **audio SFX id** that happens to share the name.

**Zero writers, all 28.** Confirmed structurally: the sole writer of `state.military.event_flags` in the entire engine is `applyDefinitionFlags` at **`evaluate_events.ts:163-170`**, which copies from event `sets_flags` only. **There is no derived-flag synthesis step.** No code path computes `war_exhaustion_x100_RS` from exhaustion, or `turns_since_major_offensive_RBiH` from operation history.

The 28 orphan flags, grouped:

- **Per-faction metric mirrors (12):** `war_exhaustion_x100_{RBiH,RS,HRHB}`, `cumulative_casualties_x100_{…}`, `turns_since_major_offensive_{…}`, `turns_since_corridor_hostility_{…}`
- **Streak / counter flags (5):** `patron_resist_streak` + `_RBiH` / `_HRHB`, `turns_since_corridor_hostility`, `alliance_low_water_mark_below_0_10`
- **Peace-process flags (4):** `peace_plan_offered`, `peace_plan_accepted`, `peace_plan_acceptance_gap`, `post_dayton_phase`
- **Operation / supply flags (7):** `major_operation_success` + `_RS` / `_HRHB`, `supply_route_open_grain_corridor` + `_RS` / `_HRHB`, `corps_reorganization_active_RS`
- **Other (1):** `rbih_hrhb_war_active`

Five concrete examples with the exact never-occurring gate:

1. **`csq_patron_pressure_resisted_streak`** (w12+) — `flag_at_least: patron_resist_streak`. No writer. Nothing counts consecutive patron refusals.
2. **`csq_patron_arms_review_imposed`** (w15+) — same `patron_resist_streak`, plus a `dimension_below`. Dead on the flag.
3. **`csq_patron_disavowal_partial`** (w25+) — `patron_arms_review_active == true`, which only #2 would have set. Dead-parent chain *inside* Class A.
4. **`csq_early_peace_acceptance_w120`** (w60-119) — `peace_plan_accepted == true`. No writer; the only `peace_plan_offered` in the repo is a sound effect.
5. **`csq_alliance_revival_after_hostility`** (w80+) — `flag_at_least: alliance_low_water_mark_below_0_10` AND `flag_not_set: rbih_hrhb_war_active`. The first has no writer, so the row is dead regardless of the second.

**INFERRED — why this matters beyond a coverage statistic.** Class A is an entire authored *consequence layer* for war exhaustion, patron relations, and the peace process, sitting inert because it was written against a flag vocabulary that was specified but never implemented. It is not calibration-safe-by-design; it is unfinished. And the shape is familiar to this repo: `observer_threshold_flags.ts:1-16` documents exactly this pattern for two *other* flags — *"gate on a single positive flag each that no upstream system currently writes (verified: zero writers in src/ + data/scenarios/events/), so the entries are wired-but-dark"* — and that observer is `ENABLE_OBSERVER_THRESHOLD_FLAGS = false` (`:52`) and covers only `equipment_quality_collapsed` / `negotiation_capital_exhausted`. **It does not produce any of the 28.** The precedent exists; the work was never extended.

---

## 5. Remediation

### Would change

**R1 — Fix `flag_not_set` semantics. (P0, one line, unblocks the ending.)**
`event_types.ts:832` — change key-presence to falsy-check, so a flag written `false` reads as not-set:
```ts
return !flags[condition.flag];   // was: !(condition.flag in flags)
```
MEASURED blast radius: **exactly one event changes behaviour** (`ceasefire_1995`) — verified by scanning every `flag_not_set` condition against every flag ever written `false`. Note `flag_not_set` is *also* used on flags never written at all (e.g. `csq_pragmatic_coalition_1993`'s `pragmatic_coalition_1993`); for those, absent and falsy agree, so nothing moves.

The alternative — `delete state.military.event_flags.coha_active` instead of writing `false` — is *worse*: `coha_active === true` is read at six combat sites, and deleting the key changes what those reads see. Fix the predicate, not the data.

Caveat, INFERRED: this is a combat-adjacent change only in that it re-enables an event chain in the last 8 weeks. Per the 188w-validate rule, verify on 188w, not 40w — a 40w run cannot see w181 at all.

**R2 — Widen the two one-turn windows. (P0, data-only.)**
`nato_ultimatum_sarajevo_1994`: `turn_max` 96 → 99. Its prerequisite fires at w96 and `requires_events` cannot resolve same-turn (`event_types.ts:717-719`). `rbih_nato_ultimatum_compliance_1994` with window 96-98 already proves the fix works. Restores `sarajevo_exclusion_zone_1994` for free.

**INFERRED, and worth a look beyond this run:** any event with `turn_min == turn_max` *and* a `requires_events` naming an event whose window starts on the same turn is dead by construction. That is a cheap authoring lint — I'd add it to the loader's validation rather than fixing instances one at a time.

**R3 — Decide what to do about `ahmici_massacre_1993`. (P1, needs the Historian, likely §6.)**
Blocked on `hvo_arbih_tensions_rising == true`, never written. I am not proposing a fix — an ICTY-documented atrocity silently absent from the campaign is a canon question, not a scenario-tuning one. Route to Historian + the §6 panel. Flagging, not ruling.

**R4 — Endgame decision content. (P1, design.)**
Weeks 139-173 hold one decision across 35 weeks, and 1995 has 7 across 44. The COHA freeze is historically right for *combat*; it is wrong for *politics*. INFERRED: the highest-value content in the whole system would be 4-6 decision events in the w140-180 band — rearmament under ceasefire, the Washington/Federation relationship, patron pressure, the Holbrooke channel — none of which need new engine surface, since `holbrooke_us_belgrade_channel_1995` already demonstrates the pattern.

**R5 — Class A orphan flags: implement or delete, but do not leave. (P2.)**
66 events read 28 flags with zero producers. Two honest options:
- **Implement a derived-flag pass** — a per-turn observer writing the metric mirrors (`war_exhaustion_x100_*`, `cumulative_casualties_x100_*`, `turns_since_*`) from state the engine already has. `observer_threshold_flags.ts` is the established, determinism-reviewed template; extend it rather than inventing a second mechanism. Must be default-OFF behind its own `ENABLE_*` gate per that file's substrate discipline, then re-floored.
- **Or delete the 66 rows** and stop counting them as content.

INFERRED, recommendation: implement the ~12 metric mirrors (mechanical, deterministic, no design questions) and delete or defer the peace-process and streak families, which need design decisions that have not been made. Either way the current state — 66 authored events silently reading a vocabulary nothing writes — is the worst of both, because it inflates the catalog while delivering nothing.

### Would NOT change

- **The w4 barracks cluster.** Historically correct, 2 decisions not 7, cap never approached. §2.
- **`MAX_EVENTS_PER_TURN = 4`.** MEASURED: never exceeded, no overflow in 188 weeks. It is not binding, so tuning it is a no-op. Under-saturation is the problem.
- **The 32 Class-B consequences.** Working as designed per `event_loader.ts:43-46`; they are the ahistorical branch staying dark. Firing them would break calibration.
- **`us_halts_federation_advance_1995`.** Near-miss on an area threshold that moves with the calibration floor. Do not tune the event to the current floor — that is fitting content to a number that is still moving.
- **`turn_min` clustering on multiples of 10.** 111/135 in consequences vs 20/164 in the authored files. INFERRED: this is round-number window authoring in a file whose rows are mostly inert anyway; it has no measured pacing effect, because the rows do not fire. Cosmetic. If Class A gets implemented (R5), revisit — clustering would start to matter once those rows can fire.
- **The `graz_accords` hardcode.** Out of scope here, but note it is invisible to every catalog-coverage metric (§1b). Worth a ticket, not a change in this lane.
