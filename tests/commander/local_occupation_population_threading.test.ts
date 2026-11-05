import { describe, expect, it, vi } from 'vitest';

const { generateAllCorpsOrdersMock } = vi.hoisted(() => ({
    generateAllCorpsOrdersMock: vi.fn(),
}));

vi.mock('../../src/sim/combat/bot_corps_ai.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../../src/sim/combat/bot_corps_ai.js')>();
    return {
        ...original,
        generateAllCorpsOrders: generateAllCorpsOrdersMock,
        extractCorpsAiReport: () => [],
    };
});

vi.mock('../../src/data/settlement_ethnicity.js', () => ({
    loadSettlementEthnicityData: vi.fn().mockRejectedValue(new Error('not needed by this fixture')),
}));

import { warPhases } from '../../src/sim/turn_phases/war_phases.js';
import type { TurnContext } from '../../src/sim/turn_pipeline_types.js';

describe('local occupation population threading', () => {
    it('derives OSID population before invoking corps command', async () => {
        const reverseMap = new Map([
            ['op:MUN_A:center', ['sid:center']],
            ['op:MUN_A:east', ['sid:east']],
        ]);
        const context = {
            state: {
                meta: { turn: 21, phase: 'war', seed: 'population-threading' },
                factions: [{ id: 'RS', areasOfResponsibility: [] }],
                political: { political_controllers: {} },
                military: {
                    formations: {},
                    corps_command: {
                        vrs_test: { active_operations: [], subordinate_count: 0 },
                    },
                },
            },
            input: {
                seed: 'population-threading',
                settlementGraph: { settlements: new Map(), edges: [] },
                operationalData: {
                    opData: { canonicalToOperational: {}, operationalToCanonical: reverseMap },
                    edges: [],
                    centroids: new Map(),
                },
                municipalityPopulation1991: { MUN_A: { total: 12000 } },
            },
            report: { seed: 'population-threading', phases: [] },
        } as unknown as TurnContext;

        const phase = warPhases.find((candidate) => candidate.name === 'generate-bot-corps-orders');
        expect(phase).toBeDefined();
        await phase!.run(context);

        expect(generateAllCorpsOrdersMock).toHaveBeenCalledTimes(1);
        const osidPopulationMap = generateAllCorpsOrdersMock.mock.calls[0]?.[10] as Map<string, number>;
        expect(osidPopulationMap).toEqual(new Map([
            ['op:MUN_A:center', 6000],
            ['op:MUN_A:east', 6000],
        ]));
    });
});
