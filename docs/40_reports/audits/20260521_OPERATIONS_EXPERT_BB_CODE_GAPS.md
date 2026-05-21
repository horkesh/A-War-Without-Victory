# Operations-Expert Proposal — BB Krajina-Collapse Code Gaps (Aug–Oct 1995)

**Author:** operations-expert (read-only investigation; no source edits)
**Date:** 2026-05-21
**Companion to:** `docs/40_reports/audits/20260521_BB_KRAJINA_COLLAPSE_ANCHORS.md`
**Scope:** Diagnosis + proposal-shape memo for four BB-extracted operation-coverage gaps in `src/sim/combat/operation_opportunity_catalog_*.ts`. Triggered-operations layer (`triggered_operations.ts`) inspected for legacy footprint only.
**Out of scope:** No edits to `src/sim/combat/*` (Codex parallel). No edits to `painted_control_*.json`, scenarios, FORAWWV.md.

---

## 0. Summary

| # | Gap | Orphaned OSIDs | Risk | First-deliverable without extra mechanics? |
|---|-----|----------------|------|---------------------------------------------|
| 1 | No `ljeto_95` for Glamoč/Grahovo (Jul 1995) | 11 (9 Grahovo + 2 Glamoč halapic/stekerovci_2) | **MED** | Mostly. Needs a `weekly-storm-spillover` precondition variant (no Storm rupture yet at w171). HV brigades not yet spawned at w171 → HVO-only OOB required. |
| 2 | No Donji Vakuf 1995 (ARBiH 7th Corps, 13 Sep) | 10 | **LOW** | YES. 3rd Corps OOB and Vlašić family already cover the brigades; date window slides. No new mechanic needed. |
| 3 | No explicit Jajce arm inside `mistral_2_95` | 8 | **LOW–MED** | YES if added as a third HVO axis under existing two-corps op (HVO Main Staff). HV brigades already spawn on `hvo_tomislavgrad`. Mechanic present. |
| 4 | Maestral / Juzni Potez timing conflation at Mrkonjić Grad | 6 (relocate from `mistral_2_95` → `juzni_potez_95`) | **MED** | YES at the catalog-shape level (clone Mistral 2 mechanics). Watch sequencing — opportunity layer is single-owner; cannot dual-own Mrkonjic OSIDs across two opportunities. |
| **Total orphaned** | | **35 OSIDs** (11 + 10 + 8 + 6) | | |

**Recommended order:** Gap 2 (Donji Vakuf) → Gap 3 (Jajce arm) → Gap 4 (Juzni Potez extraction) → Gap 1 (Ljeto 95). Rationale in §6.

---

## 1. Gap 1 — No `ljeto_95` opportunity for Glamoč/Bosansko Grahovo (Jul 1995)

### (a) Diagnosis (file:line)

- **No catalog entry named `ljeto_95`, `grahovo_95`, or any HV/HVO Jul-1995 opportunity.** Confirmed by grep across `operation_opportunity_catalog_*.ts`:
  - `operation_opportunity_catalog_federation_western_bosnia.ts` exports only `MISTRAL_2_95_OPPORTUNITY` (line 231) and `FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES` (line 290).
  - `operation_opportunity_catalog_central_bosnia.ts` exports `KUPRES_CINCAR_94_OPPORTUNITY` (line 353) and `VLASIC_RIDGE_95_OPPORTUNITY` (line 412). Neither covers Jul-1995 Krajina shoulder.
- **Bosansko Grahovo OSIDs (9) are completely orphaned in the active opportunity layer.** They appear ONLY in the inert legacy triggered-ops `Operation Mistral 2` definition at `triggered_operations.ts:526–529` (`op:bosansko_grahovo:crni_lug`, `bosansko_grahovo_2`, `malesevci`, `ugarci`) which is filtered out at `triggered_operations.ts:573–575`.
- **Glamoč halapic/stekerovci_2 are covered by `mistral_2_95`** (`operation_opportunity_catalog_federation_western_bosnia.ts:41-42`) which fires at turn ≥ 175 — historically TOO LATE for Ljeto 95 (w171 = 25–29 Jul; Maestral w177–178 = 8–14 Sep). If `mistral_2_95` fires on time it delivers them at the wrong week, NOT in Ljeto-95 sequencing.
- **Painted_control_oct1995.json marks Grahovo + the disputed Glamoč halapic/stekerovci_2 OSIDs as HRHB.** Per BB extractor memo §1 row 1: "HIGH confidence — HVO troops entered Glamoc the next day [29 Jul]."

### (b) Historical anchor

