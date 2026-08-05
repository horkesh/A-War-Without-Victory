/**
 * Presidential ADDRESS-THE-NATION + DECORATE-A-UNIT action contracts
 * (Presidential Command Surface §10 deferred actions, companions to the shipped
 * front visit).
 *
 * Exercises the pure logic used by the desktop IPC handlers
 * (electron-main.cjs initiate-address-nation / initiate-decorate-unit delegate to
 * address_nation_contract.cjs / decorate_unit_contract.cjs). Verifies:
 *   - event-id resolution per faction
 *   - force-queue builds the player faction's authored decision (mirror of
 *     evaluate_events.ts:577) carrying the authored response_options
 *   - cooldown / cap use voluntary action_cadence (max_fires 5 / cooldown 10t)
 *   - address-the-nation is FACTION-WIDE (no reachability gate)
 *   - decorate-a-unit BRIGHT LINE: only REGULAR formations eligible — never
 *     paramilitary / militia / phantom — and the player picks WHICH (no auto-pick)
 *   - determinism: eligible formations are id/kind-sorted; pure over state
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

/* eslint-disable @typescript-eslint/no-explicit-any */
const addressContract = require('../src/desktop/address_nation_contract.cjs');
const decorateContract = require('../src/desktop/decorate_unit_contract.cjs');

const FRONT_VISIT_COST: number = require('../src/desktop/autonomy_ipc_contract.cjs').FRONT_VISIT_COST;
const ADDRESS_NATION_COST: number = require('../src/desktop/autonomy_ipc_contract.cjs').ADDRESS_NATION_COST;
const DECORATE_UNIT_COST: number = require('../src/desktop/autonomy_ipc_contract.cjs').DECORATE_UNIT_COST;

describe('leadership action desktop wiring', () => {
  it('receives the Electron event before refreshing the initiating renderer', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');

    for (const channel of ['initiate-front-visit', 'initiate-address-nation', 'initiate-decorate-unit']) {
      const handlerStart = source.indexOf(`ipcMain.handle('${channel}'`);
      const handlerEnd = source.indexOf('\n  });', handlerStart);
      const handler = source.slice(handlerStart, handlerEnd);

      expect(handlerStart).toBeGreaterThanOrEqual(0);
      expect(handler).toContain(`ipcMain.handle('${channel}', async (_event) =>`);
      expect(handler).toContain('writeCanonicalCurrentState(sim, state, _event.sender);');
    }
  });

  it('places directive controls before optional dossier artwork', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/ui/map/components/army_hq/DirectiveCard.tsx'),
      'utf8',
    );
    const componentStart = source.indexOf('return (', source.indexOf('export function DirectiveCard'));
    const component = source.slice(componentStart);

    expect(component.indexOf('onClick={handleConfirm}')).toBeGreaterThanOrEqual(0);
    expect(component.indexOf('data-testid="directive-card-header-art"')).toBeGreaterThanOrEqual(0);
    expect(component.indexOf('onClick={handleConfirm}')).toBeLessThan(
      component.indexOf('data-testid="directive-card-header-art"'),
    );
  });
});

function makeAddressEventDef() {
  return {
    id: 'address_to_nation_rbih',
    title: 'Address the Nation',
    category: 'command',
    responding_faction: 'RBiH',
    requires_player_response: true,
    staff_recommended_response_id: 'address_endurance_rbih',
    action_cadence: { max_fires: 5, cooldown_turns: 10, escalation: 'static' },
    effect: { kind: 'narrative', text: 'The president prepares to address the nation.' },
    response_options: [
      { id: 'address_defiance_rbih', label: 'Defiant' },
      { id: 'address_endurance_rbih', label: 'Endurance' },
      { id: 'address_appeal_world_rbih', label: 'Appeal' },
      { id: 'address_stay_silent_rbih', label: 'Silent' },
    ],
  };
}

function makeDecorateEventDef() {
  return {
    id: 'decorate_a_unit_rbih',
    title: 'Decorate a Unit',
    category: 'command',
    responding_faction: 'RBiH',
    requires_player_response: true,
    staff_recommended_response_id: 'decorate_decline_rbih',
    action_cadence: { max_fires: 5, cooldown_turns: 10, escalation: 'static' },
    effect: { kind: 'narrative', text: 'The president considers which regular formation to decorate.' },
    response_options: [
      {
        id: 'decorate_steadfast_rbih',
        label: 'Decorate the most steadfast regular formation',
        effects: [{ kind: 'morale_change', faction: 'RBiH', delta: 5 }],
        dimension_shifts: [{ faction: 'RBiH', dimension: 'military_credibility', delta: 4 }],
      },
      { id: 'decorate_broadly_rbih', label: 'Broad citation', effects: [{ kind: 'morale_change', faction: 'RBiH', delta: 3 }] },
      { id: 'decorate_decline_rbih', label: 'Decline', effects: [{ kind: 'morale_change', faction: 'RBiH', delta: -1 }] },
    ],
  };
}

