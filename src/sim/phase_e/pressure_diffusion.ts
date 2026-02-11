/**
 * Phase E: Deterministic pressure diffusion (Roadmap Phase E, Step 1).
 * Redistributes pressure across eligible settlement contacts; conservative and bounded.
 * Canonical pressure field: state.front_pressure (Phase 3A). No geometry; contact graph only.
 * Scope: Spatial & Interaction only (no Phase O concepts).
 */

import { strictCompare } from '../../state/validateGameState.js';
import type { GameState } from '../../state/game_state.js';
import { getEligiblePressureEdges, toEdgeId, type PressureEdge } from './pressure_eligibility.js';

/** Stub constants per Phase 3A §5.3; conservative defaults. TODO: refine if roadmap specifies exact values. */
const DIFFUSE_FRACTION = 0.05;
const DIFFUSE_MAX_OUTFLOW = 2.0;
const DIFFUSE_EPS = 1e-9;
const CONSERVATION_TOL = 1e-6;

export interface PhaseEPressureDiffusionReport {
  applied: boolean;
  reason_if_not_applied: string;
  stats: {
    nodes_with_outflow: number;
    total_outflow: number;
    total_inflow: number;
    conserved_error_fix_applied: boolean;
  };
}

export interface DiffusePressureOptions {
  /** Override fraction (0–1) per turn; default from Phase 3A. */
  fraction?: number;
  /** Override max outflow per node; default from Phase 3A. */
  maxOutflow?: number;
}

function parseEdgeId(edgeId: string): [string, string] | null {
  const idx = edgeId.indexOf('__');
  if (idx <= 0 || idx === edgeId.length - 2) return null;
  const a = edgeId.slice(0, idx);
  const b = edgeId.slice(idx + 2);
  return a && b ? [a, b] : null;
}

/**
 * Deterministic diffusion update: redistribute pressure along eligible edges.
 * Uses stable ordering everywhere; updates state.front_pressure in place.
 *
 * @param state - Game state (mutated)
 * @param edges - Settlement adjacency edges (contact graph)
 * @param options - Optional overrides for fraction / maxOutflow
 */
