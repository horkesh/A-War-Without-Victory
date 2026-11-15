import { describe, expect, it } from 'vitest';
import { drawTacticalSymbol } from '../../src/ui/map/map/formationIcons';

function recordingContext() {
    const texts: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
        get(target, prop: string) {
            if (prop === 'fillText') return (text: string) => { texts.push(text); };
            if (prop in target) return target[prop];
            return () => undefined;
        },
        set(target, prop: string, value) {
            target[prop] = value;
            return true;
        },
    });
    return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

describe('enemy contact counter symbol', () => {
    it('prints a question mark, not the generic two-letter fallback', () => {
        const { ctx, texts } = recordingContext();
        drawTacticalSymbol(ctx, 'enemy_contact', 160, 72);
        expect(texts).toEqual(['?']);
    });

    it('still uses the abbreviation fallback for an unknown kind', () => {
        const { ctx, texts } = recordingContext();
        drawTacticalSymbol(ctx, 'engineer', 160, 72);
        expect(texts).toEqual(['EN']);
    });
});
