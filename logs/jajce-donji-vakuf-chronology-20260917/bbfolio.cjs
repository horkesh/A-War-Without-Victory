// Read-only: for a search term, report the PDF (scan) page it falls on and the printed folio
// that page carries, so citations can use printed folios without assuming a constant offset.
const fs = require('fs');
const file = process.argv[2];
const term = process.argv[3];
const text = fs.readFileSync(file, 'utf8');
const pages = text.split('\f');
const re = new RegExp(term, 'i');
pages.forEach((page, i) => {
  if (!re.test(page)) return;
  const scan = i + 1;
  // A printed folio is a bare number on its own line, usually the first or last line of the page.
  const lines = page.split('\n').map((l) => l.trim()).filter(Boolean);
  const folios = lines.filter((l) => /^\d{1,4}$/.test(l));
  const first = lines[0] || '';
  console.log(`scan=${scan}  folio_candidates=[${folios.join(', ')}]  first_line="${first.slice(0, 60)}"`);
});
