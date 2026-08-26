# §6 REFERRAL — the enclave guard has never been capable of failing

**Date:** 2026-08-26
**Referred by:** orchestrator, from the RE engine-integrity review
**Status:** REFERRAL. Nothing implemented. No scenario run. The panel rules; per CLAUDE.md the
enclave guard is the panel's to decide and it does not escalate this on its own.
**Panel:** Historian · scenario-tester/calibration · Engine-systems · Red-team. Implementer excluded.
**Evidence:** `tools/hooks/floor_vs_dissolution.ts` (this referral's diagnostic) and the frozen
[RE discovery record](20260826_ENGINE_INTEGRITY_DISCOVERY_RECORD.md) §3.8/§3.11. The lean RE plan
does not pre-authorize the referred mechanic.

---

## 1. THE FINDING — MEASURED, reproducible in ~2 seconds

`node_modules/.bin/tsx tools/hooks/floor_vs_dissolution.ts`

`brigade_dissolution.ts` dissolves an ordinary brigade on **2 of 3**, and an **enclave-tagged brigade
on 3 of 3**:

```
personnel < T_personnel   |   cohesion <= T_cohesion   |   morale <= T_morale
```

`cohesion_drift.ts` clamps cohesion **up** to a per-faction floor, unconditionally, and that pass runs
**before** the dissolution pass in the same turn. So wherever `floor > T_cohesion`, no surviving
brigade of that faction can ever satisfy the cohesion criterion.

**Measured across the shipped timeline — 27 of 27 faction/turn pairs are UNREACHABLE:**

```
turn        RBiH              RS               HRHB
   0    35 vs  20  UNREACH   35 vs  20 UNREACH   40 vs  20 UNREACH
  39    56 vs  20  UNREACH   35 vs  15 UNREACH   40 vs  20 UNREACH
  80    62 vs  20  UNREACH   20 vs  15 UNREACH   30 vs  20 UNREACH
 188    62 vs  20  UNREACH   20 vs  15 UNREACH   30 vs  20 UNREACH
```

**It holds from turn 0, for all three factions, every turn of the war.**

### Two consequences

1. **Ordinary dissolution has silently degraded from 2-of-3 to 1-of-2** —
   `personnel < 400` **AND** `morale <= T`. (`MORALE_OVERRIDE_ENABLED` defaults false, so the fourth
   path is off.)
2. **★ AN ENCLAVE-TAGGED BRIGADE CAN NEVER DISSOLVE.** It needs 3 of 3 and one is impossible — at any
   personnel, any morale, any turn, in any scenario.

⇒ **Goražde, Bihać, Teočak and the Sarajevo core "holding" is arithmetically guaranteed, not
emergent.** The enclave guard has been passing because it *cannot fail*.

### And the instrument is one cell wide

`tools/verify_checkpoints.cjs:88` — the tool the project uses to assert the guard:

```js
const GUARD = [['Teocak', 'op:ugljevik:teocak_krstac_2', 'RBiH']];
```

**One OSID.** Goražde, Bihać, the Sarajevo core, and the Srebrenica/Žepa *falls* are not checked —
while that file's own header (`:17`) states it checks that Srebrenica and Žepa fall. `process.exit`
fires on Teočak alone.

---

## 2. WHY THIS IS THE PANEL'S, NOT AN IMPLEMENTER'S

The guard enforces canon **H1.8**. Two independent reasons it must be ruled rather than patched:

**(a) Every §6 pass that relied on the guard is a vacuous pass.** The 0h vacuous-guard class — green
while asserting nothing — is living inside the §6 enclave guard itself. The panel should decide what
that does to the project's §6 record, not the implementer who found it.

**(b) FIXING IT COULD BREACH THE GUARD.** This is the crux. Restore the cohesion criterion and
enclave brigades become dissolvable — **so Goražde, Bihać or Teočak could fall, which is exactly what
the guard forbids.** The defect and the guard point in opposite directions. Someone has to rule on
which wins.

**Note the asymmetry the panel should reason about:** the *falls* the guard requires (Srebrenica,
Žepa) are **event-owned** under H1.8 — `apply_effects.ts` writes `lifecycle_status: 'destroyed'`
directly, so they are unaffected by this defect. The *holds* are the half that is currently
guaranteed by arithmetic rather than by defence. **The guard's two halves are enforced by completely
different mechanisms, and only one of them is real.**

---

## 3. WHAT THE PANEL IS ASKED TO RULE

**Q1 — Is the vacuity itself a §6 finding, and what is the disposition of past passes?**
Ordinary §6 verdicts are COMPLIANT / NON-COMPLIANT. Does a guard that could not fail make prior
"§6 PASS" records void, provisional, or unaffected?

**Q2 — Which wins: the criterion or the guard?** Three dispositions, and the panel may name a fourth:
- **(A) RESTORE the criterion.** Enclave brigades become dissolvable; the guard becomes a real gate
  that can genuinely fail. Historically defensible — enclave formations *were* destroyed — but it can
  breach a guard that has never been tested.
- **(B) KEEP enclave 3-of-3 as intentional protection**, and document it as **modelled canon** rather
  than letting it stand as an accident that looks emergent. Honest, and cheap, but it makes the guard
  permanently unfalsifiable by design.
- **(C) SPLIT** — restore the criterion for ordinary brigades (fixing the 2-of-3 → 1-of-2 defect)
  while keeping the enclave rule explicitly protective and documented.

**Q3 — Is extending `verify_checkpoints.cjs` from one OSID to eight required before any further §6
claim is made?** The plan treats it as a blocking condition; the panel owns whether the evidence
suffices.

**Q4 — Does the ordinary-brigade half (1-of-2) touch §6 at all,** or is it plain engine correctness
that can proceed without the panel?

---

## 4. WHAT IS *NOT* BEING ASKED

- **Not** a request to reopen the faction cohesion floors. The owner ruling of 2026-08-12 stands and
  is not in question. This is about a *different* consumer of the floored value.
- **Not** a proposal to weaken `attack_morale_absorption`, which is separately governance-gated.
- **Not** a territory or calibration proposal. No fix is specified; no run is requested.

---

## 5. DECLARED IMPLEMENTER BIAS

The orchestrator found this while re-ranking its own plan and is therefore biased toward **(A)** —
"restore the criterion, it is a defect" — because that reading makes the finding important. **(B) is
the cheaper and possibly more honest answer** and the panel should weigh it without deference.

Relevant history: this same review already produced a hypothesis about `readiness` that was promoted
to a plan prerequisite and then falsified with 232 counter-examples. **The seats' record against this
orchestrator is strong; poll independently and attack.**

---

## 6. REPRODUCTION

```bash
node_modules/.bin/tsx tools/hooks/floor_vs_dissolution.ts   # exits 1, prints the 27/27 table
git show HEAD:tools/verify_checkpoints.cjs | sed -n '86,92p' # the one-cell GUARD
git show HEAD:src/sim/combat/brigade_dissolution.ts | sed -n '125,175p'  # 2-of-3 and the enclave 3-of-3
```

---

# ★★ CORRECTION — ISSUED MID-POLL, 2026-08-26. READ BEFORE RULING.

**The Engine/Systems seat refuted this referral's central mechanism claim. The orchestrator
independently confirmed the refutation at source. §1 above is WRONG in a way that matters, and the
correction is issued to every seat mid-poll rather than after, because three seats are ruling on it
now.**

## What is wrong

**"The clamp is unconditional" — FALSE. "An enclave brigade CAN NEVER dissolve" — FALSE.**

Three escape paths, all reachable, all confirmed by the orchestrator at HEAD:

1. **`cohesion_drift.ts:139` — `if (engagedSet.has(id)) continue;`** The clamp is **skipped entirely
   for every formation engaged in combat this turn**, and the module header says so. Combat writes
   cohesion *down* immediately before (`COHESION_ATTACKER` repulsed −8 / catastrophic −15;
   `COHESION_DEFENDER` decisive −15). **So an engaged brigade reaches the post-combat dissolution
   pass carrying an unclamped, combat-reduced value.**
2. **`morale_drift.ts:306` — `f.cohesion = Math.max(0, cohesion − 2)`** when morale is below the
   critical threshold. That step runs at `war_phases.ts:3151`, **after** the clamp at `:3143` and
   **before** dissolution at `:3182`. Post-clamp, pre-dissolution, unconditional.
3. **Kind mismatch.** `cohesion_drift.ts:142` accepts `'brigade' | 'operational_group'`;
   `brigade_dissolution.ts:124` accepts `'brigade' | 'og'`. OGs are created as `kind: 'og'`.
   **An OG is dissolvable and never clamped.** A plain bug, and separable from every §6 question here.

**Empirically, the clamp does not dominate:** on the t39 save, **4 of 221 active brigades sit BELOW
their faction floor** (`arbih_244th_mountain` 48/56, `arbih_286th_mountain` 48/56,
`arbih_9th_muslim_liberation` 52/56, `rs_2nd_banja_luka_light_infantry` 33/35).

## What survives

**But 0 of 221 sit at or below the dissolution threshold**, because the floor-to-threshold gap
(36pp RBiH, 20pp RS at t39) exceeds any single-turn decrement (max −15), and the clamp restores on
the first unengaged turn.

⇒ **The correct claim is "EFFECTIVELY UNREACHABLE IN PRACTICE", not "arithmetically impossible".**
The referral's *conclusion* stands — the criterion is not doing work, and the guard has not been
tested. Its *mechanism* was wrong, and **the fix follows from the mechanism, so this changes what
disposition (A) would even mean.**

## A SECOND arithmetic guarantee the referral missed — and it is §6-material

**`LAST_STAND_COHESION_MIN = 40`** (`battle_resolution.ts:126,581`). The RBiH floor is ≥42 from turn
13 and ≥56 from turn 39. **So a surrounded RBiH brigade takes the last-stand branch ALWAYS and the
surrender branch NEVER** — a second enclave guarantee, independent of dissolution, that no seat had
found. Surrender is degraded the same way: `SURRENDER_COHESION_MAX = 15` sits below *every* faction
floor at *every* turn.

**Consequence for the panel: disposition (B) as written is INCOMPLETE.** Documenting the dissolution
guarantee while leaving `LAST_STAND_COHESION_MIN` undocumented re-creates the identical defect one
door down. **(B) must cover both or it is not (B).**

## Two more corrections to the referral's framing

- **Q4 is answered NO: the ordinary half is NOT separable from the enclave half.** `lowCohesion` is
  computed **once** (`brigade_dissolution.ts:170`) and both paths read it; only `requiredCriteria`
  differs. The ordinary fix necessarily changes the enclave predicate's input. **It does not proceed
  without the panel.** The only genuinely separable item is the kind mismatch.
- **Disposition (A) is strictly dissolution-INCREASING for every faction, never neutral.** Today
  `criteriaCount = lowPersonnel + lowMorale`, requiring **both**. Making cohesion reachable adds two
  new 2-of-3 combinations. Fewer defenders, more OSID flips. Territory-moving, requiring a 188w
  **and a paired threshold re-tune the referral did not cost in.** The crux — that fixing this could
  breach the guard — is *more* live than stated, not less.

## And the fall assertion in Q3 must be two-sided

Extending `verify_checkpoints.cjs` is mechanically trivial, but a **hold** is "== want at all four
checkpoints" while a **fall** is a *transition*. Asserting `== 'RS'` at all four is historically
wrong (Srebrenica is RBiH until ~w168); asserting only at w188 passes a scenario where the cell was
never RBiH — **vacuous in exactly the way this referral is about.** Correct form: **RBiH at w104 and
w156 AND RS at w188.**

## A fourth disposition is now on the table

**(D) — fix the two items carrying no §6 content, then rule.** (i) the `'og'`/`'operational_group'`
kind mismatch; (ii) extend the guard to eight cells with two-sided fall assertions. **Then** take
A/B/C with a working instrument.

> The Engine seat's argument for (D), which the orchestrator adopts as well-founded: **ruling A or B
> today means ruling without the instrument that would tell you whether the ruling was right — which
> is the same failure mode as the vacuous guard itself.**

**Seats may still rule A, B or C.** (D) is added to the ballot, not substituted for it.

## Orchestrator's note on its own referral

The referral overstated its mechanism in the direction that made the finding look bigger — the same
bias §5 declared, expressed in the evidence rather than in the recommendation. **Treat §1's
"arithmetically guaranteed" language as retracted; the measured 27/27 table and the one-cell GUARD
are unaffected and remain exactly as stated.**

---

# §6 PANEL — RESULT. SPLIT VERDICT + ONE BLOCK ⇒ ESCALATES TO THE OWNER.

**All four seats reported. Polled independently; no seat saw another's answer.**

| seat | §6 verdict | blocking | disposition |
|---|---|---|---|
| Engine / Systems | **NON-COMPLIANT** (on evidence) | no | **(D)** — fix the no-§6-content items, then rule |
| Historian | **NON-COMPLIANT** | **YES** | **(C)** + a fourth item the referral did not offer |
| Calibration / scenario-tester | **COMPLIANT** | no | **(D)** = (B) + make the guard real |
| Red team | **COMPLIANT** | no | **(D)** then (C) |

**2 NON-COMPLIANT / 2 COMPLIANT, and one BLOCK.** Per CLAUDE.md a split verdict *or* a block
escalates. This does both. **It is the owner's.**

---

## ★★ THE FINDING THAT RESOLVES THE SUBSTANCE — found after the poll closed

The seats split on whether the engine's *order of battle* is a §6 matter. The Historian measured that
Srebrenica and Žepa fall territorially in the correct window **while all six defending brigades stand
at `status: active`, five at exactly 1,500 personnel — full establishment — with morale up to 100,
two of them still inside Srebrenica municipality four months after the fall.** Against the record:
~2,700 survivors reconstituted, ~3,200 unaccounted for, the victims ICTY-documented.

Calibration and Red-team ruled COMPLIANT on the ground that H1.8 constrains **territory**, not
formation lifecycle — falls are authored, and they fired in the right window.

**Both are right, and the resolution is neither a canon change nor a new mechanism.**

`apply_effects.ts` — `applyEnclaveFormationDisplacement`, line 174:

```ts
const raw = process.env.AWWV_ENCLAVE_COLUMN_DISPLACEMENT;
if (raw !== 'true' && raw !== '1') return;   // default OFF => byte-identical no-op
```

**The mechanism that applies casualties to the enclave defenders is BUILT, PANEL-REVIEWED, SPEC'D —
AND DEFAULT-OFF.** In every calibration run it is a no-op. That is precisely why the 28th Division is
alive at establishment.

And it is built *correctly*, to the record:
- **Srebrenica** — `reconstitute_as: 'reduced'`: survivors take `casualty_fraction` losses and reform
  at the destination. The column reached Tuzla; 2,700 reconstituted. **Matches BB.**
- **Žepa** — `'none'`: personnel zeroed, `status: 'inactive'`, **`lifecycle_status: 'destroyed'`**.
  Forcible deportation. **Matches ICTY (Tolimir).**
- Casualty split is execution-skewed (55% killed / 5% wounded / 40% missing-captured), explicitly
  *not* the battle-calibrated split, and the comment records the §6 reasoning: victim-side
  consequence only, the perpetrator gains nothing.

⇒ **The Historian's C-3 — "the fall event must destroy the defending formations" — is ALREADY
IMPLEMENTED. It is switched off.** The referral's claim that `apply_effects.ts` writes
`lifecycle_status: 'destroyed'` was correct, but only on the `'none'` branch and only when the flag is
on. The Historian's observation that no enclave formation carries that value is fully explained.

⇒ **This reduces the panel's central disagreement from a canon question to a FLAG DECISION.**

---

## What all four seats agree on, despite the split

**The instrument is broken and no further §6 claim may rest on it.** Unanimous, from four seats that
disagree on the verdict. The Red-team seat enumerated **five independent layers, every one failing
open**, all in `tools/verify_checkpoints.cjs` at HEAD:

1. the cohesion arithmetic (the referred finding);
2. `GUARD` is **one OSID** of the eight the file's own header claims;
3. the western-Bosnia cascade block is **print-only** — builds a string, prints it, no comparison, no
   threshold, no exit path;
4. **the four checkpoint scores are NON-GATING** — `process.exit(breached ? 1 : 0)` and `breached` is
   set by the Teočak loop alone, so a run can lose forty OSIDs at every checkpoint and exit 0;
5. and the one live cell is one **nothing attacks** — `pre_planned_operations.ts:186` says Teočak is
   *deliberately not an objective*, `enclave_resilience.ts:265` calls it a *"CALIBRATION-PIN (not a
   true enclave)"*, and Calibration measured its only two attacks in 188 weeks were **both probes**,
   which cannot flip control by construction.