function makeState(opts: {
  turn?: number;
  ca?: number;
  fireCount?: number;
  lastFired?: number | null;
  eventId?: string;
  formations?: Record<string, any>;
} = {}) {
  const military: any = {
    command_authority: { current: opts.ca ?? 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 },
    event_fire_counts: {},
    event_last_fired_turn: {},
    formations: opts.formations ?? {},
  };
  const eventId = opts.eventId ?? 'address_to_nation_rbih';
  if (opts.fireCount != null) military.event_fire_counts[eventId] = opts.fireCount;
  if (opts.lastFired != null) military.event_last_fired_turn[eventId] = opts.lastFired;
  return {
    meta: { turn: opts.turn ?? 90, player_faction: 'RBiH' },
    military,
    political: {},
  };
}

describe('cost parity — leadership actions priced like the front visit (10)', () => {
  it('ADDRESS_NATION_COST and DECORATE_UNIT_COST match FRONT_VISIT_COST', () => {
    expect(ADDRESS_NATION_COST).toBe(FRONT_VISIT_COST);
    expect(DECORATE_UNIT_COST).toBe(FRONT_VISIT_COST);
    expect(ADDRESS_NATION_COST).toBe(10);
  });
});

describe('address-the-nation — event resolution + faction-wide queue', () => {
  it('fails closed when voluntary action cadence metadata is absent', () => {
    const def = makeAddressEventDef();
    delete (def as any).action_cadence;
    const a = addressContract.computeAddressNationAvailability(makeState(), 'RBiH', def);
    expect(a.available).toBe(false);
    expect(a.reason).toBe('no_action_cadence');
  });

  it('resolves the player faction address event id', () => {
    expect(addressContract.addressNationEventIdForFaction('RBiH')).toBe('address_to_nation_rbih');
    expect(addressContract.addressNationEventIdForFaction('RS')).toBe('address_to_nation_rs');
    expect(addressContract.addressNationEventIdForFaction('HRHB')).toBe('address_to_nation_hrhb');
    expect(addressContract.addressNationEventIdForFaction(null)).toBeNull();
    expect(addressContract.addressNationEventIdForFaction('NOPE')).toBeNull();
  });

  it('is available with no reachability gate and queues all authored options', () => {
    const state = makeState();
    const def = makeAddressEventDef();
    const a = addressContract.computeAddressNationAvailability(state, 'RBiH', def);
    expect(a.available).toBe(true);
    expect(a.reason).toBeNull();

    const decision = addressContract.buildAddressNationPendingDecision(state, 'RBiH', def, a);
    expect(decision).not.toBeNull();
    expect(decision.event_id).toBe('address_to_nation_rbih');
    expect(decision.faction).toBe('RBiH');
    const ids = decision.response_options.map((o: any) => o.id);
    expect(ids).toEqual([
      'address_defiance_rbih',
      'address_endurance_rbih',
      'address_appeal_world_rbih',
      'address_stay_silent_rbih',
    ]);
  });

  it('refuses exhausted at max_fires and on_cooldown within cooldown', () => {
    const exhausted = addressContract.computeAddressNationAvailability(
      makeState({ fireCount: 5 }), 'RBiH', makeAddressEventDef(),
    );
    expect(exhausted.available).toBe(false);
    expect(exhausted.reason).toBe('exhausted');

    const cooling = addressContract.computeAddressNationAvailability(
      makeState({ turn: 90, fireCount: 1, lastFired: 85 }), 'RBiH', makeAddressEventDef(),
    );
    expect(cooling.available).toBe(false);
    expect(cooling.reason).toBe('on_cooldown');
    expect(cooling.cooldownUntil).toBe(95);
  });
});

