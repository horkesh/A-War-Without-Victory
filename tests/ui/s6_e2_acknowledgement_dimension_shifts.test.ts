/**
 * §6 E2 display half: a cost the engine applies is shown when it becomes live.
 * Automatic cards (EventModal acknowledgement list, built in App.tsx) now list the card's
 * own `dimension_shifts`, ordered by faction then dimension, zero deltas omitted.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAcknowledgementEventEffects } from '../../src/ui/map/App';
import {
    buildAcknowledgementDimensionShiftEntries,
    describeDimensionShift,
} from '../../src/ui/map/data/dimensionShiftDisplay';
import { isDisplayEventEffectKind } from '../../src/ui/map/utils/eventEffectDisplay';

const EVENTS_DIR = join(process.cwd(), 'data', 'scenarios', 'events');
const EVENT_FILES = ['war_1992.json', 'war_1992_hrhb_summer.json', 'war_1993.json', 'war_1994.json', 'war_1995.json', 'consequences.json'];

function allRows(): any[] {
    return EVENT_FILES.flatMap((file) => JSON.parse(readFileSync(join(EVENTS_DIR, file), 'utf8')) as any[]);
}

/** Same view shape DataLoader.loadEventDefinitions builds for the acknowledgement modal. */
function viewOf(id: string) {
    const ev = allRows().find((r) => r.id === id);
    if (!ev) throw new Error(`${id} not found`);
    return {
        effects: Array.isArray(ev.effects) ? ev.effects : ev.effect ? [ev.effect] : [],
        dimension_shifts: Array.isArray(ev.dimension_shifts) ? ev.dimension_shifts : undefined,
    };
}

describe('§6 E2: acknowledgement list shows a card\'s live standing shift', () => {
    it('the ahmici_massacre_1993 acknowledgement list contains "HRHB international standing -25" (EN)', () => {
        const entries = buildAcknowledgementEventEffects(viewOf('ahmici_massacre_1993'));
        expect(entries).toContainEqual({ kind: 'dimension_shift', description: 'HRHB international standing -25' });
        expect(isDisplayEventEffectKind('dimension_shift')).toBe(true);
    });

    it('renders the ruled BCS string', async () => {
        const { setLocale } = await import('../../src/ui/map/i18n/index.js');
        try {
            setLocale('bcs', undefined);
            const entries = buildAcknowledgementDimensionShiftEntries([
                { faction: 'RS', dimension: 'international_standing', delta: -20 },
            ]);
            expect(entries).toEqual([{ kind: 'dimension_shift', description: 'Međunarodni ugled RS -20' }]);
        } finally {
            setLocale('en', undefined);
        }
    });

    it('orders by faction then dimension (strictCompare) and omits zero deltas', () => {
        const entries = buildAcknowledgementDimensionShiftEntries([
            { faction: 'RS', dimension: 'negotiating_leverage', delta: 4 },
            { faction: 'HRHB', dimension: 'international_standing', delta: 0 },
            { faction: 'RS', dimension: 'international_standing', delta: 2 },
            { faction: 'HRHB', dimension: 'internal_cohesion', delta: -4 },
        ]);
        expect(entries.map((e) => e.description)).toEqual([
            'HRHB internal cohesion -4',
            'RS international standing +2',
            'RS negotiating leverage +4',
        ]);
    });

    it('the decision-modal preview formatter is unchanged after moving to the shared helper', () => {
        expect(describeDimensionShift({ faction: 'RBiH', dimension: 'international_standing', delta: 10 }))
            .toBe('RBiH International Standing +10');
    });

    it('App.tsx no longer formats the retired negotiation_capital kind', () => {
        const app = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'App.tsx'), 'utf8');
        expect(app).not.toContain("case 'negotiation_capital'");
        expect(app).toContain('buildAcknowledgementDimensionShiftEntries');
    });
});

describe('§6 E2: an atrocity card never lists a standing gain for its perpetrator', () => {
    // Scope: the card's OWN shifts (event level), which are what the card applies on firing and
    // what its acknowledgement list shows. A response option's shifts are the consequence of a
    // later player choice and render in the decision modal; they are not covered here.
    it('no card whose effects include humanitarian_impact carries a positive international_standing shift for that faction', () => {
        const offenders: string[] = [];
        let checked = 0;
        for (const ev of allRows()) {
            const eventEffects = [ev.effect, ...(ev.effects ?? [])].filter(Boolean);
            const perpetrators = new Set(eventEffects.filter((e: any) => e.kind === 'humanitarian_impact').map((e: any) => e.faction));
            if (perpetrators.size === 0) continue;
            checked++;
            const shifts = ev.dimension_shifts ?? [];
            for (const s of shifts) {
                if (s.dimension === 'international_standing' && perpetrators.has(s.faction) && s.delta > 0) {
                    offenders.push(`${ev.id}: ${s.faction} +${s.delta}`);
                }
            }
            // The acknowledgement list a player sees agrees with the data.
            for (const entry of buildAcknowledgementDimensionShiftEntries(ev.dimension_shifts)) {
                for (const faction of perpetrators) {
                    if (entry.description.startsWith(`${faction} international standing +`)) offenders.push(`${ev.id}: shown ${entry.description}`);
                }
            }
        }
        expect(checked).toBeGreaterThan(0);
        expect(offenders).toEqual([]);
    });
});
