# EOF format addendum

**Verdict: GO — formatting-only correction verified.**

The current `tests/pre_first_advance_paramilitary_policy.test.ts` is byte-identical to the preserved pre-format file through byte 20,280. The only removed suffix is hex `0a0a`, reducing the file from 20,282 to 20,280 bytes and leaving one ordinary final LF after `});`. No nontrailing byte changed.

## Binding

- Preserved before copy: `tmp/player-bot-capability-parity-20261024/root/policy-test-before-eof-format.ts`, SHA-256 `a6f66ba823871b72bac3ccabee5ccca36d59b845d63a7394898476dee96feae1`, 20,282 bytes.
- Current test: `tests/pre_first_advance_paramilitary_policy.test.ts`, SHA-256 `d6a1eec5caeeef79380ac38a1f238c33e6721a916250e81b9489a38e31054c6a`, 20,280 bytes.
- Correction record: `tmp/player-bot-capability-parity-20261024/root/STARTUP_EOF_FORMAT_CORRECTION.json`, SHA-256 `5f0a9ed7584d7a677a0ee84cc0446f006fd2cc229dae4c5bde4818abc5b93419`.
- Staged `src`, `docs`, and `tests` diff check exits 0 after the correction.

This file was already inside the approved test scope. The EOF-only edit changes no test expression, fixture, production source, gameplay, type, runtime, save, determinism, UI, or canon behavior. The retained 94/94 focused and TypeScript 0/0 checks remain semantically applicable; no rerun is needed for this formatting correction. All earlier review conditions remain unchanged.

This addendum certifies only the EOF-format correction and its current hash. It adds no campaign, build, native, baseline, or calibration claim.
