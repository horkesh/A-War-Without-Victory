import { describe, expect, it } from 'vitest';
import { extractWarData } from '../src/ui/warroom/data/war_data_extractor.js';
import { ReportsModal } from '../src/ui/warroom/components/ReportsModal.js';
import { MagazineModal } from '../src/ui/warroom/components/MagazineModal.js';
import type { GameState } from '../src/state/game_state.js';

describe('warroom player visibility', () => {
  it('extractWarData exposes contacted enemies as abstract player-facing contacts', () => {
    const state = {
      meta: { turn: 4, phase: 'war' },
      factions: [{ id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } }, { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } }],
      military: {
        formations: {
          arbih_b1: { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 1200 },
          rs_b1: { faction: 'RS', kind: 'brigade', status: 'active', personnel: 1400, name: 'Enemy Shock Brigade' },
        },
        casualty_ledger: {
          RS: {
            per_formation: {
              rs_b1: { killed: 4, wounded: 7 },
            },
          },
        },
        front_edges: [],
        front_pressure: {},
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: {},
        corps_command: {},
      },
      political: {
        political_controllers: {},
        war_exhaustion: { RBiH: 0.2 },
        loss_of_control_trends: { by_faction: { RBiH: { exhaustion_trend: 'flat' } } },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: {},
        hostile_takeover_timers: {},
        civilian_casualties: {},
        sustainability_state: {},
      },
    } as unknown as GameState;

    const snap = extractWarData(state, 'RBiH');
    expect(snap.contactedEnemyFormations).toEqual([
      expect.objectContaining({
        label: 'Enemy contact',
        strengthCategory: expect.any(String),
      }),
    ]);
    expect(snap.contactedEnemyFormations[0]).not.toHaveProperty('name');
    expect(snap.contactedEnemyFormations[0]).not.toHaveProperty('formationId');
  });

  it('warroom report and magazine surfaces do not print raw enemy formation names', () => {
    const snap = {
      engagedFrontEdges: [
        { settlementA: 'op:sarajevo:centar', settlementB: 'op:grbavica:south', pressure: 0.8, friction: 0.4, tier: 'exposed' },
      ],
      ownForces: {
        formationDetails: [],
      },
      contactedEnemyFormations: [
        { label: 'Enemy contact', strengthCategory: 'regimental', contactSettlement: 'sarajevo_1', detectedTurn: 4 },
      ],
      brigadeMovement: { encircled: [] },
      ownDisplacement: { activeHostileTakeoverTimers: 0, activeCamps: 0 },
      ownSupply: { criticalCount: 0, strainedCount: 0, collapsedMunicipalities: ['bijeljina_center'] },
      ownCorpsOps: [],
    } as any;

    const reportBody = (new ReportsModal({} as any) as any).generateWarReportBody(snap, 4);
    expect(reportBody).toContain('Enemy contact');
    expect(reportBody).not.toContain('Enemy Shock Brigade');
    expect(reportBody).toContain('Sarajevo Centar');
    expect(reportBody).toContain('Grbavica South');
    expect(reportBody).toContain('Sarajevo 1');
    expect(reportBody).toContain('Bijeljina Center');
    expect(reportBody).not.toContain('op:sarajevo:centar');
    expect(reportBody).not.toContain('op:grbavica:south');
    expect(reportBody).not.toContain('sarajevo_1');
    expect(reportBody).not.toContain('bijeljina_center');

    const section = (new MagazineModal({} as any) as any).renderEnemyAssessmentSection(snap);
    expect(section.textContent).toContain('Enemy contact');
    expect(section.textContent).not.toContain('Enemy Shock Brigade');
  });

  it('extractWarData scopes supply summaries to player-controlled municipalities', () => {
    const state = {
      meta: { turn: 7, phase: 'war' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {},
        casualty_ledger: {},
        front_edges: [],
        front_pressure: {},
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: {},
        corps_command: {},
      },
      political: {
        political_controllers: {
          'op:tuzla:centar': 'RBiH',
          'op:tuzla:west': 'RBiH',
          'op:bijeljina:center': 'RS',
          'op:bijeljina:north': 'RS',
        },
        war_exhaustion: { RBiH: 0.1 },
        loss_of_control_trends: { by_faction: { RBiH: { exhaustion_trend: 'flat' } } },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: {},
        hostile_takeover_timers: {},
        civilian_casualties: {},
        sustainability_state: {
          tuzla: { mun_id: 'tuzla', collapsed: false, sustainability_score: 25 },
          bijeljina: { mun_id: 'bijeljina', collapsed: true, sustainability_score: 10 },
        },
      },
    } as unknown as GameState;

    const snap = extractWarData(state, 'RBiH');
    expect(snap.ownSupply).toEqual({
      adequateCount: 0,
      strainedCount: 0,
      criticalCount: 1,
      collapsedMunicipalities: [],
    });
  });

  it('extractWarData uses player-safe names for own formations and corps operations', () => {
    const state = {
      meta: { turn: 9, phase: 'war' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {
          arbih_3rd_corps: { faction: 'RBiH', kind: 'corps', status: 'active', name: 'arbih_3rd_corps', personnel: 0 },
          arbih_b1: { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 1200, corps_id: 'arbih_3rd_corps', name: '' },
        },
        casualty_ledger: {},
        front_edges: [],
        front_pressure: {},
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: {},
        corps_command: {
          arbih_3rd_corps: { stance: 'balanced', active_operations: [] },
        },
      },
      political: {
        political_controllers: {},
        war_exhaustion: { RBiH: 0.1 },
        loss_of_control_trends: { by_faction: { RBiH: { exhaustion_trend: 'flat' } } },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: {},
        hostile_takeover_timers: {},
        civilian_casualties: {},
        sustainability_state: {},
      },
    } as unknown as GameState;

    const snap = extractWarData(state, 'RBiH');
    expect(snap.ownForces.formationDetails.find((f) => f.id === 'arbih_3rd_corps')?.name).toBe('3rd Corps');
    expect(snap.ownForces.formationDetails.find((f) => f.id === 'arbih_b1')?.name).toBe('Assigned brigade');
    expect(snap.ownCorpsOps[0]?.corpsName).toBe('3rd Corps');
  });
});
