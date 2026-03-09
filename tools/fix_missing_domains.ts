import { Project, SyntaxKind, ObjectLiteralExpression } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
});

const filesToFix = new Set<string>();
const lines = fs.readFileSync('C:/Users/User/.cursor/projects/f-A-War-Without-Victory/agent-tools/7394ad7a-4f5a-43c4-9c20-e92c3a481106.txt', 'utf8').split('\n');

for (const line of lines) {
    if (line.includes("is missing in type") && (line.includes("'military'") || line.includes("'political'") || line.includes("'displacement'"))) {
        const match = line.match(/^([^(]+)\((\d+),(\d+)\):/);
        if (match) {
            filesToFix.add(match[1]);
        }
    }
}

let modifiedCount = 0;

for (const filePath of filesToFix) {
    if (!fs.existsSync(filePath)) continue;
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) continue;

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
        console.log(`Saved ${filePath}`);
    }
}

console.log(`Modified ${modifiedCount} files.`);
