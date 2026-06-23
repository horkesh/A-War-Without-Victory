import type { FormationView } from '../data/types';
import { isFieldedTacticalFormation } from '../../shared/playerVisibility';

/**
 * Formations at a given OSID (location or AoR).
 */
export function getFormationsAtOsid(
  formations: FormationView[] | undefined,
  osid: string
): FormationView[] {
  if (!formations) return [];
  return formations.filter(
    (f) => isFieldedTacticalFormation(f) && (f.location_osid === osid || f.aorSettlementIds?.includes(osid))
  );
}
