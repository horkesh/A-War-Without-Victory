// Note: importing types from tools is messy in src. 
// Better to define a minimal interface here.

export interface MinimalBrigade {
    id: string;
    name: string;
    faction: string;
    home_mun: string;
    home_settlement?: string;
    kind?: string;
}

export interface SettlementRecord {
    name: string;
    mun_code: string;
}

export interface MunPopRecord {
    mun1990_id?: string;
}

export type OOBLookupFunctions = {
    nameLookup: (faction: string, mun_id: string, ordinal: number) => string | null;
    hqLookup: (faction: string, mun_id: string, ordinal: number) => string | null;
};

/**
 * Creates lookup functions for OOB data.
 * @param brigadesData - List of brigades from oob_brigades.json
 * @param settlementsData - Map of settlement ID -> Record (settlement_names.json)
 * @param munPopData - Map of municipality code -> Record (municipality_population_1991.json) - used for ID->Code mapping
 */
export function createOOBLookup(
    brigades: MinimalBrigade[],
    settlements: Record<string, SettlementRecord>,
    munPop: Record<string, MunPopRecord>,
    crossMapping: Record<string, string[]> // Optional: mapping of mun_id -> [allowed extra mun codes] 
): OOBLookupFunctions {

    // 1. Build map: (faction, mun_id) -> sorted list of brigades
    const brigadesByKey = new Map<string, MinimalBrigade[]>();

    for (const b of brigades) {
        if (!b.faction || !b.home_mun) continue;
        const key = `${b.faction}:${b.home_mun}`;
        if (!brigadesByKey.has(key)) {
            brigadesByKey.set(key, []);
        }
        brigadesByKey.get(key)?.push(b);
    }

    // Sort each list deterministically by ID
    for (const list of brigadesByKey.values()) {
        list.sort((a, b) => a.id.localeCompare(b.id));
    }

    // 2. Build map: mun_id -> Set<mun_code> (for settlement validation)
    const munIdToCodes = new Map<string, Set<string>>();
    for (const [code, entry] of Object.entries(munPop)) {
        if (entry.mun1990_id) {
            if (!munIdToCodes.has(entry.mun1990_id)) munIdToCodes.set(entry.mun1990_id, new Set());
            munIdToCodes.get(entry.mun1990_id)?.add(code);
        }
    }

    // 3. Build lookup: settlement name -> Map<mun_code, sid>
    // Because names are not unique, we need to know which mun_code they belong to.
    const settlementNameMap = new Map<string, Map<string, string>>();
    for (const [sid, entry] of Object.entries(settlements)) {
        if (!settlementNameMap.has(entry.name)) {
            settlementNameMap.set(entry.name, new Map());
        }
        settlementNameMap.get(entry.name)?.set(entry.mun_code, sid);
    }

    const nameLookup = (faction: string, mun_id: string, ordinal: number): string | null => {
        const key = `${faction}:${mun_id}`;
        const list = brigadesByKey.get(key);
        if (!list || list.length < ordinal) return null;
        return list[ordinal - 1].name;
    };

    const hqLookup = (faction: string, mun_id: string, ordinal: number): string | null => {
        const key = `${faction}:${mun_id}`;
        const list = brigadesByKey.get(key);
        if (!list || list.length < ordinal) return null;
        const brigade = list[ordinal - 1];

        if (!brigade.home_settlement) return null;

        // Resolve settlement ID
        const name = brigade.home_settlement.trim();
        const candidateMap = settlementNameMap.get(name);
        if (!candidateMap) return null;

        // Allowed codes for this municipality
        const allowedCodes = new Set<string>();
        const baseCodes = munIdToCodes.get(mun_id);
        if (baseCodes) baseCodes.forEach(c => allowedCodes.add(c));

        // Add cross-mappings
        if (crossMapping[mun_id]) {
            crossMapping[mun_id].forEach(c => allowedCodes.add(c));
        }

        // Checking if any candidate mun_code is in allowedCodes
        for (const [code, sid] of candidateMap.entries()) {
            if (allowedCodes.has(code)) {
                return sid;
            }
        }

        return null;
    };

    return { nameLookup, hqLookup };
}
