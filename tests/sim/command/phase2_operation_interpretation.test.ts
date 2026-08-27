import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const retiredLaunchInterpreter = ['interpret', 'Operation', 'Launch'].join('');
const retiredHaltInterpreter = ['interpret', 'Operation', 'Halt'].join('');
const retiredDelayKey = ['halt', 'delay', 'turns', 'remaining'].join('_');
const retiredDigInKey = ['dig', 'in', 'on', 'halt'].join('_');

describe('retired operation-name interpretation authority', () => {
    it('removes launch and halt interpretation exports instead of replacing them', () => {
        const source = readFileSync(
            resolve(process.cwd(), 'src/sim/combat/order_interpretation.ts'),
            'utf8',
        );

        expect(source).not.toContain(retiredLaunchInterpreter);
        expect(source).not.toContain(retiredHaltInterpreter);
    });

    it('removes the halt-only operation state and runtime consumers', () => {
        const sources = [
            'src/state/game_state.ts',
            'src/sim/combat/sector_offensive.ts',
            'src/sim/turn_phases/war_phases.ts',
        ].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'));

        for (const source of sources) {
            expect(source).not.toContain(retiredDelayKey);
            expect(source).not.toContain(retiredDigInKey);
        }
    });
});
