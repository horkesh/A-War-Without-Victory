/**
 * OBSERVER-LABEL guard (rulings §68, lane B s36, 2026-11-27).
 *
 * The stage-2 parity checker (tools/ai_play/full_save_parity.cjs, OBSERVER-LABEL) compares the
 * three bot labels of `decision_source` ('bot_political', 'bot_v1', 'bot_ai_default') as one class
 * on the live faction's rows, because an automatic answer for the absent player's seat is logged
 * 'bot_ai_default' live where headless logs the bot's own label. That rule is sound only while no
 * src reader branches on WHICH bot answered: every reader today tests `decision_source` against
 * 'player' only (systems seat, 84 readers, §68).
 *
 * This test fails if any src reader compares a bot label: `===` / `!==` / `==` / `!=` with a bot
 * label on either side, a `case` on one, a list or Set of them, or a prefix/pattern test of
 * `decision_source` for "bot". If it fails, the checker rule must be removed and the label unified
 * in the engine (§68), not this test loosened.
 *
 * Exempt: writers (an object property or return value that SETS a label), type unions, and the
 * enum validator src/state/validateGameState.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const EXEMPT = new Set(['src/state/validateGameState.ts']);
const EXTENSIONS = /\.(ts|tsx|cts|mts|js|cjs|mjs)$/;

const LABEL = String.raw`['"\x60](?:bot_political|bot_v1|bot_ai_default)['"\x60]`;
const READER_SHAPES: RegExp[] = [
    new RegExp(String.raw`(?:===|!==|==|!=)\s*${LABEL}`),
    new RegExp(String.raw`${LABEL}\s*(?:===|!==|==|!=)`),
    new RegExp(String.raw`\bcase\s+${LABEL}`),
    // A list or Set of labels is a reader's shape (includes / has); writers set one label.
    new RegExp(String.raw`${LABEL}\s*,\s*${LABEL}`),
    // A table keyed by label (indexed by the field); writers never use a label as a key.
    /[{,]\s*['"`]?(?:bot_political|bot_v1|bot_ai_default)['"`]?\s*:/,
    // A prefix, shape or pattern test of the field for "bot".
    /(?:decision_source|decisionSource)\b[^;\n]*\.(?:startsWith|endsWith|includes|indexOf|match|test|slice|substring|split)\(\s*['"`/]?\^?(?:bot|_)/,
    /\/\^?bot_?[^/\n]*\/[a-z]*\.test\([^)\n]*(?:decision_source|decisionSource)/,
];
/** The shapes a formatter may split over lines: checked again on the file with its whitespace collapsed. */
const MULTI_LINE_SHAPES = READER_SHAPES.slice(0, 5);

/** Comments removed (line and block), strings kept: a doc line that quotes a comparison is not code. */
function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

/** The reader-shaped lines of one file, as `line: text`. */
function botLabelReaderLines(source: string): string[] {
    const hits: string[] = [];
    const code = stripComments(source);
    code.split('\n').forEach((line, index) => {
        if (READER_SHAPES.some((shape) => shape.test(line))) hits.push(`${index + 1}: ${line.trim()}`);
    });
    if (hits.length === 0) {
        const collapsed = code.replace(/\s+/g, ' ');
        for (const shape of MULTI_LINE_SHAPES) {
            const match = shape.exec(collapsed);
            if (match) hits.push(`(over lines): ${collapsed.slice(Math.max(0, match.index - 60), match.index + 60).trim()}`);
        }
    }
    return hits;
}

function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
        else if (EXTENSIONS.test(name)) out.push(path);
    }
    return out;
}

describe('OBSERVER-LABEL guard: no src reader compares decision_source with a bot label (§68)', () => {
    it('catches every reader shape and passes every writer shape', () => {
        const readers = [
            `if (row.decision_source === 'bot_political') x();`,
            `const auto = r.decision_source !== "bot_ai_default";`,
            `return 'bot_v1' == source;`,
            `switch (row.decision_source) { case 'bot_ai_default': return 1; }`,
            `const BOTS = new Set(['bot_political', 'bot_v1']);`,
            `if (row.decision_source.startsWith('bot')) x();`,
            `if (/^bot_/.test(row.decision_source)) x();`,
            `const weight = { bot_v1: 1, player: 2 }[row.decision_source];`,
            `if (row.decision_source.endsWith('_default')) x();`,
            `if (row.decision_source ===\n    'bot_v1') x();`,
            `const BOTS = new Set([\n    'bot_political',\n    'bot_v1',\n]);`,
        ];
        for (const line of readers) expect(botLabelReaderLines(line), line.length > 0 ? line : 'empty').not.toEqual([]);
        const writers = [
            `decisionSource: 'bot_ai_default',`,
            `return { chosen, decisionSource: scored ? 'bot_political' : 'bot_ai_default' };`,
            `decision_source: 'bot_political' | 'bot_v1' | 'bot_ai_default' | 'player';`,
            `{ chosen: inPersonOrder, decisionSource: 'bot_ai_default' as const }`,
            `if (row.decision_source === 'player') x();`,
            `// a doc line: decision_source === 'bot_political' is never read`,
        ];
        for (const line of writers) expect(botLabelReaderLines(line), line).toEqual([]);
    });

    it('src holds no reader of a bot label (writers, type unions and validateGameState.ts exempt)', () => {
        const files = sourceFiles(SRC);
        expect(files.length).toBeGreaterThan(100);
        const offenders: string[] = [];
        for (const file of files) {
            const rel = relative(ROOT, file).replace(/\\/g, '/');
            if (EXEMPT.has(rel)) continue;
            for (const hit of botLabelReaderLines(readFileSync(file, 'utf8'))) offenders.push(`${rel}:${hit}`);
        }
        expect(offenders).toEqual([]);
    });
});
