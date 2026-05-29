# Engine Synthesis — Fall 1995 Mechanics

**Date:** 2026-05-23
**Author:** synthesis pass
**Inputs:** the three research dispatches dated 2026-05-23:
- `20260523_RESEARCH_ARBIH_FALL_1995.md`
- `20260523_RESEARCH_HVO_HV_FALL_1995.md`
- `20260523_RESEARCH_VRS_2KK_COLLAPSE.md`
**Status:** proposal — no engine code written yet

---

## 0. The historical claim, compressed

Between 4 August and 12 October 1995, Republika Srpska went from ~70% of BiH territory to ~49–51%. The collapse was localized to VRS 2nd Krajina Corps (2KK), it was driven by external step-function shocks more than by ARBiH/HVO industrial mobilization, and it stopped at a politically chosen line (the 51:49 formula), not at the limit of VRS resistance.

The three reports converge on a single causal chain:

```
Storm (4–7 Aug, external)
  → SVK destroyed
  → ARBiH 5th Corps western flank freed
  → HV-ammo transfusion to 5th Corps (5 wk window)
  → ~165k refugees flood 2KK rear
  → 2KK frontage doubles overnight (former SVK arc)

Markale II (28 Aug) → NATO Deliberate Force (30 Aug – 20 Sept, external)
  → VRS C2 + IADS + bridges suppressed (~3 wk)
  → VRS artillery driven out of TEZs around Sarajevo/Goražde/Tuzla

Federation theatre pulse (8–17 Sept, internal but coordinated)
  → Mistral 2 (HV + HVO embedded) from south
  → Sana 95 (ARBiH 5th + 7th Corps) from west
  → Multi-axis simultaneity: 2KK cannot laterally redeploy
  → Cascade SW→S→W: Grahovo/Glamoč → Šipovo → Jajce → Mrkonjić → Ključ → Drvar → Petrovac → Sanski Most → Krupa

5th Corps Ključ crisis (mid-Sept)
  → ARBiH formally requests HV ground rescue (only such request of the war)
  → HV Southern Move (8–11 Oct) breaks 2KK final pocket

Tuđman 51:49 + Holbrooke (19 Sept – 12 Oct, external)
  → Banja Luka halt
  → Ceasefire 12 Oct, freeze line ≈ Dayton 51:49
```

The simulation today cannot reproduce most of this. The gaps are listed below.

---

## 1. Mechanism inventory (21 items)

Consolidated from the three research dispatches. Each item is tagged with a stable mechanism code (M1–M21) used in §2 and §3.

### Starting-condition mechanics

| Code | Mechanism | Source |
|---|---|---|
| **M1** | VRS 2KK enters 1995 in "discredited" state after Grmeč 1994 rout | VRS 2KK §1, BB2 p.555–556 |
| **M2** | 2KK frontage ~30 km/brigade against 10 km doctrinal norm | VRS 2KK §1.4 |
| **M3** | SVK shared Bihać siege arc (load-bearing partner) | VRS 2KK §2 |

### External shock events (exogenous to BiH-internal sim)

| Code | Mechanism | Window | Source |
|---|---|---|---|
| **M4** | Operation Storm — SVK destroyed, 2KK partner+depth lost | 4–7 Aug 1995 | All 3 reports |
| **M5** | ~165k Serb refugees flood Bosanska Krajina rear | 4–11 Aug 1995 | VRS 2KK §2, HVO §3.5 |
| **M6** | NATO Deliberate Force — VRS C2/IADS/bridges suppressed | 30 Aug – 20 Sept | ARBiH §5.2 |
| **M7** | HV ammo transfusion to ARBiH 5th Corps (ex-SVK captures) | 7 Aug – 13 Sept | ARBiH §1.5, item 1 |
| **M8** | Captured equipment cascades during Sana (Petrovac/Sanski Most depots) | mid-Sept onward | ARBiH §1.5, item 3 |

### Pre-operation rear-clearing

