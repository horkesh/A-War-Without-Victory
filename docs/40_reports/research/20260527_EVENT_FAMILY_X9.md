# Event Family Worksheet — X9: Dayton Entry Conditions

**Date:** 2026-05-27
**Family ID:** X9
**Faction scope:** cross-faction (composite of R15 + B13 + H12)
**Source tier:** `agreement_text` (Dayton General Framework Agreement for Peace, 21 Nov 1995 initialed Wright-Patterson AFB; 14 Dec 1995 signed Paris) corroborated by `icty_icj_un` (UN S/RES/1031 (1995); Karadžić IT-95-5/18-T)
**Sensitive-history ring:** none (endgame diplomatic-process composite; no atrocity, camp, hostage, or civilian-targeting content)
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The Dayton Peace Talks convened **1 November 1995** at Wright-Patterson Air Force Base in Dayton, Ohio, under US mediation by Richard Holbrooke. The three Bosnian-war presidents — Alija Izetbegović (RBiH), Slobodan Milošević (negotiating on behalf of the Bosnian Serbs under the Belgrade-Pale Patriarchate Agreement of 29 August 1995, which gave Belgrade 3/6 seats on the joint negotiating delegation), and Franjo Tuđman (HRH, negotiating on behalf of Bosnian Croats / HRHB) — attended in proximity-talks format with delegations housed in separate quarters and shuttle diplomacy between rooms. The talks ran 21 days. On **21 November 1995** the parties initialed the **General Framework Agreement for Peace in Bosnia and Herzegovina** ("Dayton Accords") plus 11 annexes. The Accords were signed in **Paris on 14 December 1995**. UN Security Council Resolution **1031 (15 Dec 1995)** authorized IFOR deployment to enforce the military annex. (Dayton General Framework Agreement, 14 Dec 1995; UN S/RES/1031 (1995); Karadžić IT-95-5/18-T Trial Judgment vol. III §§5911-5980 on the post-October-ceasefire diplomatic path; Holbrooke 1998 *To End a War* pp. 209-321.)

The Accords' structural features:

- **Single sovereign Bosnia-Herzegovina** comprising two entities: the **Federation of Bosnia and Herzegovina** (51%, Bosniak-Croat) and **Republika Srpska** (49%). (Dayton Annex 4 — Constitution; Annex 2 — Inter-Entity Boundary Line.)
- **NATO-led Implementation Force (IFOR)** of ~60,000 troops, authorized by UNSCR 1031 under Chapter VII. (Dayton Annex 1-A — Military Aspects.)
- **Return of refugees and displaced persons** as a right (Annex 7), with Office of the High Representative oversight (Annex 10).
- **Election framework** and constitutional structure for the new state (Annexes 3, 4).

The X9 family captures the three faction-keyed Dayton acceptance decisions as a composite, per packet §4 X9 ("composite of R15 + B13 + H12"). All three factions historically signed; the composite *historical* outcome is `accept` / `accept` / `accept`. The composite is meaningful at the Phase F authoring layer because the per-faction modal copy, dimension shifts, and `enables_events_runtime: ['dayton_signed_1995']` couplings must be coordinated across three rows to avoid a Dayton signature being recorded on one side without the other two also resolving. The composite-tag derivation also gates the endgame closure of all `csq_prolonged_war_track`-family rows.

The historical Dayton signature is overdetermined by prior compliances: RS compliance flowed through the Patriarchate Agreement (29 Aug 1995) that placed Milošević in the negotiating seat (R14 `comply_with_belgrade`); RBiH and HRHB compliance flowed through the October 1995 Holbrooke halt (X8 `comply`) and the Washington Agreement framework (X5 / B10 / H9). All three counterfactual `hardline` options (R15, B13, H12) are *politically conceivable* but lacked credible operational means by November 1995 — RS was militarily collapsed, RBiH had accepted the halt, HRHB was bound to Tuđman's Zagreb track.

## 2. Defensible Historical/Default Option (Composite Framing)

X9 is a **composite**, not a single-decision row. The historical default is the joint outcome produced by three separate faction-keyed decisions:

