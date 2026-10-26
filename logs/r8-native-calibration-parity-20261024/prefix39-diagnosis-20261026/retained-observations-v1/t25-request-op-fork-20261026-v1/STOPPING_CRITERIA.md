# T25 REQUEST-OP fork contract

## Question

From the retained native P03 RBiH T25 state, does one ordinary public REQUEST-OP for 4th Corps against `op:trnovo:tosici` consume the already reviewed four-brigade `>=500` planner roster, stage at `op:trnovo:trnovo`, and lawfully capture Tosici by T39?

This answers only corrected T25 player agency. It does not prove the old 707 result achievable, qualify a native/campaign run, or waive the known Korenici mismatch.

## Frozen execution

The sole command is in `RUN_COMMAND.txt`. It uses Node 22.23.2 and the authorized-root TSX loader against current TypeScript source through `tools/diagnostics/run_preserved_preflight.cjs`.

The script has exactly two sequential stages:

1. Load unmodified T25 and make one public `advanceTurn`; the canonical T26 bytes must exactly match retained P03 T26.
2. Only after that match, load a fresh T25 clone, query and stage one public REQUEST-OP through `queryDirectiveObjection` and `stageOpDirective`, then make exactly 14 public `advanceTurn` calls through T39. Only retained RBiH event decisions at T38 and T39 are replayed through `resolveDesktopEventDecision`.

Maximum calls: one fidelity advance plus fourteen fork advances = fifteen. Wrapper cap: 90 seconds. One attempt only. No retry.

## Pass and reporting

The evidence run is structurally valid only if the source/runtime/input freezes hold, the fidelity branch is byte-exact, the fork starts from an independent fresh T25 clone, the directive is consumed on T26 with the reviewed four brigades and Trnovo staging, all 14 fork turns complete, and the retained event transcript is exact.

`RESULT.json` records query recommendation and any soft-objection override, CA before/after staging, injected roster and ownership lineage, per-turn movement/orders/battles/control, T39 Tosici controller, 712 score, n91/n92 formerly-correct losses, retained-native differences, and the unwaived Korenici row. The diagnostic exits 0 only if Tosici is RBiH-controlled by T39; a lawful non-capture is retained as a negative result with exit 2.

## Stop rules

- If T25→T26 differs by even one byte, preserve the fidelity artifacts and stop before query/staging/fork.
- On any source, runtime, input, CA, blocker, roster, staging, event, artifact, or advance-count mismatch, preserve the attempt and stop.
- On timeout, nonzero child/wrapper exit, or Tosici non-capture, preserve the attempt and do not retry.
- Never create another attempt, run a campaign/native/package/full suite, alter state/CA/roster/orders/positions, call phase shortcuts, or tune code under this contract.
