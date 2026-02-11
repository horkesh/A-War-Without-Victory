
import { readFileSync } from 'fs';

const path = 'src/scenario/scenario_runner.ts';
const content = readFileSync(path, 'utf8');


const lines = content.split('\n');
let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Count chars in line
    for (const char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }

    if (lineNum >= 400 && lineNum <= 500) {
        console.log(`${lineNum.toString().padStart(4)} [${balance}]: ${line}`);
    }
}
console.log(`Final balance: ${balance}`);
