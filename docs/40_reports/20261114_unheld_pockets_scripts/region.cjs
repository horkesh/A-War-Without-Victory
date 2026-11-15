const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const MUNS = new Set((process.argv[3] || 'banja_luka,kotor_varos,skender_vakuf,teslic,celinac,prnjavor,laktasi,mrkonjic_grad,jajce,sipovo,donji_vakuf,kljuc,sanski_most,prijedor,bosanski_novi,bosanska_krupa,bosanski_petrovac,bihac,cazin,velika_kladusa,srbac,bosanska_gradiska,doboj,tesanj,maglaj,zepce').split(','));
for (const h of d.hist) {
  if (!h.municipalities.some((m) => MUNS.has(m))) continue;
  if (h.osids.length > 25) continue;
  const fates = h.fates.map((f) => f.osid.split(':').slice(1).join(':') + '[' + f.init + '->' + (f.next_event ? f.next_event.to + '@t' + f.next_event.turn + ':' + f.next_event.mechanism : 'none') + ' final ' + f.final + ']').join(' ');
  console.log(h.faction, 't' + h.first_turn + '-t' + h.last_turn, 'unheld', h.turns_unheld, 'held', h.turns_held, 'eng', h.engine_flag_turns, 'by', h.borderers.join('/'), 'own', h.own_ids.join(',') || '-', '|', fates);
}