- **Source:** BB1 Chapter 87, pp.401–403 ("Operation Ljeto 95").
- **Date:** 25–29 July 1995. Grahovo falls 28 Jul; HVO enters Glamoč 29 Jul.
- **Forces (per BB1 p.401–403):** HV/HVO joint operation. HV elements (HV Split Corps via 4th Guards Brigade Split + 1st HGZ) plus HVO 1st Guards Brigade. Axis: Livno-area staging north over Mt. Šator into Grahovo, then east along Glamoč–Šator road into Glamoč. **Crucially: Ljeto 95 supplied the jump-off for Operation Storm (Oluja, 4 Aug 1995).**
- **Affected OSIDs (11):**
  - Bosansko Grahovo (9): `op:bosansko_grahovo:bosansko_grahovo_2`, `crni_lug`, `malesevci`, `ugarci` (the four explicitly cited in inert Mistral 2 def line 526–529) plus any others currently RS in painted_apr1995 → HRHB in oct1995 in that municipality.
  - Glamoč (2): `op:glamoc:halapic`, `op:glamoc:stekerovci_2` — currently allocated to `mistral_2_95` Drvar-Grahovo axis at lines 41–42; if Ljeto 95 is added these may need to migrate (single-owner rule).

### (c) Proposed entry shape (sketch)

Pattern after `sana_95` (file: `operation_opportunity_catalog_5th_corps.ts:290–332`) and `mistral_2_95` (lines 231–288), with key differences below.

```
LJETO_95_OPPORTUNITY = {
  opportunity_id: 'ljeto_95',
  name: 'Operation Ljeto 95',
  tier: 'T1',
  faction: 'HRHB',
  primary_corps: 'hvo_main_staff',
  secondary_corps: 'hvo_tomislavgrad',
  family: 'federation_western_bosnia',
  axes: [
    {
      axis_id: 'ljeto_grahovo',
      name: 'Grahovo Mt. Šator Axis',
      corps: 'hvo_main_staff',
      brigades: [
        'hvo_1st_guard_abb',   // HVO 1st Guards (Tomislavgrad-area, OOB present pre-w171)
        // HV brigades NOT yet available at w171 — handled via dependency below
      ],
      objectives: [ <9 Grahovo OSIDs> ],
      staging_osid: 'op:livno:livno_2',
    },
    {
      axis_id: 'ljeto_glamoc_shoulder',
      name: 'Glamoč Shoulder Axis',
      corps: 'hvo_tomislavgrad',
      brigades: [
        'hrhb_kralj_petar_kreimir_iv_brigade',
        'hrhb_kralj_tomislav_brigade',
      ],
      objectives: [ 'op:glamoc:halapic', 'op:glamoc:stekerovci_2' ],
      staging_osid: 'op:livno:misi_2',
    },
  ],
  staging_osid: 'op:livno:livno_2',
  planning_duration: 3,
  min_attack_outcome: 'repulsed',
  prerequisites: {
    date_window: 'required',         // turns 168–173 (~25–29 Jul 1995 in a 40w/52w scaling)
    political_authorization: 'required',  // washington_signed (alliance ≥ 0.50)
    corps_readiness: 'required',
    logistics: 'optional',
    staging_access: 'required',      // Livno + Kupres anchors (Kupres held since Cincar 94)
    weather_season: 'n_a',           // late-summer
    commander_confidence: 'optional',
    enemy_weakness: 'required',
    alliance_context: 'n_a',         // NO Storm-rupture gate — Ljeto PRECEDES Storm
    force_quality: 'optional',
    min_optional_axes: 1,
  },
  evaluators: { ... },               // mirror mistral_2 but date 168–173, no isWesternTheaterRuptured
  historical_exit_class: 'partial_success',
  citations: [
    'BB1 pp.401–403 — Operation Ljeto 95 (28–29 Jul 1995)',
    'docs/40_reports/audits/20260521_BB_KRAJINA_COLLAPSE_ANCHORS.md row 1',
  ],
  staff_recommendation: 'approve',
};
```

### (d) Dependencies

- **HV brigade availability (no).** `hv_integration.ts:34–35` sets `HV_PREPARATION_DELAY = 6` weeks after Washington signs. If Washington fires ~w108 (Mar 1994) the HV brigades spawn by ~w114, so by w171 they exist and `hv_4th_guards_split` (location `op:livno:livno_2`) is canonical for Grahovo axis. **Conclusion: HV brigades ARE available by w171.** Sketch above can include `hv_4th_guards_split`.
- **`isWesternTheaterRuptured` (DO NOT USE here).** Ljeto historically supplied Storm's jump-off and preceded it. Gating Ljeto on Storm-rupture creates a chicken-and-egg failure mode.
- **Kupres / Glamoč staging access.** `kupres_cincar_94` must have already delivered `op:kupres:*` to HRHB. The existing `MISTRAL_CINCAR_DEPENDENCY_ANCHORS` pattern at `operation_opportunity_catalog_federation_western_bosnia.ts:34–37` is the right precedent.
- **Painted_oct1995 anchor count.** Adding `ljeto_95` improves coverage; no scenario or anchor changes required at op layer.

