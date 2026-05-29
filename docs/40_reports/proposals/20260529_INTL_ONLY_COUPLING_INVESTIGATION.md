# `intl_only` Coupling — Polarity & Magnitude Investigation (read-only)

## 1. Trigger

Track B War-or-Game review issued a **NO-GO** on the Phase E `intl_only` flag, reading the
J1 simulator's Tier 2 `control_delta.json` for `intl_only × apr1992_52w` as a **flag-ON-vs-flag-OFF
comparison** showing "122 OSID cascade, net RS +85, RBiH −62, HRHB −23." The reviewer flagged this
as the *inverse* of the intended mechanic: a flag that makes RS hesitate (intl_standing < 30 → 0.7×
op-launch eligibility) appearing to make RS **gain** 85 OSIDs (Zvornik, Vlasenica, Višegrad, Drina
enclaves falling to RS) looked like a sign-inverted coupling bug.

This doc traces (a) the control_delta polarity, (b) the consumer arithmetic sign, (c) whether the
sign is inverted, and (d) the magnitude. **Investigation + recommendation only — no code, data,
baseline, or scenario-run changes.** The Tier 2 scratch artifacts from the Track B session were
still on disk and are cited directly.

- **Doc relationship:** Companion to `20260529_PHASE_E_ACTIVATION_RECOMMENDATION_POSTMERGE.md`
  (Track B) §3 + §9 (War-or-Game hand-off). This doc resolves the War-or-Game open question on
  whether the territorial drift direction is a bug.
- **Roles:** Gameplay Programmer + Scenario Creator Runner Tester (joint, read-only).

## 2. control_delta polarity — DEFINITIVE

### 2.1 The control_delta is WITHIN-RUN (initial → final), NOT flag-ON-vs-flag-OFF

The single most important finding. `control_delta.json` is produced by
`computeControlDelta(initialControlSnapshot, finalControlSnapshot)`
(`src/scenario/scenario_runner.ts:2969`). The function signature is
`computeControlDelta(before: ControlKey[], after: ControlKey[])`
(`src/scenario/scenario_end_report.ts:107-110`), where:

- `before` = the run's **initial** control snapshot (≈ April 1992, post-peace-phase start state),
- `after` = the run's **final** control snapshot (week 52 end state).

`net_control_count_delta = after − before` per controller
(`scenario_end_report.ts:182-191`: seeds the map with `after` counts, then subtracts `before`).

So in the `intl_only` artifact (`_phase_e_simulator_tmp/intl_only/apr1992_52w/control_delta.json`):

| Controller | before (init) | after (wk52) | delta | meaning |
|---|---|---|---|---|
| RS | 289 | 374 | **+85** | RS expanded 289→374 OSIDs over the 52-week war |
| RBiH | 319 | 257 | −62 | RBiH contracted 319→257 |
| HRHB | 104 | 81 | −23 | HRHB contracted 104→81 |

(`control_delta.json:998-1040`). `total_flips: 122` is the count of OSIDs whose controller changed
between init and final **within this single run** (`control_delta.json:1040`).

**This is NOT a comparison against the flag-OFF baseline.** The "+85 RS" means *RS gained 85 OSIDs
over the course of the war in the intl_only run* — i.e. the historical 1992 Serb land-grab. It does
**not** mean "intl_only caused RS to gain 85 OSIDs relative to flag-OFF."

### 2.2 How the J1 simulator actually detected drift — by HASH, not by territorial delta

The J1 simulator (`tools/diagnostics/phase_e_activation_simulator.ts`) never computes a
flag-ON-minus-flag-OFF territorial delta. Its Tier 2 path:

1. Runs each combo's scenario (`defaultTier2Runner`, lines 451-471),
2. **sha256-hashes** each artifact file (line 468),
3. compares the hash to the committed manifest baseline (`compareHashes`, lines 426-446),
4. classifies any drift in `control_delta.json`/`formation_delta.json`/etc. as `BOT-MILITARY`
   (`classifyDriftSignal`, lines 402-424).

