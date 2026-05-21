# Tier 1 Painted-Target Anchor Wiring — Implementation Plan

**Date:** 2026-05-21
**Author:** orchestrator synthesis of five specialist memos (`20260521_HISTORIAN_*`, `20260521_BB_KRAJINA_COLLAPSE_*`, `20260521_SCRT_*`, `20260521_WAR_OR_GAME_*`, `20260521_CANON_COMPLIANCE_*`).
**Status:** DRAFT — read-only proposal. No code edits. Awaiting user review before any `src/scenario/` change.
**Sibling work (do not touch):** Codex is editing `src/sim/combat/*` strict-null leaves and sector perf. This plan is `src/scenario/` only.

**Fresh-compare addendum 2026-05-22:** The stale n1597-n1599 painted-compare assumptions have been superseded by regenerated n1932-n1935 artifacts and `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md`. Current reclassification: Jan 1993 RS/RBiH/HRHB remain Tier 1 PASS candidates; Apr 1994 HRHB remains PASS; Apr 1995 HRHB remains PASS; Apr 1995 RS is promoted from diagnostic-only to contract-anchor candidate (fresh sim 61.0% inside 60-67% band); Oct 1995 RS is demoted from the planned Dayton-band Tier 1 gate to diagnostic-only (fresh sim 61.0% vs 47-51% band); Oct 1995 RBiH remains diagnostic-only but sign-flipped from overshoot to undershoot. Do not wire the Oct 1995 RS pass/fail gate from §4.4 without first closing the Krajina-collapse / Mistral-Sana-Storm mechanic gap and reconfirming against a fresh run.

---

## 1. Goal

Wire a new pass/fail historical anchor gate covering the four painted-target dates (Jan 1993, Apr 1994, Apr 1995, Oct 1995). Gate must be:

- **Separate from baseline regression.** Baseline regression is determinism; this gate is calibration fidelity. The two break for different reasons and re-bless differently.
- **Mechanism-honest.** Only anchors the current engine can earn through canon-authorized mechanisms ship as PASS/FAIL. Everything that depends on engine gaps (HV Storm spillover, joint ARBiH-HVO ops, NATO Deliberate Force ground effect, UNPROFOR logistics, faction exhaustion ≠ 0, combat tempo ≠ 0.41 battles/wk, HRHB political-goal wiring, Srebrenica demil chain) is **diagnostic-only** until the mechanic ships, not a gate.
- **Canon-compliant.** Reads only deterministic save-output fields; never reads derived-state-from-save (Engine Invariants §13.1); accepts XOR-paired canonical-vs-alt-path events (§3.3 of canon memo); uses only canonical faction IDs (`RBiH` / `RS` / `HRHB`).

---

## 2. Architecture decision

**Single file, extended per epoch.** Extend `src/scenario/historical_anchors.ts`. Keep the existing `HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992` as-is — those 27 OSIDs become the Dec 1992 snapshot anchor set (used by the Jan 1993 w40 evaluation, since Dec 1992 ≈ end-of-w34 in scenario time and Jan 1993 is w40; controllers are monotone over 6-week windows for those OSIDs).

**Divergence from SCRT recommendation flagged**: the SCRT memo §Next-steps proposed a sibling file `historical_band_anchors.ts`. This plan instead extends `historical_anchors.ts` in-place because (a) the 2026-05-17 CI feedback-loop wave explicitly centralized historical anchor truth in this one file, (b) the new types (events, bands, epoch OSIDs) are still "historical anchor data" not a separate concept, and (c) one file simplifies the cross-reference to a single canon source per `tests/scenario_anchor_contract.test.ts`. Open question §9.1 surfaces this as a user decision.

Canon reference baseline: **Engine Invariants v0.9.0** (per canon-compliance memo §0). Section citations below use that version.

Add three new exported anchor types:

```typescript
// src/scenario/historical_anchors.ts — proposed additions

export type CanonicalFactionId = 'RBiH' | 'RS' | 'HRHB';

export interface HistoricalEventAnchor {
    /** Event ID as authored in data/scenarios/events/*.json. Must exist in fired_event_ids universe. */
    event_id: string;
    /** Anchor target week (scenario week, w0 = 1992-04-06). */
    expected_week_max: number;
    /** Tolerance: anchor passes if event fired at any turn ≤ expected_week_max + tolerance,
     *  OR if any of `xor_with` fired (canonical vs alt-path). */
    tolerance: number;
    /** XOR-paired event IDs from canon memo §3.3 — either path satisfies the anchor. */
    xor_with?: readonly string[];
    /** Source citation (BB1 page, ICTY paragraph, etc.). */
    citation: string;
}

export interface HistoricalAreaShareBand {
    /** Scenario week the band is evaluated at. */
    at_week: number;
    faction: CanonicalFactionId;
    /** Inclusive bounds on area-weighted territorial share, [0.0, 1.0]. */
    min_share: number;
    max_share: number;
    citation: string;
}

export interface HistoricalEpochOsidAnchor {
    /** Scenario week the OSID controller is asserted at. */
    at_week: number;
    osid: string;
    expected_controller: CanonicalFactionId;
    citation: string;
}
```

