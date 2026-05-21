# Canon-Compliance Anchor Frame — Historical Anchor Sets (Jan 93 / Apr 94 / Apr 95 / Oct 95)

**Date:** 2026-05-21
**Author:** canon-compliance-reviewer
**Status:** COMPLETE
**Scope:** Define the canon-compliance frame any Type 1–5 anchor proposal must satisfy. Read-only audit. No canon edits, no source edits, no anchor-file edits.
**Senior canon (in priority order):** Engine Invariants v0.9.0 > Phase Specifications v0.9.0 > Systems Manual v0.9.0 > Rulebook v0.9.0 > Game Bible v0.9.0 > context.md

---

## 0. Method

Per canon-compliance-reviewer skill: map each proposed anchor PATTERN to specific canon clauses; refuse silently or ambiguously gated patterns; flag any anchor that would, on firing, contradict an Engine Invariant. Skill mandates STOP-AND-ASK on canon silence; here we instead annotate each pattern as canon-safe, canon-violating, or gated-on-schema, and surface the gated set as Section 4.

Investigation surface:

- Engine Invariants v0.9.0 (`docs/10_canon/Engine_Invariants_v0_9_0.md`) — full read.
- `src/state/game_state.ts` — schema for `GameState`, `MilitaryState`, `PoliticalState`, `DisplacementDomainState`, `CasualtyLedger`.
- `src/state/identity.ts` — canonical faction IDs.
- `src/state/casualty_ledger.ts` — casualty fields.
- `src/sim/events/` — event types, evaluator, effect application, registry.
- `data/scenarios/events/{war_1992,war_1993,war_1994,war_1995,consequences}.json` — authored event catalog (~246 event IDs).

Anchor checking dates (Jan 93 / Apr 94 / Apr 95 / Oct 95) correspond approximately to **w40 / w104 / w156 / w188** of a w0=1992-04-06 scenario clock.

---

## 1. Canon-safe anchor patterns

Each pattern below is annotated with a concrete example anchor and the canon clauses that authorize it. Anchors are evaluated at a fixed turn against the deterministic save output of `scenario_runner.ts`.

### 1.1 Type 1 — Faction territorial share band (area-weighted)

**Pattern:** "At w40, faction F controls between X% and Y% of map area, computed from `state.political.political_controllers` x OSID polygon area (`data/derived/operational/osid_areas.json`)."

**Example:** `RS area-weighted share in [0.62, 0.68] at w40` (Jan 1993 historical).

**Canon authorization:**
- Engine Invariants §9 (Political Control Invariants) §9.1: `political_controllers` is THE authoritative control state.
- Engine Invariants §11.4 (Reproducibility): identical inputs to identical outputs; saves fully reconstruct political controllers.
- Engine Invariants §11.3 (Stable Ordering): OSID iteration via `strictCompare`. Sum-over-OSIDs is deterministic.
- CLAUDE.md "NEVER override initial OSIDs" rule applies to **initialization** (Engine Invariants §9.2 Initialization Precedence) — once initialized, control may legitimately change via §9.6 mechanisms. Anchors at w40/w104/w156/w188 read **post-initialization** state and are canon-safe.

**Gated:** the band semantics is canon-safe, but **the convenience field `state.geometry.area_share_by_faction` does NOT exist** (see §4). Anchor implementations must compute the share at evaluation time from `political_controllers + osid_areas.json`.

### 1.2 Type 2 — Event-predicate anchors

**Pattern:** "At/by w40, event E must have fired" or "flag F must be set."

**Examples:**
- `'jna_withdrawn' in state.military.fired_event_ids` by w40 (canon: JNA must withdraw, Game Bible / Rulebook timeline).
- `state.military.event_flags['sarajevo_siege_active'] === true` from w4 onward.
- `state.military.event_flags['srebrenica_fallen'] === true` by w185 (Apr 95 / Oct 95 anchors).

**Canon authorization:**
- Engine Invariants §11.4: events recorded in `fired_event_ids`, `event_flags`, `event_fire_counts`, `event_last_fired_turn` are part of serialized state.
- Engine Invariants §11.3: event evaluator (`src/sim/events/evaluate_events.ts`) iterates registry sorted by `(turn_min, id)`.
- §3 below: inventoried event IDs and flags.

### 1.3 Type 3 — OSID-level control anchor (single OSID held by faction F at turn T)

**Pattern:** "At w40, OSID `op:brcko:brcko_2` is controlled by RS" — referencing `state.political.political_controllers[settlement_id]` where the settlement is the canonical capital of that OSID, or via the OSID→settlement aggregation.

**Canon authorization:**
- Engine Invariants §9.1, §9.6: control changes only via attack resolution / corps op / authority collapse / negotiated transfer — all of which are deterministic.
- Engine Invariants §14.1 (Settlement-level control), §9.8 (War Phase OSID-Only): legitimate in War phase.
- CLAUDE.md "NEVER override initial OSIDs" is satisfied — we are reading state, not overriding it.

**Constraint:** anchor must **never** be paired with a corresponding entry in `meta.scenario_init_overrides.avoided_osids_by_faction` or `osid_control_overrides` (engine cannot be made to satisfy the anchor by data railroad — see §2.4).

### 1.4 Type 4 — Corridor / contiguity anchor

**Pattern:** "At w40, RS controls a contiguous OSID corridor between `op:bijeljina:bijeljina_2` and `op:banja_luka:banja_luka_2` (the Posavina Corridor)" — computed via BFS over `state.political.political_controllers` filtered by OSID adjacency.

**Canon authorization:**
- Engine Invariants §4 (Supply and Corridor Invariants): corridors are derived per faction; deterministic propagation order (by faction_id, then node id).
- Engine Invariants §13.1: corridors must NOT be serialized — anchor implementations recompute from OSID adjacency + political_controllers each evaluation. Safe because adjacency is deterministic data (`buildOsidAdjacency`).
- Engine Invariants §6 (Front and Combat Invariants): fronts exist where sustained opposing control meets; corridor anchors do not interact with front state.

**Gated:** no `state.supply.corridor_state_by_faction` field exists as serialized truth (Engine Invariants §13.1 forbids it). Anchor must recompute. The corridor state can be reconstructed deterministically from `political_controllers`, but **the canonical "Open/Brittle/Cut" tag is derived state**, so anchors that demand a specific Open/Brittle/Cut value must include the recomputation in the anchor checker, not read it from save.

