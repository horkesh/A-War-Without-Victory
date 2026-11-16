/**
 * F1i (2026-11-16, §6 panel): humanitarian convoys are not in 1.0. The engine step that created
 * convoys is retired, so the player-facing convoy surfaces (ConvoyDecisionModal, the convoy_decision
 * manifest family, inbox / desk / records entries, the stage-convoy-decision IPC) are kept but INERT:
 * they read `military.pending_convoy_decisions`, and nothing in the game creates an entry there.
 *
 * Canon condition (canon-compliance seat): a dormant surface must never offer a convoy choice. This
 * test pins that no source module adds a convoy. The only remaining writer, the stage IPC, can only
 * set a decision on a convoy that already exists (an old save's pending entry), never create one.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');

function listSources(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) out.push(...listSources(full));
        else if (/\.(ts|tsx|cjs|mjs|js)$/.test(name)) out.push(full);
    }
    return out;
}

describe('F1i: convoy surfaces are inert', () => {
    it('no source module creates a pending convoy', () => {
        const writers: string[] = [];
        for (const file of listSources(join(ROOT, 'src'))) {
            const text = readFileSync(file, 'utf8');
            if (/pending_convoy_decisions\s*(=(?!=)|\.push\()/.test(text)) writers.push(relative(ROOT, file).replace(/\\/g, '/'));
        }
        // The stage IPC maps over existing convoys; the projector copies for display only.
        expect(writers).toEqual(['src/desktop/convoy_ipc_contract.cjs', 'src/desktop/player_visible_state.cjs']);
    });

    it('the stage IPC cannot create a convoy, only decide an existing one', () => {
        const { stageConvoyDecisionOnState } = require('../src/desktop/convoy_ipc_contract.cjs');
        const empty = { military: {} } as { military: { pending_convoy_decisions?: unknown[] } };
        expect(stageConvoyDecisionOnState(empty, 'convoy:1:x:RS', 'allow')).toEqual({ ok: false, error: 'Convoy not found' });
        expect(empty.military.pending_convoy_decisions).toEqual([]);
    });
});
