## 2026-04-02 - Player shell affordance and operation-detail visibility cleanup

### Scope
- make the tactical-map shell expose an obvious path back to Warroom
- restore a clear visible Codex entrypoint
- remove a direct player-truth bypass in the operation detail panel

### Implemented
- `src/ui/map/components/TopToolbar.tsx`
  - promoted the standalone return affordance to a clearer `WARROOM` button
  - added a visible `CODEX` entry in the toolbar `Reference` module
- `src/ui/shared/playerVisibility.ts`
  - added `findPlayerFacingOperationByKey(...)` so operation selection can resolve through the same player-facing filter contract used elsewhere
- `src/ui/map/components/OperationDetail.tsx`
  - now resolves the selected operation through `findPlayerFacingOperationByKey(...)`
  - no longer reads `loadedGameState.operations` directly
- `tests/ui_player_visibility.test.ts`
  - added a regression proving raw enemy operation keys do not resolve through the player-facing lookup

### Verification
- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts`
  - PASS (`7` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

### Notes
- `npm run desktop:map:build` could not be re-run in this clean worktree because the worktree environment is currently missing `@vitejs/plugin-react`; this is an environment/dependency issue in the execution lane, not a failure introduced by this slice
- the larger Army HQ threat/intel abstraction remains open and is the next player-truth target after this checkpoint

### Why this matters
- `OperationDetail` was still a live example of the repo receiving player-facing filters in one hand and bypassing them in the other
- standalone tactical map also still felt like a legacy shell because the return path and Codex entrypoint were technically present but not product-obvious
- this slice makes the shell more honest and removes one more omniscient panel path before the deeper threat-assessment cleanup
