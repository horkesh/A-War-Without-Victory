# Event Family Worksheet — H8: Mostar Bridge Destroyed (November 1993)

**Family ID:** `hrhb_mostar_bridge_destruction_1993`
**Packet row:** v1.3 packet §4.3 H8 (HRHB families)
**Sensitive ring:** **Ring 1/2** — narrative / follow-on. Engine-driven dimension shift + Ring 2 narrative + Cost Ledger annotation. **NO PLAYER DECISION ROW AUTHORED AT FAMILY LEVEL.** ICTY Prlić et al. attributes the destruction to the HVO command chain under the JCE common purpose; the act is a documented historical fact in AWWV state at fire-time, not a Presidency-level choice surface.
**Source tier:** A (`icty_icj_un`) — Prlić et al. IT-04-74 Stari Most findings; UNESCO documentation; ICTY *Prlić et al.* Appeals Judgment cultural-property findings.
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits. Docs-only. **DOCUMENTS A NO-PLAYER-DECISION ROW.**

---

## 1. Cited Historical Narrative

The **Stari Most** ("Old Bridge"), a 16th-century Ottoman bridge spanning the Neretva River at Mostar, was commissioned by Sultan Suleiman the Magnificent and completed in 1566 under the architect Mimar Hayruddin. The bridge was an inscribed historical monument and the cultural symbol of the city of Mostar.

On **9 November 1993**, between approximately 10:00 and 10:30 local time, HVO tank fire — direct artillery from the HVO-held west bank — collapsed the bridge into the Neretva. The destruction followed weeks of sustained HVO shelling of East Mostar (the ARBiH-defended east bank where the Bosniak population was concentrated under siege from May 1993 onward).

The ICTY record on the Stari Most destruction:

- **Prlić et al. IT-04-74-T Trial Judgment** (29 May 2013) Vol. 3 §§1366-1455 reconstructs the Mostar siege and the Stari Most destruction in detail. The Trial Chamber found:
  - HVO tank fire deliberately targeted the bridge from a position on the west bank (Vol. 3 §§1366-1402; specific tank positions and firing patterns reconstructed from forensic and testimonial evidence).
  - The bridge had no military value at the time of destruction — its role as a civilian footbridge had been documented by ARBiH testimony and ICRC observation; the bridge could not bear armoured-vehicle weight (Vol. 3 §§1402-1425).
  - The destruction was attributable to the JCE common purpose under the persecution and cultural-property destruction charges (Vol. 3 §§1425-1455; Vol. 4 §§95-130 on JCE attribution to Prlić, Stojić, Praljak, Petković, Ćorić, Pušić).
  - Slobodan Praljak (HVO Main Staff commander at the time of destruction) was convicted, inter alia, on the Stari Most charge.
- **Prlić et al. IT-04-74-A Appeals Judgment** (29 November 2017) §§411-450 reviewed the Stari Most findings on appeal. The Appeals Chamber **partially reversed the Trial Chamber's specific characterization of the bridge's military status** (finding that the bridge had some military utility at the time of destruction and that the Trial Chamber erred in characterizing it as having no military utility whatsoever) but **upheld the conviction** on the broader persecution / cultural-property charge under JCE attribution. The Appeals Chamber affirmed the JCE common-purpose finding and the destruction as a documented act of the HVO command chain. (The Praljak suicide in the Appeals courtroom on 29 November 2017 followed the announcement of the Appeals Judgment.)
- **UNESCO documentation.** The Stari Most was inscribed on the UNESCO World Heritage List in 2005 as "Old Bridge Area of the Old City of Mostar" following the 1993-2004 reconstruction. UNESCO contemporaneously documented the destruction in 1993 and the reconstruction process from 1995-2004; the post-Dayton reconstruction was completed and the bridge reopened on 23 July 2004.
- **Balkan Battlegrounds Vol. II** pp. 471-475 corroborates the operational chronology of the East Mostar siege and the November 1993 phase of HVO shelling.

The **command-chain attribution** is documented at JCE-attribution depth. The Trial Chamber found that Praljak — as HVO Main Staff commander at the time — bore command responsibility for the destruction, and that the destruction was part of the JCE common purpose of producing a Croat-republic territorial entity by terror, displacement, and the symbolic destruction of Bosniak-cultural and Ottoman-heritage markers. The Prlić leadership group (Prlić, Stojić, Praljak, Petković, Ćorić, Pušić) was convicted on the JCE attribution; the Appeals Judgment upheld the JCE finding while partially reversing the specific military-utility characterization.

