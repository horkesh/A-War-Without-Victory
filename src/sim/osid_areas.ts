// OSID areas (km²) for territory share / km² figures.
//
// Bundled as a JSON module, the same way sim/negotiation (peace_settlement, enclave_credit,
// front_packages, package_area_resolver) and the map UI already load this file. It used to be read
// from `process.cwd()` at runtime, and on any read error it silently fell back to an empty area
// map, so a run started outside the repo root reported zero territory without an error.
import osidAreasJson from '../../data/derived/operational/osid_areas.json';

export interface OsidAreaData {
    total: number;
    areas: Record<string, number>;
}

const OSID_AREAS: OsidAreaData = {
    total: osidAreasJson.total_area_km2,
    areas: osidAreasJson.areas as Record<string, number>,
};

export function getOsidAreas(): OsidAreaData {
    return OSID_AREAS;
}
