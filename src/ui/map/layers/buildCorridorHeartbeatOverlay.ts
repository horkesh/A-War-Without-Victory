/**
 * Corridor Heartbeat — per-strategic-corridor pulse overlay (read-model,
 * deterministic).
 *
 * Sibling lane to LANE-NIGHTSHIFT-MAP-THAT-SCARS (`buildOsidDamageOverlay.ts`),
 * LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW (`buildForceQualityOverlay.ts`), and
 * LANE-NIGHTSHIFT-V094-THIRD-VISUAL-FEATURE (`buildRefugeeColumnOverlay.ts`).
 * Closes the FOURTH v0.9.4 (Visual Layer) feature: a deck.gl `PathLayer`
 * drawing OSID-centroid → OSID-centroid pulses along strategic corridor
 * segments, where corridor segments are derived from the existing
 * `frontEdgesOsid` (an OSID-pair contains a corridor segment when the two
 * OSIDs are controlled by opposing factions and the front edge between them
 * carries non-zero pressure or is one of multiple touching corridor edges
 * for the same friendly faction).
 *
 * Substrate verification:
 *   - Required: per-(from_osid, to_osid) corridor segment with a friendly
 *     faction tag and an intensity scalar.
 *   - Substrate found: `LoadedGameState.frontEdgesOsid` (canonical
 *     UI projection of `state.military.frontEdgesOsid`) gives every
 *     contested OSID-pair `(a, b, side_a, side_b)`. Optional pressure
 *     scalar is `LoadedGameState.frontPressureByEdge[edge_id].value`.
 *     Both are pre-existing fields; no engine plumbing required.
 *   - No "strategic_corridors" classification field exists on
 *     `LoadedGameState`. Per lane spec, corridor edges are derived from
 *     adjacency / political controllers / front_edges intersection: every
 *     front edge IS a corridor segment (a contested lifeline), and the
 *     pulse intensity reflects how loaded that segment is.
 *
 * Visual styling:
 *
 *   - Color: per-friendly-faction palette lookup over `FACTION_GLOW_RGB`
 *     (the same palette used by Force-Quality Glow + Refugee Column). Pure
 *     lookup — every faction enters the same code path; there is NO
 *     `if (faction === 'X')` color branch.
 *
 *   - Width (meters), driven by `intensity` (a normalized 0..1 load on the
 *     corridor segment derived from front pressure or per-corridor edge
 *     count fallback):
 *       intensity ≤ 0       →  0    (skipped)
 *       intensity < 0.25    →  240  (faint pulse — dormant lifeline)
 *       intensity [0.25, 0.6) →  480  (moderate pulse — active pressure)
 *       intensity [0.6, 0.9) →  900  (strong pulse — heavy pressure)
 *       intensity ≥ 0.9     →  1500 (heartbeat — critical lifeline; cap)
 *
 *     The cap at 1500m prevents a single mass-pressure event from visually
 *     dominating; T6 pins this against intensity 1_000_000.
 *
 *   - Period (period_ms): retained on the datum so a future TripsLayer or
 *     time-keyed shader can pick it up. The current static implementation
 *     does not consume it; T6 verifies the field is set deterministically.
 *
 * Determinism:
 *   - Iterates input edges in deterministic order (sorted by edge_id).
 *   - Aggregates per (from_osid, to_osid, faction) via plain Map accumulator.
 *   - Output `CorridorHeartbeatDatum[]` is sorted by
 *     `(from_osid, to_osid, faction)` strictCompare for byte-stable layer
 *     construction across renders.
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
 *   `corridorHeartbeatData.length === 0` (mirror Map That Scars / Force-
 *   Quality Glow / Refugee Column). A fresh save before any front edges
 *   are formed therefore degrades gracefully.
 */
import { PathLayer } from '@deck.gl/layers';
// Reuse the canonical faction palette established by Force-Quality Glow
// (Wave 8 Lane D) and re-exported by Refugee Column. Single source of truth
// — no second `FACTION_GLOW_RGB` table exists in the repo for tactical
// deck.gl layers. Re-exported below so callers (and tests) of THIS builder
// can also reach the palette without importing from a sibling builder file.
import { FACTION_GLOW_RGB, factionGlowRgb } from './buildForceQualityOverlay';

