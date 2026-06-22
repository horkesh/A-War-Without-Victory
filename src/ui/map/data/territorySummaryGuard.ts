type TerritorySummaryProvenance = {
  turn?: unknown;
  mechanism?: unknown;
  provenance?: unknown;
  source?: unknown;
  summary_kind?: unknown;
  kind?: unknown;
  is_setup?: unknown;
};

function isSetupMarker(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return value === 'setup'
    || value === 'setup_control'
    || value === 'scenario_start'
    || value === 'scenario-start'
    || value === 'initial_control'
    || value === 'initial-control';
}

/**
 * Setup-control summaries describe scenario-start control provenance, not
 * post-start campaign movement. UI surfaces may still read the summary for
 * other data, but must not narrate setup territory_net as ground taken or lost.
 */
export function shouldNarrateTerritorySummary(summary: TerritorySummaryProvenance | null | undefined): boolean {
  if (!summary) return true;
  if (summary.turn === 0) return false;
  return !(
    isSetupMarker(summary.is_setup)
    || isSetupMarker(summary.mechanism)
    || isSetupMarker(summary.provenance)
    || isSetupMarker(summary.source)
    || isSetupMarker(summary.summary_kind)
    || isSetupMarker(summary.kind)
  );
}
