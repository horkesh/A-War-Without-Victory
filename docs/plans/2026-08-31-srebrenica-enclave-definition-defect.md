# Srebrenica enclave definition disagrees with its own cited source — QUEUED

**Date:** 2026-08-31 · **Status:** QUEUED, not started. §6-flagged.
**Origin:** surfaced by the review of the 52w→188w desktop retarget; NOT caused by it, and
deliberately not fixed inside it.

## The defect

`ENCLAVE_DEFINITIONS['srebrenica'].osid_list` (`src/sim/combat/enclave_resilience.ts`) captions
itself *"Painted January 1993 RBiH OSIDs only"* and names the calibration painted data as its
source. Measured against `data/source/calibration/painted_control_jan1993.json`, it disagrees on
4 of the municipality's 13 painted cells:

| Cell | painted jan1993 | in `osid_list`? |
|---|---|---|
| `op:srebrenica:brezovice_2` | RS | **yes** (should not be) |
| `op:srebrenica:mala_daljegosta_2` | RS | **yes** (should not be) |
| `op:srebrenica:obadi` | RBiH | **no** (should be) |
| `op:srebrenica:osmace_2` | RBiH | **no** (should be) |

`painted_control_jan1993_improved.json` is byte-identical across `op:srebrenica:*`, so this is not a
stale-variant artifact. The omission comment at `enclave_resilience.ts:178` — *"osmace_2 omitted:
VRS captured it before Jan 1993 (painted RS in calibration data)"* — is **contradicted by the file
it cites** and must not be treated as evidence.

## Severity, honestly bounded

- **Wrongly-included cells self-neutralize.** Both live consumers enumerate the enclave faction's
  own reports (`getEnclaveSupplyState` iterates RBiH's `by_osid`; `isEnclaveContainable` requires
  membership in RBiH's `isolated_osids`), so an RS-held member drops out of both. This is why the
  defect survived unnoticed.
- **Wrongly-omitted cells have a real path.** `computeContainedOsidsForFaction` takes
  `enclave.osid_list` exclusively when non-empty, so `obadi`/`osmace_2` never enter the contained
  set and are never dropped from organic opportunity candidates in `commander/plan.ts`. Consumed in
  the live pipeline at `war_phases.ts:1341` and `:1367`, which write
  `state.political.last_contained_osids_by_faction`.
- **Bounded twice.** The containment release fires by t160 and the fall is owned by the
  `srebrenica_falls_1995` receipt, so the set is empty for the eastern enclaves throughout the fall
  window — the effect is confined to roughly t16–t160. And with 0 of 599 battles ever targeting the
  enclave, there is no evidence the path has fired. **Real in code, latent in observation.**

## Also fix in the same lane

`isEnclaveContainable`'s header still reads *"Lane 1 contract: this predicate is wired into NOTHING
that affects sim output. It feeds only the per-turn contain diagnostic."* That is false as of the
Lane V work (`computeContainedOsidsForFaction` calls it, and that reaches the pipeline). Anyone
auditing this will read the comment and wrongly conclude the predicate is inert.

## Why it is not a one-line fix

Correcting membership changes the containment set and the supply-majority tally — floor-moving
engine behaviour. It needs its own branch, its own no-move proof, and a §6 panel with a **Historian
seat**, because whether the code or the painted reference is right about the January 1993 enclave is
a historical question nobody has yet ruled on. The painted reference is itself an authored artifact
(repo memory already flags the Goražde painting as suspect), so it is not automatically ground truth.

## Related, same apparatus

Two adjacent findings worth carrying into the same review, both pre-existing:
- The enclave guard is a **vacuous pass**: `tools/verify_checkpoints.cjs:106-140` records 8 of 9
  guard cells never battle-targeted across 188 weeks, Srebrenica zero — *"'Goražde held' is
  currently indistinguishable from 'nothing ever attacked Goražde.'"*
- The fall is a **hardcoded event write** at t162, not a fought outcome.
