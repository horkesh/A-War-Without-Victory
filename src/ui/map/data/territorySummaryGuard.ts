/**
 * Turn-0 territory summaries describe scenario-start control provenance, not
 * post-start campaign movement. UI surfaces may still read the summary for other
 * events, but must not narrate turn-0 territory_net as ground taken or lost.
 */
export function shouldNarrateTerritorySummary(summary: { turn?: unknown } | null | undefined): boolean {
  return summary?.turn !== 0;
}
