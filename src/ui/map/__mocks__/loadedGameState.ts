import type { LoadedGameState } from '../data/types';

export function makeMockLoadedGameState(): LoadedGameState {
  return {
    label: 'Turn 12 (phase_ii)',
    turn: 12,
    phase: 'phase_ii',
    formations: [
      {
        id: 'rbih_brig_1',
        faction: 'RBiH',
        name: '1st Sarajevo Brigade',
        kind: 'brigade',
        readiness: 'active',
        cohesion: 72,
        fatigue: 18,
        status: 'active',
        createdTurn: 2,
        tags: [],
        location_osid: 'op:sarajevo',
        personnel: 2400,
      },
      {
        id: 'rs_brig_3',
        faction: 'RS',
        name: '3rd Romanija Brigade',
        kind: 'brigade',
        readiness: 'active',
        cohesion: 66,
        fatigue: 24,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:pale',
        personnel: 2100,
      },
    ],
    militiaPools: [],
    controlBySettlement: {
      'op:sarajevo': 'RBiH',
      'op:pale': 'RS',
    },
    statusBySettlement: {
      'op:sarajevo': 'CONTESTED',
    },
    brigadeAorByFormationId: {
      rbih_brig_1: ['op:sarajevo'],
      rs_brig_3: ['op:pale'],
    },
    attackOrders: [
      {
        brigadeId: 'rs_brig_3',
        targetSettlementId: 'op:sarajevo',
      },
    ],
    aorOrders: [],
    recentControlEvents: [],
  };
}
