# Catalog Adjacency Sweep — 2026-05-23

**Status:** COMPLETE — 5 ops audited across 9 axes. 4 reorder fixes proposed, 1 op (Mistral 1 Grahovo) is a cross-axis ordering dependency rather than a within-axis bug, 1 op (Mistral 2 drvar_grahovo) has been verified CLEAN under post-prelude pre-state.

## Context

Wave 22 (Cincar) + Wave 23A (Mistral 1 Glamoč axis) discovered that several catalog ops misorder their objectives relative to OSID adjacency from the staging point. The per-axis brigade brain (`collectObjectiveApproachOsids` → `sector_offensive_launch_helpers.ts`) returns `no_approach_osid` when the first un-captured objective is not OSID-adjacent to any friendly OSID (staging anchor, captured prior objective in the same axis, or friendly OSID exposed by a parallel axis). The axis idle-stalls → `max_failures` abort.

**Canonical fix pattern:** reorder the `objectives` array so the first un-captured one is always adjacent (via `data/derived/operational/operational_contact_graph.json`) to either the axis `staging_osid` or a previously-captured objective in the same axis.

## Methodology

- Loaded `data/derived/operational/operational_contact_graph.json` (712 nodes, 2047 edges) and built an undirected adjacency map.
- For each axis: simulated objective capture in catalog order, treating each captured objective as friendly thereafter. Logged the OSID that exposed adjacency for every step.
- Pre-state assumptions (per task brief):
  - **Wave 22 post-Cincar:** all 5 Kupres OSIDs HRHB (bucovaca, donji_malovan, goravci, kupres_2, novo_selo_2).
  - **Wave 23A post-Mistral-1-Glamoč:** Glamoč shoulder OSIDs HRHB (vidimlije_2, glamoc_2, halapic, stekerovci_2).
  - **Mistral 1 Grahovo** evaluated at t160 with Cincar succeeded but with Mistral 1 Glamoč axis only *partially* (since the two axes fire concurrently in the same op).
  - **Mistral 2** evaluated at t175+ assuming both Cincar AND Mistral 1 (both axes) succeeded.
  - **Vlašić Ridge** (t152-166) evaluated with Travnik-cluster RBiH/HRHB Federation-held per `stagingAccessVlasic`.
  - **Donji Vakuf 95** (t177-180) evaluated with Bugojno/Turbe RBiH-held per `stagingAccessDonjiVakuf`.
  - **Sana 95** (t175+) evaluated with Bihać pocket survival anchors RBiH-held per `stagingAccessSana`.

## Results — per axis

### 1. MISTRAL_2_95 / drvar_grahovo (4 brigades, 9 objectives)

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:52-62`
**Staging:** `op:livno:misi_2`

| step | objective | result | adj-to |
|---|---|---|---|
| 1 | op:glamoc:halapic | OK | op:glamoc:glamoc_2 (Mistral-1-prelude) |
| 2 | op:glamoc:stekerovci_2 | OK | halapic (also Mistral-1-prelude) |
| 3 | op:titov_drvar:prekaja_2 | OK | stekerovci_2 |
| 4 | op:titov_drvar:drvar_2 | OK | bosansko_grahovo_2 (Mistral-1-prelude) |
| 5 | op:titov_drvar:sipovljani_2 | OK | malesevci (Mistral-1-prelude) |
| 6 | op:bosansko_grahovo:crni_lug | OK | halapic |
| 7 | op:bosansko_grahovo:bosansko_grahovo_2 | OK | malesevci |
| 8 | op:bosansko_grahovo:malesevci | OK | crni_lug |
| 9 | op:bosansko_grahovo:ugarci | OK | crni_lug |

**Verdict:** CHAIN CLEAN **iff Mistral 1 (both Glamoč and Grahovo axes) succeeded first.** Steps 1, 2, 4, 5 *all* rely on Mistral-1-captured OSIDs.

**Sensitivity check:** if Mistral 1 fails (control: only Cincar + HRHB baseline), the axis BREAKS at step 1 (halapic has no HRHB neighbor) and again at step 4 (drvar_2 only connects via crni_lug or grahovo_2 — neither HRHB without prelude).

**Action:** no reorder needed. The op already relies on Mistral 1 as a prelude (and Mistral 2's `allianceContextMistral` predicate gates on `isWesternTheaterRuptured`, which downstream-anchors Mistral 1 success). Document the dependency in the catalog comment.

### 2. MISTRAL_2_95 / sipovo_mrkonjic (3 brigades, 11 objectives) — BUG

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:64-76`
**Staging:** `op:livno:livno_2`