**That is the finding to record — not the arithmetic.** A guard nobody could fail, inside an
instrument that exits 0 on everything except a cell no attack is aimed at.

**Disposition (D) is effectively unanimous:** fix the instrument first, touching no engine code. You
cannot evaluate any of A/B/C with an instrument that checks one OSID.

---

## Corrections to the referral, from the seats — recorded because it was mine

1. **"The clamp is unconditional" — FALSE.** `cohesion_drift.ts` skips every formation *engaged in
   combat this turn*, and a `kind` mismatch (`'og'` vs `'operational_group'`) leaves live OGs
   unclamped and dissolvable.
2. **"Ordinary dissolution degraded 2-of-3 → 1-of-2" — FALSIFIED.** Calibration measured **37 rows at
   or below the cohesion threshold across 21 brigades, all three factions**. The criterion is live
   and fires. **There is no ordinary-brigade defect**, so Q4's answer is that there was nothing to
   separate.
3. **The mechanism I named is the wrong one.** Enclave brigades are protected by the *combat-decrement*
   clamp (`attack_post_battle_effects.ts:174-177`, `COMBAT_COHESION_FLOOR_CAP = 35`), **not** by the
   drift clamp the referral names. **Load-bearing: a fix aimed at the drift clamp would leave the
   guard exactly as vacuous and would measure a delta that means nothing.**
