# Frozen launch command — do not run before independent GO

From `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`:

```powershell
& 'C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe' `
  'logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v1/launch.cjs'
```

`launch.cjs` supplies the reviewed fixed argv and exact artifact allowlist to `tools/diagnostics/run_preserved_preflight.cjs`. The wrapper creates the fixed fresh attempt directory exclusively and preserves entry snapshot, exact argv, stdout, stderr, child artifacts, and receipt. If the leaf exists, stop; do not delete or retry it.
