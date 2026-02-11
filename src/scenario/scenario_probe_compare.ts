/**
 * Phase H1.8: Baseline vs probe comparator (pure compare helpers).
 * No timestamps; deterministic conclusion from run artifacts.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface CompareResult {
  scenario_id: string;
  weeks: number;
  run_ids: { baseline: string; probe: string };
  deltas: {
    control_total_flips: { baseline: number; probe: number };
    exhaustion_end: { baseline: Record<string, number>; probe: Record<string, number> };
    supply_pressure_end: { baseline: Record<string, number>; probe: Record<string, number> };
    displacement_end: { baseline: number; probe: number };
    activity_max: {
      baseline: { front: number; edges: number; disp: number };
      probe: { front: number; edges: number; disp: number };
    };
  };
  conclusion: string[];
}

function recordFromFactionKeys(
  obj: Record<string, number> | undefined
): Record<string, number> {
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, number> = {};
  for (const k of Object.keys(obj).sort()) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/** Count settlements with settlement_displacement > 0 from final state. */
function displacementCount(state: { settlement_displacement?: Record<string, number> }): number {
  const sd = state.settlement_displacement ?? {};
  let n = 0;
  for (const v of Object.values(sd)) {
    if (typeof v === 'number' && v > 0) n += 1;
  }
  return n;
}

/**
 * Load and compare two run directories; build CompareResult.
 * Deterministic; no timestamps.
 */
export async function buildCompareResult(
  baselineRunDir: string,
  probeRunDir: string,
  scenario_id: string,
  weeks: number,
  baselineRunId: string,
  probeRunId: string
): Promise<CompareResult> {
  const [controlBaseline, controlProbe, activityBaseline, activityProbe, finalBaseline, finalProbe] =
    await Promise.all([
      readFile(join(baselineRunDir, 'control_delta.json'), 'utf8').then((t) =>
        JSON.parse(t) as { total_flips: number }
      ),
      readFile(join(probeRunDir, 'control_delta.json'), 'utf8').then((t) =>
        JSON.parse(t) as { total_flips: number }
      ),
      readFile(join(baselineRunDir, 'activity_summary.json'), 'utf8').then((t) =>
        JSON.parse(t) as {
          metrics: {
            front_active_set_size: { max: number };
            pressure_eligible_size: { max: number };
            displacement_trigger_eligible_size: { max: number };
          };
        }
      ),
      readFile(join(probeRunDir, 'activity_summary.json'), 'utf8').then((t) =>
        JSON.parse(t) as {
          metrics: {
            front_active_set_size: { max: number };
            pressure_eligible_size: { max: number };
            displacement_trigger_eligible_size: { max: number };
          };
        }
      ),
      readFile(join(baselineRunDir, 'final_save.json'), 'utf8').then((t) =>
        JSON.parse(t) as {
          phase_ii_exhaustion?: Record<string, number>;
          phase_ii_supply_pressure?: Record<string, number>;
          settlement_displacement?: Record<string, number>;
        }
      ),
      readFile(join(probeRunDir, 'final_save.json'), 'utf8').then((t) =>
        JSON.parse(t) as {
          phase_ii_exhaustion?: Record<string, number>;
          phase_ii_supply_pressure?: Record<string, number>;
          settlement_displacement?: Record<string, number>;
        }
      )
    ]);

  const exhaustionBaseline = recordFromFactionKeys(finalBaseline.phase_ii_exhaustion);
  const exhaustionProbe = recordFromFactionKeys(finalProbe.phase_ii_exhaustion);
  const supplyBaseline = recordFromFactionKeys(finalBaseline.phase_ii_supply_pressure);
  const supplyProbe = recordFromFactionKeys(finalProbe.phase_ii_supply_pressure);
  const dispBaseline = displacementCount(finalBaseline);
  const dispProbe = displacementCount(finalProbe);

  const mB = activityBaseline.metrics;
  const mP = activityProbe.metrics;

  const conclusion = buildConclusion({
    control_total_flips: {
      baseline: controlBaseline.total_flips,
      probe: controlProbe.total_flips
    },
    exhaustion_end: { baseline: exhaustionBaseline, probe: exhaustionProbe },
    supply_pressure_end: { baseline: supplyBaseline, probe: supplyProbe },
    displacement_end: { baseline: dispBaseline, probe: dispProbe },
    activity_max: {
      baseline: {
        front: mB.front_active_set_size?.max ?? 0,
        edges: mB.pressure_eligible_size?.max ?? 0,
        disp: mB.displacement_trigger_eligible_size?.max ?? 0
      },
      probe: {
        front: mP.front_active_set_size?.max ?? 0,
        edges: mP.pressure_eligible_size?.max ?? 0,
        disp: mP.displacement_trigger_eligible_size?.max ?? 0
      }
    }
  });

  return {
    scenario_id,
    weeks,
    run_ids: { baseline: baselineRunId, probe: probeRunId },
    deltas: {
      control_total_flips: {
        baseline: controlBaseline.total_flips,
        probe: controlProbe.total_flips
      },
      exhaustion_end: { baseline: exhaustionBaseline, probe: exhaustionProbe },
      supply_pressure_end: { baseline: supplyBaseline, probe: supplyProbe },
      displacement_end: { baseline: dispBaseline, probe: dispProbe },
      activity_max: {
        baseline: {
          front: mB.front_active_set_size?.max ?? 0,
          edges: mB.pressure_eligible_size?.max ?? 0,
          disp: mB.displacement_trigger_eligible_size?.max ?? 0
        },
        probe: {
          front: mP.front_active_set_size?.max ?? 0,
          edges: mP.pressure_eligible_size?.max ?? 0,
          disp: mP.displacement_trigger_eligible_size?.max ?? 0
        }
      }
    },
    conclusion
  };
}

