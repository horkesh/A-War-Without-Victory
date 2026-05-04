/**
 * Map That Scars — per-OSID damage overlay (read-model, deterministic).
 *
 * Consumes `data/derived/osid_damage_seed.json` (445 OSIDs scored 1.5..71.8 in
 * current data) and produces a Deck.gl PolygonLayer that tints each OSID
 * polygon with a faction-agnostic dark "scar" whose opacity scales with
 * `damage_score`.
 *
 * Visual styling (per LANE-NIGHTSHIFT-MAP-THAT-SCARS-RENDERER spec):
 *   damage_score   < 10   →  faint smudge (alpha 0.05)
 *   damage_score [10, 50) →  moderate scar (alpha 0.15)
 *   damage_score   ≥ 50   →  dark wound (alpha 0.30)
 *
 * Determinism:
 *   - Iterates OSID seed keys via strictCompare-sorted order.
 *   - No Math.random, no Date.now.
 *   - Output OsidDamageDatum[] is sorted by osid for byte-stable layer construction.
 *
 * Faction-neutral: a single dark grey base (sensitive-history neutral).
 *   `R2-5` upstream data is faction-agnostic by construction.
 *
 * Renders BELOW front-edge layers and ABOVE territory fill (caller positions
 * it accordingly inside `composeTacticalDeckLayers`).
 */
import { PolygonLayer } from '@deck.gl/layers';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';

/** Single record consumed from `osid_damage_seed.json`. */
export interface OsidDamageRecord {
  damage_score: number;
  battles: number;
  casualties_total: number;
  flips: number;
  displacement_spike_turns: number[];
}

/** Per-OSID damage seed map: keys are OSIDs (e.g. `op:brcko:brcko`). */
export type OsidDamageSeed = Record<string, OsidDamageRecord>;

/** Flat datum for the PolygonLayer. */
export interface OsidDamageDatum {
  osid: string;
  /** Outer + holes for Polygon, or a list of Polygons for MultiPolygon (deck.gl PolygonLayer accepts Position[][] or Position[][][]). */
  contour: number[][][] | number[][][][];
  isMulti: boolean;
  damageScore: number;
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
// Damage tier → alpha. Faction-agnostic dark grey.
//   < 10           →  alpha 0.05 (faint smudge)
//   [10, 50)       →  alpha 0.15 (moderate scar)
//   >= 50          →  alpha 0.30 (dark wound)
// ---------------------------------------------------------------------------
const TIER_FAINT_MAX = 10;
const TIER_MODERATE_MAX = 50;
const ALPHA_FAINT = 0.05;
const ALPHA_MODERATE = 0.15;
const ALPHA_WOUND = 0.30;

/** Map a damage score to an alpha 0..1. Public for tests. */
export function damageScoreToAlpha(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  if (score < TIER_FAINT_MAX) return ALPHA_FAINT;
  if (score < TIER_MODERATE_MAX) return ALPHA_MODERATE;
  return ALPHA_WOUND;
}

// Faction-agnostic neutral dark grey. RGB only — alpha computed per-feature.
const SCAR_RGB: readonly [number, number, number] = [20, 20, 24];

/**
 * Build a flat array of polygon data for the damage overlay layer.
 *
 * Inputs:
 *   - `seed`: per-OSID damage seed (typed `OsidDamageSeed`).
 *   - `polygons`: operational_settlements GeoJSON (OSID polygons).
 *
 * Output is sorted by `osid` (lexicographic) for deterministic layer construction.
 * OSIDs with no polygon match are skipped silently. OSIDs whose record yields
 * alpha 0 (e.g. `damage_score == 0`) are skipped — empty paint is wasted work.
 */
export function buildOsidDamageData(
  seed: OsidDamageSeed,
  polygons: FeatureCollection,
): OsidDamageDatum[] {
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

  const sortedOsids = Object.keys(seed).sort(strictCompare);
  const out: OsidDamageDatum[] = [];

  for (const osid of sortedOsids) {
    const rec = seed[osid];
    if (!rec) continue;
    const alpha = damageScoreToAlpha(rec.damage_score);
    if (alpha <= 0) continue;
    const geom = byOsid.get(osid);
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      out.push({
        osid,
        contour: geom.coordinates as number[][][],
        isMulti: false,
        damageScore: rec.damage_score,
      });
    } else {
      out.push({
        osid,
        contour: geom.coordinates as number[][][][],
        isMulti: true,
        damageScore: rec.damage_score,
      });
    }
  }

  return out;
}

/**
 * Build the Deck.gl PolygonLayer for the damage overlay.
 *
 * Caller is responsible for gating with the feature flag and passing only
 * pre-computed data when the flag is enabled.
 */
export function buildOsidDamageOverlay(data: OsidDamageDatum[]): PolygonLayer<OsidDamageDatum> {
  return new PolygonLayer<OsidDamageDatum>({
    id: 'osid-damage-overlay',
    data,
    pickable: false,
    stroked: false,
    filled: true,
    extruded: false,
    getPolygon: (d: OsidDamageDatum) => d.contour as never,
    getFillColor: (d: OsidDamageDatum): [number, number, number, number] => {
      const a = Math.round(damageScoreToAlpha(d.damageScore) * 255);
      return [SCAR_RGB[0], SCAR_RGB[1], SCAR_RGB[2], a];
    },
    // Static — re-render only when data identity changes.
    updateTriggers: {},
  });
}