Compute area-weighted shares at anchor-evaluation time from `state.political.political_controllers` × `data/derived/operational/osid_areas.json` (already used by `compare_painted_vs_sim.cjs`). Canon-compliance §1.1 confirms this is the canon-safe path — no schema addition needed for Tier 1.

---

## 3. Painted-map anomaly preconditions

Four painted cells contradict the historical record (historian memo §0.5). Resolution decisions adopted per `docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md` Q1.4:

| Painted file | OSID | Painted | Historical | Resolution |
|---|---|---|---|---|
| apr1994 / apr1995 / oct1995 | `op:gorazde:gorazde_2` | RS | RBiH (continuous) | **REPAINT to RBiH** at all three epochs. ICTY Karadžić TJ §3823+; BB1 p.187, p.448 unambiguous. Use `tools/diagnostics/painted_target_anomaly_fix.cjs` (to be authored) and add a regression assertion in `tests/painted_control_targets.test.ts`. |
| oct1995 | `op:rogatica:zepa_2` | RBiH | RS post-25 Jul 1995 | **REPAINT to RS** at oct1995 only. ICTY Krstić TJ + Karadžić TJ §5662+. Same anomaly-fix tool; one-cell edit. |
| apr1995 | `op:velika_kladusa:velika_kladusa_2` | RBiH | (no anomaly under post-cut model) | **RESOLVED by APWB cut plan.** APWB is cut from combat representation per `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md`; war-within-a-war captured via debuff consequence pair. Painted RBiH = correct under that model. No edit needed. |
| apr1994 | `op:kupres:kupres_2` | HRHB (RS at jan1993) | flip path unclear | **DEFER.** Needs BB-extractor follow-up. Could be correct (Kupres area saw HVO-VRS contestation 1993-94). |

Net: Tier 1 wiring **repaints two cells**, leaves one resolved-by-APWB-cut, and defers one pending BB research. No alternate-OSID workarounds needed — the Goražde anchors in §4.2/§4.3/§4.4 can use `gorazde_2` directly after the repaint.

