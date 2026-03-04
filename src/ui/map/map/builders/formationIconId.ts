export function formationIconId(kind: string, faction: string, posture?: string): string {
  const normalizedKind = (kind || 'unit').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const normalizedFaction = (faction || 'unknown').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (posture) {
    const normalizedPosture = posture.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `${normalizedKind}__${normalizedFaction}__${normalizedPosture}`;
  }
  return `${normalizedKind}__${normalizedFaction}`;
}
