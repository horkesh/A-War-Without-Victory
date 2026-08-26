#!/usr/bin/env node
/**
 * whowrites — exhaustively answer "who writes this field, and does a per-turn pass own it?"
 *
 * WHY THIS EXISTS (2026-08-26, RE engine-integrity panel):
 * Two failures in one review, both from the same root:
 *   1. A search for `readiness = 'active'` found 2 hits and produced the false
 *      conclusion "nothing in the war pipeline restores readiness". The real exit was
 *      `formation.readiness = deriveReadinessState(formation)` — a FUNCTION RESULT, so
 *      the literal never appeared. That wrong absence became a plan prerequisite.
 *   2. Three separate proposed mechanics (`cohesion` dilution, `readiness` latency, a
 *      `to_control` gate) would each have been SILENT NO-OPS, because a per-turn pass
 *      already owns those fields and overwrites them every turn. Each would have cost a
 *      ~70-minute 188-week run to discover, and each would have LOOKED like a design
 *      failure ("tune the constants") rather than a plumbing one.
 *
 * THE RULE: a field owned by a per-turn recompute cannot carry a persistent penalty.
 * Run this BEFORE hanging any mechanic on a field.
 *
 *   node tools/hooks/whowrites.mjs readiness
 *   node tools/hooks/whowrites.mjs cohesion --dir src/sim
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const field = args.find((a) => !a.startsWith('--'));
const dirFlag = args.indexOf('--dir');
const ROOT = process.cwd();
const SEARCH_DIR = dirFlag >= 0 ? args[dirFlag + 1] : 'src';

if (!field) {
    console.error('usage: node tools/hooks/whowrites.mjs <fieldName> [--dir src]');
    process.exit(2);
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '__mocks__']);

function walk(dir, out = []) {
    let entries;
    try { entries = readdirSync(dir); } catch { return out; }
    for (const e of entries.sort()) {
        if (SKIP.has(e)) continue;
        const p = join(dir, e);
        let st;
        try { st = statSync(p); } catch { continue; }
        if (st.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx|js|mjs|cjs)$/.test(e) && !/\.d\.ts$/.test(e)) out.push(p);
    }
    return out;
}

// ── Which modules does the turn pipeline actually run every turn? ────────────
// Read the phase files and collect their imported local modules. A writer inside
// one of these is a per-turn owner of whatever it writes.
const PIPELINE_ENTRIES = [
    'src/sim/turn_phases/war_phases.ts',
    'src/sim/turn_phases/early_war_phases.ts',
    'src/sim/turn_pipeline.ts',
];
const pipelineModules = new Set();
for (const entry of PIPELINE_ENTRIES) {
    let src;
    try { src = readFileSync(join(ROOT, entry), 'utf8'); } catch { continue; }
    for (const m of src.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
        pipelineModules.add(m[1].replace(/\.js$/, '').split('/').pop());
    }
}

// ── Assignment forms. The point is that this list is EXHAUSTIVE, not clever. ──
const f = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FORMS = [
    { name: 'assign',        re: new RegExp(`\\b${f}\\s*=(?!=)`) },
    { name: 'compound',      re: new RegExp(`\\b${f}\\s*(\\+=|-=|\\*=|/=|\\?\\?=|\\|\\|=|&&=)`) },
    { name: 'object-literal',re: new RegExp(`\\b${f}\\s*:`) },
    { name: 'delete',        re: new RegExp(`delete\\s+[^;]*\\b${f}\\b`) },
    { name: 'destructure',   re: new RegExp(`\\{[^}]*\\b${f}\\b[^}]*\\}\\s*=`) },
];

const files = walk(join(ROOT, SEARCH_DIR));
const hits = [];

for (const file of files) {
    let lines;
    try { lines = readFileSync(file, 'utf8').split(/\r?\n/); } catch { continue; }
    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        for (const form of FORMS) {
            if (!form.re.test(line)) continue;
            // A local DECLARATION (`const readiness = ...`) reads the field, it does not
            // write it. Property writes (`f.readiness = ...`) and object literals stay.
            if (form.name === 'assign' && new RegExp(`\\b(const|let|var)\\s+${f}\\s*=`).test(line)) continue;
            if (form.name === 'assign'
                && !new RegExp(`[.\\]]\\s*${f}\\s*=`).test(line)
                && !new RegExp(`^${f}\\s*=`).test(trimmed)) continue;
            // Classify the right-hand side — this is the distinction that was missed.
            const rhs = line.split(new RegExp(`\\b${f}\\s*[:=]+`))[1] ?? '';
            let kind = 'other';
            if (/^\s*['"`]/.test(rhs)) kind = 'LITERAL';
            else if (/^\s*[A-Za-z_$][\w$.]*\s*\(/.test(rhs)) kind = 'FUNCTION RESULT';
            else if (/^\s*(true|false|null|undefined|-?\d)/.test(rhs)) kind = 'literal-ish';
            else if (rhs.trim()) kind = 'expression';
            hits.push({ file: relative(ROOT, file).split(sep).join('/'), line: i + 1, form: form.name, kind, text: trimmed.slice(0, 118) });
            break;
        }
    });
}

const isTest = (p) => /(^|\/)tests?\//.test(p) || /\.test\./.test(p) || /__mocks__/.test(p);
const prod = hits.filter((h) => !isTest(h.file));
const perTurn = prod.filter((h) => pipelineModules.has(h.file.split('/').pop().replace(/\.(ts|tsx|js|mjs|cjs)$/, '')));

console.log(`\nwhowrites "${field}"  —  scanned ${files.length} files under ${SEARCH_DIR}/\n`);
if (prod.length === 0) {
    console.log('  NO PRODUCTION WRITERS FOUND.');
    console.log('  Before recording that as an absence: is the field written via a spread,');
    console.log('  Object.assign, a computed key, or a differently-named local? Check by hand.\n');
} else {
    const w = Math.max(...prod.map((h) => h.file.length + String(h.line).length + 1));
    for (const h of prod) {
        const loc = `${h.file}:${h.line}`;
        console.log(`  ${loc.padEnd(w + 2)} [${h.kind}] ${h.text}`);
    }
    const byKind = prod.reduce((a, h) => ((a[h.kind] = (a[h.kind] ?? 0) + 1), a), {});
    console.log(`\n  ${prod.length} production writers  —  ${Object.entries(byKind).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    const fnResults = prod.filter((h) => h.kind === 'FUNCTION RESULT');
    if (fnResults.length) {
        console.log(`\n  ⚠ ${fnResults.length} writer(s) assign a FUNCTION RESULT. A grep for \`${field} = '<value>'\``);
        console.log(`    would MISS every one of them. This is the 2026-08-26 miss, verbatim.`);
    }
}

if (perTurn.length) {
    console.log(`\n  ★★ PER-TURN OWNER DETECTED — ${perTurn.length} writer(s) live in modules the turn pipeline imports:`);
    for (const h of perTurn) console.log(`     ${h.file}:${h.line}  [${h.kind}] ${h.text}`);
    console.log(`\n  ⇒ A MECHANIC HUNG ON \`${field}\` WILL BE OVERWRITTEN EVERY TURN AND IS A SILENT NO-OP.`);
    console.log(`     Read the writer above and confirm whether it is unconditional before proceeding.`);
    console.log(`     Precedents: cohesion (floor clamp), readiness (deriveReadinessState), to_control.`);
    console.log(`     Pick a field with no per-turn recompute, or make the recompute aware of your term.\n`);
} else if (prod.length) {
    console.log(`\n  No writer found in a module the turn pipeline imports.`);
    console.log(`  That is NECESSARY but NOT SUFFICIENT — a pass may reach this field indirectly.`);
    console.log(`  Confirm by reading the writers above before hanging a persistent mechanic on it.\n`);
}
