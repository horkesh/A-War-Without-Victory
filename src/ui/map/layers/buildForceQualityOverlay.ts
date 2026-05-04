/**
 * Force-Quality Glow — per-OSID, per-faction officer-quality intensity overlay
 * (read-model, deterministic).
 *
 * Sibling lane to LANE-NIGHTSHIFT-MAP-THAT-SCARS (`buildOsidDamageOverlay.ts`).
 * Closes the second v0.9.4 (Visual Layer) feature: a glow halo whose intensity
 * scales with the mean officer_quality of active brigades at each OSID.
 *
 * Inputs are read straight from `LoadedGameState.formations` (the
 * already-projected UI view). No engine plumbing, no save embed; the overlay is
 * rebuilt at render time from the current GameState projection.
 *
 * Visual styling (mirrors Map That Scars three-tier alpha gradient, but tinted
 * per the formation's faction so the player can see WHERE force-quality is
 * concentrated and WHICH faction owns it):
 *
 *   officer_quality   < 0.30   →  faint glow      (alpha 0.05)
 *   officer_quality [0.30,0.60) → moderate glow   (alpha 0.15)
 *   officer_quality   ≥ 0.60   →  strong glow     (alpha 0.30)
 *
 * Determinism:
 *   - Iterates input formations in formation-id strictCompare-sorted order.
 *   - Aggregates per (osid, faction) via running mean using deterministic
 *     accumulator → no Math.random, no Date.now.
 *   - Output `ForceQualityDatum[]` is sorted by `osid` then `faction` for
 *     byte-stable layer construction across renders.
 *
 * Faction-symmetry (mechanism):
 *   The mechanism is a single palette lookup (`FACTION_GLOW_RGB[faction]`).
 *   Every faction enters the same code path; there is NO `if (faction === 'X')`
 *   color branch. The palette table is data, not logic — the test pins this
 *   structurally via T5.
 *
 * Capability gate:
 *   `composeTacticalDeckLayers` skips the layer when
 *   `forceQualityData.length === 0` (mirror Map That Scars). A fresh save
 *   before any formations are seeded therefore degrades gracefully.
 */
import { PolygonLayer } from '@deck.gl/layers';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { FormationView } from '../data/types';

/** Flat datum for the PolygonLayer. */
export interface ForceQualityDatum {
  osid: string;
  /** Canonical faction id (RS / RBiH / HRHB). */
  faction: string;
  /** Outer + holes for Polygon, or list of Polygons for MultiPolygon. */
  contour: number[][][] | number[][][][];
  isMulti: boolean;
  /** Mean officer_quality across active brigades at this (osid, faction). */
  officerQualityMean: number;
  /** Number of active brigades aggregated into this datum. */
  brigadeCount: number;
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
// Quality tier → alpha. Mirrors Map That Scars three-tier gradient.
// ---------------------------------------------------------------------------
const TIER_FAINT_MAX = 0.30;
const TIER_MODERATE_MAX = 0.60;
const ALPHA_FAINT = 0.05;
const ALPHA_MODERATE = 0.15;
const ALPHA_STRONG = 0.30;

/** Map an officer_quality mean (∈ [0,1] in canon) to an alpha 0..1. Public for tests. */
export function officerQualityToAlpha(quality: number): number {
  if (!Number.isFinite(quality) || quality <= 0) return 0;
  if (quality < TIER_FAINT_MAX) return ALPHA_FAINT;
  if (quality < TIER_MODERATE_MAX) return ALPHA_MODERATE;
  return ALPHA_STRONG;
}

// ---------------------------------------------------------------------------
// Faction-symmetric palette. PURE LOOKUP — every faction enters the same code
// path; there are no `if (faction === ...)` color branches. Values mirror
// `src/ui/map/layers/buildExperimentalDeckLayers.ts` `FACTION_COLORS` so the
// glow tint is consistent with other deck.gl tactical layers.
// ---------------------------------------------------------------------------
export const FACTION_GLOW_RGB: Readonly<Record<string, readonly [number, number, number]>> = Object.freeze({
  RS: [200, 70, 70],
  RBiH: [70, 165, 90],
  HRHB: [70, 130, 200],
});

/** Default RGB for unknown / null faction (faction-neutral grey). */
const DEFAULT_GLOW_RGB: readonly [number, number, number] = [160, 160, 160];

/** Pure palette lookup. Public for tests asserting no faction-asymmetric branching. */
export function factionGlowRgb(faction: string): readonly [number, number, number] {
  return FACTION_GLOW_RGB[faction] ?? DEFAULT_GLOW_RGB;
}

// ---------------------------------------------------------------------------
// Aggregation: build per-OSID, per-faction officer-quality mean.
// ---------------------------------------------------------------------------

/**
 * Build a flat array of polygon data for the force-quality glow layer.
 *
 * Inputs:
 *   - `formations`: FormationView[] from LoadedGameState (UI projection).
 *   - `polygons`: operational_settlements GeoJSON (OSID polygons).
 *
 * Filters:
 *   - Brigade-kind only (corps / army_hq / og excluded — they are command
 *     formations, not the tactical force whose officer_quality maps to this
 *     overlay).
 *   - status === 'active' (destroyed / inactive / placeholder skipped).
 *   - officer_quality must be a finite positive number.
 *   - location_osid must resolve to a known polygon.
 *
 * Aggregation:
 *   For each (osid, faction) pair, takes the arithmetic mean of officer_quality
 *   across all brigades meeting the filters.
 *
 * Output is sorted by (osid, faction) for deterministic layer construction.
 * (osid, faction) pairs whose mean maps to alpha 0 are skipped — no paint.
 */
export function buildForceQualityData(
  formations: readonly FormationView[],
  polygons: FeatureCollection,
): ForceQualityDatum[] {
  // Index polygons by OSID once.
  const byOsid = new Map<string, Polygon | MultiPolygon>();
  for (const f of polygons.features) {
    const osid = f.properties && typeof f.properties.osid === 'string'
      ? (f.properties.osid as string)
      : null;
    if (!osid) continue;
    const geom = f.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      byOsid.set(osid, geom);
    }
  }

