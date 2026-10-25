# T3 routing repair delivery proof plan v2

This supersedes v1 after targeted review. It retains all v1 authenticated inputs and pass criteria, and adds a hard stop immediately after each completed turn. Before another `advanceTurn` call is permitted, the runner checks the 182nd formation's expected location, exact path, owner, ticks or final clearing, absence of a column rejection, the four RBiH controls, zero post-turn blockers, and War/RBiH/non-headless/autonomy-2/historical metadata.

Each turn 3–6 boundary records blockers both before and after advancement, including the final turn-6 blocker query. The phase-37 receipts and positions for the 181st and 109th remain reported observations rather than pass predictions.

Run only after targeted fixture review permits it, in one fresh preserved attempt with a 60-second cap and no automatic retry:

```powershell
node tools/diagnostics/run_preserved_preflight.cjs `
  --attempt-dir tmp/player-bot-capability-parity-20261024/paired-turn1-182-boundary-20261025/t3-routing-repair-delivery-turns3-6-02 `
  --entry-script tmp/player-bot-capability-parity-20261024/paired-turn1-182-boundary-20261025/run-player-turn2-to6-routing-delivery-v2.mjs `
  --timeout-ms 60000 `
  --allow-artifact dependencies.json `
  --allow-artifact precheck.json `
  --allow-artifact delivery.json `
  --allow-artifact turn-reports.json `
  --allow-artifact final-state.json `
  --allow-artifact result.json `
  -- node node_modules/tsx/dist/cli.mjs `
  tmp/player-bot-capability-parity-20261024/paired-turn1-182-boundary-20261025/run-player-turn2-to6-routing-delivery-v2.mjs `
  '{evidenceDir}'
```

Expected runtime is seconds. Stop at the first contract failure and preserve the attempt. This remains a four-turn delivery proof, with no campaign or qualification claim.
