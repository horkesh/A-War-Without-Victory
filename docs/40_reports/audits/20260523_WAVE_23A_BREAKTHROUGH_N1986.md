# Wave 23A Breakthrough Audit — n1986

**Date:** 2026-05-23
**Branch:** `feature/arc-operations-calibration`
**Run:** `apr1992_definitive_188w__210e69404d054959__w188_n1986`
**Baseline:** `apr1992_definitive_188w__210e69404d054959__w188_n1985`
**Author:** scenario-creator-runner-tester

> Working note — sections will be filled in as evidence is gathered. Final
> deliverable is a ~12-18KB audit covering Mistral 1 trajectory, Grahovo
> cascade explanation, RBiH/RS deltas, residual misses, and Wave 24
> implications.

## TL;DR

- Wave 23A reordered Mistral 1 Glamoč axis for OSID adjacency.
- Σ|Δ| vs oct1995 dropped from 40 (n1985) → 28 (n1986), a 30% improvement.
- HRHB recovered +12 OSIDs; 4/4 capture on Grahovo axis despite
  SCRT's pre-run note flagging "no HRHB neighbors".
- Glamoč axis: 3/4 (stekerovci_2 remains RS); Grahovo axis: 4/4 (all four).
- Mistral 1 launched T160 (week 23 of 188); concluded T175.

## 1. Mistral 1 Glamoč Axis — Capture Trajectory

**Axis config:** staging `op:livno:misi_2` (Grahovo) and `op:duvno:tomislavgrad_2` (Glamoč). 
Glamoč axis ran with 0 brigades in `axis_summaries.brigades[]` — the axis was effectively
absorbed by the shared brigade pool of the Grahovo axis (`hv_4th_guards_split`).

**Per-OSID capture timeline (Glamoč axis, reordered for adjacency):**

| Turn | Event | Phase | Notes |
|---|---|---|---|
| 160 | Operation launch (planning) | planning | 4 brigades assigned |
| 161 | **vidimlije_2 captured** | execution | First objective in reordered list. "first_blood" + "breakthrough" notable events. Atk loss 149 K / 273 W, def loss 478 K / 876 W. Force ratio favoured attacker. |
| 162 | Glamoč axis attack | execution | 57 K inflicted / 93 K suffered — attrition reversed; defenders bloodied the attacker. |
| 163 | Glamoč axis attack | execution | 17 K inflicted / **172 K suffered** — catastrophic. |
| 164 | Idle | execution | Recovery turn. |
| 165 | Glamoč axis attack | execution | 19 K inflicted / 169 K suffered — second catastrophic loss. |
| 166–169 | Grahovo axis takes over (see §2) | execution | Glamoč axis paused. |
| 167 | **halapic captured** | execution | While Grahovo axis is attacking — likely cascade flip from Grahovo brigade approach. |
| 170 | Idle | execution | |
| 171 | **glamoc_2 captured** | execution | 0 attacks logged this turn — flip via adjacency/political_controllers cascade (see §2 mechanism). |
| 174–175 | Recovery | recovery | stekerovci_2 NEVER attempted. |

**Why stekerovci_2 stayed RS:** the axis logged `launch_blocker: recent_catastrophic_losses_at_objective`
at op end. T162/T163/T165 were the catastrophic-loss turns; stekerovci_2 was the LAST
objective in the new order (4th of 4). After three consecutive bloody no-capture rounds,
the predictor refused to launch the fourth attack — same idle-stall failure mode that
Wave 22 documented, but pushed to the tail of the queue by the reorder. So the reorder
SAVED vidimlije_2/glamoc_2/halapic (which sat earlier in the original-Cincar-order list)
at the cost of letting stekerovci_2 fall off the end.

**Baseline (n1985) comparison:** the n1985 Glamoč axis listed objectives as
`[halapic, stekerovci_2, vidimlije_2, glamoc_2]`. With halapic as first objective —
not adjacent to staging tomislavgrad_2 (3+ hops via Kupres/Glamoč interior) — the
axis recorded `total_attacks: 0, launch_blocker: no_approach_osid` and captured zero.
In n1986 the reorder put vidimlije_2 first; it IS reachable in 1 hop through Kupres
OSIDs (Kupres OSIDs are HRHB-controlled after Cincar at T132–141). Axis launched
immediately on T161, broke through, and the rest of the OSIDs flipped via
adjacency cascade (see §2).

