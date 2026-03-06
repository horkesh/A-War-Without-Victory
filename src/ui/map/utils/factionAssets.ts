import flagRS from '../assets/crests/flag_RS.png';
import flagRBiH from '../assets/crests/flag_RBiH.png';
import flagHRHB from '../assets/crests/flag_HRHB.png';

import crestRS from '../assets/crests/crest_RS.png';
import crestRBiH from '../assets/crests/crest_RBiH.png';
import crestHRHB from '../assets/crests/crest_HRHB.png';

import armyCrestVRS from '../assets/crests/army_crest_VRS.png';
import armyCrestARBiH from '../assets/crests/army_crest_ARBiH.png';
import armyCrestHVO from '../assets/crests/army_crest_HVO.png';

import stampSecret from '../assets/crests/stamp_secret.png';
import paperclip from '../assets/crests/paperclip.png';

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

export const ARMY_NAMES: Record<string, string> = {
    RS: 'VRS',
    RBiH: 'ARBiH',
    HRHB: 'HVO',
};

export function getFactionFlag(faction: string | undefined | null): string | undefined {
    if (!faction) return undefined;
    return FACTION_FLAGS[faction];
}

export function getFactionCrest(faction: string | undefined | null): string | undefined {
    if (!faction) return undefined;
    return FACTION_CRESTS[faction];
}

export function getArmyCrest(faction: string | undefined | null): string | undefined {
    if (!faction) return undefined;
    return ARMY_CRESTS[faction];
}

export function getArmyName(faction: string | undefined | null): string | undefined {
    if (!faction) return undefined;
    return ARMY_NAMES[faction];
}
