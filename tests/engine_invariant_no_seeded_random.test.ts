import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const OWNED_SIMULATION_FILES = [
    'src/turn/pipeline.ts',
    'src/sim/turn_pipeline.ts',
    'src/sim/letter_home.ts',
    'src/sim/events/evaluate_events.ts',
    'src/sim/bot/bot_manager.ts',
    'src/sim/bot/simple_general_bot.ts',
    'src/state/deterministic_random.ts',
    'src/sim/economy/smuggling_routes.ts',
    'src/sim/combat/frontline_attrition.ts',
    'src/sim/combat/warlord_friction.ts',
    'src/sim/combat/paramilitary_sweep.ts',
    'src/sim/combat/officer_system.ts',
] as const;

function source(relativePath: string): string {
    return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Engine Invariants 11.1 owned simulation paths', () => {
    it.each(OWNED_SIMULATION_FILES)('%s contains no seeded or hash-based pseudo-random helper', (relativePath) => {
        expect(source(relativePath)).not.toMatch(
            /Math\.random|deterministicRandom|deterministicInt|deterministicPick|createRng|hashSeed|deterministicHash|officerHash/,
        );
    });

    it('event probability metadata does not perform an eligibility roll', () => {
        const eventSource = source('src/sim/events/evaluate_events.ts');
        expect(eventSource).not.toMatch(/rng\s*\(\s*\)/);
        expect(eventSource).not.toMatch(/def\.probability/);
    });

    it('bot decisions do not consume the legacy RNG callback', () => {
        expect(source('src/sim/bot/simple_general_bot.ts')).not.toContain('context.rng');
    });

    it.each(OWNED_SIMULATION_FILES)('%s does not use locale collation for output ordering', (relativePath) => {
        expect(source(relativePath)).not.toContain('localeCompare');
    });
});
