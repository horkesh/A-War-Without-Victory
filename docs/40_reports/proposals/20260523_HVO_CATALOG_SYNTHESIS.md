# HVO Operation Catalog — Engine-Implementable Spec (1994-1995)

**Date:** 2026-05-23
**Author:** synthesis pass
**Inputs:**
- `20260523_RESEARCH_HVO_1994_OPS.md` (1994 ops scope)
- `20260523_RESEARCH_HVO_MISTRAL_2_OOB.md` (Mistral 2 + Summer 95 OOB)
- `20260523_RESEARCH_HVO_SOUTHERN_MOVE_AND_ENCLAVES.md` (Southern Move + Una + enclaves)
- `20260523_HV_EXPEDITIONARY_GHOST_DESIGN.md` (HV phantoms — already shipped through n2006)

**Purpose:** Single proposal that consolidates all 3 HVO research dispatches into a concrete engine-implementable catalog. Parallel to `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (Sana 95). This is the consumer that the HV phantom packet (deef41e2/ea8d17e8/910f5e27) lacked in n2004-n2006.

## 0. Executive summary

The HVO catalog has **5 ops** worth authoring, all in fall 1995. The 9.5-month operational gap from Cincar (Nov 1994) → Summer 95 (July 1995) is historically authentic and should remain empty.

| Op | Window | Launcher | Axes | Notes |
|---|---|---|---|---|
| `cincar_94` | 1–3 Nov 1994 (t135) | `hvo_tomislavgrad` | Kupres | **Already in catalog** — no action |
| `ljeto_95` (Summer '95) | 25–29 July 1995 (t152) | `hvo_tomislavgrad` | Grahovo + Glamoč | NEW — supports Mistral 2 staging |
| `mistral_2_95` | 8–15 Sept 1995 (t175) | `hvo_tomislavgrad` | OG North → Jajce + Šipovo; OG South pin; OG West → Drvar (HV-pure) | **Exists in catalog** (Wave 28) — verify HV phantom integration |
| `juzni_potez_95` (Southern Move) | 8–11 Oct 1995 (t182) | `hvo_tomislavgrad` | Mrkonjić Grad + Manjača + Bočac HPP | NEW |
| `bobaska_lasvanska_94` (optional) | 1994 ongoing | `hvo_central_bosnia` | Defensive holding (Lašva Valley consolidation) | OPTIONAL — non-offensive, no OSID flips |

**NOT to author:** Una (18-19 Sept 1995, HV-only failure — engine already has the E-B2 negative-control predicate). Central Bosnia enclave breakouts (historically defensive only). Posavina counterstrike 1994 (sourcing too thin). "Tigar 94 / Tvrtko" (doesn't exist in primary sources).

## 1. Catalog-implementation constraints

**Critical engineering rules** from the research dispatches:

1. **All HVO fall-1995 launches MUST use `hvo_tomislavgrad`** as the launcher corps. Lesson from Wave 19A/28: `hvo_main_staff` owns Guards Brigades but holds zero front sectors, so `reconcileOperationRoster` drains the roster. Other HVO corps (hvo_southeast_herzegovina, hvo_central_bosnia, hvo_northwest_bosnia, hvo_southwest_herzegovina) have either wrong geography or are hollowed-out by Guards detachment.

2. **Engine corps ID is `hvo_northwest_bosnia`** (not `hvo_north_bosnia` — verify any references).

3. **Jajce town OSID is `op:jajce:jajce_3`** (not `_2`). Other Jajce settlements use the canonical map.

4. **All 8 HV 1995 phantom IDs** (shipped in commits deef41e2-910f5e27) are pre-baked with corps assignments:
   - `hv_4th_guards_brigade_1995` → `hvo_southeast_herzegovina`
   - `hv_126th_hgr_1995` → `hvo_southeast_herzegovina`
   - `hv_141st_reserve_brigade_1995` → `hvo_southeast_herzegovina`
   - `hv_7th_guards_brigade_1995` → `hvo_central_bosnia`
   - `hv_1st_guards_brigade_1995` → `hvo_central_bosnia`
   - `hv_7th_hgr_1995` → `hvo_tomislavgrad`
   - `hv_112th_infantry_1995` → `hvo_tomislavgrad`
   - `hv_134th_hgr_1995` → `hvo_tomislavgrad`
   - **Implication:** the launcher being `hvo_tomislavgrad` means catalog ops must pull HV phantoms from OTHER corps via `attached_brigades` / cross-corps loan mechanism — OR the phantoms need re-homing to `hvo_tomislavgrad` at spawn.

5. **HVO 1st / 2nd / 3rd Guards Brigades are triple-booked** across Summer '95 → Mistral 2 → Southern Move. They do NOT redeploy home between operations. Catalog ops must allow Guards Brigades to chain across all three operations without disengage/reengage cycles.

6. **Cincar-spent brigades** `hrhb_kralj_petar_kresimir_iv` + `hrhb_kralj_tomislav` are `status='inactive'` at t175 (per n1987 forensics). Mistral 2 catalog must NOT require them — use Guards Brigades instead. (The shipped `mistral_2_95` in Wave 28 already does this.)

7. **`hvo_southwest_herzegovina` is hollowed-out** in fall 1995 because its Guards Brigades are attached to Gotovina's task force. Don't author offensive ops launched from this corps in the Aug-Oct window.

8. **Mrkonjić Grad belongs to Southern Move**, NOT Mistral 2. OG South in Mistral 2 was a flanking pin only.

9. **Donji Vakuf belongs to ARBiH 7th Corps catalog** (eastern approach 13 Sept), NOT HVO/HV Jajce axis. Even though both fell on the same day.

## 2. Op-by-op spec

### 2.1 Operation Ljeto (Summer '95) — 25–29 July 1995, turn 152

**Status:** NEW (not in catalog).
**Launcher corps:** `hvo_tomislavgrad`
**Type:** `sector_attack` with 2 axes
**Trigger gate:** turn ≥ 150 AND Split Agreement flag set (`split_agreement_signed` event)
**Historical context:** Pre-Storm shaping operation. Lt Gen Ante Gotovina commanded. HV/HVO ~25k total in operation; main assault ~8,500. Captured Bosansko Grahovo + Glamoč, cutting Knin-Drvar lateral supply for RSK.

#### Axis A — Bosansko Grahovo

- **Staging OSID:** `op:livno:livno_2`
- **Brigades:** HVO Guards Brigades (1st/2nd/3rd HVO Guards) + HV phantoms (hv_4th_guards_brigade_1995, hv_126th_hgr_1995) attached via cross-corps loan
- **Objective chain:** OSIDs along Livanjsko polje → Grahovo, ending at `op:bosansko_grahovo:bosansko_grahovo_2`
- **Predicate:** `isPreStormWesternTheater(state)` returns true (set via the existing Storm theater flag system)

#### Axis B — Glamoč

- **Staging OSID:** `op:livno:livno_2`
- **Brigades:** HV 4th Guards + HVO 1st Guards Brigade (shared with Axis A — overlapping force commitments per historical record)
- **Objective chain:** OSIDs Livno → Glamoč, ending at `op:glamoc:glamoc_2`

**Outcome territory:** ~1,600 km² captured. Sets up Storm window for ARBiH 5th Corps + Mistral 2 staging.

### 2.2 Operation Mistral 2 — 8–15 September 1995, turn 175

**Status:** EXISTS in catalog as `mistral_2_95` (Wave 28 update). Verify integration with HV phantoms.

**Launcher corps:** `hvo_tomislavgrad`
**Type:** `general_offensive` with 4 axes
**Trigger gate:** turn ≥ 175 AND Ljeto 95 completed (or its OSID gains held) AND NATO Deliberate Force flag set
**Historical context:** Joint HV/HVO offensive under Gotovina. 4 OGs (North main / South pin / West Drvar / formal reserves). HVO Guards Brigades embedded as line units in HV OG North.

#### Axis A — OG North → Jajce

- **Staging OSID:** `op:donji_vakuf:donji_vakuf_2` (after ARBiH 7th captures Donji Vakuf 13 Sept) or staging via `op:travnik:turbe_2`
- **Brigades:** HV 4th Guards Brigade + HV 7th Guards Brigade + HVO 1st Guards + HVO 2nd Guards
- **Objective chain:** `op:donji_vakuf:donji_vakuf_2` → `op:jajce:vinac_2` → `op:jajce:kruscica` → `op:jajce:jajce_3` (TOWN) → `op:jajce:carevo_polje_2`
- **Fall date:** Jajce 13 Sept

#### Axis B — OG North → Šipovo

- **Staging OSID:** `op:livno:livno_2` or `op:tomislavgrad:tomislavgrad_2`
- **Brigades:** HV 1st Croatian Guards Brigade (Tigrovi) + HVO 3rd Guards Brigade
- **Objective chain:** Livno → Šipovo, ending at `op:sipovo:sipovo_2` + `op:sipovo:pribeljci_2`
- **Fall date:** Šipovo 10 Sept

#### Axis C — OG South → Mrkonjić approach (pin only)

- **Staging OSID:** `op:tomislavgrad:tomislavgrad_2`
- **Brigades:** HV 126th HGR + HV 141st Reserve Brigade (no HVO native)
- **Objective chain:** approach to Mrkonjić Grad area — DOES NOT capture Mrkonjić (that's Southern Move). This axis pins VRS forces only.
- **Fall date:** N/A — pin

#### Axis D — OG West → Drvar (HV-pure)

- **Staging OSID:** `op:livno:livno_2`
- **Brigades:** HV 7th HGR + HV 112th Infantry + HV 134th HGR (NO HVO brigades — this axis is HV-pure)
- **Objective chain:** Livno → Drvar, ending at `op:drvar:drvar_2`
- **Fall date:** Drvar ~15 Sept

**Outcome:** ~2,500 km² captured. HV/HVO 74 KIA / 226 WIA per Wikipedia. VRS losses "likely far greater".

### 2.3 Operation Južni Potez (Southern Move) — 8–11 October 1995, turn 182

**Status:** NEW (not in catalog).
**Launcher corps:** `hvo_tomislavgrad`
**Type:** `sector_attack` with 2 axes
**Trigger gate:** turn ≥ 182 AND Mistral 2 completed AND ARBiH 5th Corps Ključ-crisis flag set (placeholder predicate — `state.military.event_flags?.arbih_5th_kljuc_crisis === true`)
**Historical context:** Final offensive. Relieves 5th Corps at Ključ (formal ARBiH request for HV ground rescue — only such request of the war). Halted 11 Oct one day before nationwide ceasefire 12 Oct.

#### Axis A — Mrkonjić Grad main effort

- **Staging OSID:** `op:sipovo:sipovo_2` (post-Mistral 2 staging)
- **Brigades:** HV 4th Guards Brigade (decisive role) + HVO 1st Guards Brigade
- **Objective chain:** Šipovo → Mrkonjić Grad, ending at `op:mrkonjic_grad:mrkonjic_grad_2`
- **Fall date:** Mrkonjić Grad 10 Oct (4th GdB breakthrough)

#### Axis B — Manjača + Bočac

- **Staging OSID:** `op:mrkonjic_grad:mrkonjic_grad_2` (post-Axis A)
- **Brigades:** HV 7th Guards + HVO 2nd Guards + HVO 3rd Guards
- **Objective chain:** Mrkonjić → Bočac HPP → Manjača crest. Note: Manjača is a *terrain feature*, not a settlement; the catalog should encode the OSID closest to the Manjača approach, not the crest itself.
- **Fall date:** Bočac HPP 11 Oct; Manjača crest 11 Oct (25 km from Banja Luka — halted by 12 Oct ceasefire)

**Outcome:** VRS 480 dead/missing (Bosnian Serb sources). 181 bodies recovered from Mrkonjić Grad mass grave (post-capture atrocity, declined by ICTY).

### 2.4 Optional — Bobaska/Lašvanska holding op 1994

**Status:** OPTIONAL. Non-offensive, no OSID flips. Defensive consolidation of HVO Central Bosnia enclave.
**Launcher corps:** `hvo_central_bosnia`
**Type:** `strategic_defense`
**Trigger gate:** turn ≥ 102 (post-Washington) AND `hvo_central_bosnia` has remaining brigades
**Function:** Holds Central Bosnia OZ engaged in defensive posture; prevents bot from auto-disbanding the corps. Engages Vitez / Busovača / Kiseljak garrison.

Not load-bearing for calibration; can defer.

## 3. Cross-cutting design notes

### 3.1 HV phantom integration

The 8 HV 1995 phantoms shipped (deef41e2 / ea8d17e8 / 910f5e27) currently spawn into their assigned corps and sit idle (n2006 verified). The catalog ops must explicitly include them in `participating_brigades` or `attached_brigades`. Three of the 8 (`hv_7th_hgr_1995` / `hv_112th_infantry_1995` / `hv_134th_hgr_1995`) are already assigned to `hvo_tomislavgrad` — they fit the launcher contract naturally.

The other 5 are assigned to `hvo_southeast_herzegovina` (3) and `hvo_central_bosnia` (2). For `hvo_tomislavgrad`-launched ops to pull them in, the catalog must use the existing cross-corps loan mechanism (`loaned_brigades?: Array<{brigade_id, source_sector_id, arrived}>` field on `CorpsOperation`).

### 3.2 OG North brigades chain across all 3 operations

The 3 HVO Guards Brigades (1st/2nd/3rd) participate in Summer 95 → Mistral 2 → Southern Move without redeploying home. The catalog ops must:
- Author Summer 95 such that on success the Guards Brigades remain in-theater (don't return to home_osid)
- Mistral 2 staging predicates assume Guards Brigades already in Western Bosnia theater (Livno / Tomislavgrad)
- Southern Move staging assumes Guards Brigades in post-Mistral 2 positions (Jajce / Šipovo area)

This is similar to the chained ARBiH 5th Corps ops (Sloboda → Sana → Sana follow-on) per `operation_opportunity_catalog_5th_corps.ts`.

### 3.3 Negative-control: Una NOT authored

Per HVO research §2.8 and the engine's E-B2 HV Una negative-control predicate (already in `sector_offensive.ts`):
- The Una failure pattern is captured by the engine's runtime check: if an op is >80% HV-tagged AND has no HVO-native HRHB brigade in the corps' sectors, force_ratio × 0.65 (rejects launch).
- Authoring Una as a catalog op would require it to FAIL deterministically (~50 KIA in 48 hours), which doesn't fit the catalog's success-path semantics.
- **Decision:** do NOT author Una. Engine predicate handles it.

### 3.4 Calibration expectation

Adding Ljeto 95 + Southern Move + verifying Mistral 2 HV phantom integration should close most of the n2003 HRHB -21 OSID gap. Projected:
- Summer 95 captures ~5-10 OSIDs (Grahovo + Glamoč settlement chain)
- Mistral 2 captures ~15-20 OSIDs (Jajce + Šipovo + Drvar settlements)
- Southern Move captures ~5-8 OSIDs (Mrkonjić Grad + Bočac approaches)

Total potential: ~25-38 OSIDs to HRHB. The painted target is 107; n2003 sim is 86 (delta -21). With the catalog wins, HRHB sim could reach 100-115, closing the gap and possibly slightly overshooting.

Net match_ratio projection: 79.21% → **83-85%** if catalog ops fire cleanly.

## 4. Sacred-rule compliance

| Rule | Compliant? | Notes |
|---|---|---|
| Canonical faction IDs only | ✅ | All ops faction HRHB; HV phantoms remain HRHB-tagged |
| No init OSID overrides | ✅ | Catalog ops flip via combat resolution, not via init data |
| No `avoided_osids_by_faction` | ✅ | None used |
| Determinism | ✅ | Sorted brigade iteration, fixed OSID chains, turn-gated triggers |
| Ops-only attacks | ✅ | All flips flow through CorpsOperation |
| `hvo_main_staff` not used as launcher | ✅ | All ops use `hvo_tomislavgrad` |
| Cincar-spent brigades not required | ✅ | All 1995 ops use Guards Brigades |

## 5. Implementation order

1. **NEW file: `src/sim/combat/operation_opportunity_catalog_hvo.ts`** (parallel to `_5th_corps.ts`). Pattern: shared OSID chains as `readonly string[]`, opportunity defs with predicates + axes, cross-corps loan declarations for HV phantoms.

2. **Wire into the opportunity registry** (find the place that aggregates corps catalogs into the bot/AI proposal pipeline).

3. **Ljeto 95** first — smallest of the three new ops, lowest risk.

4. **Verify Mistral 2** integration with HV phantoms — may require updating existing `mistral_2_95` to include HV-attached brigades.

5. **Southern Move** last — depends on Mistral 2 success state.

6. **Validation:** scenario run, compare HRHB sim count + match_ratio against n2003 baseline.

Estimated lines: ~400-600 LOC for the new catalog file + ~50 LOC for registry wiring + ~50 LOC for any Mistral 2 update.

## 6. Open questions

1. **Cross-corps loan mechanism details** — the existing `loaned_brigades` field on CorpsOperation needs to be exercised. Has the engine handled this pattern at scale before (e.g., 8 cross-corps loans into one op)?

2. **OG North vs OG West split** — should the 2 OG North axes (Jajce + Šipovo) be ONE op with multi-axis, or TWO separate ops? Probably one multi-axis op matching the historical OG structure.

3. **Mrkonjić mass-grave atrocity event** — Southern Move's capture of Mrkonjić Grad included a documented atrocity (181 bodies, mass grave). Should an associated war-crimes event fire? Out of scope for catalog itself; flag for separate event-data work.

4. **Manjača as terrain feature** — no OSID for the crest itself. Catalog must use the closest approach OSID. Need to verify against canonical map.

## 7. One-line take

The HVO catalog is small (3 new ops + 1 update + 1 optional), historically constrained (9.5-month gap is real), and now structurally enabled by the HV phantom packet from this session. Authoring it would deliver the remaining HRHB calibration gain (projected +4-6pp match_ratio).

— End of synthesis —
