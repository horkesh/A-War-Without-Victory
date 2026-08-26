# Retreat-absorption asymmetry — why the VRS cannot take ARBiH ground

**Status:** MEASURED FINDING. Nothing implemented, nothing proposed. **Panel matter — see §6.**
**Date:** 2026-08-24
**Found:** during a pre-check on a calibration queue item, after an objective addition failed for a
reason nobody had modelled.

---

## 1. THE MECHANISM

`src/sim/combat/attack_morale_absorption.ts` decides whether a *won* battle actually transfers the
OSID. Three ways a defender can refuse:

```ts
const capitalLastStand      = isEnclaveCapital(targetOsid);                      // absorbs all but decisive
const homelandLastStand     = defenderFaction === 'RBiH' && coEthnicShare >= 0.50; // absorbs victory + costly, ANY morale
const professionalResilience = defMorale >= resistFloor
                            && (outcome === 'costly_victory' || outcome === 'victory');
```

Floors (`combat_math.ts:305`): **RBiH 50 · RS 55 · HRHB 60**.
Decisive threshold: `VICTORY_THRESHOLD_DECISIVE = 2.0` (`combat_math.ts:124`).

An absorbed battle also applies `MORALE_ABSORPTION_CAS_MULT = 1.6` extra casualties **to both sides**.

---

## 2. THE MEASUREMENT

Baseline run `…w188_n1` (commit `cd0228c37`, `git_dirty:false`, 639/712, hash `cc88344e922ac8b4`):

| faction | floor | active brigades | **above floor** | absorbs a won battle |
|---|---|---|---|---|
| **RBiH** | 50 | 132 | **132** | **100%** |
| RS | 55 | 65 | 23 | 35% |
| HRHB | 60 | 42 | 26 | 62% |

Median morale at t188: **RBiH 97 · RS 42 · HRHB 90.**

**It is not a late-war artifact.** At turn 0, **84 of 84** RBiH formations are already above the
floor (median 60 against a floor of 50). The condition holds from the first turn to the last.

### What that means operationally

- **To take ANY RBiH-held OSID, an attacker needs `decisive_victory` — power ratio ≥ 2.0.** Ordinary
  and costly victories are absorbed 100% of the time.
- **To take RS-held ground, an ordinary victory suffices in ~65% of cases**, because RS morale (42)
  sits below its own floor (55).

**The `homelandLastStand` co-ethnic rule is nearly redundant in practice.** It adds "at any morale",
but RBiH morale never falls below the floor, so `professionalResilience` already covers every RBiH
formation. The co-ethnic clause only matters if RBiH morale ever collapses — which it does not.

---

## 3. WHAT IT EXPLAINS

### 3.1 The RS brigade-destruction asymmetry (previously unexplained)

Project memory carries `rs_brigade_destruction_asymmetry_engine_flaw` — *"ARBiH corps 0% permanent
loss vs RS 61-63% at 188w, root mechanism not yet found."* The same baseline shows
`destroyed_brigades`: **RS 25 · HRHB 4 · RBiH 0.**

This is the same asymmetry seen from the other side. RBiH holds the ground it wins battles on and
holds the ground it loses battles on; RS holds only what it wins decisively. **A candidate root
mechanism for a finding that has been open without one.**

### 3.2 A concrete, traced instance

An objective was added to the 1992 Zvornik sweep. The VRS attacked it three times at t7-t9 and
**won all three** (`power_ratio` 2.00 / 1.62 / 1.92, `attacker_won: true`). `control_events` for that
OSID: **zero**. Three absorbed wins then tripped `max_failures` and aborted the whole operation two
turns early, which re-rolled the 188-week emergent-operation schedule and cost −10 matched OSIDs in
thirteen municipalities, none of them near the target. Reverted; see the ledger entry of the same date.

### 3.3 It silently ends a calibration queue

A seven-item objective queue was screened against this rule **after** the failure. Six of seven
targets sit behind it:

| target | blocker |
|---|---|
| `op:bratunac:pobudje_2` | 99.2% co-ethnic |
| `op:trnovo:delijas` | 87.4% |
| `op:trnovo:kijevo_2` | 77.8% |
| `op:trnovo:trnovo` | 66.0% |
| `op:foca:brusna_2` | 64.9% |
| `op:kladanj:vucinici_2` | 0% co-ethnic, but defender at **morale 100** — absorbs anyway |

**Only one of seven survives.** These are not objective-list problems. They are combat-power problems
wearing objective-list clothing, and no amount of catalog editing will move them.

---

## 4. THE PRE-CHECK THIS PRODUCES — mandatory, static, no run required

Before adding or repointing **any** objective:

1. **Defender faction × morale vs floor** (RBiH 50 / RS 55 / HRHB 60). Above floor ⇒ needs
   `decisive_victory` (ratio ≥ 2.0).
