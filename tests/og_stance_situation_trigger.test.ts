import { describe, expect, it } from 'vitest';
import { resolveOgStance, OG_STANCE_MIN_DWELL_TURNS } from '../src/sim/combat/commander/emit.js';
import * as directives from '../src/sim/combat/bot_corps_directives.js';

const previous = { stable_key: 'c|e1', stance: 'fortify' as const, since_turn: 10, confirmed_turn: 10 };

describe('OG stance: one writer, standing situations (SE2)', () => {
    it('a situation (truce line, own operation staging) re-postures at once, inside the dwell', () => {
        const r = resolveOgStance(previous, { sector_id: 's', new_stance: 'screening', reason: 'truce line — screening', trigger: 'situation' }, 11);
        expect(r.stance).toBe('screening');
        expect(r.why).toBe('recommended');
    });

    it('an intel reading still waits for the dwell', () => {
        const r = resolveOgStance(previous, { sector_id: 's', new_stance: 'active_defense', reason: 'massing', trigger: 'intel' }, 10 + OG_STANCE_MIN_DWELL_TURNS - 1);
        expect(r.stance).toBe('fortify');
        expect(r.why).toBe('held');
    });

    it('the corps-AI stance writer is gone: the commander loop is the only bot writer', () => {
        expect((directives as Record<string, unknown>).evaluateSectorStances).toBeUndefined();
    });
});
