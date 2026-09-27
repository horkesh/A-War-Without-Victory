# Full balanced-suite verification receipt

The suite ran from clean start tip `933132e909ad9d5380c2452ee29396d92a8b0bd9` with:

```powershell
$env:PATH = 'C:\Program Files\Git\bin;' + $env:PATH
npm.cmd run test:vitest:balanced
```

The retained log spans `2026-09-12 23:26:50 +02:00` through `23:59:14 +02:00`
(32 minutes 24 seconds) and records outer exit `1`. The aggregate result is 8 failed,
1,379 passed, and 4 skipped files; 9 failed, 13,935 passed, and 43 skipped tests.
The intentional `deliberate_failure.fixture.ts` child-process control is excluded from those failures.

Raw evidence: `full-suite.log`, SHA-256
`8747229abbca1e3fe52b6e58a8c2c3bde5280e0fa0645382c8c56593d95a43bc`.

| Root-cause group | Full-suite failures | Disposition and focused evidence |
|---|---:|---|
| Historical map-focus fixture | 1 file / 2 tests | Corrected and reviewed; `fixture-correction-tests.log`, 39/39 |
| Startup snapshot | 2 files / 3 tests | Corrected and reviewed; serial startup failures are in `full-suite.log` lines 3071 and 46922, and `fixture-correction-tests.log` confirms `startup_snapshot_contract` 19/19 plus desktop bundle 1/1 inside 39/39 |
| Hover-map merge-map path | 1 file / 1 test | Corrected and reviewed; generator 1/1 inside `fixture-correction-tests.log` 39/39 |
| Q2 faction literals | 1 file / 1 test | Corrected and reviewed; original four-file group `q2-correction-tests.log` passed 40/40, then the reviewed fixture stance correction passed `q2-fixture-correction-tests.log` 26/26 |
| Runtime dependency hook timeout | 1 failed suite | Isolated without changing timeout; `runtime-dependency-isolated.log`, 12/12 in 3.12 seconds |
| 40-week coverage cap | 2 files / 2 tests | Held for owner decision; `coverage-40w.log` and the three `coverage-40w-*.json` diagnostics prove all nine pockets are explicitly unstaffed and graph-disconnected from legal donors |

The machine-readable record with exact per-group paths is `full-suite-verification.json`.
