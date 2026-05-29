# Event Family Worksheet — H7: Zagreb Orders HRHB Ceasefire (1994)

**Family ID:** `hrhb_zagreb_ceasefire_1994`
**Packet row:** v1.3 packet §4.3 H7 (HRHB families)
**Sensitive ring:** none — patron-pressure / strategic-political decision; no atrocity authorization in the option set.
**Source tier:** A (`agreement_text` + `icty_icj_un` corroborated by `corroborated_participant` and `balkan_battlegrounds`) — Washington Agreement text (1 March 1994); Tuđman Presidential Transcripts (admitted at Prlić IT-04-74); Granić-Šilajdžić channel (US State Department record); BB Vol. II.
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits. Docs-only.

---

## 1. Cited Historical Narrative

By **late January / early February 1994** the Croat-Bosniak war had reached strategic deadlock for HZ HB. Three converging pressures forced Tuđman's hand toward a US-brokered ceasefire and the Washington Agreement framework:

- **US/EU patron pressure on Zagreb.** The Clinton administration, via Secretary of State Warren Christopher and Ambassador Charles Redman, conveyed escalating warnings to Tuđman through January-February 1994 that continued HVO operations against ARBiH would trigger sanctions consideration and foreclose Croatia's EU/NATO trajectory. The threat of UN/EU sanctions on Croatia for HZ HB conduct was documented contemporaneously and entered the ICTY record (Prlić Trial Judgment Vol. 1 §§390-422 on Tuđman directing the HZ HB project under increasingly tight Western constraints; Vol. 2 §§600-680 on the early-1994 patron-pressure cascade).
- **The Granić-Šilajdžić channel.** Croatian Foreign Minister **Mate Granić** and BiH Foreign Minister **Haris Silajdžić** opened the diplomatic channel that produced the Washington framework. The channel ran in parallel with US shuttle diplomacy (Redman); preliminary agreement was reached late February 1994 and signed in Washington on 1 March 1994 as the Washington Agreement establishing the Federation of Bosnia and Herzegovina. Granić's role in carrying Zagreb's acceptance to Sarajevo and back is documented in Prlić Trial Judgment Vol. 1 §§390-422; corroborated by Granić's own memoir (*Vanjski poslovi: Iza kulisa politike*, 2005) and Silajdžić's contemporaneous public statements.
- **Tuđman Presidential Transcripts.** The transcripts admitted in evidence at Prlić IT-04-74 (Trial Judgment Vol. 1 §§357-422), Kordić IT-95-14/2-T (§§491-510), and Blaškić IT-95-14-T (§§99-120) record Tuđman's deliberations in the January-February 1994 window: the recognition that the HZ HB project could not sustain Western sanctions; the explicit directive to Boban to stand down HVO operations; the framing of Washington as Croatian-state-interest-aligned rather than as JCE retreat. Tuđman's directive to Boban — captured in transcripts from late February 1994 — was unambiguous: HVO operations against ARBiH were to cease; Boban was to coordinate with the Washington framework.

The **Mate Boban resignation** followed shortly after: Boban was replaced as HZ HB Presidency president by **Krešimir Zubak** in early March 1994 under sustained Zagreb pressure, marking the institutional transition that allowed Washington implementation to proceed. Prlić Trial Judgment Vol. 1 §§556-590 documents the HR HB transition (proclaimed 28 August 1993) and the leadership reshuffle of February-March 1994. BB Vol. II pp. 514-520 corroborates the operational chronology: HVO operations against ARBiH wound down through March-April 1994 as the Federation military integration began.

The **historical HRHB Presidency-level response to Zagreb's ceasefire directive was acknowledgment**. Boban — and after the resignation, Zubak — accepted Tuđman's order. The HVO command (Praljak, Petković) executed the operational stand-down. Per the existing AWWV authoring (`zagreb_orders_hrhb_ceasefire` in `data/scenarios/events/war_1994.json`): the historical default is `acknowledge_pressure`. This describes the documented institutional posture — accept the patron's directive, signal Washington-track commitment, accept the patron-confidence baseline shift.

