# Final prelaunch binding verification — combat-fatigue prefix 39

Date: 2026-10-26  
Decision: **GO — execute `FROZEN_LAUNCH_COMMAND.v2.json.exact_argv` once as an argument array.**  
Released scope: one 39-turn rejecting qualifier only. Do not invoke `exact_command` through a shell.

This is the targeted final verification requested by the preliminary static review (`review-001`, SHA-256 `73899f940db09e5efe20e65401c7502b51164bb38abcdcf910d028a0837a9144`). Unchanged reader logic and the combat-fatigue implementation review (`942da52b0477faca69c3eccb3d87e53fb43d5fc01d0332df199324a434f2e11d`) were reused rather than repeated.

## Frozen candidate

- HEAD: `0278c956d3fce3cdb62161a282f3936eaa0c66c1`
- Parent: `894693a7286a1522fcd954abf5eded39e5e340e1`
- Tracked worktree status: clean after finalization and both cheap checks
- Config: `CONFIG.bound.v2.json`, 11,272 bytes, SHA-256 `790ed05f9676d3c85d7c593a9226d87c8e0ee10ac82c0b52e66fb1a33831b16c`
- Qualification reader: 28,271 bytes, SHA-256 `97019c6d0a133c9d54ef99574b052ebfb0d954da17f5de79b235af226cd9f6f3`
- Frozen launch manifest: 6,924 bytes, SHA-256 `c94bee01db6f698080473afb2247457d9c53e80f111885854790d3970b0dfe81`

All 26 `required_bindings` match their current files by byte count and SHA-256. This includes the scenario runner and maintained boundary test; the reviewed combat-fatigue sources/tests; the REQUEST-OP source/tests; production wrapper/runner and post-run readers; scenario, reference and thresholds; attribution source/test; prior reviewed decisions; the weeks-override fidelity supplement; and this packet's plan/reader.

The reviewed production/test identities are unchanged:

- `attack_resolution_osid.ts` `ff8992ab13f54f7f5b2aea79adc1c2a2a6a4d1f9cb58acd21ed27726ea6069ab`
- `attack_resource_aftermath.ts` `0cad82788378de0c6d1a82d5228eb5c8deac9d5b79263c7cfd860e63f3eab4b4`
- `combat_fatigue_owner.test.ts` `3125267ee44e1695ef41ca3b948e523c37cf950b8f07f85068b5fa2ea2f15901`
- `attack_resource_aftermath.test.ts` `61f76235330d2c6dcda189d0f7761e7ca78101a885abc1bd11b60eea8e3a534b`
- `war_phases.ts` `8a085a37835541f4dc267e5c1f7f75a714bafc596e21d43b1467cb8ee62d7fcd`
- directive tests `add227b78c06141a2ee501972907dad52caf4edd5069b5244b6f2d6020a01115` and `892242ebe14ac935581cf218877fa466ca8f1f218e0d97ed9c21f34acc83902f`

`FINALIZED.v2.json` correctly binds the plan, finalizer, config, reader, control manifest, cheap commands, launch manifest, and the production/test/tool/data subset. Every one of those live hashes matches.

## Finalization and retained cheap evidence

The sole retained finalizer invocation exited 0 with empty stderr and reported the exact HEAD, config hash, 25 allowed campaign artifacts, and hold status. No evidence of a second finalization exists.

### Selftest

- preserved wrapper/child: `0/0`
- timeout: 90,000 ms; no timeout, signal, cleanup, or spawn error
- entry snapshot and post-run reader hash: exact `97019c6d…`
- artifact contract: pass; three expected artifacts, none missing or unexpected
- every receipt-declared artifact/log/snapshot hash matches its live file
- graph/roster fixtures: 9/9 expected decisions
- attribution fixtures: 7/7 expected decisions
- n101 positive control: 707/712, n91/n92 losses `0/0`, pass
- n102 negative control: 705/712, n91/n92 losses `2/2`, exact losses `op:foca:donje_zesce` and `op:trnovo:tosici`, correctly rejected
- simulation executed: false

### Preflight

- preserved wrapper/child: `0/0`
- timeout: 30,000 ms; no timeout, signal, cleanup, or spawn error
- entry snapshot and post-run reader hash: exact `97019c6d…`
- artifact contract: pass; one expected artifact, none missing or unexpected
- every receipt-declared artifact/log/snapshot hash matches its live file
- HEAD: exact `0278c956…`; Node: `v22.23.2`; live bindings: 26
- control manifest: exact SHA-256 `60814b13684919e58b877e717ad50ff0d4b888f7342c0c6d02b4672a50d5a079`
- live n101/n102 evaluation: same exact signatures as the selftest
- all 14 retained roots were found; full byte inventory is explicitly deferred to the campaign opening/closing scope
- simulation executed: false

The emitted cheap command child argument arrays exactly match the receipts' original child argv, including the external config hash and preserved `{evidenceDir}` substitution contract.

## Released command contract

`FROZEN_LAUNCH_COMMAND.v2.json` is internally consistent with the finalized config and reader:

- literal Node 22.23.2 executable for wrapper and child;
- preserved-wrapper attempt directory `actual-attempt-01`;
- campaign mode with config SHA-256 `790ed05f…`;
- hard wrapper cap 300,000 ms;
- cost declaration one expected 1–3 minute attempt, one attempt, zero retries;
- exactly 25 allowed artifacts, covering opening/closing preservation, launch/campaign records, scoring, consistency, strict 40-week health, movement, graph/roster, saves, attribution, horizon status, and final result;
- unchanged minimum 707/712, zero former-correct losses, exact n101/n102 controls, seven required gates, and preservation equality;
- save configuration turns 15, 16, 33 and 34 plus required turn-39 final state;
- diagnostic reason codes include `battle_power` without changing production inputs; and
- any failure is `STOP_NO_RETRY` before 188-week, full-suite, native, package, or build work.

The actual attempt directory and `runs/player-parity-fatigue-owner-39-20261026-01` are absent at this review boundary. No campaign has launched.

## Decision limits

This GO authorizes exactly one invocation of the manifest's `exact_argv`. It does not predict a 707 result, waive the known strict-health failure risk, qualify calibration, authorize a retry, or authorize a later 188-week/full-suite/native/package/build step. The full 14-root byte inventory begins inside the released attempt; this review verifies its configured scope and deferral, not an inventory that has not yet run.

No engine API, campaign, test, extra inventory, source edit, or packet mutation was performed by this reviewer.
