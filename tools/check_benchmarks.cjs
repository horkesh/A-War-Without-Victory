const fs = require('fs');
const dir = process.argv[2];
const weekly = fs.readFileSync(`${dir}/weekly_report.jsonl`, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const total = 744;
const w20 = weekly.find(r => r.week_index === 20);
const w40 = weekly[weekly.length - 1];

const rsW20 = (w20.control_counts?.RS || 0) / total;
const rsW40 = (w40.control_counts?.RS || 0) / total;
const rbihW40 = (w40.control_counts?.RBiH || 0) / total;

const rsPeak = Math.max(...weekly.map(w => w.control_counts?.RS || 0));
const rsFinal = w40.control_counts?.RS || 0;
const rsDelta = rsFinal - rsPeak;
const peakWeek = weekly.find(w => (w.control_counts?.RS || 0) === rsPeak)?.week_index;

// Enclaves: check if majority of OSIDs in municipality are non-RS at w40
const final = JSON.parse(fs.readFileSync(`${dir}/final_save.json`, 'utf8'));
const pc = final.political.political_controllers;
const enclaves = ['srebrenica', 'gorazde', 'bihac', 'zepa'];
const alive = enclaves.filter(e => {
    const osids = Object.keys(pc).filter(k => k.includes(':' + e + ':'));
    const nonRS = osids.filter(k => pc[k] !== 'RS').length;
    return nonRS > osids.length / 2;
});

console.log('RS w20:  ', rsW20.toFixed(3), rsW20 >= 0.54 ? 'PASS' : 'FAIL', '(>=0.54)');
console.log('RS w40:  ', rsW40.toFixed(3), rsW40 >= 0.503 && rsW40 <= 0.60 ? 'PASS' : 'FAIL', '(0.503-0.60)');
console.log('RBiH w40:', rbihW40.toFixed(3), rbihW40 >= 0.25 ? 'PASS' : 'FAIL', '(>=0.25)');
console.log('RS delta:', rsDelta, rsDelta <= -10 ? 'PASS' : 'FAIL', '(<=-10)');
console.log('RS peak: ', 'w' + peakWeek, peakWeek <= 25 ? 'PASS' : 'FAIL', '(<=w25)');
console.log('Enclaves:', alive.length + '/4', alive.length >= 3 ? 'PASS' : 'FAIL', '(>=3)', alive);
