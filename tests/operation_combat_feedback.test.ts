import { describe, it, expect } from 'vitest';

describe('operation combat feedback', () => {
    it('CorpsOperation can have battle tracking fields', () => {
        const op: any = { battles_this_turn: 0, territory_gained_this_turn: 0, total_battles: 5, total_territory_gained: 2 };
        expect(op.battles_this_turn).toBe(0);
        expect(op.total_battles).toBe(5);
    });
});