  // Sort formations by id deterministically before aggregation.
  const sortedFormations = [...formations].sort((a, b) => strictCompare(a.id, b.id));

  // Aggregate per (osid|faction) → { sum, count }.
  // Key uses '|' separator (forbidden in OSIDs and faction ids).
  const acc = new Map<string, { osid: string; faction: string; sum: number; count: number }>();

  for (const fm of sortedFormations) {
    if (fm.kind !== 'brigade') continue;
    if (fm.status !== 'active') continue;
    const oq = fm.officer_quality;
    if (typeof oq !== 'number' || !Number.isFinite(oq) || oq <= 0) continue;
    const osid = fm.location_osid;
    if (!osid) continue;
    const faction = fm.faction;
    if (!faction) continue;
    const key = `${osid}|${faction}`;
    const cur = acc.get(key);
    if (cur) {
      cur.sum += oq;
      cur.count += 1;
    } else {
      acc.set(key, { osid, faction, sum: oq, count: 1 });
    }
  }

  // Sort keys deterministically: (osid, faction) lexicographic.
  const sortedKeys = [...acc.keys()].sort(strictCompare);

  const out: ForceQualityDatum[] = [];
  for (const key of sortedKeys) {
    const entry = acc.get(key)!;
    const mean = entry.sum / entry.count;
    if (officerQualityToAlpha(mean) <= 0) continue;
    const geom = byOsid.get(entry.osid);
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      out.push({
        osid: entry.osid,
        faction: entry.faction,
        contour: geom.coordinates as number[][][],
        isMulti: false,
        officerQualityMean: mean,
        brigadeCount: entry.count,
      });
    } else {
      out.push({
        osid: entry.osid,
        faction: entry.faction,
        contour: geom.coordinates as number[][][][],
        isMulti: true,
        officerQualityMean: mean,
        brigadeCount: entry.count,
      });
    }
  }

  return out;
}

/**
 * Build the Deck.gl PolygonLayer for the force-quality glow overlay.
 *
 * Caller is responsible for gating with the feature flag and passing only
 * pre-computed data when the flag is enabled.
 */
export function buildForceQualityOverlay(data: ForceQualityDatum[]): PolygonLayer<ForceQualityDatum> {
  return new PolygonLayer<ForceQualityDatum>({
    id: 'force-quality-glow-overlay',
    data,
    pickable: false,
    stroked: false,
    filled: true,
    extruded: false,
    getPolygon: (d: ForceQualityDatum) => d.contour as never,
    getFillColor: (d: ForceQualityDatum): [number, number, number, number] => {
      const rgb = factionGlowRgb(d.faction);
      const a = Math.round(officerQualityToAlpha(d.officerQualityMean) * 255);
      return [rgb[0], rgb[1], rgb[2], a];
    },
    // Static — re-render only when data identity changes.
    updateTriggers: {},
  });
}
