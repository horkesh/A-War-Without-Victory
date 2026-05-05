/**
 * Refugee Column — per-displacement-event animated overlay (read-model,
 * deterministic).
 *
 * Sibling lane to LANE-NIGHTSHIFT-MAP-THAT-SCARS (`buildOsidDamageOverlay.ts`)
 * and LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW (`buildForceQualityOverlay.ts`).
 * Closes the third v0.9.4 (Visual Layer) feature: a deck.gl `PathLayer`
 * drawing OSID-centroid → OSID-centroid escape routes whose width scales
 * with the number of displaced civilians.
 *
 * Inputs are read straight from `LoadedGameState.displacementEventLog`. No
 * engine plumbing, no save embed; the overlay is rebuilt at render time
 * from the current GameState projection.
 *
 * Visual styling:
 *
 *   - Color: per-faction-of-origin palette lookup over `FACTION_GLOW_RGB`
 *     (the same palette used by Force-Quality Glow). Pure lookup — every
 *     faction enters the same code path; there is NO `if (faction === 'X')`
 *     color branch. The palette table is data, not logic.
 *
 *   - Width (meters):
 *       displaced < 100              →  300 m   (faint trickle)
 *       displaced [100, 1k)          →  600 m   (column)
 *       displaced [1k, 10k)          →  1200 m  (mass flight)
 *       displaced ≥ 10k              →  2000 m  (catastrophe; cap)
 *
 *     The cap at 2000 m prevents a single mass-displacement event (e.g.
 *     Srebrenica-class) from visually dominating the map.
 *
 * Determinism:
 *   - Iterates input events in deterministic order (stable accumulator key
 *     visit), aggregates per (origin_osid, dest_osid, turn, faction_origin).
 *   - Output `RefugeeColumnDatum[]` is sorted by
 *     `(from_osid, to_osid, week_index, faction_origin)` strictCompare for
 *     byte-stable layer construction across renders.
 *   - No `Math.random`, no `Date.now`, no environment leak.
 *
 * Faction-symmetry (mechanism):
 *   The mechanism is a single palette lookup (`FACTION_GLOW_RGB[faction]`).
 *   Every faction enters the same code path; there is NO `if (faction === 'X')`
 *   color branch. The palette table is data, not logic — the test pins this
 *   structurally via T5.
 *
 * Capability gate:
 *   `composeTacticalDeckLayers` skips the layer when
 *   `refugeeColumnData.length === 0` (mirror Map That Scars / Force-Quality
 *   Glow). A fresh save before any displacement events therefore degrades
 *   gracefully.
 */
import { PathLayer } from '@deck.gl/layers';
// Reuse the canonical faction palette already established by Force-Quality
// Glow (Wave 8 Lane D). Single source of truth — no second `FACTION_GLOW_RGB`
// table exists in the repo for tactical deck.gl layers. Re-exported below so
// callers (and tests) of THIS builder can also reach the palette without
// importing from a sibling builder file.
import { FACTION_GLOW_RGB, factionGlowRgb } from './buildForceQualityOverlay';

export { FACTION_GLOW_RGB, factionGlowRgb };

/**
 * Single record consumed from `LoadedGameState.displacementEventLog`.
 *
 * Mirrors the canonical shape declared on `LoadedGameState.displacementEventLog`
 * in `src/ui/map/data/types.ts` (a structural subset). Kept local so the
 * builder remains decoupled from the wider LoadedGameState type — the
 * builder only needs these five fields. If the UI projection adds new
 * fields they do not need to be propagated here unless the builder consumes
 * them. The `ethnicity` field carries the canonical faction id
 * (`'RBiH' | 'RS' | 'HRHB'`) because the engine writes `ethnicity: fid` at
 * `src/state/displacement.ts:446`.
 */
export interface DisplacementEventRecord {
  turn: number;
  origin_osid?: string;
  dest_osid?: string;
  ethnicity?: string;
  displaced: number;
}

/** Flat datum for the PathLayer. */
export interface RefugeeColumnDatum {
  /** Origin OSID (where civilians fled from). */
  from_osid: string;
  /** Destination OSID (where civilians fled to). */
  to_osid: string;
  /** Sim turn (week index) for this aggregated route. */
  week_index: number;
  /** Faction-of-origin (canonical id: RBiH / RS / HRHB). */
  faction_origin: string;
  /** Total displaced civilians on this (from, to, week, faction) route. */
  displaced_count: number;
  /** Path geometry: [originCentroid, destCentroid]. */
  path: [[number, number], [number, number]];
}

// ---------------------------------------------------------------------------
// Deterministic comparator (mirrors src/state strictCompare semantics).
// ---------------------------------------------------------------------------
function strictCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Width tiers (meters). Caps at 2000m so a Srebrenica-class mass-displacement
// event does not dominate. Values are coordinated with the experimental
// front-line stack (220m core, 800m glow) so refugee columns read as a
// distinct, slightly-wider strand on the map.
// ---------------------------------------------------------------------------
const WIDTH_TRICKLE = 300;
const WIDTH_COLUMN = 600;
const WIDTH_MASS = 1200;
const WIDTH_CATASTROPHE = 2000;

const TIER_TRICKLE_MAX = 100;
const TIER_COLUMN_MAX = 1000;
const TIER_MASS_MAX = 10000;

/** Map a displaced count to a path width (meters). Public for tests. */
export function displacedCountToWidth(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  if (count < TIER_TRICKLE_MAX) return WIDTH_TRICKLE;
  if (count < TIER_COLUMN_MAX) return WIDTH_COLUMN;
  if (count < TIER_MASS_MAX) return WIDTH_MASS;
  return WIDTH_CATASTROPHE;
}

