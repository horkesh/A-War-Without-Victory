# Orphan event flags — observations

**Date:** 2026-09-06
**Scope:** observations only. **Nothing was built.** One related bug was fixed separately (§2).
**Origin:** the [event-firing investigation](../20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md)
§4/D4 found events gated on flags nothing writes. This records what those flags actually are, what
state already exists for them, and what would have to be decided before any of them could be wired.

---

## 1. The measurement

Counting `sets_flags` / `set_flags` at every nesting depth across all six catalog files, and
cross-checking against `event_flags` in a completed 188-week save:

| | |
|---|---|
| distinct flags **written** by the catalog | 234 |
| distinct flags **read** by trigger conditions | 134 |
| **read but never written** — by catalog or by engine | **32** |
| events gated on at least one of those 32 | **70** (69 in `consequences.json`, 1 in `war_1993.json`) |

None of the 32 appears in the final save, which confirms no code path writes them either. The only
writers of `event_flags` in `src/` are `evaluate_events.ts:168` (copying event `sets_flags`),
`peace_plans.ts:514-515`, `campaignRecruitmentActions.ts:62`, and the default-OFF
`observer_threshold_flags.ts:149-155`.

**Only 2 of the 70 blocked events carry `response_options`.** Wiring the whole layer would add **two**
player decisions across a 188-week campaign. It is atmosphere and consequence texture, not pacing.

---

## 2. Three of the 32 were a naming defect, and are FIXED

Not a missing projection — a missing letter. `csq_enclave_held_alt_intervention` gates on
`srebrenica_fallen` / `zepa_fallen` / `gorazde_fallen`. The writer exists under a different name:
`srebrenica_falls_1995` sets **`srebrenica_fell`**. `zepa_falls_1995` set **no flags at all**.

All three checks were therefore permanently true, reducing the event to "week 145 plus a resilience
check". It was correct only by coincidence — its window is `145-145` and Srebrenica does not fall until
w162. **Widen that window past 162 and it would have silently asserted the enclaves were standing after
they had fallen.**

Fixed in `02dfd7967`: reads pointed at the `_fell` convention, and `zepa_falls_1995` given the
`zepa_fell` flag it never had. Behaviourally inert in the current campaign.

---

## 3. The remaining 29, in three tiers

### Tier 1 — meaning is unambiguous; the state already exists

| Flag(s) | Source in state | Thresholds asked |
|---|---|---|
| `war_exhaustion_x100_{RBiH,RS,HRHB}` | `political.war_exhaustion ÷ 100` (state holds 0-10000) | 30-70 — fits a 0-100 scale exactly |
| `major_operation_success{,_RS,_HRHB}` | `capital.<F>.operations_successful ≥ 1` | ≥1 |
| `alliance_low_water_mark_below_0_10` | 1 once `political.war_alliance_rbih_hrhb` has ever gone below 0.10 | ≥1 |
| `paramilitary_offensive_authorized` | `political.paramilitary_mode === 'offensive'` | read as `flag_not_set` |

### Tier 2 — the number exists, the DEFINITION does not

Each needs one line of intent before it can be written honestly.

| Flag(s) | The open question |
|---|---|
| `cumulative_casualties_x100_*` | Asks for 30-60. Casualties run to tens of thousands, so "x100" must be a percentage of *something* — starting strength? mobilised manpower? peak strength? Nothing in the data says. |
| `turns_since_major_offensive_*` | What makes an offensive "major"? `operation_history` carries `type`, `grade`, `outcome`, `objectives_captured`. |
| `patron_resist_streak{,_RBiH,_HRHB}` | Consecutive refusals of patron pressure. `patron_relationships.<F>.relationship_events` is a **list** (`rejected_vance_owen`, `rejected_contact_group`), not a streak — a consecutive-run counter would have to be defined and persisted. |
| `peace_plan_offered` / `peace_plan_accepted` | `capital.<F>.peace_plans_accepted` / `_rejected` counters exist; the boolean's intended meaning (this faction? any faction? currently on the table?) does not. |
| `peace_plan_acceptance_gap` | Asks for ≥25. A gap between which two quantities? |
| `post_dayton_phase` | Coupled to Dayton resolving — which **does not happen on the headless path at all** (see the investigation §11). Cannot be observed in a calibration run today. |

