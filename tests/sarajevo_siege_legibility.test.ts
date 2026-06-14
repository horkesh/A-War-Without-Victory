import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { SARAJEVO_CITY_CORE_MUN_IDS } from '../src/state/enclave_integrity.js';
import {
  SARAJEVO_CORE_MUN_IDS,
  deriveSarajevoSiegeState,
  sarajevoSiegeGloss,
  sarajevoSiegeTitle,
} from '../src/ui/map/data/sarajevoSiege.js';
import { buildSarajevoSiegeChronicleEntries } from '../src/ui/map/components/chronicle/sarajevoSiegeChronicle.js';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';

/** The four urban-core OSIDs the SRK strangles (one per core municipality). */
const CORE_OSIDS = [
  'op:centar_sarajevo:centar_2',
  'op:novi_grad_sarajevo:novi_grad_2',
  'op:novo_sarajevo:novo_2',
  'op:stari_grad_sarajevo:stari_grad_2',
];

/** Outer-ring OSID (legitimate SRK objective — NOT urban core). */
const OUTER_RING_OSID = 'op:ilidza:ilidza_2';

function rawStateWithStrangle(rsOsids: string[] | undefined): GameState {
  return {
    political: {
      last_contained_osids_by_faction: rsOsids === undefined ? {} : { RS: rsOsids },
    },
  } as unknown as GameState;
}

function makeTurnSummary(turn: number) {
  return {
    turn,
    battles: [], notable_flips: [], events_fired: [], notable_events: [],
    decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
    displacement_total: 0, displacement_by_ethnicity: {},
    territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
    movements: [], supply_transitions: [],
  };
}

