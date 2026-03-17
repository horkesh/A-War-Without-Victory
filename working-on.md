# Working On: Op Jackal Mostar Hills Ghost Axis

## Mystery
Op Jackal source code has 1 axis (stolac_sweep). Debug logging confirms `buildAxesFromDef` receives 1 axis. But the FINAL SAVE shows 2 axes (stolac_sweep + mostar_hills with vranjevici/kruzanj objectives).

No code in `src/sim/combat/` pushes new axes to operations. No source file contains "vranjevici" or "kruzanj". Yet they appear in the runtime operation.

## Theory
The `mostar_hills` axis exists in `dist/desktop/desktop_sim.cjs` (the Electron build). If the scenario runner somehow imports from `dist/` instead of `src/` for some module, the old axis definition would leak in. BUT: `tsx` should use source directly, and the debug log proves `buildAxesFromDef` sees 1 axis.

Another theory: something creates a NEW operation mid-execution that re-reads the definition and gets it from a different path.

## What to check next
1. Add debug logging to `buildCorpsOperation()` to verify it receives 1 axis
2. Add a `console.log` every time `op.axes` is written or the operation is created
3. Check if the operation is being REPLACED mid-execution (e.g., a re-injection)
4. Check if there's a secondary operation creation path via `generateCorpsDirectives` or `bot_corps_ai`

## Completed This Session
All Graz/Goražde/Enclave/Painted fixes committed. Op Jackal correctly scoped to 4 Stolac objectives in source. Graz exemption scoped to operation objectives only. The remaining issue is this ghost axis appearing at runtime.
