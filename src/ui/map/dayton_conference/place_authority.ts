import { POWER_AUTHORITY, AUTHORITY_POWERS, bodiesFor, type AuthorityOwner, type AuthorityPower, type Jurisdiction } from '../../../sim/negotiation/power_authority.js';
import osidCantons from '../../../../data/derived/peace/osid_cantons.json';
import microOsidMergeMap from '../../../../data/derived/operational/micro_osid_merge_map.json';
import { entityOf, type Controllers, type StageId } from './boundary_stages';

/**
 * Inspection by place (DC plan stage 3): one cell of the Boundary Map, and who governs police,
 * education and defense there under the line the map is showing. The power owners come from
 * the treaty (`effectiveOperativePowers`, through the caller); the bodies from
 * `POWER_AUTHORITY`; the Federation canton from `data/derived/peace/osid_cantons.json`
 * (tools/peace/derive_osid_cantons.cjs). Pending states are named, never guessed: Brčko under
 * arbitration, a place that changes entity (Annex 1A withdrawal and handover), and a
 * Federation place whose canton the treaty does not settle.
 *
 * Pure display: no state, no clock.
 */
export type CantonId =
    | 'una_sana' | 'posavina' | 'tuzla' | 'zenica_doboj' | 'bosnian_podrinje'
    | 'central_bosnia' | 'herzegovina_neretva' | 'west_herzegovina' | 'sarajevo' | 'canton_10';

export type PlaceEntity = 'federation' | 'rs' | 'brcko' | null;
export type PlacePending = 'brcko' | 'transfer' | 'canton';

/** A body as it acts in this place: the generic body, or one resolved to the place. */
export type PlaceBody =
    | { kind: 'body'; id: Jurisdiction }
    | { kind: 'canton'; canton: CantonId | null }
    | { kind: 'entity'; role: 'government' | 'army'; entity: 'federation' | 'rs' };

export interface PlacePower {
    power: AuthorityPower;
    owner: AuthorityOwner;
    rules: PlaceBody[];
    operates: PlaceBody[];
}

export interface PlaceCard {
    osid: string;
    /** Wartime holder (the front). */
    heldBy: string | null;
    /** Holder on the line being shown. */
    holder: string | null;
    entity: PlaceEntity;
    canton: CantonId | null;
    pending: PlacePending[];
    /** Empty on the wartime front, inside Brčko under arbitration, or without treaty terms. */
    powers: PlacePower[];
}

const CANTONS = (osidCantons as { cells: Record<string, { canton: string | null }> }).cells;
const MERGE_PARENT = microOsidMergeMap as Record<string, string>;

/**
 * The scored cell for a drawn polygon. The map draws 744 polygons and the simulation scores 712:
 * the 32 micro-cells were folded into a same-municipality parent, so a click on one inspects it.
 */
export function scoredOsid(osid: string): string {
    return MERGE_PARENT[osid] ?? osid;
}

export function cantonOf(osid: string): CantonId | null {
    return (CANTONS[osid]?.canton ?? null) as CantonId | null;
}

function resolve(ids: readonly Jurisdiction[], entity: 'federation' | 'rs', canton: CantonId | null): PlaceBody[] {
    return ids.map((id): PlaceBody => {
        if (id === 'cantons') return { kind: 'canton', canton };
        // In one place, "each entity's government" is that place's own.
        if (id === 'own_government' || id === 'entity_governments') return { kind: 'entity', role: 'government', entity };
        if (id === 'entity_army') return { kind: 'entity', role: 'army', entity };
        return { kind: 'body', id };
    });
}

export function placeCard(input: {
    osid: string;
    stage: StageId;
    controllers: Controllers;
    front: Controllers | undefined;
    special: ReadonlySet<string>;
    owners: Readonly<Record<AuthorityPower, AuthorityOwner>> | undefined;
}): PlaceCard {
    const { osid, stage, controllers, front, special, owners } = input;
    const holder = controllers[osid] ?? null;
    const heldBy = front?.[osid] ?? null;
    const onLine = stage !== 'front';
    const lineEntity = entityOf(holder);
    const entity: PlaceEntity = onLine && special.has(osid) ? 'brcko'
        : lineEntity === 'FED' ? 'federation' : lineEntity === 'RS' ? 'rs' : null;
    const canton = entity === 'federation' ? cantonOf(osid) : null;
    const pending: PlacePending[] = [];
    if (entity === 'brcko') pending.push('brcko');
    const before = entityOf(heldBy);
    if (onLine && entity !== 'brcko' && before && lineEntity && before !== lineEntity) pending.push('transfer');
    if (entity === 'federation' && !canton) pending.push('canton');
    const powers: PlacePower[] = onLine && owners && (entity === 'federation' || entity === 'rs')
        ? AUTHORITY_POWERS.map(power => {
            const owner = owners[power];
            const profile = POWER_AUTHORITY[power][owner];
            return {
                power,
                owner,
                rules: resolve(bodiesFor(profile.rules, entity), entity, canton),
                operates: resolve(bodiesFor(profile.operates, entity), entity, canton),
            };
        })
        : [];
    return { osid, heldBy, holder, entity, canton, pending, powers };
}