| Code | Mechanism | Window | Source |
|---|---|---|---|
| **M9** | Sloboda 95 / Velika Kladuša APZB collapse — precondition for Sana | 5 Aug – 7 Sept | ARBiH §1.2 Phase 1 |
| **M10** | Treskavica/Trnovo (1st Corps) — tied VRS forces in eastern strategic depletion | 15 June – mid-July | ARBiH §4.1 |

### Coordinated offensive mechanics

| Code | Mechanism | Source |
|---|---|---|
| **M11** | Tri-faction synchronization — Mistral 2 + Sana + Southern Move = ONE theatre pulse | HVO §3.5, ARBiH §5.5 |
| **M12** | HV–HVO structurally one force (HVO Guards Bdes = line units of HV OG North) | HVO §4.1, §9 |
| **M13** | Multi-axis simultaneity prevents lateral defender redeployment | VRS 2KK §4 Tier 2 |
| **M14** | HV-only Operation Una FAILED (negative control: HV is not unconditionally decisive) | HVO §6 |
| **M15** | 5th Corps formally requested HV rescue at Ključ → Southern Move | HVO §5.4 |

### Defender collapse mechanics

| Code | Mechanism | Source |
|---|---|---|
| **M16** | Karadžić–Mladić parallel command crisis | ARBiH §5.6, VRS 2KK §3 W+2 |
| **M17** | Civilian flight from front-line munis depopulates defender rear | VRS 2KK §2 |
| **M18** | Corps-level coordination failure (NOT sum of brigade casualties) | VRS 2KK §7 |
| **M19** | Counter-clockwise collapse sequence: HV/HVO contact zone → 5th Corps contact zone | VRS 2KK §5 |
| **M20** | VRS strategic priority — hold east + corridor + Banja Luka, accept loss of west | ARBiH §7 item 10 |

### External stopping condition

| Code | Mechanism | Source |
|---|---|---|
| **M21** | Tuđman 51:49 self-halt + Holbrooke veto — Banja Luka halt at ~49% RS | HVO §7.4 |

---

## 2. What the engine currently does vs. what's missing

### Currently in the engine (per repo memory + code)

- Three factions: RBiH, RS, HRHB (canonical)
- Operation catalog with scripted ops, including Sana 95 encoding (5th Corps, 3 axes, 31 OSIDs, turn-gate ≥175) in `20260501_LATE_1995_SCRIPTED_OPS_PACKET.md`
- Brigade combat math: `basePower = personnel × eq × exp × coh × honor` (`combat_math.ts:896`)
- Brigade lifecycle: status active/inactive, dissolution via 2-of-3 (lowPersonnel<400, lowCohesion≤20, lowMorale≤15)
- Engine #2 (committed): cohesion-only dissolution prevention + strategic reserve reconstitution Path C
- Engine #4B (committed, then partially reverted in this session): painted Goražde flips + dead coercion bumps
- Event registry covering 1995 ops: `data/scenarios/events/war_1995.json` has `operation_summer_95`, `operation_storm_1995`, `nato_deliberate_force_1995`, `operation_mistral_2_1995`, `operation_sana_1995`, `us_halts_federation_advance_1995`, `ceasefire_1995` as anchor sequence

### Missing — 1995-specific gaps

Mapped directly to the mechanism codes:

| Gap | Mechanisms not modeled | Severity |
|---|---|---|
| **G1** | No external-shock event semantics — Storm, Deliberate Force, refugee flow are calendar anchors but don't change combat math | M4, M5, M6 | **high** |
| **G2** | No supply step-function — HV ammo transfusion isn't representable | M7 | **high** |
| **G3** | No multi-axis simultaneity penalty on defender | M11, M13 | **high** |
| **G4** | No corps-level coherence/coordination state (separate from brigade health) | M18 | **high** |
| **G5** | No HV-equivalent embedded brigade pool — Mistral 2 force is unattributed | M12, M14, M15 | **high** |
| **G6** | No cascade-trigger via adjacent OSID loss | M19 | medium |
| **G7** | No defender strategic-priority tiering (core vs corridor vs periphery) | M20 | medium |
| **G8** | No frontage/overstretch metric (km of front per brigade) | M2 | medium |
| **G9** | No starting "discredited" corps state from prior-year defeats | M1 | low |
| **G10** | No external stopping condition for 51:49 halt | M21 | medium |
| **G11** | No rear-area paralysis from refugee/civilian flight | M5, M17 | low |
| **G12** | APZB / Velika Kladuša as pre-Sana rear-clearing missing from scripted ops packet | M9 | medium |

---

## 3. Proposals — ordered by ROI/cost

Three tiers. Tier A is shippable in the current branch with small surgical changes. Tier B requires new state fields. Tier C requires more invasive rework.

All proposals respect the sacred rules: **canonical faction IDs only (RBiH/RS/HRHB)**, **no initial OSID overrides**, **no `avoided_osids_by_faction`**, **determinism**, **ops-only attacks**, **no 7th Corps simulation** (engine deliberately omits 6th and 7th Corps per user constraint — Sana 95 7th Corps participation must be handled as supplementary effect on 5th Corps ops or as HVO action).

### Tier A — small, high-ROI (target: ship in one session)

**E-A1. External capability-suppression event (G1, addresses M6)**
- New event payload `external_capability_suppression`:
  ```typescript
  {
    target_faction: 'RS',
    multiplier_combat_power: 0.7,
    multiplier_artillery: 0.5,
    multiplier_c2: 0.4,
    turn_start: 158, // ≈ 30 Aug 1995
    turn_end: 162,   // ≈ 20 Sept 1995
    source_label: 'nato_deliberate_force_1995'
  }
  ```
- Hook: at start of each war-phase turn, scan active events; apply faction-wide multiplier in `combat_math.ts` for the duration window.
- Files: `src/sim/turn_phases/war_phases.ts` (event scanner), `src/sim/combat/combat_math.ts` (multiplier application), `data/scenarios/events/war_1995.json` (event payload).
- Cost: ~50 lines + tests.

**E-A2. External supply transfusion event (G2, addresses M7)**
- New event payload `external_supply_transfusion`:
  ```typescript
  {
    target_faction: 'RBiH',
    target_corps: 'arbih_5th_corps',
    equipment_delta: 400,
    recruitment_delta: 100,
    turn_start: 154, // ≈ 7 Aug 1995
    turn_end: 159,   // ≈ 13 Sept 1995 (Sana start)
    source_label: 'hv_ammo_transfusion_post_storm'
  }
  ```
- Hook: at turn start, deposit equipment_points and recruitment_capital to faction. Optionally target a specific corps' brigade equipment field.
- Cost: ~40 lines.

