#!/usr/bin/env node

/**
 * Dev Runner: Minimal HTTP server exposing raw GameState
 * 
 * This is an engine adapter with no UI. It provides HTTP endpoints to:
 * - GET /state: return current GameState as JSON
 * - POST /step: advance exactly one turn via canonical turn pipeline
 * - POST /reset: restore initial scenario state
 * 
 * No game logic exists in this file. All mutations occur through the existing turn pipeline.
 * Determinism is preserved (no timestamps, no randomness).
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeTurn } from '../../src/turn/pipeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEV_RUNNER_ROOT = resolve(__dirname);
const REPO_ROOT = resolve(DEV_RUNNER_ROOT, '../..');
import { GameState, CURRENT_SCHEMA_VERSION, PostureLevel } from '../../src/state/game_state.js';
import { serializeState } from '../../src/state/serialize.js';
import { canonicalizePoliticalSideId } from '../../src/state/identity.js';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { prepareNewGameState } from '../../src/state/initialize_new_game_state.js';
import { getSettlementControlStatus } from '../../src/state/settlement_control.js';

// Mistake guard: ensure dev runner does not contain game logic

// Phase F6: canonical geometry source for political control viewer (same as substrate_viewer)
const SUBSTRATE_GEOJSON_PATH = 'data/derived/settlements_substrate.geojson';

// Cache settlement graph (loaded once, reused)
let cachedSettlementGraph: { settlements: Map<string, any>; edges: any[] } | null = null;

async function loadSettlementGraphOnce() {
  if (!cachedSettlementGraph) {
    try {
      cachedSettlementGraph = await loadSettlementGraph();
    } catch (error) {
      console.warn(`[Runner] Could not load settlement graph: ${error instanceof Error ? error.message : String(error)}`);
      cachedSettlementGraph = { settlements: new Map(), edges: [] };
    }
  }
  return cachedSettlementGraph;
}

// Minimal initial GameState. Settlement-first: AoR is optional overlay (Rulebook v0.2.6).
// No global AoR seeding. Optional dev-only scaffold: small deterministic front-active subset.
async function createInitialState(): Promise<GameState> {
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'dev-runner-seed' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };

  const CANONICAL_IDS = ['RBiH', 'RS', 'HRHB'] as const;
  const graph = await loadSettlementGraphOnce();
  const allIds = Array.from(graph.settlements.keys()).sort();

  // Factions always present; AoR may be empty. No requirement that AoR be non-empty.
  state.factions = CANONICAL_IDS.map((id) => ({
    id,
    profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
    areasOfResponsibility: [] as string[],
    supply_sources: [] as string[],
    negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }
  }));

  // Phase E2: Canonical political control init (idempotent; must happen before AoR seeding)
  try {
    await prepareNewGameState(state, graph);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Runner] Failed to initialize political controllers: ${errMsg}`);
    // Continue without political controllers (will fail validation, but allows server to start)
  }

  // Dev-only scaffold: small deterministic front-active AoR subset (first 6 by ID, 2 per faction).
  // Use only if we want to demonstrate front-active overlay; otherwise all AoRs stay empty.
  const SCAFFOLD_N = 6;
  if (allIds.length >= SCAFFOLD_N) {
    const a = allIds.slice(0, 2);
    const b = allIds.slice(2, 4);
    const c = allIds.slice(4, 6);
    const f0 = state.factions.find((f) => f.id === 'RBiH');
    const f1 = state.factions.find((f) => f.id === 'RS');
    const f2 = state.factions.find((f) => f.id === 'HRHB');
    if (f0) { f0.areasOfResponsibility = a; f0.supply_sources = a.slice(0, 1); }
    if (f1) { f1.areasOfResponsibility = b; f1.supply_sources = b.slice(0, 1); }
    if (f2) { f2.areasOfResponsibility = c; f2.supply_sources = c.slice(0, 1); }
  }

  return state;
}

// In-memory state storage (initialized asynchronously before server starts)
let currentState: GameState | null = null;
let initialState: GameState | null = null;

// Request logging (optional, off by default - can be enabled via env var)
const ENABLE_LOGGING = process.env.DEV_RUNNER_LOG === 'true';

function log(message: string): void {
  if (ENABLE_LOGGING) {
    console.log(`[dev-runner] ${message}`);
  }
}

// HTTP request handler
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  try {
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';

    // CORS headers for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle GET and OPTIONS immediately (no body needed)
    if (method === 'GET' || method === 'OPTIONS') {
      handleRequestWithBody(req, res, method, url, '');
      return;
    }
    
    // Parse request body for POST requests
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        handleRequestWithBody(req, res, method, url, body);
      } catch (error) {
        console.error(`[Runner] Error handling request: ${error instanceof Error ? error.message : String(error)}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    });
    
    req.on('error', (error) => {
      console.error(`[Runner] Request error: ${error.message}`);
    });
  } catch (error) {
    console.error(`[Runner] Error in request handler: ${error instanceof Error ? error.message : String(error)}`);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
}

function handleRequestWithBody(
  req: IncomingMessage,
  res: ServerResponse,
  method: string,
  url: string,
  body: string
): void {

  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /political_control.html, /political_control.js: static dev UI (Phase E3)
  if (method === 'GET' && (url === '/political_control.html' || url === '/political_control.js')) {
    const fileName = url.slice(1);
    const filePath = join(DEV_RUNNER_ROOT, 'public', fileName);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf8');
        const contentType = fileName.endsWith('.html') ? 'text/html' : 'application/javascript';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'FILE_READ_FAILED', message: String(err) }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
    return;
  }

  // GET /data/derived/data_index.json, /data/derived/settlements_substrate.geojson: contract-first viewer loading (Phase G3)
  if (method === 'GET' && (url === '/data/derived/data_index.json' || url === '/data/derived/settlements_substrate.geojson')) {
    const filePath = url === '/data/derived/data_index.json'
      ? join(REPO_ROOT, 'data', 'derived', 'data_index.json')
      : join(REPO_ROOT, 'data', 'derived', 'settlements_substrate.geojson');
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf8');
        const contentType = url.endsWith('.json') ? 'application/json' : 'application/geo+json';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'FILE_READ_FAILED', message: String(err) }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
    return;
  }

  // GET /api/substrate_geojson: canonical settlement substrate (same as substrate_viewer; Phase F6)
  if (method === 'GET' && url === '/api/substrate_geojson') {
    const geojsonPath = join(REPO_ROOT, SUBSTRATE_GEOJSON_PATH);
    if (existsSync(geojsonPath)) {
      try {
        const content = readFileSync(geojsonPath, 'utf8');
        res.setHeader('X-Geometry-Source', SUBSTRATE_GEOJSON_PATH);
        res.writeHead(200, { 'Content-Type': 'application/geo+json' });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'FILE_READ_FAILED', message: String(err) }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Substrate GeoJSON not found' }));
    }
    return;
  }

  // GET /settlements: canonical settlement list (independent of state init)
  if (method === 'GET' && url === '/settlements') {
    (async () => {
      try {
        const g = await loadSettlementGraphOnce();
        const ids = Array.from(g.settlements.keys()).sort();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ids }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'SETTLEMENTS_LOAD_FAILED', message: msg }));
        }
      }
    })();
    return;
  }

  // Ensure state is initialized
  if (!currentState || !initialState) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'State not yet initialized' }));
    return;
  }

  // GET /api/political_control: canonical control status per settlement via getSettlementControlStatus (Phase F5)
  if (method === 'GET' && url === '/api/political_control') {
    (async () => {
      try {
        const graph = await loadSettlementGraphOnce();
        const settlementIds = Array.from(graph.settlements.keys()).sort((a, b) => a.localeCompare(b));
        const counts = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
        const by_settlement_id: Record<string, string | null> = {};
        for (const sid of settlementIds) {
          const st = getSettlementControlStatus(currentState!, sid);
          const value = st.kind === 'unknown' ? null : st.side;
          const key = value === null ? 'null' : value;
          counts[key as keyof typeof counts] = (counts[key as keyof typeof counts] ?? 0) + 1;
          by_settlement_id[sid] = value;
        }
        const mun1990_by_sid: Record<string, string> = {};
        for (const sid of settlementIds) {
          const rec = graph.settlements.get(sid);
          const mun1990 = rec && typeof rec === 'object' && 'mun1990_id' in rec && typeof (rec as { mun1990_id?: string }).mun1990_id === 'string'
            ? (rec as { mun1990_id: string }).mun1990_id
            : '';
          mun1990_by_sid[sid] = mun1990;
        }
        const payload = {
          meta: {
            total_settlements: settlementIds.length,
            counts
          },
          by_settlement_id,
          mun1990_by_sid
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API_ERROR', message: msg }));
        }
      }
    })();
    return;
  }

  // GET /api/political_control_audit: deterministic invariants check (Phase F5)
  if (method === 'GET' && url === '/api/political_control_audit') {
    (async () => {
      try {
        if (!currentState) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'STATE_NOT_INITIALIZED', message: 'currentState is null' }));
          return;
        }
        const graph = await loadSettlementGraphOnce();
        const settlementIds = Array.from(graph.settlements.keys()).sort((a, b) => a.localeCompare(b));
        const counts = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
        const by_settlement_id: Record<string, string | null> = {};
        for (const sid of settlementIds) {
          const st = getSettlementControlStatus(currentState, sid);
          const value = st.kind === 'unknown' ? null : st.side;
          const key = value === null ? 'null' : value;
          counts[key as keyof typeof counts] = (counts[key as keyof typeof counts] ?? 0) + 1;
          by_settlement_id[sid] = value;
        }
        const total = settlementIds.length;
        const sumCounts = counts.RBiH + counts.RS + counts.HRHB + counts.null;
        const keysOk = Object.keys(by_settlement_id).length === total;
        const invariantSumOk = sumCounts === total && keysOk;
        if (!invariantSumOk) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'POLITICAL_CONTROL_AUDIT_FAILED',
            message: `Invariant violated: total=${total} sum_counts=${sumCounts} keys=${Object.keys(by_settlement_id).length}`,
            total,
            counts,
            sum_counts: sumCounts,
            invariant_sum_ok: false
          }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          total,
          counts,
          sum_counts: sumCounts,
          invariant_sum_ok: true
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API_ERROR', message: msg }));
        }
      }
    })();
    return;
  }

  // Route handling
  if (method === 'GET' && url === '/state') {
    log(`GET /state (turn ${currentState.meta.turn})`);
    // Task C: Wrap serialization in try/catch for robustness
    try {
      const serialized = serializeState(currentState);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(serialized);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Runner] State serialization failed: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        console.error(`[Runner] Stack trace:`, error.stack);
      }
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'STATE_SERIALIZE_FAILED', 
        message: errorMessage 
      }));
    }
    return;
  }

  if (method === 'POST' && url === '/step') {
    log(`POST /step (turn ${currentState.meta.turn} -> ${currentState.meta.turn + 1})`);
    try {
      // Advance exactly one turn via canonical turn pipeline
      currentState = executeTurn(currentState, { seed: currentState.meta.seed });
      // Task C: Wrap serialization in try/catch
      try {
        const serialized = serializeState(currentState);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(serialized);
      } catch (serializeError) {
        const errorMessage = serializeError instanceof Error ? serializeError.message : String(serializeError);
        console.error(`[Runner] State serialization failed in /step: ${errorMessage}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'STATE_SERIALIZE_FAILED', message: errorMessage }));
      }
    } catch (error) {
      log(`Error in /step: ${error instanceof Error ? error.message : String(error)}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
    return;
  }

  if (method === 'POST' && url === '/reset') {
    log(`POST /reset (restoring initial state)`);
    (async () => {
      try {
        const freshInitial = await createInitialState();
        initialState = freshInitial;
        currentState = JSON.parse(JSON.stringify(freshInitial)) as GameState;
        const serialized = serializeState(currentState);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(serialized);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Runner] Error re-seeding state on reset: ${errMsg}`);
        try {
          currentState = JSON.parse(JSON.stringify(initialState)) as GameState;
          const serialized = serializeState(currentState);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(serialized);
        } catch (fallbackErr) {
          const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'STATE_SERIALIZE_FAILED', message: fallbackMsg }));
          }
        }
      }
    })();
    return;
  }

  if (method === 'POST' && url === '/set_posture') {
    log(`POST /set_posture`);
    try {
      const payload = body ? JSON.parse(body) : {};
      const { faction_id, edge_id, posture, weight } = payload;
      
      // Validate required fields
      if (!faction_id || typeof faction_id !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or invalid faction_id' }));
        return;
      }
      if (!edge_id || typeof edge_id !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or invalid edge_id' }));
        return;
      }
      if (!posture || (posture !== 'hold' && posture !== 'probe' && posture !== 'push')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid posture (must be hold|probe|push)' }));
        return;
      }
      
      // Validate edge_id format (canonical a__b with a < b)
      const parts = edge_id.split('__');
      if (parts.length !== 2 || !parts[0] || !parts[1] || parts[0] >= parts[1]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid edge_id format (expected a__b with a < b)' }));
        return;
      }
      
      // Canonicalize faction ID
      const canonicalFaction = canonicalizePoliticalSideId(faction_id);
      
      // Ensure front_posture structure exists
      if (!currentState.front_posture || typeof currentState.front_posture !== 'object') {
        currentState.front_posture = {};
      }
      if (!currentState.front_posture[canonicalFaction]) {
        currentState.front_posture[canonicalFaction] = { assignments: {} };
      }
      if (!currentState.front_posture[canonicalFaction].assignments) {
        currentState.front_posture[canonicalFaction].assignments = {};
      }
      
      // Set posture assignment (takes effect on next turn)
      const postureWeight = Number.isInteger(weight) && weight >= 0 ? weight : 0;
      currentState.front_posture[canonicalFaction].assignments[edge_id] = {
        edge_id,
        posture: posture as PostureLevel,
        weight: postureWeight
      };
      
      log(`Set posture: faction=${canonicalFaction} edge=${edge_id} posture=${posture} weight=${postureWeight}`);
      // Task C: Wrap serialization in try/catch
      try {
        const serialized = serializeState(currentState);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(serialized);
      } catch (serializeError) {
        const errorMessage = serializeError instanceof Error ? serializeError.message : String(serializeError);
        console.error(`[Runner] State serialization failed in /set_posture: ${errorMessage}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'STATE_SERIALIZE_FAILED', message: errorMessage }));
      }
    } catch (error) {
      log(`Error in /set_posture: ${error instanceof Error ? error.message : String(error)}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
    return;
  }

  if (method === 'POST' && url === '/set_logistics_priority') {
    log(`POST /set_logistics_priority`);
    try {
      const payload = body ? JSON.parse(body) : {};
      const { faction_id, target_id, priority } = payload;
      
      // Validate required fields
      if (!faction_id || typeof faction_id !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or invalid faction_id' }));
        return;
      }
      if (!target_id || typeof target_id !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or invalid target_id' }));
        return;
      }
      if (typeof priority !== 'number' || priority <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid priority (must be > 0)' }));
        return;
      }
      
      // Canonicalize faction ID
      const canonicalFaction = canonicalizePoliticalSideId(faction_id);
      
      // Ensure logistics_priority structure exists
      if (!currentState.logistics_priority || typeof currentState.logistics_priority !== 'object') {
        currentState.logistics_priority = {};
      }
      if (!currentState.logistics_priority[canonicalFaction]) {
        currentState.logistics_priority[canonicalFaction] = {};
      }
      
      // Set logistics priority (takes effect on next turn)
      currentState.logistics_priority[canonicalFaction][target_id] = priority;
      
      log(`Set logistics priority: faction=${canonicalFaction} target=${target_id} priority=${priority}`);
      // Task C: Wrap serialization in try/catch
      try {
        const serialized = serializeState(currentState);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(serialized);
      } catch (serializeError) {
        const errorMessage = serializeError instanceof Error ? serializeError.message : String(serializeError);
        console.error(`[Runner] State serialization failed in /set_logistics_priority: ${errorMessage}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'STATE_SERIALIZE_FAILED', message: errorMessage }));
      }
    } catch (error) {
      log(`Error in /set_logistics_priority: ${error instanceof Error ? error.message : String(error)}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

// Create and start server (server starts immediately, state initializes async)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const server = createServer(handleRequest);

// Start server immediately (will return 503 if state not ready)
server.listen(PORT, () => {
  console.log(`Dev runner server listening on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /settlements          - Canonical settlement IDs (sorted)`);
  console.log(`  GET  /state                - Get current GameState`);
  console.log(`  POST /step                 - Advance one turn`);
  console.log(`  POST /reset                - Reset to initial state`);
  console.log(`  POST /set_posture          - Set posture for faction/edge (takes effect next turn)`);
  console.log(`  POST /set_logistics_priority - Set logistics priority for faction/target (takes effect next turn)`);
  console.log(`  GET  /api/political_control - Political controller per settlement (canonical ControlStatus)`);
  console.log(`  GET  /api/political_control_audit - Deterministic invariants audit`);
  console.log(`  Dev UI: http://localhost:${PORT}/political_control.html`);
  console.log(`\nSet DEV_RUNNER_LOG=true to enable request logging`);
  console.log(`[Runner] Substrate GeoJSON: ${SUBSTRATE_GEOJSON_PATH}`);
  console.log(`[Runner] Initializing state...`);
});

// Initialize state asynchronously (server already listening)
(async () => {
  try {
    const initial = await createInitialState();
    initialState = initial;
    currentState = JSON.parse(JSON.stringify(initial)) as GameState; // Clone for currentState
    console.log(`[Runner] ✓ Initialized state with ${initial.factions.length} factions`);
    initial.factions.forEach((f) => {
      console.log(`[Runner]   Faction ${f.id}: ${f.areasOfResponsibility.length} settlements`);
    });
  } catch (error) {
    console.error(`[Runner] ✗ Failed to initialize state: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`[Runner] Stack trace:`, error.stack);
    }
    // Don't exit - server keeps running, will return 503 until state is ready
    console.error(`[Runner] Server will return 503 until state initialization succeeds`);
  }
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down dev runner server...');
  server.close(() => {
    process.exit(0);
  });
});
