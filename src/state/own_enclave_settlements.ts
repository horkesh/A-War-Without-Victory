/**
 * A9 (SD13): the one static own-enclave test shared by the pocket-fall step (P0-A, `pocket_fall.ts`) and the
 * negotiated-evacuation convoy (P1, `displacement.ts`). A settlement is one of side X's own enclave cells when it
 * belongs to a Ring 1 `ENCLAVE_DEFINITIONS` enclave whose faction is X. The enclave list itself lives only in
 * `enclave_resilience.ts`; this module adds no list, no constant and no place name.
 */

import { ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from '../sim/combat/enclave_resilience.js';
import type { FactionId } from './game_state.js';

/** Does M contain a settlement of one of `side`'s ENCLAVE_DEFINITIONS enclaves (optionally one id)? */
export function containsOwnEnclaveSettlement(osidsInMun: readonly string[], side: FactionId, enclaveId?: string): boolean {
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (enclave.faction !== side) continue;
        if (enclaveId !== undefined && enclave.id !== enclaveId) continue;
        if (osidsInMun.some((sid) => osidBelongsToEnclave(sid, enclave))) return true;
    }
    return false;
}

/** M's settlements that belong to one of `side`'s ENCLAVE_DEFINITIONS enclaves, in the input order. */
export function ownEnclaveSettlements(osidsInMun: readonly string[], side: FactionId): string[] {
    return osidsInMun.filter((sid) =>
        ENCLAVE_DEFINITIONS.some((enclave) => enclave.faction === side && osidBelongsToEnclave(sid, enclave))
    );
}