- **RS (R15) historical default:** `accept` (Milošević initialed on behalf of the Bosnian Serbs under the Patriarchate Agreement; Karadžić, removed from negotiating capacity by ICTY indictment 25 July 1995, did not personally sign). Per packet §4 R15.
- **RBiH (B13) historical default:** `accept` (Izetbegović initialed 21 Nov 1995, signed 14 Dec 1995 Paris). Per packet §4 B13.
- **HRHB (H12) historical default:** `accept` (Tuđman initialed on behalf of HRHB / Bosnian Croats 21 Nov 1995, signed 14 Dec 1995 Paris under the Federation framework). Per packet §4 H12.

- **Citation:** Dayton General Framework Agreement for Peace (21 Nov 1995 initialed; 14 Dec 1995 signed); UN S/RES/1031 (15 Dec 1995); Karadžić IT-95-5/18-T Trial Judgment vol. III §§5911-5980; Holbrooke 1998 pp. 209-321.

## 3. Proposed Counterfactual Options (Composite Branch Flow)

X9 does not author a fourth options set. Per packet §4 X9 historical/default `composite of R15 + B13 + H12`, counterfactual options `n/a` at the family level. The composite framing reads three flags together.

### Composite outcome matrix

| RS (R15) | RBiH (B13) | HRHB (H12) | Composite branch | Branch tag |
|---|---|---|---|---|
| `accept` | `accept` | `accept` | **Historical**: Dayton signed; war ends; entity structure 51:49; IFOR deploys; constitutional framework established. | `dayton_signed_all_parties` |
| `hardline` | `accept` | `accept` | **Counterfactual A**: RS Assembly defies Milošević + Patriarchate; mirrors the May 1993 VOPP-rejection pattern (R6). Belgrade pressure spikes; war continues; RS supply collapses further; ultimate forced settlement under worse terms or NATO-imposed solution. | `dayton_rejected_by_rs` |
| `accept` | `hardline` | `accept` | **Counterfactual B**: RBiH refuses the 49% RS entity / IEBL line. Continued war with RS+RBiH hostilities; Federation military integration with HRHB persists but international standing collapses; US backing withdrawn. | `dayton_rejected_by_rbih` |
| `accept` | `accept` | `hardline` | **Counterfactual C**: HRHB (H13 third-entity counterfactual) demands a separate Croat entity. Federation framework collapses; Croat-Bosniak war re-ignites under different conditions; Zagreb pressure intensifies (H7-like). | `dayton_rejected_by_hrhb` |
| `hardline` | `hardline` | `accept` | **Counterfactual D**: Both RS and RBiH refuse. War continues. Improbable historically — both sides were militarily and politically exhausted by Nov 1995 — but a defensible branch under significantly altered prior decisions. | `dayton_multilaterally_rejected` |
| any `hardline` × multiple | any | any | **Counterfactual E (cascade)**: cascade closure of `dayton_signed_1995` and `ceasefire_1995`; opens `csq_prolonged_war_track` consequences-family row (pending). | `dayton_collapses` |

- **Historical analogy (counterfactual A — RS hardline):** Plausible at the contingency level but militarily unviable. RS by November 1995 had lost the western Bosnia campaign and was under sustained NATO threat. Counterfactual would require either a different R8 (`defiant`) or R11 (`remove_mladic` not chosen, RS internal split deeper) upstream resolution. Documented internal-debate trace in Karadžić IT-95-5/18-T vol. III §§5960-5980.
- **Historical analogy (counterfactual B — RBiH hardline):** Plausible only after a different X8 (`push_further`) resolution where RBiH banked Banja Luka or further territorial gain and approached Dayton from a maximalist posture. Conditional on upstream X8 counterfactual A.
- **Historical analogy (counterfactual C — HRHB hardline):** This is the H13 `third_entity_push` counterfactual surfacing at the Dayton entry moment. Conditional on upstream HRHB branching that did not produce the Washington Agreement (X5 / H9 / H7 alternative path).
- **Design provenance:** All counterfactuals are defensible hypotheses, not likelihood claims. Historical bot calibration follows the historical row (`accept` / `accept` / `accept`).
- **Sensitive-history check:**
  - All composite outcome states are sensitive-content-neutral. Dayton acceptance / rejection is a diplomatic-process decision. No atrocity, camp, hostage, cleansing, or civilian-targeting content authorized by any option.
  - Counterfactual E (`dayton_collapses`) opens a `csq_prolonged_war_track` consequences-family row whose authoring may surface engine-driven sensitive content (continued combat → continued displacement, continued siege). This is engine-emergent consequence, not authored sensitive content at the X9 layer. Phase F narrative authoring of the prolonged-war consequences row must respect Ring 2 narrative discipline (no atrocity-glorification, no player-rewarded escalation framing). Defer to Narrative Designer.

