# Sana Sanski axis — Otoka staging bounded result

## Outcome

**Focused GO; campaign NO-GO / not run.** The Sanski–Ključ axis now uses the
existing friendly `op:bosanska_krupa:otoka_2` anchor for the 506th and 517th as
a measured calibration candidate. The comment explicitly treats this as a
calibration hypothesis, not historical source truth or a retiming.

## Red/green proof

- **RED, exit 1:** `npx.cmd vitest run tests/operation_execution_staging_truth.test.ts --reporter=dot`
  with the catalog staging temporarily set to current Ivanjska. The fixture
  could not produce a legal staging destination while Ivanjska was RS-held.
  Evidence: `opencode_sanski_otoka_staging_red.log` and `.exit`.
- **GREEN, exit 0:** `npx.cmd vitest run tests/operation_execution_staging_truth.test.ts tests/operation_opportunities_catalog.test.ts tests/brigade_routine_scope.test.ts --reporter=dot`
  — 3 files, 86 tests passed. Evidence: `opencode_sanski_otoka_staging_green.log`
  and `.exit`.

The fixture is a synthetic producer/consumer exercise: it manually invokes
`evaluateSectorAttack`, copies each returned destination into pending movement
orders, then invokes `processOsidColumnMovement` on a small synthetic topology.
It proves both named brigades receive ordinary operation staging orders toward
Otoka, remain physically at the rear location while transit starts, and emit no
ordinary attack order. It also asserts unchanged operation objectives, rosters,
other-axis data, and political control. No teleport or control transfer is
introduced. It does not exercise production order merging, protected-owner
behavior, a same-corps route, or the actual t175/t176 pipeline. Existing
authorized-operation and routine-scope gates are used; no authority, save
schema, combat, objective, or timing code changed.

## Review correction

The prior red/green evidence is retained, but its wording is narrowed here:
the focused test is not evidence of a full-turn result, protected movement, or
same-corps routing. The synthetic consumer now explicitly uses `meta.turn = 176`
for the second call, while remaining a bounded producer/consumer fixture.

## Required checks

- Typecheck: `npx.cmd tsc --noEmit -p tsconfig.json` — **exit 0**;
  `opencode_sanski_otoka_staging_typecheck.log` / `.exit`.
- Whitespace: `git diff --check` — **exit 0**;
  `opencode_sanski_otoka_staging_diffcheck.log` / `.exit`.

## Remaining uncertainty

This is a deterministic staging/consumer proof only. It does not establish
Otoka arrival timing on the full n29 topology, the t177–179 Ivanjska combat
result, first-belt acceleration, Stari Majdan or Sanski Most capture, or any
188-week painted-control score. No prefix, full suite, scripted/direct capture,
map refresh, merge, or baseline adoption was run. Farz P-A §6 remains
**NO-MERGE**. The reviewed Mistral 1 transit admission and unrelated dirty work
were preserved.