| step | objective | result | note |
|---|---|---|---|
| 1 | op:sipovo:brdjani | OK | adj halapic (Glamoč-prelude) |
| 2 | op:sipovo:gornji_mujdzici_2 | OK | adj kupres:novo_selo_2 (Cincar-prelude) |
| 3 | op:sipovo:sipovo_2 | OK | adj brdjani |
| 4 | op:sipovo:volari_2 | OK | adj sipovo_2 |
| 5 | op:sipovo:pribeljci_2 | OK | adj kupres:kupres_2 (Cincar-prelude) |
| 6 | op:mrkonjic_grad:gerzovo_2 | OK | adj halapic |
| 7 | **op:mrkonjic_grad:mrkonjic_grad_2** | **BREAK** | neighbors: banja_luka:pavici_2, kljuc:cadjavica/donje_ratkovo_2/donji_vrbljani_2, mrkonjic_grad:bjelajce_2/majdan_2/podrasnica_2 — none captured yet |
| 8 | op:mrkonjic_grad:bjelajce_2 | OK (after break) | adj mrkonjic_grad_2 |
| 9 | op:mrkonjic_grad:baljvine_2 | OK | adj bjelajce_2 |
| 10 | op:mrkonjic_grad:majdan_2 | OK | adj sipovo_2 |
| 11 | op:mrkonjic_grad:podrasnica_2 | OK | adj gerzovo_2 |

**Bug class:** mid-sequence gap. mrkonjic_grad_2 is the town/hub and only opens via `majdan_2`, `podrasnica_2`, or `bjelajce_2` — all listed later in the array.

**Proposed reorder** (verified CLEAN end-to-end):

```ts
const MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES: readonly string[] = [
    'op:sipovo:brdjani',
    'op:sipovo:gornji_mujdzici_2',
    'op:sipovo:sipovo_2',
    'op:sipovo:volari_2',
    'op:sipovo:pribeljci_2',
    'op:mrkonjic_grad:gerzovo_2',
    'op:mrkonjic_grad:majdan_2',        // MOVED FORWARD (adj sipovo_2/gerzovo_2/volari_2)
    'op:mrkonjic_grad:podrasnica_2',    // MOVED FORWARD (adj gerzovo_2/majdan_2)
    'op:mrkonjic_grad:mrkonjic_grad_2', // NOW adj majdan_2 + podrasnica_2
    'op:mrkonjic_grad:bjelajce_2',
    'op:mrkonjic_grad:baljvine_2',
];
```