## 2. Mistral 1 Grahovo Axis — Cascade Explanation

**SCRT pre-run claim:** "Grahovo axis had zero HRHB neighbors". Confirmed against
`data/derived/operational/operational_contact_graph.json`:

- `op:bosansko_grahovo:crni_lug` neighbours: `malesevci, ugarci, glamoc:halapic,
  glamoc:stekerovci_2, livno:gubin_2, titov_drvar:prekaja_2`
- `op:bosansko_grahovo:malesevci` neighbours: `bosansko_grahovo_2, crni_lug, ugarci,
  titov_drvar:prekaja_2, titov_drvar:sipovljani_2`
- `op:bosansko_grahovo:bosansko_grahovo_2` neighbours: `bihac:trubar, malesevci,
  ugarci, titov_drvar:drvar_2, titov_drvar:sipovljani_2`
- `op:bosansko_grahovo:ugarci` neighbours: `bosansko_grahovo_2, crni_lug, malesevci`

Initial control of all those neighbours: RS. None HRHB. SCRT was correct at T160 launch.

**Why all four captured anyway:** the operation is a single AAR with TWO axes
sharing brigade pool `hv_4th_guards_split` and (at op start) 4 brigades. The
operation framework treats objective list as a queue. Capture sequence and
mechanism per the weekly log:

| T | Captured | Mechanism |
|---|---|---|
| 161 | glamoc:vidimlije_2 | Glamoč axis attack (1 attack) — staging tomislavgrad_2 → Kupres OSIDs (HRHB after Cincar) → vidimlije_2 |
| 167 | glamoc:halapic | Captured during axis_entries → mistral_1_grahovo attack; halapic is adjacent to crni_lug AND glamoc_2/vidimlije_2/kovacevci_2/livno:gubin_2 — first cascade trigger |
| 168 | bosansko_grahovo:crni_lug | Grahovo axis attack — by T167 halapic is HRHB, and crni_lug is adjacent to halapic |
| 169 | bosansko_grahovo:malesevci | Grahovo axis attack — malesevci is adjacent to crni_lug |
| 171 | glamoc:glamoc_2 | 0 attacks this turn — pure cascade flip; glamoc_2 is adjacent to vidimlije_2 + halapic + kovacevci_2 (all HRHB by now) |
| 172 | bosansko_grahovo:bosansko_grahovo_2 | Grahovo axis attack — adjacent to malesevci (HRHB) |
| 173 | bosansko_grahovo:ugarci | 0 attacks — pure cascade flip; ugarci is fully surrounded by HRHB-controlled neighbours by T173 (recovery phase) |

**Cascade walk in adjacency terms:**

```
Cincar (T132-141): Kupres OSIDs flip HRHB
   ↓
T161 [attack]: vidimlije_2 (adjacent to kupres:donji_malovan)
   ↓
T167 [attack]: halapic (now reachable via glamoc_2 vicinity — Grahovo brigades crossed Cincar territory)
   ↓
T168 [attack]: crni_lug (adjacent to halapic)
   ↓
T169 [attack]: malesevci (adjacent to crni_lug)
   ↓
T171 [cascade]: glamoc_2 (surrounded by HRHB neighbours)
   ↓
T172 [attack]: bosansko_grahovo_2 (adjacent to malesevci)
   ↓
T173 [cascade]: ugarci (surrounded by HRHB neighbours)
```

**SCRT's pre-run analysis was correct at T160 but underestimated the chained
cascade:** the Glamoč axis breakthrough at vidimlije_2 created the first HRHB
neighbour for Glamoč/Grahovo objectives; from that single seed the network
unraveled in 12 turns. The Grahovo axis itself only logged 5 attacks (per
`axis_summaries.total_attacks: 5`), captured 4/4 of its targets, AND set the
stage for two of the Glamoč objectives to cascade-flip without contact.

**Additional non-objective cascade flips (n1985 → n1986 diff):**

The reorder caused 5 OSIDs **outside** the operation's target list to flip
HRHB through pure adjacency contagion:

| OSID | Adjacency that flipped it | Wasn't in any op |
|---|---|---|
| op:glamoc:kovacevci_2 | adj to glamoc_2 + halapic | not targeted by Mistral 1 |
| op:glamoc:pribelja | adj to vidimlije_2 + glamoc_2 + halapic | not targeted |
| op:livno:gubin_2 | adj to glamoc_2 + halapic + crni_lug | not targeted |
| op:titov_drvar:prekaja_2 | adj to crni_lug + malesevci + stekerovci_2 | not targeted |
| op:titov_drvar:sipovljani_2 | adj to bosansko_grahovo_2 + malesevci | not targeted |

Total HRHB gain from the Wave 23A reorder = 7 objective captures + 5 cascade
flips = **12 OSIDs** — matches the +12 HRHB delta reported.

## 3. RBiH Overshoot Dropped 6 OSIDs — Source

The n1985 → n1986 final-save diff shows exactly **6 OSIDs flipped RBiH → RS**:

- op:bosanska_krupa:arapusa_2
- op:bosanska_krupa:donji_dubovik_2
- op:bosanska_krupa:ivanjska_2
- op:bosanska_krupa:jasenica_2
- op:bosanska_krupa:vranjska_2
- op:visoko:gornja_vratnica_2

Five of these are clustered in **Bosanska Krupa** (Cazinska Krajina), and one
in **Visoko**. None of them are HRHB-touched OSIDs; the Mistral 1 reorder
cannot directly cause loss in Krupa/Visoko.

**Likely mechanism (correlation, not causation):** the Wave 23A reorder shifts
the brigade-pool / staging deterministic-hash inputs starting at T160. The
ARBiH 5th Corps (Bihać/Krupa) and 6th Corps (Visoko/Sarajevo) operations and
the autonomous-walk seed both depend on operation history hash state. With
Mistral 1 emitting different attacks and brigade movements starting T160, the
downstream PRNG state that drives ARBiH counter-offensive ordering and the
overshoot-walk neighbour-pick changes too.

This is the canonical **side-effect** signature documented in the
"side-effect suppression is NOT canonical resolution" feedback (memory): the
6-OSID drop in Krupa+Visoko is NOT a calibration win — it is downstream
PRNG drift. **Flag for follow-up:** track these 6 OSIDs across n1987 to see
whether the loss is stable or it was a one-shot flip.

The painted target for these 6 OSIDs:

| OSID | painted | n1985 | n1986 |
|---|---|---|---|
| op:bosanska_krupa:arapusa_2 | RBiH | RBiH (correct) | **RS (miss)** |
| op:bosanska_krupa:donji_dubovik_2 | RBiH | RBiH (correct) | **RS (miss)** |
| op:bosanska_krupa:ivanjska_2 | RBiH | RBiH (correct) | **RS (miss)** |
| op:bosanska_krupa:jasenica_2 | RBiH | RBiH (correct) | **RS (miss)** |
| op:bosanska_krupa:vranjska_2 | RBiH | RBiH (correct) | **RS (miss)** |
| op:visoko:gornja_vratnica_2 | RBiH | RBiH (correct) | **RS (miss)** |