**The destruction is a historical fact in AWWV state at fire-time.** It is **not** a Presidency-level choice surface. Per the existing AWWV authoring (`mostar_bridge_destroyed_1993` in `data/scenarios/events/war_1993.json`): the event fires deterministically at turn 83 conditional on `flag_equals mostar_liberated: true` AND `requires_events: ['east_mostar_siege_1993']`. The fire is a **dimension shift + narrative** with no `response_options[]` requiring player response — it is engine-driven on the Croat-Bosniak war chain's mid-1993 operational state.

**Citations:**
- ICTY *Prlić et al.* IT-04-74-T Trial Judgment (29 May 2013) Vol. 3 §§1366-1455; Vol. 4 §§95-130.
- ICTY *Prlić et al.* IT-04-74-A Appeals Judgment (29 November 2017) §§411-450, 601-650.
- UNESCO inscription "Old Bridge Area of the Old City of Mostar" (2005); UNESCO contemporaneous 1993 documentation; post-Dayton reconstruction 1995-2004.
- Balkan Battlegrounds Vol. II pp. 471-475.

## 2. No Player Decision Row Authored — Rationale

Per v1.3 packet §4.3 H8 row: "follow-on / narrative; not a player decision." This worksheet **documents the absence of a player decision row** at the family level. The rationale is grounded in three independent canon constraints:

### 2.1 Sensitive-History Gate §1 Ring Boundary

