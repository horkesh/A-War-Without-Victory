import { Project } from "ts-morph";
import fs from "fs";

console.log("Starting massive codebase refactor and deslopping...");

// 1. Initialize ts-morph project
const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles();
console.log(`Found ${sourceFiles.length} TypeScript files. Processing...`);

let fixedFiles = 0;

for (const sourceFile of sourceFiles) {
    try {
        // Organize imports (removes unused imports, sorts them)
        sourceFile.organizeImports();

        // Format text (fixes alignment, trailing whitespace, sloppy formatting)
        sourceFile.formatText();
        
        fixedFiles++;
    } catch (err) {
        console.error(`Failed to process ${sourceFile.getFilePath()}:`, err.message);
    }
}

// Save all changes
project.saveSync();
console.log(`Successfully refactored and deslopped ${fixedFiles} files.`);
