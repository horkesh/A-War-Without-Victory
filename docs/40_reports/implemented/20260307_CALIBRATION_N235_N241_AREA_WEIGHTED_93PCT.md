# Calibration: n235→n241 — Area-Weighted ATH 89.2% → 93.6%

**Date:** 2026-03-07
**Run ID:** n241 (`apr1992_definitive_40w__024b4776f64c7a22__w40_n241`)
**Baseline:** n235 — 89.2% area-weighted (647/744 count = 87.0%)
**Result:** n241 — 93.6% area-weighted (684/744 count = 91.9%)
**Net gain:** +4.4pp area-weighted, +4.9pp count

---

## Summary

- Systematic override expansion across 6 regions lifted area-weighted ATH from 89.2% (n235) to 93.6% (n241), the highest calibration score in the project to date.
- 98 total RS control overrides applied (up from ~46 in n235); 3 RS avoided_osids maintained.
- Butterfly-effect discipline: iterative batching with rollback when cascades exceeded gains. Four cascades detected and reverted (n232, n237, n239 partial, n240).
- Key finding: avoided_osids cannot fix **consolidation-captured** over-captures — they only affect combat targeting. Consolidation cascades require enclave mechanics, not scenario-level workarounds.

---

## Iteration Log

| Run | State | Area-wt | Key change |
|-----|-------|---------|------------|
| n235 | Baseline | 89.2% | 46 overrides, zepa_2 avoided |
| n236 | +32 safe cells | 91.5% | CENTRAL_BOSNIA +6.5pp, DRINA +1.3pp, POSAVINA_NE +1.4pp |
| n237 | +HRHB cells | 92.3% | KRAJINA +8.1pp; POSAVINA_NE -9.9pp, SARAJEVO -9.3pp — CASCADE |
| n238 | n236 + KRAJINA-only | 93.6% | KRAJINA 97.8%; stable everywhere else |
| n239 | n238 + bijeljina/breza/doboj | 93.6% | POSAVINA_NE +1.1pp; CENTRAL_CORRIDOR -1.2pp |
| n240 | n239 + avoided_osids | 92.8% | SAJREVO +8.2pp; POSAVINA_NE -12.2pp — CASCADE |
| n241 | n239 (confirmed) | 93.6% | Deterministic hash match — LOCKED |

---

## Changes Made

### File: `data/scenarios/apr1992_definitive_40w.json`

Added 52 new RS control overrides across six regions. Total overrides grew from ~46 to 98.

#### Batch A — 32 safe cells (n236, all painted=RS / sim=RBiH)

**CENTRAL_BOSNIA (15 cells):**
- `donji_vakuf`: donji_vakuf_2, oborci_2, prusac_2, torlakovac_2
- `jajce`: jajce_3, jezero_2, kruscica, vinac_2
- `kladanj`: kladanj_3, staric_2
- `olovo`: gurdici_2
- `konjic`: ljuta
- `kalesija`: seher_2
- `travnik`: gornje_krcevine

**KRAJINA (2 cells):** kotor_varos:prisocka_2, kotor_varos:vrbanjci_2

**POSAVINA_NE (7 cells):**
- `zvornik`: donja_kamenica, drinjaca, novo_selo, paljevici
- `brcko`: krepsic, skakava_donja
- `ugljevik`: jasikovac

**CENTRAL_CORRIDOR (4 cells):** ilijas:dragoradi, ilijas:krivajevici, ilijas:medojevici, ilijas:sirovine

**DRINA (3 cells):** bratunac:zapolje_2 (moved from avoided_osids), foca:miljevina_2, gorazde:kolovarice

**HERZEGOVINA (3 cells):** gacko:bahori, gacko:gacko_2, nevesinje:sopilja

#### Batch B — KRAJINA HRHB cells (n238, 12 cells)

High-impact KRAJINA cells held by HRHB in sim, historically VRS:
- `banja_luka`: dragocaj, potkozarje_3
- `kotor_varos`: jakotina, kotor_varos_2
- `mrkonjic_grad`: baljvine_2
- `skender_vakuf`: donji_koricani
- `bosanska_gradiska`: mackovac
- `teslic`: kamenica_2
- `kljuc`: hadzici, kljuc_2, krasulje_2
- `sanski_most`: ilidza_2

#### Batch C — POSAVINA_NE safe cells (n239, 6 cells)

- `bijeljina`: bijeljina_2, janja_2
- `bosanski_samac`: samac_2
- `ugljevik`: srednja_trnova_2
- `breza`: podgora
- `doboj`: makljenovac

#### Avoided_osids change

- Removed `bratunac:zapolje_2` from avoided_osids (moved to overrides)
- Retained: `zvornik:vitinica_2`, `ugljevik:teocak_krstac_2`, `rogatica:zepa_2`

---

## Scenario Results (n241)

### Area-Weighted by Region