**Citations:**
- Washington Agreement text (1 March 1994) — establishing the Federation of Bosnia and Herzegovina.
- ICTY *Prlić et al.* IT-04-74-T Trial Judgment (29 May 2013) Vol. 1 §§357-422, 556-590; Vol. 2 §§600-680; Appeals Judgment (29 November 2017) §§601-650.
- ICTY *Kordić* IT-95-14/2-T Trial Judgment (26 February 2001) §§491-510.
- ICTY *Blaškić* IT-95-14-T Trial Judgment (3 March 2000) §§99-120.
- Tuđman Presidential Transcripts (admitted at Prlić, Kordić, Blaškić).
- Mate Granić, *Vanjski poslovi: Iza kulisa politike* (Zagreb: Algoritam, 2005) on the Granić-Šilajdžić channel.
- US State Department record / Christopher / Redman shuttle diplomacy (corroborated participant tier).
- Balkan Battlegrounds Vol. II pp. 506-520 (operational chronology of the early-1994 wind-down).

## 2. Defensible Historical / Default Option

- **Label:** `acknowledge_pressure` — Accept Tuđman's directive; signal Washington-track commitment; stand down HVO operations against ARBiH; absorb the patron-confidence baseline as Croatian-state-interest-aligned framing.
- **Rationale:** This describes the **historically-documented Presidency-level posture** of the HZ HB leadership (Boban, then Zubak) in February-March 1994. The Washington Agreement was signed 1 March 1994 and HVO-ARBiH operations wound down through Q1 1994. Per the existing AWWV authoring in `war_1994.json`: `acknowledge_pressure` is already the structured historical-default option. The Foundational packet historical-default labeling protocol applies: an actor-specific documented choice with ICTY-corroborated record is a `Historical response`.
- **Citation:** Washington Agreement (1 March 1994); Prlić Trial Judgment Vol. 1 §§390-422, 556-590; Vol. 2 §§600-680; Tuđman Presidential Transcripts; Granić memoir (2005); BB Vol. II pp. 506-520.

**Sensitive-history boundary note:** This row is **not Ring 1/2**. The option set is patron-pressure / strategic-political; no atrocity authorization in any option. The Croat-Bosniak war chain (Ring 1/2) is upstream of this row (H1, H2, H5, H6, H8); H7 is a wind-down decision that can foreclose continuation of the war chain via H9 / X5. No §3.6 continuation-of-act concern applies — both options foreclose or preserve patron-pressure consequences, not sensitive acts.

## 3. Proposed Counterfactual Options

The option set is **two options**: `acknowledge_pressure` (historical default) and `resist_patron` (counterfactual). This matches the v1.3 packet §4.3 H7 row labeling and the existing AWWV authoring shape (H3, H4 patron-pressure rows use the same vocabulary).

### 3.1 `resist_patron` — `Counterfactual staff path`

