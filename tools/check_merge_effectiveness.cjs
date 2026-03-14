const s = require('../data/derived/latest_run_final_save.json');
const sectors = s.military.corps_front_sectors;

let total = 0, merged = 0, ftsplit = 0;
const smallSectors = [];
for (const [sid, sec] of Object.entries(sectors)) {
  total++;
  if (sec.sub_segments.some(ss => ss.sub_segment_id.includes('merged'))) merged++;
  if (sec.sub_segments.some(ss => ss.sub_segment_id.includes('ftsplit'))) ftsplit++;
  if (sec.edge_ids.length <= 2) {
    smallSectors.push({
      sid,
      edges: sec.edge_ids.length,
      brigades: sec.assigned_brigade_ids.length + sec.reserve_brigade_ids.length,
      corps: sec.corps_id,
      isFt: sec.sub_segments.some(ss => ss.sub_segment_id.includes('ftsplit')),
      isMerged: sec.sub_segments.some(ss => ss.sub_segment_id.includes('merged')),
    });
  }
}
console.log('Total:', total, 'merged:', merged, 'ftsplit:', ftsplit);
console.log('\n' + smallSectors.length + ' sectors with <=2 edges:');
for (const s of smallSectors.sort((a,b) => a.corps.localeCompare(b.corps))) {
  console.log('  ' + s.sid + ' (' + s.corps + '): ' + s.edges + 'e, ' + s.brigades + 'b' +
    (s.isFt ? ' [ftsplit]' : '') + (s.isMerged ? ' [merged]' : ''));
}