So the RBiH "-6" is **6 painted-correct OSIDs going from match → miss**. This
is technically calibration-regressive on a per-OSID basis even though
Σ|Δ| improved. The Wave 23A net win must be balanced against this. Σ|Δ|
arithmetic: -6 RBiH overshoot reduction cancels with -6 net RS reduction
because RS gained those same 6 OSIDs as overshoot vs painted. **Bookkeeping
check:** painted RS=319, n1986 RS=313, so RS is 6 BELOW painted. Then RS
overshoot = (count of n1986-is-RS but painted-isn't) - (count of painted-RS
but n1986-isn't) = the imbalance.

## 4. RS Below Painted (−6) Explanation

Painted target: RS = 319. n1986: RS = 313. Δ = −6.

Source of the −6:
- **+6 in Krupa/Visoko** (the n1985→n1986 RBiH-to-RS flips) helps push RS *up*,
  bringing them closer to painted target in those OSIDs.
- **−12 in Glamoč/Grahovo cluster** (the Mistral 1 + cascade losses) pushes RS
  *down*, away from painted target in those OSIDs.
- Net: +6 − 12 = −6.

Is RS below painted "acceptable variance" or "new over-attrition"? The
painted oct1995 already accounts for HRHB Operations Mistral 1 / Cincar /
Maestral 2 historically taking the Grahovo–Glamoč–Šipovo–Mrkonjić Grad–Jajce
ridge. The historical line is the Šipovo–Jajce–Mrkonjić ridge; sim got the
Glamoč–Grahovo shoulder but **stopped short** of Sipovo/Mrkonjic/Jajce (still
RS in n1986 — see §5). So:

- The 7 Mistral 1 captures + 5 cascade flips = 12 OSIDs that HRHB *should*
  have per painted (per `painted_control_oct1995.json` the entire Grahovo
  and Glamoč clusters are HRHB). All 12 of those moved in the right direction.
- But Sipovo/Mrkonjic/Jajce (23 should-be-HRHB OSIDs still RS) are the
  *next* lane to attack.
- The Krupa/Visoko regression went in the wrong direction.

Verdict: **acceptable variance for this batch.** The Glamoč–Grahovo
breakthrough is a structural win; the Krupa/Visoko drift is a side-effect
that needs Wave 24 follow-up but does not invalidate Wave 23A.

## 5. Residual Deltas — Top Misses Per Faction

Total mismatches: **142 OSIDs** (570/712 match = 80.1% raw matching).
Net deltas: HRHB −8, RBiH +14, RS −6.

### HRHB residual (should-be-HRHB but isn't = 23)

The dominant residual is the **northern Krajina HRHB ridge** that Mistral 2
(target 15 OSIDs, captured 0) and Mistral 1 stekerovci_2 failed to close:

| OSID cluster | Count | Notes |
|---|---|---|
| op:jajce:* (barevo_2, bravnice, jajce_3, jezero_2, lupnica, prisoje, vinac_2) | 7 | Operation Jajce Recovery (T178-185) failed — 3 targets / 0 captured |
| op:mrkonjic_grad:* (baljvine_2, bjelajce_2, gerzovo_2, majdan_2, mrkonjic_grad_2, podrasnica_2) | 6 | Should be HRHB per painted; Mistral 2 targeted this cluster, failed 0/15 |
| op:sipovo:* (brdjani, gornji_mujdzici_2, pribeljci_2, sipovo_2, volari_2) | 5 | Mistral 2 cluster; 0 captures |
| op:glamoc:stekerovci_2 | 1 | Discussed §1 — fell off Mistral 1 queue tail |
| op:kljuc:donji_vrbljani_2 | 1 | Far-north RS interior |
| op:titov_drvar:drvar_2 | 1 | Bihać–Drvar approach — Operation Sana (T175-184) failed |
| op:stolac:pjesivac_kula_2 | 1 | Southern HRHB lane |
| op:trebinje:trebimlja_2 | 1 | Southern HRHB lane (Hercegovina) |

HRHB overshoot (15) is concentrated in the **Central Bosnia ARBiH–HVO
contact zone** (Bugojno/Travnik/Novi Travnik/Vitez/Kresevo/Kiseljak): these
should be RBiH per painted but stayed HRHB after the HRHB–RBiH war
mobilization. Tactical: HRHB took bits during the central-Bosnia hand-off
that the painted target doesn't credit them with.

### RBiH residual (should-be-RBiH but isn't = 51; IS-RBiH-but-shouldn't = 65)

Two large clusters:

1. **Bihać–Cazinska Krajina cluster** (~20 OSIDs missing): Bosanska Krupa,
   Bosanski Petrovac, Sanski Most, Bosanski Novi, Kljuc. Should be RBiH per
   painted (Operation Sana historical recovery). All still RS. Operation Sana
   (T175-184) **failed**: target 18 / captured 0. This is the Wave 24
   primary target.

2. **Eastern enclaves expansion overshoot** (~50 OSIDs):
   Gorazde/Srebrenica/Rogatica/Foca/Trnovo/Visegrad — RBiH eating safe-area
   neighbours that historically RS captured. Srebrenica especially shows
   12+ overshoot OSIDs including srebrenica_2 itself painted as RS.
   These are the **autonomous-walk eating** the post-Srebrenica RS interior.

### RS residual (should-be-RS but isn't = 68; IS-RS-but-shouldn't = 62)

Mirror of the RBiH overshoot list. The 68 should-be-RS missed are the
eastern-Bosnia interior that RBiH walked into. The 62 wrongly-RS includes
the 23 HRHB-residual OSIDs (Jajce/Mrkonjic/Sipovo/Drvar) plus the Krupa
cluster from §3.