### (e) Risk: **MED**

- **MED, not LOW**, because: (i) the Storm-precondition decoupling is a new pattern — every other late-war HV/HVO opportunity in `federation_western_bosnia` and `5th_corps` family REQUIRES Storm rupture as alliance_context. Authoring a *pre-Storm* HV operation is structurally novel for this catalog. (ii) Without Storm-rupture gating, the new alliance_context evaluator must lean on `washington_signed` + a tighter date window to prevent ahistorical early firing.
- **LOW on anchor-grade payoff:** Delivers 11 anchor-grade OSIDs (Grahovo + Glamoč halapic/stekerovci_2) as HRHB-painted Oct 1995 directly. Does NOT require any joint-ops mechanic beyond what already exists.

---

## 2. Gap 2 — No Donji Vakuf 1995 ARBiH 7th Corps operation (13 Sep)

### (a) Diagnosis (file:line)

- **No catalog entry for ARBiH 7th Corps Donji Vakuf push.** Confirmed by grep:
  - `vlasic_ridge_95` (`operation_opportunity_catalog_central_bosnia.ts:412`) covers Travnik ridge and Skender Vakuf shoulder — NOT Donji Vakuf town.
  - `vlasic_ridge_95.variants[1] = bugojno_support` (lines 462–466) routes to `BUGOJNO_SUPPORT_AXES` (line 134) which includes `BUGOJNO_SUPPORT_OBJECTIVES` (line 42): `op:donji_vakuf:komar_2`, `op:donji_vakuf:prusac_2`, `op:donji_vakuf:donji_vakuf_2`. **THIS IS THE ONLY current coverage** — and it's only 3 of the 10 BB-orphaned OSIDs.
  - `vlasic_ridge_95.dateWindowVlasic` (lines 193–197): turns 152–166 ("spring 1995"). Donji Vakuf historically fell w178 (13 Sep 1995). **The variant cannot fire in the correct window.**
- **Painted_oct1995 marks all 10 OSIDs as RBiH.** Per BB extractor memo §1 row 5: HIGH confidence — "give up Donji Vakuf … 13 September".
- **Orphaned OSIDs (10):** `op:donji_vakuf:donji_vakuf_2`, `babin_potok_2`, `jemanlici`, `komar_2`, `korenici`, `kutanja`, `oborci_2`, `pribraca_2`, `prusac_2`, `torlakovac_2`. (3 of these — `komar_2`, `prusac_2`, `donji_vakuf_2` — sit inside the dead variant; 7 are uncovered everywhere.)

### (b) Historical anchor

- **Source:** BB1 p.419. "General Zec at last had to give up Donji Vakuf and swing his right flank back toward Jajce on 13 September to avoid envelopment."
- **Date:** 10–13 September 1995 (10 Sep = Komar offensive; 13 Sep = town falls).
- **Forces (per BB1 p.419 + extractor memo row 5):** ARBiH 7th Corps under Brigadier Mehmed Alagić. Spearhead: 77th Division (per extractor). Supporting brigades: 17th Krajina, 707th Mountain, 727th Slavna, 705th Slavna Mountain, 706th Mountain (all already in `vlasic_ridge_95` brigade rosters at lines 92–117).
- **Axis:** Bugojno → Komar pass → Donji Vakuf. Staging at `op:bugojno:gracanica` (already used as variant staging at `central_bosnia.ts:466`).

### (c) Proposed entry shape (sketch)

Mirror `vlasic_ridge_95` (central_bosnia.ts:412) but with September window and Donji Vakuf-focused objectives. New top-level T1 opportunity, NOT a variant — the timing window difference (spring vs September) and objective set difference make it a distinct opportunity-rights claim.