### Tier 3 — the underlying mechanic does not exist

| Flag(s) | What is missing |
|---|---|
| `supply_route_open_grain_corridor{,_RS,_HRHB}` | There is no "grain corridor" concept anywhere in the engine. |
| `turns_since_corridor_hostility{,_RS,_HRHB}` | There is no "corridor hostility" concept to count turns since. |
| `corps_reorganization_active_RS` | There is no corps-reorganisation mechanic. |

**Observation, not a decision:** these were authored against systems that were never built. Building
three mechanics to justify eight consequence cards is a poor trade; deleting the rows is the cheaper
honest option. **That is the owner's call and nothing here presumes it.**

---

## 4. Traps for whoever does wire this

1. **An unsuffixed flag does NOT reliably mean RBiH.** The convention is unsuffixed = RBiH with `_RS`
   and `_HRHB` mirrors — and `major_operation_success`, `turns_since_corridor_hostility` and
   `supply_route_open_grain_corridor` all follow it. **`patron_resist_streak` does not**: its unsuffixed
   form is read by `csq_patron_arms_review_imposed` and `csq_patron_disavowal_partial`, both
   `responding_faction: RS`, while `_RBiH` and `_HRHB` variants exist alongside. Wiring by pattern-match
   would silently mis-fire that whole family.

2. **Two of these flags are read as an ABSENCE, so writing them makes events HARDER to fire.**
   `rbih_hrhb_war_active` (5 reads) and `paramilitary_offensive_authorized` (1 read) are consumed with
   `flag_not_set`. Nothing writes them, so those checks are permanently true today. Wiring them
   **removes** five events' current eligibility. That is a behaviour change requiring a measured run,
   not a projection.

3. **`flag_not_set` is a KEY-PRESENCE test**, not a truthiness test (`event_types.ts:830-833`,
   `!(flag in flags)`). Writing any of these flags as `false` makes its `flag_not_set` read permanently
   false — the same defect that killed the Dayton chain via `coha_active`. Write the flag or omit it;
   never write it `false`.

4. **The Codex reads flags with different semantics than the event system.** Three coexist:
   `flag_not_set` (key presence), `flag_equals` (strict `===`), and `isTruthyFlag` (coercing,
   `dynamic_section_builder.ts:237-243`). A numeric counter flag will be read as truthy by the Codex at
   any non-zero value, including values below every threshold the events ask for.

5. **`consequences.json` is not covered by the timeline invariants.**
   `tests/event_timeline_integrity.test.ts` loads only the four `war_199x.json` files and asserts
   `length === 159`; the 135 rows in `consequences.json` — which is where 69 of the 70 blocked events
   live — are unchecked for id uniqueness, prerequisite ordering, or required fields. Independently
   measured: those three invariants **already hold** there unenforced; only sortedness fails (48
   out-of-order pairs), and that is file hygiene, not semantics, since the evaluator sorts candidates
   itself at `evaluate_events.ts:426`.

6. **The precedent to extend is `src/sim/codex/observer_threshold_flags.ts`** — default-OFF behind
   `ENABLE_OBSERVER_THRESHOLD_FLAGS` (`:51`), writes only `event_flags`, never touches control,
   dimensions, morale or supply, and is therefore calibration-flat while off. Its header documents the
   substrate discipline any new observer should follow. **Do not invent a second mechanism.**

---

## 5. Calibration exposure

Turning this layer on is **not** calibration-flat, unlike the existing observer. Roughly **69 consequence
events would begin firing for the first time**, and consequence rows carry real effects — supply,
morale, patron pressure, dimension shifts. This is a re-floor-class change needing its own controlled
188-week run under the one-change-per-run rule, and it must not be bundled with anything else.

Sequencing note: it is **not** a fix for the event-density findings. Two of seventy rows are player
decisions. Anyone selling this as a pacing improvement has misread it.
