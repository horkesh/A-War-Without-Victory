# Event Family Worksheet — R3: Drina Valley 1992 Campaign Tempo

**Family ID:** `rs_drina_campaign_tempo`
**Packet row:** v1.3 packet §4.1 R3 (RS families)
**Sensitive ring:** Ring 3 for the option label as originally drafted; Ring 1 for outcome (engine-driven displacement / paramilitary sweep / rupture chain)
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** **BLOCKED** — convert to consequence/reflection only; no authored counterfactual option.

---

## 1. Cited Historical Narrative

Between April and August 1992, the Drina valley municipalities — Zvornik, Bijeljina, Bratunac, Srebrenica, Višegrad, Foča, Rudo, Čajniče, Goražde (partial) — were the geographic focus of the most concentrated cleansing operations of the 1992 RS campaign. The pattern is documented across the ICTY trial record:

- **Zvornik (8–9 April 1992):** Paramilitary assault by Arkan's Tigers and Šešeljevci with JNA support; rapid takeover and expulsion of the Muslim population from the town and surrounding villages. *Karadžić* IT-95-5/18-T §§2470–2509. Pre-dated the 12 May Assembly vote on the Six Strategic Goals; established the operational template.
- **Bijeljina (1–2 April 1992):** Arkan's Tigers; mass killings of Muslim civilians documented in *Karadžić* §§2435–2469. The "Goal 3" template begins here.
- **Višegrad (April–June 1992):** *Lukić & Lukić* IT-98-32/1; cleansing operations, the Pionirska Street and Bikavac house-burnings (June 1992).
- **Foča (April–July 1992):** *Kunarac, Kovač and Vuković* IT-96-23 — systematic rape used as a weapon; civilian-targeting campaign.
- **Srebrenica enclave forms (April 1992 — pocket created by Naser Orić ARBiH defense of remaining Muslim-majority territory).** The Drina cleansing pushed displaced Muslim populations into the enclave, which would later become a UN Safe Area (UNSC 819, 16 April 1993) and the site of the 1995 genocide.
- **Bratunac, Srebrenica, Cerska, Konjević Polje, Kravica (May–July 1992):** *Krstić* IT-98-33-T contextual paragraphs; *Karadžić* §§2510–2570.
- **Detention facilities (June 1992 onward):** Sušica camp (Vlasenica), KP Dom Foča (*Krnojelac* IT-97-25-T), Batković — paralleled by Omarska/Keraterm/Trnopolje in the Krajina; the Drina chain forms part of the same Tier A factual record.

The Drina campaign's strategic purpose, per *Karadžić* §§3447–3475, was the implementation of Goal 3 ("the establishment of a border on the Drina river separating the Serb state from the rest of BiH"). The operational tempo — concentrated, rapid, paramilitary-led — was not an inadvertent consequence of war but a chosen method documented by the tribunal as part of the JCE's common purpose.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T §§2435–2570, 3447–3475.
- ICTY *Stakić* IT-97-24 (Prijedor — parallel template, contextual).
- ICTY *Krajišnik* IT-00-39-T — Assembly leadership awareness and acceptance.
- ICTY *Lukić & Lukić* IT-98-32/1 — Višegrad.
- ICTY *Kunarac, Kovač & Vuković* IT-96-23 — Foča.
- ICTY *Krnojelac* IT-97-25-T — KP Dom Foča.
- ICTY *Krstić* IT-98-33-T contextual paragraphs.
- ICJ *Bosnia v. Serbia* (2007) — Srebrenica genocide finding; 1992 Drina pattern as ethnic cleansing.
- UN S/1994/674 (Commission of Experts Final Report).
- BB I pp. 132–144, 198–214 — operational chronology.

## 2. Defensible Historical / Default Option

**Blocked per Foundational packet `drina_cleansing_decision_1992` ruling — convert to consequence/reflection only; no authored counterfactual option.**

The Foundational packet (`docs/40_reports/proposals/20260527_EVENT_FOUNDATIONAL_DECISIONS_PACKET.md`, Sensitive-History Rulings table) records the binding ruling on this family:

> `drina_cleansing_decision_1992` — Blocked as a player-selectable systematic-cleansing decision. Convert to consequence/reflection, or reframe around command discipline while displacement/war-crime consequences emerge from existing systems.

Sensitive-History Gate §1 Ring 3 #1 reinforces this independently of the Foundational packet:

> **No "commit genocide" decision tree.** Genocide is never a button, a slider, a multi-option event, or a player-authorized instruction. The player does not issue orders like "cleanse settlement X." The player does not select targets for systematic atrocity.

Gate §1 Ring 3 #5 reinforces the operational implication:

> **No "atrocity efficiency" metric.** Paramilitary deployments are never framed as a dominant strategy. The bot AI uses them where historically documented; the UI never suggests "deploy paramilitaries for territorial efficiency."

The v1.3 packet §4.1 R3 row encodes the Foundational ruling verbatim in the "Counterfactual options" cell: `Blocked per Foundational packet drina_cleansing_decision_1992 ruling — convert to consequence/reflection only; no authored counterfactual option`.

**Outcome:** there is NO player-facing R3 event. The campaign tempo is not a decision row. The cleansing operations described in §1 above flow from the existing engine surfaces:

- `src/sim/combat/paramilitary_sweep.ts` — paramilitary capture, civilian-casualty accounting, `war_crimes_events` counter increment (Gate §1 Ring 1).
- `src/state/displacement.ts` — `original_population`, `displaced_out`, `displaced_in`, `lost_population` per municipality (Gate §1 Ring 1).
- `src/sim/combat/enclave_resilience.ts` — Srebrenica/Žepa/Goražde enclave formation as the population sink for displaced Muslims (Gate §1 Ring 1).
- `src/sim/negotiation/rupture_consequences.ts` — the single 1995 rupture `srebrenica_genocide_1995` fires on emergent OSID condition (Gate §2 criteria 1–4).
- R2 (`rs_paramilitary_policy`) — the canonical player-authorized war-crime surface; the *policy* decision lives there, not at R3.

## 3. Proposed Counterfactual Options

**Blocked per Foundational packet `drina_cleansing_decision_1992` ruling — convert to consequence/reflection only; no authored counterfactual option.**

No `restrained`, `systematic`, `selective`, or any other player-selectable option is authored for the Drina campaign tempo. This is a binding canon decision, not a research gap.

**Why the obvious-looking `restrained` option is also rejected:** A `restrained` vs `systematic` framing would functionally implement Gate §1 Ring 3 #5 ("atrocity efficiency metric") — the player would learn that one tempo costs more in international standing while the other costs more in time, and would optimize accordingly. The Foundational packet ruling forecloses *both* poles of that binary, not just the `systematic` pole. The implementation note from Gate §1 Ring 1 (the data-not-comment / Stupčanica-95 lesson, 2026-05-07) applies by analogy: a foreclosure of "Drina campaign tempo as player lever" must be expressed in the data (no event row in `war_1992.json`), not by comment claims that the row is restrained. There is no Drina tempo decision in the JSON; that absence is the canon enforcement.

**Implementation-note (data-not-comment, Gate §1 Ring 1 extension):** Just as `Operacija Stupčanica` had to be removed from the bot operation-name pool to prevent its appearance via random selection at w27 (commit `759a35cd`, 2026-05-07), the Drina tempo decision row must be absent from `data/scenarios/events/war_1992.json` to prevent its appearance via taxonomy-classification or templating tools. Static tests enforcing the absence (or, more precisely, enforcing that no event with `tags: ['drina', 'tempo']` or similar exists) are recommended for Phase D wiring.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

**Blocked per Foundational packet `drina_cleansing_decision_1992` ruling — convert to consequence/reflection only; no authored counterfactual option.**

No material effects authored at this row. All material consequences flow from existing Ring 1 engines (paramilitary sweep, displacement, enclave resilience, rupture consequences) and from R1 (platform decision) and R2 (paramilitary policy authorization) per their respective worksheets.

**Consequence-only / reflection events permitted:** Per the Foundational packet's "Convert to consequence/reflection" clause, post-hoc Codex/Chronicle/Records entries that *describe* the Drina campaign in historical voice are permitted under Gate §5 (Essays and Codex). These are not decision rows; they are Ring 2 narrative representation triggered by emergent state. Candidates include:

- An essay/codex entry on the Drina valley 1992 campaign citing the §1 ICTY/ICJ record. Already partially covered by existing essays in `data/scenarios/essays/`.
- A Chronicle / Wrapped slide observing the displacement totals from Drina-corridor OSIDs at endgame, in Gate §4 wording register (third-person historical voice, ICTY citations, no euphemism).
- A `csq_drina_partisan_resistance` consequence event (already named in v1.3 packet §4.1 R3 row downstream-opens cell) — fires on emergent state where ARBIH retains Drina-corridor OSIDs through a player path that flowed from R1 `selective` or R2 `always_deny`. This is a *consequence* event, not a decision row.

None of the above is authored in this Phase A worksheet; they are noted as the canonical landing zones for downstream Drina-related content per the Foundational packet's "convert to consequence/reflection" instruction.

## 5. Sensitive-History Ring And Source Note

**Blocked per Foundational packet `drina_cleansing_decision_1992` ruling — convert to consequence/reflection only; no authored counterfactual option.**

**Ring (for reference, since no row is authored):** Ring 3 — Refused. Gate §1 Ring 3 #1: "No 'commit genocide' decision tree." The campaign tempo is Ring 3 *as a player decision row* and Ring 1 *as an engine consequence*. The boundary between Ring 1 and Ring 3 is precisely the line that this worksheet records as Blocked.

**Source note (for reference — would apply to any future consequence/reflection event, not to a decision row):**

> The Drina valley campaign of April–August 1992 implemented Goal 3 of the Six Strategic Goals adopted by the RS Assembly on 12 May 1992 (ICTY *Karadžić* IT-95-5/18-T §§3447–3475). Cleansing operations at Zvornik, Bijeljina, Višegrad, Foča, Bratunac, and surrounding municipalities are documented in *Karadžić*, *Lukić & Lukić* (IT-98-32/1), *Kunarac, Kovač & Vuković* (IT-96-23), *Krnojelac* (IT-97-25-T), and *Krstić* (IT-98-33-T). ICJ *Bosnia v. Serbia* (2007) found this pattern as ethnic cleansing; the Srebrenica enclave that resulted was the site of the 1995 genocide.

**Source tier:** `icty_icj_un` (for any future Ring 2 consequence/reflection event derived from this material).

## 6. Downstream Opens / Closes (Per §3.3)

**Blocked per Foundational packet `drina_cleansing_decision_1992` ruling — convert to consequence/reflection only; no authored counterfactual option.**

No `enables_events_runtime` or `closes_events_runtime` authored at R3. Downstream causality from R1 (platform) and R2 (paramilitary policy) routes through the engine surfaces named in §2 above, not through R3.

The v1.3 packet §4.1 R3 row's "Downstream opens/closes" cell records "opens csq_drina_partisan_resistance; closes Drina reintegration" — these are *consequence* events flowing from R1/R2 + engine state, not from a player decision at R3.

## 7. Open Questions Deferred To Canon Compliance Review

1. Confirm with Canon Compliance that the absence of a Drina tempo decision row in `data/scenarios/events/war_1992.json` is the correct canon enforcement (per the data-not-comment lesson from Gate §1 Ring 1 implementation note, 2026-05-07). **Ruling (Canon Compliance Reviewer, Wave 1 review):** Phase B MUST ship a static test asserting that no event in the catalog carries `family: 'rs_drina_campaign'` (or any equivalent tag combination such as `tags: ['drina', 'tempo']` that would functionally re-introduce the decision row). This is **required**, not recommended. The test is the canon-enforceable shape per Gate §1 Ring 3 #1 (no commit-genocide decision tree) combined with the data-not-comment Stupčanica precedent (Gate §1 Ring 1, commit `759a35cd`, 2026-05-07): the foreclosure must live in the data and in a static-test assertion, not in a comment claim. Phase B closeout cannot land without this test in place.
2. Confirm that future consequence/reflection events derived from the Drina campaign (e.g., `csq_drina_partisan_resistance`) carry `historical_marker: 'counterfactual'` when fired on a divergent path, and a Ring 2 essay-style narrative when fired on the historical path. Defer to Game Designer + Narrative Designer in Phase D.
3. Whether the Cost Ledger / Wrapped should always render a Drina-displacement summary (Gate §4 wording register) when displacement totals from Drina-corridor OSIDs exceed an emergent threshold, regardless of player path. Recommend: yes, in Gate §4-compliant third-person historical voice; defer to Narrative Designer.
4. Whether any existing event in `consequences.json` currently labeled `Counterfactual staff path` for the Drina chain needs re-classification under v1.3 packet §5 Source Standard. Defer to Canon Compliance Phase A→D handoff.
