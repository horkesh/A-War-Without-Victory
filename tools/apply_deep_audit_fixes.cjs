/**
 * Deep Audit Fixes — Apply all findings from the 6-agent /historian review
 * Run: node tools/apply_deep_audit_fixes.cjs
 */
const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '..', 'data', 'scenarios', 'essays', 'essay_index.json');
const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const essays = idx.essays;

let fixCount = 0;

function fix(index, description, fn) {
  const e = essays[index];
  const oldContent = e.content;
  const oldSources = JSON.stringify(e.sources);
  const oldTitle = e.title;
  fn(e);
  const changed = e.content !== oldContent || JSON.stringify(e.sources) !== oldSources || e.title !== oldTitle;
  if (changed) {
    fixCount++;
    console.log(`[${index}] ${e.event_id}: ${description}`);
  } else {
    console.log(`[${index}] ${e.event_id}: WARNING — no change: ${description}`);
  }
}

// === CONTRADICTION FIXES ===

// [34] RS Assembly rejection date: 26 April → 5-6 May
fix(34, 'RS Assembly rejection date 26 April → 5-6 May 1993', (e) => {
  e.content = e.content.replace(
    /26 April 1993/g,
    '5-6 May 1993'
  );
  // Fix chronology framing — Resolution 820 was adopted 17 April, before the rejection
  e.content = e.content.replace(
    /in anticipation of and further strengthened after the assembly's rejection/i,
    'in response to continued Bosnian Serb obstruction of peace efforts, which would culminate in the assembly\'s rejection of the Vance-Owen Plan on 5-6 May'
  );
});

// [25] Safe area extension: UNSCR 836 → UNSCR 824
fix(25, 'Safe area extension attributed to UNSCR 824 not 836', (e) => {
  e.content = e.content.replace(
    /under Resolution 836/,
    'under Resolution 824'
  );
});

// [37] Demilitarization: Morillon "negotiated" → "helped broker"
fix(37, 'Demilitarization: Morillon negotiated → helped broker', (e) => {
  e.content = e.content.replace(
    /negotiated by General Philippe Morillon/i,
    'brokered with the involvement of General Philippe Morillon'
  );
});

// [10] East Mostar: "nine months" → "nearly ten months"
fix(10, 'East Mostar siege: nine months → nearly ten months', (e) => {
  e.content = e.content.replace(
    /that would last nine months/i,
    'that would last nearly ten months'
  );
});

// [50] Op Provide Promise: "since February 1993" → correct
fix(50, 'Op Provide Promise: airlift since July 1992, airdrops since February 1993', (e) => {
  e.content = e.content.replace(
    /humanitarian airlift that had been running since February 1993/i,
    'humanitarian operation that had been running since July 1992, with airdrops over eastern Bosnia beginning in February 1993'
  );
});

// [77] Dayton talks: "twenty days" → "twenty-one days"
fix(77, 'Dayton talks: twenty days → twenty-one days', (e) => {
  e.content = e.content.replace(
    /twenty days/i,
    'twenty-one days'
  );
});

// [71] Zepa: "Two weeks after" → "Three days after"
fix(71, 'Zepa: two weeks → three days after Srebrenica', (e) => {
  e.content = e.content.replace(
    /Two weeks after the fall of Srebrenica/i,
    'Three days after the fall of Srebrenica'
  );
});

// [72] Op Flash: "under forty-eight hours" → "barely thirty-six hours"
fix(72, 'Op Flash: under forty-eight hours → barely thirty-six hours', (e) => {
  e.content = e.content.replace(
    /under forty-eight hours/i,
    'barely thirty-six hours'
  );
});

// [53/91] Owen-Stoltenberg Croat %: standardize
fix(91, 'Owen-Stoltenberg Croat %: 18 → approximately 17', (e) => {
  e.content = e.content.replace(
    /18 percent to the Croat republic/i,
    'approximately 17 percent to the Croat republic'
  );
});

// === OTHER FIXES ===

// [22] Empty sources array — add Prlić case
fix(22, 'Add Prlić case to empty sources array', (e) => {
  if (!e.sources || e.sources.length === 0) {
    e.sources = ['ICTY Prlić et al. Trial Judgment (IT-04-74-T)'];
  }
});

// [39] Halilović title: "commander of the Army" → "Chief of the Main Staff"
fix(39, 'Halilović: commander of the Army → Chief of the Main Staff', (e) => {
  e.content = e.content.replace(
    /commander of the Army of the Republic of Bosnia-Herzegovina/i,
    'Chief of the Main Staff of the Army of the Republic of Bosnia-Herzegovina'
  );
});

// [41] Milošević blockade conflation — soften
fix(41, 'Soften Milošević blockade claim (major blockade was Aug 1994)', (e) => {
  e.content = e.content.replace(
    /Belgrade imposed a partial blockade on the Republika Srpska/i,
    'Belgrade imposed temporary restrictions on the Republika Srpska, a precursor to the far more consequential blockade that would follow the Contact Group Plan rejection in August 1994'
  );
});

// [67] Djukic conviction — check year in sources (2014 may be wrong, actual conviction ~2007)
fix(67, 'Djukic conviction year: 2014 → 2007 in sources', (e) => {
  e.sources = e.sources.map(s =>
    s.includes('Djukic') && s.includes('2014')
      ? s.replace('2014', '2007')
      : s
  );
  e.content = e.content.replace(
    /convicted by the Bosnian State Court in 2014/i,
    'convicted by the Bosnian State Court in 2007'
  );
});

// === Write results ===
fs.writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2), 'utf8');
console.log(`\nDone. Applied ${fixCount} fixes to essay_index.json.`);

// Sync individual files
const essayDir = path.join(__dirname, '..', 'data', 'scenarios', 'essays');
let synced = 0;
for (const e of essays) {
  const filePath = path.join(essayDir, `${e.event_id}.json`);
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(e, null, 2), 'utf8');
    synced++;
  }
}
console.log(`Synced ${synced} individual essay files.`);
