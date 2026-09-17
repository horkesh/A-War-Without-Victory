// Read-only: print one Balkan Battlegrounds KB page with its scan index and printed folio.
const fs = require('fs');
const base = 'data/derived/knowledge_base/balkan_battlegrounds/pages/';
for (const id of process.argv.slice(2)) {
  const p = JSON.parse(fs.readFileSync(base + id + '.json', 'utf8'));
  const text = (p.clean_text || p.raw_text || '').replace(/\r/g, '');
  const tail = text.trimEnd().split('\n').slice(-3).join(' | ');
  const head = text.trimStart().split('\n').slice(0, 2).join(' | ');
  console.log('########## ' + p.volume_id + ' scan page_number=' + p.page_number +
    '  ocr=' + p.ocr_applied + '  [head: ' + head.slice(0, 80) + '] [tail: ' + tail.slice(0, 80) + ']');
  console.log(text);
  console.log('########## end ' + id + '\n');
}
