import { strictCompare } from '../../../state/validateGameState.js';
import { getOsidDisplayName } from './osidDisplayName';

export interface ObjectiveTargetOption {
  osid: string;
  label: string;
  display: string;
}

export function buildObjectiveTargetOptions(
  controlBySettlement: Record<string, string | null> | undefined,
  osidDisplayNames: Record<string, string> | null,
): ObjectiveTargetOption[] {
  const ids = new Set<string>();
  for (const osid of Object.keys(controlBySettlement ?? {})) ids.add(osid);
  for (const osid of Object.keys(osidDisplayNames ?? {})) ids.add(osid);

  const options = [...ids].map((osid) => {
    const label = getOsidDisplayName(osid, osidDisplayNames);
    return { osid, label, display: label };
  });
  const labelCounts = new Map<string, number>();
  for (const option of options) {
    labelCounts.set(option.label, (labelCounts.get(option.label) ?? 0) + 1);
  }

  return options
    .map((option) => ({
      ...option,
      display: (labelCounts.get(option.label) ?? 0) > 1 ? `${option.label} (${option.osid})` : option.label,
    }))
    .sort((a, b) => strictCompare(a.label, b.label) || strictCompare(a.osid, b.osid));
}
