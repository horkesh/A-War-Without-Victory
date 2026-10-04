# Continuation 6 type-only correction

The required commit hook stopped before commit with exit `1` on one TS2322 category at `src/sim/combat/front_distribution_diagnostic.ts:143`: spreading the homogeneous `string[] | number[]` diagnostic value inferred `(string | number)[]`.

## Preservation and exact change

- Pre-fix module copy: `continuation6_front_writer_20261004_module_pre_type_fix.txt`.
- Pre-fix SHA-256: `e9059b458d582722a0c2f301fd562b98367d49bae917e83713bf70bcc0d7a61a`.
- The only change was `[...]` to `[...] as typeof value` inside the already narrowed `Array.isArray(value)` branch.
- Current module SHA-256: `495e64c25f6ce857dd36290d0a049f4272ca2dc9bae0708246c6c830b2e70077`.

The assertion is erased by TypeScript. Runtime evaluation, iteration order, detached array values, schema, and gameplay behavior are unchanged. A direct no-index comparison between the preserved module and current module reports exactly that one-line difference (comparison exit `1`, meaning files differ).

## Verification

- Command: `node node_modules/vitest/vitest.mjs run tests/front_distribution_writer_diagnostic.test.ts`.
- Exit: `0`.
- Count: 1 file, 5 tests passed.
- Evidence: `continuation6_front_writer_20261004_type_fix_green.command.txt`, `.log`, `.exit.txt`.
- `git diff --check`: exit `0`.

No manual TypeScript check, hook retry, broader suite, review, campaign, replay, staging, commit, producer behavior change, or other source edit was performed. Root owns the targeted type-only verification and one retry of the same required hook.