The tool reports that the `intl_only` run's `control_delta.json` **hash differs** from the OFF
baseline's `control_delta.json` hash → `DRIFT` → `BOT-MILITARY`. That is a correct, real signal:
the intl flag *did* change bot military behavior enough to alter the within-run flip set. But the
**+85 / 122 numbers are the intl_only run's own initial→final trajectory**, not the magnitude of the
ON-vs-OFF difference. The Track B doc reported them as the drifted artifact's contents (accurate),
but the War-or-Game reading of "+85 = the flag's territorial effect" is a **misattribution**.

### 2.3 Corroboration — the OFF-equivalent and cohesion_only runs show the SAME RS expansion

The flag-OFF baseline's full `control_delta.json` is not on disk (the manifest stores only hashes,
not artifact bodies — `data/derived/scenario/baselines/manifest.json` is the only baselines file).
But the sibling `cohesion_only` Tier 2 artifact IS on disk and is decisive corroboration
(`_phase_e_simulator_tmp/cohesion_only/apr1992_52w/control_delta.json:1038-1080`):

| Controller | cohesion_only before | after | delta | intl_only delta |
|---|---|---|---|---|
| RS | 278 | 365 | **+87** | +85 |
| RBiH | 327 | 267 | −60 | −62 |
| HRHB | 107 | 80 | −27 | −23 |
| total_flips | | | **128** | 122 |

Two independent flag combos both show RS expanding ~+85/+87 and ~122/128 within-run flips. The
~85-OSID RS gain is the **war's baseline trajectory present in every run** (the historical Serb
1992 territorial conquest — RS ends the war controlling ~half the country). It is not produced by
either sub-flag. The *true* effect of intl_only relative to OFF is the difference between the OFF
run's delta and the intl_only run's delta — and since cohesion_only (a different flag) is within
~2 OSIDs of intl_only, the genuine per-flag ON-vs-OFF territorial swing is on the order of a
**handful of OSIDs**, not 85.

## 3. Consumer arithmetic — sign verdict: **CORRECT (not inverted)**

### 3.1 The helper

`getIntlStandingOpsHesitationMultiplier(intlStanding)`
(`src/sim/combat/sector_offensive.ts:244-252`):

```
if (typeof intlStanding !== 'number') return 1.0;
if (intlStanding < 30) return 0.7;   // INTL_STANDING_OPS_HESITATION_THRESHOLD=30, _MULTIPLIER=0.7
return 1.0;
```

(threshold `=30` at line 256, multiplier `=0.7` at line 261.) Lower standing → multiplier **0.7**.

### 3.2 The consumer

`buildOperations` in `src/sim/combat/commander/emit.ts:855-875`:

```
const hesitationMult = getIntlStandingOpsHesitationMultiplier(
    briefing.political_dimensions?.international_standing);          // 0.7 when intl<30
const cohesionMult   = getCohesionCautionBiasMultiplier(...);       // 1.0 in intl_only combo
const combinedMult   = hesitationMult * cohesionMult;               // 0.7
const effectiveMinForOp = combinedMult !== 1.0
    ? Math.ceil(baseMinForOp / combinedMult)                        // ceil(2 / 0.7) = ceil(2.857) = 3
    : baseMinForOp;                                                 // baseMinForOp = 2 (anchored sector)
if (participatingBrigades.length < effectiveMinForOp) {
    return ops;                                                     // op NOT launched
}
```

(`baseMinForOp` set at emit.ts:845: `primarySector ? 2 : MIN_BRIGADES_FOR_PLAN`.)

### 3.3 The math is in the intended direction

- The multiplier is applied as `Math.ceil(baseMinForOp / combinedMult)` — a **division**.
- With `combinedMult = 0.7 < 1.0`, the effective brigade-count floor **rises**: `2 → ceil(2.857) = 3`.
- A *higher* `effectiveMinForOp` means **fewer** plans clear the `participatingBrigades.length <
  effectiveMinForOp` gate → **fewer ops launch**.
- This is exactly the intended "30% more hesitant to launch offensives" semantic. The division
  (not multiplication) is the correct operator for a *threshold-raising* hesitation: `baseMin /
  0.7` raises the bar; `baseMin × 0.7` would have *lowered* it (the inversion the reviewer feared).

