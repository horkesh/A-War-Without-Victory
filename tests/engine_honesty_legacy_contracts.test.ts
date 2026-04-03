import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { validateBrigadeRepositionOrder } from '../src/desktop/desktop_sim.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { isSectorAssignmentExemptCorpsId } from '../src/sim/combat/corps_front_sectors_constants.js';
import { applyBrigadeRepositionOrders } from '../src/sim/combat/apply_brigade_reposition.js';
import { applyBrigadePressureToState } from '../src/sim/combat/brigade_pressure.js';
import type { GameState } from '../src/state/game_state.js';

function collectTsFiles(root: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      results.push(...collectTsFiles(full));
      continue;
    }
    if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

describe('engine honesty legacy contracts', () => {
  it('treats only army-HQ reserve corps ids as sector-assignment exempt', () => {
    expect(isSectorAssignmentExemptCorpsId('arbih_general_staff')).toBe(true);
    expect(isSectorAssignmentExemptCorpsId('vrs_main_staff')).toBe(true);
    expect(isSectorAssignmentExemptCorpsId('hvo_main_staff')).toBe(true);

    expect(isSectorAssignmentExemptCorpsId('arbih_3rd_corps')).toBe(false);
    expect(isSectorAssignmentExemptCorpsId('vrs_1st_krajina')).toBe(false);
    expect(isSectorAssignmentExemptCorpsId(null)).toBe(false);
  });

  it('consumes legacy brigade reposition orders without mutating formation truth', () => {
    const state = {
      military: {
        brigade_reposition_orders: {
          b1: { destination_sids: ['osid:foo'] },
        },
        formations: {
          b1: {
            id: 'b1',
            faction: 'RBiH',
            kind: 'brigade',
            status: 'active',
            location_osid: 'osid:bar',
          },
        },
      },
    } as unknown as GameState;

    applyBrigadeRepositionOrders(state, []);

    expect(state.military.brigade_reposition_orders).toBeUndefined();
    expect(state.military.formations.b1.location_osid).toBe('osid:bar');
  });

  it('rejects new brigade reposition orders at the desktop contract boundary', async () => {
    const state = {
      meta: { turn: 4 },
      military: {
        formations: {
          b1: {
            id: 'b1',
            faction: 'RBiH',
            kind: 'brigade',
            status: 'active',
            location_osid: 'osid:bar',
          },
        },
      },
      political: {
        political_controllers: {
          'osid:foo': 'RBiH',
        },
      },
    } as unknown as GameState;

    await expect(
      validateBrigadeRepositionOrder(state, 'b1', ['osid:foo'], 'F:\\AWWV_exec_clean'),
    ).resolves.toEqual({
      valid: false,
      error: 'Brigade reposition orders are retired; use movement or sector assignment instead',
    });
  });

  it('does not expose retired brigade reposition orders to the player shell', () => {
    const parsed = parseGameState({
      meta: { turn: 7, phase: 'war' },
      military: {
        formations: {
          b1: {
            id: 'b1',
            faction: 'RBiH',
            name: 'B1',
            kind: 'brigade',
            readiness: 'active',
            cohesion: 70,
            status: 'active',
            created_turn: 1,
            tags: [],
          },
        },
        brigade_reposition_orders: {
          b1: { settlement_ids: ['S2', 'S3'] },
        },
      } as any,
      political: {
        political_controllers: { S2: 'RBiH', S3: 'RBiH' },
      } as any,
      displacement: {
        civilian_casualties: {},
      } as any,
    });

    expect(parsed.repositionOrders).toBeUndefined();
  });

  it('keeps legacy brigade pressure as a no-op compatibility sink', () => {
    const state = {
      meta: { turn: 7 },
      military: {
        front_pressure: {
          's1:s2': {
            edge_id: 's1:s2',
            value: 4,
            max_abs: 4,
            last_updated_turn: 6,
          },
        },
      },
      political: {
        political_controllers: {
          s1: 'RBiH',
          s2: 'RS',
        },
      },
    } as unknown as GameState;

    const before = JSON.parse(JSON.stringify(state.military.front_pressure));

    applyBrigadePressureToState(state, [{ a: 's1', b: 's2' } as any]);

    expect(state.military.front_pressure).toEqual(before);
  });

  it('keeps legacy brigade AoR helpers fenced away from live runtime callers', () => {
    const srcRoot = join(process.cwd(), 'src');
    const files = collectTsFiles(srcRoot);
    const offenders: string[] = [];

    for (const file of files) {
      const rel = relative(srcRoot, file).split(sep).join('/');
      if (rel.startsWith('_archived/')) continue;
      if (rel === 'sim/combat/brigade_aor_legacy.ts') continue;
      const text = readFileSync(file, 'utf8');
      if (text.includes("from './brigade_aor_legacy.js'") || text.includes("from \"./brigade_aor_legacy.js\"")) {
        if (rel !== 'sim/combat/brigade_pressure.ts') {
          offenders.push(rel);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not advertise retired brigade reposition desktop bridge paths in live code', () => {
    const preload = readFileSync(join(process.cwd(), 'src', 'desktop', 'preload.cjs'), 'utf8');
    const electronMain = readFileSync(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const useIpc = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');

    expect(preload).not.toContain('stageBrigadeRepositionOrder');
    expect(preload).not.toContain('stage-brigade-reposition-order');
    expect(electronMain).not.toContain('stage-brigade-reposition-order');
    expect(useIpc).not.toContain('stageBrigadeRepositionOrder');
  });

  it('does not advertise legacy front-assignment desktop bridge paths in live code', () => {
    const preload = readFileSync(join(process.cwd(), 'src', 'desktop', 'preload.cjs'), 'utf8');
    const electronMain = readFileSync(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const useIpc = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');

    expect(preload).not.toContain('assignBrigadeToFront');
    expect(preload).not.toContain('assign-brigade-to-front');
    expect(electronMain).not.toContain('assign-brigade-to-front');
    expect(useIpc).not.toContain('assignBrigadeToFront');
  });

  it('does not advertise retired AoR and corps-front staging bridges in live code', () => {
    const preload = readFileSync(join(process.cwd(), 'src', 'desktop', 'preload.cjs'), 'utf8');
    const electronMain = readFileSync(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const useIpc = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');
    const desktopSim = readFileSync(join(process.cwd(), 'src', 'desktop', 'desktop_sim.ts'), 'utf8');

    expect(preload).not.toContain('stageBrigadeAoROrder');
    expect(preload).not.toContain('stage-brigade-aor-order');
    expect(electronMain).not.toContain('stage-brigade-aor-order');
    expect(useIpc).not.toContain('stageBrigadeAoROrder');

    expect(preload).not.toContain('stageCorpsFrontOrder');
    expect(preload).not.toContain('stage-corps-front-order');
    expect(electronMain).not.toContain('stage-corps-front-order');
    expect(useIpc).not.toContain('stageCorpsFrontOrder');
    expect(desktopSim).not.toContain('export async function stageCorpsFrontOrder');

    expect(preload).not.toContain('stageOgSubfrontOrder');
    expect(preload).not.toContain('stage-og-subfront-order');
    expect(electronMain).not.toContain('stage-og-subfront-order');
    expect(useIpc).not.toContain('stageOgSubfrontOrder');
    expect(desktopSim).not.toContain('export function stageOgSubfrontOrder');
  });

  it('does not keep dead corps-front runtime authority in the live war pipeline or state schema', () => {
    const warPhases = readFileSync(join(process.cwd(), 'src', 'sim', 'turn_phases', 'war_phases.ts'), 'utf8');
    const scenarioRunner = readFileSync(join(process.cwd(), 'src', 'scenario', 'scenario_runner.ts'), 'utf8');
    const gameState = readFileSync(join(process.cwd(), 'src', 'state', 'game_state.ts'), 'utf8');

    expect(warPhases).not.toContain('ensure-derived-corps-front-edges');
    expect(warPhases).not.toContain('apply-corps-front-orders');
    expect(warPhases).not.toContain('ensureDerivedCorpsFrontEdges');
    expect(warPhases).not.toContain('applyCorpsFrontAutoDistribution');
    expect(scenarioRunner).not.toContain('front_corps_tracking');
    expect(gameState).not.toContain('corps_front_edges?:');
    expect(gameState).not.toContain('corps_fallback_front_edges?:');
    expect(gameState).not.toContain('og_subfront_edges?:');
  });

  it('does not keep retired corps attack-axis bridge paths in live code', () => {
    const preload = readFileSync(join(process.cwd(), 'src', 'desktop', 'preload.cjs'), 'utf8');
    const electronMain = readFileSync(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const useIpc = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');
    const desktopSim = readFileSync(join(process.cwd(), 'src', 'desktop', 'desktop_sim.ts'), 'utf8');
    const warPhases = readFileSync(join(process.cwd(), 'src', 'sim', 'turn_phases', 'war_phases.ts'), 'utf8');
    const gameState = readFileSync(join(process.cwd(), 'src', 'state', 'game_state.ts'), 'utf8');

    expect(preload).not.toContain('stageCorpsAttackAxisOrder');
    expect(preload).not.toContain('stage-corps-attack-axis-order');
    expect(electronMain).not.toContain('stage-corps-attack-axis-order');
    expect(useIpc).not.toContain('stageCorpsAttackAxisOrder');
    expect(desktopSim).not.toContain('export function stageCorpsAttackAxisOrder');
    expect(warPhases).not.toContain('apply-corps-attack-axis-orders');
    expect(warPhases).not.toContain('applyCorpsAttackAxisOrders');
    expect(gameState).not.toContain('corps_attack_axis_orders?:');
  });

  it('uses subscription-based desktop bridge fanout instead of singleton callback slots', () => {
    const preload = readFileSync(join(process.cwd(), 'src', 'desktop', 'preload.cjs'), 'utf8');
    const useIpc = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');
    const useDesktopSession = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'hooks', 'useDesktopSession.ts'), 'utf8');
    const warroom = readFileSync(join(process.cwd(), 'src', 'ui', 'warroom', 'warroom.ts'), 'utf8');
    const embeddedMap = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'index.html'), 'utf8');

    expect(preload).toContain('subscribeGameStateUpdated');
    expect(preload).toContain('subscribeTurnReportUpdated');
    expect(preload).not.toContain('let gameStateUpdatedCallback');
    expect(preload).not.toContain('let turnReportUpdatedCallback');
    expect(preload).not.toContain('setGameStateUpdatedCallback');
    expect(preload).not.toContain('setTurnReportUpdatedCallback');

    expect(useIpc).toContain('subscribeGameStateUpdated');
    expect(useIpc).toContain('subscribeTurnReportUpdated');
    expect(useIpc).not.toContain('setGameStateUpdatedCallback');
    expect(useIpc).not.toContain('setTurnReportUpdatedCallback');

    expect(useDesktopSession).toContain('subscribeGameStateUpdated');
    expect(useDesktopSession).toContain('subscribeTurnReportUpdated');
    expect(useDesktopSession).not.toContain('setGameStateUpdatedCallback');
    expect(useDesktopSession).not.toContain('setTurnReportUpdatedCallback');

    expect(warroom).toContain('awwv-bridge:subscribe-event');
    expect(warroom).not.toContain('awwv-bridge:subscribe-game-state');
    expect(warroom).not.toContain('reRegisterWarroomCallback');

    expect(embeddedMap).toContain('subscribeGameStateUpdated');
    expect(embeddedMap).toContain('subscribeTurnReportUpdated');
    expect(embeddedMap).toContain('turn-report-updated');
    expect(embeddedMap).not.toContain('setGameStateUpdatedCallback');
  });

  it('does not advertise unused front/theatre renaming bridges in live code', () => {
    const preload = readFileSync(join(process.cwd(), 'src', 'desktop', 'preload.cjs'), 'utf8');
    const electronMain = readFileSync(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const useIpc = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');

    expect(preload).not.toContain('renameFrontSegment');
    expect(preload).not.toContain('rename-front-segment');
    expect(electronMain).not.toContain('rename-front-segment');
    expect(useIpc).not.toContain('renameFrontSegment');

    expect(preload).not.toContain('renameTheatre');
    expect(preload).not.toContain('rename-theatre');
    expect(electronMain).not.toContain('rename-theatre');
    expect(useIpc).not.toContain('renameTheatre');
  });

  it('does not expose legacy AoR-cap bridges or adapter fields in the live player shell', () => {
    const preload = readFileSync(join(process.cwd(), 'src', 'desktop', 'preload.cjs'), 'utf8');
    const electronMain = readFileSync(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const useIpc = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');
    const types = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'data', 'types.ts'), 'utf8');
    const adapter = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'data', 'GameStateAdapter.ts'), 'utf8');

    expect(preload).not.toContain('setBrigadeDesiredAoRCap');
    expect(preload).not.toContain('set-brigade-desired-aor-cap');
    expect(electronMain).not.toContain('set-brigade-desired-aor-cap');
    expect(useIpc).not.toContain('setBrigadeDesiredAoRCap');
    expect(types).not.toContain('brigadeDesiredAoRCap');
    expect(adapter).not.toContain('brigadeDesiredAoRCap');
    expect(adapter).not.toContain('brigade_desired_aor_cap');
  });

  it('does not keep retired front/theatre mutation helpers exported from desktop_sim', () => {
    const desktopSim = readFileSync(join(process.cwd(), 'src', 'desktop', 'desktop_sim.ts'), 'utf8');

    expect(desktopSim).not.toContain('export function assignBrigadeToFront');
    expect(desktopSim).not.toContain('export function renameFrontSegment');
    expect(desktopSim).not.toContain('export function renameTheatre');
  });

  it('does not keep a dead local-front constructor pretending to be live runtime authority', () => {
    const localFrontDefense = readFileSync(join(process.cwd(), 'src', 'sim', 'combat', 'local_front_defense.ts'), 'utf8');
    const frontAssignment = readFileSync(join(process.cwd(), 'src', 'sim', 'combat', 'front_assignment.ts'), 'utf8');
    const warPhases = readFileSync(join(process.cwd(), 'src', 'sim', 'turn_phases', 'war_phases.ts'), 'utf8');
    const gameState = readFileSync(join(process.cwd(), 'src', 'state', 'game_state.ts'), 'utf8');

    expect(localFrontDefense).not.toContain('export function buildLocalFronts');
    expect(frontAssignment).not.toContain('ensureBrigadeFrontAssignments');
    expect(warPhases).not.toContain('ensure-brigade-front-assignment');
    expect(gameState).toContain('Legacy compatibility cache only. No longer rebuilt in the live war pipeline.');
  });

  it('does not keep theatre tagging in the live turn pipelines', () => {
    const warPhases = readFileSync(join(process.cwd(), 'src', 'sim', 'turn_phases', 'war_phases.ts'), 'utf8');
    const turnPipeline = readFileSync(join(process.cwd(), 'src', 'sim', 'turn_pipeline.ts'), 'utf8');
    const theatres = readFileSync(join(process.cwd(), 'src', 'state', 'theatres.ts'), 'utf8');

    expect(warPhases).not.toContain('assignFrontSegmentTheatres');
    expect(warPhases).not.toContain('ensureDefaultTheatres');
    expect(turnPipeline).not.toContain('assignFrontSegmentTheatres');
    expect(turnPipeline).not.toContain('ensureDefaultTheatres');
    expect(theatres).toContain('Legacy theatre compatibility helpers.');
  });

  it('does not seed dead front or theatre shell state in browser fallback campaign loading', () => {
    const browserFallback = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'campaignRecruitmentActions.ts'), 'utf8');

    expect(browserFallback).not.toContain('brigade_front_assignment: {}');
    expect(browserFallback).not.toContain('army_theatre_assignment: {}');
    expect(browserFallback).not.toContain('theatres: {}');
  });

  it('marks legacy front and theatre schema fields honestly as compatibility-only', () => {
    const gameState = readFileSync(join(process.cwd(), 'src', 'state', 'game_state.ts'), 'utf8');

    expect(gameState).toContain('Legacy compatibility snapshot derived from canonical front_edges');
    expect(gameState).toContain('Legacy compatibility fallback only. Null = reserve; sectors/front edges are the live frontline truth.');
    expect(gameState).toContain('Legacy theatre compatibility state. Not a live player-shell or turn-pipeline authority.');
    expect(gameState).toContain('Legacy theatre compatibility assignment. Preserved only for old saves/tools.');
    expect(gameState).toContain('Legacy AoR tuning compatibility field. Do not expose in the live player shell and do not write new values.');
  });

  it('does not advertise retired AoR-cap IPC channels in the desktop contract doc', () => {
    const ipcContract = readFileSync(join(process.cwd(), 'docs', '20_engineering', 'DESKTOP_GUI_IPC_CONTRACT.md'), 'utf8');

    expect(ipcContract).not.toContain('set-brigade-desired-aor-cap');
    expect(ipcContract).toContain('must treat those as compatibility/history residue rather than active shell concepts');
  });

  it('does not let the scenario harness seed synthetic frontier state to force breaches', () => {
    const runner = readFileSync(join(process.cwd(), 'src', 'scenario', 'scenario_runner.ts'), 'utf8');

    expect(runner).not.toContain("state.military.front_posture[e.side_a].assignments[e.edge_id]");
    expect(runner).not.toContain("(f as any).assignment = { kind: 'edge', edge_id:");
    expect(runner).not.toContain("(state.military.front_segments as Record<string, unknown>)[eid] =");
    expect(runner).not.toContain("(state.military.front_pressure as Record<string, { edge_id: string; value: number; max_abs: number; last_updated_turn: number }>)[eid] =");
  });
});
