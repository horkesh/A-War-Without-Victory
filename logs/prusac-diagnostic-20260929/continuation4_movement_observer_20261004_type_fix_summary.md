# Movement observer test-fixture type fix

## Scope

The required commit hook exited `1` before commit with four TypeScript errors, all in test fixtures. The retained hook log is the type-level red: `continuation4_movement_observer_20261004_commit.log` and `.exit.txt`. No production, observer, reader, schema, assertion, or runtime behavior changed.

## Exact annotation changes

```text
tests/movement_phase_coverage_diagnostic.test.ts
- malformed.receipts[0].phase_index = '0' as never;
+ (malformed.receipts[0] as Record<string, unknown>).phase_index = '0';

- removed-terminal malformed snapshot object passed directly
+ the same object cast through unknown to ReturnType<typeof snapshot>

tests/movement_phase_diagnostic.test.ts
+ import type { MovementPhaseDiagnostics }

- const diagnostics = ordinaryReport.movement_phase_diagnostics;
+ const diagnostics = ordinaryReport.movement_phase_diagnostics as MovementPhaseDiagnostics;
```

The first two casts explicitly mark deliberately malformed runtime fixtures. The report annotation gives phase-manifest and receipt callbacks their production diagnostic types. Test data and assertions are unchanged.

## Verification

- Authorized command: `node node_modules/vitest/vitest.mjs run tests/movement_phase_coverage_diagnostic.test.ts tests/movement_phase_diagnostic.test.ts`.
- Result: exit `0`; 2 files passed, 32 tests passed.
- Evidence: `continuation4_movement_observer_20261004_type_fix_green.log` and `.exit.txt`.
- No manual typecheck, hook retry, production test, unrelated check, campaign, replay, prefix, package build, or full suite was run. Root owns targeted type-only review and the later required hook retry.

## Current hashes

```text
563d0ee73b8b92c797b1acfb520ad8a9d83e1c38702880f8255403a2953fa978  tests/movement_phase_coverage_diagnostic.test.ts
3af644f5fae1eaceff2b4e1b78970ade726d9212fbd2a249b350104fa753d44a  tests/movement_phase_diagnostic.test.ts
```

All earlier summaries, reviews, staged artifacts, raw logs, and disclosed preservation limitations remain unchanged.