### 1.5 Type 5 — Cumulative attrition band

**Pattern:** "At w40, ARBiH cumulative killed in [12000, 18000]" — reading `state.military.casualty_ledger['RBiH'].killed`.

**Canon authorization:**
- `src/state/casualty_ledger.ts`: `CasualtyLedger = Record<FactionId, FactionCasualtyLedger>` where `FactionCasualtyLedger = { killed, wounded, missing_captured, equipment_lost, per_formation }`. Append-only and deterministic (no random sampling in `recordBattleCasualties`).
- Engine Invariants §11.4 (Reproducibility): casualty ledger is part of serialized state (`military.casualty_ledger?`).
- Engine Invariants §14.6 (Equipment conservation): equipment losses tracked deterministically.

**No schema addition needed** — the ledger already exists at faction granularity. (Civilian casualties live in `state.displacement.civilian_casualties` — see §5.)

### 1.6 Type 2b — Displaced-civilians / humanitarian anchor

**Pattern:** "By w156, cumulative civilians fled abroad from RBiH-aligned populations >= 200,000."

**Source:** `state.displacement.civilian_casualties[factionId] = { killed, fled_abroad }` and `state.displacement.displacement_humanitarian_aggregates`.

**Canon authorization:** Append-only, deterministic, serialized. `displacement_event_log` is sorted `(turn, origin_mun)` for determinism.

### 1.7 Type 6 — Negotiation / treaty state anchor

**Pattern:** "At w156, no `end_state` of kind `peace_treaty` exists" (i.e. the historical Apr 95 has Bihac crisis but no Dayton yet).

**Source:** `state.political.end_state`, `state.political.negotiation_status`, `state.military.negotiation`.

**Canon authorization:** Engine Invariants §10 (Peace and Negotiation Invariants) §10.1: "Any accepted treaty containing transfer_settlements or recognize_control_settlements ends the war immediately and writes end_state." End-state writes are deterministic and serialized. Safe to anchor on.

### 1.8 Type 7 — Faction exhaustion / supply band

**Pattern:** "At w156, `state.political.war_exhaustion['RBiH'] >= 350`."

**Canon authorization:** Engine Invariants §8.1: "Exhaustion values are monotonic and irreversible." Safe to anchor on — value cannot retreat between runs of the same seed.

---

## 2. Canon-violating anchor patterns

Each pattern below is annotated with an example anchor and the specific invariant it would break if used.

### 2.1 "Faction F controls Sarajevo center" if F is not RBiH

**Example violating anchor:** "At w188, RS controls `op:sarajevo:sarajevo_centar` (or equivalent center OSID)."

**Invariant broken:** Engine Invariants §12.1 (Sarajevo and Siege Conditions): "Sarajevo is an ALWAYS_BESIEGED_ENCLAVE." Sarajevo center OSIDs are required by canon to remain RBiH-controlled-but-besieged throughout the war. There is no historical week of 1992-1995 in which RS captured Sarajevo center. The §12.1 invariant codifies this asymmetric, non-flippable state.

