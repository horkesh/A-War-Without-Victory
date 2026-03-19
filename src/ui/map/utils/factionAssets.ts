import flagRS from '../assets/crests/flag_RS.webp';
import flagRBiH from '../assets/crests/flag_RBiH.webp';
import flagHRHB from '../assets/crests/flag_HRHB.webp';

import crestRS from '../assets/crests/crest_RS.webp';
import crestRBiH from '../assets/crests/crest_RBiH.webp';
import crestHRHB from '../assets/crests/crest_HRHB.webp';

import armyCrestVRS from '../assets/crests/army_crest_VRS.webp';
import armyCrestARBiH from '../assets/crests/army_crest_ARBiH.webp';
import armyCrestHVO from '../assets/crests/army_crest_HVO.webp';

import stampSecret from '../assets/crests/stamp_secret.webp';
import paperclip from '../assets/crests/paperclip.webp';
import { defaultArmyLabelForSide, normalizeFactionId, type PoliticalSideId } from '../../../state/identity.js';

export const ASSETS = {
    stampSecret,
    paperclip,
};

export const FACTION_FLAGS: Record<string, string> = {
    RS: flagRS,
    RBiH: flagRBiH,
    HRHB: flagHRHB,
};

export const FACTION_CRESTS: Record<string, string> = {
    RS: crestRS,
    RBiH: crestRBiH,
    HRHB: crestHRHB,
};

export const ARMY_CRESTS: Record<string, string> = {
    RS: armyCrestVRS,
    RBiH: armyCrestARBiH,
    HRHB: armyCrestHVO,
};

/** Look up a faction asset, normalizing any variant (VRS→RS, HVO→HRHB, etc.). */
function lookupFaction<T>(map: Record<string, T>, faction: string | undefined | null): T | undefined {
    if (!faction) return undefined;
    return map[normalizeFactionId(faction)];
}

export function getFactionFlag(faction: string | undefined | null): string | undefined {
    return lookupFaction(FACTION_FLAGS, faction);
}

export function getFactionCrest(faction: string | undefined | null): string | undefined {
    return lookupFaction(FACTION_CRESTS, faction);
}

export function getArmyCrest(faction: string | undefined | null): string | undefined {
    return lookupFaction(ARMY_CRESTS, faction);
}

export function getArmyName(faction: string | undefined | null): string | undefined {
    if (!faction) return undefined;
    const canonical = normalizeFactionId(faction) as PoliticalSideId;
    if (canonical === 'RS' || canonical === 'RBiH' || canonical === 'HRHB') {
        return defaultArmyLabelForSide(canonical);
    }
    return undefined;
}
