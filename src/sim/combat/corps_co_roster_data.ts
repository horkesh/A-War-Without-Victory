import rosterJson from '../../../data/scenarios/corps_co_roster.json';

import { validateCorpsCoRoster, type CorpsCoRoster } from './corps_co_roster.js';

/**
 * Canonical corps commander schedule bundled for browser and Node simulation runtimes
 * (the same pattern as army_co_roster_data.ts). Validated at module load so a malformed
 * schedule fails loudly instead of running half-applied.
 */
export const CANONICAL_CORPS_CO_ROSTER: CorpsCoRoster = validateCorpsCoRoster(rosterJson);