## 4. Material Effects (per packet §3.3)

Effects flow through three separate decision rows (R15 + B13 + H12). X9 itself does not author effects directly — it is a composite analytical row in §4 of the packet. However, the **composite branch-tag** (set by reading R15/B13/H12 flags together) is the discriminator for endgame closure of `csq_prolonged_war_track` and the open of `dayton_signed_1995`.

### Per-faction row effects (authored on R15, B13, H12 worksheets — referenced here for composite coherence)

- **R15 `accept` (historical):**
  - `sets_flags`: `rs_dayton_response: 'accept'`
  - `dimension_shifts`: `territorial_legitimacy: +5` (49% recognized as RS entity), `internal_cohesion: -2` (Karadžić-Mladić faction disaffected with the settlement), `international_standing: +2` (RS becomes treaty signatory), `endgame: signed`
  - `enables_events_runtime`: `dayton_signed_1995` (already authored)
  - `closes_events_runtime`: `csq_prolonged_war_track` (pending)

- **B13 `accept` (historical):**
  - `sets_flags`: `rbih_dayton_response: 'accept'`
  - `dimension_shifts`: `international_standing: +5` (Bosnia preserved as sovereign state), `territorial_legitimacy: -3` (cession of 49% to RS entity), `internal_cohesion: -1` (hawks oppose; civic vs nationalist tension), `morale: -1` (peace at cost of territory), `endgame: signed`
  - `enables_events_runtime`: `dayton_signed_1995` (already authored)
  - `closes_events_runtime`: `csq_prolonged_war_track` (pending)

- **H12 `accept` (historical):**
  - `sets_flags`: `hrhb_dayton_response: 'accept'`
  - `dimension_shifts`: `patron_pressure: -1` (Zagreb wins on Federation settlement), `alliance_lock: 0` (Federation persists), `endgame: signed`
  - `enables_events_runtime`: `dayton_signed_1995` (already authored)
  - `closes_events_runtime`: `csq_prolonged_war_track` (pending), `csq_partition_referendum_proposal` (pending — H13 counterfactual closure)

### Composite branch-tag derivation

When `rs_dayton_response: 'accept'` AND `rbih_dayton_response: 'accept'` AND `hrhb_dayton_response: 'accept'` (historical row), the composite tag `dayton_signed_all_parties` is derived. This is the endgame composite that:

- Fires `dayton_signed_1995` (already authored, war_1995.json:1585)
- Fires `ceasefire_1995` (already authored, war_1995.json:1201)
- Closes all `csq_prolonged_war_track` consequence rows
- Sets the `dayton_signed: true` flag (already in `dayton_signed_1995.sets_flags`)

When any per-faction flag is `hardline`, the composite resolves to a `dayton_rejected_by_*` sub-tag and the cascade `dayton_collapses` outcome forecloses `dayton_signed_1995` and opens `csq_prolonged_war_track`.

## 5. Downstream Opens/Closes

- **Opens (eligibility):**
  - `dayton_signed_1995` (already authored, gates on `dayton_talks_begin_1995` which is already authored and gates on `federation_ground_offensive_1995`)
  - `ceasefire_1995` (already authored, gates on `federation_ground_offensive_1995`)
  - Post-Dayton consequence rows (pending — Phase D may add: refugee return framework, IFOR deployment, entity-elections preparation; these are post-endgame and outside Phase A scope)
- **Closes (eligibility):**
  - Historical composite: `csq_prolonged_war_track` (pending), `csq_partition_referendum_proposal` (pending — H13 closure on H12 `accept`)
  - Counterfactual `dayton_collapses`: closes `dayton_signed_1995`, `dayton_talks_begin_1995` (if not yet fired), `ceasefire_1995`; opens `csq_prolonged_war_track` (pending)
