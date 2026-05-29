# Event Family Worksheet — B11: RBiH Federation Military Integration (1994-1995)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_federation_military_integration` (matches §4.2 row B11 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Tier A required — `agreement_text` (Split Agreement 12 March 1994; Washington follow-on agreements 1994-1995) plus `balkan_battlegrounds` (BB Vol. II) corroboration.
**Sensitive ring:** None. Military-integration follow-on; no atrocity surface engaged.
**Existing catalog row:** No standalone authored row. The Federation framework is opened by `washington_agreement_1994` (B10); subsequent operational events (`federation_ground_offensive_1995`, `us_halts_federation_advance_1995` in `data/scenarios/events/war_1995.json`) presume integration as state but do not author the integration *decision* as a row.
**Follow-on of:** B10 (`rbih_washington_agreement`). H10 is the HRHB mirror.

---

## 1. Family Classification

Per packet §4.2 row B11, B11 is a **follow-on of B10**. The row is `n/a` for counterfactual options and `n/a` for "historical/default candidate" in the inventory table — meaning B11 is not a player-facing decision but a downstream consequence chain that becomes eligible once B10 resolves as `accept` or `reluctant`. This worksheet documents the historical record of Federation military integration, identifies the engine surfaces that already exist for it, and proposes Phase D scaffolding to make B11 either a flag-gated visibility event (Codex / Records exposure) or a set of engine-driven follow-on shifts triggered by B10's flag write.

The row is **not** a player-facing decision in the same shape as B1/B2/B3/B10. The "historical default" framing for B11 is therefore: "follow-on of B10 — once B10 = accept or reluctant, the integration mechanic activates with the dimension shifts and bot-priority changes documented below."

---

## 2. Historical Narrative

### 2.1 The Split Agreement and follow-on integration framework

The military provisions of the Washington Agreement were not contained in the 18 March 1994 White House signing alone. BB II p. 451 records the principal military document as the **"Split agreement"** signed by the ARBiH and HVO army commanders on **12 March 1994**, elaborating the conversion of ARBiH and HVO into the cooperating "**Federation Army**" — **Vojska Federacije**, or **VF** — "consisting of two separate but cooperating armed forces" (BB II p. 451). The Split formula explicitly did not merge the two armies into a single unified force; it created a coordination framework with two retained command structures.

Follow-on agreements through 1994 and into 1995 elaborated the integration:

- **Heavy weapons exclusion arrangement (March 1994):** Both sides agreed to withdraw heavy weapons a set distance from the former confrontation lines — 10 km for mortars, 20 km for tanks and artillery — or to place them in five UN-monitored collection points (BB II p. 451). UNPROFOR took over former ARBiH and HVO checkpoints in Mostar, Vitez, Gornji Vakuf, Prozor, Konjic, and Jablanica.
- **Joint Command coordination structures (mid-late 1994):** Federation Joint Command and joint command-and-control protocols emerged through 1994 to coordinate planning against the VRS. Operational examples include the Bihać-relief planning track (Operation Cincar / Op Tigar), the Mt. Vlašić / Donji Vakuf coordination, and Federation contributions to the Kupres-Glamoč axis preparing the ground that would later enable Op Storm-linked operations and Operation Mistral/Maestral in 1995.
- **Washington follow-on Defence Pact (signed July 1995):** Croatia, RBiH, and HRHB signed a follow-on defence pact at Split in July 1995 (the "Split Declaration" or "Split Pact") that formalized the joint Croatian-Federation military framework for the August-October 1995 offensives (Operation Storm, Maestral / Mistral 2, Sana 95). BB II covers the operational consequences extensively; Prlić TJ references the framework as the institutional basis for HV-HVO-ARBiH coordination through Storm and the subsequent autumn offensives.

### 2.2 Operational reality of integration

BB II p. 451 is explicit about the limits of integration as initially constituted: "two separate but cooperating armed forces." Trust-building was uneven through 1994. The 111th Home Defense Regiment around Žepče is documented (BB II p. 470) as continuing to play "both ends against the middle" — no longer attacking ARBiH in formerly besieged Maglaj but allowing VRS units to transit Croat-held territory to attack the town. Local cooperation lagged the political framework throughout 1994.

