import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractWarData } from '../src/ui/warroom/data/war_data_extractor.js';
import { ReportsModal } from '../src/ui/warroom/components/ReportsModal.js';
import { MagazineModal } from '../src/ui/warroom/components/MagazineModal.js';
import { CommandBriefingModal } from '../src/ui/warroom/components/CommandBriefingModal.js';
import { FactionOverviewPanel } from '../src/ui/warroom/components/FactionOverviewPanel.js';
import type { GameState } from '../src/state/game_state.js';

describe('warroom player visibility', () => {
  it('extractWarData exposes contacted enemies as abstract front-contact summaries', () => {
    const state = {
      meta: { turn: 4, phase: 'war' },
      factions: [{ id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } }, { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } }],
      military: {
        formations: {
          arbih_b1: { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 1200, location_osid: 'op:sarajevo:centar' },
          rs_b1: { faction: 'RS', kind: 'brigade', status: 'active', personnel: 1400, name: 'Enemy Shock Brigade', location_osid: 'op:grbavica:south' },
        },
        casualty_ledger: {
          RS: {
            per_formation: {
              rs_b1: { killed: 4, wounded: 7 },
            },
          },
        },
        front_edges: [
          { edge_id: 'edge_1', a: 'op:sarajevo:centar', b: 'op:grbavica:south', side_a: 'RBiH', side_b: 'RS' },
        ],
        front_pressure: { edge_1: { value: 0.8, max_abs: 1, last_updated_turn: 4 } },
        front_segments: { edge_1: { friction: 0.3 } },
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
        contactSettlement: 'op:grbavica:south',
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
    expect(snap.ownCorpsOps[0]?.operation).toEqual(null);
  });

  it('warroom corps operation snapshots stay summary-only instead of exposing raw CorpsOperation payloads', () => {
    const state = {
      meta: { turn: 9, phase: 'war' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {
          arbih_3rd_corps: { faction: 'RBiH', kind: 'corps', status: 'active', name: 'arbih_3rd_corps', personnel: 0 },
        },
        casualty_ledger: {},
        front_edges: [],
        front_pressure: {},
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: {},
        corps_command: {
          arbih_3rd_corps: {
            stance: 'balanced',
            active_operations: [{ type: 'sector_attack', phase: 'execution', started_turn: 8, objectives: ['op:secret'], participating_brigades: ['arbih_b1'] }],
          },
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
    expect(snap.ownCorpsOps[0]?.operation).toEqual({
      type: 'sector_attack',
      phase: 'execution',
      started_turn: 8,
    });
    expect(snap.ownCorpsOps[0]?.operation).not.toHaveProperty('objectives');
  });

  it('warroom command briefing uses derived command-shell warnings instead of hardcoded certainty', () => {
    const state = {
      meta: { turn: 9, phase: 'war' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {
          own_1: { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 900, posture: 'routed', name: 'Own Brigade' },
        },
        casualty_ledger: {},
        front_edges: [
          { edge_id: 'edge_1', settlement_a: 'op:sarajevo:centar', settlement_b: 'op:grbavica:south', side_a: 'RBiH', side_b: 'RS', pressure: 0.7, friction: 0.3, tier: 'exposed' },
        ],
        front_pressure: {},
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: { own_1: true },
        corps_command: {
          arbih_3rd_corps: { stance: 'balanced', active_operations: [{ type: 'sector_attack', phase: 'preparing', started_turn: 8 }] },
        },
      },
      political: {
        political_controllers: {},
        war_exhaustion: { RBiH: 0.2 },
        loss_of_control_trends: { by_faction: { RBiH: { exhaustion_trend: 'flat' } } },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: { camp_a: {} },
        hostile_takeover_timers: { pocket_1: {} },
        civilian_casualties: {},
        sustainability_state: { sarajevo: { mun_id: 'sarajevo', collapsed: false, sustainability_score: 25 } },
      },
    } as unknown as GameState;

    const panel = new CommandBriefingModal(state).render();
    const text = panel.textContent ?? '';

    expect(text).toContain('brigade routed in recent fighting');
    expect(text).toContain('front edge');
    expect(text).toContain('hostile population-pressure timer');
    expect(text).not.toContain('UNHCR humanitarian convoys are moving with minimal disruption.');
    expect(text).not.toContain('No critical enclaves nearing collapse this week.');
  });

  it('warroom reports use generic player-safe authorship instead of fake specific headquarters', () => {
    const state = {
      meta: { turn: 9, phase: 'war' },
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

    const panel = new ReportsModal(state).render();
    const text = panel.textContent ?? '';

    expect(text).toContain('Field Intelligence Summary Desk');
    expect(text).toContain('Duty Intelligence Officer');
    expect(text).not.toContain('2nd Corps Intelligence Section');
  });

  it('warroom faction overview hands detailed command review off to Army HQ', () => {
    const state = {
      meta: { turn: 10, phase: 'war' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {
          arbih_3rd_corps: { faction: 'RBiH', kind: 'corps', status: 'active', name: 'arbih_3rd_corps' },
          arbih_b1: { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 1200, corps_id: 'arbih_3rd_corps' },
        },
        casualty_ledger: {},
        front_edges: [],
        front_pressure: {},
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {
          arbih_b1: { status: 'deployed', destination_osid: null, source_osid: null, progress: 0, turns_remaining: 0 },
        },
        brigade_encircled: {},
        corps_command: {
          arbih_3rd_corps: { stance: 'balanced', active_operations: [] },
        },
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
      officers: {
        officer_pool: {
          officer_1: { id: 'officer_1', name: 'Nihad', faction: 'RBiH', rank: 'Colonel', status: 'active', assigned_corps_id: 'arbih_3rd_corps' },
        },
      },
    } as unknown as GameState;

    const modalManager = { showModal() {}, hideModal() {} };
    const panel = new FactionOverviewPanel(state, modalManager).render();
    const text = panel.textContent ?? '';

    expect(text).toContain('COMMAND SHELL');
    expect(text).toContain('Detailed formation dispositions');
    expect(text).toContain('Army HQ');
    expect(text).not.toContain('FORMATIONS (');
    expect(text).not.toContain('ASSIGN COMMANDER');
  });

  it('warroom alliance milestone wording uses human-readable labels instead of raw faction ids', () => {
    const declarationModalSource = readFileSync(
      resolve(process.cwd(), 'src/ui/warroom/components/DeclarationEventModal.ts'),
      'utf8',
    );
    expect(declarationModalSource).toContain('Bosniak-Croat ceasefire takes effect');
    expect(declarationModalSource).not.toContain('RBiH-HRHB ceasefire takes effect');

    const factionOverviewSource = readFileSync(
      resolve(process.cwd(), 'src/ui/warroom/components/FactionOverviewPanel.ts'),
      'utf8',
    );
    expect(factionOverviewSource).toContain('Bosniak-Croat relationship');
  });
  it('keeps phase 0 warroom faction copy player-safe', () => {
    const declarationModalSource = readFileSync(
      resolve(process.cwd(), 'src/ui/warroom/components/DeclarationEventModal.ts'),
      'utf8',
    );
    expect(declarationModalSource).not.toContain('Army of RBiH and HVO');
    expect(declarationModalSource).toContain('the Bosnian Army and HVO has shattered');

    const factionOverviewSource = readFileSync(
      resolve(process.cwd(), 'src/ui/warroom/components/FactionOverviewPanel.ts'),
      'utf8',
    );
    expect(factionOverviewSource).toContain('Bosnian Serb declaration pressure critical');
    expect(factionOverviewSource).toContain('Croat entity declaration pressure critical');
    expect(factionOverviewSource).toContain('Bosnian Serb declaration drive');
    expect(factionOverviewSource).not.toContain('RS declaration imminent');
    expect(factionOverviewSource).not.toContain('HRHB declaration imminent');
    expect(factionOverviewSource).not.toContain("rsPressurePct.toFixed(0) + '%'");
  });

  it('settlement info panel does not expose raw settlement or municipality ids', () => {
    const source = readFileSync(
      resolve('src/ui/warroom/components/SettlementInfoPanel.ts'),
      'utf8',
    );

    expect(source).not.toContain('Settlement ID');
    expect(source).not.toContain('Municipality ID');
    expect(source).toContain('Administrative Region');
  });

  it('settlement info panel uses human-readable faction labels instead of raw faction shorthand', () => {
    const source = readFileSync(
      resolve('src/ui/warroom/components/SettlementInfoPanel.ts'),
      'utf8',
    );

    expect(source).toContain("getPlayerSafePoliticalFactionName('RBiH')");
    expect(source).toContain("getPlayerSafePoliticalFactionName('RS')");
    expect(source).toContain("getPlayerSafePoliticalFactionName('HRHB')");
    expect(source).not.toContain('RBiH (Green)');
    expect(source).not.toContain('RS (Crimson)');
    expect(source).not.toContain('HRHB (Blue)');
  });

  it('diplomacy modal uses political faction names instead of raw shorthand in live copy', () => {
    const source = readFileSync(
      resolve('src/ui/warroom/components/DiplomacyModal.ts'),
      'utf8',
    );

    expect(source).toContain("getPlayerSafePoliticalFactionName('RS')");
    expect(source).toContain("getPlayerSafePoliticalFactionName('RBiH')");
    expect(source).toContain("getPlayerSafePoliticalFactionName('HRHB')");
    expect(source).not.toContain('Joint Pressure Bonus vs RS');
    expect(source).not.toContain("conditionRow('W5', 'RS territory > 40%'");
    expect(source).not.toContain("conditionRow('C2', 'HRHB exhaustion > 35'");
  });

  it('warroom live faction header uses the military-facing label instead of raw faction id', () => {
    const source = readFileSync(
      resolve('src/ui/warroom/components/FactionOverviewPanel.ts'),
      'utf8',
    );

    expect(source).toContain('${getFactionMilitaryLabel(pf)}');
    expect(source).not.toContain('${pf}</div>');
  });
});
