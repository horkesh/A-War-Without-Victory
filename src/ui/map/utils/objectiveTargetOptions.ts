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
  // `controlBySettlement` is the post-`buildControlLookup` map, which injects
  // `S<census>` compatibility-alias keys alongside the canonical OSID-set keys.
  // Those aliases are colon-free duplicates of a real `mun:census` entry and must
  // not surface as bogus picker rows (e.g. a phantom "Sbanja_luka"). Canonical
  // OSID-set keys always contain a ':'. We therefore keep a control key only when
  // it is a canonical OSID (contains ':') OR it is independently known to the
  // display-name map (the authoritative OSID-set), which never holds aliases.
  const displayNameKeys = new Set(Object.keys(osidDisplayNames ?? {}));
  for (const osid of Object.keys(controlBySettlement ?? {})) {
    if (osid.includes(':') || displayNameKeys.has(osid)) ids.add(osid);
  }
  for (const osid of displayNameKeys) ids.add(osid);

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