**Verdict: the coupling SIGN is CORRECT.** Lower international_standing → higher launch threshold →
fewer offensives. There is no division/multiplication inversion. The comment at emit.ts:233-234
("scales the `minForOp` threshold upward by `1/mult` when hesitation is active") matches the code.

The faction selection is also correct (Track B §2.2): on current main RBiH intl=77.60 (≥30 →
mult 1.0, spared), RS=0.00 and HRHB=8.63 (<30 → mult 0.7, hesitant). So RS and HRHB are the
factions whose op-launch is *suppressed* — which is the intended asymmetry.

## 4. Cascade analysis — the RS-gains-despite-hesitating paradox

Given §2 (control_delta is within-run, +85 is the war's baseline trajectory) and §3 (sign correct),
the puzzle "RS hesitates yet gains territory" largely **dissolves**: RS was always going to expand
~+85 in this scenario. But there is a genuine, smaller second-order effect worth naming, because the
intl_only run's flip *set* does differ (by hash) from OFF — and the documented cascade explains the
direction of that difference.

### 4.1 Attrition-sink-escape cascade (documented precedent)

`docs/life_lessons/calibration.md` documents this mechanism repeatedly:

- **R29 / Op Prsten krivajevici removal:** "Removing objectives that VRS was failing to capture
  (attrition-sinks) frees brigades from futile combat earlier → cascade disruption … +9 correctly
  placed / +2.7pp area — the largest single-run gain of the calibration arc."
- **R28 / Op Sana 95:** a brigade *marching toward a staging OSID* during a stalled op "vacated the
  bosanska_krupa defensive sectors → VRS captured 6 correctly-placed RBiH OSIDs. Net −6."
- **General rule (2026-05-26):** "Is the OSID … sim=correct faction? … VRS is *failing* to capture
  it → it's an attrition sink → UNSAFE to remove, will free brigades from futile combat → cascade
  disruption."

The mechanism: when a faction launches **fewer** offensives, its brigades are **not consumed/pinned
in futile attacks**. Freed brigades stay in or redeploy to defensive sectors, or the *enemy*
brigades that would have been pinned defending against those offensives are themselves freed. Either
way the territorial outcome can shift in non-obvious directions — including the *suppressed* faction
holding/gaining more, because its forces aren't bled in attrition sinks.

For `intl_only`: RS + HRHB hesitate → fewer RS/HRHB offensives → RS brigades not bled in futile
attacks → RS holds its historical gains more firmly and the flip set shifts. This is **fully
consistent** with the documented attrition-sink-escape cascade. It is the same class of effect as
R29/R28, expressed through the op-launch gate instead of through objective removal.

### 4.2 Is 122 flips "consistent" or "anomalously large"?

122 is **not** the cascade magnitude — it is the within-run flip count of the intl_only run, and
cohesion_only's is 128, and the OFF baseline's is almost certainly in the same ~120-130 band (the
war flips ~120 OSIDs init→final regardless). The cascade-attributable difference is the *delta of
flip sets* between ON and OFF, which from the ON-vs-ON proxy (intl_only 122 vs cohesion_only 128, RS
+85 vs +87) appears to be **single-digit-to-low-double-digit OSIDs** — entirely consistent with the
R28/R29 cascade scale (−6, +9, −17). There is **no anomalously large cascade.** The "122-OSID
cascade" framing is an artifact of reading a within-run total as an ON-vs-OFF delta.

## 5. Magnitude assessment — is 0.7× / threshold-30 mis-scaled?

**No evidence of mis-scaling.** Reasoning:

- The flag does **not** move ~17% of the map (122/712). That figure was the misread. The genuine
  per-flag territorial effect (ON-vs-OFF) is on the order of a handful of OSIDs (§4.2).
- A 30% launch-hesitation expressed as `ceil(2/0.7)=3` raises the anchored-sector floor from 2→3
  brigades — a meaningful but bounded brake (it does not block ops outright; a 3-brigade op still
  launches). For the non-anchored fallback, `baseMinForOp = MIN_BRIGADES_FOR_PLAN`, so
  `ceil(MIN_BRIGADES_FOR_PLAN / 0.7)` raises that floor proportionally. The brake is "soft" exactly
  as the helper docstring intends (sector_offensive.ts:231, 261).
- Threshold 30 is historically grounded and robust on current main (RBiH 77.60 spared with +47.6
  headroom; RS/HRHB clearly below) — Track B §4.1 already confirmed this.

The one **legitimate** open concern (separate from the polarity question) is the one Track B already
raised in §5.2/§7: intl_only is *not* baseline-neutral and *does* shift bot military behavior on the
52w run (BOT-MILITARY hash drift is real). That is an activation-coordination matter (requires a
baseline refresh + calibration sign-off), **not** a sign bug and **not** a magnitude mis-scale.

## 6. Verdict

| Question | Verdict |
|---|---|
| control_delta polarity | **Within-run init→final.** "+85 RS" = RS expanded 289→374 over the war (historical trajectory), NOT a flag-ON-vs-OFF delta. |
| Is the coupling sign inverted? | **NO.** `effectiveMinForOp = ceil(baseMinForOp / 0.7)` *raises* the launch threshold → *fewer* ops. Division is correct; sign is correct (emit.ts:870-872). |
| Is the 122-flip "cascade" anomalous? | **NO.** 122 is the within-run flip total (cohesion_only=128; OFF ≈ same band). True ON-vs-OFF effect is single-digit-to-low-double-digit OSIDs, consistent with R28/R29 attrition-sink-escape scale. |
| Is 0.7× / threshold-30 mis-scaled? | **NO.** The brake is soft and bounded; threshold 30 is robust and historically grounded. |
| War-or-Game NO-GO justified? | **Partially.** The *sign-inversion-bug* rationale is **withdrawn** (no bug). The *not-baseline-neutral / needs-sign-off* rationale **stands** (Track B §5.2). |

## 7. Recommendation (NOT executed)

1. **Withdraw the "sign-inverted coupling bug" finding.** There is no bug. Do not "fix the sign" —
   the division is correct. Any edit flipping `/` to `×` would *invert* the mechanic into the
   pathology the reviewer feared. **Owner: no action / Gameplay Programmer sign-off on this verdict.**

2. **Correct the Track B / War-or-Game interpretation note.** The "122-OSID cascade, RS +85"
   should be annotated as a *within-run trajectory*, not a flag effect. The honest activation
   signal is the J1 tool's `BOT-MILITARY` *hash* drift, whose magnitude must be measured by
   **diffing flip sets ON-vs-OFF** (Track B §6 Q5 already scoped this follow-up).
   **Owner: scenario-creator-runner-tester** — produce an ON-vs-OFF flip-set diff (run OFF + intl_only,
   diff the two `control_delta.json` flip arrays) so the *true* per-flag territorial magnitude is
   quantified before any activation. This is the magnitude probe Track B §6 Q5 deferred.

3. **Keep the activation-gating posture from Track B unchanged.** intl_only remains a *conditional
   GO* requiring calibration sign-off + baseline recanonicalization (Track B §5.2). This
   investigation does not change that; it only removes the false "it's a bug" blocker.
   **Owner: calibration team + user (activation decision).**

4. **No threshold/multiplier change recommended.** 30 / 0.7 are sound. **Owner: n/a.**

## 8. Cross-references

- Track B recommendation (trigger): `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_RECOMMENDATION_POSTMERGE.md` §3, §5.2, §6 Q5, §9
- J1 simulator (drift = hash compare, not territorial diff): `tools/diagnostics/phase_e_activation_simulator.ts:402-471`
- control_delta polarity (init vs final): `src/scenario/scenario_runner.ts:2969`; `src/scenario/scenario_end_report.ts:107-191`
- Helper (sign/threshold/multiplier): `src/sim/combat/sector_offensive.ts:244-261`
- Consumer arithmetic (division, threshold-raising): `src/sim/combat/commander/emit.ts:845-875`
- intl_only artifact (RS 289→374, 122 flips): `data/derived/scenario/_phase_e_simulator_tmp/intl_only/apr1992_52w/control_delta.json:998-1040`
- cohesion_only corroboration (RS 278→365, 128 flips): `data/derived/scenario/_phase_e_simulator_tmp/cohesion_only/apr1992_52w/control_delta.json:1038-1080`
- Attrition-sink-escape cascade precedent (R28/R29, removal-frees-brigades rule): `docs/life_lessons/calibration.md`
