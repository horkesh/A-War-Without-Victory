/**
 * Phase H1.9: Noop vs baseline_ops comparator (conclusion + markdown).
 * Reuses CompareResult shape; ops-specific conclusion text only.
 */

import type { CompareResult } from './scenario_probe_compare.js';

function sameDeltas(d: CompareResult['deltas']): boolean {
  const sameFlips = d.control_total_flips.baseline === d.control_total_flips.probe;
  const sameExhaustion =
    JSON.stringify(d.exhaustion_end.baseline) === JSON.stringify(d.exhaustion_end.probe);
  const sameSupply =
    JSON.stringify(d.supply_pressure_end.baseline) === JSON.stringify(d.supply_pressure_end.probe);
  const sameDisp = d.displacement_end.baseline === d.displacement_end.probe;
  return sameFlips && sameExhaustion && sameSupply && sameDisp;
}

/** Build ops-specific conclusion: measurable degradation vs not. */
export function buildOpsCompareConclusion(d: CompareResult['deltas']): string[] {
  if (sameDeltas(d)) {
    return [
      'Baseline ops does not introduce measurable degradation; noop and baseline_ops runs are identical on key outputs.'
    ];
  }
  const lines: string[] = ['Baseline ops introduces measurable degradation (exhaustion and/or displacement increased).'];
  if (d.control_total_flips.baseline !== d.control_total_flips.probe) {
    lines.push(
      `Control total flips: baseline=${d.control_total_flips.baseline}, ops=${d.control_total_flips.probe}`
    );
  }
  if (JSON.stringify(d.exhaustion_end.baseline) !== JSON.stringify(d.exhaustion_end.probe)) {
    lines.push(
      `Exhaustion end: baseline=${JSON.stringify(d.exhaustion_end.baseline)}, ops=${JSON.stringify(d.exhaustion_end.probe)}`
    );
  }
  if (JSON.stringify(d.supply_pressure_end.baseline) !== JSON.stringify(d.supply_pressure_end.probe)) {
    lines.push(
      `Supply pressure end: baseline=${JSON.stringify(d.supply_pressure_end.baseline)}, ops=${JSON.stringify(d.supply_pressure_end.probe)}`
    );
  }
  if (d.displacement_end.baseline !== d.displacement_end.probe) {
    lines.push(
      `Displacement end (settlement count): baseline=${d.displacement_end.baseline}, ops=${d.displacement_end.probe}`
    );
  }
  return lines;
}

/** Human-readable ops compare markdown. No timestamps. */
export function formatOpsCompareMarkdown(result: CompareResult): string {
  const lines: string[] = [
    '# Ops compare report',
    '',
    `- Noop scenario: noop_52w`,
    `- Ops scenario: baseline_ops_52w`,
    `- Weeks: ${result.weeks}`,
    `- Noop run_id: ${result.run_ids.baseline}`,
    `- Ops run_id: ${result.run_ids.probe}`,
    '',
    '## Deltas',
    '',
    `- Control total flips: noop=${result.deltas.control_total_flips.baseline}, ops=${result.deltas.control_total_flips.probe}`,
    `- Exhaustion end: noop=${JSON.stringify(result.deltas.exhaustion_end.baseline)}, ops=${JSON.stringify(result.deltas.exhaustion_end.probe)}`,
    `- Supply pressure end: noop=${JSON.stringify(result.deltas.supply_pressure_end.baseline)}, ops=${JSON.stringify(result.deltas.supply_pressure_end.probe)}`,
    `- Displacement end (settlement count): noop=${result.deltas.displacement_end.baseline}, ops=${result.deltas.displacement_end.probe}`,
    `- Activity max: noop front=${result.deltas.activity_max.baseline.front} edges=${result.deltas.activity_max.baseline.edges} disp=${result.deltas.activity_max.baseline.disp}, ops front=${result.deltas.activity_max.probe.front} edges=${result.deltas.activity_max.probe.edges} disp=${result.deltas.activity_max.probe.disp}`,
    '',
    '## Conclusion',
    '',
    ...result.conclusion.map((c) => `- ${c}`),
    ''
  ];
  return lines.join('\n');
}
