export type FieldInspectionTarget =
  | { kind: 'field-settlement'; osid: string }
  | { kind: 'field-sector'; sectorId: string; osid?: string | null }
  | { kind: 'field-sector-in-corps'; sectorId: string; corpsId: string }
  | { kind: 'field-formation'; formationId: string }
  | { kind: 'field-formation-at-settlement'; formationId: string; osid: string }
  | { kind: 'field-formation-in-sector'; formationId: string; sectorId: string }
  | { kind: 'field-formation-in-corps'; formationId: string; corpsId: string }
  | { kind: 'field-formation-in-army-reserve'; formationId: string; armyHqId: string }
  | { kind: 'field-operation'; operationKey: string };