4. **Morale is an independent second barrier.** `arbih_285th_light` (Žepa) is personnel-low on 186 of
   188 turns and cohesion-low on **0** — permanently **1-of-3**, not 2-of-3.
5. **The enclave headline survives** — enclave brigades really cannot dissolve — **but by a different
   argument than the one referred.**
6. **`enclave_resilience.ts:5` is factually wrong** and should be corrected regardless of disposition:
   it lists *"enclaves that historically held despite isolation: … Srebrenica, Žepa …"*. **They did
   not hold.** The rationale sentence justifying the whole protection names as examples the two
   enclaves that fell.

---

## Q1 — disposition of past §6 records: **PROVISIONAL, not void.** Three seats concur.

Calibration replayed all eight cells against `n294`: the six holds hold at every checkpoint, and
**Srebrenica and Žepa fall between w156 and w188 — the correct July 1995 window.** The recorded
conclusions were substantively right; only the evidence was missing.

**Named class to annotate: 9 occurrences in `PROJECT_LEDGER.md` and 3 in `CALIBRATION_MASTER.md`** —
including the RC collapse packet's "full Section 6 pass" and the SRK strangle "§6 all PASS".
**Annotate, do not delete and do not silently re-bless:** one line at each site recording that the
enclave-guard evidence was Teočak only, and that the other seven cells were verified retroactively
against `n294` on 2026-08-26 and hold.

