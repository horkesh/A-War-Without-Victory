// One-off codemod: adds missing `military` / `political` / `displacement` keys to GameState
// object literals named in a saved tsc error log.
//
// Usage (from the repo root):
//   npx tsc --noEmit > tsc-errors.txt
//   npx tsx tools/fix_missing_domains.ts tsc-errors.txt
//
// The log used to be read from a fixed file in a Cursor agent folder on the owner's machine.
// File paths in the log are taken relative to the repo root, where tsc reports them from.
import { Project, SyntaxKind, ObjectLiteralExpression } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const logArg = process.argv[2];
if (!logArg) {
    console.error('usage: npx tsx tools/fix_missing_domains.ts <tsc-errors.txt>');
    process.exit(2);
}

const project = new Project({
    tsConfigFilePath: path.join(repoRoot, 'tsconfig.json'),
});

const filesToFix = new Set<string>();
const lines = fs.readFileSync(path.resolve(logArg), 'utf8').split('\n');

for (const line of lines) {
    if (line.includes("is missing in type") && (line.includes("'military'") || line.includes("'political'") || line.includes("'displacement'"))) {
        const match = line.match(/^([^(]+)\((\d+),(\d+)\):/);
        if (match) {
            filesToFix.add(path.resolve(repoRoot, match[1].trim()));
        }
    }
}

let modifiedCount = 0;

for (const filePath of filesToFix) {
    if (!fs.existsSync(filePath)) { console.warn(`Skipped (not found): ${filePath}`); continue; }
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) { console.warn(`Skipped (not in tsconfig project): ${path.relative(repoRoot, filePath)}`); continue; }

    const literals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
    let changed = false;

    for (const node of literals) {
        // Only target literals that we suspect are GameState or Partial<GameState>
        // Either they have `military` but not `displacement`, or similar
        const hasMil = node.getProperty('military') !== undefined;
        const hasPol = node.getProperty('political') !== undefined;
        const hasDisp = node.getProperty('displacement') !== undefined;

        if (hasMil || hasPol || hasDisp) {
            if (!hasMil) { node.addPropertyAssignment({ name: 'military', initializer: '{} as any' }); changed = true; }
            if (!hasPol) { node.addPropertyAssignment({ name: 'political', initializer: '{} as any' }); changed = true; }
            if (!hasDisp) { node.addPropertyAssignment({ name: 'displacement', initializer: '{} as any' }); changed = true; }
        } else {
            // Check contextual type
            const type = node.getContextualType();
            const typeText = type?.getText() ?? '';
            if (typeText.includes('GameState') && !typeText.includes('LoadedGameState')) {
                if (!hasMil) { node.addPropertyAssignment({ name: 'military', initializer: '{} as any' }); changed = true; }
                if (!hasPol) { node.addPropertyAssignment({ name: 'political', initializer: '{} as any' }); changed = true; }
                if (!hasDisp) { node.addPropertyAssignment({ name: 'displacement', initializer: '{} as any' }); changed = true; }
            }
        }
    }

    if (changed) {
        sourceFile.saveSync();
        modifiedCount++;
        console.log(`Saved ${path.relative(repoRoot, filePath)}`);
    }
}

console.log(`Modified ${modifiedCount} files.`);