By late 1994 and into 1995, however, joint operations against the VRS became operationally real:
- **November 1994 Kupres-axis operations** (BB II covers in detail) — ARBiH 7th Corps + HVO units retake Kupres, demonstrating functional joint command at the operational level.
- **March-July 1995** — joint planning for the relief of Bihać matures.
- **August-October 1995** — Operations Storm (Croatian-led with HVO and ARBiH cooperation in Bosnia), Maestral / Mistral 2, Sana 95: full-scale joint-Federation offensives against the VRS in western Bosnia, retaking >20% of pre-war RS territory and establishing the 51:49 territorial baseline that Dayton ratified.

### 2.3 RBiH side of the integration

From the RBiH political perspective, the integration of ARBiH into the Federation Army framework was *operationally* a force-multiplier (BB II p. 451: "allowed the ARBiH to end its desperate two-front war and concentrate on the crucial conflict with its Bosnian Serb foes") but *politically* a step that the Sarajevo Presidency took reluctantly. BB II p. 451: "The Sarajevo-based Bosnian Government arguably took a step backwards in terms of its sovereignty, but its leaders knew they had to seem to be agreeable to maintain the support of the international community."

The historical RBiH posture on integration was therefore: accept the Split formula, accept Federation Joint Command coordination, but maintain ARBiH chain-of-command integrity and treat the integration as instrumental rather than constitutive. The integration was real and consequential; it was not Sarajevo's preferred end-state.

### 2.4 Historical outcome

Integration proceeded along the Split formula through 1994-1995, matured into operational joint planning by mid-1995, and was the institutional basis for the autumn 1995 offensives that produced the 51:49 territorial baseline ratified at Dayton.

---

## 3. Defensible Historical Default

Because B11 is a **follow-on of B10** rather than a player decision, the "historical default" framing applies to the *engine-driven downstream state* that activates once B10 resolves as `accept` or `reluctant`.

**Label:** Engine-driven follow-on (no `Historical default` modal label applies — B11 is not a player-facing decision in the same shape as B1/B2/B3/B10).
**Provenance:** Tier A. Split Agreement text (12 March 1994), Washington follow-on Split Declaration (July 1995), BB II p. 451 + 1994-1995 operational chapters, Prlić TJ on HV-HVO-ARBiH coordination.

`Blocked` does not apply.

### 3.1 Whether B11 should be a player-facing decision at all

Phase A's reading is that B11 should **not** be elevated to a player-facing decision. The historical Sarajevo Presidency had no meaningful counterfactual to integration once B10 was signed — the Split formula was already embedded in the Washington Agreement text and the patron-pressure environment (US, Germany, Contact Group) treated military integration as non-negotiable. Any decision elevated to player-facing here would be a counterfactual ("refuse to send ARBiH officers to Federation Joint Command") with no documented historical analogy and a high risk of mis-framing the relationship.

Phase A recommends B11 remain a **follow-on consequence chain** triggered by B10's flag write, with downstream effects on bot priorities, alliance_lock floor, and supply / joint-offensive readiness. This matches packet §4.2 row B11's `n/a` / `follow-on of B10` framing.

---

## 4. Counterfactual Options

Per packet §4.2 row B11, counterfactual options are `n/a`. There is no player-facing alternative authored.

If Phase D wishes to add a Codex / Records exposure event (a *visibility* event, not a *decision* event) marking integration milestones (Split signed, Federation Joint Command stood up, July 1995 Split Declaration), that visibility event would be flag-gated on `rbih_washington_agreement` and should not be confused with a counterfactual option.

---

## 5. Material Effects (per §3.3 of the Runtime Semantics Packet)

### 5.1 No existing authored row

There is no standalone B11 row in `data/scenarios/events/*.json`. The integration consequences are currently delivered through:
- `washington_agreement_1994`'s top-level `alliance_change(+0.8)` and `cohesion_change` effects (B10's authored material).
- Operational events in `war_1995.json` (`federation_ground_offensive_1995`, etc.) which presume integration as state.
- Engine-side bot priority adjustments downstream of the alliance change.

### 5.2 Phase D additions (deferred — proposals only)

These are *proposals* for Phase D authoring; nothing is being changed by this worksheet.

