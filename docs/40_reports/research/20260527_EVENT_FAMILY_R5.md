# Event Family Worksheet — R5: RS Belgrade Pressure On Pale (August 1992)

**Family ID:** `rs_belgrade_pressure_aug1992`
**Packet row:** v1.3 packet §4.1 R5 (RS families)
**Sensitive ring:** none (political / patron-relations row)
**Source tier:** B (`balkan_battlegrounds` + corroborated participant evidence from Milošević trial testimony); ICTY *Karadžić* IT-95-5/18-T cited for context
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

By late July and early August 1992, the Federal Republic of Yugoslavia (FRY) leadership in Belgrade — Slobodan Milošević as President of Serbia, Dobrica Ćosić as President of the rump FRY (appointed 15 June 1992), and the FRY Foreign Minister — faced compounding international pressure resulting from (i) the Prijedor camp exposure (R4), (ii) Bosnia's admission to the United Nations on 22 May 1992, (iii) the imposition of UN sanctions on FRY by UNSC Resolution 757 (30 May 1992), and (iv) preparations for the London Conference on the Former Yugoslavia (26–28 August 1992).

The Belgrade leadership applied pressure on the Pale RS leadership (Radovan Karadžić, Momčilo Krajišnik, Biljana Plavšić) in this window with three principal aims: (a) cooperate publicly with international humanitarian demands sufficient to reduce sanctions exposure on FRY; (b) accept the London Conference framework (eventual outcome: London Principles signed 26–27 August 1992 by all parties, per X1); (c) restrain or at least sub-rosa the most visible cleansing methods to manage the diplomatic damage.

The Karadžić Trial Chamber documented Belgrade–Pale tensions in this period extensively, in the context of establishing the JCE common purpose and Karadžić's contemporaneous knowledge:

- *Karadžić* IT-95-5/18-T §§578–612 — relationship between FRY leadership and RS leadership in 1992; Milošević's public distancing accompanied by continued material support (VRS personnel funded through the FRY Yugoslav Army's 30th Personnel Centre established 10 November 1993, but with precursor arrangements through August 1992).
- *Karadžić* IT-95-5/18-T §§3251–3268 — Karadžić's relationship with Belgrade through 1992–1994; record of repeated demands from Milošević that Karadžić moderate publicly and accept negotiated frameworks.
- *Karadžić* IT-95-5/18-T §§3473–3475 — contemporaneous public posture on camps (R4 context) where Karadžić's denial framing was at variance with Belgrade's preferred public line.

The pattern documented across the *Karadžić*, *Krajišnik*, and *Milošević* (IT-02-54) proceedings is: Pale **publicly acknowledged** patron pressure (the RS Assembly and Presidency repeatedly referenced FRY positions in their internal proceedings, per Assembly minutes cited in *Krajišnik* IT-00-39-T §§856–891 and *Karadžić* §§3251–3268), while **later defying** specific Belgrade demands when those demands conflicted with the Six Strategic Goals' implementation. The August 1992 moment falls into the first phase of this pattern — pressure acknowledged, public moderation gestured at — followed by the well-documented divergences of 1993 (Vance-Owen rejection at Pale Assembly, May 1993; per R6) and 1994 (Belgrade embargo on RS, August 1994; per R8).

**Balkan Battlegrounds operational context:**

- BB I pp. 198–214 documents the Prijedor / Krajina campaign chronology and the international response.
- BB I pp. 224–229 discusses Belgrade–Pale tensions in 1992 including the eventual arrest of the Vučković brothers (Yellow Wasps) by RS MUP under combined Belgrade and Pale pressure, indicating that selective compliance with Belgrade did occur.
- BB I pp. 309–325 (Ch. 12 — London Conference and aftermath) covers the August 1992 diplomatic sequence into the London Conference.

**Milošević trial testimony (Tier B corroborated participant evidence):**

The *Milošević* trial (IT-02-54) before Milošević's death in March 2006 produced substantial witness testimony on Belgrade–Pale relations in 1992, principally:

- Witness B-127 (protective measures), former senior FRY/RS-political figure, transcript dates spring 2003, on Belgrade demands that Pale accept the London framework and moderate camp posture.
- Lord David Owen testimony (3–4 November 2003) on his contemporaneous understanding of Belgrade pressure on Pale in 1992–1993.

These transcripts are admissible Tier B corroborated participant evidence (per Source Standard in v1.3 §5) because they are corroborated by ICTY *Karadžić* findings and the contemporaneous documentary record (Assembly minutes, FRY government records introduced as exhibits).

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) §§578–612, 3251–3268, 3473–3475.
- ICTY *Krajišnik* IT-00-39-T (Trial Judgment, 27 September 2006) §§856–891.
- ICTY *Milošević* IT-02-54 trial transcripts (proceedings terminated by death 11 March 2006) — Witness B-127 testimony; Lord Owen testimony 3–4 November 2003.
- UN Security Council Resolution 757 (30 May 1992) — FRY sanctions.
- UN Security Council Resolution 752 (15 May 1992) — Bosnia-related demands on FRY.
- London Conference on the Former Yugoslavia, London Principles (26–27 August 1992) — agreement text; X1 worksheet covers.
- BB I pp. 198–229, 309–325.

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "acknowledge_pressure"`** — Historical default.

The option matches the documented Pale posture in August 1992: publicly acknowledge that Belgrade has communicated demands, gesture at moderation (the eventual signature of the London Principles 26–27 August 1992 by all parties including RS via the FRY delegation umbrella covers this), preserve the underlying platform decisions. The historical RS leadership did NOT publicly defy Milošević in August 1992; the open defiance is a 1993 phenomenon (Pale Assembly rejection of Vance-Owen on 5–6 May 1993, per R6, and the broader pattern through 1994 per R8).

The label `Historical default` is defensible because:

- The decision is at modal-decision granularity: a player-facing RS presidential choice in response to Belgrade pressure communicated in a specific moment.
- The actor-specific choice is documented (*Karadžić* §§3251–3268 + Assembly minutes via *Krajišnik* §§856–891).
- Source tier B (BB + corroborated participant evidence) is sufficient per Source Standard for a non-atrocity political-relations row.

**Per task brief:** "Historical default `acknowledge_pressure` (later defied historically per record)." The "later defied" framing flows into R6 and R8, not into this row.

**Framing constraint:** the option must depict the *patron-pressure acknowledgement* — accept that Belgrade has reasons, gesture at moderation, preserve underlying decisions — without authorizing or scaling any Ring 1 act. The `patron_pressure` engine field is the canonical state surface; this row writes to it.

## 3. Proposed Counterfactual Options

The packet brief specifies one counterfactual: `resist_patron`. This worksheet pins it as the sole counterfactual and proposes one additional option for completeness.

### 3.1 `resist_patron` — `Counterfactual staff path`

Open public defiance of Belgrade pressure in August 1992 — months earlier than the historical defiance pattern (which materialized in 1993 with the Vance-Owen Assembly rejection per R6). This option models a Pale leadership that chose immediate confrontation with Milošević over delayed, opportunistic defiance.

Design provenance: a plausible alternative path in which Karadžić's hardline-base read of Pale internal politics moved the resistance window from 1993 to August 1992. Not documented as the historical posture in this window; source tier `design_counterfactual`.

**Material effects (proposed):**
- `patron_pressure: +15` (severe patron disapproval, beyond the routine +5 of acknowledgement)
- `sets_flags: { belgrade_pressure_aug1992: "resist_patron" }`
- `dimension_shifts`: `patron_confidence: -25`; `internal_cohesion: +10` (hardline base rewarded); `international_standing: -5` (additional diplomatic isolation)
- `aggression_affinity: +0.3`
- `risk_level: 0.7`

### 3.2 `acknowledge_pressure` — `Historical default` (per §2)

**Material effects (proposed):**
- `patron_pressure: +5` (routine acknowledgement does not fully absorb the moment's pressure spike)
- `sets_flags: { belgrade_pressure_aug1992: "acknowledge_pressure" }`
- `dimension_shifts`: `patron_confidence: +5`; `international_standing: +3` (modest gesture rewarded); `internal_cohesion: -3` (hardline base disquieted)
- `aggression_affinity: -0.2`
- `risk_level: 0.3`

### 3.3 No Third Option

The packet brief does not request a third option. The historical-vs-counterfactual binary is sufficient at the political-relations granularity of this row. Phase D should not introduce a `selective_compliance` or `partial_resist` middle option without explicit Game Designer + Historian sign-off — the Wave 2 vocabulary stub does not yet include such tags, and the modal-decision granularity is preserved cleaner with binary defiance vs acknowledgement.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

| Option | `effects[]` (proposed) | `sets_flags` (proposed) | `dimension_shifts` (proposed) |
| --- | --- | --- | --- |
| `acknowledge_pressure` | `patron_pressure: +5` (faction RS) | `belgrade_pressure_aug1992: 'acknowledge_pressure'` | `patron_confidence: +5`; `international_standing: +3`; `internal_cohesion: -3` |
| `resist_patron` | `patron_pressure: +15` (faction RS) | `belgrade_pressure_aug1992: 'resist_patron'` | `patron_confidence: -25`; `internal_cohesion: +10`; `international_standing: -5` |

Both options satisfy the §2.2 `material_effect_minimum_satisfied` rule via `effects[]`, `sets_flags`, and `dimension_shifts`.

Proposed Phase D wiring (informational, not authored here):

| Option | `branch_tag` (proposed) | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- | --- |
| `acknowledge_pressure` | `rs_belgrade_pressure_acknowledge` | `london_conference_1992` posture-improvement context; sets up the eventual *Milošević distancing track* via continued patron pressure accumulation through 1993 (per v1.3 §4.1 R5 row); preserves R6 (Vance-Owen) at historical default `reject` (the 1993 defiance still happens) | none (acknowledgement does not foreclose later defiance) |
| `resist_patron` | `rs_belgrade_pressure_resist` | pulled-forward "Milošević distancing track" — Belgrade embargo prefiguration (R8); pulls forward R11 (Karadžić/Mladić split) if combined with other hardline flags | maximalist patron-relations track; closes opportunities for FRY-mediated late-war diplomacy (Holbrooke-via-Belgrade channel — R14) — but this is Phase F territory and must be deferred |

**§3.6 hard rule:** neither option carries `effects` that extend, continue, or scale a sensitive-history act. Both options manipulate political/patron-relations state only. The Milošević trial transcripts ground the moment without requiring atrocity authorization at the response surface.

**Branch-tag vocabulary note:** the Wave 1 vocabulary stub does not include `rs_belgrade_pressure_*` tags. This worksheet proposes two new primitive tags. Phase B locks the TypeScript file after Wave 2 closure.

## 5. Sensitive-History Ring And Source Note

**Ring:** none. Per packet brief and v1.3 §4.1 R5 row. This is a political/patron-relations row. No Ring 1 atrocity surface is touched; no Ring 2 narrative representation of cleansing acts; the option set asks how the RS leadership manages relations with its FRY patron, not whether to authorise abuse.

**Gate §3 paramilitary boundary:** This row does NOT authorise paramilitary deployment. The paramilitary surface remains `state.military.paramilitary_policy` (R2). The `belgrade_pressure_aug1992` flag is patron-relations only.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> By August 1992, Belgrade (Milošević / Ćosić) pressed Pale (Karadžić / Krajišnik / Plavšić) to moderate publicly in advance of the London Conference and in response to UN sanctions on FRY (UNSC 757, 30 May 1992) and international reaction to the Prijedor camp exposure. ICTY *Karadžić* (IT-95-5/18-T) §§578–612, 3251–3268 documents the FRY–RS relationship in 1992 and the pattern of Belgrade demands and Pale acknowledgement. *Krajišnik* (IT-00-39-T) §§856–891 records Pale Assembly proceedings referencing FRY positions. *Milošević* trial testimony (IT-02-54, Witness B-127 and Lord Owen) corroborates contemporaneous Belgrade pressure on Pale. The historical Pale posture in August 1992 was public acknowledgement of pressure; open defiance came in 1993 (Vance-Owen Assembly rejection per R6) and 1994 (Belgrade embargo per R8).

**Source tier:** `corroborated_participant` (Tier B) for the primary historical claim; `icty_icj_un` for the ICTY-judgment context (*Karadžić* §§578–612, 3251–3268). When Phase D wires the row, `source_tier` should be set to whichever single tier predominates per Source Standard rules — Historian recommendation is `corroborated_participant` because the event-specific claim ("Belgrade pressed Pale in August 1992") rests primarily on participant testimony with ICTY judgments providing contextual ratification, not direct findings on the August 1992 moment.

## 6. Downstream Opens / Closes (Per §3.3)

R5 is opened by:

- Event-level: `turn_min` in the window corresponding to August 1992 (Phase A worksheet does not pin exact turn numbers; Phase D wiring will reference R4's `turn_min: 16, turn_max: 30` to align with the August 1992 window).
- Trigger condition (proposed): R1 `rs_strategic_goals` flag is set (any value); AND patron_pressure is below a saturation threshold (so the event still has signal); OR `camps_revealed` flag is true (R4 has fired). The proposed condition keeps the trigger emergent rather than calendar-railroaded.

Phase D would attach response-level `enables_events_runtime` / `closes_events_runtime` per §4 table above.

- **Opens (proposed Phase D):** `london_conference_1992` posture-improvement context (acknowledge); pulled-forward "Milošević distancing track" (resist).
- **Closes (proposed Phase D):** none on `acknowledge`; FRY-mediated late-war diplomacy track on `resist` (Phase F deferral required).
- **Sets up (without runtime gating):** R6 (Vance-Owen rejection May 1993) is downstream in calendar terms but is NOT runtime-gated by R5 — the historical Pale rejection of Vance-Owen happens regardless of August 1992 posture, since the 1992 acknowledgement did not preclude 1993 defiance. Phase D wiring must not foreclose R6's `reject` historical default based on R5's `acknowledge_pressure` choice.

## 7. Open Questions Deferred To Canon Compliance Review

1. **Event row does not currently exist:** unlike R4 (which uses existing `concentration_camps_revealed_1992`) and R6 (which uses existing `rs_assembly_rejects_voplan_1993`), R5 has no existing JSON row. Phase D authoring will create the new event. Recommend event id `belgrade_pressure_pale_aug1992` to mirror the R8 row `belgrade_embargo_rs_1994` naming pattern.
2. **Trigger window:** Phase D wiring will need an exact `turn_min` / `turn_max` window. Recommend `turn_min: 16, turn_max: 22` (mid-August through end-August 1992 in a 1-week-per-turn calendar starting 6 April 1992). To be confirmed by Scenario Creator/Runner/Tester.
3. **Source tier mixing:** the row's primary source is Tier B (BB + corroborated participant) with Tier A context (*Karadžić*). The Source Standard table (v1.3 §5) allows `corroborated_participant` only when corroborated by ICTY/BB/UN; this is satisfied. Canon Compliance to confirm `source_tier: corroborated_participant` is the right modal-displayed tier.
4. **Phase F deferral:** the "Milošević distancing track" referenced in v1.3 §4.1 R5 is itself a composite of R5, R8, R11, R14. R5's Phase D wiring should not unilaterally define the distancing-track gate; that needs to wait for Phase F coordination.
5. **No new event row should fire before R4:** the Belgrade pressure historically responded to the Prijedor exposure. Phase D trigger condition should include `requires_events: ["concentration_camps_revealed_1992"]` OR `flag_equals: { camps_revealed: true }` to enforce the historical ordering. Recommend the flag-based condition because it keeps the trigger emergent.