**E-A3. Multi-axis simultaneity penalty on defender (G3, addresses M11/M13)**
- For each corps in defender faction, count `active_enemy_offensives_against_corps` (operations targeting this corps' OSIDs in current turn).
- Penalty: `defender_combat_power *= (1 - 0.10 × min(active_offensives-1, 3))` — i.e. 1 op = 1.0×, 2 ops = 0.9×, 3 ops = 0.8×, 4+ ops = 0.7×.
- Mechanism: as multiple ops spread defender attention, brigade rotation and artillery counter-battery fail.
- Files: `src/sim/combat/sector_offensive.ts` or wherever defender power is computed.
- Cost: ~30 lines.

**E-A4. Cascade-trigger via adjacent OSID loss (G6, addresses M19)**
- When OSID `X` flips faction in turn `T`, every front-edge-adjacent OSID `Y` owned by the losing faction gets a 1-turn defender penalty for turn `T+1`: `defender_combat × 0.85`.
- Captures the counterclockwise collapse: each loss makes the next defender more brittle.
- Files: in war_phases step that resolves OSID flips, emit `cascade_pressure` field on neighbors; combat reads it.
- Cost: ~50 lines.

**E-A5. External stopping condition — 51:49 halt (G10, addresses M21)**
- New event payload `external_stopping_condition`:
  ```typescript
  {
    trigger: { type: 'faction_area_ratio', faction: 'RS', max_share: 0.51 },
    effect: { suppress_offensive_ops_for_factions: ['RBiH','HRHB'], turn_window: 6 },
    source_label: 'us_halts_federation_advance_1995'
  }
  ```
- Hook: at turn start, check if trigger condition met; if so, set faction "no_new_offensive_ops" flag for window.
- This is the engine's first "external-diplomatic" gate. Sets precedent for future Dayton/peace mechanisms.
- Cost: ~40 lines.

**E-A6. APZB / Sloboda 95 added to scripted ops packet (G12, addresses M9)**
- Add `operation_sloboda_95` as a 5th Corps rear-clearing op, target OSIDs around Velika Kladuša, turn-gate ≈ 152–157 (Aug 1995 weeks), required `predecessor` for Sana 95.
- Implementation: edit `late_1995_scripted_ops_packet` data file, no code change.
- Cost: data only.

### Tier B — medium, structural

**E-B1. Corps-level coordination coherence (G4, addresses M18)**
- New field on `state.military.formations[corps_id]`: `coordination_coherence: 0..1`, default 1.0.
- Decays from: adjacent OSID losses, severed C2 (Deliberate Force suppression), brigade-rotation failures, parallel-command crisis events (M16).
- Effects when below threshold:
  - `< 0.7`: corps cannot launch new operations
  - `< 0.5`: corps brigades drop into "independent retreat" mode (cannot be assigned to defend OSIDs > 1 hop from current location)
  - `< 0.3`: corps "fragments" — brigades transfer administrative control to adjacent friendly corps
- This is the central proposal. Without it, 2KK's collapse cannot be reproduced.
- Files: new field in `game_state.ts`, decay logic in war_phases, threshold checks in op-launch + brigade-assignment.
- Cost: ~200 lines + tests + memory write.

**E-B2. HV-equivalent embedded brigade pool (G5, addresses M12, M14, M15)**
- Add `state.military.foreign_attached[faction]` — a virtual brigade pool legally owned by HRHB but tagged `attached_source: 'hv'`.
- Brigade combat stats follow HRHB faction modifiers (since canonical IDs only); but the pool only activates on `split_agreement_1995` event (turn ≈ 150, ≈ 22 July 1995).
- For Mistral 2: activate ~9 brigades scaled to HV OG North + South + West composition.
- For Una (negative control): if activated WITHOUT HVO co-deployment AND defender_overstretch flag, the brigades take a heavy effectiveness penalty — replicates M14.
- For Southern Move: activates only when 5th Corps "rescue requested" flag fires (M15).
- Files: new state field, scenario event handler, op-eligibility filter.
- Cost: ~150 lines + scenario data.

**E-B3. Strategic-depth state per corps (addresses M3, M4)**
- New field `state.military.formations[corps_id].strategic_depth: 0..1`.
- Initial value derived from: friendly-controlled adjacent municipalities, distance to nearest non-friendly faction-front, friendly partner forces (SVK presence).
- Storm event (Aug 4) sets 2KK strategic_depth from ~0.7 to ~0.1.
- Affects: defender reinforcement-availability, reserve-commitment delay, corps-coherence decay rate.
- Files: new field, init logic, decay/snapshot at events.
- Cost: ~100 lines.

**E-B4. Defender strategic-priority tiering (G7, addresses M20)**
- Add `strategic_priority: 'core' | 'corridor' | 'periphery'` to OSID/muni metadata (data-only field).
- For VRS in autumn 1995 (turn ≥ 154):
  - Core: Banja Luka, Pale, Han Pijesak, Sokolac, Bijeljina, Brčko vicinity
  - Corridor: Posavina (Brčko–Modriča–Doboj–Derventa–Bosanski Brod axis), eastern Bosnia link
  - Periphery: western Bosnia (Drvar, Glamoč, Petrovac, Krupa, Ključ, Sanski Most, etc.)
- Effect: when corps has limited reserves, allocate to core > corridor > periphery. Periphery defenders take a "abandoned" penalty when corps coherence is low.
- Files: data file `data/source/strategic_priorities.json`, lookup in defender power calc.
- Cost: ~80 lines + data.

### Tier C — invasive, defer until Tier A/B validated

**E-C1. Frontage overstretch metric (G8, addresses M2)**
- For each corps, sum km of front-line edges divided by active brigades → `frontage_density`.
- Effect: when density exceeds 25 km/brigade, defender power × 0.85; >40 km/brigade × 0.7.
- Requires: front-edge geometry already computed (memory says `frontEdgesOsid` available). Need to attribute edges to corps.

**E-C2. Rear-area paralysis from refugee flow (G11, addresses M5, M17)**
- New per-municipality field `rear_paralysis: 0..1`.
- Storm event (Aug 4–11) sets rear_paralysis to 0.8 across a corridor of RS munis (Drvar, Petrovac, Glamoč, Bos. Krupa, Bos. Novi, Sanski Most, Banja Luka).
- Effect: brigade rotation and reinforcement-arrival delays in paralyzed munis.

**E-C3. "Discredited" corps starting state (G9, addresses M1)**
- New scenario-init field per corps: `prior_year_defeats: number`.
- For VRS 2KK in apr1992_definitive_188w.json: set to 2 (Cincar 94 + Grmeč 94).
- Effect: 0.1 × prior_year_defeats subtracted from initial coordination_coherence.
- Only meaningful if E-B1 is shipped first.

---

## 4. Proposed shipping order

### Sprint 1 (Tier A, all 6 items)

Order matters slightly:

1. **E-A6** (Sloboda 95 scripted op, data-only) — clears the path for Sana 95 timing
2. **E-A2** (supply transfusion event) — gives 5th Corps the equipment to actually attempt Sana
3. **E-A1** (capability suppression event) — degrades VRS so Sana can succeed
4. **E-A3** (multi-axis simultaneity penalty) — makes Mistral 2 + Sana coordination matter
5. **E-A4** (cascade trigger) — makes the counter-clockwise collapse visible
6. **E-A5** (51:49 stopping condition) — stops the offensive at the right place

After Sprint 1, run the 188w scenario and measure: does the Sana cascade reach Sanski Most? Does it stop short of Banja Luka? Expected: spatial match_ratio improvement of +3–5pp.

### Sprint 2 (Tier B, structural)

7. **E-B1** (corps coordination coherence) — the central proposal; everything downstream depends on it
8. **E-B3** (strategic depth) — provides input to coherence decay
9. **E-B4** (strategic priority tiering) — shapes where defender allocates reserves
10. **E-B2** (HV-embedded brigade pool) — last because it needs E-B1 to know "when does this pool activate"

After Sprint 2, expect another +3–5pp.

### Sprint 3 (Tier C)

Defer until Sprint 1 + 2 results are in. May not all be needed.

---

## 5. Sacred-rule compliance check

| Rule | Compliant? | Notes |
|---|---|---|
| Canonical faction IDs only (RBiH/RS/HRHB) | ✅ | HV modeled as HRHB-attached brigade pool, not a fourth faction |
| No initial OSID overrides | ✅ | All proposed mechanisms work via events + combat-math modifiers; no init control flips |
| No `avoided_osids_by_faction` | ✅ | Defender priority via `strategic_priority` is a *data classification*, not a forced behaviour override |
| Determinism | ✅ | All effects come from scenario events with explicit turn-gates and from sorted-iteration combat math |
| Ops-only attacks | ✅ | No new attack pathways introduced; ops still flow through CorpsOperation |
| No 7th Corps simulation | ✅ flagged | E-A3 multi-axis penalty must accept HVO-attributed ops as the "third axis" in lieu of 7th Corps. Sana 95 7th Corps contribution to Sanski Most must be folded into 5th Corps op or HVO op |
| GameState single source of truth | ✅ | All new fields land in `src/state/game_state.ts` |
| Never auto-edit FORAWWV.md | ✅ | This proposal does not touch canon docs |

---

## 6. Validation strategy

For each Sprint, the validation gate is the spatial match_ratio against `painted_control_oct1995.json` measured at turn 188.

### Sprint 1 expected outcomes

| Metric | n1998 baseline | Sprint 1 target |
|---|---|---|
| match_ratio | 78.51% | ≥ 81.5% |
| RBiH accuracy | 80.13% | ≥ 82% |
| RS accuracy | 76.05% | ≥ 79% |
| HRHB accuracy | 62.62% | ≥ 70% (Mistral 2 territory now reachable) |
| Sanski Most OSIDs flipped to RBiH by t180 | unknown — likely no | yes |
| Banja Luka OSIDs stay RS through ceasefire | should already | confirm unchanged |

### Sprint 2 expected outcomes

Adds corps-level dynamics. Expect:
- 2KK formations transition through `coordination_coherence` decay; brigades retreat independently in mid-September
- Western Bosnia cascade reaches Sanski Most via cascade trigger
- HVO Mistral 2 ops produce Drvar/Šipovo/Jajce flips
- HRHB accuracy reaches ≥ 80%

### Diagnostic instrumentation needed

Add to `run_summary.json`:
- Per-corps `coordination_coherence` snapshots at turns 154/160/166/175/180
- Active-event registry per turn (which external-shock events fired and when)
- Brigade `attached_source` field counts (HV-attached vs HVO-native) for transparency

---

## 7. What this synthesis does NOT propose

Explicitly out of scope, by sacred rule or by user constraint:

- **HV as a fourth faction.** Canonical IDs only. HV brigades are modeled as an HRHB-attached pool.
- **7th Corps simulation.** User has stated 6th/7th Corps will not be simulated. Their fall 1995 contribution at Donji Vakuf/Jajce is recorded as HVO action (HVO entered Jajce centre per HVO §3.5) plus folded into 5th Corps Sanski Most op.
- **NATO air as a player-controlled unit.** Deliberate Force is an external event, not an actor.
- **Refugee modeling as a population system.** Refugee effect handled as a per-muni `rear_paralysis` field in Tier C only, not a refugee-flow simulator.
- **Croatian internal politics.** Tuđman's 51:49 calculation is an external event trigger, not a modeled actor.

---

## 8. Open questions for user

1. **Sprint sequencing.** Tier A as 6 items in one session vs. one-at-a-time with a calibration run after each? Memory rule says "one change per calibration run." For Tier A I'd argue the six are coupled and should ship as one packet, then measured. But that breaks the rule.
2. **HV brigade pool composition.** Tier B-2 caps the HV-attached pool at ~9 brigades. Acceptable, or should this be data-driven from scenario file?
3. **51:49 trigger threshold.** Currently proposed at `RS max_share = 0.51`. Should this read from the painted reference (compute current RS area at trigger time) or use a fixed 0.51 floor?
4. **Treskavica/Trnovo (M10).** ARBiH 1st Corps June–July action that tied down VRS forces. Not in the current scripted ops packet. Worth adding as a pre-Storm tying op? Affects 1st Corps modeling that is already in scope.

---

## 9. One-line take

The 1995 collapse is reproducible if we treat the three external shocks (Storm, Deliberate Force, HV transfusion) as first-class scenario events that modify combat math, add a corps-coordination-coherence state that decays under simultaneous threat, and accept that HV ground intervention is an HRHB-attached brigade pool gated on the Split Agreement event — not a fourth faction.

— End of synthesis —