- **Label:** `resist_patron` — Reject Tuđman's directive; maintain HVO operations against ARBiH; signal HZ HB independence from Zagreb; absorb the patron-confidence collapse and accept the sanctions-risk trajectory.
- **Historical analogy:** Mate Boban was personally inclined toward maintaining the HZ HB project on its 1993 trajectory and was reluctant to accept the Washington framework (Prlić Trial Judgment Vol. 1 §§556-590 on the leadership reshuffle that became necessary precisely because of Boban's reluctance). The historical actor was overruled by Zagreb and resigned within weeks. Counterfactually `resist_patron` models the HZ HB Presidency maintaining Boban's preferred line — defying Tuđman, refusing the Washington framework, accepting the Croatian-state cost. The closest historical analogues are: (a) Karadžić's RS Assembly rejection of Vance-Owen (May 1993) — patron defied, sanctions absorbed; (b) the Croatian Spring 1971 precedent of intra-Croat institutional defiance of federal direction.
- **Design provenance:** `design_counterfactual` — the historical Presidency-level posture in February-March 1994 was acceptance; the resignation pattern shows defiance was the personal preference of the displaced leadership but not the institutional outcome. The branch counterfactually models Boban retaining the Presidency and the institution sustaining the defiance.
- **Sensitive-history check:** Confirmed — `resist_patron` authorizes no atrocity. It is a patron-defiance branch with strategic-political consequences. The Croat-Bosniak war chain may continue mechanically (engine-driven via H1 / H2 / H5 flags remaining active), but H7 does not author specific sensitive acts; per packet §3.6 the continuation is consequence-driven by existing systems, not author-extended by this option.
- **Cost floor (Phase D required):** `patron_confidence: -25` (Zagreb withdraws backing — Croatian-state-interest framing flips; HV secondments, fuel, ammunition pipelines attenuate per Prlić Vol. 2 §§220-260 on HV-HVO logistics dependency); `equipment_quality_modifier` reduction reflecting HV pipeline withdrawal; `international_standing: -15` (sanctions trajectory confirmed); `alliance_lock` with RBiH at floor (Washington framework foreclosed).

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` |
| --- | --- | --- | --- |
| `acknowledge_pressure` | (existing authoring retained) `cost_ledger_annotation` recording the Washington-track acceptance posture | `hrhb_zagreb_ceasefire_response: 'acknowledge_pressure'`; `washington_track_open: true`; `hvo_arbih_war_winddown: true` | `patron_confidence: +8` (per existing authoring); `negotiating_leverage: -5` (per existing authoring); `international_standing: +5` (Washington commitment signal) |
| `resist_patron` | `patron_pressure HRHB: +25`; `equipment_quality_modifier HRHB: -0.10` (HV pipeline attenuation per Prlić Vol. 2); `cost_ledger_annotation` recording the patron-defiance posture | `hrhb_zagreb_ceasefire_response: 'resist_patron'`; `washington_track_open: false`; `hvo_arbih_war_winddown: false` | `patron_confidence: -25`; `international_standing: -15`; `alliance_lock RBiH-HRHB: floor`; `internal_cohesion: -5` (HVO Defence Ministry split between Boban and HV-pipeline-dependent commanders) |

**§3.6 hard rule (v1.3 packet):** Neither option carries `effects` that extend, continue, or scale a sensitive-history act. `resist_patron` sustains the conditions under which the Croat-Bosniak war chain continues mechanically, but the act of continuation is engine-driven (combat, paramilitary sweep, displacement) — not author-extended by this row. The patron-pressure consequence routing is per existing `patron_pressure` effect-kind protocol.

**`enables_events_runtime`** (NEW, Phase D):
- `acknowledge_pressure`: opens H9 `washington_agreement_acceptance_1994`; opens H10 follow-on (federation military integration); opens `csq_federation_early_1994` per existing `future_consequences`; opens X5 composite Washington track.
- `resist_patron`: opens no new events. Sustains the H1 / H2 / H5 cascade mechanically.

**`closes_events_runtime`** (NEW, Phase D):
- `acknowledge_pressure`: closes `csq_hvo_central_bosnia_offensive_1993_continuation` (counterfactual foreclosure of the 1994 war-chain continuation; mirrors the H6 `cooperate` precedent).
- `resist_patron`: closes H9 `washington_agreement_acceptance_1994` (Washington track foreclosed); closes H10 (federation integration foreclosed); closes `csq_federation_early_1994`; closes X5 composite Washington gate.

**`branch_tag`** (per packet §2.2 vocabulary; new `hrhb_zagreb_ceasefire_1994` family or reuse `hrhb_alliance` family — recommend reuse `hrhb_alliance` for vocabulary economy):
- `acknowledge_pressure` → `hrhb_alliance_washington_accept`
- `resist_patron` → `hrhb_alliance_patron_defy`

## 5. Sensitive-History Ring And Source Note

**Ring:** none. The option set is patron-pressure / strategic-political. No sensitive-history surface. The Sensitive-History Gate §3 player-authorized war-crime surface is not engaged.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> The 1 March 1994 Washington Agreement was negotiated via the Granić-Šilajdžić channel under sustained US/EU pressure on Zagreb. Tuđman directed Boban to stand down HVO operations against ARBiH; the directive is recorded in the Presidential Transcripts admitted at ICTY Prlić et al. IT-04-74 (Trial Vol. 1 §§390-422). Boban resigned within weeks under Zagreb pressure; the historical HRHB institutional response was acceptance. BB Vol. II pp. 506-520 documents the operational wind-down. (≤2 sentences after Phase D compression.)

**Source tier:** `agreement_text` + `icty_icj_un` (Tuđman Transcripts) corroborated by `corroborated_participant` (Granić memoir) and `balkan_battlegrounds`.

## 6. Downstream Opens / Closes (Per §3.3)

H7 is itself opened by the Croat-Bosniak war chain reaching the early-1994 patron-pressure threshold. Trigger predicates depend on H1 / H2 outcomes; the existing AWWV authoring uses turn 95-103 (early 1994 window) plus the Croat-Bosniak war chain being active.

- **Opens (eligibility) — `acknowledge_pressure`:**
  - H9 `washington_agreement_acceptance_1994` (already in catalog).
  - H10 federation military integration follow-on.
  - X5 composite Washington track.
  - `csq_federation_early_1994` (already in catalog).
- **Opens (eligibility) — `resist_patron`:**
  - No direct opens. Sustains H5 / H6 cascade mechanically.
- **Closes (eligibility) — `acknowledge_pressure`:**
  - `csq_hvo_central_bosnia_offensive_1993_continuation` (if and when authored as Counterfactual staff path).
- **Closes (eligibility) — `resist_patron`:**
  - H9 `washington_agreement_acceptance_1994`.
  - H10 follow-on.
  - X5 composite.
  - `csq_federation_early_1994`.
- **Branch-tag vocabulary** (additions to `event_families.ts`): `hrhb_alliance_washington_accept` / `hrhb_alliance_patron_defy` tags under existing `hrhb_alliance` family.

## 7. Trigger Recommendation

- **Existing trigger preserved** (per `data/scenarios/events/war_1994.json` authoring): turn 95-103, phase `war`, `once: true`, `bot_response_logic: 'strategic_weighted'` (Phase D should change to `'historical'` to match Foundational packet protocol).
- **Add `historical_default_response_id: 'acknowledge_pressure'`** in Phase D to make the historical default explicit per Foundational packet labeling.
- **Phase D condition predicate addition (recommended):** `flag_equals hrhb_political_goal: 'croat_republic'` AND (`flag_equals hrhb_camp_exposure_posture: 'deny'` OR `flag_equals hrhb_camp_exposure_posture: 'obstruct'`) — gates H7 firing on the Croat-Bosniak war state being active. If H6 `cooperate` fires earlier (per H6 worksheet §6), H7 may be redundant or re-tunable; defer to Phase D Game Designer review.

## 8. Modal Source Notes Draft

> Washington Agreement signed 1 March 1994 via Granić-Šilajdžić channel under US/EU pressure on Zagreb. Tuđman directed Boban to stand down HVO operations against ARBiH per Tuđman Transcripts admitted at ICTY Prlić et al. IT-04-74 (Trial Vol. 1 §§390-422). Historical HRHB response was acceptance; Boban resigned, replaced by Zubak. BB Vol. II pp. 506-520.

## 9. Open Questions Deferred To Canon Compliance Review

1. **Interaction with H6 `cooperate`.** If H6 `cooperate` fires (turn 70-90 per H6 worksheet), H7 may be redundant. Recommendation: H7's trigger remains authoritative but adds `unless flag_equals hrhb_camp_exposure_posture: 'cooperate'` to suppress the redundant fire if the Washington track has already opened via H6. Defer to Phase D Game Designer.
2. **`csq_hvo_central_bosnia_offensive_1993_continuation` authoring.** This counterfactual continuation row is referenced by both H6 `cooperate.closes_events_runtime` and H7 `acknowledge_pressure.closes_events_runtime` but does not yet exist in the catalog. Phase D scope: author as `Counterfactual staff path` in `consequences.json` before wiring H6 / H7 runtime arrays. Single-row authoring keeps single ownership.
3. **Cost floor verification for `resist_patron`.** Per v1.3 packet §3.6 (no calendar-only foreclosure) and R7 / B6 / H1 precedent: `patron_confidence: -25` + `equipment_quality_modifier: -0.10` + `alliance_lock: floor` is recommended. Phase D should verify the magnitude does not unintentionally lock out X8 / Dayton-track recovery if a late-war Holbrooke-mediated Croatian re-engagement is needed. Defer to Game Designer.
4. **`bot_response_logic` change.** Existing authoring uses `'strategic_weighted'`; Foundational packet protocol prescribes `'historical'` for rows with `historical_default_response_id`. Phase D should change to `'historical'`. Defer to Canon Compliance Reviewer.
5. **Branch-tag family economy.** Recommended reuse of `hrhb_alliance` family rather than creating `hrhb_zagreb_ceasefire_1994` family. H3 (Vance-Owen pressure) and H4 (Boban / Zagreb restraint VOPP) also belong in `hrhb_alliance`; family economy reduces branch-tag explosion. Defer to Phase B vocabulary author.