describe('Sarajevo-siege legibility (SRK strangle-not-capture, D2 task #41)', () => {
  it('the UI core-municipality list matches the engine-geometry canon (no drift)', () => {
    expect([...SARAJEVO_CORE_MUN_IDS].sort()).toEqual([...SARAJEVO_CITY_CORE_MUN_IDS].sort());
  });

  it('returns null when the strangle field is absent (SRK posture off)', () => {
    expect(deriveSarajevoSiegeState(undefined)).toBeNull();
    expect(deriveSarajevoSiegeState(null)).toBeNull();
    expect(deriveSarajevoSiegeState([])).toBeNull();
  });

  it('returns null when only the outer ring is contained (not the urban core)', () => {
    expect(deriveSarajevoSiegeState([OUTER_RING_OSID])).toBeNull();
  });

  it('fires when the strangle set contains the four urban-core OSIDs', () => {
    const siege = deriveSarajevoSiegeState(CORE_OSIDS);
    expect(siege).not.toBeNull();
    expect(siege!.besiegingFaction).toBe('RS');
    expect(siege!.besiegedMunicipalityCount).toBe(4);
    expect(siege!.strangledCoreOsids).toEqual([...CORE_OSIDS].sort());
  });

  it('counts only urban-core OSIDs when the set mixes core + outer ring', () => {
    const siege = deriveSarajevoSiegeState([...CORE_OSIDS, OUTER_RING_OSID]);
    expect(siege).not.toBeNull();
    expect(siege!.besiegedMunicipalityCount).toBe(4);
    expect(siege!.strangledCoreOsids).not.toContain(OUTER_RING_OSID);
  });

  it('is faction-aware: distinct chair-framed prose for RS / RBiH / observer', () => {
    const rs = sarajevoSiegeGloss('RS');
    const rbih = sarajevoSiegeGloss('RBiH');
    const obs = sarajevoSiegeGloss(null);
    expect(rs).not.toEqual(rbih);
    expect(rs).not.toEqual(obs);
    expect(rbih).not.toEqual(obs);
    // Every chair carries the §6-correct through-line: besieged, NOT captured.
    for (const prose of [rs, rbih, obs, sarajevoSiegeGloss('HRHB')]) {
      expect(prose.toLowerCase()).toMatch(/besieged|encircled/);
      expect(prose.toLowerCase()).toMatch(/not (stormed|taken|captured)|holds|does not fall/);
    }
  });

  it('§6 guard: the siege is framed as the historical siege — never minimised or valorised', () => {
    // Names the siege (encirclement + bombardment, city HOLDS); never an
    // atrocity-as-achievement, a perpetrator slur, "victory", or the §6 rupture.
    const forbidden = /victory|triumph|won|conquer|captured the city|fell|genocide|massacre|srebrenica|žepa|zepa|cleans|serb|muslim|bosniak/i;
    const glosses = [
      sarajevoSiegeGloss('RS'),
      sarajevoSiegeGloss('RBiH'),
      sarajevoSiegeGloss('HRHB'),
      sarajevoSiegeGloss(null),
    ];
    // Title is forbidden-vocab clean and frames the siege via encirclement.
    expect(sarajevoSiegeTitle()).not.toMatch(forbidden);
    expect(sarajevoSiegeTitle().toLowerCase()).toMatch(/encircled|siege/);
    for (const p of glosses) {
      expect(p).not.toMatch(forbidden);
      // Each gloss names the bombardment / shelling / ring — the siege is not
      // sanitised into a clean military containment.
      expect(`${p}`.toLowerCase()).toMatch(/bombard|shell|ring|siege/);
    }
  });

  it('chronicle: emits one stable beat dated at the latest turn while the SRK strangles', () => {
    const entries = buildSarajevoSiegeChronicleEntries(rawStateWithStrangle(CORE_OSIDS), 188, 'RBiH');
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('sarajevo-siege-active');
    expect(entries[0].turn).toBe(188);
    expect(entries[0].type).toBe('humanitarian');
    expect(entries[0].headline).toBe(true);
    // Chair-aware: the RBiH (besieged) framing reaches the beat.
    expect(entries[0].detail).toEqual(sarajevoSiegeGloss('RBiH'));
  });

  it('chronicle: emits nothing when the SRK posture is off / state absent', () => {
    expect(buildSarajevoSiegeChronicleEntries(undefined, 188, 'RBiH')).toEqual([]);
    expect(buildSarajevoSiegeChronicleEntries(rawStateWithStrangle(undefined), 188, 'RBiH')).toEqual([]);
    expect(buildSarajevoSiegeChronicleEntries(rawStateWithStrangle([OUTER_RING_OSID]), 188, 'RBiH')).toEqual([]);
  });

  it('is deterministic — identical state yields identical entries', () => {
    const a = buildSarajevoSiegeChronicleEntries(rawStateWithStrangle(CORE_OSIDS), 188, 'RS');
    const b = buildSarajevoSiegeChronicleEntries(rawStateWithStrangle(CORE_OSIDS), 188, 'RS');
    expect(a).toEqual(b);
  });

  it('integrates into generateChronicleEntries via rawGameState (faction-threaded)', () => {
    const state = {
      turn: 188,
      player_faction: 'RBiH',
      turnSummaries: [makeTurnSummary(40), makeTurnSummary(188)],
      firedEvents: [],
      rawGameState: rawStateWithStrangle(CORE_OSIDS),
    };
    const entries = generateChronicleEntries(state as any);
    const beat = entries.find(e => e.id === 'sarajevo-siege-active');
    expect(beat).toBeDefined();
    expect(beat!.detail).toEqual(sarajevoSiegeGloss('RBiH'));
    // Sorted by turn alongside the rest of the chronicle.
    const turns = entries.map(e => e.turn);
    expect(turns).toEqual([...turns].sort((a, b) => a - b));
  });

  it('emits nothing through generateChronicleEntries when the SRK posture is off', () => {
    const state = {
      turn: 188,
      player_faction: 'RBiH',
      turnSummaries: [makeTurnSummary(188)],
      firedEvents: [],
      rawGameState: rawStateWithStrangle(undefined),
    };
    const entries = generateChronicleEntries(state as any);
    expect(entries.some(e => e.id === 'sarajevo-siege-active')).toBe(false);
  });
});