| Region | n235 | n241 | Delta |
|--------|------|------|-------|
| KRAJINA | 89.4% | 97.8% | +8.4pp |
| POSAVINA_NE | 92.7% | 94.0% | +1.3pp |
| DRINA | 91.9% | 92.7% | +0.8pp |
| CENTRAL_CORRIDOR | 87.4% | 92.1% | +4.7pp |
| CENTRAL_BOSNIA | 83.5% | 90.7% | +7.2pp |
| SARAJEVO | 78.1% | 80.3% | +2.2pp |
| HERZEGOVINA | 91.7% | 93.9% | +2.2pp |
| **OVERALL** | **89.2%** | **93.6%** | **+4.4pp** |

### Remaining Mismatches (60 cells)

**Consolidation over-captures (unfixable at scenario level):**
- DRINA: gorazde:glamoc/kamen/sopotnica, foca:mazlina, srebrenica:luka_2/bostahovine_2, vlasenica:pomol_2/sebiocina
- SARAJEVO: trnovo:delijas/tosici, pale:podgrab
- POSAVINA_NE: zvornik:rastosnica_2, brcko:bukvik_gornji_2, gracanica:gracanica_2, lukavac:gnojnica, tuzla:simin_han_2

**Combat over-captures (bot over-extension):**
- CENTRAL_CORRIDOR: maglaj:jablanica/kosova_2, visoko:gornja_vratnica_2, zavidovici:cardak_2/hajderovici_2, tesanj x2
- CENTRAL_BOSNIA: bugojno:brizina/prijaci, hadzici x4, kladanj:olovci_2, konjic x3

**Under-captures (HRHB-held, painted=RS):**
- CENTRAL_BOSNIA: jajce:barevo_2/divicani_2/lupnica, travnik:paklarevo, odzak:bosanski_samac/potocani_2
- DRINA: cajnice x3
- HERZEGOVINA: kupres:kupres_2, livno:zastinje

**Small persistent under-captures (sim=RBiH):**
- KRAJINA: bosanska_gradiska:gradiska_3, bosanska_krupa:arapusa_2
- CENTRAL_BOSNIA: donji_vakuf:jemanlici/korenici, konjic:glavaticevo_2
- DRINA: rudo:gornja_strmica
- HERZEGOVINA: nevesinje:hrusta_2

---

## Lessons Learned

### Cascade Pattern (confirmed)

1. **Safe batch** (painted=RS, sim=RBiH, ARBiH defensive): Adding these as RS overrides is stable. ARBiH won't counterattack, RS holds them. No butterfly effects in general.

2. **Risky batch** (painted=RS, sim=HRHB): Adding RS overrides in HRHB-held territory frees VRS to push elsewhere. Adding ALL HRHB cells at once (n237) caused POSAVINA_NE -9.9pp and SARAJEVO -9.3pp. **Solution:** add only isolated KRAJINA HRHB cells, not jajce/travnik/odzak HRHB cells.

3. **avoided_osids cannot fix consolidation**: Cells surrounded by RS-controlled territory consolidate to RS regardless of avoided_osids. tuzla:simin_han_2 and zvornik:rastosnica_2 are still sim=RS with avoided_osids because their neighbors are all RS. This requires enclave mechanics (game design change), not scenario config.

4. **avoided_osids redirect combat effort**: Adding 7 avoided targets (n240) caused POSAVINA_NE -12.2pp because VRS redirected attacks to gracanica/lopare/lukavac instead. Net -0.8pp overall. Confirmed: avoided_osids does not reduce VRS aggression — it just aims it differently.

5. **Butterfly effect spatial locality**: Changes in KRAJINA (kljuc x3) caused new bosanska_krupa over-captures (cazin:mrazovac, jezerski_2, otoka_2). Changes to bijeljina caused CENTRAL_CORRIDOR redistribution. Changes to cajnice caused POSAVINA_NE cascade in n232. Spatial proximity is not a reliable predictor — distant regions can cascade.

6. **Self-correction**: Several HRHB cells (jajce:barevo_2/divicani_2/lupnica, travnik:paklarevo) alternately appear/disappear across runs without those cells being in overrides, based solely on VRS bot sector assignments changing. Do not add overrides for cells that self-correct.

### Calibration Ceiling

93.6% appears to be the practical ceiling for scenario-level overrides in the current mechanics. The ~40 remaining mismatches require:
- Enclave/holdout mechanics for Goražde/Srebrenica/Žepa (architecture change)
- HRHB-to-VRS transition mechanics for Jajce/Travnik (game design change)
- VRS aggression caps to prevent Tuzla basin over-extension (bot tuning)
- Sarajevo siege mechanics (trnovo consolidation cascade root)

---

## Files Changed

| File | Change |
|------|--------|
| `data/scenarios/apr1992_definitive_40w.json` | +52 RS control overrides, removed zapolje_2 from avoided_osids |

---

## Next Steps

1. Engine-level fixes for persistent over-captures:
   - Enclave/holdout mechanic for Goražde, Srebrenica, Žepa, Bihać
   - VRS aggression model to prevent Tuzla basin overextension
   - Trnovo consolidation cascade root (foca/kalinovik surrounds)
2. HRHB-to-VRS transition: Jajce fell to VRS October 1992 — requires bot or event mechanic
3. Run 52w scenario with these overrides applied (for full-war calibration check)
4. Consider cajnice cells (batotici, miljeno_2, todorovici) one-at-a-time to probe cascade risk