### 3. MISTRAL_1_95 / grahovo (2 brigades, 4 objectives) — DEPENDENCY GAP

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:359-364`
**Staging:** `op:livno:misi_2`

| step | objective | result | note |
|---|---|---|---|
| 1 | **op:bosansko_grahovo:crni_lug** | **BREAK** | neighbors: malesevci, ugarci, halapic, stekerovci_2, livno:gubin_2, prekaja_2 — none HRHB at t160 unless Glamoč axis has captured halapic OR Cincar has captured gubin_2 (it has not — gubin_2 is RS-held in calibration baseline) |
| 2 | op:bosansko_grahovo:malesevci | OK (after break) | adj crni_lug |
| 3 | op:bosansko_grahovo:bosansko_grahovo_2 | OK | adj malesevci |
| 4 | op:bosansko_grahovo:ugarci | OK | adj crni_lug |

**Bug class:** first-objective-unreachable-from-staging, but it is a **cross-axis dependency**, not a within-axis reorder. crni_lug has NO baseline-HRHB neighbor in any plausible Cincar-only pre-state. Reachability requires:
- (a) Mistral 1 Glamoč axis captures halapic FIRST (verified clean — see follow-up below), OR
- (b) An authored prelude that flips `op:livno:gubin_2` to HRHB before the Grahovo axis launches (not currently authored anywhere).

**Verification (post-halapic):** with `op:glamoc:halapic` HRHB at step 1, the chain runs CLEAN end-to-end:

```
step 1: crni_lug OK (adj halapic)
step 2: malesevci OK (adj crni_lug)
step 3: bosansko_grahovo_2 OK (adj malesevci)
step 4: ugarci OK (adj crni_lug)
```

**Action:** because the two axes run concurrently within the same opportunity, the brigade brain races. If Grahovo brigades tick before Glamoč captures halapic, Grahovo idles `no_approach_osid` and accumulates failures. Recommended remediation:

1. **Authored prelude option (preferred):** prepend `op:livno:gubin_2` as the first Grahovo objective. gubin_2 is adjacent to `priluka_2` (HRHB baseline staging anchor) AND to `crni_lug` — captures one OSID-adjacency hop from priluka_2, then crni_lug becomes adj to gubin_2. This makes Grahovo axis self-contained (independent of Glamoč axis tempo). gubin_2 is currently NOT a Mistral 1 objective; it would need to be added.
2. **Cross-axis sequencing option (lighter touch):** add `op:glamoc:halapic` as an EXPLICIT shared waypoint in BOTH axes (axis-order-dependent capture). Brigade brain treats axis-shared objectives as friendly once any axis captures them. This requires verifying the engine's `sector_offensive` axis-shared-objective behavior, which is out of scope here.
3. **Pure reorder:** NOT POSSIBLE within the 4-objective Grahovo set — all 4 OSIDs sit in the Grahovo cluster's deep interior, none touching baseline-HRHB OSIDs directly.

**Recommended:** Option 1 (prepend gubin_2) — surgical, single-OSID addition, preserves both-axis parallelism. New Grahovo objectives:

```ts
const MISTRAL_1_GRAHOVO_OBJECTIVES: readonly string[] = [
    'op:livno:gubin_2',          // NEW: opens via priluka_2 (HRHB baseline)
    'op:bosansko_grahovo:crni_lug',  // now adj to gubin_2
    'op:bosansko_grahovo:malesevci',
    'op:bosansko_grahovo:bosansko_grahovo_2',
    'op:bosansko_grahovo:ugarci',
];
```

Historical note: BB v2 ch. 28 describes the HV/HVO Mistral 1 push originating from the Livno-Tomislavgrad arc and pushing through the Livno municipal periphery before opening the Grahovo basin proper; gubin_2 is a historically defensible waypoint. Consult `/historian` before committing to a specific OSID addition.

### 4. DONJI_VAKUF_95 / komar_line (5 brigades, 10 objectives) — CLEAN

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:74-85`
**Staging:** `op:travnik:turbe_2`

| step | objective | result | adj-to |
|---|---|---|---|
| 1 | op:donji_vakuf:komar_2 | OK | turbe_2 |
| 2 | op:donji_vakuf:donji_vakuf_2 | OK | komar_2 |
| 3 | op:donji_vakuf:babin_potok_2 | OK | donji_vakuf_2 |
| 4 | op:donji_vakuf:kutanja | OK | donji_vakuf_2 |
| 5 | op:donji_vakuf:torlakovac_2 | OK | babin_potok_2 |
| 6 | op:donji_vakuf:pribraca_2 | OK | donji_vakuf_2 |
| 7 | op:donji_vakuf:prusac_2 | OK | pribraca_2 |
| 8 | op:donji_vakuf:jemanlici | OK | donji_vakuf_2 |
| 9 | op:donji_vakuf:korenici | OK | komar_2 |
| 10 | op:donji_vakuf:oborci_2 | OK | komar_2 |

