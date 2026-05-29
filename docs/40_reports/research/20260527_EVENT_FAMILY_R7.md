# Event Family Worksheet — R7: RS Assembly Rejection Internal Politics

**Family ID:** `rs_assembly_rejection_internal`
**Packet row:** v1.3 packet §4.1 R7 (RS families)
**Sensitive ring:** Ring 2 — political-internal decision; not a sensitive-history act in itself
**Source tier:** A (`icty_icj_un`) for the Assembly record; B (`bb_corroborated`) for the Belgrade-Pale political dynamics around the vote
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

R7 is the internal-politics composite of the R6 outcome chain. R6 covers the Assembly's rejection of the Vance-Owen Peace Plan (VOPP) on the night of 5–6 May 1993 at Bijeljina, followed by the 15–16 May 1993 RS-wide referendum that endorsed the rejection. R7 holds the internal-politics decision Karadžić and the SDS Main Board faced *after* Milošević, Bulatović, Cosić, and the Greek government joined patron-pressure efforts at and around the Athens conference (1–2 May 1993) and the subsequent Pale-Bijeljina shuttle: namely, whether the Pale leadership would (a) accept the Assembly's rejection as binding — the historical action — or (b) override the Assembly and pull the rejection back into a Pale-leadership compliance posture.

The ICTY *Karadžić* trial chamber records the internal sequence in detail. After the Athens signature by Karadžić on 2 May 1993 (subject to Assembly ratification), Milošević personally traveled to Bijeljina on 5 May 1993 with Bulatović, Cosić, and Greek Prime Minister Mitsotakis to urge ratification (*Karadžić* IT-95-5/18-T §§4068–4089). The Assembly nonetheless voted to reject and to put the question to a referendum. Karadžić's own remarks at the session, recorded in the Assembly's stenographic record and cited in *Karadžić* §§4090–4112, accepted the Assembly's authority over the question and made no attempt to override the vote. The *Krajišnik* trial judgment (IT-00-39-T §§995–1019) confirms the leadership's deference to the Assembly mechanism as a feature of the SDS political architecture from 1991 onward — the Assembly was the legitimating institution the leadership had constructed and could not be unilaterally bypassed without rupturing the internal-cohesion logic the leadership depended on.

The *Karadžić* chamber further found (IT-95-5/18-T §§4113–4140) that the patron-pressure costs Karadžić absorbed by accepting the rejection — Milošević's subsequent imposition of the August 1994 embargo on RS, the closure of the Drina border crossings, and the public Belgrade distancing — were costs the leadership chose to take rather than precipitate an internal-cohesion crisis with the Assembly and the broader SDS Main Board. In short: the historical default was `accept_rejection` because the counterfactual (`override_assembly`) would have cost more in internal cohesion and patron trust than the international-standing penalty the rejection itself incurred — but the cost ordering was not obvious ex ante, and the leadership's calculus is documented.

