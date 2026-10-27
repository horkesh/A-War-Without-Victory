/** Creation defaults shared with the existing v9/v38 legacy migration policies. */
import type {MilitiaPoolState} from './game_state.js';
import {canonicalizePoliticalSideId} from './identity.js';

export function initializeMilitiaPoolLifecycleDefaults(pool:MilitiaPoolState):void {
    if (pool.faction !== null && typeof pool.faction === 'string') pool.faction = canonicalizePoliticalSideId(pool.faction);
    if (typeof pool.fatigue !== 'number' || !Number.isInteger(pool.fatigue) || pool.fatigue < 0) pool.fatigue = 0;
}
export function initializeMilitiaPoolWoundedDefault(pool:MilitiaPoolState):void {
    if (typeof pool.wounded_pending !== 'number' || !Number.isFinite(pool.wounded_pending)) pool.wounded_pending = 0;
}
export function initializeMilitiaPoolDefaults(pool:MilitiaPoolState):void {
    initializeMilitiaPoolLifecycleDefaults(pool);
    initializeMilitiaPoolWoundedDefault(pool);
}
