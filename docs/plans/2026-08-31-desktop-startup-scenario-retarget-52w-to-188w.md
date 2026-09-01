# Desktop startup scenario retarget, 52w → 188w — IMPLEMENTED 2026-08-31

**Status:** DONE. Record kept only for the corrections below; the authoritative account is the
`docs/PROJECT_LEDGER.md` entry of 2026-08-31.

## What shipped

`startup_snapshot.ts` and `desktop_sim.ts` repointed to `apr1992_definitive_188w.json`; startup
snapshot rebuilt; `startNewCampaign` sets `meta.autonomy_level = 1`; recruitment-delegation
threshold moved `>= 2` → `>= 1`. See the ledger entry for the full surface and verification.

## Two corrections to the ORIGINAL version of this document

Both were errors in the scope as first written. They are recorded because either one, copied
forward, would reproduce a failure this repo has already paid for.

**1. It cited the floor as "matched 639, anchors 31/31". The whole single-number framing is dead.**
Not "639 should have been 638" — 638 is itself a superseded 2026-08-12 figure, and quoting it
repeats the same mistake one step later. Per the ★ CURRENT RE/CALIBRATION AUTHORITY header
(2026-08-27) in `CALIBRATION_MASTER.md`:

- The gate is **four checkpoints**, not a terminal figure. `data/calibration/engine_health_thresholds.json`
  carries `{jan1993 694, apr1994 648, apr1995 642, oct1995 622}`, added by hand because reading only
  the terminal number meant "a change could regress jan1993 by 20 OSIDs and pass green".
- The current clean-provenance reference is the probe-lane closing run
  `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n382`, hash `d71ff4ef4063f2ee`, reading
  **jan1993 695 · apr1994 674 · apr1995 668 · oct1995 652**. It **does not satisfy RE-0 S0** — Node
  24 not 22, and a single run rather than two byte-identical ones.
- **Cite the full directory name.** The `nNNN` suffix is not unique; a different `n382` (scenario
  hash `205b3676c8fe3ce4`) already appears in that file from an unrelated series.
- "31/31 anchors" is a contract under RE-0D2 repair, so citing it cites a known false-green.

**Never quote a calibration figure from memory, and do not assume the last correction you read is
the current one — read the authority header first.**

**2. Its "188w byte-identical no-move proof" was a tautology, not a safety proof.**
The change touches no engine code and no 188w scenario data, so path A was never at risk — the run
would prove only that something unaltered did not alter. Meanwhile the player path, which is the
only thing the change affects, went unmeasured. A validation step must measure the thing that
changed. (Compounding this: `tools/verify_checkpoints.cjs:106-140` records that 8 of 9 enclave-guard
cells are never battle-targeted across 188 weeks, so an enclave-guard pass is vacuous and must never
be cited as §6 clearance.)

Neither run was executed at the time: calibration was paused until RE-0 S0 and no current run satisfied it. **RE closed 2026-09-01 and calibration is open again — this constraint no longer applies.**

## Queued, not done

The review that produced this change surfaced a larger, separate defect in the Srebrenica enclave
apparatus. It is NOT fixed here — correcting it changes enclave membership, which changes the
containment set and the supply-majority tally, which is floor-moving engine behaviour and belongs on
its own branch with its own proof. See `docs/plans/2026-08-31-srebrenica-enclave-definition-defect.md`.
