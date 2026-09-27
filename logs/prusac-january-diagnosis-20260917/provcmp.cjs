const fs=require('fs');
function prov(p){const m=JSON.parse(fs.readFileSync(p+'/run_meta.json','utf8'));return {run_id:m.run_id,weeks:m.weeks,...m.provenance};}
const rows=process.argv.slice(2).map(p=>({label:p.split(/[\/]/).pop(),...prov(p)}));
const keys=['run_id','weeks','git_commit','git_dirty','node_version','harness','collapse_enabled','schema_version'];
for(const k of keys) console.log(k.padEnd(16), rows.map(r=>String(r[k])).join('  |  '));
console.log('digest'.padEnd(16), rows.map(r=>r.consumed_inputs.digest.slice(0,16)).join('  |  '));
console.log('input_count'.padEnd(16), rows.map(r=>r.consumed_inputs.files.length).join('  |  '));
// per-file comparison vs first
const base=rows[0].consumed_inputs.files;
for(let i=1;i<rows.length;i++){
  const other=new Map(rows[i].consumed_inputs.files.map(f=>[f.path,f.sha256]));
  const diffs=base.filter(f=>other.get(f.path)!==f.sha256);
  console.log('inputs differing ['+rows[0].label+' vs '+rows[i].label+']:', diffs.length, diffs.map(d=>d.path).join(', ')||'(none)');
}