// ---------------------------------------------------------------------------
// Faction-symmetric palette is imported (and re-exported) from
// `buildForceQualityOverlay.ts` — see the import at the top of this file.
// Single source of truth: the palette table lives next to the first builder
// that needed it, and every subsequent deck.gl tactical layer that wants
// per-faction color reuses the same import. No `if (faction === ...)`
// branches in this file; T5 pins this structurally.
// ---------------------------------------------------------------------------

/** Alpha for refugee column paths — semi-transparent so they don't occlude
 *  underlying territory + sectors. */
const REFUGEE_PATH_ALPHA = 180;

// ---------------------------------------------------------------------------
// Aggregation: build per (from_osid, to_osid, turn, faction_origin) sum of
// displaced counts and resolve centroids.
// ---------------------------------------------------------------------------

/**
 * Build a flat array of path data for the refugee column overlay layer.
 *
 * Inputs:
 *   - `events`: DisplacementEventRecord[] from LoadedGameState.displacementEventLog.
 *   - `centroidLookup`: Map<osid, [lng,lat]> for path endpoints.
 *
 * Filters:
 *   - origin_osid AND dest_osid both present and non-empty (events without
 *     a routed destination — pure outflow with no settlement target — are
 *     skipped: nothing to draw).
 *   - origin_osid !== dest_osid (no zero-length self-loops).
 *   - displaced_count > 0 (zero-displacement events emit no paint).
 *   - Both centroids resolve in the lookup.
 *
 * Aggregation:
 *   For each (from_osid, to_osid, week_index, faction_origin), takes the
 *   sum of displaced counts.
 *
 * Output is sorted by (from_osid, to_osid, week_index, faction_origin)
 * strictCompare for deterministic layer construction.
 */
export function buildRefugeeColumnData(
  events: readonly DisplacementEventRecord[],
  centroidLookup: ReadonlyMap<string, [number, number]>,
): RefugeeColumnDatum[] {
  // Aggregate per route key.
  // Key uses '|' separator (forbidden in OSIDs and faction ids).
  const acc = new Map<string, {
    from_osid: string;
    to_osid: string;
    week_index: number;
    faction_origin: string;
    displaced_count: number;
  }>();

  for (const evt of events) {
    if (!evt) continue;
    const fromOsid = evt.origin_osid;
    const toOsid = evt.dest_osid;
    if (!fromOsid || !toOsid) continue;
    if (fromOsid === toOsid) continue;
    const displaced = evt.displaced;
    if (typeof displaced !== 'number' || !Number.isFinite(displaced) || displaced <= 0) continue;
    const turn = evt.turn;
    if (typeof turn !== 'number' || !Number.isFinite(turn)) continue;
    const faction = evt.ethnicity;
    if (!faction) continue;

    const key = `${fromOsid}|${toOsid}|${turn}|${faction}`;
    const cur = acc.get(key);
    if (cur) {
      cur.displaced_count += displaced;
    } else {
      acc.set(key, {
        from_osid: fromOsid,
        to_osid: toOsid,
        week_index: turn,
        faction_origin: faction,
        displaced_count: displaced,
      });
    }
  }

  // Sort keys deterministically. strictCompare on the composite '|'-joined
  // key gives us (from_osid, to_osid, week_index, faction_origin) order
  // because '|' is below all printable OSID/faction characters and turn
  // numbers are stringified in lexicographic order — but to make the order
  // canonical regardless of digit-length, we sort by the structured fields
  // explicitly.
  const sortedEntries = [...acc.values()].sort((a, b) => {
    const c1 = strictCompare(a.from_osid, b.from_osid);
    if (c1 !== 0) return c1;
    const c2 = strictCompare(a.to_osid, b.to_osid);
    if (c2 !== 0) return c2;
    if (a.week_index !== b.week_index) return a.week_index - b.week_index;
    return strictCompare(a.faction_origin, b.faction_origin);
  });

  const out: RefugeeColumnDatum[] = [];
  for (const entry of sortedEntries) {
    const fromCentroid = centroidLookup.get(entry.from_osid);
    if (!fromCentroid) continue;
    const toCentroid = centroidLookup.get(entry.to_osid);
    if (!toCentroid) continue;
    if (displacedCountToWidth(entry.displaced_count) <= 0) continue;
    out.push({
      from_osid: entry.from_osid,
      to_osid: entry.to_osid,
      week_index: entry.week_index,
      faction_origin: entry.faction_origin,
      displaced_count: entry.displaced_count,
      path: [
        [fromCentroid[0], fromCentroid[1]],
        [toCentroid[0], toCentroid[1]],
      ],
    });
  }

  return out;
}

/**
 * Build the Deck.gl PathLayer for the refugee column overlay.
 *
 * Caller is responsible for gating with the feature flag and passing only
 * pre-computed data when the flag is enabled.
 */
export function buildRefugeeColumnOverlay(data: RefugeeColumnDatum[]): PathLayer<RefugeeColumnDatum> {
  return new PathLayer<RefugeeColumnDatum>({
    id: 'refugee-column-overlay',
    data,
    pickable: false,
    capRounded: true,
    jointRounded: true,
    widthUnits: 'meters',
    widthMinPixels: 2,
    getPath: (d: RefugeeColumnDatum) => d.path as never,
    getColor: (d: RefugeeColumnDatum): [number, number, number, number] => {
      const rgb = factionGlowRgb(d.faction_origin);
      return [rgb[0], rgb[1], rgb[2], REFUGEE_PATH_ALPHA];
    },
    getWidth: (d: RefugeeColumnDatum) => displacedCountToWidth(d.displaced_count),
    // Static — re-render only when data identity changes.
    updateTriggers: {},
  });
}
