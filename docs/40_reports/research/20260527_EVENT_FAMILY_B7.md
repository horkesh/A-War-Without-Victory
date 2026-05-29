# Event Family Worksheet — B7: RBiH Sarajevo Siege Response Posture

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_sarajevo_siege_response` (matches §4.2 row B7 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Tier A — `icty_icj_un` (Mladić, Galić, Karadžić) plus UN Secretary-General reports on Sarajevo.
**Sensitive ring:** **Ring 1.** Modeled-mechanically state (siege intensity, civilian casualties, enclave supply). No new player-facing atrocity surface introduced by this family.
**Existing catalog row:** No player-decision row at the family level. Adjacent engine and event surfaces: `markale_massacre_1994`, `nato_ultimatum_sarajevo_1994`, `sarajevo_exclusion_zone_1994` (all in `data/scenarios/events/war_1994.json`), plus the engine-driven `state.sieges.sarajevo` track.
**Per packet §4.2:** "follow-on — currently engine-driven." Packet text states "n/a" in the player-counterfactual column.

---

## 1. Historical Narrative

The siege of Sarajevo (5 April 1992 – 29 February 1996) was the longest siege of a capital city in modern warfare. The RBiH government and the 1st Corps of ARBiH — formed in September 1992 under successive commanders (Mustafa Hajrulahović "Talijan," Vahid Karavelić, Nedžad Ajnadžić) — defended the city through forty-four months of encirclement by the Sarajevo-Romanija Corps (SRK) of the VRS, commanded successively by Tomislav Šipčić, Stanislav Galić, and Dragomir Milošević. Daily population life, defensive posture, and the city's diplomatic role were all subordinated to the siege fact.

### 1.1 ICTY findings on the SRK siege as a system

*Prosecutor v. Galić* (ICTY IT-98-29, Trial Judgement 5 December 2003, Appeal Judgement 30 November 2006) and *Prosecutor v. Dragomir Milošević* (ICTY IT-98-29/1, Trial Judgement 12 December 2007, Appeal Judgement 12 November 2009) established that the SRK conducted a systematic campaign of sniping and shelling against the civilian population of Sarajevo, charged and convicted as crimes against humanity and violations of the laws or customs of war. *Prosecutor v. Karadžić* (ICTY IT-95-5/18-T, 24 March 2016) and *Prosecutor v. Mladić* (ICTY IT-09-92-T, Trial Judgement 22 November 2017) brought the siege within the broader JCE findings against the RS leadership: the siege was an instrument of policy, not the unavoidable byproduct of a contested front line.

### 1.2 RBiH posture as documented

The RBiH posture through the siege was, in the ICTY and UN record, structurally constrained rather than freely chosen at any single decision point. Sarajevo's options were:

- **Maintain defense and political legation.** The Presidency remained in Sarajevo throughout the siege (Izetbegović did not relocate the seat of government). The 1st Corps held a defensive perimeter; offensive operations to break the siege were attempted (notably summer 1995 — Operation "Tekbir" / June-July 1995 break-out attempts) but resources never allowed a sustained outward push.
- **Negotiate ceasefires and humanitarian corridors via UNPROFOR.** Successive ceasefires (June 1992 airport handover, February 1994 HWEZ, August 1994 anti-sniping agreement, January 1995 cessation of hostilities) were accepted by Sarajevo as instruments of relief, never as recognition of siege legitimacy.
- **Leverage international diplomatic and humanitarian channels.** UN Secretary-General reports (notably UNSCR 758, UNSCR 770, UNSCR 824 declaring safe areas including Sarajevo, UNSCR 836 strengthening the safe-area regime) were a primary RBiH instrument. UN A/54/549 (Srebrenica report, 15 November 1999) discusses Sarajevo's diplomatic posture in the safe-areas context.

What the historical record does **not** show is a discrete RBiH "decision point" of the form "siege response posture — option A / option B / option C." The posture was the cumulative product of:
- A defensive military situation in which offensive break-out was militarily implausible until mid-1995.
- A diplomatic strategy of maintaining state legitimacy and inviting international intervention.
- Engine-driven facts about siege-end conditions (HWEZ compliance by RS, federation ground offensive, Dayton).

The packet's classification of B7 as "follow-on — engine-driven; no player decision row at the family level" follows this reading: the Sarajevo siege end conditions emerge from RS-side decisions (R12 hostage response, R13 Deliberate Force compliance), cross-faction events (X6 NATO escalation, X7 UN safe-areas system), and federation offensive readiness (B11/H10). RBiH's posture is the structural baseline against which those drivers act.

### 1.3 Historical outcome

The siege ended *de facto* with the demilitarization agreement and the IFOR deployment following the Dayton Peace Agreement (signed 14 December 1995); *de jure* end-of-siege is conventionally dated to 29 February 1996, when Bosniak forces formally lifted the siege after the SRK withdrawal from Sarajevo suburbs. The RBiH "posture" through this arc was continuity of state defense, not a binary fork.

---

## 2. Defensible Historical Default

**Per packet §4.2:** no historical-default *option* exists for B7 at the family level because no player-facing family-level decision is authored.

**Engine-driven baseline (not a label):** RBiH state defends Sarajevo, leverages UN and NATO channels, accepts ceasefires as humanitarian relief. This baseline is the *absence* of a counterfactual override, not an authored option.

**`Blocked` does not apply** in the Foundational-packet sense — B7 is not blocked for atrocity reasons. It is *deferred to engine* because the historical record does not present a discrete player-decision shape that material counterfactuals could honestly offset.

---

## 3. Counterfactual Options

**Per packet §4.2:** "n/a" in the counterfactual column. Phase A confirms: no counterfactual *option set* is proposed at the B7 family level.

### 3.1 Why no counterfactual options

The plausible-sounding counterfactuals all fail the Phase A defensibility test:

| Hypothetical counterfactual | Why it fails |
| --- | --- |
| "Sarajevo evacuates the government to Tuzla / Zenica." | Has no Tier-A historical analogue. Would also create cascading state-continuity problems (B1 civic platform requires Sarajevo as constitutional capital). Bordering on counter-factual-railroad. |
| "Sarajevo orders a 1st Corps break-out offensive on turn N." | This *did* happen historically (summer 1995). It is already modeled engine-side via the operations system. Authoring it as a player-decision row would double-count an emergent military behavior. |
| "Sarajevo refuses all ceasefires." | No historical Tier-A source. Sarajevo accepted every ceasefire offered, even when expecting non-compliance from RS. The counterfactual would have to be invented, not sourced. |
| "Sarajevo welcomes UNPROFOR full security takeover." | This is already mechanically embedded in the safe-area regime (UNSCR 824/836). RBiH did not have the option to *expand* UNPROFOR's mandate; that was a UN Security Council decision. |
| "Sarajevo declares end-of-state, accepts partition for siege relief." | No Tier-A source; would collide with B1 and the entire Foundational-packet position on RBiH continuity. |

### 3.2 What B7 *does* model

B7 is the named slot where the cumulative engine effects of the siege on RBiH state are gathered. Siege intensity (`state.sieges.sarajevo`), Sarajevo OSID supply (`enclave_supply_status`), 1st Corps morale and supply, RBiH international standing increments triggered by Markale / mortar attacks, and the cumulative casualty counter — these are the *material substance* of B7.

The downstream events that *are* authored — `markale_massacre_1994` (atrocity, not RBiH-decision), `nato_ultimatum_sarajevo_1994` (RS-facing decision; see B9 worksheet), `sarajevo_exclusion_zone_1994` (engine consequence), and any siege-end events — all use Sarajevo siege state as input, not RBiH-posture-decisions as input.

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

### 4.1 Engine-driven (no Phase D authoring at family level)

| Engine surface | What it does | Source |
| --- | --- | --- |
| `state.sieges.sarajevo.intensity` | Per-turn siege pressure on Sarajevo civilians and 1st Corps. Inputs: SRK heavy weapons in HWEZ, ceasefire flags, Federation offensive proximity. | Engine track. |
| `enclave_supply_status('sarajevo')` | `critical` / `strained` / `adequate`. Feeds the supply line into the central-Bosnia operational pipeline. | Engine. |
| `FactionCapital.international_standing` (RBiH) | Auto-increments on Markale, UN report milestones, NATO action against RS. | Engine + event effects. |
| `war_crimes_events` (RS counter, not RBiH) | Auto-increments on documented siege atrocities. Not a player surface. | Engine. |
| Dimension shifts on RBiH negotiating_leverage and internal_cohesion | Adjusted by siege-end events (HWEZ compliance, federation ground offensive). | Adjacent event rows. |

### 4.2 Phase D additions

None at the family level. If a presidential-tempo proxy event is approved (see §8 open question), Phase D would author *that* event, not a B7 family decision.

---

## 5. Runtime Causality Targets (per §3.3)

**No `enables_events_runtime` / `closes_events_runtime` targets are authored at the B7 family level**, because no player decision row exists to host them.

Adjacent rows that gate Sarajevo siege end conditions:

| Driver row | What it opens / closes | Notes |
| --- | --- | --- |
| `nato_ultimatum_sarajevo_1994` (B9 / RS-facing decision) | Opens `sarajevo_exclusion_zone_1994` on `comply_withdraw_hwez`; the defy path may open NATO escalation gates | Sets flags `sarajevo_hwez_complied` / `sarajevo_hwez_defied`. |
| `deliberate_force_aug_1995` (R13) | Closes Sarajevo siege escalation; opens federation ground offensive readiness | Packet §4.1 row R13. |
| Federation ground offensive (B11 / H10 driven) | De facto siege relief | Engine. |
| Dayton (X9) | De jure siege end | Engine + Dayton row. |

B7 should not directly `enables_events_runtime` any of these — they are reached through their own gating paths, and B7 has no decision instrument with which to enable.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Family ring:** **Ring 1.** Siege-as-system is modeled-mechanically (intensity, supply, casualty counter). The atrocity dimensions are gated by adjacent ICTY-sourced rows (Galić, Dragomir Milošević, Karadžić, Mladić). No new player-facing ring surface introduced by B7.
- **Atrocity-efficiency prohibition (Gate §3 #5):** Not engaged at B7 because there is no option to authorize anything.
- **Gate §3 paramilitary surface:** Not engaged.
- **Gate §4 wording constraints:** Any narrative copy that touches Sarajevo siege state must follow Gate §4 — no euphemisms for shelling/sniping; historical voice; civilian casualty counts cited.

---

## 7. Citations and Sources

### Tier A (`icty_icj_un`)
- **Mladić Trial Judgement** (ICTY IT-09-92-T, 22 November 2017) — JCE findings including the Sarajevo siege as instrument of policy; SRK command structure and chain of responsibility.
- **Galić Trial and Appeal Judgements** (ICTY IT-98-29, 5 December 2003 / 30 November 2006) — SRK shelling and sniping campaign as crimes against humanity; siege-conduct evidentiary baseline.
- **Dragomir Milošević Trial and Appeal Judgements** (ICTY IT-98-29/1, 12 December 2007 / 12 November 2009) — successor SRK command; 1994-1995 siege intensification including Markale II.
- **Karadžić Trial Judgement** (ICTY IT-95-5/18-T, 24 March 2016) — JCE Sarajevo component; siege policy at RS leadership level.
- **UN A/54/549** (Secretary-General's report on Srebrenica, 15 November 1999) — §§ on Sarajevo diplomatic posture and the safe-areas regime; provides UN-record context for RBiH's defensive posture.
- **UNSCR 758, 770, 824, 836** — UN Security Council resolutions framing UNPROFOR mandate, safe areas (including Sarajevo), and use-of-force authorization. Provides the diplomatic-channel substrate that RBiH leveraged.
- **UN S/1994/674** (Final Report of the Commission of Experts, 27 May 1994), Annex VI "The Battle and Siege of Sarajevo" — comprehensive UN factual narrative.

### Tier B (`balkan_battlegrounds`)
- **Balkan Battlegrounds Vol. I and II** — 1st Corps formation, Sarajevo defensive operations, breakthrough attempts (1995). Historian to confirm exact pages from KB before any Phase D event authoring.

### Forbidden
- Wikipedia is not cited as a primary source.
- BB aggregate troop figures are not used.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **Should a presidential-tempo proxy event exist?** B7 is currently "n/a counterfactual / engine-driven." A defensible *narrative* slot would be a low-stakes presidential-tempo proxy — e.g. a yearly "Presidency address / siege-anniversary posture" event with options like `defiance` / `endurance` / `appeal-international` whose material effects are small dimension shifts (international_standing, internal_cohesion, morale) but no `control_change`, no atrocity surface. This would give the player a *voice* in the Sarajevo siege arc without manufacturing counterfactuals that distort the historical record. **Game Designer to rule:** is this worth a Phase D authoring slot, or does it dilute the principle that B7 stays engine-driven? Author recommendation: defer unless playtest reveals B7 absence as a player-agency gap.

2. **Branch-tag vocabulary.** If §8.1 yields no decision row, B7 contributes no entries to `event_families.ts`. The branch-tag vocabulary stub does not list B7 tags — confirm this stays the case in Phase B.

3. **Coordination with B9.** The packet has B9 as "RBiH NATO ultimatum compliance" but the existing engine event `nato_ultimatum_sarajevo_1994` is RS-facing (compliance by RS with NATO's heavy-weapons withdrawal demand). B7 and B9 together cover Sarajevo siege response from both sides; the worksheets should not over-author RBiH-facing duplicates. See B9 worksheet §1 for the resolution.

4. **Markale and HWEZ wiring.** Phase D may eventually wire `nato_ultimatum_sarajevo_1994` to open `sarajevo_exclusion_zone_1994` via `enables_events_runtime` (currently engine-trigger-gated). That wiring belongs to B9, not B7.

5. **Siege-end conditions inventory.** Phase A recommends a separate research note inventorying Sarajevo siege-end conditions across the event graph (currently scattered across multiple rows). Not in B7's scope.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B7 of the runtime-semantics packet.
- [x] Historical narrative cited to Tier A (Mladić, Galić, D. Milošević, Karadžić, UN A/54/549, UNSCRs).
- [x] No player decision row at the family level — confirmed and justified.
- [x] Engine-driven material substance inventoried.
- [x] Counterfactual hypotheticals tested against defensibility and rejected with reasons.
- [x] Sensitive ring fixed at Ring 1; no new atrocity-authorization surface.
- [x] Open question on presidential-tempo proxy surfaced for Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.
