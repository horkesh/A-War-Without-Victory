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
      engagedFrontEdges: [],
      ownForces: {
        formationDetails: [],
      },
      contactedEnemyFormations: [
        { label: 'Enemy contact', strengthCategory: 'regimental', contactSettlement: 'sarajevo_1', detectedTurn: 4 },
      ],
      brigadeMovement: { encircled: [] },
      ownDisplacement: { activeHostileTakeoverTimers: 0, activeCamps: 0 },
      ownSupply: { criticalCount: 0, strainedCount: 0, collapsedMunicipalities: [] },
      ownCorpsOps: [],
    } as any;

    const reportBody = (new ReportsModal({} as any) as any).generateWarReportBody(snap, 4);
    expect(reportBody).toContain('Enemy contact');
    expect(reportBody).not.toContain('Enemy Shock Brigade');

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
});
