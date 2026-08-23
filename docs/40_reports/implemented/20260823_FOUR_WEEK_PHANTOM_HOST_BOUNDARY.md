# Four-Week Phantom Host Boundary

**Date:** 2026-08-23  
**Branch:** `codex/four-week-phantom-boundary`  
**Status:** Implemented, locally measured, independently reviewed, and green in remote CI

## Outcome

The four unresolved HV rows in `baseline_ops_4w` and `noop_4w` were caused by premature creation, not by assignment failure. The runner began those synthetic scenarios without an authored formation OOB, but `spawnJnaPhantomBrigades` still created four 1992 HV task groups whose host, `hvo_southeast_herzegovina`, did not exist during the four-week window.

Phantom spawning now requires both a non-phantom military substrate and the phantom's authored host-corps formation. `jna_herzegovina_command` is the sole exception because the existing startup contract intentionally synthesizes that command after its subordinate JNA phantoms spawn.

## Executable evidence

The regression first failed against the old behavior with 22 phantom formations in the supposedly formation-empty startup. Its corrected contract proves three live boundaries:

- `apr1992_4w` contains conventional formations and spawns historical phantoms (positive control);
- `noop_4w` starts with no formations;
- after four turns, eligible JNA phantoms exist (positive control), but every live phantom has its host command present.

The focused phantom unit suite separately proves that an empty military world stays empty, that phantoms with present hosts still spawn, and that the 1992 HV group waits until `hvo_southeast_herzegovina` exists.

## Calibration measurement

One code change was measured. The complete baseline comparison produced:

- `apr1992_188w`: 0/8 artifact mismatches;
- `apr1992_52w`: 0/8 artifact mismatches;
- `baseline_ops_4w`: 7/8 artifact mismatches;
- `noop_4w`: 7/8 artifact mismatches.

Both changed four-week scenarios were rerun independently and were byte-identical to the first post-fix run across all eight artifacts. Old-to-new semantic comparison showed exactly four removed formations in each scenario—`hv_113th_brigade_tg`, `hv_116th_brigade_tg`, `hv_1st_guards_tg`, and `hv_4th_guards_tg`—with no added formations and zero political-control changes. Only those 14 measured short-run hashes were reconciled in the manifest; long-campaign pins were not changed.

The tracked `data/derived/latest_run_final_save.json` was restored after the 188-week pass and verified at Git blob hash `09441651a91cacfcc3b711da52cfbd6cfeb7d0f0`.

## Verification

- Red/green focused regression: old startup exposed 22 phantoms; repaired host-bound contract passed.
- Full `jna_phantom_brigades` plus `scenario_harness_contracts`: 47/47 passed.
- Baseline failure-aggregation positive controls: 9/9 passed.
- TypeScript: passed.
- Short-run repeatability: 0 differing artifacts for both four-week scenarios.
- Full `npm run canon:check`: determinism scan passed and all four baseline scenarios matched the reconciled manifest.
- Exact reviewed commit `6894500634844750870a8046b72d6b5b65ce7021`: Event System CI run `32665667629` passed TypeScript, the event/phase suite, the strict canon rail, and baseline regression in 7m15s.

Independent ultrareview consolidated three verifier signals into one non-blocking quality finding: the new spawn guard duplicated the existing synthetic-command literal. The guard now derives from the pre-existing `SYNTHETIC_JNA_COMMAND_IDS` list through one shared set, so spawn and retirement cannot drift if the exception registry grows. The review's fourth candidate was refuted.

An attempted ad-hoc repeat imported the baseline CLI module and unintentionally invoked its `main()` side effect. That extra run was interrupted at turn 25 and was excluded from every comparison; the tracked latest-run save was restored immediately. Repeatability conclusions use the two explicitly named completed short-run directories only.

## Boundaries

This changes no phantom definition, personnel value, capture OSID, withdrawal turn, operation roster, or calibration threshold. The coupled 1995 HV `spawn_turn: 174` and mobility repair remain in the same tree and are untouched.