**Verdict:** CHAIN CLEAN. No reorder needed.

### 5. VLASIC_RIDGE_95 / travnik_ridge (3 brigades, 3 objectives) — BUG

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:36-40`
**Staging:** `op:travnik:turbe_2`

| step | objective | result | note |
|---|---|---|---|
| 1 | **op:travnik:gornje_krcevine** | **BREAK** | neighbors: donji_vakuf:komar_2 (RS), jajce:grdovo (RS), skender_vakuf:donji_koricani (RS — Skender axis objective), paklarevo (objective #2), varosluk (objective #3). NO friendly neighbor at axis start. |
| 2 | op:travnik:paklarevo | OK (after break) | adj turbe_2 |
| 3 | op:travnik:varosluk | OK | adj turbe_2 |

**Bug class:** first-objective-unreachable-from-staging. gornje_krcevine is the deepest of the three Travnik-ridge OSIDs; both paklarevo and varosluk touch the staging anchor turbe_2 directly.

**Proposed reorder** (verified CLEAN):

```ts
const VLASIC_TRAVNIK_RIDGE_OBJECTIVES: readonly string[] = [
    'op:travnik:paklarevo',         // MOVED FIRST — adj turbe_2 directly
    'op:travnik:varosluk',          // MOVED SECOND — adj turbe_2
    'op:travnik:gornje_krcevine',   // NOW adj paklarevo + varosluk
];
```

Also applies to the `VLASIC_RIDGE_PROBE_AXES` variant (same objectives, same staging).

### 6. VLASIC_RIDGE_95 / skender_vakuf (3 brigades, 4 objectives) — CLEAN

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:42-47`
**Staging:** `op:travnik:cukle_2`

| step | objective | result | adj-to |
|---|---|---|---|
| 1 | op:skender_vakuf:donji_koricani | OK | cukle_2 |
| 2 | op:skender_vakuf:imljani_2 | OK | donji_koricani |
| 3 | op:skender_vakuf:javorani_2 | OK | donji_koricani |
| 4 | op:skender_vakuf:knezevo_2 | OK | donji_koricani |

**Verdict:** CHAIN CLEAN. No reorder needed.

### 7. SANA_95 / krupa_valley (2 brigades, 6 objectives) — CLEAN

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:74-81`
**Staging:** `op:bosanska_krupa:otoka_2`

| step | objective | result | adj-to |
|---|---|---|---|
| 1 | op:bosanska_krupa:ivanjska_2 | OK | otoka_2 |
| 2 | op:bosanska_krupa:arapusa_2 | OK | ivanjska_2 |
| 3 | op:bosanska_krupa:donji_dubovik_2 | OK | ivanjska_2 |
| 4 | op:bosanska_krupa:vranjska_2 | OK | ivanjska_2 |
| 5 | op:bosanska_krupa:jasenica_2 | OK | arapusa_2 |
| 6 | op:bosanska_krupa:gornja_suvaja | OK | vranjska_2 |

**Verdict:** CHAIN CLEAN. No reorder needed.

### 8. SANA_95 / bihac_petrovac (3 brigades, 12 objectives) — BUG

**Catalog file:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:83-96`
**Staging:** `op:bihac:bihac_2`