export { FACTION_GLOW_RGB, factionGlowRgb };

/**
 * Single front-edge record consumed from `LoadedGameState.frontEdgesOsid`.
 * Mirrors the canonical shape declared on `FrontEdgeView` in
 * `src/ui/map/data/types.ts` (a structural subset). Kept local so the
 * builder remains decoupled from the wider LoadedGameState type — the
 * builder only needs these five fields.
 */
export interface FrontEdgeRecord {
  edge_id: string;
  a: string;
  b: string;
  side_a: string | null;
  side_b: string | null;
}

/**
 * Optional per-edge pressure record (mirrors `FrontPressureView`).
 * The corridor-heartbeat builder reads `value` and `max_abs` if present
 * to derive a normalized intensity 0..1 — but the layer functions even
 * with no pressure record (intensity falls back to a per-faction edge
 * count proxy).
 */
export interface FrontPressureRecord {
  value: number;
  max_abs: number;
}

/** Flat datum for the PathLayer. */
export interface CorridorHeartbeatDatum {
  /** Friendly OSID (where the corridor's heart beats from). */
  from_osid: string;
  /** Hostile OSID (where the corridor segment terminates against opposing control). */
  to_osid: string;
  /** Friendly faction (canonical id: RBiH / RS / HRHB) — drives palette lookup. */
  faction: string;
  /** Normalized intensity 0..1 (clamped). Drives width tier and future pulse-period. */
  intensity: number;
  /** Pulse period (ms). Static layer ignores; reserved for future TripsLayer. */
  period_ms: number;
  /** Path geometry: [fromCentroid, toCentroid]. */
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
// Width tiers (meters). Cap at 1500m so a single critical lifeline does not
// dominate visually. Values coordinated with the experimental front-line
// stack (220m core, 800m glow) and Refugee Column (300/600/1200/2000m) so
// corridor heartbeats read as a distinct, slightly-narrower-than-mass-flight
// strand on the map (corridor pressure rather than flight volume).
// ---------------------------------------------------------------------------
const WIDTH_FAINT = 240;
const WIDTH_MODERATE = 480;
const WIDTH_STRONG = 900;
const WIDTH_HEARTBEAT = 1500;

const TIER_FAINT_MAX = 0.25;
const TIER_MODERATE_MAX = 0.6;
const TIER_STRONG_MAX = 0.9;

/** Map a normalized intensity 0..1 to a path width (meters). Public for tests. */
export function intensityToWidth(intensity: number): number {
  if (!Number.isFinite(intensity) || intensity <= 0) return 0;
  if (intensity < TIER_FAINT_MAX) return WIDTH_FAINT;
  if (intensity < TIER_MODERATE_MAX) return WIDTH_MODERATE;
  if (intensity < TIER_STRONG_MAX) return WIDTH_STRONG;
  return WIDTH_HEARTBEAT;
}

// ---------------------------------------------------------------------------
// Pulse period (ms). Slower for dormant corridors, faster for heartbeats.
// Static layer does not consume; reserved for future time-keyed render.
// ---------------------------------------------------------------------------
const PERIOD_DORMANT_MS = 2400;
const PERIOD_ACTIVE_MS = 1600;
const PERIOD_PRESSURE_MS = 1100;
const PERIOD_HEARTBEAT_MS = 700;

/** Map a normalized intensity 0..1 to a pulse period (ms). Public for tests. */
export function intensityToPeriodMs(intensity: number): number {
  if (!Number.isFinite(intensity) || intensity <= 0) return PERIOD_DORMANT_MS;
  if (intensity < TIER_FAINT_MAX) return PERIOD_DORMANT_MS;
  if (intensity < TIER_MODERATE_MAX) return PERIOD_ACTIVE_MS;
  if (intensity < TIER_STRONG_MAX) return PERIOD_PRESSURE_MS;
  return PERIOD_HEARTBEAT_MS;
}

// ---------------------------------------------------------------------------
// Faction-symmetric palette is imported (and re-exported) from
// `buildForceQualityOverlay.ts` — see the import at the top of this file.
// Single source of truth: the palette table lives next to the first builder
// that needed it, and every subsequent deck.gl tactical layer that wants
// per-faction color reuses the same import. No `if (faction === ...)`
// branches in this file; T5 pins this structurally.
// ---------------------------------------------------------------------------

/** Alpha for corridor heartbeat paths — semi-transparent so they don't occlude
 *  underlying territory + sectors but pop against ground tint. */
const CORRIDOR_PATH_ALPHA = 200;

// ---------------------------------------------------------------------------
// Aggregation: build per (from_osid, to_osid, faction) corridor segments.
// ---------------------------------------------------------------------------

/**
 * Build a flat array of path data for the corridor heartbeat overlay layer.
 *
 * Inputs:
 *   - `edges`: FrontEdgeRecord[] from LoadedGameState.frontEdgesOsid.
 *   - `pressureByEdgeId`: optional Map<edge_id, {value, max_abs}> from
 *     LoadedGameState.frontPressureByEdge. When present, intensity is
 *     `clamp(|value| / max_abs, 0, 1)`. When absent, intensity falls back
 *     to a per-faction edge-count proxy: 1 / (1 + faction_corridor_edge_count_quartile).
 *   - `centroidLookup`: Map<osid, [lng,lat]> for path endpoints.
 *
 * Filters:
 *   - Both OSIDs present and non-empty (skip malformed edges).
 *   - `a !== b` (no self-loops).
 *   - Both `side_a` and `side_b` present and DIFFERENT (a contested edge
 *     where two factions touch — that's what defines a corridor segment).
 *   - Both centroids resolve in the lookup.
 *   - intensity > 0 (zero-pressure dormant edges are skipped — no paint).
 *
 * Aggregation rule:
 *   For each (from_osid, to_osid, faction) tuple, take the MAX of
 *   intensities. Picking the max (not sum) reflects that a single corridor
 *   segment is one lifeline; multiple readings of the same segment should
 *   not stack visually.
 *
 *   `from_osid` is normalized to be the friendly OSID (the one whose
 *   side equals `faction`); `to_osid` is the hostile counterpart. This
 *   gives a directional pulse from-friendly-toward-enemy.
 *
 * Output is sorted by `(from_osid, to_osid, faction)` strictCompare for
 * deterministic layer construction.
 */
export function buildCorridorHeartbeatData(
  edges: readonly FrontEdgeRecord[],
  pressureByEdgeId: ReadonlyMap<string, FrontPressureRecord> | null,
  centroidLookup: ReadonlyMap<string, [number, number]>,
): CorridorHeartbeatDatum[] {
  // First pass: filter contested edges and collect per-edge intensity.
  // Build a per-faction edge count for the fallback proxy.
  type ScratchEdge = {
    edge_id: string;
    friendly_osid: string;
    hostile_osid: string;
    faction: string;
    intensity: number;
  };
  const scratch: ScratchEdge[] = [];
  const factionEdgeCount = new Map<string, number>();

  // Sort edges by edge_id for deterministic iteration when computing the
  // fallback proxy (the proxy is per-faction-quartile so order doesn't
  // matter mathematically, but byte-stability is preserved by construction).
  const sortedEdges = [...edges].sort((x, y) => strictCompare(x.edge_id, y.edge_id));

  for (const edge of sortedEdges) {
    if (!edge) continue;
    const a = edge.a;
    const b = edge.b;
    if (!a || !b) continue;
    if (a === b) continue;
    const sideA = edge.side_a;
    const sideB = edge.side_b;
    if (!sideA || !sideB) continue;
    if (sideA === sideB) continue; // Not a contested edge.

    // Two-sided corridor: emit one segment per faction (both sides see this
    // as their own lifeline). Each side renders friendly→hostile direction.
    // Faction-symmetric: both factions enter the same code path.
    for (const [friendlyOsid, hostileOsid, friendlyFaction] of [
      [a, b, sideA] as const,
      [b, a, sideB] as const,
    ]) {
      // Resolve intensity from pressure if available; otherwise use a
      // deterministic per-edge fallback.
      let intensity: number;
      const pressure = pressureByEdgeId ? pressureByEdgeId.get(edge.edge_id) : undefined;
      if (pressure
          && Number.isFinite(pressure.value)
          && Number.isFinite(pressure.max_abs)
          && pressure.max_abs > 0) {
        const norm = Math.abs(pressure.value) / pressure.max_abs;
        intensity = Math.max(0, Math.min(1, norm));
      } else {
        // Fallback: deterministic small constant — every contested edge
        // pulses faintly when no pressure data is available, so the player
        // still sees the corridor structure.
        intensity = 0.15;
      }

      if (intensity <= 0) continue;

      scratch.push({
        edge_id: edge.edge_id,
        friendly_osid: friendlyOsid,
        hostile_osid: hostileOsid,
        faction: friendlyFaction,
        intensity,
      });
      factionEdgeCount.set(
        friendlyFaction,
        (factionEdgeCount.get(friendlyFaction) ?? 0) + 1,
      );
    }
  }

  // Aggregate per (friendly_osid, hostile_osid, faction) → MAX intensity.
  // Key uses '|' separator (forbidden in OSIDs and faction ids).
  const acc = new Map<string, {
    from_osid: string;
    to_osid: string;
    faction: string;
    intensity: number;
  }>();

  for (const s of scratch) {
    const key = `${s.friendly_osid}|${s.hostile_osid}|${s.faction}`;
    const cur = acc.get(key);
    if (cur) {
      if (s.intensity > cur.intensity) cur.intensity = s.intensity;
    } else {
      acc.set(key, {
        from_osid: s.friendly_osid,
        to_osid: s.hostile_osid,
        faction: s.faction,
        intensity: s.intensity,
      });
    }
  }

  // Sort entries deterministically by (from_osid, to_osid, faction).
  const sortedEntries = [...acc.values()].sort((x, y) => {
    const c1 = strictCompare(x.from_osid, y.from_osid);
    if (c1 !== 0) return c1;
    const c2 = strictCompare(x.to_osid, y.to_osid);
    if (c2 !== 0) return c2;
    return strictCompare(x.faction, y.faction);
  });

  const out: CorridorHeartbeatDatum[] = [];
  for (const entry of sortedEntries) {
    const fromCentroid = centroidLookup.get(entry.from_osid);
    if (!fromCentroid) continue;
    const toCentroid = centroidLookup.get(entry.to_osid);
    if (!toCentroid) continue;
    if (intensityToWidth(entry.intensity) <= 0) continue;
    out.push({
      from_osid: entry.from_osid,
      to_osid: entry.to_osid,
      faction: entry.faction,
      intensity: entry.intensity,
      period_ms: intensityToPeriodMs(entry.intensity),
      path: [
        [fromCentroid[0], fromCentroid[1]],
        [toCentroid[0], toCentroid[1]],
      ],
    });
  }

  return out;
}

/**
 * Build the Deck.gl PathLayer for the corridor heartbeat overlay.
 *
 * Caller is responsible for gating with the feature flag and passing only
 * pre-computed data when the flag is enabled.
 *
 * Animation status: STATIC. deck.gl `PathLayer` does not natively support
 * time-keyed pulses; the canonical animated path layer is `TripsLayer`,
 * which requires a render-loop tick + `updateTriggers: { currentTime }`.
 * The current implementation ships static (intensity → width tier +
 * intensity → period_ms metadata retained on the datum). Animation is a
 * follow-on lane: a TripsLayer wrapper or a custom shader could consume
 * `period_ms` to pulse alpha or a moving dash pattern.
 */
export function buildCorridorHeartbeatOverlay(data: CorridorHeartbeatDatum[]): PathLayer<CorridorHeartbeatDatum> {
  return new PathLayer<CorridorHeartbeatDatum>({
    id: 'corridor-heartbeat-overlay',
    data,
    pickable: false,
    capRounded: true,
    jointRounded: true,
    widthUnits: 'meters',
    widthMinPixels: 2,
    getPath: (d: CorridorHeartbeatDatum) => d.path as never,
    getColor: (d: CorridorHeartbeatDatum): [number, number, number, number] => {
      const rgb = factionGlowRgb(d.faction);
      return [rgb[0], rgb[1], rgb[2], CORRIDOR_PATH_ALPHA];
    },
    getWidth: (d: CorridorHeartbeatDatum) => intensityToWidth(d.intensity),
    // Static — re-render only when data identity changes.
    updateTriggers: {},
  });
}
