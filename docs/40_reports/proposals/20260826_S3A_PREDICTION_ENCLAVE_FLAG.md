# S3a PREDICTED LOSS SET — enclave column displacement, flag ON

**Committed BEFORE the measured run, per decision rule S3a. Anything added after the run's hash is
known is not a prediction and must be marked as such.**

- **Baseline (flag OFF):** `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n373`
  commit `3806ef08d`, `git_dirty: false`, `final_state_hash 536ca5f72c2bd269`,
  checkpoints **697 / 673 / 667 / 643**.
- **Run B (flag ON):** same commit, same scenario, `AWWV_ENCLAVE_COLUMN_DISPLACEMENT` unset
  (default-ON as of `2dfe6f4e7`). **Only the flag differs.**
- **Author of the prediction:** calibration/scenario-tester seat. Orchestrator is the implementer and
  did not set the bands.

---

## The prediction

**P1 — PRIMARY.** `control_delta.json` is **byte-identical** to the flag-OFF baseline. Zero cells
move. All four checkpoints unchanged at 697 / 673 / 667 / 643.

**P2 — EXPECTED LOSSES: NONE.** If any cell moves it must lie in eastern Bosnia adjacent to the
Srebrenica/Žepa source cells — `op:srebrenica:*`, `op:bratunac:*`, `op:vlasenica:*`, `op:rogatica:*`.
**A moved cell in western Bosnia, Posavina or Herzegovina falsifies the mechanism, not the
prediction.**

**P3 — LIVENESS (S2 positive control, MANDATORY).** The six defenders' personnel at **t162/t164**
must be **lower** than baseline, and the casualty ledger must differ. The fall turns must be
unchanged: Srebrenica **t162**, Žepa **t164**, `mechanism: 'event'`.

**P4 — NEGATIVE CONTROL: the Bihać pocket holds RBiH at all four checkpoints**, `op:bihac:bihac_2`
included.

**P5 — SECOND NEGATIVE CONTROL (erasure detector).** The 280th–284th reach 1,500 by ~t178 as in
baseline. **If they also end at 1,500 with the flag on, the flag's formation-state effect was erased
by replacement and P1's inertness is uninformative** — that must be reported explicitly, not banked
as a pass.

## Acceptance criterion

- **PASS** = `control_delta.json` byte-identical **AND** the casualty ledger differs at t162/t164
  **AND** the nine-cell guard passes with two-sided falls **AND** P4/P5 hold.
- **INVESTIGATE** = `control_delta` byte-identical **but the ledger is also identical** ⇒ the flag did
  not fire, and the green is false. Byte-identity alone is exactly what you get from a flag that never
  ran; **P3 is part of the criterion, not a nicety.**
- **FAIL-TO-S4** = `control_delta` differs ⇒ drop to the S4 bands, with P2's geography test as the
  discriminator.

## Why Bihać and not Goražde is the control

The orchestrator nominated Goražde. **The seat replaced it, and the reasoning is the point:** a
negative control must be *sensitive* to the wrong mechanism it is nominated to detect. Measured over
188 weeks in n294:

| enclave | battles | attacker wins | defender casualties | capture-capable attacks |
|---|---:|---:|---:|---|
| **bihać pocket** | **7** | **4** | **561** | **yes (2 non-probe)** |
| goražde | 3 | **0** | 97 | 0 |
| teočak | 2 | 0 | 158 | **0 — both probes** |
| srebrenica | 6 | 3 | 1,120 | yes |
| žepa | **0** | 0 | 0 | none |
| sarajevo core | **0** | 0 | 0 | none |

Goražde is attacked three times in 188 weeks and **never loses a battle**. If the mechanism
over-applied to every enclave-tagged brigade, Goražde would still hold — nobody is pressing it. It
cannot detect the failure it was nominated for. **Bihać is the only enclave under live,
capture-capable pressure that the attacker actually wins at**, so it is the only cell where a wrongly
weakened defender converts into lost territory. Goražde is retained as an assertion, not as the
control.

## Why inertness is the honest expectation

Measured, naming-independently, from `brigade_temporal_log.jsonl` (the battle `attacker_brigade` /
`defender_brigade` fields name one brigade over a stack, and `attacker_brigades` /
`defender_contributions` are absent from **0 of 585** battle records with the stack flag off — so the
battle log cannot answer this and was the wrong instrument):

- The last **named** battle involving any of the six is **t47**, not t160.
- **Four of the six take personnel losses at t162/t164 with zero named battles at those turns** — the
  falls themselves. So flag-OFF did **not** mean "no casualties at the fall"; reduced casualties were
  already applied.
- Five of the six then **refill to the 1,500 tier cap by ~t178** at roughly +70/turn, and **none is
  ever destroyed** (`status: active`, `lifecycle_status: null` at t188).

⇒ The 28th Division stands at full establishment at t188 **not because no casualties were applied,
but because the replacement path refills them at no cost** — the A1 defect, operating inside a fallen
enclave 26 weeks after Srebrenica. The units garrisoning a fallen Srebrenica are at maximum strength.

⇒ **Two independent reasons the flag cannot reach the map:** the six never fight after w47, and the
reinforcement path erases any strength delta within ~16 turns.

## Caveat carried from the seat, self-flagged

The seat's offline replay of the dissolution pass against n294 **predicted four dissolutions that did
not occur** (`hrhb_herceg_stjepan` t88, `hrhb_106th_bosanska_posavina` t128/t132,
`hrhb_104th_bosanski_brod` t180 — all `status: active` at t188). There is therefore at least one guard
in the real lifecycle path the offline model lacks. **Treat P3 and P5 as hypotheses the run
adjudicates, not as computations it confirms.** The battle-count and personnel-trajectory figures
above are direct artifact reads and are unaffected.
