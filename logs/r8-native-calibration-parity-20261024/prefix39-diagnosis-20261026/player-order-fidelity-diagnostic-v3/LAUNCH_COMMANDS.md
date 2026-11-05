# Frozen v3 fidelity-only launch — independent GO required

From the literal authorized C worktree:

```powershell
& 'C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe' `
  'logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fidelity-diagnostic-v3/launch_fidelity_v3.cjs'
```

The exact child argv is:

```text
C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe
--import
file:///C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory/node_modules/tsx/dist/loader.mjs
logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fidelity-diagnostic-v3/diagnostic_entry_v3.cjs
logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fidelity-diagnostic-v3/CONFIG.json
{evidenceDir}
fidelity-only
```

The fixed leaf is `attempts/fidelity-current-source-01`. If it exists, retain it and stop. There is no retry and no fork launcher in v3.
