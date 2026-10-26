# Current-source player-order fork diagnostic v2

Status: **HOLD FOR INDEPENDENT PRELAUNCH GO AND ROOT LAUNCH**. No engine, advance, query, stage, test, native, package, or campaign command has run while preparing v2.

## Question and bound

First, does current source at HEAD `33f99fc5` reproduce the retained **actual 704 cohort** turn 16 to turn 17 byte exactly, with no directive? `launch_fidelity_v2.cjs` can perform only that single advance and then exits; it has no query, staging, or fork-loop path. Only after its preserved evidence passes and receives a fresh review may `launch_v2.cjs` restart immutable T16, issue one ordinary public `REQUEST-OP` from `arbih_4th_corps` to `op:trnovo:tosici`, and use the public desktop advance/runtime-handoff/event-consumer path for exactly 23 advances through turn 39. The fork validates and reuses the preserved fidelity result instead of repeating the baseline advance. Each fixed wrapper cap is 180 seconds, expected runtime is under 120 seconds, and there is no retry, alternate target, new native/package run, or 188-turn campaign.

This is an offline public-production-API fork diagnostic. It is not native campaign qualification and does not claim same-input full-campaign equivalence.

## Correct retained cohort

V1 remains byte-preserved and rejected. It bound a stale desktop bundle and a different `player-parity-rbih-t39-20261025-04` cohort whose turn-39 score is 705/712. V2 never uses that cohort as input or baseline.

V2 binds the actual retained 704 cohort:

- turn 16 `861d4e34…`, turn 17 `32d5b1bb…`, and final turn 39 `623cbaed…`;
- native source HEAD `a3063366…` and retained controller-map SHA `6ed89306…`;
- native manifest, 24 MB action/result trace, calibration postcheck, and two independent reviews;
- the unchanged 712-settlement reference and n91/n92 baselines.

The retained final state is statically rescored by the harness at exactly 704/712. Its n91 and n92 formerly-correct losses must remain exactly Korenici, Donje Žešće, and Tošići. Candidate acceptance remains at least 707/712 with zero formerly-correct losses against each n91 and n92 baseline.

## Current-source runtime freeze

V2 loads `src/desktop/desktop_sim.ts` through the installed TSX loader. The launcher hardcodes the reviewed CONFIG and entry hashes, exact HEAD, Node runtime, loader, package lock, critical current-source files, all evidence inputs, and aggregate hashes for `tsx`, `esbuild`, `get-tsconfig`, `resolve-pkg-maps`, and `@esbuild/win32-x64`. Before any engine import, both launcher and entry reject any tracked or untracked change under `src/` or `data/`. The stale `dist/desktop/desktop_sim.cjs` is recorded as the v1 review failure and is not consumed.

The six pre-existing reviewed documentation changes are excluded because no harness, input, runtime, source, or data read consumes them. A clean overall worktree is not required.

## Gates and stopping rules

1. Verify every frozen file/runtime binding, HEAD, literal C worktree, empty `src/` and `data/` status, fixed absent attempt leaf, and wrapper/attempt contract.
2. In the fidelity-only invocation, load actual-cohort T16, runtime serialize/deserialize it, require byte identity, require no player blocker, and perform the sole baseline advance.
3. Preserve the produced T17 state/report and compare to actual-cohort T17 byte exactly. On failure, retain hashes plus the complete, uncapped JSON-pointer diff and stop before query or staging.
4. Stop after the fidelity result. The fork launcher remains disabled until that preserved receipt, full fidelity record, produced T17 hash, and entry snapshot pass targeted review. The later fork invocation validates those artifacts and then restarts actual-cohort T16 without repeating the baseline advance. Require RBiH/autonomy 2, RS-held Tošići, free 4th Corps slot, CA 94/0/25, and exactly ten active, statewide-uncommitted, same-corps brigades.
5. Require the disclosed 1st Corps `Operation Circle` Tošići axis. The ordinary injection validator receives only the 4th Corps `CorpsCommandState`, so its overlap guard is same-corps. The harness uses that ordinary rule without exemption; the concurrent cross-corps target is recorded in CONFIG and `QUERY_AND_STAGE.json`.
6. Query a dedicated runtime clone through `queryDirectiveObjection`; compare that queried clone before/after byte-for-byte. Missing physics, malformed recommendation, or any `rejectionReason` stops before staging. The only force-confirm field is `forced_over_objection: true`, and only when the query returns `delay` or `abort`; `launch` stages without it.
7. Stage once through `op_directive_staging.cjs`. Require the frozen request, successful public staging owner, CA 69/25/50, matching pending target/cost/force flag, and a serialize/deserialize handoff. Requestless, altered, rejected, missing, or invalid input has no alternate path and fails closed.
8. Advance at most 23 times. Require consumption on the first advance, no rejection, no later pending directive, roster 3–12 from the frozen ten eligible brigades, canonical roster order, Delijaš staging, one Tošići axis, commander assignment, movement lineage, actual operation-owned combat lineage, and any control change backed by an owned win plus control event.
9. Consume only the retained post-T16 player events: London T20 `accept_principles`, IC pressure T38 `acknowledge_pressure`, and VOPP T39 `accept`. Any missing, reordered, extra, unresolved, or blocked event fails closed.
10. At T39 require movement and combat delivery, exact 704 comparator preservation, candidate score at least 707/712, and zero n91/n92 formerly-correct losses. Delivery without score acceptance remains a failed/partial diagnostic.

Every reached turn preserves canonical state, phase report, lineage/operation receipt, event transcript, query/stage record, and final or failure result. Nothing is deleted.

## Wrapper failure reporting

`run_preserved_preflight.cjs` treats every allowlisted success artifact as required. An early child stop therefore yields wrapper exit 126 because future turn artifacts are absent. This does not replace the primary child category: read `receipt.json.child_exit`, `RESULT.json.error`, `BASELINE_FIDELITY.json`, and the retained produced files. The wrapper still preserves stdout, stderr, exact argv, entry snapshot, receipt, and every artifact reached before the stop.
