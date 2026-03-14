const j = JSON.parse(require('fs').readFileSync('runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n684/run_summary.json', 'utf8'));
for (const r of j.bot_benchmark_evaluation.results) {
  if (r.passed === false) {
    console.log(r.faction, r.objective, 'actual=' + r.actual_control_share.toFixed(4), 'expected=' + r.expected_control_share, 'tol=' + r.tolerance, 'dev=' + r.deviation.toFixed(4));
  }
}
