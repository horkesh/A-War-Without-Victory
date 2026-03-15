# Drina Region Gap Analysis — n749 (2026-03-15)

**Run**: `runs/apr1992_definitive_40w__d269e969dde43f06__w40_n749`
**Region match**: 83.9% area (100/123 OSIDs), worst of all regions
**Total mismatched area**: 1,156 km² across 23 OSIDs
**Direction**: 21 painted=RS sim=RBiH (VRS under-capture), 2 painted=RBiH sim=RS (VRS over-capture)

---

## Executive Summary

The Drina region's 83.9% area match (vs 99.6% Krajina) stems from a single systemic problem: **VRS has insufficient brigade coverage in the central and southern Drina valley**. Visegrad, Cajnice, and Rudo have zero VRS brigades homed there. Rogatica has only a Main Staff elite (exempt from sector assignment). The pre-planned operations "Operation Visegrad" and "Operation Podrinje Sweep" attempt to compensate but fail — Visegrad captured only 2/7 objectives with just 2 brigades; Podrinje Sweep captured only 1/10 objectives (the Rogatica axis failed entirely). All 21 under-capture mismatches are **empty territory** at w40 — no ARBiH unit occupies them, yet VRS never walked in.

The 2 over-capture OSIDs (Vlasenica) are minor and structurally correct — VRS 5th Podrinje Brigade is homed at `sebiocina`, so it starts RS and stays RS despite being painted RBiH (Cerska pocket remnant).

---

## Mismatch Table

Sorted by fixability category, then by area (descending).

