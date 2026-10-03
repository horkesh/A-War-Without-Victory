# Sana n37 convergence correction — STOP report

## Verdict

**STOP — no production correction.** The retained boundary reproduces a stale 517th movement order, but does not serialize the t187 selector inputs/decision needed to distinguish a lawful retarget bug from an order-lifecycle timing artifact.

## Reproduction

Fixture: `tests/sana_n37_convergence_fixture.test.ts` (local diagnostic only; it requires the ignored n37 run artifact and is not part of the tracked test suite).

Real inputs:

- `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n37/final_save.json`
- `data/derived/operational/operational_contact_graph.json`

Observed from the retained t188 state and after one production-shaped `generateAllBotOrdersOsid` call:

- Sana axis current objective: `op:sanski_most:stari_majdan`
- 517th location: `op:sanski_most:lusci_palanka_2`
- retained 517th order: column movement to `op:sanski_most:budimlic_japra_2`
- regenerated 517th attack order: none
- regenerated 517th movement order: still column movement to `op:sanski_most:budimlic_japra_2`
- political control and formation location were not mutated by the fixture

This confirms previous-objective drift and the absence of a 517th Stari-Majdan attack receipt. It does **not** prove the unique t187 selector predicate or establish that a forced retarget would be the lawful production behavior.

## Checks

| Check | Exit | Evidence |
|---|---:|---|
| Focused real-save Vitest fixture | 0 (1 passed, 0 failed) | `sana_n37_convergence_focused.stdout.log`, `.stderr.log`, `.exit.txt` |
| TypeScript `--noEmit` | 0 | `sana_n37_convergence_typecheck.stdout.log`, `.stderr.log`, `.exit.txt` |
| `git diff --check` | 0 | `sana_n37_convergence_diffcheck.stdout.log`, `.stderr.log`, `.exit.txt` |

No prefix, full suite, campaign, battle-power change, control edit, retiming, teleportation, or forced capture was run.

## Remaining blocker

The missing evidence is the serialized t187 pre-order state (including the exact movement state/order lifecycle and selector decision receipt). Do not adopt a production retarget/clear-order rule until that boundary is retained or independently traced with the same real inputs.
