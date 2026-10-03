# Farz owner-ruling verifier correction — 2026-09-29

The owner accepts either 2nd or 3rd Corps as final capturer if all four authored Farz objectives were captured. The old P-A hard gate on a 2nd Corps final capture of Briješnica was a narrower proxy. The new gate requires an authored Army HQ Farz AAR, each objective in its logged-capture list, a matching operation-owned combat event and winning battle receipt in the late window by a 2nd/3rd Corps brigade, and RBiH control at w188. P-B's universal negative guard remains. Actual 2nd Corps roster participation is printed as a diagnostic.

## Retained evidence

| Retained run | New verifier | Four Farz receipts | 2nd Corps participant |
|---|---:|---|---|
| `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n14` | exit 0 | t163/164/165/167, all operation-owned combat | Not recorded |
| `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n0` | exit 0 | t163/164/165/168, all operation-owned combat | Not recorded |

Raw replay output: `farz_owner_n14_verifier.out`, `farz_owner_n0_verifier.out` in this directory. The n14 AAR `arbih_3rd_corps:Operation Farz 95:t161` reports success and all four objectives logged captured. Its four participating brigades belong to the 3rd Corps and its donor lineage lists 1st and 3rd Corps. The revised gate pass therefore establishes the owner's **objective outcome**, not a simulated 2nd/3rd Corps link-up.

`docs/40_reports/CALIBRATION_MASTER.md` around lines 1076 and 1143 calls the previous P-A failure a carved-out discriminator, not a sensitive-history §6 breach. The latest ledger entry supersedes the later mislabel “Farz P-A §6 NO-MERGE.” Other acceptance gates, full-suite validation, merge and baseline adoption remain open; no simulation or control data changed.

## Checks and execution

- `npx vitest run tests/farz_objective_gate.test.ts tests/capture_provenance.test.ts`: exit 0, 7/7.
- `npm run typecheck`: exit 0. Initial run found a type error in the new test's Map fixture; corrected and rerun green.
- `node --check tools/verify_checkpoints.cjs` and `node --check tools/lib/farz_objective_gate.cjs`: exit 0.
- Retained n14 and n0 `verify_checkpoints.cjs` replays: exit 0, `RESULT: guard intact.` No campaign rerun.
- Independent reviewer found an initial false pass for 1st/unknown Corps final capturers. A targeted correction constrained capture corps to 2nd/3rd; reviewer verified GO, focused tests 4/4 and scoped diff check 0.

OpenCode was dispatched twice as executor. Both sessions stalled before editing; they were stopped. Codex made the bounded verifier/test/documentation correction directly, and the independent reviewer checked it. No full suite, new 188-week run, map publication, commit, merge or baseline adoption.
