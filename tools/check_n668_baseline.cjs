const s = require('../runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n668/final_save.json');
const sectors = s.military.corps_front_sectors;

let total = 0;
const hist = {};
const eHist = {};
for (const sec of Object.values(sectors)) {
  total++;
  const bc = sec.assigned_brigade_ids.length + sec.reserve_brigade_ids.length;
  hist[bc] = (hist[bc] || 0) + 1;
  const e = sec.edge_ids.length;
  const bucket = e<=2?'1-2':e<=5?'3-5':e<=10?'6-10':e<=15?'11-15':e<=25?'16-25':'25+';
  eHist[bucket] = (eHist[bucket] || 0) + 1;
}
console.log('n668 baseline:');
console.log('Total sectors:', total);
console.log('Brigade histogram:');
for (const k of Object.keys(hist).sort((a,b) => +a - +b)) console.log('  ' + k + ' brigades: ' + hist[k] + ' sectors');
console.log('Edge histogram:');
for (const b of ['1-2','3-5','6-10','11-15','16-25','25+']) if (eHist[b]) console.log('  ' + b + ' edges: ' + eHist[b] + ' sectors');

// Count small sectors
let small = 0;
for (const sec of Object.values(sectors)) {
  if (sec.edge_ids.length <= 2) small++;
}
console.log('\nSmall sectors (<=2 edges):', small);