Per Sensitive-History Gate §1.3 (Ring 3 — refused, item #1):

> No "commit genocide" decision tree. Genocide is never a button, a slider, a multi-option event, or a player-authorized instruction. The player does not issue orders like "cleanse settlement X." The player does not select targets for systematic atrocity.

The Stari Most destruction, attributed by ICTY at JCE-attribution depth to the HVO command chain, is structurally analogous — the player does not author specific destruction-of-cultural-property orders at the HZ HB Presidency level. Authoring an option like `destroy_bridge` / `preserve_bridge` would treat cultural-property destruction as a player-optimizable trade-off, violating §1 Ring 3 #1, #2 (no concentration-camp system / no granular atrocity authorization), and #5 (no atrocity-efficiency metric).

The act is depicted as **engine-driven consequence + Ring 2 narrative** per Gate §1 Ring 1 and Ring 2 framing. The Cost Ledger records the cultural-destruction outcome via the existing `mostar_bridge_destroyed_1993` event's `dimension_shifts` and Ring 2 essays / Chronicle entries.

### 2.2 Sensitive-History Gate §2 Rupture Criteria — Why Not A Rupture

Per Gate §2 four-criterion rupture test:

| Criterion | Stari Most destruction status |
| --- | --- |
| Mass scale (>1,000 civilian deaths in bounded event) | Not met — destruction was of cultural property, not mass killing. Loss of life from the broader Mostar siege is separately accounted under siege casualties. |
| International legal finding | Met — ICTY *Prlić* Trial + Appeals conviction; cultural-property destruction under JCE persecution charge. |
| Specific trigger condition | Met by existing authoring — turn 83, `flag_equals mostar_liberated: true`, `requires_events: ['east_mostar_siege_1993']`. |
| Non-reversible | Met — once fired, the dimension shift and narrative entry persist for the remainder of the run. |

The destruction does **not** meet the mass-scale criterion (criterion 1) and is therefore **not** a rupture. It is a Ring 2 narrative + Ring 1 dimension shift consequence, per Gate §2's Ring 2 disposition for events that meet some-but-not-all rupture criteria.

### 2.3 Packet §3.6 Continuation-Of-Act Clause

Per v1.3 packet §3.6:

> A response option whose `effects` or `sets_flags` extend, continue, or scale a sensitive-history act already in state at fire-time — including hostage detention, paramilitary deployment beyond the canonical `paramilitary_policy` surface, cleansing, civilian targeting, or camp operation. The Gate's player-authorized war-crime surface is `paramilitary_policy`; no other response-option path may authorize new sensitive acts.

Authoring an H8 response option (e.g., `acknowledge` / `deny_responsibility` / `apologize`) at the family level would create a player-facing surface adjacent to the destruction act itself — a structural risk that future authoring drift could turn into a leverification path (e.g., "deny improves international standing by N"; "destroy improves military_credibility by M"). The cleaner shape is: the act is engine-driven, the consequence is recorded by `dimension_shifts` and narrative, and the player has no Presidency-level decision adjacent to the act.

The Presidency-level patron-pressure decision surface adjacent to the Stari Most window is **H7 (Zagreb orders HRHB ceasefire 1994)** — three months later, at a different decision register. The H7 worksheet handles patron-pressure response without engaging the cultural-destruction act directly.

## 3. Engine-Driven Dimension Shift + Ring 2 Narrative

The existing AWWV authoring (`mostar_bridge_destroyed_1993` in `data/scenarios/events/war_1993.json`) shape:

- **Trigger:** turn 83, phase `war`, `requires_events: ['east_mostar_siege_1993']`, `condition.flag_equals mostar_liberated: true`.
- **Once:** `true`.
- **Effect (humanitarian_impact):** `faction: 'HRHB'`, `war_crimes_delta: 1`.
- **Effects (negotiation_capital):** `faction: 'HRHB'`, `dimension: 'international_credibility'`, `delta: -10`.
- **No `response_options[]`** — no player decision; engine-driven consequence.

Phase D adjustments recommended (not requiring author-level decision row):

- **Dimension shifts:** add `international_standing HRHB: -15` (Western-capital visibility maximal — global cultural-heritage symbol); add `patron_confidence HRHB: -5` (Zagreb absorbs visibility cost); add `cost_ledger_annotation` recording the cultural-destruction event for endgame voice per Sensitive-History Gate §4 (cultural-destruction wording: "Stari Most destroyed," ICTY Prlić IT-04-74 Trial Vol. 3 §§1366-1455 citation, UNESCO reference).
- **Ring 2 narrative:** ensure the existing essay coverage of the Stari Most destruction includes the ICTY citations (Prlić Trial Vol. 3 §§1366-1455; Appeals §§411-450), the UNESCO inscription context, and the post-Dayton 2004 reconstruction context per Sensitive-History Gate §5 (essay constraints; historical-voice register; no minimization).
- **Counterfactual ghost section:** if the player's H1 / H2 / H6 / H7 choices have foreclosed the Croat-Bosniak war chain by turn 83 — e.g., H1 `united_front`, H2 `negotiate`, H6 `cooperate`, H7 `acknowledge_pressure` selected before turn 83 — the bridge destruction does not fire (the trigger predicate `mostar_liberated: true` is not satisfied because the East Mostar siege did not develop). Per Gate §5 counterfactual register: a `dynamic_sections` ghost entry should record "In this campaign, the Stari Most was not destroyed; the HVO offensive against East Mostar did not materialize." This is the §3-compliant counterfactual recorder pattern (predicate-gated, no celebration, no minimization).

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

**Family-level: NONE AUTHORED.** No player decision row. No `response_options[]`. The event fires engine-driven on the existing trigger predicate.

**Event-level effects (existing authoring retained, Phase D may augment dimension_shifts only):**

| Effect | Faction | Value |
| --- | --- | --- |
| `humanitarian_impact.war_crimes_delta` | HRHB | +1 (existing) |
| `negotiation_capital.international_credibility` | HRHB | -10 (existing) |
| `dimension_shifts.international_standing` | HRHB | -15 (Phase D recommended addition) |
| `dimension_shifts.patron_confidence` | HRHB | -5 (Phase D recommended addition) |
| `cost_ledger_annotation` | HRHB | Phase D recommended addition; wording per Gate §4 |

**§3.6 hard rule (v1.3 packet):** The event itself records the historical consequence; no `paramilitary_policy` write, no `control_change`, no `displacement_*` write at this event. The Croat-Bosniak war chain's broader consequences (East Mostar siege casualties, displacement) are accumulated by other engine systems (combat, paramilitary sweep, displacement) and do not double-count through this event.

**No `enables_events_runtime`, no `closes_events_runtime`.** The event does not gate downstream eligibility. It is a Ring 2 narrative + Ring 1 dimension shift event; downstream patron-pressure consequences are handled by H7 (Zagreb ceasefire 1994).

**No `branch_tag`** — no response options exist.

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 1/2 — narrative + dimension shift; **no player decision row**; engine-driven consequence per Gate §1.3 Ring 3 #1, #2, #5 constraints.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> On 9 November 1993 HVO tank fire from the west bank collapsed the Stari Most into the Neretva. ICTY *Prlić et al.* IT-04-74 Trial Judgment Vol. 3 §§1366-1455 found the destruction attributable to the JCE common purpose under the persecution / cultural-property charge; the Appeals Judgment §§411-450 upheld the JCE finding while partially adjusting the military-utility characterization. UNESCO inscribed the reconstructed bridge in 2005; the post-Dayton reconstruction was completed 23 July 2004. BB Vol. II pp. 471-475. (≤2 sentences after Phase D compression.)

**Source tier:** `icty_icj_un`.

## 6. Downstream Opens / Closes (Per §3.3)

No event-level `enables_events`, no event-level `closes_events`. The event is consequence-only.

The **narrative follow-on** (Ring 2 essays, Chronicle entries, Cost Ledger annotation) is the downstream surface — handled by Gate §5 essay/codex protocol, not by event-level eligibility wiring.

The **engine-driven foreclosure** of the event is via the existing trigger predicate: if `east_mostar_siege_1993` does not fire (because the Croat-Bosniak war chain is foreclosed at H1 / H2 / H6 / H7), then H8 does not fire. Per Gate §1.5 #11 emergent satisfaction; counterfactual silence is canonically correct.

## 7. Counterfactual Ghost Entry (Recommended)

Per Sensitive-History Gate §5 counterfactual register protocol (the Mission E `enclave_defended` canonical pattern), Phase D should author a ghost entry for the foreclosed-Stari-Most-destruction path:

- **Predicate location:** `src/sim/codex/dynamic_section_builder.ts` — add `predStariMostPreserved()` gated on the negation of `mostar_bridge_destruction_occurred` flag (set when the existing `mostar_bridge_destroyed_1993` event fires).
- **Narrative location:** `data/codex/ghost_entries/stari_most_preserved.md` — historical-voice text register, no celebration, no minimization, no "less deadly than history" framing. Reference template: existing `enclave_defended.md`.
- **Canonical role:** counterfactual recorder for the ahistorical path where the Croat-Bosniak war chain did not develop the East Mostar siege; the Ring 2 historical record (essays + ICTY citations) remains canonical and accessible regardless.

This shape — predicate + narrative file — is the §3-compliant counterfactual recorder per Gate §5. The historical essay coverage of the Stari Most destruction remains primary; the ghost entry observes the divergence without overwriting either layer.

## 8. Modal Source Notes Draft

> Stari Most destroyed by HVO tank fire 9 November 1993; ICTY Prlić et al. IT-04-74 (Trial Vol. 3 §§1366-1455; Appeals §§411-450) attributes the destruction to the JCE common purpose under persecution / cultural-property charges. UNESCO inscribed the reconstructed bridge in 2005. BB Vol. II pp. 471-475.

## 9. Open Questions Deferred To Canon Compliance Review

1. **Existing authoring shape preservation.** The existing `mostar_bridge_destroyed_1993` event is engine-driven without response options. Phase D should preserve this shape and add only the recommended dimension shifts and Cost Ledger annotation. Reject any proposal to add a player decision row. Defer to Canon Compliance Reviewer.
2. **Counterfactual ghost-entry authoring.** The recommended `stari_most_preserved.md` ghost entry is Phase D scope and must follow the `enclave_defended.md` canonical pattern. Defer to Narrative Designer for prose authoring under historian co-sign-off per Gate §6.
3. **Appeals Judgment characterization in modal note.** The Appeals Judgment partially reversed the military-utility characterization while upholding the conviction. Phase D modal note must not over-simplify — recommended phrasing: "Trial Chamber and Appeals Chamber convicted the HVO command leadership for the destruction under JCE persecution charges; Appeals partially adjusted the military-utility characterization while affirming the conviction." Defer to Narrative Designer + Historian co-review.
4. **Cost Ledger wording per Gate §4.** The Cost Ledger annotation for cultural-destruction must follow Gate §4 wording constraints: historical voice, third-person, specific names (Stari Most; ICTY Prlić IT-04-74 citation; UNESCO inscription reference), no euphemism, no trivializing comparison. Defer to Narrative Designer.
5. **Praljak Appeals courtroom suicide (29 November 2017).** This historical fact is not in scope for the AWWV event-system rendering (the event fires in November 1993; the Appeals Judgment is 2017) but is relevant to the modal source note for full historical accuracy. Recommendation: the modal note cites the Trial Vol. 3 §§1366-1455 and Appeals §§411-450 findings without referencing the courtroom suicide event, which is a post-Dayton historical-record matter and belongs in the dedicated ICTY essay / Codex entry, not the modal at the simulation-event level. Defer to Narrative Designer.
6. **No-player-decision documentation in event database.** Per v1.3 packet §2.2: an event with `requires_player_response: false` is structurally fine. Phase D should not add `requires_player_response: true` to this event under any pressure to "increase agency." The Sensitive-History Gate §1.3 Ring 3 constraints take precedence over agency-density concerns. Defer to Canon Compliance Reviewer.
