import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

type DiagnosticRow = {
    section: string;
    item: string;
    status: 'DONE' | 'PARTIAL' | 'MISSING' | 'DRIFTED';
    owner: 'sim_mechanic' | 'ui_feedback' | 'scenario_data' | 'canon_wording';
    anchor?: string;
};

function runDiagnostic(): DiagnosticRow[] {
    const runDir = mkdtempSync(join(tmpdir(), 'awwv-supply-diagnostic-'));
    writeFileSync(join(runDir, 'summary.json'), JSON.stringify({ hash: 'fixture' }));
    const output = execFileSync(
        process.execPath,
        ['tools/diagnostics/supply_design_completion.cjs', runDir],
        { cwd: process.cwd(), encoding: 'utf8' },
    );
    return JSON.parse(output) as DiagnosticRow[];
}

describe('supply design completion diagnostic', () => {
    it('emits deterministic sorted spec rows with valid owned statuses and anchors', () => {
        const first = runDiagnostic();
        const second = runDiagnostic();

        expect(second).toEqual(first);
        expect(first).toHaveLength(12);

        const sorted = [...first].sort((a, b) => {
            const section = a.section.localeCompare(b.section);
            return section !== 0 ? section : a.item.localeCompare(b.item);
        });
        expect(first).toEqual(sorted);

        for (const row of first) {
            expect(['DONE', 'PARTIAL', 'MISSING', 'DRIFTED']).toContain(row.status);
            expect(['sim_mechanic', 'ui_feedback', 'scenario_data', 'canon_wording']).toContain(row.owner);
            if (row.status === 'DONE' || row.status === 'PARTIAL') {
                expect(row.anchor).toBeTruthy();
                const filePath = row.anchor!.replace(/:\d+$/, '');
                expect(existsSync(filePath)).toBe(true);
            }
        }

        expect(first.map((row) => `${row.section} ${row.item}`)).toEqual([
            '§3 by_osid in report sorted by osid',
            '§3 OSID supply trace per-OSID state',
            '§4 fallback to last_supplied_turn when by_osid missing',
            '§4 getSupplyMult reads supply state at formation.location_osid',
            '§5 corridor cascade dependency thresholds',
            '§5 propagation order by faction then node id',
            '§6 enclave resilience curve',
            '§6 hardening defense bonus',
            '§7 minimum supply UX panel and IPC corridor summary',
            '§8 bot supply awareness in target/defense scoring',
            '§9 Phase 1 OSID trace',
            '§9 Phase 2 cascade canon wording',
        ]);
    });
});
