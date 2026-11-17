/**
 * Guard: every GameState field a desktop IPC handler writes must have a reader in the
 * engine (src/sim or src/state, outside validation / migration / type files).
 *
 * Added 2026-11-17 with the supply-reserve retirement (Fable consult 6): the
 * "Stage Airdrop Allocation" action wrote root `state.airdrop_allocation`, while the
 * engine read only `state.military.airdrop_allocation` (and only with reserves on), so
 * the player's choice went nowhere. In fact the handler never succeeded: the save path
 * (`serializeGameState.ts`, `assertNoWrapper`) rejects any top-level key that is not a
 * canonical GameState key, so the call returned `ok: false`. This static scan catches that
 * class of dead write.
 *
 * The scan is path-aware: a root write `state.X = ...` needs a reader of `state.X`, and
 * a `state.military.X = ...` write needs a reader of `military.X`. Comments are stripped
 * before matching. It is a heuristic (aliases such as `const mil = state.military` are
 * not followed), so a write it cannot see a reader for must either gain a reader or be
 * listed below with a reason.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

/** Fields written by IPC for the UI only; the engine is not meant to read them. */
const UI_ONLY_FIELDS: Record<string, string> = {
    // (none today)
};

/**
 * KNOWN DEFECTS found by this guard on 2026-11-17 and reported to the orchestrator:
 * each handler writes a ROOT field while the engine reads the military.* path (or
 * nothing), so the player action has no effect. Out of scope for the supply-reserve
 * retirement; fix the handler and delete the entry. The test fails if an entry here
 * gains a reader, so the list cannot go stale.
 */
const KNOWN_DEAD_WRITES: Record<string, string> = {
    brigade_aor_orders: 'clear-orders filters root brigade_aor_orders; deserialize deletes that root field and nothing reads it',
    brigade_deploy_orders: 'apply-recruitment writes root brigade_deploy_orders; brigade_movement.ts reads military.brigade_deploy_orders',
    brigade_mun_orders: 'stage-move-order writes root brigade_mun_orders; deserialize deletes that root field and nothing reads it',
    brigade_posture_orders: 'clear-orders filters root brigade_posture_orders; the engine reads military.brigade_posture_orders',
    corps_command: 'stabilize-command-relationship writes root corps_command; the engine reads military.corps_command',
    opsec_sectors: 'stage-opsec-toggle writes root opsec_sectors; the engine reads military.opsec_sectors',
};

function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(ts|tsx|cjs|js)$/.test(entry.name)) out.push(full);
    }
    return out;
}

const EXCLUDED_READER_FILES = /validateGameState|save_migration|migration|serialize\.ts$|game_state\.ts$|types\.ts$/;

function collectIpcWrites(): Map<string, Set<string>> {
    const source = stripComments(readFileSync(join(ROOT, 'src/desktop/electron-main.cjs'), 'utf8'));
    const handlerRe = /ipcMain\.handle\(\s*'([^']+)'/g;
    const starts: Array<{ channel: string; index: number }> = [];
    for (let m = handlerRe.exec(source); m; m = handlerRe.exec(source)) {
        starts.push({ channel: m[1]!, index: m.index });
    }
    const writes = new Map<string, Set<string>>();
    starts.forEach((start, i) => {
        const body = source.slice(start.index, i + 1 < starts.length ? starts[i + 1]!.index : source.length);
        const writeRe = /\bstate\.(military\.)?([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/g;
        for (let w = writeRe.exec(body); w; w = writeRe.exec(body)) {
            const field = (w[1] ? 'military.' : '') + w[2]!;
            if (!writes.has(field)) writes.set(field, new Set());
            writes.get(field)!.add(start.channel);
        }
    });
    return writes;
}

function engineSources(): Array<[string, string]> {
    return [...walk(join(ROOT, 'src/sim')), ...walk(join(ROOT, 'src/state'))]
        .map((file) => relative(ROOT, file).replace(/\\/g, '/'))
        .filter((rel) => !EXCLUDED_READER_FILES.test(rel))
        .map((rel) => [rel, stripComments(readFileSync(join(ROOT, rel), 'utf8'))] as [string, string]);
}

function readersOf(field: string, sources: Array<[string, string]>): string[] {
    const isMilitary = field.startsWith('military.');
    const name = field.split('.').pop()!;
    const readerRe = isMilitary
        ? new RegExp(`military\\??\\.${name}\\b(?!\\s*=[^=])`)
        : new RegExp(`\\bstate\\??\\.${name}\\b(?!\\s*=[^=])`);
    return sources.filter(([, text]) => readerRe.test(text)).map(([rel]) => rel);
}

describe('IPC write paths have engine readers', () => {
    const writes = collectIpcWrites();
    const sources = engineSources();

    it('finds the IPC handlers it is meant to scan', () => {
        expect(writes.size).toBeGreaterThan(5);
        expect(writes.has('military.logistics_priority')).toBe(true);
    });

    it('no longer has the retired airdrop write', () => {
        expect(writes.has('airdrop_allocation')).toBe(false);
        expect(writes.has('military.airdrop_allocation')).toBe(false);
    });

    it('every IPC-written field has a reader, or is listed with a reason', () => {
        const unread = [...writes.keys()]
            .filter((field) => !(field in UI_ONLY_FIELDS) && !(field in KNOWN_DEAD_WRITES))
            .filter((field) => readersOf(field, sources).length === 0)
            .map((field) => `${field} (written by ${[...writes.get(field)!].sort().join(', ')})`)
            .sort();
        expect(unread).toEqual([]);
    });

    it('the known-defect list is exact: every entry is still written and still unread', () => {
        for (const field of Object.keys(KNOWN_DEAD_WRITES).sort()) {
            expect(writes.has(field), `${field} is no longer written; delete its entry`).toBe(true);
            expect(readersOf(field, sources), `${field} now has a reader; delete its entry`).toEqual([]);
        }
    });
});
