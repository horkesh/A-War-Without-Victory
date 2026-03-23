/**
 * Round 2 QA Fixes — Apply all Round 1 findings to essay_index.json
 * Run: node tools/apply_essay_qa_fixes.cjs
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
    console.log(`[${index}] ${e.event_id}: WARNING — fix did not change content: ${description}`);
  }
}

// === BATCH A (48-55) ===

// [48] Tunnel: "four months" → "approximately six months"
fix(48, '"four months" → "approximately six months"', (e) => {
  e.content = e.content.replace(
    'After approximately four months of construction',
    'After approximately six months of construction'
  );
});

// [49] Lukavac: "15,000 troops" → hedge
fix(49, 'Hedge "15,000 troops" → "thousands of troops"', (e) => {
  e.content = e.content.replace(
    /estimated at around 15,000 troops/i,
    'comprising thousands of troops'
  );
});

// [50] Maglaj: "100,000 people" → realistic figure + remove Prlić misattribution
fix(50, 'Fix inflated population and Prlić misattribution', (e) => {
  e.content = e.content.replace(
    /approximately 100,000 people/i,
    'tens of thousands of people'
  );
  // Remove specific Prlić attribution for Maglaj joint actions (outside Prlić geographic scope)
  e.content = e.content.replace(
    /the tribunal documented how HVO forces in the region actively cooperated with VRS units in maintaining the siege/i,
    'HVO forces in the region cooperated with VRS units in maintaining the siege'
  );
});

// === BATCH B (56-63) ===

// [56] Markale 1994: clarify attribution — ICTY Galić found SRK responsible
fix(56, 'Strengthen ICTY attribution framing', (e) => {
  e.content = e.content.replace(
    'the investigation could not definitively determine the exact firing position',
    'the initial investigation could not definitively determine the exact firing position, though the ICTY subsequently found the SRK responsible for the shelling as part of a broader campaign of terror'
  );
});

// [57] NATO Ultimatum: "ten days" → fix arithmetic
fix(57, '"within ten days" → consistent with 20 February deadline', (e) => {
  e.content = e.content.replace(/within ten days/i, 'by 20 February');
});

// [58] Banja Luka: "forty-five-year" → "nearly forty-five-year"
fix(58, '"forty-five-year" → "nearly forty-five-year"', (e) => {
  e.content = e.content.replace(
    "NATO's forty-five-year history",
    "NATO's nearly forty-five-year history"
  );
  // Also try alternate phrasing
  e.content = e.content.replace(
    'in NATO\'s forty-five-year history',
    'in NATO\'s nearly forty-five-year history'
  );
});

// [59] Washington Agreement: "signed on 1 March" → "signed on 18 March"
fix(59, 'Fix Washington Agreement signing date 1 March → 18 March', (e) => {
  e.content = e.content.replace(
    /signed on 1 March 1994/i,
    'signed on 18 March 1994'
  );
  // Fix sources metadata too
  e.sources = e.sources.map(s =>
    s.includes('1 March 1994') ? s.replace('1 March 1994', '18 March 1994') : s
  );
});

// === BATCH C-redo (64-71) ===

// [65] COHA expires: "late April" → "1 May"
fix(65, '"expired in late April" → "expired on 1 May"', (e) => {
  e.content = e.content.replace(
    /expired in late April 1995/i,
    'expired on 1 May 1995'
  );
  // Also try other phrasings
  e.content = e.content.replace(
    /in late April 1995/i,
    'on 1 May 1995'
  );
});

// [66] Op Flash: Add Gotovina acquittal note
fix(66, 'Add Gotovina acquittal on appeal note', (e) => {
  // Find the Gotovina trial judgment reference and add acquittal context
  e.content = e.content.replace(
    /Gotovina et al\. Trial Judgment \(IT-06-90-T\)/,
    'Gotovina et al. case (IT-06-90-T), noting that the Trial Chamber convictions of Gotovina and Markač were reversed on appeal in November 2012'
  );
});

// [67] Tuzla Gate: "General" → "Colonel"
fix(67, 'Djukic rank: General → Colonel', (e) => {
  e.content = e.content.replace(/General Novak Dj/i, 'Colonel Novak Dj');
  e.content = e.content.replace(/General Novak Đ/i, 'Colonel Novak Đ');
});

// [69] RRF: Soften Dutch role
fix(69, 'Soften Dutch role in RRF composition', (e) => {
  e.content = e.content.replace(
    /British, French, and Dutch troops/i,
    'British and French troops, with support from other contributing nations'
  );
  // Remove specific Dutch logistics mention if present
  e.content = e.content.replace(
    /Dutch logistics and support elements/i,
    'additional support elements from contributing nations'
  );
});

// === BATCH D-redo (72-79) ===

// [73] Second Markale: Add Dragomir Milošević as SRK commander
fix(73, 'Add Dragomir Milošević as 1995 SRK commander', (e) => {
  // Add context that by 1995, Dragomir Milošević commanded the SRK
  e.content = e.content.replace(
    /Sarajevo-Romanija Corps/,
    'Sarajevo-Romanija Corps, by then commanded by General Dragomir Milošević (whose own case, IT-98-29/1-T, would address this period of the siege)'
  );
});

// [78] Exclusion zone: same "ten days" issue as [57]
fix(78, '"ten days" arithmetic fix', (e) => {
  // Try to fix the specific inconsistency
  e.content = e.content.replace(/within ten days/i, 'by 20 February');
  // If there's a "giving the VRS ten days" variant
  e.content = e.content.replace(/giving .* ten days/i, (match) =>
    match.replace('ten days', 'until 20 February')
  );
});

// === BATCH E (80-87) ===

// [80] Bihac offensive: "Grabez plateau" → "Grmeč mountain range"
fix(80, '"Grabez plateau" → "Grmeč mountain range" + hedge territory figure', (e) => {
  e.content = e.content.replace(/Grabez plateau/gi, 'Grmeč mountain range');
  e.content = e.content.replace(/capturing the plateau/gi, 'capturing key positions');
  e.content = e.content.replace(
    /Over one hundred square kilometres of territory changed hands in a matter of days/i,
    'Significant territory changed hands in a matter of days'
  );
});

// [81] Op Cincar: hedge date
fix(81, 'Hedge Kupres capture date', (e) => {
  e.content = e.content.replace(
    /Kupres fell on 3 November 1994/i,
    'Kupres fell in early November 1994'
  );
});

// [82] Carter ceasefire: Fix source + itinerary
fix(82, 'Fix wrong source (UNSCR 981) + Carter itinerary', (e) => {
  // Fix source
  e.sources = e.sources.map(s =>
    s.includes('UNSCR 981') || s.includes('981')
      ? 'ICTY Karadžić Trial Judgment (IT-95-5/18-T)'
      : s
  );
  // Fix Carter itinerary — he visited Pale first
  e.content = e.content.replace(
    /Carter arrived in Sarajevo on 19 December 1994/i,
    'Carter arrived in Bosnia on 18 December 1994, visiting Pale first to meet Karadžić before traveling to Sarajevo'
  );
});

// [83] Op Summer 95: Hedge day-precise dates and territory figure
fix(83, 'Hedge dates and territory figure', (e) => {
  e.content = e.content.replace(
    /Grahovo fell on 28 July\. Glamo[čc] followed on 29 July/i,
    'Grahovo and Glamoč fell in rapid succession in late July'
  );
  e.content = e.content.replace(
    /approximately 1,600 square kil[io]met[er]+s of territory had changed hands/i,
    'a vast swath of territory had changed hands'
  );
  // Try alternate phrasing
  e.content = e.content.replace(
    /1,600 square kil[io]met/i,
    'hundreds of square kilomet'
  );
});

// [84] Karadzic-Mladic split: Hedge dates
fix(84, 'Hedge dismissal/rescission dates', (e) => {
  e.content = e.content.replace(
    /On 4 August 1995/i,
    'In early August 1995'
  );
  e.content = e.content.replace(
    /On 11 August,? Karadži[ćc] was compelled to rescind/i,
    'Within days, Karadžić was compelled to rescind'
  );
  // Try alternate patterns
  e.content = e.content.replace(
    /On 11 August/i,
    'Within days'
  );
});

// [85] Op Mistral 2: Hedge territory/duration figure
fix(85, 'Hedge territory and duration figures', (e) => {
  e.content = e.content.replace(
    /approximately 2,000 square kil[io]met[er]+s in eight days/i,
    'vast stretches of western Bosnia within days'
  );
  // Try alternate
  e.content = e.content.replace(
    /2,000 square kil[io]met/i,
    'thousands of square kilomet'
  );
});

// [86] Op Sana: Fix date + subtitle + remove hyperbole
fix(86, 'Fix Sanski Most date + subtitle + hyperbole', (e) => {
  e.content = e.content.replace(
    /On 12 October,? Sanski Most/i,
    'On 11 October, Sanski Most'
  );
  // Fix Ključ date too
  e.content = e.content.replace(
    /On 10 October,? the strategically important town of Klju[čc]/i,
    'In mid-October, the strategically important town of Ključ'
  );
  // Remove hyperbolic claim
  e.content = e.content.replace(
    /more territory in three weeks than the ARBiH had gained in the previous three years combined/i,
    'more territory in three weeks than in any previous ARBiH campaign'
  );
});

// [87] US halts advance: Improve sourcing
fix(87, 'Add better source for Holbrooke halt', (e) => {
  if (!e.sources.some(s => s.includes('Karadžić') || s.includes('IT-95-5/18'))) {
    e.sources.push('ICTY Karadžić Trial Judgment (IT-95-5/18-T)');
  }
});

// === BATCH F (88-93) ===

// [89] NATO air strike threat: Akashi → fix to correct official
fix(89, 'Remove anachronistic Akashi reference (not SRSG until Jan 1994)', (e) => {
  e.content = e.content.replace(
    /Special Representative Yasushi Akashi/i,
    'senior UNPROFOR officials'
  );
  // If there's a more specific mention
  e.content = e.content.replace(
    /including Special Representative Yasushi Akashi,? /i,
    ''
  );
});

// [92] Abdic-Karadzic pact: hedge specific date
fix(92, 'Hedge pact signing date', (e) => {
  e.content = e.content.replace(
    /on 22 October 1993/i,
    'in October 1993'
  );
});

// [93] Stupni Do: Fix casualty count
fix(93, 'Fix Stupni Do casualties: 31 → at least 37 (per ICTY Rajić)', (e) => {
  e.content = e.content.replace(
    /approximately thirty-one Bosniak civilians/i,
    'at least thirty-seven Bosniak civilians'
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
