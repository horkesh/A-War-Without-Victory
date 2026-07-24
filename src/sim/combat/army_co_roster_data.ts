import rosterJson from '../../../data/scenarios/army_co_roster.json';

import type { ArmyCoRoster } from './army_co_lifecycle.js';

/** Canonical roster bundled for browser and Node simulation runtimes. */
export const CANONICAL_ARMY_CO_ROSTER = rosterJson as ArmyCoRoster;
