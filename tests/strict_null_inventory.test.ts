import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_strict_null_inventory');

function write(path: string, text: string): void {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text, 'utf8');
}

describe('strict null inventory diagnostic', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('counts strictness escape hatches and prints deterministic sorted JSON', () => {
        write(join(TMP_ROOT, 'src', 'b.ts'), `
import type { FactionId } from './state/game_state.js';
const raw = 'RBiH';
const faction = raw as FactionId;
const item = registry!.current;
const first = list![0];
const boundary = value as unknown as { id: string };
const loose = value as any;
`);
        write(join(TMP_ROOT, 'src', 'a.ts'), `
const first = other![1];
`);
        write(join(TMP_ROOT, 'src', '_archived', 'ignored.ts'), `
const archived = value as FactionId;
`);
        write(join(TMP_ROOT, 'src', 'state', 'game_state.ts'), `
export interface GameState {
  meta?: StateMeta;
}
export interface StateMeta {
  player_faction?: FactionId;
}
export interface SimCoreState {
  readiness?: number;
}
export interface RendererState {
  selectedOsid?: string;
}
`);

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => {
                counts: Record<string, number>;
                categories: Record<string, { occurrences: Array<{ file: string; line: number }> }>;
                optional_field_domains: {
                    total: number;
                    domain_counts: Record<string, number>;
                    fields_by_domain: Record<string, string[]>;
                };
            };
            stableStringify: (value: unknown) => string;
        };

        const inventory = diagnostic.buildInventory(TMP_ROOT);

        expect(inventory.counts).toMatchObject({
            as_factionid_casts: 1,
            as_unknown_casts: 1,
            as_any_casts: 1,
            non_null_assertions_dot: 1,
            non_null_assertions_index: 2,
            optional_fields_game_state: 4,
        });
        expect(inventory.categories.non_null_assertions_index.occurrences.map(row => row.file)).toEqual([
            join(TMP_ROOT, 'src', 'a.ts'),
            join(TMP_ROOT, 'src', 'b.ts'),
        ]);
        expect(inventory.optional_field_domains.domain_counts).toMatchObject({
            sim: 1,
            state: 2,
            ui_adapter: 1,
        });
        expect(inventory.optional_field_domains.fields_by_domain.sim).toEqual(['SimCoreState.readiness']);
        expect(inventory.optional_field_domains.fields_by_domain.state).toEqual([
            'GameState.meta',
            'StateMeta.player_faction',
        ]);
        expect(inventory.optional_field_domains.fields_by_domain.ui_adapter).toEqual(['RendererState.selectedOsid']);

        const once = diagnostic.stableStringify(inventory);
        const twice = diagnostic.stableStringify(diagnostic.buildInventory(TMP_ROOT));
        expect(once).toBe(twice);
        expect(Object.keys(JSON.parse(once))).toEqual([
            'categories',
            'counts',
            'generated_by',
            'hotspots',
            'optional_field_domains',
            'scanned_root',
        ]);
    });

    it('emits CLI JSON that can be redirected to baseline artifacts', () => {
        write(join(TMP_ROOT, 'src', 'example.ts'), `
const current = state.meta.player_faction as FactionId;
`);
        write(join(TMP_ROOT, 'src', 'state', 'game_state.ts'), `
export interface GameState {
  meta?: StateMeta;
}
export interface StateMeta {
  player_faction?: FactionId;
}
`);

        const json = execFileSync(
            process.execPath,
            ['tools/diagnostics/strict_null_inventory.cjs', TMP_ROOT],
            { cwd: process.cwd(), encoding: 'utf8' },
        );

        expect(JSON.parse(json)).toMatchObject({
            counts: {
                as_factionid_casts: 1,
                optional_fields_game_state: 2,
            },
        });
    });

    it('emits field-domain-only CLI JSON for the optional GameState schema lane', () => {
        write(join(TMP_ROOT, 'src', 'state', 'game_state.ts'), `
export interface GameState {
  meta?: StateMeta;
}
export interface StateMeta {
  player_faction?: FactionId;
}
export interface SimCoreState {
  readiness?: number;
}
export interface DerivedSummary {
  total?: number;
}
`);

        const json = execFileSync(
            process.execPath,
            ['tools/diagnostics/strict_null_inventory.cjs', '--field-domains', TMP_ROOT],
            { cwd: process.cwd(), encoding: 'utf8' },
        );

        expect(JSON.parse(json)).toMatchObject({
            total: 4,
            domain_counts: {
                derived: 1,
                sim: 1,
                state: 2,
                unknown: 0,
            },
            fields_by_domain: {
                derived: ['DerivedSummary.total'],
                sim: ['SimCoreState.readiness'],
                state: ['GameState.meta', 'StateMeta.player_faction'],
            },
            unknown_justifications: [],
        });
    });
});