| OSID | Painted | Sim | Area (km²) | Category | Root Cause | Proposed Fix | Est. Area Gain |
|------|---------|-----|-----------|----------|------------|--------------|----------------|
| **Rogatica cluster (327.0 km²)** | | | | | | | |
| op:rogatica:brcigovo | RS | RBiH | 115.9 | B — OOB | No VRS Rogatica Brigade in OOB; no Drina Corps unit homed in municipality. rs_1st_guards (main_staff) is exempt from sectors. Podrinje Sweep failed (0 Rogatica captures). | Add VRS Rogatica Brigade (historically existed) to vrs_drina, homed in rogatica. | ~115.9 |
| op:rogatica:varosiste_2 | RS | RBiH | 62.7 | B — OOB | Same root cause — empty territory adjacent to RS-held stara_gora but no VRS unit to occupy. | Covered by Rogatica Brigade fix. | ~62.7 |
| op:rogatica:kramer_selo_2 | RS | RBiH | 63.7 | B — OOB | Same root cause. | Covered by Rogatica Brigade fix. | ~63.7 |
| op:rogatica:kovanj | RS | RBiH | 48.6 | B — OOB | Same root cause. | Covered by Rogatica Brigade fix. | ~48.6 |
| op:rogatica:rogatica_2 | RS | RBiH | 35.7 | B — OOB | Rogatica town — VRS captured it by Aug 1992. No local VRS brigade to hold it. | Covered by Rogatica Brigade fix. | ~35.7 |
| op:rogatica:vrazalice | RS | RBiH | 0.3 | B — OOB | Trivial area, same root cause. | Covered by Rogatica Brigade fix. | ~0.3 |
| **Visegrad cluster (211.2 km²)** | | | | | | | |
| op:visegrad:velji_lug | RS | RBiH | 61.2 | B — OOB | Zero VRS brigades homed in Visegrad mun. Op Visegrad had only 2 brigades (Foca + Cajnice; JNA Uzice phantom dissolved). Captured only visegrad_2 + drinsko out of 7 targets. | Add VRS Visegrad Brigade to vrs_herzegovina or vrs_drina. | ~61.2 |
| op:visegrad:zlijeb | RS | RBiH | 53.3 | B — OOB | Same — empty territory, no VRS presence. | Covered by Visegrad Brigade fix. | ~53.3 |
| op:visegrad:medjedja_2 | RS | RBiH | 36.8 | B — OOB | Same. | Covered by Visegrad Brigade fix. | ~36.8 |
| op:visegrad:kamenica_2 | RS | RBiH | 31.0 | B — OOB | Same. | Covered by Visegrad Brigade fix. | ~31.0 |
| op:visegrad:prelovo_2 | RS | RBiH | 28.9 | B — OOB | Same. | Covered by Visegrad Brigade fix. | ~28.9 |
| **Cajnice + Rudo cluster (192.4 km²)** | | | | | | | |
| op:rudo:gornja_strmica | RS | RBiH | 87.2 | C — Bot priority | Zero VRS brigades in Rudo mun. rs_ajnie_brigade (vrs_herzegovina) homed at op:foca:prevrac covers Cajnice area but no ops target Rudo specifically. Bot strategy "Herzegovina Hold" lists rudo as target_municipality but has no local units. | Rudo is a coverage gap — either add a small VRS unit or ensure Herzegovina bot AI sends a brigade. | ~50 |
| op:cajnice:miljeno_2 | RS | RBiH | 71.3 | C — Bot priority | rs_ajnie_brigade covers Cajnice but started at Foca; joined Op Visegrad first (w0-w13) then no follow-up ops for cajnice interior. Miljeno is interior — should fall via uncontested occupation. | Check uncontested-occupation reach from rs_ajnie_brigade path. May need osid_control_override or bot priority fix. | ~50 |
| op:cajnice:todorovici | RS | RBiH | 33.9 | C — Bot priority | Same as miljeno — Cajnice interior not swept. | Same fix as cajnice:miljeno_2. | ~25 |
| **Srebrenica edge (104.8 km²)** | | | | | | | |
| op:srebrenica:sulice_2 | RS | RBiH | 38.1 | E — Structural | Enclave boundary: ARBiH 280th-284th defend aggressively. Sim enclave is slightly larger than painted target. Ops Grab (0 attacks!) and Plamen (2 attacks) failed to shrink it. | Enclave boundary is inherently uncertain. Could tune but risky — may break enclave survival. | ~10 |
| op:srebrenica:brezovice_2 | RS | RBiH | 33.7 | E — Structural | Same — enclave outer ring. Targeted by Podrinje Sweep but not captured. | Same as sulice. | ~10 |
| op:srebrenica:radovcici | RS | RBiH | 33.1 | E — Structural | Same — enclave outer ring. 5 ARBiH brigades + enclave garrison power defend. | Same as sulice. | ~10 |
| **Bratunac edge (93.8 km²)** | | | | | | | |
| op:bratunac:vranesevici | RS | RBiH | 50.1 | D — Engine | rs_1st_bratunac homed at slapasnica (RS). Op Podrinje Sweep targeted this OSID but captured 0 on Srebrenica ring axis (1/10 total). 4 VRS Drina brigades available but 0 attacks on bratunac axis — possible sector assignment or march-to-target failure. | Investigate why Podrinje Sweep srebrenica_ring axis had 0 attacks on bratunac targets. | ~30 |
| op:bratunac:zapolje_2 | RS | RBiH | 43.8 | D — Engine | Same — targeted by Plamen but not captured. Bratunac proper is RS-held (6/8 OSIDs) but these 2 southern OSIDs adjoin Srebrenica enclave. | Same investigation as vranesevici. | ~25 |
| **Gorazde edge (71.0 km²)** | | | | | | | |
| op:gorazde:kolovarice | RS | RBiH | 41.7 | E — Structural | Gorazde enclave outer ring. 7 ARBiH brigades (801st-851st) in enclave. arbih_807th homed AT kolovarice. Painted says RS but ARBiH historically held this until 1993-94 offensives. | Possible painted target error — verify if this was truly RS-held by Jan 1993. If enclave was larger initially, painted target may be wrong. | ~15 |
| op:gorazde:podkozara_donja_2 | RS | RBiH | 29.3 | E — Structural | Same — Gorazde enclave edge. | Same as kolovarice. | ~10 |
| **Vlasenica over-capture (156.0 km²)** | | | | | | | |
| op:vlasenica:pomol_2 | RBiH | RS | 81.3 | A — Data fix | Init control is RS (mun controller = RS). Painted says RBiH (Cerska pocket remnant). VRS 1st Podrinje at milici_2 and 5th Podrinje at sebiocina both in municipality. VRS captured Cerska by spring 1993 — this is post-w40 territory. | Painted target may be correct for Jan 1993 (Cerska pocket existed). But sim starts these as RS from census. Need to verify: was Cerska pocket holding pomol_2 at Jan 1993? If yes, fix init control to RBiH. | ~81.3 |
| op:vlasenica:sebiocina | RBiH | RS | 74.7 | A — Data fix | Same analysis — rs_5th_podrinje homed HERE. init_control = RS. Painted = RBiH (Cerska pocket). VRS brigade homed at this OSID means it starts RS. | If historically part of Cerska pocket, need osid_control_override to RBiH + move rs_5th_podrinje home_osid elsewhere. High risk of cascade. | ~74.7 |

---

## Summary by Category

| Category | Count | Area (km²) | % of Region | Fixability |
|----------|-------|-----------|-------------|------------|
| **A — Data fix** (painted or init control wrong) | 2 | 156.0 | 2.2% | Medium — verify Cerska pocket extent |
| **B — OOB fix** (missing brigades) | 11 | 538.2 | 7.5% | **High** — add Rogatica + Visegrad brigades |
| **C — Bot priority** (coverage gap) | 3 | 192.4 | 2.7% | Medium — bot targeting or small OOB addition |
| **D — Engine** (operation execution failure) | 2 | 93.8 | 1.3% | Medium — investigate Podrinje Sweep axis failure |
| **E — Structural** (enclave boundaries) | 5 | 175.8 | 2.5% | Low — inherently uncertain |
| **Total** | **23** | **1,156.2** | **16.1%** | |

---

## Recommended Fix Priority

### P0 — OOB additions (est. +538 km² = +7.5pp region match)

