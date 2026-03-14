const s = require('../runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n682/final_save.json');
const sectors = s.military.corps_front_sectors;

let total = 0, ftSplit = 0;
const corpsFtSplit = {};
const ftSplitSectors = [];
for (const [sid, sec] of Object.entries(sectors)) {
  total++;
  const isFt = sec.sub_segments.some(ss => ss.sub_segment_id.includes('ftsplit'));
  if (isFt) {
    ftSplit++;
    const corps = sec.corps_id;
    corpsFtSplit[corps] = (corpsFtSplit[corps] || 0) + 1;
    ftSplitSectors.push({ sid, edges: sec.edge_ids.length, corps });
  }
}
console.log('Total sectors:', total);
console.log('ftsplit sectors:', ftSplit, '(extra sectors from strict Case B split)');
console.log('\nBy corps:');
for (const [c, n] of Object.entries(corpsFtSplit).sort()) {
  console.log('  ' + c + ': ' + n + ' ftsplit sectors');
}
console.log('\nSmall ftsplit sectors (<=2 edges):');
for (const s of ftSplitSectors.filter(s => s.edges <= 2)) {
  console.log('  ' + s.sid + ': ' + s.edges + ' edges (' + s.corps + ')');
}
console.log('\nFtsplit size distribution:');
const hist = {};
for (const s of ftSplitSectors) {
  hist[s.edges] = (hist[s.edges] || 0) + 1;
}
for (const k of Object.keys(hist).sort((a,b) => +a - +b)) {
  console.log('  ' + k + ' edges: ' + hist[k] + ' sectors');
}