- **Option A (recommended): Engine-driven follow-on, no new event row.** B10's flag write (`rbih_washington_agreement = 'accept' | 'reluctant'`) becomes the substrate for an engine-side bot-priority shift (ARBiH ↔ HVO targeting reweighting, joint-axis prioritization) and an `alliance_lock(RBiH-HRHB, floor)` semantics conversion. No new JSON row. B11 lives entirely in the engine-side downstream behavior triggered by the B10 flag.
- **Option B (alternate): Author a B11 Codex / Records visibility row.** A presentation-only row in `war_1994.json` or `war_1995.json` (e.g. `federation_military_integration_1994`) that fires once B10 has resolved and writes Codex / Records text without changing engine state. Flag-gated `trigger.condition: flag_equals rbih_washington_agreement IN ['accept', 'reluctant']`. No player response required (`requires_player_response: false`).
- **Option C (do both):** Engine-side follow-on per Option A *plus* a Codex visibility row per Option B. Phase A recommends this combination if Phase D has the authoring budget.

Material effects (regardless of Option A/B/C):
- `bot_priority_shift(RBiH, target_faction: HRHB, multiplier: 0.0)` — ARBiH no longer prioritizes attacking HVO/HRHB targets.
- `bot_priority_shift(RBiH, target_faction: RS, multiplier: +)` — ARBiH bot prioritization on VRS targets receives a modest boost reflecting the freed-up two-front-war exit.
- `alliance_lock(RBiH-HRHB, floor: <value>)` — see B10 §8 open question 2; the floor value coordinates between B10 and B11.
- `joint_offensive_readiness(RBiH-HRHB, enabled: true)` — unlocks 1995 joint-axis operations (Mistral, Sana, Storm-linked coordination). Engine surface to be defined in Phase B/C.
- `supply_pipeline(RBiH, croatian_route: enabled)` — Croatian supply lines reopen to ARBiH per BB II p. 451. Engine surface already partially modeled in supply system.

No new `effect.kind` is required for Option A. Option B requires only existing presentation `effects` (narrative, Codex entries).

---

## 6. Runtime Causality Targets (per §3.3)

Because B11 is a follow-on rather than a decision, runtime causality applies asymmetrically:

| Trigger | Action | Branch flag substrate |
| --- | --- | --- |
| B10 resolves as `accept` or `reluctant` | Engine-side: bot_priority_shift, alliance_lock floor, joint_offensive_readiness, supply_pipeline. Optionally: enable B11 Codex / Records visibility row if Option B/C chosen. | `event_flags.rbih_washington_agreement IN ['accept', 'reluctant']` |
| B10 (hypothetically) resolves as a future `reject` — not currently authored | B11 follow-on does not activate. The Croat-Bosniak war chain remains open. | n/a (no `reject` in current B10 authoring) |