1. **Add VRS Rogatica Brigade** to `vrs_drina` corps, homed at `op:rogatica:rogatica_2` or nearby. Historically, Rogatica had a VRS brigade that participated in the town's capture (completed by August 1992). This single fix addresses 6 OSIDs / 327 km².

2. **Add VRS Visegrad Brigade** to `vrs_drina` or `vrs_herzegovina`, homed at `op:visegrad:visegrad_2`. Historically, Visegrad had a VRS brigade (later designated Visegrad Brigade). Currently the Visegrad operation relies entirely on Foca + Cajnice brigades advancing from the south — when Op Visegrad consumed them (w0-w13), no local force remained to hold/expand. This fixes 5 OSIDs / 211 km².

### P1 — Bot/coverage fixes (est. +100-125 km²)

3. **Cajnice/Rudo coverage**: Either add a small VRS Rudo detachment, or add `osid_control_overrides` for the 3 interior OSIDs (cajnice:miljeno_2, cajnice:todorovici, rudo:gornja_strmica) since the VRS historically held these from April 1992 with minimal resistance.

4. **Investigate Operation Podrinje Sweep failure**: The Srebrenica Ring axis (3 brigades: rs_1st_bratunac, rs_1st_milii, rs_1st_birac) targeted bratunac:vranesevici and bratunac:zapolje_2 but captured neither. The operation ran w15-w23 with only 1 total capture. This may be a march-to-target failure or sector assignment issue.

### P2 — Data verification (est. +80-156 km²)

5. **Verify Cerska pocket extent at Jan 1993**: `op:vlasenica:pomol_2` and `op:vlasenica:sebiocina` are painted RBiH (Cerska pocket) but init as RS (census). If the Cerska pocket historically included these OSIDs in Jan 1993, they need `osid_control_overrides` to RBiH. However, `rs_5th_podrinje` is homed at sebiocina — this would require relocating that brigade's home_osid.

6. **Verify Gorazde enclave extent**: `op:gorazde:kolovarice` and `op:gorazde:podkozara_donja_2` are painted RS but arbih_807th_muslim_liberation is homed at kolovarice. If the Gorazde enclave was larger than painted in Jan 1993, the painted targets may need correction.

### P3 — Accept as structural uncertainty

7. **Srebrenica enclave boundary** (3 OSIDs, 105 km²): The sim's enclave is slightly larger than the painted target. Tuning this risks breaking enclave survival mechanics. Accept as inherent uncertainty.

---

## Key Operation Performance

| Operation | Corps | Window | Objectives | Captured | Grade | Issue |
|-----------|-------|--------|------------|----------|-------|-------|
| Op Drina | vrs_drina | w0-w15 | 10 | 6 (60%) | Partial Success | Reasonable — Zvornik, Bratunac, Vlasenica captured |
| Op Visegrad | vrs_herzegovina | w0-w13 | 7 | 2 (29%) | Costly Stalemate | **Only 2 brigades** (JNA Uzice dissolved). Strength 4000→1787. |
| Op Podrinje Sweep | vrs_drina | w15-w23 | 10 | 1 (10%) | Solid Victory (misleading) | Rogatica axis: 0 captures. Srebrenica ring: 0 captures. Only captured godjenje_2. |
| Op Foca | vrs_herzegovina | w13-w22 | 3 | 3 (100%) | Brilliant Victory | Kalinovik fully captured — but no follow-up ops for Cajnice/Rudo. |
| Operacija Grab | vrs_drina | w23-w30 | 6 | 0 (0%) | Indecisive | **0 attacks** with 4 brigades! March-to-target or sector assignment failure. |
| Operacija Plamen | vrs_drina | w30-w35 | 6 | 0 (0%) | Pyrrhic Advance | 2 attacks, 0 captures. |

---

## Total Estimated Area Recovery

| Fix tier | Area (km²) | Cumulative match |
|----------|-----------|-----------------|
| Current | 6,004 / 7,160 | 83.9% |
| + P0 OOB fixes | +538 | 91.4% |
| + P1 bot/engine fixes | +125 | 93.1% |
| + P2 data verification | +120 | 94.8% |
| Theoretical max (all fixes) | +783 | **94.8%** |
| Structural remainder | 373 | Enclave boundaries — accept |

---

## Appendix: Brigade Coverage Map

**VRS Drina Corps** (8 brigades): All concentrated in Zvornik (2), Vlasenica (4), Bratunac (1), Sokolac (1).
**Gap**: Rogatica (0), Visegrad (0), Cajnice (0), Rudo (0), Srebrenica (0 — but that's enclave territory).

**VRS Herzegovina Corps** (8 brigades): Trebinje (1), Nevesinje (1), Gacko (1), Bileca (2), Foca (3).
**Gap**: Cajnice brigade (rs_ajnie_brigade) is homed at Foca, not Cajnice. No Visegrad or Rudo presence.

**Historical reality**: VRS Drina Corps had dedicated Visegrad and Rogatica brigades. These were critical for the April-June 1992 Drina valley sweep. Their absence from the OOB is the primary cause of the 538 km² mismatch.
