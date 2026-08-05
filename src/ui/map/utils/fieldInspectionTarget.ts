export interface FieldOperationPlanTarget {
  kind: 'field-operation-plan';
  proposalId: string;
  corpsId: string;
  objectiveOsids: string[];
  stagingOsids: string[];
  formationIds: string[];
}

export type FieldInspectionTarget =
  | { kind: 'field-settlement'; osid: string }
  | { kind: 'field-sector'; sectorId: string; osid?: string | null }
  | { kind: 'field-sector-in-corps'; sectorId: string; corpsId: string; osid?: string | null }
  | { kind: 'field-formation'; formationId: string }
  | { kind: 'field-formation-at-settlement'; formationId: string; osid: string }
  | { kind: 'field-formation-in-sector'; formationId: string; sectorId: string; corpsId?: string | null; osid?: string | null }
  | { kind: 'field-formation-in-corps'; formationId: string; corpsId: string; osid?: string | null }
  | { kind: 'field-formation-in-army-reserve'; formationId: string; armyHqId: string; osid?: string | null }
  | { kind: 'field-operation'; operationKey: string }
  | FieldOperationPlanTarget;
