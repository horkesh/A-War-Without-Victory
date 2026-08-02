import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const FILES: Record<string, string> = {
    'RBiH': 'docs/knowledge/ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md',
    'RS': 'docs/knowledge/VRS_APPENDIX_G_FULL_UNIT_LIST.md',
    'HRHB': 'docs/knowledge/HVO_FULL_UNIT_LIST.md'
};

const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');

interface BrigadeRow {
    id?: string;
    faction?: string;
    [key: string]: unknown;
}

// --- Helpers ---

function countBrigadesInMarkdown(filePath: string): number {
    const fullPath = path.join(ROOT, filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        return 0;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    let count = 0;
    let inBrigadeTable = false;

    // console.log(`Scanning ${filePath}...`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Header detection (H1, H2, H3...)
        if (line.startsWith('#')) {
            const upper = line.toUpperCase();
            // Start capturing if header contains BRIGADE or "FULL LIST" (generic)
            // But verify it's not a TOC or "Special Units"
            if (upper.includes('BRIGADE') || upper.includes('FULL LIST')) {
                if (!upper.includes('SPECIAL') && !upper.includes('BATTALION') && !upper.includes('REGIMENT') && !upper.includes('NOTES')) {
                    inBrigadeTable = true;
                    // console.log(`  Entered table section at: ${line}`);
                } else {
                    inBrigadeTable = false;
                }
            } else if (upper.includes('BATTALION') || upper.includes('SPECIAL') || upper.includes('CORPS') || upper.includes('OPERATIONAL ZONES')) {
                inBrigadeTable = false;
                // console.log(`  Exited table section at: ${line}`);
            }
        }

        if (inBrigadeTable && line.startsWith('|')) {
            // Ignore separators
            if (line.includes('---')) continue;
            // Ignore headers (case insensitive check for common header terms)
            const lower = line.toLowerCase();
            if (lower.includes('brigade') && lower.includes('corps')) continue; // Standard header
            if (lower.includes('unit') && lower.includes('municipality')) continue; // Standard header

            // Count valid row
            const cols = line.split('|').filter(s => s.trim() !== '');
            if (cols.length >= 2) {
                count++;
            }
        }
    }
    return count;
}

export function normalizeOobBrigades(raw: unknown): BrigadeRow[] {
    if (Array.isArray(raw)) return raw as BrigadeRow[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { brigades?: unknown }).brigades)) {
        return (raw as { brigades: BrigadeRow[] }).brigades;
    }
    throw new Error('OOB JSON must contain a brigade array.');
}

// --- Main ---

function main(): void {
    console.log('--- Order of Battle Verification ---\n');

    // 1. JSON Counts
    let brigades: BrigadeRow[] = [];
    try {
        brigades = normalizeOobBrigades(JSON.parse(fs.readFileSync(OOB_PATH, 'utf-8')));
    } catch (error) {
        console.error('Error reading OOB JSON:', error);
        process.exitCode = 1;
    }

    const jsonCounts: Record<string, number> = { 'RBiH': 0, 'RS': 0, 'HRHB': 0 };

    for (const brigade of brigades) {
        if (brigade.faction && jsonCounts[brigade.faction] !== undefined) {
            jsonCounts[brigade.faction]++;
        }
    }

    // 2. Markdown Counts
    const mdCounts: Record<string, number> = { 'RBiH': 0, 'RS': 0, 'HRHB': 0 };

    for (const faction of Object.keys(FILES)) {
        mdCounts[faction] = countBrigadesInMarkdown(FILES[faction]);
    }

    // 3. Output Table
    console.log('| Faction | Markdown Source (Appendix) | OOB JSON (oob_brigades.json) | Delta (JSON - MD) |');
    console.log('|:--------|:---------------------------|:-----------------------------|:------------------|');

    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        const md = mdCounts[faction];
        const js = jsonCounts[faction];
        const delta = js - md;

        // Formatting
        const fStr = faction.padEnd(7);
        const mdStr = md.toString().padEnd(26);
        const jsStr = js.toString().padEnd(28);

        console.log(`| ${fStr} | ${mdStr} | ${jsStr} | ${delta} |`);
    }

    console.log('\nNote: Positive Delta means JSON has duplicates or extra units not in Appendix MD.');
    console.log('      Negative Delta means JSON is missing units found in Appendix MD.');
}

function isMainModule(): boolean {
    const entry = process.argv[1];
    return entry != null && path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMainModule()) main();
