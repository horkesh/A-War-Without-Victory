type FrontEdgeLike = {
  edge_id?: string | null;
  a?: string | null;
  b?: string | null;
  side_a?: string | null;
  side_b?: string | null;
};

export function deriveWarFrontVisibleEnemyOsids(
  playerFaction: string | null | undefined,
  frontEdgesOsid: readonly FrontEdgeLike[] | null | undefined,
): string[] {
  if (!playerFaction || !frontEdgesOsid || frontEdgesOsid.length === 0) return [];

  const visibleEnemyOsids = new Set<string>();
  for (const edge of frontEdgesOsid) {
    const a = typeof edge.a === 'string' ? edge.a : '';
    const b = typeof edge.b === 'string' ? edge.b : '';
    const sideA = typeof edge.side_a === 'string' ? edge.side_a : null;
    const sideB = typeof edge.side_b === 'string' ? edge.side_b : null;
    if (sideA === playerFaction && b) visibleEnemyOsids.add(b);
    if (sideB === playerFaction && a) visibleEnemyOsids.add(a);
  }
  return [...visibleEnemyOsids].sort((a, b) => a.localeCompare(b));
}
