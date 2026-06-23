#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { loadOperationalEdges } from '../../src/data/operational_data.js';
import { buildCorpsFrontSectors } from '../../src/sim/combat/corps_front_sectors.js';
import { auditSectorTruth } from '../../src/sim/combat/sector_truth_audit.js';
import type { GameState } from '../../src/state/game_state.js';

function parseArgs(): { savePath: string } {
    const args = process.argv.slice(2);
    let savePath = '';
    for (let i = 0; i < args.length; i++) {
        if ((args[i] === '--save' || args[i] === '--state') && args[i + 1]) {
            savePath = args[++i]!;
        }
    }
    if (!savePath) {
        throw new Error('Usage: tsx tools/scenario_runner/audit_sector_truth.ts --save <path-to-final_save.json>');
    }
    return { savePath };
}

async function main(): Promise<void> {
    const { savePath } = parseArgs();
    const resolvedSavePath = path.resolve(process.cwd(), savePath);
    const state = JSON.parse(fs.readFileSync(resolvedSavePath, 'utf8')) as GameState;
    const savedState = JSON.parse(JSON.stringify(state)) as GameState;
    const rebuiltState = JSON.parse(JSON.stringify(state)) as GameState;
    const edges = await loadOperationalEdges();
    const savedSectors = Object.values(savedState.military?.corps_front_sectors ?? {});
    const rebuiltSectors = Object.values(buildCorpsFrontSectors(rebuiltState, edges, null));
    const savedAudit = auditSectorTruth(savedState, savedSectors, edges);
    const rebuiltAudit = auditSectorTruth(rebuiltState, rebuiltSectors, edges);

    process.stdout.write(JSON.stringify({
        save: resolvedSavePath,
        saved_sectors: savedSectors.length,
        rebuilt_sectors: rebuiltSectors.length,
        saved_unresolved: (state.military?.unresolved_sector_brigades ?? []).length,
        saved_counts: savedAudit.counts,
        rebuilt_counts: rebuiltAudit.counts,
        ok: savedAudit.ok,
        rebuilt_ok: rebuiltAudit.ok,
    }, null, 2) + '\n');

    if (!savedAudit.ok || !rebuiltAudit.ok) {
        process.stdout.write(JSON.stringify({
            saved_issues: savedAudit.issues,
            rebuilt_issues: rebuiltAudit.issues,
        }, null, 2) + '\n');
    }
    if (!savedAudit.ok) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error('audit_sector_truth failed', error);
    process.exitCode = 1;
});
