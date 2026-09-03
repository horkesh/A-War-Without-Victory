import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import microOsidMergeMap from '../../../../../data/derived/operational/micro_osid_merge_map.json';

/**
 * Sub-1 km² OSIDs that `tools/merge_micro_osids.cjs` folded into a
 * same-municipality neighbour. The GeoJSON still carries their polygons (744
 * features) while the simulation only knows the 712 parents, and their geometry
 * was never unioned into the parent — so without this they reach MapLibre with
 * `controller: null` and paint as the style's neutral fallback: 32 tiny
 * "unowned enclave" slivers punched into solid faction territory, hoverable and
 * selectable for cells the engine has never heard of.
 *
 * A merge child's ground IS held — by its parent. It therefore renders as its
 * parent and reports its parent on hover. Presentational only: nothing here
 * feeds the simulation. Invariant pinned by
 * tests/operational_osid_universe_invariant.test.ts.
 */
const MERGE_PARENT_BY_CHILD = microOsidMergeMap as Record<string, string>;

export function buildControlGeoJSON(
  baseGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  osidPropertiesMap?: Record<string, Record<string, unknown>> | null,
): FeatureCollection {
  const features = baseGeoJson.features.map((feature) => {
    const props = (feature.properties ?? {}) as GeoJsonProperties & { osid?: unknown };
    const osid = typeof props.osid === 'string' ? props.osid : '';
    // Resolve merged-away cells to the parent the simulation actually holds.
    const mergedInto = osid ? (MERGE_PARENT_BY_CHILD[osid] ?? null) : null;
    const scoredOsid = mergedInto ?? osid;
    const controller = scoredOsid
      ? (controlBySettlement[scoredOsid] ?? (scoredOsid.startsWith('S') ? null : controlBySettlement[`S${scoredOsid}`] ?? null))
      : null;

    // Enrich with terrain friction for move-preview coloring
    const osidProps = scoredOsid && osidPropertiesMap ? osidPropertiesMap[scoredOsid] : undefined;
    const friction = typeof osidProps?.terrain_friction_index === 'number' ? osidProps.terrain_friction_index : undefined;

    return {
      type: 'Feature' as const,
      geometry: feature.geometry as Geometry,
      properties: {
        ...props,
        controller,
        // Interaction layers select on this: a click on a merge child must open
        // the cell the simulation owns, not an id it has never heard of.
        osid: scoredOsid || props.osid,
        ...(mergedInto ? { merged_child_osid: osid, merged_into: mergedInto } : {}),
        ...(friction != null ? { friction } : {}),
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