Note: §4.2/§4.3/§4.4 below still cite `op:gorazde:bacci` / `op:gorazde:citluk_2` as alternate anchors because they were authored before the repaint decision. Post-repaint, those alternates can be retained as additional supporting anchors (extra coverage doesn't hurt) OR substituted back to `gorazde_2`. Either is canon-safe.

---

## 4. Tier 1 anchor proposals (concrete, citation-backed)

### 4.1 Jan 1993 (w40) — FULL Tier 1 (engine adequate per war-or-game)

#### Type 2 — Event anchors (5 high-confidence, all events confirmed in canon §3.1 inventory)

```typescript
export const HISTORICAL_EVENT_ANCHORS_JAN1993: readonly HistoricalEventAnchor[] = [
    { event_id: 'jna_withdrawal_1992',          expected_week_max: 6,  tolerance: 2, citation: 'BB1 p.166; JNA withdrawal mid-May 1992' },
    { event_id: 'operation_corridor_1992',      expected_week_max: 14, tolerance: 2, citation: 'BB1 p.182; Corridor 92 opens 24 June 1992' },
    { event_id: 'sarajevo_siege_begins_1992',   expected_week_max: 8,  tolerance: 2, citation: 'ICTY Galić TJ §189; siege begins May 1992' },
    { event_id: 'jajce_falls_1992',             expected_week_max: 30, tolerance: 2, citation: 'BB1 p.183; Jajce fell 29 Oct 1992' },
    { event_id: 'srebrenica_enclave_forms_1992',expected_week_max: 20, tolerance: 3, citation: 'BB1 p.187; Orić recaptures 8-10 May 1992' },
];
```

Note on `markale_massacre_1994` and `washington_agreement_1994`: deferred to Apr 1994 epoch (they fire later).

#### Type 1 — Area-share bands (all 3 PASS per SCRT)

```typescript
export const HISTORICAL_AREA_BANDS_JAN1993: readonly HistoricalAreaShareBand[] = [
    { at_week: 40, faction: 'RS',   min_share: 0.62, max_share: 0.68, citation: 'painted_control_jan1993.json + BB1 p.222' },
    { at_week: 40, faction: 'RBiH', min_share: 0.21, max_share: 0.26, citation: 'painted_control_jan1993.json + BB1 p.215-216' },
    { at_week: 40, faction: 'HRHB', min_share: 0.09, max_share: 0.13, citation: 'painted_control_jan1993.json + BB1 p.170,180' },
];
```

#### Type 3 — Supplementary OSID anchors at w40 (beyond Dec 1992 set)

The existing 27 `HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992` set is reused as the w40 OSID assertion. The historian memo flagged 4 additional high-confidence OSIDs not in the Dec 92 set; add them as Jan-1993 supplements:

```typescript
export const HISTORICAL_OSID_ANCHORS_JAN1993_SUPPLEMENT: readonly HistoricalEpochOsidAnchor[] = [
    { at_week: 40, osid: 'op:jajce:jajce_3',                expected_controller: 'RS',   citation: 'BB1 p.183 — Jajce fell 29 Oct 1992' },
    { at_week: 40, osid: 'op:cazin:cazin_2',                expected_controller: 'RBiH', citation: 'BB1 p.404 — Bihać 5th Corps area' },
    { at_week: 40, osid: 'op:travnik:travnik_2',            expected_controller: 'RBiH', citation: 'BB1 p.506 — 3rd Corps theatre' },
    { at_week: 40, osid: 'op:mostar:mostar_zapad_2',        expected_controller: 'HRHB', citation: 'BB1 index Mostar — HVO west bank pre-1993-war' },
];
```

The other Jan-93 OSIDs historian listed (Bratunac/Konjević Polje, Bos.Brod, Modriča, Odžak) are flagged for BB-extractor slug confirmation — **deferred** until those land.

### 4.2 Apr 1994 (w104) — PARTIAL Tier 1 (events only, no area band)

**Per SCRT delta table**: Apr 1994 RS area share FAILS by 15.5pp (sim 52.5% vs band 65-71%) and RBiH FAILS by 12.2pp (sim 36.2% vs band 19-24%). Per war-or-game: this is **Issue #37** (HRHB political-goal wiring) — the simulated HVO never goes offensive against ARBiH, so the HVO three-pocket-collapse never happens, central Bosnia stays ARBiH-overrun. **Wiring Type 1 bands here would force a railroad fix.** Type 1 deferred.

#### Type 2 — Event anchors only (4 high-confidence)

```typescript
export const HISTORICAL_EVENT_ANCHORS_APR1994: readonly HistoricalEventAnchor[] = [
    { event_id: 'markale_massacre_1994',         expected_week_max: 96,  tolerance: 2, citation: 'ICTY Galić TJ §189 — 5 Feb 1994' },
    { event_id: 'nato_ultimatum_sarajevo_1994',  expected_week_max: 96,  tolerance: 2, citation: 'BB1 p.222; UNSC + NATO ultimatum Feb 1994' },
    { event_id: 'sarajevo_exclusion_zone_1994',  expected_week_max: 98,  tolerance: 2, citation: 'BB1 p.222 — TEZ from Feb 1994' },
    {
        event_id: 'washington_agreement_1994',
        expected_week_max: 102,
        tolerance: 3,
        xor_with: ['csq_federation_early_1994'],
        citation: 'BB1 p.227-228; 18 March 1994 signing. XOR with alt-path consequence event.',
    },
    { event_id: 'gorazde_crisis_1994',           expected_week_max: 107, tolerance: 3, citation: 'ICTY Karadžić TJ §3823+ — Apr 1994 Goražde crisis; NATO airstrikes 10-11 Apr' },
];
```

#### Type 3 — Stable monotone OSIDs (historian §5.1 "monotone properties")

```typescript
export const HISTORICAL_OSID_ANCHORS_APR1994: readonly HistoricalEpochOsidAnchor[] = [
    // Goražde safe area (alternate enclave OSIDs — gorazde_2 is mis-painted)
    { at_week: 104, osid: 'op:gorazde:bacci',         expected_controller: 'RBiH', citation: 'BB1 p.187,448; Goražde safe area Apr 1993+' },
    { at_week: 104, osid: 'op:gorazde:citluk_2',      expected_controller: 'RBiH', citation: 'BB1 p.187,448' },
    // Eastern enclaves still intact
    { at_week: 104, osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RBiH', citation: 'UNSC Res 819; BB1 p.444' },
    { at_week: 104, osid: 'op:rogatica:zepa_2',         expected_controller: 'RBiH', citation: 'UN safe area; BB1 p.187' },
    // Bihać pocket
    { at_week: 104, osid: 'op:bihac:bihac_2',           expected_controller: 'RBiH', citation: 'BB1 p.404; pre-1995 5th Corps' },
    { at_week: 104, osid: 'op:cazin:cazin_2',           expected_controller: 'RBiH', citation: 'BB1 p.404' },
    // Federation cores
    { at_week: 104, osid: 'op:tuzla:tuzla_2',           expected_controller: 'RBiH', citation: '2nd Corps HQ' },
    { at_week: 104, osid: 'op:zenica:zenica_2',         expected_controller: 'RBiH', citation: '3rd Corps HQ; BB1 p.506' },
    // Vareš (HRHB→RBiH after Nov 1993 Stupni Do)
    { at_week: 104, osid: 'op:vares:vares_2',           expected_controller: 'RBiH', citation: 'Stupni Do massacre Nov 1993; HVO withdrawal' },
    // HRHB anchors (held since pre-war or Op Jackal)
    { at_week: 104, osid: 'op:orasje:orasje',           expected_controller: 'HRHB', citation: 'BB1 p.182 — Orašje pocket survives VRS Nov 1992 offensive' },
    { at_week: 104, osid: 'op:mostar:mostar_zapad_2',   expected_controller: 'HRHB', citation: 'HVO west bank' },
    // Krajina still RS (will be tested again at Oct 95 — must NOT have flipped early)
    { at_week: 104, osid: 'op:banja_luka:banja_luka_2', expected_controller: 'RS',   citation: '1st Krajina Corps HQ' },
    { at_week: 104, osid: 'op:prijedor:prijedor_2',     expected_controller: 'RS',   citation: 'BB1 p.181 — unchanged since May 1992' },
];
```

**Excluded from Apr 1994 Tier 1** (gated on Issue #37 + joint-ops mechanic):
- HVO three-pocket geometry (Vitez / Kiseljak / Žepče as HRHB enclaves) — sim has them larger
- Mostar east-west split — depends on HVO going on offensive
- Central Bosnia post-ARBiH-HVO-war territorial shape
- Type 1 area-share bands (failing by >5pp)

### 4.3 Apr 1995 (w156) — PARTIAL Tier 1 (events only, no area band)

Same Type 1 failure pattern as Apr 1994 (RS −13pp, RBiH +15pp). Same Issue #37 gating. Type 1 deferred.

#### Type 2 — Event anchors (5 high-confidence; mix of fixed-fires and state predicates)

```typescript
export const HISTORICAL_EVENT_ANCHORS_APR1995: readonly HistoricalEventAnchor[] = [
    // Cessation of hostilities (Carter/Akashi Dec 1994 – May 1995)
    { event_id: 'carter_ceasefire_1994',      expected_week_max: 140, tolerance: 3, citation: 'BB1 ch.86 — Carter shuttle Dec 1994' },
    { event_id: 'coha_ceasefire_begins_1995', expected_week_max: 142, tolerance: 3, citation: 'BB1 p.65 — Cessation of Hostilities Agreement Jan 1995' },
    { event_id: 'coha_expires_1995',          expected_week_max: 158, tolerance: 2, citation: 'BB1 ch.87 — COHA expires May 1995' },
    // Demilitarization context (must still be active)
    { event_id: 'srebrenica_demilitarization_1993', expected_week_max: 56, tolerance: 2, citation: 'UNSC Res 819 + BB1 p.444 — Apr 1993 demil' },
    { event_id: 'un_safe_areas_declared_1993',      expected_week_max: 54, tolerance: 2, citation: 'UNSC Res 824' },
    // Bihać context (must be set by w156)
    { event_id: 'bihac_crisis_1994',                expected_week_max: 137, tolerance: 3, citation: 'BB1 p.62 — Bihać crisis late 1994' },
];
```

#### Type 3 — Pre-Krajina-collapse "must still be RS" anchors (historian §3.4 — high diagnostic value)

These are the **strongest Apr 1995 anchors** because they double as guards against premature collapse. If the sim flips Bos. Petrovac to RBiH at w120 instead of w182, that's a wrong-mechanism win.

```typescript
export const HISTORICAL_OSID_ANCHORS_APR1995: readonly HistoricalEpochOsidAnchor[] = [
    // Safe areas intact
    { at_week: 156, osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RBiH', citation: 'UN safe area; falls Jul 1995' },
    { at_week: 156, osid: 'op:rogatica:zepa_2',         expected_controller: 'RBiH', citation: 'UN safe area; falls 25 Jul 1995' },
    { at_week: 156, osid: 'op:gorazde:bacci',           expected_controller: 'RBiH', citation: 'Goražde holds through Dayton' },
    { at_week: 156, osid: 'op:gorazde:citluk_2',        expected_controller: 'RBiH', citation: 'idem' },
    // Bihać + 5th Corps
    { at_week: 156, osid: 'op:bihac:bihac_2',           expected_controller: 'RBiH', citation: '5th Corps holds' },
    { at_week: 156, osid: 'op:cazin:cazin_2',           expected_controller: 'RBiH', citation: 'idem' },
    // Pre-collapse Krajina (must NOT have flipped yet)
    { at_week: 156, osid: 'op:banja_luka:banja_luka_2',     expected_controller: 'RS', citation: 'Holbrooke red-line; BB1 p.429' },
    { at_week: 156, osid: 'op:prijedor:prijedor_2',         expected_controller: 'RS', citation: 'unchanged since 1992' },
    { at_week: 156, osid: 'op:sanski_most:sanski_most_2',   expected_controller: 'RS', citation: 'VRS 6th Sanske; falls early Oct' },
    { at_week: 156, osid: 'op:kljuc:kljuc_2',               expected_controller: 'RS', citation: 'VRS 17th; falls 17 Sept' },
    { at_week: 156, osid: 'op:bosanski_petrovac:bosanski_petrovac_2', expected_controller: 'RS', citation: 'falls 15 Sept' },
    { at_week: 156, osid: 'op:titov_drvar:drvar_2',         expected_controller: 'RS', citation: 'VRS evacuates 14 Sept' },
    { at_week: 156, osid: 'op:bosansko_grahovo:bosansko_grahovo_2', expected_controller: 'RS', citation: 'falls late Jul (Ljeto-95)' },
    { at_week: 156, osid: 'op:glamoc:glamoc_2',             expected_controller: 'RS', citation: 'Oluja phase, late Jul-early Aug' },
    { at_week: 156, osid: 'op:donji_vakuf:donji_vakuf_2',   expected_controller: 'RS', citation: 'falls 13 Sept (BB1 p.419)' },
    { at_week: 156, osid: 'op:mrkonjic_grad:mrkonjic_grad_2', expected_controller: 'RS', citation: 'falls 10 Oct (Juzni Potez)' },
    { at_week: 156, osid: 'op:sipovo:sipovo_2',             expected_controller: 'RS', citation: 'falls 12-13 Sept (Maestral)' },
];
```

### 4.4 Oct 1995 (w188) — NARROW Tier 1 (4 forced flags + RS Dayton band only)

War-or-game: "Oct 1995 is structurally inadequate. The dominant Oct 1995 facts (Storm spillover, Maestral-2, Deliberate Force, Srebrenica fall, Dayton boundary) are all either missing or only present as flag-events with no ground-truth wiring."

**Tier 1 for Oct 1995 ships ONLY**: externally-forced flag anchors + the RS Dayton 47-51% area band (which the sim already passes — SCRT) + monotone-stable OSIDs.

**Krajina collapse (52 OSIDs from historian §4.5 + BB-extractor's HIGH-confidence rows) is DEFERRED** — it depends on HV Operation Storm spillover, joint ARBiH-HVO ops, NATO Deliberate Force, and the four BB-flagged opportunity-catalog gaps (`ljeto_95`, `donji_vakuf_1995_op`, jajce arm of `mistral_2_95`, `juzni_potez` timing). All under engine work.

#### Type 2 — Event anchors (5 high-confidence, 3 XOR-paired)

```typescript
export const HISTORICAL_EVENT_ANCHORS_OCT1995: readonly HistoricalEventAnchor[] = [
    {
        event_id: 'srebrenica_falls_1995',
        expected_week_max: 170,
        tolerance: 3,
        xor_with: ['csq_srebrenica_stalemate_1995'],
        citation: 'ICTY Krstić TJ §22-46; BB1 p.444 — VRS enters 11 Jul 1995. XOR with alt-stalemate consequence.',
    },
    {
        event_id: 'zepa_falls_1995',
        expected_week_max: 172,
        tolerance: 3,
        xor_with: ['csq_enclave_held_alt_intervention'],
        citation: 'BB1 p.187; ICTY Karadžić TJ §5662+ — Žepa fell 25 Jul 1995. XOR with alt-intervention path.',
    },
    {
        event_id: 'nato_deliberate_force_1995',
        expected_week_max: 178,
        tolerance: 3,
        xor_with: ['csq_alternative_nato_trigger_1995'],
        citation: 'BB1 p.455 — 30 Aug 1995. XOR with alt-trigger.',
    },
    { event_id: 'operation_storm_1995',  expected_week_max: 174, tolerance: 2, citation: 'BB1 p.411 — Oluja completed 7-8 Aug 1995 (off-map ref)' },
    { event_id: 'operation_summer_95',   expected_week_max: 173, tolerance: 2, citation: 'BB1 p.411 — Ljeto-95 takes Grahovo, sets grahovo_glamoc_captured' },
];
```

#### Type 1 — Single area-share band (RS only; the only one the sim passes)

```typescript
export const HISTORICAL_AREA_BANDS_OCT1995: readonly HistoricalAreaShareBand[] = [
    { at_week: 188, faction: 'RS', min_share: 0.47, max_share: 0.51, citation: 'Dayton/Contact Group treaty text 51/49; BB1 p.57' },
    // RBiH and HRHB bands DEFERRED — sim fails by 8-9pp each due to missing Mistral/Sana mechanics
];
```

#### Type 3 — Monotone-stable + the 2 forced fall OSIDs

```typescript
export const HISTORICAL_OSID_ANCHORS_OCT1995: readonly HistoricalEpochOsidAnchor[] = [
    // Goražde holds through Dayton
    { at_week: 188, osid: 'op:gorazde:bacci',         expected_controller: 'RBiH', citation: 'BB1 p.448 — survives to Dayton' },
    { at_week: 188, osid: 'op:gorazde:citluk_2',      expected_controller: 'RBiH', citation: 'idem' },
    // Srebrenica fell to RS (forced by event)
    { at_week: 188, osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RS', citation: 'ICTY Krstić TJ; 11 Jul 1995' },
    // Velika Kladuša retaken (post-Oluja, painted RBiH)
    { at_week: 188, osid: 'op:velika_kladusa:velika_kladusa_2', expected_controller: 'RBiH', citation: 'BB1 p.411 — 5th Corps marches in Aug 1995' },
    // Sarajevo center never falls (Engine Invariants §12.1)
    { at_week: 188, osid: 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo', expected_controller: 'RBiH', citation: 'Engine Invariants §12.1 ALWAYS_BESIEGED_ENCLAVE' },
    // Stable RS holdings through Dayton
    { at_week: 188, osid: 'op:bijeljina:bijeljina_2', expected_controller: 'RS', citation: 'unchanged since April 1992' },
    { at_week: 188, osid: 'op:foca:foca_3',           expected_controller: 'RS', citation: 'unchanged' },
    { at_week: 188, osid: 'op:visegrad:visegrad_2',   expected_controller: 'RS', citation: 'unchanged' },
];
```

**Žepa OSID anchor explicitly NOT included** at Oct 1995 — painted file conflict (zepa_2 painted RBiH but historically RS post-25 Jul 1995). Fall is asserted via the `zepa_falls_1995` event flag, not OSID.

---

## 5. Runner / test harness integration

### 5.1 New test module (separate from baseline regression)

Add `tests/scenario_historical_painted_anchors.test.ts` (NOT `scenario_anchor_contract.test.ts` — that owns the Dec 1992 set). The new test:

1. Reads the four anchor sets per epoch from `historical_anchors.ts`.
2. For each Tier 1 anchor set, reuses an already-existing scenario run; no new scenarios are required:
   - **Jan 1993 (w40)** evaluated against `apr1992_definitive_40w` final save (existing baseline).
   - **Apr 1994 (w104)** evaluated against `apr1992_definitive_104w` final save (scenario JSON already exists at `data/scenarios/apr1992_definitive_104w.json`).
   - **Apr 1995 (w156)** evaluated against `apr1992_definitive_156w` final save. **This scenario file does not currently exist** and must be authored as part of this plan — see §5.4 below. Investigation (per `docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md` Q1.6) confirmed the historic `_phase5a_w156_from_188w` artifact was a one-off, no per-week-snapshot runner feature exists, and authoring a 156w scenario JSON is the smaller change.
   - **Oct 1995 (w188)** evaluated against `apr1992_definitive_188w` final save (existing).
3. For Type 2 event anchors: assert `fired_event_ids.includes(event_id)` OR any of `xor_with` is included, AND `event_last_fired_turn[event_id] ≤ expected_week_max + tolerance`.
4. For Type 1 area bands: compute `Σ osid_areas[osid] where controllers[osid] === faction / total_area`, assert within `[min_share, max_share]`.
5. For Type 3 OSID anchors: assert `political_controllers[osid_to_settlement(osid)] === expected_controller` at the relevant turn-checkpoint.

### 5.2 CI wiring

Add `npm run test:vitest:scenario:historical-painted` (parallel to existing `:scenario:anchors`). Place the new job in the GitHub Actions workflow **after** `scenario-anchors` but before the full `scenarios` job. This keeps the lightweight Dec 1992 anchor signal first.

**Do NOT add the new test to baseline regression.** The two gates verify different things:
- Baseline regression: byte-identical determinism.
- Historical painted anchors: calibration fidelity.

A calibration tune that legitimately changes the territorial outcome will break baseline regression (intentional re-bless) but should NOT break historical painted anchors. Conversely, a determinism bug (e.g. Math.random leak) will break baseline but might leave painted anchors passing.

### 5.3 Diagnostic-only output for deferred bands

For Apr 1994 / Apr 1995 area-share bands (SCRT 65-71% / 60-67% RS proposals, currently failing by ~13-15pp) and Oct 1995 RBiH/HRHB bands (currently failing by 8-9pp), emit a **diagnostic table** in the test output reporting the delta from each proposed band — WITHOUT failing the test. The bands describe **history**, not current sim capability; promotion to PASS/FAIL waits on Issue #37 (HRHB wiring) + the 4 BB code gaps closing + a fresh painted-compare confirming the deltas have narrowed.

Suggested format:

```
[DIAGNOSTIC, NON-FAILING] Painted band deltas at w104:
  RS    proposed [65.0, 71.0]% — sim 52.5% (Δ −12.5 below floor)
  RBiH  proposed [19.0, 24.0]% — sim 36.2% (Δ +12.2 above ceiling)
  HRHB  proposed [ 8.0, 13.0]% — sim 11.3% (PASS)
```

### 5.4 New scenario file: `apr1992_definitive_156w.json`

Author as part of this plan's execution. Copy `data/scenarios/apr1992_definitive_188w.json` and change `weeks: 188` → `weeks: 156`. All other init (OOB, painted starting controllers, event registry, RNG seed) identical. Expected outcome: byte-identical state at w156 to the equivalent slice of the 188w run, modulo any path-dependent init logic (event windows, force-quality phase boundaries) — verify hash stability via a fresh 156w run compared against the n1931/188w trajectory at w156. If hashes differ, investigate the path-dependence before treating w156 anchors as canonical.

Add the new scenario to CI test runs alongside the existing 40w / 104w / 188w runs. Marginal CI cost: ~one additional scenario run (156w vs 188w runtime is ~83% of 188w, since the runner is roughly linear in turns).

---

## 6. Acceptance criteria

- All Tier 1 anchors pass against the current calibration tip (`4368f50c00c464ad`).
- New test module runs in CI under `:scenario:historical-painted` and reports PASS.
- Diagnostic-only band table for deferred metrics appears in the test output.
- No anchor reads derived-from-save state (§13.1 compliance).
- No anchor uses legacy faction IDs (§2.3 compliance).
- No anchor satisfies via `avoided_osids_by_faction` or `osid_control_overrides` (§2.4 compliance).
- Baseline regression manifest unchanged (this work is read-only against existing saves).

---

## 7. Stop gates

- **STOP if** any Tier 1 Type 2 event fails to appear in `fired_event_ids` — the event itself may not be firing, which is an event-system bug, not a calibration miss. Diagnose before adding tolerance.
- **STOP if** any Tier 1 Type 3 OSID anchor fails — investigate whether the painted file or the historian's OSID slug is the source of truth; do NOT widen tolerance to make it pass.
- **STOP if** the Jan 1993 area-share bands fail at the current tip. The SCRT painted-compare data is 4 weeks stale; if a fresh evaluation shows drift, it indicates the strict-null / H1 / sector-perf wave was not actually byte-identical and the perf-wave claim needs re-audit before any wiring.
- **STOP if** wiring requires touching any file under `src/sim/combat/` — Codex's parallel work zone is off-limits.

---

## 8. Out of scope (Tier 2 — explicit defer list)

The following anchor proposals from the five specialist memos are NOT in Tier 1. Each is gated on a named engine fix. When the engine fix lands, the anchor promotes from diagnostic-only to PASS/FAIL.

| Anchor (epoch) | Gated on | Source memo |
|---|---|---|
| Apr 1994 / 1995 area-share bands (RS / RBiH) | Issue #37 (HRHB political-goal wiring) | SCRT delta table + war-or-game §Apr 1994 |
| Oct 1995 RBiH / HRHB area bands | HV Storm spillover + joint ARBiH-HVO ops | SCRT + war-or-game §Oct 1995 |
| HVO three-pocket geometry (Vitez / Kiseljak / Žepče) Apr 1994+ | Issue #37 | war-or-game §Apr 1994 |
| Mostar east-west split Apr 1994+ | Issue #37 | war-or-game |
| All 52 Krajina-collapse OSIDs at Oct 1995 | HV Storm spillover, joint ops, 4 BB code gaps (ljeto_95, donji_vakuf_1995_op, jajce arm of mistral_2_95, juzni_potez timing) | historian §4.5 + BB extractor + war-or-game §Oct 1995 |
| All Type 5 attrition / exhaustion / displacement bands | (a) Issue #47 (exhaustion = 0); (b) Issue #39 (tempo 0.41 battles/wk); (c) enriched diagnostic emitting faction-level KIA / exhaustion / displacement / brigade trends | SCRT §Caveats |
| Goražde April 1994 NATO ultimatum as forced outcome anchor | New `nato_first_used_force` flag (canon §4 schema gate) | canon §4 + war-or-game §Apr 1994 |
| Posavina corridor open/cut state | New `corridor_state_by_faction` derivation (canon §4) | canon §1.4 + §4 |
| Velika Kladuša APWB treatment | Game-side APWB / RBiH-allied-faction policy decision | historian §0.5 |
| Kupres apr1994 flip path | BB-extractor BB1 Kupres-area chapter re-extraction | historian §5.4 |
| Bosanski Brod / Modriča / Odžak / Konjević Polje / Bratunac / Bosanska Krupa Jan-93 anchors | BB-extractor OSID slug confirmation | historian §5.3 |

---

## 9. Open questions — RESOLVED

All six §9 open questions have been resolved per `docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md`:

1. **File layout** → **Extend `historical_anchors.ts` in-place** (centralization per 2026-05-17 CI feedback-loop wave). SCRT's sibling-file proposal rejected.
2. **Apr 1994 area-share bands** → **SCRT 65-71% as diagnostic-only** (anchors describe history, not current engine capability). Promote to PASS/FAIL when Issue #37 + 4 BB code gaps + joint-ops mechanic close.
3. **Diagnostic-only reporting** → **Inline in test run.** Single source of truth, no duplicate scenario cost.
4. **Painted-map anomalies** → **Mixed**: repaint `gorazde_2` (all three late epochs) and `zepa_2` (oct95 only); APWB cut resolves `velika_kladusa_2`; defer `kupres_2` pending BB research. See §3 above.
5. **Test run cost** → **Piggyback** on existing `:scenario:anchors` runs. Add 104w to CI if not present; add 156w (newly authored).
6. **w156 snapshot mechanism** → **Author `apr1992_definitive_156w.json`** as a copy of the 188w scenario with `weeks: 156`. See §5.4. No per-week-snapshot runner feature needed.

---

## 10. Source memos (read for full citation context)

- `docs/40_reports/audits/20260521_HISTORIAN_PAINTED_TARGET_ANCHOR_PROPOSALS.md` (33 events + 162 OSID anchors with citations)
- `docs/40_reports/audits/20260521_BB_KRAJINA_COLLAPSE_ANCHORS.md` (10 HIGH + 1 MED Krajina flips with BB1 pages; 4 code-side coverage gaps)
- `docs/40_reports/audits/20260521_SCRT_PAINTED_TARGET_BAND_ANCHORS.md` (12 Type 1 + 40 Type 5 bands; 6 fails > 5pp)
- `docs/40_reports/audits/20260521_WAR_OR_GAME_ANCHOR_REVIEW_CRITERIA.md` (13-mechanic gap matrix; 10 reject patterns)
- `docs/40_reports/audits/20260521_CANON_COMPLIANCE_ANCHOR_FRAME.md` (~246 event IDs inventoried; 9 canon-violating patterns; 5 schema additions)
- `docs/40_reports/audits/20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md` (4 ops-catalog gaps, 35 orphaned OSIDs, recommended sequencing) — **see Addendum below for impact on Tier 2 gating**

---

## 11. Addendum (2026-05-21 post-ops-expert): late-war OSID gating revisited

The operations-expert memo materially changes the Tier 2 gating story. War-or-game classified all 52 Oct-1995 Krajina-collapse OSIDs as REJECT-railroad pending "HV Storm spillover" and "joint ARBiH-HVO ops" mechanics. Ops-expert demonstrates that **these mechanics are not missing in the sense war-or-game implied**:

- `src/sim/combat/hv_integration.ts` (parent-verified: file exists, `HV_CORPS_ID = 'hvo_tomislavgrad'` exported at line 38) already attaches HV brigades to `hvo_tomislavgrad` from Washington+6 weeks (~w114), making HV available for Ljeto (w168-173), Maestral (w177-178), and Juzni Potez (w181-182) **as HVO-corps brigades**. (Ops-expert memo cited a wrong subdirectory `src/sim/hv/`; actual path is `src/sim/combat/`.)
- `src/sim/combat/operation_storm_theater.ts:32` (parent-verified: `isWesternTheaterRuptured` exported here; consumed by `operation_opportunity_catalog_5th_corps.ts`, `operation_opportunity_catalog_federation_western_bosnia.ts`, `compile_turn_summary.ts`) is the canonical Storm-rupture gate already in use.
- The REAL_WAR_MASTER §1047/§1056 "joint operations" gap refers to **cross-faction RBiH↔HRHB unified-corps ops**, not what these four gaps need. Each gap is single-faction at the corps-op level.

**Implication for Tier 2**: ~35 of the 52 Krajina-collapse OSIDs from historian §4.5 are gated only on the 4 BB code gaps (bounded opportunity-catalog work), not on novel engine mechanics. Recommended sequencing per ops-expert:

1. **Donji Vakuf 1995** (ARBiH 7th Corps) — lowest risk, 10 OSIDs, reuses `vlasic_ridge_95` brigades. Only single-owner cleanup is retiring/rescoping `vlasic_ridge_95.variants[1] = bugojno_support` (3 shared OSIDs).
2. **Jajce arm of `mistral_2_95`** — 8 OSIDs. Cross-op staging concern flagged (sacred-rule §3 staging adjacency).
3. **Juzni Potez extraction from Maestral** — 6 OSIDs re-attributed (Mrkonjic Grad cluster); fixes timing-conflation that currently leaves these orphan.
4. **Ljeto 95** — 11 OSIDs (Grahovo + Glamoč). MED-risk because it would be the first `federation_western_bosnia` opportunity to NOT gate on `isWesternTheaterRuptured` (Ljeto preceded Storm). New pattern, not new mechanic.

**Necessary-but-not-sufficient warning**: even when all 4 gaps close, the sim must still **actually deliver** the OSID flips (bot launches the ops, they succeed, brigades are available, objectives are met). Current Oct-1995 painted-vs-sim shows 62% area match with HRHB −33 OSIDs and RBiH +37 OSIDs — the existing `sana_95` and `mistral_2_95` opportunities are already present but the sim is not earning their outcomes. The 4 code-gap fixes are a precondition for the OSID anchors to be *reachable*, not for them to *pass*.

**Tier 2 partition update**: the Tier 2 list in §8 should now split into:

- **Tier 2a — Ops-catalog code work** (bounded, no engine mechanic): the 4 BB gaps. ~35 OSIDs become reachable when these land.
- **Tier 2b — Engine-mechanic work**: Issue #37 HRHB wiring, Issue #47 exhaustion, Issue #39 tempo, `nato_first_used_force` flag, UNPROFOR logistics, strangle-not-capture doctrine. These remain Tier 2 in the original sense.
- **Tier 2c — Delivery audit** (bridges 2a and 2b): once the 4 ops-catalog gaps close AND any necessary bot-prioritization fixes land, re-run painted-compare against the current tip. The OSID anchors then promote from Tier 2a to Tier 1 only if the sim actually delivers them. Diagnostic-only reporting per §5.3 is the right intermediate state.

War-or-game's framing is **partially superseded** by ops-expert specifically for the 35 OSIDs covered by the 4 gaps; the rest of its 13-mechanic gap matrix (UNPROFOR, exhaustion, tempo, etc.) remains accurate.

### 11.4 APWB cut decision (2026-05-21)

The user has decided to **cut APWB's mechanical representation** rather than expand it. The two existing 5th Corps ops (Tigar-Sloboda 94, APWB Pressure 94) and the `targets_friendly_overrides` substrate primitive are scheduled for removal; the historical war-within-a-war is replaced with a two-event debuff pair (`csq_5th_corps_apwb_burden_1993` → `csq_abdic_defeated_1994`) on `arbih_5th_corps` covering w78-w125. APWB as a deep-modelled entity is parked as DLC future work.

Full scope at `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md`. Net effect on this Tier 1 anchor plan:

- §3 row 3 (Velika Kladuša anomaly) has been struck — see updated §3 row above. No anomaly under the debuff model.
- No change to any other Tier 1 anchor row.
- The APWB cut requires a baseline re-bless (debuff is intentional behavior change). When that lands, re-verify Tier 1 anchors against the new baseline before promoting to PASS/FAIL CI.
- Bihać enclave-core OSIDs (`bihac_2`, `cazin_2`) remain stable anchors; the debuff affects 5th Corps operational tempo, not enclave-core controller.