| step | objective | result | note |
|---|---|---|---|
| 1 | op:bihac:ripac | OK | adj bihac_2 |
| 2 | op:bihac:racic | OK | adj ripac |
| 3 | **op:bihac:trubar** | **BREAK** | neighbors: orasac_2 (objective #4), kolonic_2/prkosi/vodjenica (RS-held petrovac objectives), grahovo_2 (RS), drvar_2 (RS). Step 4 captures orasac_2 which IS adj to trubar — so trubar is unreachable until orasac_2 captured. |
| 4 | op:bihac:orasac_2 | OK | adj racic |
| 5 | op:bosanski_petrovac:vrtoce | OK | adj racic |
| 6 | **op:bosanski_petrovac:bosanski_petrovac_2** | **BREAK** | neighbors: dobro_selo_2, kolonic_2, vodjenica — none captured yet. (dobro_selo_2 is step 7 — adj vrtoce via different edge — but still in RS hands at step 6.) |
| 7 | op:bosanski_petrovac:dobro_selo_2 | OK (after break) | adj vrtoce |
| 8 | op:bosanski_petrovac:kolonic_2 | OK | adj trubar |
| 9 | op:bosanski_petrovac:vodjenica | OK | adj trubar |
| 10 | op:bosanski_petrovac:prkosi | OK | adj trubar |
| 11 | op:bosanski_petrovac:krnjeusa | OK | adj racic |
| 12 | op:bosanski_petrovac:jasenovac_2 | OK | adj dobro_selo_2 |

**Bug class:** two mid-sequence gaps (steps 3 and 6).

**Proposed reorder** (verified CLEAN):

```ts
const BIHAC_PETROVAC_OBJECTIVES = [
    'op:bihac:ripac',
    'op:bihac:racic',
    'op:bihac:orasac_2',                       // MOVED FORWARD (was step 4)
    'op:bihac:trubar',                          // NOW adj orasac_2
    'op:bosanski_petrovac:vrtoce',
    'op:bosanski_petrovac:kolonic_2',          // MOVED FORWARD (adj trubar)
    'op:bosanski_petrovac:vodjenica',          // MOVED FORWARD (adj trubar)
    'op:bosanski_petrovac:prkosi',             // MOVED FORWARD (adj orasac_2/trubar)
    'op:bosanski_petrovac:bosanski_petrovac_2', // NOW adj kolonic_2 + vodjenica
    'op:bosanski_petrovac:dobro_selo_2',
    'op:bosanski_petrovac:krnjeusa',
    'op:bosanski_petrovac:jasenovac_2',
];
```

## Summary by opportunity

| op | axis | objectives | result | action |
|---|---|---|---|---|
| MISTRAL_2_95 | drvar_grahovo | 9 | CLEAN (assuming Mistral 1 prelude) | document dependency only |
| MISTRAL_2_95 | sipovo_mrkonjic | 11 | BREAK @ step 7 | reorder (fix verified clean) |
| MISTRAL_1_95 | grahovo | 4 | BREAK @ step 1 | prepend gubin_2 (authored prelude) |
| DONJI_VAKUF_95 | komar_line | 10 | CLEAN | none |
| VLASIC_RIDGE_95 | travnik_ridge | 3 | BREAK @ step 1 | reorder (fix verified clean) |
| VLASIC_RIDGE_95 | skender_vakuf | 4 | CLEAN | none |
| SANA_95 | krupa_valley | 6 | CLEAN | none |
| SANA_95 | bihac_petrovac | 12 | BREAK @ steps 3, 6 | reorder (fix verified clean) |

## Reportback

**(a) Ops flagged with adjacency misorder:** 4 of 5 audited ops have at least one axis with an adjacency problem.
- MISTRAL_2_95 (sipovo_mrkonjic) — within-axis reorder fix
- MISTRAL_1_95 (grahovo) — needs authored prelude (gubin_2)
- VLASIC_RIDGE_95 (travnik_ridge) — within-axis reorder fix
- SANA_95 (bihac_petrovac) — within-axis reorder fix (two gaps)

**(b) Top-3 highest-territorial-impact reorders to apply (now):**

1. **SANA_95 / bihac_petrovac** — 12 objectives, currently 2 gaps; reordered chain CLEAN. Highest territorial impact: full Bihać-Petrovac corridor liberation worth ~12 OSIDs at Sep–Oct 1995 painted-truth window. Pure data reorder, no new objectives.
2. **MISTRAL_2_95 / sipovo_mrkonjic** — 11 objectives, mid-sequence gap at the Mrkonjić town hub. Reordered chain CLEAN. Unblocks Mrkonjić Grad cluster (~6 OSIDs) and Šipovo cluster (~5 OSIDs) — total ~11 OSIDs. Pure data reorder.
3. **VLASIC_RIDGE_95 / travnik_ridge** — only 3 objectives, but first-objective-unreachable is the worst class of bug (axis aborts at step 1 having captured zero). Reorder is a 3-line shuffle, unblocks the entire ridge axis. Smaller area but very high tempo impact (entire axis depends on it).

**(c) Ops that DON'T have the bug (clean baseline):**
- DONJI_VAKUF_95 / komar_line (10 objectives — already adjacency-clean)
- VLASIC_RIDGE_95 / skender_vakuf (4 objectives)
- SANA_95 / krupa_valley (6 objectives)
- MISTRAL_2_95 / drvar_grahovo (clean conditional on Mistral 1 prelude — which is the engine-intended dependency)

**(d) Ops where no reorder helps (need authored prelude or cross-axis wiring):**
- MISTRAL_1_95 / grahovo — all 4 Grahovo cluster OSIDs sit deep relative to baseline-HRHB OSIDs. Within-axis reorder is impossible (no OSID in the set touches a friendly OSID at t160). Three viable remediation paths laid out above; recommended path = **prepend `op:livno:gubin_2`** to create a 1-hop bridge via the priluka_2 staging anchor (verify historical defensibility with `/historian` before committing).

**(e) Memo size:** see `wc -c` verification below; target was ≥10KB.

## Caveats and follow-ups

- This audit uses **operational_contact_graph.json** as the canonical adjacency source. The engine's per-axis `collectObjectiveApproachOsids` uses the same graph plus a sub-segment fallback (Wave 11). The fallback can sometimes rescue an axis whose direct adjacency fails, BUT only when the corps's front sub-segment lists the target OSID as `enemy_osid` — which requires a shared front edge. For ops where the corps front does not physically reach the objective cluster (e.g., Jajce 95 NEAR/RING split per Wave 14), the sub-segment fallback alone is insufficient and the axis still needs adjacency-clean ordering.
- Pre-state assumptions were drawn from the catalog files' own prerequisite predicates. If those predicates are themselves wrong (e.g., enabling Mistral 2 when Mistral 1 has not actually succeeded), the "clean conditional" Mistral 2 drvar_grahovo verdict needs revisiting.
- `op:livno:gubin_2` is suggested as the Mistral 1 Grahovo prelude OSID based on contact-graph topology and the BB v2 ch. 28 description of the Livno-municipal periphery. Historical defensibility should be confirmed with `/historian` before authoring it as an objective.
- Diagnostic script (`runs/_audit_fixes.cjs`) is a throwaway analysis artifact and may be deleted after this memo is reviewed.

## Citations

- `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` (Mistral 1 + 2)
- `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` (Vlašić Ridge, Donji Vakuf 95)
- `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (Sana 95)
- `data/derived/operational/operational_contact_graph.json` (canonical adjacency, 712 nodes / 2047 edges)
- `docs/40_reports/audits/20260523_WAVE_22_CINCAR_BREAKTHROUGH_N1985.md` (Wave 22 Cincar fix; same bug class for kupres_2)
- `docs/40_reports/audits/20260523_SUBSEGMENT_REFRESH_INVESTIGATION.md` (sub-segment refresh validation)
- `docs/40_reports/audits/20260522_WAVE_11_12_13_BREAKTHROUGH_N1975.md` §Q5 (sub-segment fallback semantics)