```
DONJI_VAKUF_95_OPPORTUNITY = {
  opportunity_id: 'donji_vakuf_95',
  name: 'Operation Donji Vakuf 95 (7th Corps Komar Push)',
  tier: 'T1',
  faction: 'RBiH',
  primary_corps: 'arbih_7th_corps',     // verify OOB has this corps — see Dependencies
  family: 'central_bosnia_vlasic',
  axes: [
    {
      axis_id: 'donji_vakuf_komar',
      name: 'Komar Pass → Donji Vakuf Axis',
      corps: 'arbih_7th_corps',
      brigades: [
        'arbih_77th_division_spearhead',  // verify; or use 17th_krajina + 707th_mountain
        'arbih_707th_mountain',
        'arbih_727th_slavna',
        'arbih_705th_slavna_mountain',
        'arbih_706th_mountain',
      ],
      objectives: [
        'op:donji_vakuf:prusac_2',         // approach
        'op:donji_vakuf:komar_2',
        'op:donji_vakuf:torlakovac_2',
        'op:donji_vakuf:pribraca_2',
        'op:donji_vakuf:babin_potok_2',
        'op:donji_vakuf:jemanlici',
        'op:donji_vakuf:korenici',
        'op:donji_vakuf:kutanja',
        'op:donji_vakuf:oborci_2',
        'op:donji_vakuf:donji_vakuf_2',    // town centre (last in march sequence)
      ],
      staging_osid: 'op:bugojno:gracanica',
    },
  ],
  staging_osid: 'op:bugojno:gracanica',
  planning_duration: 4,
  min_attack_outcome: 'repulsed',
  prerequisites: {
    date_window: 'required',         // turns 177–180 (~10–13 Sep 1995)
    political_authorization: 'n_a',
    corps_readiness: 'required',
    logistics: 'optional',
    staging_access: 'required',
    weather_season: 'n_a',
    commander_confidence: 'optional',
    enemy_weakness: 'required',
    alliance_context: 'required',    // isWesternTheaterRuptured — historical chain
    force_quality: 'optional',
    min_optional_axes: 0,
  },
  evaluators: { ... },               // alliance_context = isWesternTheaterRuptured (Storm at w172 OK)
  historical_exit_class: 'partial_success',
  citations: [
    'BB1 p.419 — Zec gives up Donji Vakuf on 13 September',
    'docs/40_reports/audits/20260521_BB_KRAJINA_COLLAPSE_ANCHORS.md row 5',
  ],
  staff_recommendation: 'approve',
};
```

**Variant follow-up:** the existing `vlasic_ridge_95.variants[1] = bugojno_support` should probably be retired or rescoped to avoid dual-ownership of `komar_2`/`prusac_2`/`donji_vakuf_2`. Single-owner enforcement is the pattern at `triggered_operations.ts:570–575`.

### (d) Dependencies

