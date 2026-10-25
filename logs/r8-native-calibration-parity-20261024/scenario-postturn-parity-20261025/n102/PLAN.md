# Scenario OSID graph repair: one authoritative 188-week regression

Status: `TEMPLATE_READY__HOLD_FOR_CLEAN_COMMITTED_HEAD_AND_INDEPENDENT_PACKET_REVIEW`

## Question

Does the reviewed one-line weekly scenario repair (`graph.edges` to
`operationalSettlementGraph.edges`) restore operational OSID front/sector truth at all four
authoritative checkpoints while preserving the accepted campaign outcome, protected history,
normal capture provenance, engine health, control attribution, enclave/supply/alliance behavior,
and movement coverage?

The packet measures one canonical trajectory. It does not tune code, adopt a baseline, change a
pin or threshold, qualify package/native behavior, or claim equivalence to the defective producer.

## Frozen scope

- Production entrypoint: `tools/scenario_runner/run_scenario_with_preflight.ts`.
- Scenario: `data/scenarios/apr1992_definitive_188w.json` for exactly 188 weeks.
- Output: `runs --unique`; the expected next leaf is
  `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n102` and it must be absent at launch.
- Saved weeks: `15,16,39,104,111,112,113,130,131,132,133,134,135,136,156,178,179,180,181,182,183,184,185,186,187`.
- One attempt only. No automatic retry, second campaign, alternate prefix, tuning, adoption, package,
  native run, or build.
- Expected runtime: 3–8 minutes. Hard wrapper cap: 2,100,000 ms (35 minutes), including a
  120,000 ms closing reserve.

## Cheap rejecting gates before the campaign

The finalizer binds the clean committed HEAD, the reviewed two source/test files, both reviews,
the RED/GREEN/type/diff receipts, the retained v7 authority, the production CLI, and every reused
reader. `--mode preflight` then requires:

1. exact clean committed HEAD and Node `v22.23.2`;
2. exact bound hashes and schemas/verdicts;
3. reviewed source/test hashes (`209eff...` and `45af60...`);
4. real one-week RED = 0 fronts/0 sectors and GREEN = 587 fronts/157 sectors with both retained HVO
   formations in `sector:hvo_southeast_herzegovina:0`;
5. production CLI arguments, reader availability, scenario/input presence, and absent n102 leaf;
6. fresh owned preflight attempt directory and exact wrapper allowlist.

Selftest uses synthetic objects only. It exercises the changed classification rules: semantic state
deltas are diagnostic, invalid OSID graph/sector production fails, a failed campaign marks readers
`UNREACHED_CAMPAIGN_FAILURE` rather than timeout, and deadline exhaustion is separately classified.
It does not rerun the unchanged historical fixture campaign.

## Exact campaign command

The finalized command is written to `FINALIZED.json`. Its shape is:

```text
C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe tools/diagnostics/run_preserved_preflight.cjs --attempt-dir tmp/player-bot-capability-parity-20261024/fractional-fatigue-package-v6/scenario-osid-repair-v1/regression-v1/campaign-01 [...exact allowlist...] -- C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe node_modules/tsx/dist/cli.mjs tmp/player-bot-capability-parity-20261024/fractional-fatigue-package-v6/scenario-osid-repair-v1/regression-v1/qualification.mts --mode campaign --config tmp/player-bot-capability-parity-20261024/fractional-fatigue-package-v6/scenario-osid-repair-v1/regression-v1/CONFIG.bound.json --evidence-dir {evidenceDir}
```

The qualification entry launches exactly:

```text
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 188 --out runs --unique --save-weeks 15,16,39,104,111,112,113,130,131,132,133,134,135,136,156,178,179,180,181,182,183,184,185,186,187
```

Child stdout/stderr go directly to exclusive file descriptors. Every execution record retains the
process status, signal, spawn error, timeout classification, and argv.

## Pass criteria

All required gates must pass in the single n102 trajectory:

- checkpoint scores at or above the minimum floors `707/707/706/706`; improvements are allowed only
  with zero formerly-correct n91/n92 losses and every other guard still passing;
- zero formerly-correct n91 or n92 OSID losses at any of the four checkpoints;
- all 16 protected anchors;
- Toljenak remains a normal logged combat capture, and Prisoje plus Donji Vrbljani remain held with
  their accepted combat capture evidence;
- clean provenance at the finalized HEAD, exact horizon, inventory/state consistency, engine health,
  control attribution, enclave, supply, alliance, movement coverage, and protected-history gates;
- at weeks 39, 104, 156, and 188, `war_front_edges_osid` and `corps_front_sectors` are nonempty,
  every front endpoint is an `op:` OSID, sector edges resolve to the produced front graph, and sector
  roster/formation assignments are mutually consistent;
- opening and closing retained-evidence inventories are identical, excluding only this fresh owned
  attempt and the fresh n102 run.

The n94/n98 decoded state comparisons remain as diagnostic JSON. Sector, fatigue, operation, and
control differences are expected semantic observations after correcting the producer and do not
assert old repair equivalence.

## Stop rule

Any startup, campaign, artifact, graph, score, formerly-correct-cell, anchor, normal-operation,
provenance, health, attribution, enclave, supply, alliance, movement, or preservation failure yields
`STOP_NO_RETRY`. Preserve the failed state and all outputs. Missing/unstarted readers are evidence,
not timeouts unless the shared deadline was actually exhausted. Do not tune, adopt, change a pin or
threshold, run a second campaign/prefix, or start the full suite. The full balanced suite is eligible
only after this scenario result passes every required gate and receives the required independent
review.
