import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_consequence_substrate_inventory');

function writeJson(path: string, value: unknown): void {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('consequence_substrate_inventory diagnostic', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('collects primary, additional, and response effects deterministically', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/consequence_substrate_inventory.cjs') as {
            collectEffects: (event: unknown) => Array<{ source: string; effect: { kind: string } }>;
        };

        const effects = diagnostic.collectEffects({
            effect: { kind: 'narrative', text: 'Primary' },
            effects: [{ kind: 'patron_pressure', faction: 'RS', delta: 1 }],
            responses: [
                { id: 'accept', effects: [{ kind: 'negotiation_capital', faction: 'RBiH', dimension: 'international_standing', delta: 3 }] },
            ],
        });

        expect(effects.map(row => `${row.source}:${row.effect.kind}`)).toEqual([
            'primary:narrative',
            'additional:patron_pressure',
            'response:accept:negotiation_capital',
        ]);
    });

    it('builds a current owner matrix from fixture event files', () => {
        const eventsDir = join(TMP_ROOT, 'events');
        mkdirSync(eventsDir, { recursive: true });
        writeJson(join(eventsDir, 'a.json'), {
            events: [
                {
                    id: 'alpha',
                    effect: { kind: 'narrative', text: 'Alpha' },
                    effects: [
                        { kind: 'cost_ledger_annotation', tag: 'alpha_cost', faction: 'RS' },
                        { kind: 'equipment_quality_modifier', faction: 'RBiH', multiplier: 1.05, duration_turns: 4 },
                    ],
                    responses: [
                        { id: 'accept', effects: [{ kind: 'patron_pressure', faction: 'HRHB', delta: 1 }] },
                    ],
                },
            ],
        });
        writeJson(join(eventsDir, 'b.json'), [
            {
                id: 'beta',
                effect: { kind: 'recruitment_modifier', faction: 'RS', pool_multiplier: 0.9, duration_turns: 3 },
            },
        ]);

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/consequence_substrate_inventory.cjs') as {
            buildInventory: (eventsDir: string) => {
                total_events: number;
                total_effects: number;
                live_substrates: string[];
                partial_substrates: string[];
                missing_factions_by_kind: Record<string, string[]>;
                effect_kinds: Array<{ kind: string; status: string; event_count: number; effect_count: number; factions: Record<string, number> }>;
            };
        };

        const inventory = diagnostic.buildInventory(eventsDir);

        expect(inventory.total_events).toBe(2);
        expect(inventory.total_effects).toBe(5);
        expect(inventory.live_substrates).toContain('cost_ledger_annotation');
        expect(inventory.live_substrates).toContain('equipment_quality_modifier');
        expect(inventory.partial_substrates).toEqual(['recruitment_modifier']);
        expect(inventory.missing_factions_by_kind.patron_pressure).toEqual(['RBiH', 'RS']);
        expect(inventory.effect_kinds.find(row => row.kind === 'cost_ledger_annotation')).toMatchObject({
            status: 'live-reader',
            event_count: 1,
            effect_count: 1,
            factions: { RS: 1 },
        });
    });

    it('prints markdown and json output', () => {
        const eventsDir = join(TMP_ROOT, 'cli_events');
        mkdirSync(eventsDir, { recursive: true });
        writeJson(join(eventsDir, 'events.json'), {
            events: [
                { id: 'alpha', effect: { kind: 'cost_ledger_annotation', tag: 'alpha_cost', faction: 'RS' } },
            ],
        });

        const markdown = execFileSync(
            process.execPath,
            ['tools/diagnostics/consequence_substrate_inventory.cjs', eventsDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        expect(markdown).toContain('# Consequence Substrate Inventory');
        expect(markdown).toContain('| cost_ledger_annotation | live-reader | narrative | 1 | 1 | RS:1 | buildCostLedger narrative findings | alpha |');

        const json = execFileSync(
            process.execPath,
            ['tools/diagnostics/consequence_substrate_inventory.cjs', '--json', eventsDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        expect(JSON.parse(json)).toMatchObject({
            total_events: 1,
            effect_kind_count: 1,
            unknown_substrates: [],
        });
    });
});
