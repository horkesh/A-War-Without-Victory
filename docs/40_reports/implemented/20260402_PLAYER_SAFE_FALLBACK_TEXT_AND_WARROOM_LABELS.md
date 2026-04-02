## 2026-04-02 - Player-safe fallback text and Warroom report label cleanup

### Scope
- remove more raw internal text from player-facing settlement and Warroom surfaces
- make fallback copy use player-safe labels instead of brigade IDs or raw municipality/OSID strings

### Implemented
- `src/ui/map/components/SelectionPanel.tsx`
  - local-support staging copy now uses player-safe municipality labels instead of raw `mun_id`
- `src/ui/map/components/SettlementDetailContent.tsx`
  - pending order rows now use player-safe brigade fallback text instead of raw brigade ids
- `src/ui/warroom/components/ReportsModal.ts`
  - added settlement-label humanization for:
    - front status lines
    - enemy contact locations
    - collapsed municipality lists
- `tests/warroom_player_visibility.test.ts`
  - added regression coverage proving Warroom reports humanize raw settlement identifiers instead of leaking engine ids

### Verification
- `node_modules\.bin\vitest.cmd run tests\warroom_player_visibility.test.ts tests\ui_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`23` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

### Why this matters
- once the big leaks are fixed, the remaining player-facing raw ids usually survive in fallback text, summary shells, and small support/status lines
- those surfaces still shape the product tone; if they print engine identifiers, the game still feels like tools leaking through
- this slice keeps pushing the repo toward a rule that player-facing text should always resolve to human labels or neutral safe fallbacks