BB II pp. 187–212 supplements the operational context: the rejection coincided with the VRS Drina Corps spring 1993 operations against the Srebrenica pocket, which the leadership viewed as a higher-priority objective than the territorial restraints VOPP would have imposed. The internal-cohesion calculus was therefore entangled with the in-progress military campaign — a fact relevant to the counterfactual's cost floor.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) §§4068–4140 — Athens / Bijeljina / Assembly internal dynamics.
- ICTY *Krajišnik* IT-00-39-T (Trial Judgment, 27 September 2006) §§995–1019 — SDS Assembly architecture and leadership deference.
- ICTY *Milošević* IT-02-54 (case terminated; transcripts and exhibits) — Milošević Bijeljina intervention contemporaneous record.
- UN S/25700 (1 May 1993, Vance-Owen Conference Report).
- BB II pp. 187–212 — operational context for the spring 1993 RS posture.

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "accept_rejection"`** — Historical default.

Karadžić and the SDS Main Board accepted the Assembly's 5–6 May 1993 rejection as binding. They did not attempt to override the Assembly vote. They subsequently endorsed the 15–16 May referendum that confirmed the rejection. This is the documented action of the historical actor (Pale leadership under Karadžić). The label `Historical default` is defensible under the Foundational packet label taxonomy because the option matches the actor-specific choice documented by ICTY.

## 3. Proposed Counterfactual Options

One counterfactual, `override_assembly`, already authored in the existing event row (per v1.3 packet §4.1 R7 cell "already authored"). The worksheet pins the existing option as canonical and specifies the counterfactual cost floor required by the Game Designer Wave 1 review.

### 3.1 `override_assembly` — `Counterfactual staff path`

Pale leadership overrides the Assembly's rejection, signs the Vance-Owen plan unilaterally, and absorbs the resulting internal-cohesion and patron-trust costs. Design provenance: a plausible alternative path in which Karadžić, under Milošević's Bijeljina pressure, chose to bypass the Assembly mechanism and impose the Athens signature as a Pale-leadership commitment. No documented historical override took this form; the option is `Counterfactual staff path`, source tier `design_counterfactual`, NOT `Historical default`.

**Counterfactual cost floor (per Game Designer Wave 1, mandatory):**

The override option MUST carry the following dimension shifts at minimum, to prevent the counterfactual from dominating the historical default through pure international-standing arbitrage:

| Dimension | Floor (override) | Rationale |
| --- | --- | --- |
| `internal_cohesion` | **−15** (minimum) | The Assembly is the SDS legitimating institution; an override fractures the SDS Main Board (per *Krajišnik* §§995–1019). The penalty must be at least as severe in magnitude as the international-standing penalty the historical rejection avoided (typical range: −15 to −20). |
| `patron_confidence` | **−20** (minimum) | Milošević's leverage rested on the *threat* of withdrawal; a unilateral Pale override moots the threat and signals to Belgrade that Pale will act without consultation. The August 1994 embargo (R8) becomes more likely, not less. The penalty must exceed any short-term patron-relations gain from compliance. |
| `international_standing` | +10 to +15 (positive — the *only* counterfactual gain) | This is the lure: compliance buys short-term diplomatic credit. The packet's instruction is that the negative dimensions above must outweigh this positive in the player's accumulated dimension portfolio across the war. |
| `aggression_affinity` | −0.3 (negative — Pale is overruling its own war-prone Assembly) | Consistent with the historical reading: override would have been a moderating, not a maximalist, choice. |
| `risk_level` | 0.7 | High internal-rupture risk; not as high as R1 `aggressive` (0.9), but well above R1 `selective` (0.3). |

The `−15` / `−20` floors are derived as follows: the v1.3 packet does not fix a numeric scale for dimension shifts, but the existing R1 row carries `−25` international_standing on `aggressive` (the most severe single-event shift in the war_1992.json corpus today). The cost-floor specification anchors the override penalty at a level that, combined with the patron-confidence penalty, exceeds the international-standing payoff in absolute terms. Phase B / Phase D wiring will translate these floors into concrete `dimension_shifts` and `sets_flags` entries.

**Material effects (existing + cost-floor additions):**
- Existing: `sets_flags: { rs_assembly_rejection_internal: "override_assembly" }`, dimension shifts already wired (per packet cell "already wired via current branch metadata").
- Cost-floor additions per Game Designer Wave 1: lower bounds on `internal_cohesion` and `patron_confidence` as tabulated above.

**Why the floor is non-negotiable:** Without the floor, `override_assembly` becomes a pure international-standing arbitrage that any rational player would take on a path where they care about international standing (which the v1.3 packet expects to be most paths). The historical-default option must remain the dominant strategy on the *historical* path. The cost floor is the mechanism by which the worksheet enforces that.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

Existing material effects on the two options (per packet §4.1 R7 row "already authored") satisfy the §2.2 `material_effect_minimum_satisfied` rule. The cost-floor additions in §3.1 above extend the existing `dimension_shifts` on `override_assembly` to satisfy Game Designer Wave 1.

Proposed Phase D / Phase C wiring (informational, not authored here):

| Option | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- |
| `accept_rejection` | R8 `rs_belgrade_embargo_aug1994` (the embargo becomes the patron's response); R9 `rs_owen_stoltenberg`; csq_international_disillusionment_1993 (already opened by R6) | none — historical track continues |
| `override_assembly` | csq_pale_assembly_rupture (internal-cohesion crisis); accelerated csq_patron_arms_review_imposed (R8 chain pulled forward); Vance-Owen implementation chain (composite `diplomacy_vance_owen` sub-tag `vance_owen_implemented` per branch-tag vocabulary stub) | R8 `defiant` branch (the override pre-empts the embargo by triggering Belgrade distancing earlier); Drina spring 1993 operational chain (politically suspended); Mladić-led offensives in the VOPP-protected zones |

**Note on composite tags:** The `override_assembly` branch contributes to the composite `diplomacy_vance_owen` tag as sub-tag `vance_owen_implemented`. Per the branch-tag vocabulary stub, this composite is computed at downstream trigger evaluation by reading the per-faction VOPP flags together. R7's `override_assembly` is one input; R6's authored `accept` option is another; downstream trigger evaluation reads both.

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 2 — narratively represented political-internal decision. R7 is *not* a sensitive-history act; it is an institutional-procedural decision about whether the leadership respects its own legitimating Assembly mechanism. The decision has no Ring 1 atrocity dimension and no Ring 3 refused-design dimension. The downstream consequences (patron embargo, Drina-corridor tempo) flow through other rows (R8, R3-via-engine).

**Source note for the modal (draft, per §5 of v1.3 packet):**

> Assembly of the Serbian People in BiH rejected the Vance-Owen Peace Plan on 5–6 May 1993 at Bijeljina, despite Milošević's personal Bijeljina intervention with Bulatović, Cosić, and Mitsotakis (Athens, 2 May 1993). The Pale leadership accepted the Assembly's rejection as binding rather than override the SDS legitimating mechanism. ICTY *Karadžić* IT-95-5/18-T §§4068–4140; *Krajišnik* IT-00-39-T §§995–1019.

**Source tier:** `icty_icj_un` for the Assembly record; `bb_corroborated` for the spring-1993 Drina operational context that influenced the internal-cohesion calculus.

## 6. Downstream Opens / Closes (Per §3.3)

See §4 table above. Worksheet-level summary:

- **Opens (via flag `rs_assembly_rejection_internal`):** R8 (`accept_rejection` opens the canonical 1994 embargo response; `override_assembly` pulls the embargo's pre-conditions forward); R9 (`accept_rejection` is the precondition for the historical Owen-Stoltenberg engagement posture).
- **Closes:** On `override_assembly`: R8 `defiant` branch (pre-empted), Drina spring 1993 operational chain (politically suspended), Mladić-led VOPP-zone offensives. On `accept_rejection`: no closures (historical chain continues to R8 / R9).
- **Composite-tag contribution:** `override_assembly` contributes sub-tag `vance_owen_implemented` to the composite `diplomacy_vance_owen` tag per branch-tag vocabulary stub.

## 7. Open Questions Deferred To Canon Compliance Review

1. The cost-floor numbers (`−15` internal_cohesion, `−20` patron_confidence) are anchored against the R1 `aggressive` `−25` international_standing as the most severe existing single-event shift in war_1992.json. Confirm with Game Designer that this anchoring is the intended scale; if the v1.3 packet later fixes a different absolute scale, the floors should be re-expressed proportionally to keep the dominance ordering intact (override penalty in absolute portfolio terms > rejection's international-standing penalty in absolute portfolio terms).
2. Whether the `override_assembly` option should additionally set a flag that *closes* the historical R6 `reject` outcome on the divergent path. The packet does not require this and the existing branch metadata appears to leave R6 standing; defer to Game Designer in Phase C.
3. Confirm with Canon Compliance that R7 as authored does NOT introduce a new rupture (Gate §2 criteria 1–4). The override path produces an internal-cohesion crisis but no atrocity; it remains Ring 2 and does not pull the worksheet into Gate §2 territory.
4. Whether the cost-floor specification should be lifted into a separate `cost_floor` field in the Phase B `event_families.ts` schema, or whether it should be expressed as the lower bound on the existing `dimension_shifts` entries. Defer to Technical Architect.
