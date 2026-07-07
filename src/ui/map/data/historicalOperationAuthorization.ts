export interface HistoricalOperationAuthorizationView {
  kind: 'preplanned' | 'triggered' | 'army_hq';
  corpsId: string;
  operationName: string;
}

export function parseHistoricalOperationAuthorizationAction(
  action: string | null | undefined,
): HistoricalOperationAuthorizationView | null {
  const prefix = 'HISTORICAL_OP:';
  if (typeof action !== 'string' || !action.startsWith(prefix)) return null;
  const parts = action.slice(prefix.length).split(':');
  const kind = parts[0];
  const corpsId = parts[1];
  const operationName = parts.slice(2).join(':').trim();
  if (
    (kind !== 'preplanned' && kind !== 'triggered' && kind !== 'army_hq')
    || !corpsId
    || !operationName
  ) {
    return null;
  }
  return { kind, corpsId, operationName };
}