---

## ★ AND THE FINDING THE PANEL WAS NOT CONVENED ON, which may matter more

Calibration's acceptance test — "held" vs "never pressed" — **does not pass today**:

| enclave | battles as defender | capture-capable attacks |
|---|---:|---|
| Goražde | 3 | 3 |
| Bihać | 7 | 2 |
| **Teočak** | 2 | **0 — both probes** |
| Srebrenica | 6 | 6 |
| **Žepa** | **0** | 0 |
| **Sarajevo core** | **0** | 0 |

**Žepa and the Sarajevo core are attacked zero times in 188 weeks. Teočak faces no capture-capable
attack at all.** Three of six holds are currently held by *absence of pressure*, and the one cell the
guard checks is one of them.

---

## THE OWNER'S DECISION

**D1 — the flag.** `AWWV_ENCLAVE_COLUMN_DISPLACEMENT` is default-OFF, and that is why Srebrenica's
defenders survive at establishment. Turn it on? It is behaviour-changing (a 188w), and it is the
difference between an engine that says the fall cost the ARBiH nothing and one that says what the
record says.

**D2 — the split.** Historian blocks any further §6 PASS claim until either the defenders die at the
fall, or the panel rules on the record that an engine in which the 28th Division survives Srebrenica
at full establishment is §6-compliant. Two seats ruled exactly that, on the ground that H1.8 governs
territory. **D1 may dissolve this**: if the flag goes on, the block's condition is satisfied and the
question is moot.

**D3 — (D) first, unanimous.** Fix the instrument — eight cells, two-sided fall assertions, a real
threshold and exit code on the cascade block, checkpoint scores made gating. No engine change, no run,
no §6 risk. **Every seat supports this and it is a precondition for ruling on anything else.**
