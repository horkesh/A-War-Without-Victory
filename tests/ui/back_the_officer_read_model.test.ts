import { describe, expect, it } from 'vitest';

import {
  buildBackTheOfficerViews,
  buildTgAftermathViews,
  buildFraming,
  buildAftermathStory,
  type BackTheOfficerRosterRow,
} from '../../src/ui/map/data/backTheOfficer.js';

const ROSTER: BackTheOfficerRosterRow[] = [
  { id: 'off_dudakovic', name: 'Atif Dudaković', rank: 'corps_commander', status: 'active' },
  { id: 'off_fallen', name: 'Enver Hadžihasanović', rank: 'corps_commander', status: 'killed' },
];

// Minimal raw GameState shape exercising the Phase 3A telemetry fields the
// read-model reads (corps_command active ops + brigade_history.tg_participations).
function makeState() {
  return {
    military: {
      formations: {
        '5th_corps': { name: '5th Corps' },
        '7th_corps': { name: '7th Corps' },
        anchor_bde: {
          name: 'Anchor Brigade',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'anchor', formed_turn: 30 },
            ],
          },
        },
        donor_bde_a: {
          name: 'Donor A',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 800, donor_corps_id: '5th_corps' },
            ],
          },
        },
        donor_bde_b: {
          name: 'Donor B',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 600, donor_corps_id: '7th_corps' },
            ],
          },
        },
      },
      corps_command: {
        '1st_corps': {
          active_operations: [
            {
              id: 'op_trnovo',
              name: 'Operation Trnovo',
              tg_id: 'tg:trnovo',
              tg_display_name: 'TG Trnovo',
              tg_commander_officer_id: 'off_dudakovic',
            },
          ],
        },
      },
    },
  };
}

describe('back-the-officer read-model', () => {
  it('projects TG identity, commander, and donor lineage from state', () => {
    const views = buildBackTheOfficerViews(makeState(), ROSTER);
    expect(views).toHaveLength(1);
    const v = views[0];
    expect(v.tg_name).toBe('TG Trnovo');
    expect(v.tg_id).toBe('tg:trnovo');
    expect(v.commander?.name).toBe('Atif Dudaković');
    expect(v.commander?.lost).toBe(false);
    expect(v.donors.map((d) => d.corps_id)).toEqual(['5th_corps', '7th_corps']);
    expect(v.total_personnel_lent).toBe(1400);
    // Framing frames the decision as backing the named CO + names donor corps + cost.
    expect(v.framing).toContain('Atif Dudaković');
    expect(v.framing).toContain('5th Corps');
    expect(v.framing).toContain('1,400');
  });

  it('is empty and defensive on flag-off / pre-3A state', () => {
    expect(buildBackTheOfficerViews({ military: { formations: {}, corps_command: {} } }, ROSTER)).toEqual([]);
    expect(buildBackTheOfficerViews({}, ROSTER)).toEqual([]);
    expect(buildBackTheOfficerViews(null, undefined)).toEqual([]);
  });

  it('falls back to army HQ donor lineage when participations are sparse', () => {
    const state = {
      military: {
        formations: { '2nd_corps': { name: '2nd Corps' }, '3rd_corps': { name: '3rd Corps' } },
        army_hq_operations: {
          farz: { tg_id: 'tg:farz', donor_corps_ids: ['2nd_corps', '3rd_corps'] },
        },
        corps_command: {
          '1st_corps': {
            active_operations: [{ id: 'op_farz', name: 'Farz 95', tg_id: 'tg:farz', tg_commander_officer_id: 'off_dudakovic' }],
          },
        },
      },
    };
    const views = buildBackTheOfficerViews(state, ROSTER);
    expect(views).toHaveLength(1);
    expect(views[0].donors.map((d) => d.corps_id)).toEqual(['2nd_corps', '3rd_corps']);
    expect(views[0].total_personnel_lent).toBe(0);
  });

  it('builds aftermath stories with per-donor casualties', () => {
    const state = {
      military: {
        formations: {
          '5th_corps': { name: '5th Corps' },
          donor_bde: {
            name: 'Donor',
            brigade_history: {
              tg_participations: [
                { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 800, personnel_returned: 500, donor_corps_id: '5th_corps' },
              ],
            },
          },
        },
        corps_command: {
          '1st_corps': {
            active_operations: [{ id: 'op_trnovo', name: 'Operation Trnovo', tg_id: 'tg:trnovo', tg_commander_officer_id: 'off_dudakovic' }],
          },
        },
      },
    };
    const aftermath = buildTgAftermathViews(state, ROSTER);
    expect(aftermath).toHaveLength(1);
    expect(aftermath[0].donors[0].casualties).toBe(300);
    expect(aftermath[0].total_casualties).toBe(300);
    expect(aftermath[0].anchor_lost).toBe(false);
    expect(aftermath[0].story).toContain('5th Corps');
  });

  it('reads anchor-death dissolution from a lost commander status', () => {
    const story = buildAftermathStory(
      'TG Bosna',
      { officer_id: 'off_fallen', name: 'Enver Hadžihasanović', rank: 'corps_commander', lost: true, status: 'killed' },
      [],
      0,
      true,
    );
    expect(story).toContain('dissolved');
    expect(story).toContain('killed');
    expect(story).toContain('Enver Hadžihasanović');
  });

  it('framing degrades gracefully with no commander and no donors', () => {
    const framing = buildFraming(null, 'Operation X', null, [], 0);
    expect(framing).toContain('the field commander');
    expect(framing).toContain('own corps');
  });
});
