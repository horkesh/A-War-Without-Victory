/**
 * §6 Bijeljina atrocity-record event (#bijeljina) — data-wiring verification.
 *
 * Pins the Bijeljina killings (1-2 April 1992; Serb Volunteer Guard / Arkan's
 * Tigers) as a representation-only historical-record event that:
 *   - fires on the RS control of bijeljina within the early-1992 window,
 *   - has NO player response options (record event, not a decision),
 *   - sets its codex-unlock flag,
 *   - carries the §6 source_note + an ICTY-grounded, two-source-floor citation
 *     apparatus,
 *   - is backed by an indexed Codex essay (with on-disk file + BCS localization).
 *
 * Deterministic: filesystem + JSON parse only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');
const war1992 = JSON.parse(
    readFileSync(resolve(REPO_ROOT, 'data/scenarios/events/war_1992.json'), 'utf8'),
) as Array<Record<string, unknown>>;
const essayIndex = JSON.parse(
    readFileSync(resolve(REPO_ROOT, 'data/scenarios/essays/essay_index.json'), 'utf8'),
) as { essays: Array<Record<string, any>> };

function findEvent(id: string) {
    return war1992.find((e) => e.id === id) as Record<string, any> | undefined;
}

describe('Bijeljina atrocity-record event wiring', () => {
    const ev = findEvent('bijeljina_killings_1992');

    it('exists in the war_1992 catalog', () => {
        expect(ev, 'bijeljina_killings_1992 missing from war_1992.json').toBeTruthy();
    });

    it('is a once-only humanitarian record event with no player response options', () => {
        expect(ev?.once).toBe(true);
        expect(ev?.category).toBe('humanitarian');
        // Representation-only: no options / responses / decision surface.
        expect(ev?.options).toBeUndefined();
        expect(ev?.responses).toBeUndefined();
        expect(ev?.required_response).toBeUndefined();
    });

    it('fires on RS control of bijeljina in the early-1992 window', () => {
        const t = ev?.trigger;
        expect(t?.phase).toBe('war');
        expect(t?.turn_min).toBeGreaterThanOrEqual(1);
        expect(t?.turn_max).toBeLessThanOrEqual(30);
        expect(t?.condition?.type).toBe('faction_controls_municipality');
        expect(t?.condition?.faction).toBe('RS');
        expect(t?.condition?.municipality).toBe('bijeljina');
    });

    it('unlocks its codex record flag and records (does not reward/flip)', () => {
        expect(ev?.sets_flags?.bijeljina_takeover_documented).toBe(true);
        // Record events have a plain narrative effect — no territory/score reward.
        expect(ev?.effect?.kind).toBe('narrative');
        expect(ev?.effects).toBeUndefined();
        expect(ev?.dimension_shifts).toBeUndefined();
    });

    it('carries the §6 source_note and a two-source ICTY-grounded apparatus', () => {
        const note = String(ev?.source_note ?? '');
        expect(note).toContain('representation-only');
        expect(note).toContain('canon-refused');
        const hist = String(ev?.historical_source ?? '');
        // Two-source floor, ICTY first.
        expect(hist).toMatch(/IT-00-39-T/); // Krajisnik
        expect(hist).toMatch(/IT-95-5\/18-T/); // Karadzic
        expect(hist).toMatch(/IT-97-27/); // Raznatovic (Serb Volunteer Guard)
    });

    const essay = essayIndex.essays.find(
        (e) => e.event_id === 'bijeljina_killings_1992',
    );

    it('is backed by an indexed Codex essay with an on-disk file', () => {
        expect(essay, 'bijeljina essay missing from essay_index.json').toBeTruthy();
        expect(essay?.id).toBe('essay_bijeljina_killings_1992');
        expect(
            existsSync(resolve(REPO_ROOT, 'data/scenarios/essays/bijeljina_killings_1992.json')),
        ).toBe(true);
    });

    it('has Bosnian localization for the codex essay', () => {
        expect(essay?.localizations?.bcs?.title).toBeTruthy();
        expect(essay?.localizations?.bcs?.category).toBeTruthy();
        expect(essay?.localizations?.bcs?.content).toBeTruthy();
    });
});