function buildConclusion(d: CompareResult['deltas']): string[] {
  const lines: string[] = [];
  const sameFlips = d.control_total_flips.baseline === d.control_total_flips.probe;
  const sameExhaustion =
    JSON.stringify(d.exhaustion_end.baseline) === JSON.stringify(d.exhaustion_end.probe);
  const sameSupply =
    JSON.stringify(d.supply_pressure_end.baseline) === JSON.stringify(d.supply_pressure_end.probe);
  const sameDisp = d.displacement_end.baseline === d.displacement_end.probe;
  const sameActivity =
    d.activity_max.baseline.front === d.activity_max.probe.front &&
    d.activity_max.baseline.edges === d.activity_max.probe.edges &&
    d.activity_max.baseline.disp === d.activity_max.probe.disp;

  if (sameFlips && sameExhaustion && sameSupply && sameDisp && sameActivity) {
    lines.push(
      'No downstream gate was toggled; no consequence pathway changed under probe. An operation/event generator (Phase G/Phase O) is required to produce consequence-driving events.'
    );
  } else {
    if (!sameFlips) {
      lines.push(
        `Control total flips differ: baseline=${d.control_total_flips.baseline}, probe=${d.control_total_flips.probe}`
      );
    }
    if (!sameExhaustion) {
      lines.push(
        `Exhaustion end differs: baseline=${JSON.stringify(d.exhaustion_end.baseline)}, probe=${JSON.stringify(d.exhaustion_end.probe)}`
      );
    }
    if (!sameSupply) {
      lines.push(
        `Supply pressure end differs: baseline=${JSON.stringify(d.supply_pressure_end.baseline)}, probe=${JSON.stringify(d.supply_pressure_end.probe)}`
      );
    }
    if (!sameDisp) {
      lines.push(
        `Displacement end (settlement count) differs: baseline=${d.displacement_end.baseline}, probe=${d.displacement_end.probe}`
      );
    }
    if (!sameActivity) {
      lines.push(
        `Activity max differs: baseline front=${d.activity_max.baseline.front} edges=${d.activity_max.baseline.edges} disp=${d.activity_max.baseline.disp}, probe front=${d.activity_max.probe.front} edges=${d.activity_max.probe.edges} disp=${d.activity_max.probe.disp}`
      );
    }
  }
  return lines;
}

/** Human-readable probe compare markdown. No timestamps. */
export function formatProbeCompareMarkdown(result: CompareResult): string {
  const lines: string[] = [
    '# Probe compare report',
    '',
    `- Scenario: ${result.scenario_id}`,
    `- Weeks: ${result.weeks}`,
    `- Baseline run_id: ${result.run_ids.baseline}`,
    `- Probe run_id: ${result.run_ids.probe}`,
    '',
    '## Deltas',
    '',
    `- Control total flips: baseline=${result.deltas.control_total_flips.baseline}, probe=${result.deltas.control_total_flips.probe}`,
    `- Exhaustion end: baseline=${JSON.stringify(result.deltas.exhaustion_end.baseline)}, probe=${JSON.stringify(result.deltas.exhaustion_end.probe)}`,
    `- Supply pressure end: baseline=${JSON.stringify(result.deltas.supply_pressure_end.baseline)}, probe=${JSON.stringify(result.deltas.supply_pressure_end.probe)}`,
    `- Displacement end (settlement count): baseline=${result.deltas.displacement_end.baseline}, probe=${result.deltas.displacement_end.probe}`,
    `- Activity max: baseline front=${result.deltas.activity_max.baseline.front} edges=${result.deltas.activity_max.baseline.edges} disp=${result.deltas.activity_max.baseline.disp}, probe front=${result.deltas.activity_max.probe.front} edges=${result.deltas.activity_max.probe.edges} disp=${result.deltas.activity_max.probe.disp}`,
    '',
    '## Conclusion',
    '',
    ...result.conclusion.map((c) => `- ${c}`),
    ''
  ];
  return lines.join('\n');
}