describe('decorate-a-unit — BRIGHT LINE: regular formations only', () => {
  const formations = {
    arbih_1st_corps: { faction: 'RBiH', name: '1st Corps', kind: 'corps', status: 'active' },
    arbih_2nd_corps: { faction: 'RBiH', name: '2nd Corps', kind: 'corps', status: 'active' },
    arbih_brigade_a: { faction: 'RBiH', name: '101st Brigade', kind: 'brigade', status: 'active' },
    // The bright line — these MUST NEVER be eligible:
    arbih_paramilitary: { faction: 'RBiH', name: 'Irregulars', kind: 'paramilitary', status: 'active' },
    arbih_militia: { faction: 'RBiH', name: 'Town Militia', kind: 'militia', status: 'active' },
    rs_phantom: { faction: 'RS', name: 'JNA Phantom', kind: 'jna_phantom', status: 'active' },
    // Wrong faction / inactive — excluded for other reasons:
    rs_1st_corps: { faction: 'RS', name: 'RS Corps', kind: 'corps', status: 'active' },
    arbih_inactive: { faction: 'RBiH', name: 'Disbanded', kind: 'brigade', status: 'inactive' },
  };

  it('fails closed when voluntary action cadence metadata is absent', () => {
    const def = makeDecorateEventDef();
    delete (def as any).action_cadence;
    const state = makeState({ eventId: 'decorate_a_unit_rbih', formations });
    const a = decorateContract.computeDecorateUnitAvailability(state, 'RBiH', def);
    expect(a.available).toBe(false);
    expect(a.reason).toBe('no_action_cadence');
  });

  it('excludes paramilitary / militia / phantom / wrong-faction / inactive', () => {
    const state = makeState({ eventId: 'decorate_a_unit_rbih', formations });
    const eligible = decorateContract.eligibleRegularFormations(state, 'RBiH');
    const ids = eligible.map((f: any) => f.id);
    expect(ids).toContain('arbih_1st_corps');
    expect(ids).toContain('arbih_2nd_corps');
    expect(ids).toContain('arbih_brigade_a');
    // Bright line — never present:
    expect(ids).not.toContain('arbih_paramilitary');
    expect(ids).not.toContain('arbih_militia');
    expect(ids).not.toContain('rs_phantom');
    // Other exclusions:
    expect(ids).not.toContain('rs_1st_corps'); // wrong faction
    expect(ids).not.toContain('arbih_inactive'); // inactive
  });

  it('is deterministic: corps before brigades, then by id', () => {
    const state = makeState({ eventId: 'decorate_a_unit_rbih', formations });
    const a = decorateContract.eligibleRegularFormations(state, 'RBiH');
    const b = decorateContract.eligibleRegularFormations(state, 'RBiH');
    expect(a.map((f: any) => f.id)).toEqual(b.map((f: any) => f.id));
    expect(a.map((f: any) => f.id)).toEqual(['arbih_1st_corps', 'arbih_2nd_corps', 'arbih_brigade_a']);
  });

  it('expands the steadfast template into one PER-UNIT branch (player picks)', () => {
    const state = makeState({ eventId: 'decorate_a_unit_rbih', formations });
    const def = makeDecorateEventDef();
    const a = decorateContract.computeDecorateUnitAvailability(state, 'RBiH', def);
    expect(a.available).toBe(true);

    const decision = decorateContract.buildDecorateUnitPendingDecision(state, 'RBiH', def, a);
    expect(decision).not.toBeNull();
    const ids = decision.response_options.map((o: any) => o.id);
    // One per-unit branch per eligible regular formation, carrying the template id prefix.
    expect(ids).toContain('decorate_steadfast_rbih__arbih_1st_corps');
    expect(ids).toContain('decorate_steadfast_rbih__arbih_2nd_corps');
    expect(ids).toContain('decorate_steadfast_rbih__arbih_brigade_a');
    // Broad / decline carried through unchanged.
    expect(ids).toContain('decorate_broadly_rbih');
    expect(ids).toContain('decorate_decline_rbih');
    // NEVER a paramilitary branch.
    expect(ids.some((id: string) => id.includes('paramilitary'))).toBe(false);

    // Per-unit branch carries the authored template effects inline (id-independent
    // resolution via resolve_decision.ts which reads chosen.effects).
    const unitBranch = decision.response_options.find(
      (o: any) => o.id === 'decorate_steadfast_rbih__arbih_1st_corps',
    );
    expect(unitBranch.effects).toEqual([{ kind: 'morale_change', faction: 'RBiH', delta: 5 }]);
    expect(unitBranch.dimension_shifts).toEqual([{ faction: 'RBiH', dimension: 'military_credibility', delta: 4 }]);
    expect(unitBranch.target_formation_id).toBe('arbih_1st_corps');
    expect(unitBranch.label).toBe('Decorate 1st Corps');
  });

  it('drops the steadfast path when there is NO eligible regular formation (bright line)', () => {
    // Only a paramilitary present → no regular unit to single out.
    const onlyParamilitary = {
      arbih_paramilitary: { faction: 'RBiH', name: 'Irregulars', kind: 'paramilitary', status: 'active' },
    };
    const state = makeState({ eventId: 'decorate_a_unit_rbih', formations: onlyParamilitary });
    const def = makeDecorateEventDef();
    const a = decorateContract.computeDecorateUnitAvailability(state, 'RBiH', def);
    expect(a.eligibleFormations).toHaveLength(0);

    const decision = decorateContract.buildDecorateUnitPendingDecision(state, 'RBiH', def, a);
    const ids = decision.response_options.map((o: any) => o.id);
    // No steadfast/per-unit branch at all; only broad + decline survive.
    expect(ids.some((id: string) => id.startsWith('decorate_steadfast_rbih'))).toBe(false);
    expect(ids).toEqual(['decorate_broadly_rbih', 'decorate_decline_rbih']);
  });

  it('caps the per-unit branches at MAX_UNIT_BRANCHES', () => {
    const many: Record<string, any> = {};
    for (let i = 0; i < 12; i++) {
      many[`arbih_brigade_${String(i).padStart(2, '0')}`] = {
        faction: 'RBiH', name: `Brigade ${i}`, kind: 'brigade', status: 'active',
      };
    }
    const state = makeState({ eventId: 'decorate_a_unit_rbih', formations: many });
    const eligible = decorateContract.eligibleRegularFormations(state, 'RBiH');
    expect(eligible.length).toBe(decorateContract.MAX_UNIT_BRANCHES);
  });
});
