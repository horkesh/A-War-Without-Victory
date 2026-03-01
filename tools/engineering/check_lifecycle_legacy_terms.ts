import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

type Match = { file: string; line: number; text: string; token: string };

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
    '.git',
    'node_modules',
    'dist',
    'coverage',
    '.cursor',
    '.tmp_phase0_full_progression',
]);

const SKIP_PATH_SUBSTRINGS = [
    `${join('docs', '_old')}${'\\'}`,
    `${join('data', 'derived')}${'\\'}`,
];

const ALLOWED_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml',
]);

const TOKENS: Array<{ token: string; pattern: RegExp }> = [
    { token: 'phase_i', pattern: /\bphase_i\b/g },
    { token: 'phase_ii', pattern: /\bphase_ii\b/g },
    { token: 'Phase I', pattern: /\bPhase I\b/g },
    { token: 'Phase II', pattern: /\bPhase II\b/g },
];

function shouldSkipPath(path: string): boolean {
    const normalized = path.replaceAll('/', '\\');
    return SKIP_PATH_SUBSTRINGS.some((needle) => normalized.includes(needle.replaceAll('/', '\\')));
}

function hasAllowedExtension(path: string): boolean {
    const idx = path.lastIndexOf('.');
    if (idx === -1) return false;
    return ALLOWED_EXTENSIONS.has(path.slice(idx));
}

async function walk(dir: string, out: string[]): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
        const abs = join(dir, entry.name);
        const rel = relative(ROOT, abs);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            if (shouldSkipPath(rel)) continue;
            await walk(abs, out);
            continue;
        }
        if (!hasAllowedExtension(abs)) continue;
        if (shouldSkipPath(rel)) continue;
        out.push(abs);
    }
}

function collectMatches(content: string, relPath: string): Match[] {
    const lines = content.split(/\r?\n/);
    const matches: Match[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (line.includes('legacy-phase-term-ok')) continue;
        for (const token of TOKENS) {
            token.pattern.lastIndex = 0;
            if (token.pattern.test(line)) {
                matches.push({ file: relPath, line: i + 1, text: line.trim(), token: token.token });
            }
        }
    }
    return matches;
}

async function main(): Promise<void> {
    const files: string[] = [];
    await walk(ROOT, files);
    const allMatches: Match[] = [];

    for (const abs of files) {
        const rel = relative(ROOT, abs);
        const raw = await readFile(abs, 'utf8');
        allMatches.push(...collectMatches(raw, rel));
    }

    allMatches.sort((a, b) => {
        const byFile = a.file.localeCompare(b.file);
        if (byFile !== 0) return byFile;
        if (a.line !== b.line) return a.line - b.line;
        return a.token.localeCompare(b.token);
    });

    if (allMatches.length === 0) {
        process.stdout.write('lifecycle-check: no legacy lifecycle terms found.\n');
        return;
    }

    process.stderr.write(`lifecycle-check: found ${allMatches.length} legacy lifecycle matches.\n`);
    for (const m of allMatches.slice(0, 500)) {
        process.stderr.write(`- ${m.file}:${m.line} [${m.token}] ${m.text}\n`);
    }
    if (allMatches.length > 500) {
        process.stderr.write(`... truncated ${allMatches.length - 500} additional matches\n`);
    }
    process.exitCode = 1;
}

main().catch((err) => {
    process.stderr.write(`lifecycle-check: failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
});
