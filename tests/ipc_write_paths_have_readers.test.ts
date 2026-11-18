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
import { GAMESTATE_TOP_LEVEL_KEYS } from '../src/state/serializeGameState.js';

const ROOT = process.cwd();

/** Fields written by IPC for the UI only; the engine is not meant to read them. */
const UI_ONLY_FIELDS: Record<string, string> = {
    // (none today)
};

/**
 * Known defects. The six that the first run of this guard found on 2026-11-17 (root
 * `brigade_aor_orders`, `brigade_deploy_orders`, `brigade_mun_orders`, `brigade_posture_orders`,
 * `corps_command`, `opsec_sectors`) were fixed or retired in the dead-IPC change, so the list is
 * empty. An entry must give the reason and is checked: the test fails if an entry gains a reader
 * or stops being written, so the list cannot go stale.
 */
const KNOWN_DEAD_WRITES: Record<string, string> = {};

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

/**
 * READ half of the guard (2026-11-17, L7). The write scan above cannot see a handler that READS a
 * root field GameState does not have: `state.corps_command?.[id]` found no operation and
 * `stage-operation-decision` always answered "Operation not found"; `stabilize-command-relationship`
 * kept its cooldown and its force-launch strain source on a root `corps_command` the engine never
 * fills. GameState has twelve top-level keys (`GAMESTATE_TOP_LEVEL_KEYS`); everything else lives
 * under `military`, `political`, `displacement`, `meta`. A root `state.<key>` whose key is not one
 * of those twelve is a read or write of a field that does not exist, and a write also fails at
 * serialization (`assertNoWrapper`).
 */
describe('desktop code touches only real GameState root keys', () => {
    /**
     * Files where `state` is NOT a GameState (a renderer projection or another shape). Empty today:
     * `player_visible_state.cjs` is excluded by file name below because it builds projections.
     */
    const EXCLUDED_FILES = new Set(['player_visible_state.cjs']);
    /** Root keys that are knowingly not GameState keys, with the reason. Empty today. */
    const ALLOWED_NON_GAMESTATE_KEYS: Record<string, string> = {};

    function scan(): Array<{ file: string; line: number; key: string }> {
        const dir = join(ROOT, 'src/desktop');
        const found: Array<{ file: string; line: number; key: string }> = [];
        for (const name of readdirSync(dir).filter((f) => f.endsWith('.cjs') && !EXCLUDED_FILES.has(f)).sort()) {
            const text = stripComments(readFileSync(join(dir, name), 'utf8'));
            text.split('\n').forEach((line, i) => {
                const re = /(?<![A-Za-z0-9_.$])state\??\.([A-Za-z_][A-Za-z0-9_]*)/g;
                for (let m = re.exec(line); m; m = re.exec(line)) {
                    const key = m[1]!;
                    if (!GAMESTATE_TOP_LEVEL_KEYS.has(key) && !(key in ALLOWED_NON_GAMESTATE_KEYS)) {
                        found.push({ file: `src/desktop/${name}`, line: i + 1, key });
                    }
                }
            });
        }
        return found;
    }

    it('scans the desktop modules (the scan is not vacuous)', () => {
        const text = readFileSync(join(ROOT, 'src/desktop/electron-main.cjs'), 'utf8');
        expect(text.includes('state.military')).toBe(true);
        expect(GAMESTATE_TOP_LEVEL_KEYS.has('military')).toBe(true);
        expect(GAMESTATE_TOP_LEVEL_KEYS.has('corps_command')).toBe(false);
        expect(GAMESTATE_TOP_LEVEL_KEYS.has('opsec_sectors')).toBe(false);
    });

    it('no desktop handler reads or writes a root state key that is not a GameState key', () => {
        const offenders = scan().map((hit) => `${hit.file}:${hit.line} state.${hit.key}`);
        expect(offenders).toEqual([]);
    });

    it('the retired root-path actions are gone from the main process and the bridge', () => {
        const main = readFileSync(join(ROOT, 'src/desktop/electron-main.cjs'), 'utf8');
        const preload = readFileSync(join(ROOT, 'src/desktop/preload.cjs'), 'utf8');
        for (const channel of ['stage-move-order', 'stage-deploy-order', 'stage-undeploy-order', 'clear-orders', 'stage-operation-decision']) {
            expect(main.includes(`ipcMain.handle('${channel}'`), channel).toBe(false);
            expect(preload.includes(`'${channel}'`), channel).toBe(false);
        }
    });
});