If Phase D adopts Option B (Codex visibility row), the row would carry:
- `requires_player_response: false`
- `trigger: { turn_min: <post-Washington turn>, phase: 'war', requires_events: ['washington_agreement_1994'] }` — leverages existing pre-runtime `requires_events`; Phase B's `requires_enabled` is the runtime-semantics equivalent once it lands.
- `effects[]`: narrative text only; no engine-state changes (those live in B10's row + engine-side follow-on).

There is no `closes_events_runtime` candidate for B11. Closure of the Croat-Bosniak war chains is B10's responsibility (per packet §4.2 row B10: "closes Croat-Bosniak war chains"), not B11's.

H10 (HRHB Federation military integration) is the mirror family; H10's worksheet (separate) must coordinate symmetrically with B11. The X5 composite (Phase F) coordinates B10 + H9 acceptance; X5 does not directly gate B11 / H10 but their downstream effects are dual-keyed on both factions' acceptance flags.

---

## 7. Sensitive-History Ring (per Gate §1)

- **Family ring:** None. Military integration is the political-operational consequence of an accepted diplomatic agreement; no atrocity surface engaged.
- **Downstream ring concerns:** The integration framework did not retroactively resolve HVO detention-camp exposure (H6) or Mostar bridge destruction (H8) — both atrocity rows continue on their own tribunal track regardless of Federation integration. Phase D copy must not frame integration as "moving past" or "settling" the atrocity record. BB II's "imperfect peace and uneasy alliance" register remains the canonical voice.
- **Gate §3 paramilitary surface:** Not engaged. Federation integration does not alter the `paramilitary_policy` field on either RBiH or HRHB; those are independent decisions on B2 / H2 surfaces.
- **Gate §4 Cost Ledger wording:** Endgame narration must not frame the Federation Army as a successful merger. BB II p. 451's "two separate but cooperating armed forces" is the canonical characterization. Narrative Designer in Phase D.

---

## 8. Citations and Sources

### Tier A — agreement_text and icty_icj_un
- **Split Agreement, 12 March 1994** — military provisions signed by ARBiH and HVO army commanders, elaborating the Federation Army (Vojska Federacije / VF) structure. BB II p. 451 explicit.
- **Washington Agreement of 18 March 1994** — political framework that included the military framework reference; canonical date.
- **Heavy weapons exclusion arrangement (March 1994)** — 10 km mortar / 20 km tank+artillery withdrawal or UN-monitored collection. BB II p. 451.
- **Split Declaration (Split Pact), July 1995** — Croatia-RBiH-HRHB follow-on defence pact formalizing joint operations framework for August-October 1995 offensives.
- **Prlić et al. Trial Judgement** (ICTY IT-04-74, 29 May 2013) — institutional basis for HV-HVO-ARBiH coordination through Storm and subsequent autumn 1995 offensives.

### Tier B — balkan_battlegrounds
- **Balkan Battlegrounds Vol. II, p. 451** — Federation Army framing ("two separate but cooperating armed forces"); UNPROFOR cease-fire monitoring posts at Mostar, Vitez, Gornji Vakuf, Prozor, Konjic, Jablanica; supply-pipeline reopening for ARBiH.
- **Balkan Battlegrounds Vol. II, p. 470** — 111th Home Defense Regiment around Žepče as an example of uneven local integration through 1994.
- **Balkan Battlegrounds Vol. II** — 1994-1995 operational chapters covering Kupres-axis November 1994, joint planning for Bihać relief, and the August-October 1995 Storm / Maestral / Sana sequence.

### Canonical row reference
- **`data/scenarios/events/war_1994.json` → `washington_agreement_1994`** — B10's row, which currently delivers B11's material consequences via top-level `alliance_change(+0.8)` and cohesion effects.
- **`data/scenarios/events/war_1995.json` → `federation_ground_offensive_1995`** — downstream operational event that presumes integration as state.

### Forbidden
- Wikipedia is not cited as a primary source per Gate §6 and Foundational packet §5.

---

## 9. Open Questions for Canon Compliance / Game Designer Review

1. **Author B11 as a row or leave it engine-side?** Phase A's recommendation is Option C (engine-side follow-on plus Codex visibility row), but Game Designer + Product Manager should confirm authoring budget for Phase D / Phase F. If only one option ships, Option A (engine-side only) is the minimum viable interpretation of packet §4.2 row B11's `follow-on of B10` framing. **Decision: Option A (engine-driven follow-on of B10, no player decision row at family level).** Drop Options B and C. Per Game Designer Wave 2 review: Sarajevo had no documented counterfactual to integration once Washington signed; a B11 decision row would be fake-flexibility. H10 (HRHB-side) and H11 (HV expeditionary) DO get extended counterfactual sets — see those worksheets.
2. **Coordination with H10.** H10 is the HRHB Federation military integration mirror. Phase A reads the two as symmetric and engine-driven from a shared post-Washington flag substrate. Confirm symmetry expectation with H10 worksheet author before Phase D authoring.
3. **`alliance_lock` floor value.** B10 §8 open question 2 raises this; B11 carries the same dependency. Phase D must lock a single floor value that B10 sets and B11 / H10 reference, rather than three separate floors that could drift.
4. **Joint offensive readiness engine surface.** `joint_offensive_readiness` is proposed here as a new engine state. Technical Architect / Gameplay Programmer must confirm whether this is a new `effect.kind` (which packet §3.3 forbids without explicit ADR) or a derived gate from existing alliance + bot-priority state. Phase A's preference: derive from existing state, no new `effect.kind`.
5. **Split Declaration July 1995 as a separate row?** Phase A notes the Split Declaration is operationally distinct from the March 1994 Washington / Split agreements (it adds HV expeditionary support framing). Game Designer to rule whether the July 1995 pact deserves a separate B-family row (B11a?) or whether H11 (HV expeditionary support, packet §4.3) is sufficient coverage.

---

## 10. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B11 of the runtime-semantics packet as `follow-on of B10`.
- [x] Historical narrative documented with Tier A citations (Split Agreement 12 March 1994, Washington 18 March 1994, Split Declaration July 1995, BB II p. 451 + p. 470, Prlić TJ).
- [x] No counterfactual options proposed (per packet §4.2 row B11 `n/a`).
- [x] Material effects mapped to §3.3; Phase D options A/B/C proposed.
- [x] Runtime causality framed as B10-flag-gated follow-on; no new `closes_events_runtime` proposed.
- [x] Sensitive ring: none. Modal copy register preserved per BB II framing.
- [x] Coordination noted with H10 mirror and X5 composite.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.
