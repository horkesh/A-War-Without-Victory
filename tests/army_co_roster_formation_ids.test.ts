import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Each faction's army-command roster names the formation of its army HQ. That id is written
 * onto officer events and, when a player accepts a replacement, onto the new commander's
 * assigned_corps_id. A roster id that is not a real army HQ points at nothing: the RBiH
 * roster said `arbih_main_staff` while the OOB calls the HQ `arbih_general_staff`.
 */
describe('army CO roster formation ids', () => {
    const roster = JSON.parse(readFileSync('data/scenarios/army_co_roster.json', 'utf8')) as {
        rosters: Record<string, { main_staff_formation_id: string }>;
    };
    const corps = JSON.parse(readFileSync('data/source/oob_corps.json', 'utf8')) as
        { corps?: Array<{ id: string; faction: string; kind?: string }> } | Array<{ id: string; faction: string; kind?: string }>;
    const rows = Array.isArray(corps) ? corps : corps.corps ?? [];

    it.each(Object.entries(roster.rosters))('%s roster points at its own army HQ formation', (faction, entry) => {
        const hq = rows.find((c) => c.id === entry.main_staff_formation_id);
        expect(hq, entry.main_staff_formation_id).toBeDefined();
        expect(hq!.faction).toBe(faction);
        expect(hq!.kind).toBe('army_hq');
    });
});
