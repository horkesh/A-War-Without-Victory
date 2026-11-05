# Frozen v4 fork-only launch — independent GO required

From the literal authorized C worktree:

```powershell
& 'C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe' `
  'logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v4/launch_fork_v4.cjs'
```

The exact child argv is:

```text
C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe
--import
file:///C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory/node_modules/tsx/dist/loader.mjs
logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v4/diagnostic_entry_v4.cjs
logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v4/CONFIG.json
{evidenceDir}
fork-only
```

The fixed leaf is `attempts/player-order-fork-current-source-01`. If it exists, retain it and stop. The v3 fidelity pass is reused; v4 has no baseline-fidelity launcher or retry path.