- **Branch-tag:** `diplomacy_dayton` (proposed new vocabulary slot under `diplomacy_*` per packet §2.2). Sub-tags: `dayton_signed_all_parties` (historical), `dayton_rejected_by_rs`, `dayton_rejected_by_rbih`, `dayton_rejected_by_hrhb`, `dayton_multilaterally_rejected`, `dayton_collapses`. Phase A worksheet locks this into the branch-tag vocabulary file.

## 6. Modal Source Notes

> "The Dayton General Framework Agreement for Peace was initialed 21 November 1995 at Wright-Patterson AFB and signed 14 December 1995 in Paris. The Accords established a single sovereign Bosnia composed of two entities (Federation 51%; Republika Srpska 49%) with NATO-led IFOR (~60,000 troops) authorized by UNSCR 1031 (Dayton General Framework Agreement 1995; UN S/RES/1031 (1995); Karadžić IT-95-5/18-T vol. III §§5911-5980)." (≤2 sentences after compression.)

## 7. Open Questions

1. **Authoring shape: composite event vs. three separate events.** Packet §4 X9 treats X9 as a composite analytical row. **Decision: three separate per-faction events** (R15 RS + B13 RBiH + H12 HRHB), each authored independently with `responding_faction` set; composite branch tag is *computed* at downstream trigger evaluation by reading the three per-faction flags together. Per Game Designer Wave 1 review pattern (consistent with X2, X3, X8 worksheet decisions). Composite is an analytical row, not a runtime row. The existing `dayton_signed_1995` event row (war_1995.json:1585) is the *endgame narrative event* that fires once all three per-faction decisions resolve `accept`; it is not the family-level decision row. Phase D author must wire `dayton_signed_1995.trigger.condition` to read all three per-faction flags via multi-flag AND predicate, or via a meta-evaluator that derives `dayton_signed_all_parties` first.
2. **R15 hardline counterfactual cost floor.** Packet §4 R15 historical default is `accept`, counterfactual `hardline`. R15 hardline at the November 1995 conjuncture lacks credible operational means. Phase A worksheet recommends a counterfactual cost floor pattern mirroring R7 (override-Assembly): internal_cohesion and patron-trust penalties at least as severe as the international-standing cost the historical acceptance produces. Without a cost floor, `hardline` could dominate `accept` in bot calibration on a non-historical run path. Defer to Game Designer + Historian.
3. **Composite tag derivation: engine read-time vs writer materialization.** Same question as X7 and X8. Recommend on-read derivation in `getX9CompositeState()` reading R15 + B13 + H12 flags together. The `dayton_signed_1995` event's `trigger.condition` then reads this derived tag. Defer to Technical Architect.
4. **Endgame closure scope.** X9 historical composite should close `csq_prolonged_war_track` and `csq_partition_referendum_proposal`. There may be additional `csq_*` rows that ought to be closed on `dayton_signed_all_parties` — e.g., `csq_*` rows authoring counterfactual late-war trajectories that historically were foreclosed by the Dayton settlement. Phase D author must audit the `csq_*` register for closure candidates. Defer to Game Designer.
5. **Counterfactual E narrative authoring (`dayton_collapses`).** Opens a `csq_prolonged_war_track` consequences-family row that does not yet exist. Phase F authoring of this row requires Narrative Designer + Historian collaboration to describe the post-November-1995 continued-war scenario without atrocity-glorification or player-rewarded escalation. Defer.
6. **R15 Karadžić-Mladić ICTY-indictment interaction.** Karadžić was indicted by ICTY on 25 July 1995 (additional charges 16 November 1995). By Dayton initialing, Karadžić was a wanted war-crimes suspect and was excluded from the negotiating delegation; Milošević signed on behalf of the Bosnian Serbs under the Patriarchate Agreement. The R15 historical default `accept` therefore reflects Milošević-channel signature, not Karadžić-direct signature. Phase F authoring of R15 must clarify this attribution in modal copy and `historical_source`. Defer to Narrative Designer + Historian.
