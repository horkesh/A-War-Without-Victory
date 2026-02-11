/**
 * One-off: Reorder PROJECT_LEDGER.md changelog from newest-first to chronological (oldest first, newest last).
 * Reads docs/PROJECT_LEDGER.md, parses ## Changelog section into date-stamped entries, sorts by date ascending, writes back.
 */

import * as fs from 'fs';
import * as path from 'path';

const LEDGER_PATH = path.join(process.cwd(), 'docs', 'PROJECT_LEDGER.md');

// Line starts an entry if it begins with **YYYY-MM-DD** or **[**YYYY-MM-DD**]**
function isEntryStart(line: string): boolean {
  return /^\*\*\d{4}-\d{2}-\d{2}\*\*/.test(line) || /^\[\*\*\d{4}-\d{2}-\d{2}\*\*\]/.test(line);
}

function extractDate(line: string): string | null {
  const m = line.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function main(): void {
  const raw = fs.readFileSync(LEDGER_PATH, 'utf-8');
  const marker = '\n## Changelog\n\n';
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    console.error('## Changelog not found');
    process.exit(1);
  }
  const header = raw.slice(0, idx + marker.length);
  const changelogBody = raw.slice(idx + marker.length);

  const lines = changelogBody.split(/\n/);
  const entryStarts: { index: number; date: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isEntryStart(lines[i])) {
      const date = extractDate(lines[i]);
      if (date) entryStarts.push({ index: i, date });
    }
  }

  const entries: { date: string; text: string }[] = [];
  for (let e = 0; e < entryStarts.length; e++) {
    const start = entryStarts[e].index;
    const end = e + 1 < entryStarts.length ? entryStarts[e + 1].index : lines.length;
    const block = lines.slice(start, end).join('\n').trimEnd();
    entries.push({ date: entryStarts[e].date, text: block });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  const newChangelog = entries.map((e) => e.text).join('\n\n');
  const out = header + newChangelog + '\n';
  fs.writeFileSync(LEDGER_PATH, out, 'utf-8');
  console.log(`Reordered ${entries.length} entries chronologically (oldest first, newest last).`);
}

main();
