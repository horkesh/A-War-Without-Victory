# Frozen v2 launch command — run only after independent GO

First-stage fidelity-only command from the literal authorized C worktree:

```powershell
& 'C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe' `
  'logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v2/launch_fidelity_v2.cjs'
```

The launcher verifies the independently reviewed CONFIG and entry hashes before invoking the preserved wrapper. The fixed child argv recorded by the wrapper is:

```text
C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe
--import
file:///C:/Users/User/.codex/worktrees/april-1995-glamoc/A-War-Without-Victory/node_modules/tsx/dist/loader.mjs
logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v2/diagnostic_entry_v2.cjs
logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v2/CONFIG.json
{evidenceDir}
fidelity-only
```

The fixed first-stage leaf is `attempts/fidelity-current-source-01`. It must be absent before launch. If it exists, retain it and stop; no deletion or retry.

The 23-turn fork remains disabled pending a passing preserved fidelity result plus targeted independent review. Its later, separately authorized outer command is the same frozen Node executable with `launch_v2.cjs`; its child mode is `fork-after-fidelity`, and its fixed leaf is `attempts/player-order-fork-current-source-01`.
