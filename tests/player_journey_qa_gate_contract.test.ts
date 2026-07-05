import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('player journey QA gate contract', () => {
  it('exposes a broad player-experience gate for release-facing sweeps', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const script = pkg.scripts?.['qa:player-experience'] ?? '';

    expect(script).toBe('node tools/ui/player_experience_gate.cjs');
  });

  it('exposes an Electron runtime contract slice for live-start regressions', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const script = pkg.scripts?.['qa:electron-runtime-contracts'] ?? '';

    expect(script).toContain('vitest run');
    expect(script).toContain('tests/desktop_persistence_contract.test.ts');
    expect(script).toContain('tests/desktop_sim_bundle_smoke.test.ts');
    expect(script).toContain('tests/desktop_packaged_runtime_probe.test.ts');
    expect(script).toContain('tests/warroom_new_campaign_flow_truth.test.ts');
    expect(script).toContain('tests/ui/warroom_launch_screen_contract.test.ts');
    expect(script).toContain('tests/ui/decision_family_modals.test.ts');
    expect(script).toContain('tests/ui/command_briefing_banner_contract.test.ts');
    expect(script).toContain('tests/ui_map_deck_counter_visibility.test.ts');
  });

  it('exposes a focused release-polish gate for first-hour and stale-state risks', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const script = pkg.scripts?.['qa:player-journeys'] ?? '';

    expect(script).toContain('vitest run');
    expect(script).toContain('tests/browser_campaign_start_fallback.test.ts');
    expect(script).toContain('tests/ui/event_decision_auto_launch_contract.test.ts');
    expect(script).toContain('tests/ui/onboarding_automount_edge_cases.test.ts');
    expect(script).toContain('tests/ui/onboarding_track_d_consolidation.test.ts');
    expect(script).toContain('tests/ui/gamestore_load_reset.test.ts');
    expect(script).toContain('tests/ui_map_selection_store.test.ts');
    expect(script).toContain('tests/ui_map_game_state_adapter.test.ts');
    expect(script).toContain('tests/ui_map_battle_casualty_truth.test.ts');
    expect(script).toContain('tests/deck_click_selection_priority.test.ts');
    expect(script).toContain('tests/ui/gui_audit_dead_controls.test.ts');
    expect(script).toContain('tests/ui/inbox_items.test.ts');
    expect(script).toContain('tests/ui_presidential_toolbar_summary_click.test.ts');
    expect(script).toContain('tests/ui/panel_rail_ownership.test.ts');
    expect(script).toContain('tests/ui_map_panel_rail.test.ts');
    expect(script).toContain('tests/ui/settlement_supply_status.test.ts');
    expect(script).toContain('tests/ui/settlement_timeline_i18n.test.ts');
    expect(script).toContain('tests/ui/shell_navigation_ownership.test.ts');
    expect(script).toContain('tests/ui_shell_navigation.test.ts');
    expect(script).toContain('tests/ui/president_desk_shell.test.ts');
    expect(script).toContain('tests/ui/presidential_decision_room.test.ts');
    expect(script).toContain('tests/ui/turn_aftermath_modal_i18n.test.ts');
    expect(script).toContain('tests/ui/pre_advance_command_review.test.ts');
    expect(script).toContain('tests/ui/oob_operations_panel.test.ts');
    expect(script).toContain('tests/ui/commander_read_model_surfaces.test.ts');
    expect(script).toContain('tests/ui/army_hq_sector_truth.test.ts');
  });
});
