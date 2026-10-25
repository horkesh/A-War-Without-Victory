# Desktop terrain prerequisite repair proposal

Bound source: 86b693a9423de6a2be13174c36f96ee6a8430801. No implementation yet.

## Established boundary

The retained direct-desktop terrain probe passed child/wrapper 0/0 in 3.6 seconds. Its only intervention was existing loadUrbanOsidSet/loadForestOsidSet followed by existing setUrbanOsidSet/setForestOsidSet before one production advanceTurn from exact save16. All operation diagnostics, canonical battles and control counts match the retained scenario-resume baseline; input and bound files remain exact. This proves the missing direct-desktop prerequisite. It does not prove fresh native calibration, the missing uninterrupted Foča probe, or save/resume equivalence.

The source audit establishes: scenario startup primes the two module-global sets; baked apr_1992 New Campaign and Load State bypass that startup; advanceTurn does not prime them. Results can depend on earlier process history. Existing urban/forest data and multipliers are authoritative and unchanged.

Evidence is under ../native703-capability-diagnosis/: N97-W17-DESKTOP-TERRAIN-PREREQUISITE-SOURCE-AUDIT.md; N97-W17-DESKTOP-TERRAIN-PREREQUISITE-INDEPENDENT-REVIEW.json; n97-w17-desktop-terrain-prerequisite-probe-01/{receipt,result,terrain-state,terrain-report}.json. Preserve all earlier failed probes and rejected cache hypothesis.

## Smallest proposed change

1. Let the existing Node terrain loaders accept an optional absolute baseDir, defaulting to process.cwd() for existing scenario callers. Preserve their current data parsing and missing-file policy; no data edits.
2. Prime both production sets in desktop advanceTurn, from that call's baseDir, before BotManager or any operation/combat prediction. This universal boundary covers baked New Campaign, loaded saves and direct callers. Reinitialize from the selected root rather than inheriting another campaign's globals.
3. Keep scenario defaults, physical terrain, multipliers, thresholds, operation catalogs, factions, ownership, movement, alliances, supply, enclaves and persistence schemas unchanged. No cache-ordering repair is included: that hypothesis did not restore the missing operation.
4. Current preview code does not call these production terrain readers. Do not expand the repair into preview design, startup refactoring or unrelated loaders.

## Approval and proof

Obtain genuine independent canon/determinism review before implementation. Engine Invariants 11.4 and 13 require reproducibility and rebuilding derived runtime state. This restores an existing prerequisite rather than inventing terrain mechanics; do not change FORAWWV or canon authority.

Use fresh Sol implementation and a separate reviewer. Begin with a meaningful RED production-caller fixture: verify actual terrain lookup before both BotManager and runTurn, correct baseDir despite ambient cwd, alternate roots clearing stale sets, all three faction metadata paths, unchanged input/save shapes and default loader compatibility. Fixtures must run in CI without local runs or ignored evidence. Preserve every RED and failed check. Focused suites, nonincremental TypeScript and syntax/static checks precede candidate review.

This affects desktop gameplay: qualification retains one clean scenario-first 188-week regression against n91-n97, floors707/707/706/706, zero formerly correct cells lost at each checkpoint, all protected/health/provenance/telemetry gates; hard35-minute cap, one attempt/no automatic retry. Required full suite follows only a qualifying final candidate. Expected scenario cost about3minutes, suite15-20minutes. Exact commands and fresh evidence paths must freeze after the candidate commit and cheap prechecks, before launch.

A new immutable package is necessary for real-game proof; the old qualified package remains preserved and cannot prove the repair. Verify compiled consumer, inventories and a cheap native opening before any full native39 run. Normal visible always_allow is an explicit counterfactual player input; Kolovarice RS matches n94, while Tošići RBiH is still required. No gameplay qualification, native retry, tuning or baseline adoption is conveyed by this proposal.