2. **RBiH defender × `coEthnicShare` ≥ 50%** ⇒ needs decisive **at any morale**.
3. **`isEnclaveCapital(osid)`** ⇒ absorbs everything except decisive.

If the operation cannot plausibly reach ratio 2.0 against that defender, the objective is a **casualty
pump and an abort trigger**, not a gain. Listing it is strictly worse than omitting it.

---

## 5. WHAT IS NOT ESTABLISHED

- **Whether the rule is wrong.** It may be correctly modelling ARBiH tenacity. Its own comment records
  a defensible intent: *"ARBiH didn't retreat from their villages — they stood and died, and VRS paid
  in blood for every meter."* This document measures behaviour; it does not rule on design.
- **Whether the floors or the morale trajectories are the mis-scaled half.** RBiH median morale 97 vs
  RS 42 is itself a large asymmetry, and it is upstream of this rule. Fixing absorption without asking
  why RBiH morale never degrades may just move the problem.
- **The size of any calibration effect.** No change has been run.

---

## 6. ⚠ THIS IS A PANEL MATTER, NOT AN IMPLEMENTER'S

The cheap way to make these OSIDs capturable is to weaken or condition the absorption rules. **That
is a change to how the simulation represents Bosniak civilians and soldiers defending their villages,
and it must not be made as a calibration convenience.**

It is also entangled with a live §6 referral: `docs/40_reports/proposals/20260824_S6_REFERRAL_ZVORNIK_HOMELAND_ABSORPTION.md`
establishes, on ICTY trial-chamber findings, that one OSID held by this rule contains **Petkovci** — a
July 1995 execution site inside the VRS Zvornik Brigade's area of responsibility — and that the engine
holds it as ARBiH ground for the whole war. The rule's input is the **1991 census share**, which in
that municipality is what the 1992 operation was conducted to eliminate.

**Route any proposed change through the Pyrrhic panel under `SENSITIVE_HISTORY_DESIGN_GATE.md`.**
This document proposes none.

---

## CORRECTION 2026-08-26 — the baseline citation in §2 is wrong

**Raised by the scenario-tester/calibration seat during the RE engine-integrity panel; independently
verified by the orchestrator against the run artifacts.**

§2 above cites its baseline as **`…w188_n1` (commit `cd0228c37`, `git_dirty:false`, 639/712, hash
`cc88344e922ac8b4`)**. That identifier does not exist and the figures do not belong together:

- **There is no `w188_n1` run directory in the repo.**
- Hash `cc88344e922ac8b4` belongs to
  `runs/apr1992_definitive_188w__9e902ad68783fbe7__w188_n273/run_summary.json` — commit `99bc0cf62`,
  which scored **637/712, not 639**.

Everything in §2 and §3.1 that rests on that run — the 132/132-RBiH-above-floor table, the 100%
won-battle absorption figure, the 0/25/4 destroyed-brigade counts, and the 97/42/90 morale medians —
is therefore **provenance-broken and must be re-derived before being cited again**. The clean
four-checkpoint baseline available today is
`runs/apr1992_definitive_188w__0589220209545186__w188_n294` (commit `180695239`, `git_dirty:false`,
hash `4714d66780640887`, 677/664/664/650).

**The mechanism described in §1 is unaffected** — it was read from source, not from a run.

Two further corrections from the same panel, recorded here because this report is where readers look:

1. **The absorption picture in §1 is incomplete in a way that matters.** `attack_morale_absorption.ts`
   has a **morale-independent** branch above `professionalResilience` — `homelandLastStand`
   (`defenderFaction === 'RBiH' && coEthnicShare >= 0.50`) — and `decisive_victory` is excluded from
   **all three** absorb branches (Engine Invariants §9.6: *"decisive_victory ALWAYS flips — no
   exception"*). On the clean run, **74 of 95 RS-vs-RBiH wins are decisive**, and 60 of 585 battles
   have no defender formation at all, so absorption's `if (defenderFormation)` never runs. Absorption
   is materially narrower than "the VRS cannot take ARBiH ground".
2. **"RBiH 0 brigades destroyed" is a history violation, not only an engine anomaly.** The 28th
   Division's 280th-284th Brigades and the 28th Mountain Battalion ceased to exist at Srebrenica in
   July 1995; the Cerska-Kamenica pocket was stormed in Feb-Mar 1993; and at Bihać in Sept-Oct 1993
   the 521st and 527th Brigades **defected virtually wholesale** to Abdić, with parts of the 503rd,
   504th and 517th following — the equivalent manpower of three to four brigades permanently removed
   from the ARBiH order of battle by political collapse. The true count is nowhere near zero.

This report is source evidence, not implementation authority. The
[lean RE plan](../plans/2026-08-26-engine-integrity-plan.md) owns generic retreat routing and
dissolution triage only; absorption redesign remains unapproved.
