## 2026-04-02 - Army HQ threat assessment made player-safe

### Scope
- remove omniscient enemy-operation synthesis from Army HQ threat assessment
- keep the feature useful by grounding it in player-plausible sector intel instead

### Implemented
- `src/ui/map/components/army_hq/generateThreatAssessment.ts`
  - removed direct synthesis from raw enemy operations (`execution`, `staging`, `stalled`)
  - threat items now come from sector-intel observations only:
    - hostile offensive preparation
    - hostile defenses consolidating
    - weak intelligence picture
- `tests/ui_map_render_smoke.test.ts`
  - updated the threat-assessment regression to assert the panel no longer claims exact hostile operation execution/staging from raw enemy state

### Verification
- `node_modules\.bin\vitest.cmd run tests\ui_map_render_smoke.test.ts tests\ui_player_visibility.test.ts`
  - PASS (`20` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

### Why this matters
- the previous implementation looked player-safe on the surface because it avoided raw enemy ids in the text
- but it was still deriving exact threat conclusions from omniscient enemy operation state
- that makes the Army HQ panel a disguised debug surface rather than a believable staff abstraction
- the repaired version still warns about danger, but it now does so from intel signals the player could plausibly possess
