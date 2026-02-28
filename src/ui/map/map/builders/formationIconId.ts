export function formationIconId(kind: string, faction: string): string {
  const normalizedKind = (kind || 'unit').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const normalizedFaction = (faction || 'unknown').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return `${normalizedKind}__${normalizedFaction}`;
}