**Refusal:** Reject any anchor asserting non-RBiH control of Sarajevo center OSIDs. (Anchors asserting *siege state* on Sarajevo are fine — that's §12.1-consistent.)

### 2.2 Anchors that require initial OSID override at scenario load

**Example violating anchor:** "At w0 of the Apr 1995 scenario, RS controls `op:bihac:bihac_2`" implemented by editing the painted starting controllers JSON for w156-initialized runs.

**Invariant broken:**
- CLAUDE.md "NEVER override initial OSIDs": initial OSID control from census/referendum is sacrosanct.
- Engine Invariants §9.2 (Initialization Precedence): political control must be initialized deterministically BEFORE any front/brigade/pressure logic.

**Refusal:** If an anchor cannot be reached from the canonical April 1992 initial state via the engine's authorized §9.6 mechanisms, it is canon-violating regardless of historical accuracy. Fix engine, OOB, or operations — never paint the answer.

**Permitted alternative:** Multi-painted-target scenarios (Apr 1993, Apr 1995, etc.) are themselves canonical starting points authored as full census/referendum-aligned controllers; anchors at w0 of those scenarios are reading the authored truth, not overriding it.

### 2.3 Anchors keyed on legacy faction IDs

**Example violating anchor:** `state.casualty_ledger['ARBiH'].killed`, `state.casualty_ledger['VRS'].killed`, `state.casualty_ledger['HVO'].killed`, or `state.political_controllers[S100013] === 'ABiH'`.

**Invariant broken:**
- CLAUDE.md "Canonical faction IDs: `RBiH`, `RS`, `HRHB` only."
- `src/state/identity.ts`: `POLITICAL_SIDES = ["RBiH", "RS", "HRHB"]`. `canonicalizePoliticalSideId('ARBiH') -> 'RBiH'`, `'VRS' -> 'RS'`, `'HVO' -> 'HRHB'`. Legacy labels are NORMALIZED on read but state is **stored** under canonical IDs.
- Engine Invariants §11.3: stable ordering by canonical ID.

**Refusal:** Any anchor referencing `JNA`, `ABiH`, `ARBiH`, `VRS`, `HVO` as a state-lookup key is canon-violating. `JNA` is not a faction at all (it's a transitional army modeled in `state.military.war_jna`, not a `PoliticalSideId`).

### 2.4 Anchors satisfied by `avoided_osids_by_faction` or `osid_control_overrides`

**Example violating anchor:** Any anchor whose proposal text includes "add `op:foo:bar` to `avoided_osids_by_faction['RS']`" or "force-set the controller via `osid_control_overrides`" to make the assertion pass.

**Invariant broken:**
- CLAUDE.md "NEVER use `avoided_osids_by_faction`": "Banned. Fix bot targeting, OOB stats, or painted targets instead."
- The field exists in `src/state/game_state.ts` (line 1363) but is explicitly flagged in the codebase comment as a ban target — the comment immediately above it says "Fix engine, OOB, or painted targets... use osid_control_overrides only for factual initial-control corrections."
- Engine Invariants §18 (Final Meta-Assertion): "No invariant may be bypassed or relaxed for balance, usability, or player convenience."

**Refusal:** Anchors must be satisfiable purely through the engine's authorized §9.6 control-change mechanisms (attack resolution, corps/frontline ops, authority collapse, negotiated transfer). Anchors that can only pass by adding entries to the bot-avoidance railroad are canon-violating.

### 2.5 Anchors on derived-but-not-serialized state read from save

**Example violating anchor:** `state.supply.corridor_states['RS']['Posavina'] === 'Open'` or `state.fronts[...].pressure_score > 50`.

**Invariant broken:** Engine Invariants §13.1: "Derived states (corridors, fronts, municipality status) must not be serialized." §13.2: "All derived states must be recomputed each turn." A save does not durably record `corridor_states` — reading it from a save yields either undefined or stale data.

**Refusal:** Such anchors must be rewritten to recompute the derived value at anchor-evaluation time from primary state (e.g. `political_controllers + osid_adjacency` for corridors, `front_edges` snapshot for fronts where canon explicitly permits serialization at §14 lines for `front_edges?: FrontEdgeState[]`).

### 2.6 Anchors requiring brigade destruction

**Example violating anchor:** "At w50, fewer than N brigades exist in `state.military.formations` for faction F" implying combat-driven destruction.

**Invariant broken:** Engine Invariants §6.2 (Brigade No-Destruction Invariant): "Brigades are NEVER destroyed in combat." Only dissolution path (2-of-3 criteria, or §6.2.4 morale-collapse override gated behind `MORALE_OVERRIDE_ENABLED`) removes a brigade.

**Refusal as written.** Reframe as: "fewer than N brigades have `cohesion >= X` AND `personnel >= Y`" (combat-effective count) — that is canon-safe via §14.3 (cohesion bounds) and §14.3a (morale).

### 2.7 Anchors that demand control flip via passive pressure

**Example violating anchor:** "At w40, `op:foo:bar_2` flips RS->RBiH because of sustained ARBiH brigade presence adjacent for >=6 turns."

**Invariant broken:** Engine Invariants §9.6: "**No passive pressure flip:** Control does not change from 'sustained opposing military pressure' alone; it changes only when an attack (or corps/frontline op) is resolved." Also §14.1.

**Refusal.** Anchors may assert *that* a flip happened by turn T; they must NOT prescribe *how* unless the prescription names a §9.6-authorized mechanism (a corps op, an attack resolution, an authority collapse trigger, or a negotiated transfer).

### 2.8 Anchors that depend on Exhaustion reducing

**Example violating anchor:** "By Dayton (w188), `war_exhaustion['RS']` < the value at w156."

**Invariant broken:** Engine Invariants §8 (Exhaustion Invariants): "Exhaustion values are monotonic and irreversible." "Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system."

**Refusal.** Exhaustion can only be band-checked as `>=` against a turn-T value or `<=` against a value at a turn `>=` T.

### 2.9 Anchors requiring one-turn fragmentation or reunification

**Example violating anchor:** "At w40, the Bihac pocket fragments from RBiH and recombines by w42."

**Invariant broken:** Engine Invariants §7 (Fragmentation Invariants): "Fragmentation and reunification both require persistence over multiple turns. One-turn fragmentation or reunification is invalid."

**Refusal.** Fragmentation anchors must have a duration band (>= 2 turns) or be rejected.

---

## 3. Available event flag inventory

This section enumerates the canonical event identifiers and flags that an anchor may safely assert on. There are three distinct state surfaces:

| State field | Owner | Anchor-readable | Notes |
|---|---|---|---|
| `state.military.fired_event_ids` | `evaluate_events.ts` | YES | append-only `string[]` of event IDs that have fired. Engine Invariants §11.4 reproducible. |
| `state.military.event_flags` | `applyDefinitionFlags()` in `evaluate_events.ts` | YES | `Record<string, string\|number\|boolean>`. Persisted. |
| `state.military.event_fire_counts` | `recordEventFiring()` | YES | `Record<eventId, integer>` per event. |
| `state.military.event_last_fired_turn` | `recordEventFiring()` | YES | `Record<eventId, turn>` per event. |
| `state.military.enabled_event_ids` | `recordEnabledEvents()` | YES | `string[]` of events unlocked by chain. |
| `state.military.event_readiness` | pressure system | LIMITED | counter; subject to retuning. Avoid hard-anchoring. |
| `state.military.pending_event_decisions` | event evaluator | NO for anchoring | transient — consumed by player/bot response. |
| `state.military.pending_event_notifications` | event evaluator | NO for anchoring | transient. |

### 3.1 Event ID inventory (anchor-grade events; from `data/scenarios/events/*.json`)

Filter logic for "reliable to anchor on" (Y/N): an event is Y when its trigger is keyed on a deterministic state predicate or a fixed historical window AND its firing produces a durable record in `fired_event_ids` / `event_flags`. CONDITIONAL when it has a canonical alternative path (XOR pair, see §3.3).

Total events authored across the five JSONs: **~246** (`22 + 53 + 17 + 23 + 131`). The table below is the anchor-grade subset for the four checking dates.

| event_id | source file | turn window | reliable (Y/N) | notes |
|---|---|---|---|---|
| `rs_strategic_goals` | war_1992.json | 1-3 | Y | sets flag `rs_strategic_goals`. |
| `rbih_state_identity` | war_1992.json | 2-5 | Y | sets `rbih_state_identity`. |
| `hrhb_political_goal` | war_1992.json | 3-7 | Y | sets `hrhb_political_goal`. |
| `arms_embargo_impact_1992` | war_1992.json | 3-6 | Y | sets `arms_embargo_active`. |
| `battle_of_the_barracks_sarajevo` | war_1992.json | 4-6 | Y | sets `barracks_sarajevo_seized`. |
| `battle_of_the_barracks_tuzla` | war_1992.json | 4-6 | Y | sets `barracks_tuzla_seized`. |
| `battle_of_the_barracks_zenica` | war_1992.json | 4-6 | Y | sets `barracks_zenica_seized`. |
| `battle_of_the_barracks_visoko` | war_1992.json | 4-6 | Y | sets `barracks_visoko_seized`. |
| `sarajevo_siege_begins_1992` | war_1992.json | 4-10 | Y | sets `sarajevo_siege_active`. **Anchor-suitable for Jan 93/Apr 94/Apr 95/Oct 95.** |
| `jna_withdrawal_1992` | war_1992.json | 5 | Y | sets `jna_withdrawn`. Anchor-suitable for Jan 93+. |
| `mostar_liberation_1992` | war_1992.json | 6-20 | Y | sets `mostar_liberated`. |
| `srebrenica_enclave_forms_1992` | war_1992.json | 6-20 | Y | sets `srebrenica_enclave_formed`. |
| `drina_cleansing_decision_1992` | war_1992.json | 8-30 | Y | sets `drina_cleansing_occurred`, `drina_cleansing_intensity`. |
| `drina_valley_ethnic_cleansing_1992` | war_1992.json | 8-25 | Y | content track. |
| `operation_corridor_1992` | war_1992.json | 12-22 | Y | sets `corridor_secured`. **Anchor for Posavina at Jan 93.** |
| `embargo_croatia_transit_1992` | war_1992.json | 13-15 | Y | sets `embargo_croatia_transit`. |
| `concentration_camps_revealed_1992` | war_1992.json | 16-30 | Y | sets `camps_revealed`, `camps_revealed_early`. |
| `london_conference_1992` | war_1992.json | 16-30 | Y | narrative; no flag. |
| `gorazde_pocket_consolidation_1992` | war_1992.json | 18-24 | Y | sets `gorazde_pocket_consolidated`. |
| `milosevic_isolation_warning_aug92` | war_1992.json | 18-26 | Y | content track. |
| `hvo_arbih_tensions_rise_1992` | war_1992.json | 20-35 | Y | sets `hvo_arbih_tensions_rising`. |
| `jajce_falls_1992` | war_1992.json | 28-39 | Y | sets `jajce_fell`. **Anchor for Jan 93.** |
| `gornji_vakuf_clashes_1993` | war_1993.json | 35-60 | Y | content. |
| `vance_owen_plan_1993` | war_1993.json | 39 | Y | turn-fixed. |
| `kravica_attack_1993` | war_1993.json | 39-41 | Y | content. |
| `turajlic_assassination_1993` | war_1993.json | 40-42 | Y | content. |
| `croat_bosniak_war_begins_1993` | war_1993.json | 40-80 | Y | sets `hvo_arbih_war_active`. **Anchor for Apr 94 implies fired.** |
| `ahmici_massacre_1993` | war_1993.json | 40-70 | Y | sets `ahmici_1993`. |
| `us_envoy_appointed_1993` | war_1993.json | 44-46 | Y | content. |
| `vrs_cerska_offensive_1993` | war_1993.json | 44-52 | Y | content. |
| `east_mostar_siege_1993` | war_1993.json | 45-80 | Y | content. |
| `un_resolution_808_tribunal_1993` | war_1993.json | 46 | Y | turn-fixed. |
| `central_bosnia_fighting_1993` | war_1993.json | 46-80 | Y | content. |
| `morillon_enters_srebrenica_1993` | war_1993.json | 48-50 | Y | content. |
| `srebrenica_shelling_1993` | war_1993.json | 49 | Y | turn-fixed. |
| `un_nfz_enforcement_1993` | war_1993.json | 51-53 | Y | content. |
| `croatia_herceg_bosna_control_1993` | war_1993.json | 52-60 | Y | content. |
| `sovici_doljani_attack_1993` | war_1993.json | 53-56 | Y | content. |
| `trusina_killings_1993` | war_1993.json | 53-58 | Y | content. |
| `un_resolution_819_srebrenica_1993` | war_1993.json | 54 | Y | turn-fixed. |
| `un_resolution_820_sanctions_1993` | war_1993.json | 54-56 | Y | content. |
| `srebrenica_demilitarization_1993` | war_1993.json | 54-56 | Y | sets `srebrenica_demilitarized`. |
| `un_safe_areas_declared_1993` | war_1993.json | 54 | Y | sets `safe_areas_have_defence_mandate`. |
| `vitez_kiseljak_pockets_1993` | war_1993.json | 55-70 | Y | content. |
| `rs_assembly_rejects_voplan_1993` | war_1993.json | 56-58 | Y | content. |
| `icty_established_1993` | war_1993.json | 60 | Y | turn-fixed. sets `icty_mandate_expanded`. |
| `battle_of_travnik_1993` | war_1993.json | 60-68 | Y | content. |
| `operation_neretva_93_1993` | war_1993.json | 60-95 | Y | content. |
| `un_resolution_836_force_1993` | war_1993.json | 61 | Y | turn-fixed. |
| `operation_sharp_guard_1993` | war_1993.json | 63 | Y | turn-fixed. |
| `hvo_detention_camps_1993` | war_1993.json | 63-70 | Y | content. |
| `sarajevo_tunnel_completed_1993` | war_1993.json | 64-66 | Y | gate for `state.sarajevo_tunnel_operational`. |
| `operation_lukavac_93` | war_1993.json | 65-72 | Y | content. |
| `maglaj_enclave_blockade_1993` | war_1993.json | 65-70 | Y | content. |
| `battle_of_bugojno_1993` | war_1993.json | 66-72 | Y | content. |
| `markale_area_shelling_1993` | war_1993.json | 68 | Y | turn-fixed. |
| `nato_air_strike_threat_1993` | war_1993.json | 69-71 | Y | content. |
| `owen_stoltenberg_plan_1993` | war_1993.json | 70 | Y | turn-fixed. |
| `grabovica_uzdol_massacres_1993` | war_1993.json | 73-76 | Y | content. |
| `abdic_apwb_declared_1993` | war_1993.json | 77 | Y | turn-fixed. |
| `bosnian_assembly_rejects_os_1993` | war_1993.json | 77-79 | Y | content. |
| `abdic_karadzic_pact_1993` | war_1993.json | 80-83 | Y | content. |
| `stupni_do_massacre_1993` | war_1993.json | 80-83 | Y | content. |
| `mostar_bridge_destroyed_1993` | war_1993.json | 83 | Y | turn-fixed. |
| `zagreb_orders_hrhb_ceasefire` | war_1994.json | 95-103 | Y | content. |
| `markale_massacre_1994` | war_1994.json | 96 | Y | turn-fixed. **Anchor for Apr 94.** |
| `nato_ultimatum_sarajevo_1994` | war_1994.json | 96 | Y | turn-fixed. |
| `sarajevo_exclusion_zone_1994` | war_1994.json | 97-98 | Y | content. |
| `nato_shoots_down_planes_1994` | war_1994.json | 99 | Y | turn-fixed. |
| `washington_agreement_1994` | war_1994.json | 102 | CONDITIONAL | sets `federation_formed_early` flag. XOR with `csq_federation_early_1994`. **Anchor for Apr 94+.** |
| `gorazde_crisis_1994` | war_1994.json | 105 | Y | turn-fixed. |
| `contact_group_plan_1994` | war_1994.json | 117 | Y | turn-fixed. |
| `belgrade_embargo_rs_1994` | war_1994.json | 121-122 | Y | content. |
| `anti_sniping_agreement_1994` | war_1994.json | 123 | Y | turn-fixed. |
| `bihac_5th_corps_offensive_1994` | war_1994.json | 129-132 | Y | sets `bihac_breakout_occurred`. |
| `operation_cincar_1994` | war_1994.json | 131-133 | Y | sets `kupres_recaptured`. |
| `bihac_crisis_1994` | war_1994.json | 135 | Y | turn-fixed. |
| `embargo_lifted_non_enforcement_1994` | war_1994.json | 136 | Y | sets `embargo_lifted`. |
| `carter_ceasefire_1994` | war_1994.json | 138-139 | Y | sets `carter_ceasefire_active`. |
| `coha_ceasefire_begins_1995` | war_1995.json | 139-140 | Y | sets `coha_active`. |
| `coha_expires_1995` | war_1995.json | 156-158 | Y | sets `coha_expired`. **Anchor for Apr 95.** |
| `operation_flash_1995` | war_1995.json | 157-158 | Y | sets `operation_flash_occurred`. |
| `tuzla_gate_massacre_1995` | war_1995.json | 160 | Y | turn-fixed. |
| `un_hostage_crisis_1995` | war_1995.json | 160-163 | Y | sets `un_hostage_crisis_occurred`. |
| `srebrenica_falls_1995` | war_1995.json | 160-185 | CONDITIONAL | sets `srebrenica_fallen`/`srebrenica_fell`. XOR with `csq_srebrenica_stalemate_1995`. **Anchor for Oct 95.** |
| `zepa_falls_1995` | war_1995.json | 160-190 | CONDITIONAL | sets `zepa_fallen`. XOR with `csq_enclave_held_alt_intervention`. |
| `second_markale_massacre_1995` | war_1995.json | 165-190 | Y | content. |
| `nato_deliberate_force_1995` | war_1995.json | 165-195 | CONDITIONAL | sets `nato_deliberate_force_occurred`. XOR with `csq_alternative_nato_trigger_1995`. **Anchor for Oct 95.** |
| `federation_ground_offensive_1995` | war_1995.json | 165-200 | Y | content. |
| `rapid_reaction_force_1995` | war_1995.json | 168-170 | Y | sets `rrf_deployed`. |
| `operation_summer_95` | war_1995.json | 172-173 | Y | sets `grahovo_glamoc_captured`. |
| `operation_storm_1995` | war_1995.json | 174 | Y | turn-fixed (off-map Krajina ref). |
| `karadzic_mladic_split_1995` | war_1995.json | 174-175 | Y | sets `karadzic_mladic_crisis`. |
| `operation_mistral_2_1995` | war_1995.json | 179-180 | Y | sets `jajce_recaptured`. |
| `operation_sana_1995` | war_1995.json | 179-183 | Y | sets `operation_sana_occurred`. |
| `ceasefire_1995` | war_1995.json | 181-200 | Y | content. |
| `holbrooke_ceasefire_demand_oct95` | war_1995.json | 183-185 | Y | sets `holbrooke_ceasefire_demanded`. |
| `dayton_talks_begin_1995` | war_1995.json | 184-210 | Y | content. |
| `dayton_signed_1995` | war_1995.json | 184-215 | Y | sets `dayton_signed`. Anchor: post-Oct 95 only. |

### 3.2 Consequence (csq_*) events

`consequences.json` contains **131 csq_* events**. These are emergent / state-conditioned and many have wide turn windows (`turn_max: undefined`). They are **reliable to anchor on** when keyed on a fixed-window condition (e.g. `csq_accelerated_camps_discovery_1992` turns 6-12) and **conditional / soft-anchor** when they depend on alliance, morale, or recurring-state predicates. As a rule:

- `csq_*_active_RBiH/RS/HRHB` flags: anchor-readable BUT semantically "this consequence is currently in effect," not "this event happened" — band-only.
- `csq_alliance_*`, `csq_patron_*`, `csq_extended_truce_streak_*`: gated on emergent alliance / patron / truce state — fragile for hard anchors, fine for trend bands.
- `csq_srebrenica_stalemate_1995` (turns 170-190): **mutually exclusive** with `srebrenica_falls_1995` on the same run. Anchors at Oct 95 must accept EITHER path (XOR).

### 3.3 Mutually exclusive event pairs to be aware of

- `srebrenica_falls_1995` (sets `srebrenica_fallen`) XOR `csq_srebrenica_stalemate_1995` (sets `srebrenica_stalemate`).
- `zepa_falls_1995` XOR `csq_enclave_held_alt_intervention` (sets `un_safe_areas_intact`).
- `nato_deliberate_force_1995` XOR `csq_alternative_nato_trigger_1995` (sets `nato_deliberate_force_alt_path`).
- `washington_agreement_1994` (canonical, turn 102) XOR `csq_federation_early_1994` (alt-path, turns 70-90, sets `federation_formed_early` early).

Anchors targeting these phenomena should be expressed as: "by w188, EITHER `nato_deliberate_force_occurred` OR `nato_deliberate_force_alt_path` flag set" — never as "specifically the canonical event must fire."

### 3.4 Full flag namespace

**175 flags written via `sets_flags`** in the five scenario JSONs (full set captured below); **141 flags read via condition predicates** (used as event triggers — anchors may assume the engine itself respects them).

Flags written via `sets_flags` (alphabetical):

`advance_halted, ahmici_1993, alliance_held_past_w35, alliance_reset_completed, alliance_revived_after_hostility, alliance_silent_drift, arms_embargo_active, arms_pipeline_attenuated_active_{HRHB,RS}, arms_pipeline_disrupted_{HRHB,RBiH,RS}, back_channel_active{,_HRHB,_RS}, barracks_{sarajevo,tuzla,visoko,zenica}_seized, bihac_breakout_occurred, bihac_pocket_fell, black_market_route_active_RBiH, camps_response, camps_revealed{,_early}, captured_equipment_windfall_active{,_HRHB,_RS}, carter_ceasefire_active, civic_identity_consolidation_1993, clean_record, coha_{active,expired}, corps_reorganization_active_HRHB, corridor_secured, dayton_signed, demobilization_wave_active_{HRHB,RBiH,RS}, doctrine_drift_active_{HRHB,RBiH,RS}, doctrine_modernization_active_{HRHB,RBiH}, doctrine_reform_initiated_RBiH, drina_cleansing_{intensity,occurred}, drina_partisan_resistance_active, drina_refugee_wave_suppressed, early_nato_threshold_lowered, early_peace_w120, embargo_croatia_transit, embargo_lifted, equipment_quality_recovery_streak_active_{HRHB,RBiH,RS}, extended_truce_streak_active_{HRHB,RBiH,RS}, federation_formed_early, force_quality_inversion, gorazde_pocket_consolidated, grahovo_glamoc_captured, grain_corridor_active{,_HRHB,_RS}, holbrooke_ceasefire_demanded, hrhb_political_goal, hrhb_posture, hvo_arbih_tensions_rising, hvo_arbih_war_active, icty_mandate_expanded, industrial_wave_active_{HRHB,RBiH,RS}, iran_arms_channel_attenuation_active_{HRHB,RBiH}, jajce_fell, jajce_recaptured, jna_withdrawn, joint_command_collapsed, joint_operations_agreement_active, karadzic_mladic_crisis{,_occurred}, kupres_recaptured, late_war_volunteer_surge_active_RBiH, mediator_engagement_streak_active_{HRHB,RBiH,RS}, mobilization_demographics_strained_{HRHB,RBiH,RS}, mostar_liberated, nato_deliberate_force_alt_path, negotiating_capital_recovery_active_{HRHB,RBiH,RS}, operation_flash_occurred, operation_sana_occurred, paramilitary_authorization_refused, paramilitary_refusal_streak_active_{HRHB,RBiH,RS}, partition_referendum_{engaged,refused}, patron_arms_review_active{,_HRHB,_RBiH}, patron_arms_review_imposed_turn{,_HRHB,_RBiH}, patron_cohesion_ceiling_locked, patron_confidence_floor_locked, patron_equipment_delivery_confirmed, patron_partial_disavowal{,_HRHB,_RBiH}, patron_recovery_{accepted,refused}, political_split_temporary_active_{HRHB,RBiH,RS}, post_cease_fire_recruitment_decline_active_{HRHB,RBiH,RS}, post_dayton_arms_normalization_active, post_dayton_train_and_equip_active_{HRHB,RBiH}, pragmatic_coalition_1993, predictor_confidence_haircut, rbih_posture, rbih_state_identity, refugee_absorption_strain_RBiH, refugee_labor_mobilization_active_RBiH, reservist_exhaustion_callup_active_RS, resistance_revival_active_{HRHB,RBiH,RS}, rrf_deployed, rs_belgrade_response, rs_posture, rs_strategic_goals, safe_areas_have_defence_mandate, sarajevo_hwez_complied, sarajevo_hwez_defied, sarajevo_siege_active, separate_peace_{declined,pursued}, separate_track_recovery_active, spring_thaw_supply_recovery_active_{HRHB,RBiH,RS}, srebrenica_demilitarized, srebrenica_enclave_formed, srebrenica_stalemate, supply_corridor_chronic_strain_active_{HRHB,RBiH,RS}, third_party_arms_channel_active_{HRHB,RBiH}, third_party_mediation_{declined,engaged}, tribunal_observation_filed, tripartite_overture_{declined,engaged}, un_hostage_crisis_occurred, un_hostage_response, un_safe_areas_intact, war_exhaustion_high_streak_active_{HRHB,RBiH,RS}, washington_agreement_alt_path, winter_supply_attrition_active_{HRHB,RBiH,RS}`.

### 3.5 Gated proposals — well-known events NOT yet flagged

Researchers may want to anchor on these historical events that DO NOT currently have a state flag or canonical event ID. Each becomes a gated proposal requiring **schema/data additions before wire** (see §4):

| Historical event | Closest current flag | Gating gap |
|---|---|---|
| Fall of Banja Luka / Posavina corridor breach by HV-HVO (Sept 95) | `operation_storm_1995` (off-map ref only) | No in-map `posavina_corridor_breached_1995` flag. |
| Mrkonjic Grad / Sanski Most capture (Oct 95) | `operation_sana_occurred` | Coarse — no OSID-level granular flag. |
| Specific Apr 94 NATO first-use-of-force vs Markale | `nato_shoots_down_planes_1994` + `markale_massacre_1994` | Two coarse flags; no single `nato_first_use_of_force_1994` flag. |
| Tuzla 1995 winter siege intensification | `winter_supply_attrition_active_RBiH` | Generic; no Tuzla-specific flag. |
| Bihac pocket relief (Aug 95) | `bihac_breakout_occurred` | Reads as "5th Corps broke out" — but not "the pocket was permanently relieved." |
| Mt. Igman supply route operational | `sarajevo_tunnel_operational` (state field) | Tunnel exists; Mt. Igman alt route does not have a flag. |

---

## 4. Required schema additions (before wire)

Each row below is a gating prerequisite. Anchors of the named type cannot be wired until the schema lands in `src/state/game_state.ts` and the canonical computation/serialization writer exists. **None of these are proposed here as canon changes** — they are surfaced for the engineering owner (data-pipeline-engineer + systems-programmer) to scope.

| Anchor type / data need | Proposed schema | Owner | Why it doesn't exist today | Gate status |
|---|---|---|---|---|
| Type 1 area-share band (canonical rollup) | `state.geometry.area_share_by_faction: Record<FactionId, number>` OR exposed inside `turn_summaries[].area_share_by_faction` (recomputed each turn, NOT serialized at top level per §13.1) | data-pipeline-engineer | Currently computed by `tools/diagnostics/` only; no canonical per-turn field. **Engine Invariants §13.1 forbids serialization of derived state, so the canonical form is to surface it inside `turn_summaries`, not as a top-level state field.** | GATED — needs canon-aligned implementation note. |
| Cumulative KIA aggregate by faction | already exists: `state.military.casualty_ledger[F].killed` | n/a | Field already present in `src/state/casualty_ledger.ts`. | NOT GATED. |
| Civilian killed by ethnicity-aligned faction | already exists: `state.displacement.civilian_casualties[F].killed` | n/a | Field already present. | NOT GATED. |
| Per-municipality cumulative displaced | already exists: `state.displacement.displacement_state[M].*` and `displacement_humanitarian_aggregates` | n/a | Present. | NOT GATED. |
| OSID-level "captured turn" lookback | needs `state.political.control_history: Array<{turn, settlement, from, to, mechanism}>` OR derive from `control_events` log if retained > 3 turns | systems-programmer | `control_events` is "last 3 turns only" per `game_state.ts` comment — too short for w156 / w188 anchors looking back at w40 flips. | GATED — needs retention extension or a separate append-only `control_history`. |
| Corridor Open/Brittle/Cut state at turn T | recompute from `political_controllers` at anchor-eval time | n/a (anchor checker) | Per §13.1 cannot be serialized. Anchor implementations must include the recomputation. | NOT GATED for assertion logic; gated for "easy read" convenience. |
| Apr 94 NATO first-use-of-force distinct flag | new `sets_flags: { nato_first_use_of_force_1994: true }` in `nato_shoots_down_planes_1994` event | game-designer + scenario-creator | Event exists; flag does not. | GATED — additive, low-risk. |
| Posavina corridor "intact at turn T" boolean | derived; either expose in `turn_summaries` or add an event flag pair `posavina_corridor_open_at_w40/w104/...` | data-pipeline-engineer | No corridor state in saved turn summary today. | GATED for hard anchor; ungated as recomputed band. |
| Banja Luka encirclement at Oct 95 | no current flag; would need `banja_luka_encircled_oct95` set by area-of-control predicate | scenario-creator | Authorial gap; flag space is open. | GATED. |
| Per-faction "active brigades with cohesion >= X" rollup | derive from `state.military.formations` (already present) | n/a | Anchor checker computes. | NOT GATED. |
| Sarajevo siege turn counter exposure | already exists: `state.military.siege_turn_counters['F:osid']` | n/a | Field present. | NOT GATED. |
| Faction exhaustion band | already exists: `state.political.war_exhaustion[F]` | n/a | Field present. | NOT GATED. |
| Operation outcome history (which operations completed) | `state.operation_history?: OperationAAR[]` already exists | n/a | Field present per `game_state.ts:1827`. | NOT GATED. |

**Count of net-new schema additions required (truly gated):** **4** (`turn_summaries[].area_share_by_faction` exposure; extended-retention `control_history`; Apr 94 NATO first-use distinct flag; Posavina corridor open-state exposure or per-window flags; plus the optional Banja Luka encirclement flag — 5 if counting that separately).

---

## 5. Determinism contract

Anchors are evaluated against the deterministic save output of `scenario_runner.ts`. The following state surfaces are SAFE to read; reading from anything else risks a non-deterministic or hash-shifting anchor.

### 5.1 SAFE to read (deterministic, serialized, anchor-grade)

| Field | Citation | Notes |
|---|---|---|
| `state.political.political_controllers[settlementId]` | Engine Invariants §9.1, §11.4 | Authoritative controller; settlement-keyed. Use `canonical_to_operational_map.json` to roll up to OSID. |
| `state.political.initial_political_controllers` | §9.2 | The painted-target snapshot at scenario init. Anchor-readable for "delta from start." |
| `state.political.end_state` | §10.1 | Set deterministically when a peace treaty is accepted. |
| `state.political.war_exhaustion[F]` | §8 | Monotonic, irreversible. |
| `state.political.war_exhaustion_local[settlementId]` | §8 | Monotonic when present. |
| `state.political.war_supply_pressure[F]`, `war_supply_condition[F]` | §4 | Per-faction; derived but persisted for save/replay parity. |
| `state.political.enclaves[*]` | §12.2 | Enclave integrity tracking. |
| `state.political.sarajevo_state` | §12.1 | Sarajevo exception state. |
| `state.political.war_alliance_rbih_hrhb` | game_state.ts:2312 | Bilateral alliance value [-1, 1]. |
| `state.political.war_consolidation_until[M]` | game_state.ts:2308 | Per-municipality flip-lock turn. |
| `state.political.war_control_strain[M]` | game_state.ts:2310 | Reversible per §8 (control strain not exhaustion). |
| `state.military.formations[formationId]` | §14.3, §14.3a, §14.4 | Cohesion ∈ [0,100], morale ∈ [0,100], `location_osid`. |
| `state.military.casualty_ledger[F]` | `casualty_ledger.ts` | Append-only, faction + formation granularity. |
| `state.military.fired_event_ids` | §11.4 | `string[]` of fired event IDs. |
| `state.military.event_flags` | §11.4 | `Record<string, string\|number\|boolean>`. |
| `state.military.event_fire_counts` | §11.4 | Counter per event. |
| `state.military.event_last_fired_turn` | §11.4 | Last fire turn per event. |
| `state.military.enabled_event_ids` | §11.4 | Chain-unlocked events. |
| `state.military.siege_turn_counters['F:osid']` | §4 (Phase B siege) | Faction:OSID consecutive critical-supply counter. |
| `state.military.general_supply_reserve[F]`, `heavy_munitions_reserve[F]` | §4 (Supply Reserves Phase A) | [0..100]. |
| `state.military.operation_history` | game_state.ts:1827 | Completed `OperationAAR[]`. |
| `state.military.triggered_operations_accepted` | combat | Map `op_name to turn_accepted`. |
| `state.military.declined_operations` | combat | Map `op_name to { declined_turn, decline_count }`. |
| `state.military.front_edges[]`, `war_front_edges_osid[]` | game_state.ts:1974, 1976 | Front edge snapshot. Derived but explicitly serialized as snapshot. |
| `state.military.sarajevo_tunnel_operational` | game_state.ts:2064 | One-time unlock flag. |
| `state.military.vienna_*` (Graz Accords) | §6.4 + game_state.ts | Truce state. |
| `state.military.event_constraints` | events subsystem | Active operation constraints. |
| `state.military.recruitment_state` | game_state.ts:2032 | Capital pools, equipment pools, recruited brigade tracking. |
| `state.military.alliance_locks` | game_state.ts:2196 | Active alliance floor/ceiling locks. |
| `state.displacement.civilian_casualties[F]` | game_state.ts | `{ killed, fled_abroad }`. |
| `state.displacement.displacement_event_log` | sorted `(turn, origin_mun)` | Deterministic log. |
| `state.displacement.displacement_humanitarian_aggregates` | LANE D-PRE substrate | Per-caused-by × ethnicity aggregates. |
| `state.displacement.settlement_displacement`, `municipality_displacement` | game_state.ts | Monotonic capacity degradation [0,1]. |
| `state.meta.phase`, `state.meta.turn` | core | Always available. |
| `turn_summaries[]` (last 3 turns) | game_state.ts:1825 | Per-turn AAR rollups; current canon retains the last 3 only — see §4 gate. |

### 5.2 UNSAFE to read in anchors

| Field / pattern | Reason |
|---|---|
| Anything under `state.military.pending_event_decisions` / `pending_event_notifications` / `pending_officer_events` / `pending_paramilitary_requests` / `pending_convoy_decisions` / `pending_reserve_requests` | Transient queues — consumed and cleared. Reading on a save mid-turn yields race-shaped results. |
| `state.military.ai_decision_log`, `ai_army_decisions`, `corps_dialogues`, `war_dispatches`, `battle_narratives`, `narrative_queue`, `last_briefing` | Cosmetic / replay-only. Explicitly tagged "never affects gameplay." Hash-stable but **not contract-stable** across small narrative tunings. |
| `state.military.watched_operations` | "Observability only; does not affect launch behavior" per game_state.ts:2006. Anchor reads here would couple anchor pass/fail to diagnostic output, not engine truth. |
| `state.military.op_injection_warnings` | Diagnostic. |
| `state.military.operation_opportunity_diagnostics` | "Pure observability — does NOT affect eligibility, decisions, op spawning, or AAR linkage" per game_state.ts:2019. |
| `state.military.friction_events` | Order-of-events sensitive; safe to count but not to address by index. |
| Anything tagged "Legacy compatibility" in `game_state.ts` (e.g. `brigade_front_assignment`, `theatres`, `army_theatre_assignment`, `brigade_desired_aor_cap`, `brigade_reposition_orders`, `assignable_front_segments`) | Comment in source says "Do NOT read this field for frontline truth." |
| Any field set by `Math.random()`, `Date.now()`, or wall-clock-derived ID | Engine Invariants §11.1, §11.2. None exist in current sim, but third-party future fields must be screened. |
| Iteration over `Record<>` values without `strictCompare`-sorted keys | Engine Invariants §11.3. Anchor checker MUST sort keys when computing aggregates. |
| Derived corridor / front state read directly from save as "Open/Brittle/Cut" tag | Engine Invariants §13.1, §13.2 — derived states must not be serialized; "reading" a value means reading a stale snapshot. Recompute. |
| `state.military.event_readiness` | Pressure counter; subject to retuning. Use the resulting flag, not the counter, for hard anchors. |
| `state.military.corps_front_sectors`, `sector_combat_ratings`, `sector_intel`, `home_distance_cache` | "Derived each turn" per game_state.ts:2037-2045. Safe to read AT END OF TURN; do NOT use as a long-horizon trend source. |

### 5.3 Determinism guard rails for anchor implementations

- Anchors MUST use stable iteration (`strictCompare`) when summing over OSIDs / formations.
- Anchors MUST NOT call `Math.random()` or read wall-clock during evaluation.
- Anchors SHOULD be expressed as **band predicates** (`X <= value <= Y` or set-membership), not exact-equality on float aggregates that may drift across canon-aligned implementation refactors.
- Anchors SHOULD tolerate event-XOR alternatives (see §3.3) where canon permits divergent emergent paths.
- Anchors SHOULD prefer `event_flags` (durable) over `fired_event_ids` for outcome-shaped assertions; use `fired_event_ids` when the assertion is about narrative occurrence rather than mechanical effect.

---

## 6. Summary

- **Canon-safe anchor patterns:** 8 (Type 1 area-share band; Type 2 event predicate; Type 2b humanitarian; Type 3 OSID flip; Type 4 corridor/contiguity recomputed; Type 5 cumulative attrition; Type 6 negotiation/treaty; Type 7 exhaustion / supply band).
- **Canon-violating anchor patterns:** 9 (Sarajevo center flip; initial-OSID override; legacy faction IDs; `avoided_osids_by_faction`-railroad; derived-state read from save; brigade-destruction count; passive-pressure flip; exhaustion-reducing; one-turn fragmentation).
- **Required schema additions (gated):** 4 net-new (`turn_summaries[].area_share_by_faction` exposure; extended-retention `control_history`; Apr 94 NATO first-use distinct flag; Posavina corridor open-state exposure or per-window flags) — plus 1 optional (Banja Luka Oct 95 encirclement flag).
- **Event flag inventory:** 175 flags written via `sets_flags`, 141 flags read by conditions, ~246 event IDs across `data/scenarios/events/*.json` (anchor-grade subset enumerated in §3.1).
- **Determinism contract:** ~33 SAFE fields enumerated, ~11 UNSAFE patterns flagged.

This frame is read-only and additive. No canon edits proposed; no source edits proposed; no anchor-file edits performed. Anchor proposals from the parallel specialists (Type 1-5 drafts) and `/war-or-game` realism criteria should be cross-checked against §1 (safe) and §2 (violating) before wire, and any §4 gates closed first.

---

*— canon-compliance-reviewer, 2026-05-21*