- **`arbih_7th_corps` corps_command presence.** Verify the OOB instantiates `arbih_7th_corps` as a corps_command before w177. If not, this is blocked. (Brigades already exist per `vlasic_ridge_95` axes — they're 7th Corps brigades.)
- **`isWesternTheaterRuptured`** — historical chain: Storm (w172) → Maestral (w177) → Donji Vakuf falls (w178). Gating on Storm rupture is correct.
- **No joint-ops mechanic required.** Pure ARBiH 7th Corps operation.
- **No HV brigade dependency.** All-ARBiH OOB.

### (e) Risk: **LOW**

- Cleanest of the four gaps. Single corps, single faction, single axis, existing brigades, existing staging anchor, well-bounded date window, Storm-rupture gate already in the canonical pattern.
- **Anchor payoff: 10 OSIDs delivered directly.** No additional mechanics needed.
- **Caveat:** Single-owner cleanup of the `bugojno_support` variant in `vlasic_ridge_95` should be paired to avoid the engine picking up the wrong opportunity for those 3 shared OSIDs (the variant fires in the spring window but the OSIDs may have already flipped; or the variant fires AT spring date and ahistorically over-commits 3rd Corps).

---

## 3. Gap 3 — No explicit Jajce arm in `mistral_2_95`

### (a) Diagnosis (file:line)

- **`mistral_2_95` axes do NOT contain Jajce OSIDs.** Confirmed by direct file read:
  - `MISTRAL_DRVAR_GRAHOVO_OBJECTIVES` (lines 39–49): Glamoč (2) + Drvar (3) + Grahovo (4). No Jajce.
  - `MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES` (lines 51–63): Sipovo (5) + Mrkonjic (6). No Jajce.
  - `MISTRAL_TARGETS = [...MISTRAL_DRVAR_GRAHOVO_OBJECTIVES, ...MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES]` (lines 65–68). No Jajce.
- **Inert legacy `triggered_operations.ts:512-556` Mistral 2 definition** also omits Jajce — both `axes[0]` (mistral_drvar at lines 514–532) and `axes[1]` (mistral_sipovo at lines 534–555) target only Glamoč/Drvar/Grahovo/Sipovo/Mrkonjic.
- **Painted_oct1995 marks Jajce as HRHB except `grdovo` which is RBiH.** Per BB extractor memo §1 row 3: HIGH confidence — "On 13 September, Jajce — the jewel of the operation — was restored to Croat hands" (BB1 p.418). 2nd HVO Guards Brigade.
- **Orphaned OSIDs (8):** `op:jajce:jajce_3`, `bravnice`, `jezero_2`, `lupnica`, `prisoje`, `vinac_2`, `barevo_2` (7 HRHB-flip) + `op:jajce:grdovo` (RBiH-flip — 7th Corps eastern flank, NOT HVO).

### (c) Historical anchor

- **Source:** BB1 p.418. "On 13 September, Jajce — the jewel of the operation — was restored to Croat hands, avenging its loss to the VRS in 1992."
- **Date:** 13 September 1995 (Maestral phase 2).
- **Forces (per BB1 p.418):** 2nd HVO Guards Brigade as spearhead. Convergent from west (1st HGZ via Šipovo) and south. Maestral OG attribution.
- **Axis:** Approach via Šipovo (already HRHB by 12 Sep w178) east-then-north into Jajce salient (Vrbas valley). The eastern-flank `grdovo` flip to RBiH was 7th Corps Vlašić-ridge touchpoint — distinct from the HVO Jajce axis.

### (c) Proposed entry shape (sketch)

**Add as a third axis under existing `mistral_2_95`** rather than a new opportunity. Rationale: same historical operation (Maestral), same primary corps (HVO Main Staff), same Storm-rupture gate, same time window. Three axes is consistent with the multi-axis pattern in `sana_95` and `vlasic_ridge_95`.

```
// In operation_opportunity_catalog_federation_western_bosnia.ts:

const MISTRAL_JAJCE_OBJECTIVES: readonly string[] = [
    'op:jajce:bravnice',     // approach from Šipovo
    'op:jajce:vinac_2',
    'op:jajce:lupnica',
    'op:jajce:prisoje',
    'op:jajce:barevo_2',
    'op:jajce:jezero_2',
    'op:jajce:jajce_3',      // town centre
    // NOTE: op:jajce:grdovo is RBiH-flip, NOT HVO axis — exclude here;
    //       belongs in donji_vakuf_95 follow-on or vlasic_ridge_95 follow-on.
];

const MISTRAL_AXES: readonly OpportunityAxisDef[] = [
    { /* existing mistral_drvar_grahovo */ },
    { /* existing mistral_sipovo_mrkonjic */ },
    {
        axis_id: 'mistral_jajce',
        name: 'Jajce Axis (Phase 2 — 2nd HVO Guards)',
        corps: 'hvo_main_staff',
        brigades: [
            'hvo_2nd_guards_brigade',  // verify exact OOB id
            // optionally hv_1st_guards_tigers (Glamoč-located per hv_integration.ts:109)
        ],
        objectives: MISTRAL_JAJCE_OBJECTIVES,
        staging_osid: 'op:sipovo:sipovo_2',  // staging FROM Sipovo (post-12-Sep capture)
        //  -- but Sipovo isn't HRHB at op-launch; staging must be HRHB-held at launch.
        //  -- Alternative: stage from op:bugojno:gracanica (ARBiH-held, near Jajce south flank)
        //  -- BUT cross-faction staging fails — must be HRHB territory. Recommend
        //     `op:livno:livno_2` or `op:tomislavgrad:tomislavgrad_2` and accept long march.
    },
];

const MISTRAL_TARGETS = [
    ...MISTRAL_DRVAR_GRAHOVO_OBJECTIVES,
    ...MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES,
    ...MISTRAL_JAJCE_OBJECTIVES,
];

// Plus matching variant: `jajce_recapture_axis` in MISTRAL_2_95_OPPORTUNITY.variants.
```

**Note on staging:** the cleanest engine-truthful staging would be Šipovo post-capture, but operation_opportunity preparation does not currently support sequential per-axis staging-becomes-available-after-other-axis-completes. Recommend a HRHB-stable staging anchor (Livno or Kupres) plus a long approach march. Operations-expert sacred rule §3 ("Staging OSID must be adjacent to the first objective") is at risk here — flag for engine-side discussion before implementation.

### (d) Dependencies

- **HVO Main Staff OOB must include the 2nd HVO Guards Brigade.** Confirm in `data/source/oob/`.
- **Storm rupture already gated** — same alliance_context as existing `mistral_2_95`.
- **Cross-axis staging dependency** is a new pattern (Jajce axis ideally stages from Šipovo, which is itself a Mistral axis target). Either accept the long-march compromise or extend the staging-access predicate to be axis-aware.
- **No joint-ops mechanic required** — single-faction (HRHB) op with optional HV brigade augmentation. HV brigades already attach to `hvo_tomislavgrad` via `hv_integration.ts:38`.

### (e) Risk: **LOW–MED**

- LOW for the axis addition itself (data only, no new predicate logic).
- MED for the staging-anchor question (sacred rule §3 vs historical realism). The fact that Jajce was *encircled* and fell only after both Šipovo (NW) and Donji Vakuf (S) were ARBiH/HVO-held is the structural reason it's a "phase 2" axis — the engine has no native phase-sequencing primitive.
- **Anchor payoff: 7 HRHB OSIDs (Jajce HVO arm)** + 1 RBiH OSID (`grdovo`) handled separately under Donji Vakuf 95 follow-on or as a vlasic_ridge_95 follow-on touch-point.
- No extra mechanics needed BEYOND a minor staging-predicate generosity allowance.

---

## 4. Gap 4 — Maestral vs Juzni Potez timing conflation at Mrkonjić Grad

### (a) Diagnosis (file:line)

- **`mistral_2_95` currently owns Mrkonjic Grad OSIDs.** `MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES` (operation_opportunity_catalog_federation_western_bosnia.ts:51–63) lists 6 Mrkonjic OSIDs: `gerzovo_2`, `mrkonjic_grad_2`, `bjelajce_2`, `baljvine_2`, `majdan_2`, `podrasnica_2`.
- **`mistral_2_95.dateWindowMistral` (lines 130–134):** turn ≥ 175, ≤ 190. This window includes BOTH Maestral (w177–178, 8–14 Sep) AND Juzni Potez (w181–182, 8–11 Oct). **Engine cannot disambiguate.**
- **Historical fact:** Per BB extractor memo §1 row 10 (BB1 p.427): Mrkonjic Grad fell **10 October 1995**, NOT in Maestral phase 1–3. Maestral was halted *short* of Mrkonjic per BB1 pp.417–418. Juzni Potez (Southern Move) at 8–11 Oct was the actual capture op.
- **Result:** the sim either (i) delivers Mrkonjic to HRHB at w177–178 (ahistorically early via the same Maestral op-fire as Šipovo) or (ii) delivers it at w181–182 via late-stage Maestral execution, conflating the operation IDs. Either way: no separate `juzni_potez_95` op.
- **Painted_oct1995 marks all 6 Mrkonjic OSIDs as HRHB** — so the territorial outcome is correct, but the op-attribution is wrong. This matters for AAR narrative (HV is invisible as a discrete actor) and for sequencing the Sana 95 follow-on (BB1 p.426: 1 Oct ARBiH OG South within 3 km of Mrkonjic — VRS shifted reserves to Mrkonjic to halt OG North; if engine has already captured Mrkonjic in Maestral the VRS reserve-shift dynamic is moot).

### (b) Historical anchor

- **Source:** BB1 p.427 ("Juzni Potez opens"), p.428 ("Mrkonjic Grad fell").
- **Date:** 8–11 October 1995. Op opens 8 Oct; Mrkonjic falls 9–10 Oct; HV withdraws 11 Oct.
- **Forces (per BB1 p.427):** HV OG East under HVO Brig. Glasnović. Spearhead: HV 4th Guards Brigade (cracked 3rd Serbian Brigade defenses SW of town). Plus 1st HGZ, 7th Guards, 3 HVO Guards Brigades.
- **Axis:** From Šipovo (already HRHB since w178 Maestral) east-then-north to Mrkonjic Grad. Then Podrasnica + Cadjavica (BB1 p.427: explicit next-day captures). Note that the BB-cited "Cadjavica" sits in `op:kljuc:cadjavica` per painter (extractor flagged this in §2 as potentially mis-municipalitied).

### (c) Proposed entry shape (sketch)

**Extract Mrkonjic objectives from `mistral_2_95`** and create a new `juzni_potez_95` opportunity. Keep Sipovo in Mistral 2 (Sipovo correctly fell 12 Sep in Maestral phase 2).

```
// 1. Modify operation_opportunity_catalog_federation_western_bosnia.ts:
//
//    Replace MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES with MISTRAL_SIPOVO_OBJECTIVES
//    (Sipovo only). Move Mrkonjic OSIDs to a new constant.

const MISTRAL_SIPOVO_OBJECTIVES: readonly string[] = [
    'op:sipovo:brdjani',
    'op:sipovo:gornji_mujdzici_2',
    'op:sipovo:sipovo_2',
    'op:sipovo:volari_2',
    'op:sipovo:pribeljci_2',
];

// 2. New opportunity entry: juzni_potez_95

const JUZNI_POTEZ_MRKONJIC_OBJECTIVES: readonly string[] = [
    'op:mrkonjic_grad:gerzovo_2',         // first hop from Sipovo
    'op:mrkonjic_grad:mrkonjic_grad_2',   // town centre
    'op:mrkonjic_grad:podrasnica_2',      // BB1 p.427 explicit next-day
    'op:mrkonjic_grad:bjelajce_2',
    'op:mrkonjic_grad:baljvine_2',
    'op:mrkonjic_grad:majdan_2',
];

const JUZNI_POTEZ_DEPENDENCY_ANCHORS: readonly string[] = [
    'op:sipovo:sipovo_2',            // Maestral must have delivered Sipovo (HRHB-held)
    'op:titov_drvar:drvar_2',        // Maestral Drvar fall (logistical pivot)
];

JUZNI_POTEZ_95_OPPORTUNITY = {
  opportunity_id: 'juzni_potez_95',
  name: 'Operation Juzni Potez (Southern Move)',
  tier: 'T1',
  faction: 'HRHB',
  primary_corps: 'hvo_main_staff',
  family: 'federation_western_bosnia',
  axes: [
    {
      axis_id: 'juzni_potez_mrkonjic',
      name: 'Mrkonjić Grad Eastern Approach',
      corps: 'hvo_main_staff',
      brigades: [
        'hv_4th_guards_split',                  // spearhead per BB1 p.427
        'hv_7th_guards_varazdin',
        'hvo_1st_guard_abb',                    // 1st HGZ
      ],
      objectives: JUZNI_POTEZ_MRKONJIC_OBJECTIVES,
      staging_osid: 'op:sipovo:sipovo_2',       // Maestral-delivered (dependency anchor)
    },
  ],
  staging_osid: 'op:sipovo:sipovo_2',
  planning_duration: 3,                          // tighter than Mistral 2 (Sipovo already held)
  min_attack_outcome: 'repulsed',
  prerequisites: {
    date_window: 'required',         // turns 181–184 (~8–11 Oct 1995)
    political_authorization: 'required',  // washington_signed + alliance
    corps_readiness: 'required',
    logistics: 'optional',
    staging_access: 'required',      // Sipovo + Drvar dependency anchors held by HRHB
    weather_season: 'optional',
    commander_confidence: 'optional',
    enemy_weakness: 'required',
    alliance_context: 'required',    // Storm rupture + Mistral 2 must have completed
    force_quality: 'optional',
    min_optional_axes: 0,
  },
  evaluators: { ... },               // staging_access checks Sipovo+Drvar HRHB-controlled
  historical_exit_class: 'partial_success',
  citations: [
    'BB1 pp.427-428 — Juzni Potez Mrkonjic capture 10 Oct 1995',
    'docs/40_reports/audits/20260521_BB_KRAJINA_COLLAPSE_ANCHORS.md row 10',
  ],
  staff_recommendation: 'approve',
};
```

### (d) Dependencies

- **`mistral_2_95` must complete Sipovo capture before Juzni Potez can fire.** This is the same kind of cross-op dependency as Gap 3's Jajce axis — staging-access predicate must check HRHB control of `op:sipovo:sipovo_2`.
- **Storm rupture gated** (alliance_context same as Mistral 2). No new mechanic.
- **HV brigades already spawned by w181** (Washington w108 + 6 turns → ~w114).
- **No joint-ops mechanic required.** HV brigades attached to `hvo_tomislavgrad` per `hv_integration.ts:38`; Juzni Potez is HV-led but routes through HVO command per `mistral_2_95` pattern.
- **Single-owner enforcement:** removing Mrkonjic OSIDs from `mistral_2_95` is required. Per the comment at `triggered_operations.ts:570–575`, dual-ownership is explicitly prohibited.

### (e) Risk: **MED**

- MED because: (i) this is an existing-op refactor (move OSIDs out of `mistral_2_95`), not pure-additive. Calibration delta possible if Mistral 2 was previously over-firing on Mrkonjic and that was helping HRHB area. (ii) Sequenced ops (Mistral 2 must succeed before Juzni Potez fires) is structurally new — only `kupres_cincar_94 → mistral_2_95` precedent (via `MISTRAL_CINCAR_DEPENDENCY_ANCHORS` lines 34–37).
- **Anchor payoff: 6 OSIDs correctly attributed to HRHB at w181–182 instead of w177–178.** Territory outcome unchanged in painted-control terms; sequencing accuracy improves.
- **No extra mechanics needed** beyond the existing dependency-anchor staging predicate.

---

## 5. Cross-cutting risk: single-owner enforcement

Per `triggered_operations.ts:570–575` and the LANE B Phase 3 migration comment at `5th_corps.ts:558-567`:

> "Removal is the single-owner enforcement."

Implementing Gaps 1, 2, and 4 will require:

- **Gap 1 (Ljeto):** Migrate `op:glamoc:halapic`, `op:glamoc:stekerovci_2` OUT of `mistral_2_95` Drvar-Grahovo axis (currently lines 41–42) INTO `ljeto_95` glamoc_shoulder axis.
- **Gap 2 (Donji Vakuf):** Retire or rescope `vlasic_ridge_95.variants[1] = bugojno_support` to release `op:donji_vakuf:komar_2`, `prusac_2`, `donji_vakuf_2` to `donji_vakuf_95`.
- **Gap 4 (Juzni Potez):** Migrate 6 `op:mrkonjic_grad:*` OSIDs OUT of `mistral_2_95` Sipovo-Mrkonjic axis INTO `juzni_potez_95`. Rename axis to "Sipovo Axis" only.

These migrations are **necessary regardless** because the opportunity catalog enforces single-owner per OSID across the late-war families.

---

## 6. Recommended sequencing

| Order | Gap | Reason | Unblocks |
|-------|-----|--------|----------|
| **1st** | Gap 2 — Donji Vakuf 95 | LOWEST risk. Single corps, single faction, single axis. No joint-ops, no Storm-precondition novelty, no cross-op dependency. **Highest anchor count payoff per implementation hour: 10 OSIDs.** Smallest single-owner cleanup (one variant rescope). | Validates the new T1 single-axis pattern for the family. Builds confidence in `arbih_7th_corps` corps_command + Komar staging path before Maestral-adjacent work. |
| **2nd** | Gap 3 — Jajce arm in mistral_2_95 | LOW–MED risk. Pure data addition (third axis) on existing opportunity. No new predicate logic, no new opportunity ID. Sacred-rule §3 (staging adjacency) is the one watchpoint; that's a discussion, not a code blocker. **7 HRHB-anchor OSIDs.** | Exercises the multi-axis pattern under `federation_western_bosnia`. Surfaces the cross-axis staging question that recurs in Gap 4 and any future phase-sequenced op (does engine support post-capture staging?). |
| **3rd** | Gap 4 — Juzni Potez extraction from Mistral 2 | MED risk. Refactor of an existing opportunity + new opportunity with cross-op dependency anchor (`mistral_2_95` must deliver Sipovo before Juzni Potez can stage there). **6 OSIDs, plus AAR/sequencing accuracy.** | Establishes a clean "Mistral 2 → Juzni Potez" sequenced-op chain (parallels Cincar 94 → Mistral 2). Tightens the late-war geometry needed before adding Ljeto 95. |
| **4th (last)** | Gap 1 — Ljeto 95 | MED risk. Novel pre-Storm gating pattern for an HV/HVO opportunity. Requires authoring an alliance_context evaluator that does NOT gate on `isWesternTheaterRuptured` for the first time in this catalog. Date window is narrow (w168–173). **11 OSIDs, but the highest pattern-novelty cost.** | After Gaps 2–4 land, the cleaner late-war geometry makes Ljeto's "supply Storm's jump-off" sequencing the only remaining historical loose end in the Krajina collapse arc. |

### Why this order, not "biggest gap first" (Ljeto, 11 OSIDs)?

Ljeto 95 is structurally the most novel — every other op in `federation_western_bosnia` gates on `isWesternTheaterRuptured`. Authoring a pre-Storm HV/HVO opportunity is a pattern-precedent that should be set after the simpler patterns (Donji Vakuf, Jajce, Juzni Potez) have validated the family's catalog shape. Doing Ljeto first risks setting an awkward pre-Storm-rupture precedent that the remaining gaps then have to work around.

### Which gaps cannot ship without extra mechanics?

**None of the four require new joint-ops or HV-Storm-spillover mechanics.** All four are deliverable with the existing infrastructure:

- `hv_integration.ts:34–38` already attaches HV brigades to `hvo_tomislavgrad` corps_command 6 weeks after Washington — HV brigades are available from ~w114 onwards.
- `operation_storm_theater.ts:32–34` (`isWesternTheaterRuptured`) provides the Storm-rupture gate for late-summer HV/HVO ops.
- Two-corps cross-axis ops are already supported per `mistral_2_95` (HVO Main Staff + HVO Tomislavgrad axes).

The "joint operations" gap flagged in `REAL_WAR_MASTER.md:1047,1056` refers to **CROSS-FACTION RBiH↔HRHB joint operations under a single corps op**, which AWWV does NOT support and which none of these four gaps require. Each of the four is a single-faction operation (Ljeto/Jajce/Juzni Potez = HRHB; Donji Vakuf = RBiH); joint-ops with HV is handled via the existing HV-attaches-to-HVO-corps pattern.

### Anchor-grade payoff summary

| Gap | OSIDs | Faction | Risk |
|-----|-------|---------|------|
| 2 — Donji Vakuf | 10 | RBiH | LOW |
| 3 — Jajce | 7 + 1 = 8 | HRHB (+1 RBiH `grdovo` handled separately) | LOW–MED |
| 4 — Juzni Potez | 6 (re-attributed) | HRHB | MED |
| 1 — Ljeto 95 | 11 | HRHB | MED |
| **Total** | **35 OSIDs** (≈ 5% of 712-OSID map) | mixed | — |

Sequenced as recommended, all 35 OSIDs become anchor-grade attributable inside the late-war Krajina collapse arc with zero new joint-ops or pre-Storm-spillover mechanics.