export function diffusePressure(
  state: GameState,
  edges: ReadonlyArray<{ a: string; b: string }>,
  options?: DiffusePressureOptions
): { state: GameState; report: PhaseEPressureDiffusionReport } {
  const fraction = options?.fraction ?? DIFFUSE_FRACTION;
  const maxOutflow = options?.maxOutflow ?? DIFFUSE_MAX_OUTFLOW;

  const fp = state.front_pressure ?? {};
  if (typeof fp !== 'object') {
    return {
      state,
      report: {
        applied: false,
        reason_if_not_applied: 'no_pressure_field',
        stats: { nodes_with_outflow: 0, total_outflow: 0, total_inflow: 0, conserved_error_fix_applied: false }
      }
    };
  }

  const eligible = getEligiblePressureEdges(state, edges);
  if (eligible.length === 0) {
    return {
      state,
      report: {
        applied: false,
        reason_if_not_applied: 'no_eligible_edges',
        stats: { nodes_with_outflow: 0, total_outflow: 0, total_inflow: 0, conserved_error_fix_applied: false }
      }
    };
  }

  const edgeIds = (Object.keys(fp) as string[])
    .filter((k) => {
      const v = (fp as Record<string, { value?: unknown }>)[k];
      return v && typeof v === 'object' && typeof (v as { value: number }).value === 'number';
    })
    .sort(strictCompare);

  if (edgeIds.length === 0) {
    return {
      state,
      report: {
        applied: false,
        reason_if_not_applied: 'no_pressure',
        stats: { nodes_with_outflow: 0, total_outflow: 0, total_inflow: 0, conserved_error_fix_applied: false }
      }
    };
  }

  const frontNodes = new Set<string>();
  for (const eid of edgeIds) {
    const pair = parseEdgeId(eid);
    if (pair) {
      frontNodes.add(pair[0]);
      frontNodes.add(pair[1]);
    }
  }

  const eligibleSet = new Set(eligible.map((e) => toEdgeId(e.a, e.b)));
  const neighborWeights = new Map<string, Array<{ b: string; w: number }>>();
  for (const e of eligible) {
    const w = 1;
    if (w < DIFFUSE_EPS) continue;
    if (!frontNodes.has(e.a) || !frontNodes.has(e.b)) continue;
    if (!eligibleSet.has(toEdgeId(e.a, e.b))) continue;
    if (!neighborWeights.has(e.a)) neighborWeights.set(e.a, []);
    neighborWeights.get(e.a)!.push({ b: e.b, w });
    if (!neighborWeights.has(e.b)) neighborWeights.set(e.b, []);
    neighborWeights.get(e.b)!.push({ b: e.a, w });
  }

  const nodes = [...frontNodes].sort(strictCompare);
  const p: Record<string, number> = {};
  const pOld: Record<string, number> = {};
  const alloc: Record<string, Record<string, number>> = {};
  const incidentEdges: Record<string, string[]> = {};

  for (const a of nodes) {
    p[a] = 0;
    pOld[a] = 0;
    alloc[a] = {};
    incidentEdges[a] = [];
  }

  for (const eid of edgeIds) {
    const pair = parseEdgeId(eid);
    if (!pair) continue;
    const [a, b] = pair;
    const rec = (fp as Record<string, { value: number }>)[eid];
    const v = Math.abs(rec?.value ?? 0);
    const half = v / 2;
    p[a] += half;
    p[b] += half;
    pOld[a] += half;
    pOld[b] += half;
    incidentEdges[a].push(eid);
    incidentEdges[b].push(eid);
  }

  for (const a of nodes) {
    const tot = pOld[a];
    const inc = incidentEdges[a];
    if (tot <= 0 || inc.length === 0) continue;
    for (const eid of inc) {
      const pair = parseEdgeId(eid);
      if (!pair) continue;
      const rec = (fp as Record<string, { value: number }>)[eid];
      const v = Math.abs(rec?.value ?? 0);
      const half = v / 2;
      alloc[a][eid] = half / tot;
    }
  }

  const W: Record<string, number> = {};
  for (const a of nodes) {
    const list = neighborWeights.get(a) ?? [];
    let s = 0;
    for (const x of list) s += x.w;
    W[a] = s;
  }

  const outflow: Record<string, number> = {};
  const flow: Record<string, Record<string, number>> = {};
  for (const a of nodes) {
    outflow[a] = 0;
    flow[a] = {};
  }

  for (const a of nodes) {
    if ((W[a] ?? 0) <= DIFFUSE_EPS) continue;
    const out = Math.min(maxOutflow, fraction * (p[a] ?? 0));
    outflow[a] = out;
    const list = neighborWeights.get(a) ?? [];
    const wSum = W[a] ?? 0;
    for (const { b, w } of list) {
      flow[a][b] = wSum > 0 ? out * (w / wSum) : 0;
    }
  }

  const inflow: Record<string, number> = {};
  for (const a of nodes) inflow[a] = 0;
  for (const a of nodes) {
    const keys = Object.keys(flow[a]).sort(strictCompare);
    for (const b of keys) {
      inflow[b] = (inflow[b] ?? 0) + flow[a][b];
    }
  }

  let nodesWithOutflow = 0;
  let totalOutflow = 0;
  let totalInflow = 0;
  for (const a of nodes) {
    const o = outflow[a] ?? 0;
    if (o > 0) nodesWithOutflow += 1;
    totalOutflow += o;
    totalInflow += inflow[a] ?? 0;
  }

  const pNext: Record<string, number> = {};
  for (const a of nodes) {
    const next = (p[a] ?? 0) - (outflow[a] ?? 0) + (inflow[a] ?? 0);
    pNext[a] = Math.max(0, next);
  }

  let sumBefore = 0;
  let sumAfter = 0;
  for (const a of nodes) {
    sumBefore += p[a] ?? 0;
    sumAfter += pNext[a] ?? 0;
  }
  const err = Math.abs(sumAfter - sumBefore);
  let conservationFixApplied = false;
  if (err > CONSERVATION_TOL && nodes.length > 0) {
    const rem = sumBefore - sumAfter;
    const first = nodes[0]!;
    pNext[first] = Math.max(0, (pNext[first] ?? 0) + rem);
    conservationFixApplied = true;
  }

  const turn = state.meta?.turn ?? 0;
  type FpRec = { edge_id: string; value: number; max_abs: number; last_updated_turn: number };
  const roundedMap = new Map<string, number>();

  for (const eid of edgeIds) {
    const pair = parseEdgeId(eid);
    if (!pair) continue;
    const [a, b] = pair;
    const pa = pNext[a] ?? 0;
    const pb = pNext[b] ?? 0;
    const incA = incidentEdges[a] ?? [];
    const incB = incidentEdges[b] ?? [];
    const fa = alloc[a]?.[eid];
    const fb = alloc[b]?.[eid];
    const contribA =
      (pOld[a] ?? 0) > 0 && fa !== undefined ? fa * pa : incA.length > 0 ? pa / incA.length : 0;
    const contribB =
      (pOld[b] ?? 0) > 0 && fb !== undefined ? fb * pb : incB.length > 0 ? pb / incB.length : 0;
    const vNew = Math.max(0, contribA + contribB);
    roundedMap.set(eid, vNew);
  }

  let sumExact = 0;
  for (const v of roundedMap.values()) sumExact += v;
  const roundedArr = edgeIds.map((eid) => {
    const v = roundedMap.get(eid) ?? 0;
    return { eid, r: Math.round(v) };
  });
  let sumRounded = 0;
  for (const x of roundedArr) sumRounded += x.r;
  const diff = Math.round(sumExact) - sumRounded;
  if (diff !== 0 && roundedArr.length > 0) {
    const fix = roundedArr[0]!;
    roundedArr[0] = { eid: fix.eid, r: Math.max(0, fix.r + diff) };
    conservationFixApplied = true;
  }

  const fpWrite = state.front_pressure as Record<string, FpRec>;
  for (const { eid, r } of roundedArr) {
    const rec = fpWrite[eid];
    const prevMax = Math.abs(rec?.max_abs ?? 0);
    fpWrite[eid] = {
      edge_id: eid,
      value: r,
      max_abs: Math.max(prevMax, Math.abs(r)),
      last_updated_turn: turn
    };
  }

  return {
    state,
    report: {
      applied: nodesWithOutflow > 0 && totalOutflow > 0,
      reason_if_not_applied: nodesWithOutflow > 0 && totalOutflow > 0 ? '' : 'no_outflow',
      stats: {
        nodes_with_outflow: nodesWithOutflow,
        total_outflow: totalOutflow,
        total_inflow: totalInflow,
        conserved_error_fix_applied: conservationFixApplied
      }
    }
  };
}
