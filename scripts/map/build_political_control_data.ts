/**
 * Build static political control data for viewer when API is not available (e.g. http-server).
 * Same payload shape as GET /api/political_control. Deterministic, no timestamps.
 * Phase H3.10: Build from viewer settlement roster (substrate) so every displayed settlement
 * has a control record; ungraphed settlements get explicit flag and SID/mun defaults.
 *
 * Usage: npm run map:viewer:political-control-data
 * Output: data/derived/political_control_data.json
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { prepareNewGameState } from '../../src/state/initialize_new_game_state.js';
import { getSettlementControlStatus } from '../../src/state/settlement_control.js';
import { loadInitialMunicipalityControllers1990 } from '../../src/state/political_control_init.js';
import { MUN1990_IDS_ALIGNED_TO_RBIH, isMunicipalityAlignedToRbih } from '../../src/state/rbih_aligned_municipalities.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import type { GameState } from '../../src/state/game_state.js';

const FEATURES_ARRAY_START = '"features":[';
const FEATURES_MARKER = '"features":';

function findFeaturesArrayStart(buffer: string): number {
  const idx = buffer.indexOf(FEATURES_ARRAY_START);
  if (idx !== -1) return idx + FEATURES_ARRAY_START.length;
  const idx2 = buffer.indexOf(FEATURES_MARKER + ' [');
  if (idx2 !== -1) return idx2 + FEATURES_MARKER.length + 2;
  return -1;
}

function extractNextFeature(buffer: string, start: number): { objectString: string; nextIndex: number } | null {
  let pos = start;
  while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
  if (pos >= buffer.length || buffer[pos] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  const begin = pos;
  for (; pos < buffer.length; pos++) {
    const c = buffer[pos];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') {
      depth--;
      if (depth === 0) return { objectString: buffer.slice(begin, pos + 1), nextIndex: pos + 1 };
      continue;
    }
  }
  return null;
}

export interface RosterEntry {
  controlKey: string;
  sid: string;
  municipality_id: string;
  numeric_sid: string;
}

/** Phase H3.10: Stream viewer base dataset (substrate) to build settlement roster. */
async function streamViewerRoster(geojsonPath: string): Promise<RosterEntry[]> {
  const roster: RosterEntry[] = [];
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let featuresStart = -1;
    let pos = 0;
    let resolved = false;
    const finish = (): void => {
      if (!resolved) {
        resolved = true;
        roster.sort((a, b) => a.controlKey.localeCompare(b.controlKey));
        resolvePromise(roster);
      }
    };
    const processBuffer = (): void => {
      if (featuresStart === -1) {
        featuresStart = findFeaturesArrayStart(buffer);
        if (featuresStart === -1) return;
        pos = featuresStart;
      }
      while (pos < buffer.length) {
        const extracted = extractNextFeature(buffer, pos);
        if (!extracted) return;
        pos = extracted.nextIndex;
        try {
          const feature = JSON.parse(extracted.objectString) as { id?: string; properties?: Record<string, unknown> };
          const props = feature?.properties ?? {};
          const sidRaw = props.sid ?? feature?.id;
          if (sidRaw == null) continue;
          let numeric_sid: string;
          if (typeof sidRaw === 'string' && /^S\d+$/.test(sidRaw)) {
            numeric_sid = sidRaw.slice(1);
          } else if (typeof sidRaw === 'string' && sidRaw.includes(':')) {
            numeric_sid = sidRaw.split(':')[1] ?? String(sidRaw).replace(/^S/i, '');
          } else {
            numeric_sid = String(sidRaw).replace(/^S/i, '');
          }
          const munId = props.municipality_id ?? props.mun1990_id ?? props.mun1990_municipality_id ?? props.opstina_id ?? props.muni_id;
          if (munId == null || typeof munId !== 'string') continue;
          const municipality_id = String(munId).trim();
          const controlKey = `${municipality_id}:${numeric_sid}`;
          const sid = typeof sidRaw === 'string' ? sidRaw : `S${numeric_sid}`;
          roster.push({ controlKey, sid, municipality_id, numeric_sid });
        } catch {
          /* skip malformed */
        }
        while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
        if (pos < buffer.length && buffer[pos] === ']') {
          finish();
          return;
        }
      }
    };
    const stream = createReadStream(geojsonPath, { encoding: 'utf8', highWaterMark: 256 * 1024 });
    stream.on('data', (chunk: string) => { buffer += chunk; processBuffer(); });
    stream.on('end', () => { processBuffer(); finish(); });
    stream.on('error', rejectPromise);
  });
}

async function main(): Promise<void> {
  const controlKeyArg = process.argv.find((a) => a.startsWith('--control-key='))?.split('=')[1]?.trim();
  const outPath = controlKeyArg
    ? resolve('data/derived', `political_control_data_${controlKeyArg}.json`)
    : resolve('data/derived/political_control_data.json');
  const derivedDir = resolve('data/derived');
  const useWgs84 = process.argv.includes('--wgs84');
  const substratePath = useWgs84
    ? resolve(derivedDir, 'settlements_wgs84_1990.geojson')
    : resolve(derivedDir, 'settlements_substrate.geojson');
  mkdirSync(derivedDir, { recursive: true });

  const graph = await loadSettlementGraph();
  // Graph is keyed by S-prefixed sid (e.g. S100013). Use sid for membership and state lookup so ethnic init is applied.
  const graphKeys = new Set(graph.settlements.keys());
  const initialMunControllers = await loadInitialMunicipalityControllers1990();

  // Phase H3.10: Roster = all settlements in viewer base dataset (substrate or WGS84)
  if (!existsSync(substratePath)) {
    process.stderr.write(`FAIL: Viewer roster source not found: ${substratePath}\n`);
    process.exit(1);
  }
  let roster = await streamViewerRoster(substratePath);
  // WGS84: graph keys are sid (S100013); use sid as controlKey so lookups match
  if (useWgs84) {
    roster = roster.map((e) => ({ ...e, controlKey: e.sid }));
  }
  const total_settlements_roster = roster.length;
  const total_in_graph = roster.filter((e) => graphKeys.has(e.sid.startsWith('S') ? e.sid : `S${e.sid}`)).length;
  const total_ungraphed = total_settlements_roster - total_in_graph;

  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'political-control-data-seed' },
    factions: [
      { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null } },
      { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null } },
      { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null } }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };

  // Default baseline = settlement-level control from 1991 ethnic majority (ethnic_1991), with
  // RBiH-aligned municipality overrides (Croatian-majority in those muns → RBiH). Graph is keyed
  // by S-prefixed sid; roster may use controlKey (mun:id) or sid—use sid for state lookup so ethnic init applies.
  await prepareNewGameState(state, graph, undefined, { init_control_mode: 'ethnic_1991' });

  // Phase H3.10: mun1990_names for ungraphed mun1990_id lookup (mun normalizations)
  let mun1990Names: { by_municipality_id?: Record<string, { mun1990_id?: string }> } = {};
  const mun1990NamesPath = resolve(derivedDir, 'mun1990_names.json');
  if (existsSync(mun1990NamesPath)) {
    mun1990Names = JSON.parse(readFileSync(mun1990NamesPath, 'utf8')) as typeof mun1990Names;
  }

  const counts = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
  const by_settlement_id: Record<string, string | null> = {};
  const mun1990_by_sid: Record<string, string> = {};
  const ungraphed_settlement_ids: string[] = [];

  // Load municipality control_status (SECURE | CONTESTED | HIGHLY_CONTESTED) for contested overlay in map UIs
  type ControlStatusRow = { mun1990_id: string; control_status: string };
  const controlStatusByMun1990: Record<string, string> = {};
  const munControlStatusPath = resolve('data/source/municipalities_initial_control_status.json');
  if (existsSync(munControlStatusPath)) {
    const munControl = JSON.parse(readFileSync(munControlStatusPath, 'utf8')) as { rows?: ControlStatusRow[] };
    for (const row of munControl?.rows ?? []) {
      if (row.mun1990_id && row.control_status) {
        controlStatusByMun1990[row.mun1990_id] = row.control_status;
      }
    }
  }

  for (const entry of roster) {
    const { controlKey, sid, municipality_id } = entry;
    const sidForGraph = sid.startsWith('S') ? sid : `S${sid}`;
    let value: string | null;
    let mun1990 = '';
    if (graphKeys.has(sidForGraph)) {
      const st = getSettlementControlStatus(state, sidForGraph);
      value = st.kind === 'unknown' ? null : st.side;
      const rec = graph.settlements.get(sidForGraph);
      mun1990 = rec && typeof rec === 'object' && 'mun1990_id' in rec && typeof (rec as { mun1990_id?: string }).mun1990_id === 'string'
        ? (rec as { mun1990_id: string }).mun1990_id
        : '';
    } else {
      ungraphed_settlement_ids.push(controlKey);
      mun1990 = mun1990Names.by_municipality_id?.[municipality_id]?.mun1990_id ?? '';
      value = mun1990 ? (initialMunControllers[mun1990] ?? null) : null;
    }
    by_settlement_id[controlKey] = value;
    const key = value === null ? 'null' : value;
    counts[key as keyof typeof counts] = (counts[key as keyof typeof counts] ?? 0) + 1;
    if (mun1990) {
      mun1990_by_sid[controlKey] = mun1990;
      mun1990_by_sid[sid] = mun1990;
    }
  }

  // Ensure no null baseline control values: first by municipality majority, then deterministic fallback.
  for (const entry of roster) {
    const key = entry.controlKey;
    if (by_settlement_id[key] !== null) continue;
    const mun1990 = mun1990_by_sid[key] ?? mun1990_by_sid[entry.sid];
    const sameMunControllers = roster
      .filter((r) => (mun1990_by_sid[r.controlKey] ?? mun1990_by_sid[r.sid]) === mun1990)
      .map((r) => by_settlement_id[r.controlKey])
      .filter((v): v is string => v !== null);
    if (sameMunControllers.length > 0) {
      const tally = new Map<string, number>();
      for (const side of sameMunControllers) tally.set(side, (tally.get(side) ?? 0) + 1);
      const chosen = ['RBiH', 'RS', 'HRHB']
        .map((side) => ({ side, count: tally.get(side) ?? 0 }))
        .sort((a, b) => (b.count - a.count) || a.side.localeCompare(b.side))[0];
      by_settlement_id[key] = chosen.side;
      continue;
    }
    if (mun1990 && initialMunControllers[mun1990] && initialMunControllers[mun1990] !== null) {
      by_settlement_id[key] = initialMunControllers[mun1990];
      continue;
    }
    by_settlement_id[key] = 'RBiH';
  }

  // Recount after non-null coercion.
  counts.RBiH = 0;
  counts.RS = 0;
  counts.HRHB = 0;
  counts.null = 0;
  for (const v of Object.values(by_settlement_id)) {
    const k = v === null ? 'null' : v;
    counts[k as keyof typeof counts] += 1;
  }

  // Optional: overwrite control from scenario mun1990 file (e.g. September 1992)
  if (controlKeyArg === 'sep1992') {
    const sep1992Path = resolve('data/source/municipalities_1990_initial_political_controllers_sep1992.json');
    if (!existsSync(sep1992Path)) {
      process.stderr.write(`FAIL: Sep 1992 control file not found: ${sep1992Path}\n`);
      process.exit(1);
    }
    const sep1992 = JSON.parse(readFileSync(sep1992Path, 'utf8')) as { controllers_by_mun1990_id?: Record<string, string> };
    const ctrl = sep1992.controllers_by_mun1990_id ?? {};
    const newCounts = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
    for (const entry of roster) {
      const mun1990 = mun1990_by_sid[entry.controlKey] ?? mun1990_by_sid[entry.sid];
      const value = (mun1990 && ctrl[mun1990]) ? ctrl[mun1990] as string : ((mun1990 && initialMunControllers[mun1990]) ? initialMunControllers[mun1990] : 'RBiH');
      by_settlement_id[entry.controlKey] = value;
      const key = value === null ? 'null' : value;
      newCounts[key as keyof typeof newCounts]++;
    }
    counts.RBiH = newCounts.RBiH;
    counts.RS = newCounts.RS;
    counts.HRHB = newCounts.HRHB;
    counts.null = newCounts.null;
    process.stdout.write(`Sep 1992 control: RBiH=${counts.RBiH} RS=${counts.RS} HRHB=${counts.HRHB} null=${counts.null}\n`);
  }

  // Build control_status_by_settlement_id for contested overlay (canonical artifact for map UIs)
  const control_status_by_settlement_id: Record<string, string> = {};
  for (const entry of roster) {
    const mun1990 = mun1990_by_sid[entry.controlKey];
    const status = mun1990 ? controlStatusByMun1990[mun1990] : undefined;
    if (status) control_status_by_settlement_id[entry.controlKey] = status;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Phase H3.3 + H3.8: Municipality-scoped political control normalization (skip for scenario keys e.g. sep1992).
  // RBiH-aligned muns (Maglaj, Bihać, Gradačac, Brčko, Tuzla, Lopare, Srebrenik, Tešanj) + other overrides.
  const MUN_NORMALIZATIONS: Record<string, string> = controlKeyArg
    ? {}
    : {
        vares: 'RBiH',
        cazin: 'RBiH',
        novi_grad_sarajevo: 'RBiH',
        novo_sarajevo: 'RBiH',
        stari_grad_sarajevo: 'RBiH',
        banovici: 'RBiH',
        ...Object.fromEntries(MUN1990_IDS_ALIGNED_TO_RBIH.map((m) => [m, 'RBiH'])),
      };

  const rosterKeys = roster.map((e) => e.controlKey);
  const before_counts = { ...counts };
  let overridden_count = 0;
  const affected_municipalities = new Set<string>();

  if (!controlKeyArg) {
  for (const controlKey of rosterKeys) {
    const mun1990 = mun1990_by_sid[controlKey];
    if (mun1990 && MUN_NORMALIZATIONS[mun1990]) {
      const before_value = by_settlement_id[controlKey];
      const after_value = MUN_NORMALIZATIONS[mun1990];
      // RBiH-aligned muns (Brčko, Bihać, etc.): only HRHB → RBiH; Serb-majority (RS) stays RS.
      const onlyIfHrhb = isMunicipalityAlignedToRbih(mun1990);
      const shouldOverride = onlyIfHrhb
        ? before_value === 'HRHB'
        : before_value !== after_value;
      if (shouldOverride) {
        by_settlement_id[controlKey] = after_value;
        const before_key = before_value === null ? 'null' : before_value;
        const after_key = after_value;
        counts[before_key as keyof typeof counts]--;
        counts[after_key as keyof typeof counts]++;
        overridden_count++;
        affected_municipalities.add(mun1990);
      }
    }
  }

  // Phase H3.8: Banovići by post1995 code (10014) — graph may still have mun1990_id banja_luka until remap is applied
  const BANOVICI_POST1995 = '10014';
  for (const entry of roster) {
    if (entry.municipality_id === BANOVICI_POST1995) {
      const controlKey = entry.controlKey;
      const before_value = by_settlement_id[controlKey];
      if (before_value !== 'RBiH') {
        by_settlement_id[controlKey] = 'RBiH';
        if (before_value !== null) counts[before_value as keyof typeof counts]--;
        counts.RBiH++;
      }
    }
  }
  }

  // Phase H3.8 + H3.9: Settlement-level overrides (take precedence over municipality default) — skip for scenario keys
  const SETTLEMENT_OVERRIDES: Record<string, string> = controlKeyArg ? {} : {
    // Phase H3.8 originals
    '209244': 'RS',
    '219223': 'RS',
    '130478': 'HRHB',
    '138487': 'HRHB',
    '170046': 'RBiH',
    '166138': 'RBiH',
    '164984': 'RBiH',
    '209457': 'RS',
    '209449': 'RS',
    // Phase H3.9 additions
    '170666': 'RBiH',
    '219371': 'RS',
    '104175': 'RBiH',
    '104418': 'RBiH',
    '104523': 'RBiH',
    '104353': 'RBiH',
    '104167': 'RBiH',
    '104345': 'RBiH',
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Phase H3.9: Settlement municipality_id overrides (Stari Grad -> Novo Sarajevo)
  // ────────────────────────────────────────────────────────────────────────────
  // Municipality IDs discovered from mun1990_names.json:
  //   - Novo Sarajevo: post1995_code = "11568", mun1990_id = "novo_sarajevo"
  //   - Stari Grad Sarajevo: post1995_code = "11584", mun1990_id = "stari_grad_sarajevo"
  // These settlements at mun_code 20214 ("Istocno Novo Sarajevo") are remapped to Novo Sarajevo.
  // The viewer uses municipality_id for display lookup, so we override it here.
  const NOVO_SARAJEVO_MUNICIPALITY_ID = '11568';
  const STARI_GRAD_SARAJEVO_MUNICIPALITY_ID_CURRENT = '20214'; // Current (incorrect) municipality_id
  const SETTLEMENT_MUNICIPALITY_OVERRIDES: Record<string, string> = {
    // Remap from Stari Grad Sarajevo (20214) to Novo Sarajevo (11568)
    '209538': NOVO_SARAJEVO_MUNICIPALITY_ID,
    '209520': NOVO_SARAJEVO_MUNICIPALITY_ID,
    '209554': NOVO_SARAJEVO_MUNICIPALITY_ID,
    '209503': NOVO_SARAJEVO_MUNICIPALITY_ID,
    '209546': NOVO_SARAJEVO_MUNICIPALITY_ID,
    '209562': NOVO_SARAJEVO_MUNICIPALITY_ID,
    '166138': NOVO_SARAJEVO_MUNICIPALITY_ID,
  };

  if (!controlKeyArg) {
  for (const entry of roster) {
    const sourceId = entry.numeric_sid;
    if (SETTLEMENT_OVERRIDES[sourceId]) {
      const controlKey = entry.controlKey;
      const before_value = by_settlement_id[controlKey];
      const after_value = SETTLEMENT_OVERRIDES[sourceId];
      if (before_value !== after_value) {
        by_settlement_id[controlKey] = after_value;
        const before_key = before_value === null ? 'null' : before_value;
        counts[before_key as keyof typeof counts]--;
        counts[after_value as keyof typeof counts]++;
      }
    }
  }
  }

  // Phase H3.9: Build municipality_id_by_sid for settlements that need municipality override
  // This allows the viewer to display the correct municipality name for remapped settlements
  const municipality_id_by_sid: Record<string, string> = {};
  let municipality_overrides_applied = 0;
  if (!controlKeyArg) {
  for (const entry of roster) {
    const sourceId = entry.numeric_sid;
    if (SETTLEMENT_MUNICIPALITY_OVERRIDES[sourceId]) {
      const controlKey = entry.controlKey;
      municipality_id_by_sid[controlKey] = SETTLEMENT_MUNICIPALITY_OVERRIDES[sourceId];
      municipality_id_by_sid[entry.sid] = SETTLEMENT_MUNICIPALITY_OVERRIDES[sourceId];
      municipality_overrides_applied++;
      // Also ensure these settlements have RBiH control (Novo Sarajevo is RBiH)
      if (by_settlement_id[controlKey] !== 'RBiH') {
        const before_value = by_settlement_id[controlKey];
        by_settlement_id[controlKey] = 'RBiH';
        const before_key = before_value === null ? 'null' : before_value;
        counts[before_key as keyof typeof counts]--;
        counts.RBiH++;
      }
    }
  }
  }
  if (municipality_overrides_applied > 0) {
    process.stdout.write(`\nPhase H3.9: Applied ${municipality_overrides_applied} settlement municipality_id overrides (Stari Grad -> Novo Sarajevo)\n`);
  }

  // Log normalization summary (deterministic)
  if (overridden_count > 0) {
    process.stdout.write('\n──────────────────────────────────────────────────────────────\n');
    process.stdout.write('Political Control Normalization Summary (Phase H3.3 / H3.8)\n');
    process.stdout.write('──────────────────────────────────────────────────────────────\n');
    process.stdout.write(`Overridden settlements (mun): ${overridden_count}\n`);
    process.stdout.write(`Affected municipalities: ${Array.from(affected_municipalities).sort().join(', ')}\n`);
    process.stdout.write('\nBefore normalization:\n');
    process.stdout.write(`  RBiH: ${before_counts.RBiH}, RS: ${before_counts.RS}, HRHB: ${before_counts.HRHB}, null: ${before_counts.null}\n`);
    process.stdout.write('After normalization + settlement overrides:\n');
    process.stdout.write(`  RBiH: ${counts.RBiH}, RS: ${counts.RS}, HRHB: ${counts.HRHB}, null: ${counts.null}\n`);
    process.stdout.write('──────────────────────────────────────────────────────────────\n\n');
  }

  const normalizations_applied = Array.from(affected_municipalities)
    .sort()
    .map(mun => `mun1990:${mun}->${MUN_NORMALIZATIONS[mun]}`);

  // Phase H3.10: Summary stats (deterministic)
  process.stdout.write(`Phase H3.10: total_settlements_roster=${total_settlements_roster} total_in_graph=${total_in_graph} total_ungraphed=${total_ungraphed} control_missing_keys=0\n`);

  // Phase H3.8: Deterministic validation — required municipalities and SIDs (skip for scenario keys)
  if (!controlKeyArg) {
  const REQUIRED_MUN_1990: string[] = ['cazin', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo', 'banovici'];
  const BANOVICI_POST1995_VAL = '10014';
  const banoviciRoster = roster.filter((e) => e.municipality_id === BANOVICI_POST1995_VAL);
  for (const entry of banoviciRoster) {
    if (by_settlement_id[entry.controlKey] !== 'RBiH') {
      process.stderr.write(`FAIL: Banovići (10014) settlement ${entry.controlKey} expected RBiH, got ${by_settlement_id[entry.controlKey]}\n`);
      process.exitCode = 1;
    }
  }
  const REQUIRED_SID_CONTROLLERS: Array<{ sourceId: string; controller: string }> = [
    // Phase H3.8 originals
    { sourceId: '209244', controller: 'RS' },
    { sourceId: '219223', controller: 'RS' },
    { sourceId: '130478', controller: 'HRHB' },
    { sourceId: '138487', controller: 'HRHB' },
    { sourceId: '170046', controller: 'RBiH' },
    { sourceId: '166138', controller: 'RBiH' },
    { sourceId: '164984', controller: 'RBiH' },
    { sourceId: '209457', controller: 'RS' },
    { sourceId: '209449', controller: 'RS' },
    // Phase H3.9 additions
    { sourceId: '170666', controller: 'RBiH' },
    { sourceId: '219371', controller: 'RS' },
    { sourceId: '104175', controller: 'RBiH' },
    { sourceId: '104418', controller: 'RBiH' },
    { sourceId: '104523', controller: 'RBiH' },
    { sourceId: '104353', controller: 'RBiH' },
    { sourceId: '104167', controller: 'RBiH' },
    { sourceId: '104345', controller: 'RBiH' },
    // Phase H3.9 Novo Sarajevo remapped settlements (all RBiH)
    { sourceId: '209538', controller: 'RBiH' },
    { sourceId: '209520', controller: 'RBiH' },
    { sourceId: '209554', controller: 'RBiH' },
    { sourceId: '209503', controller: 'RBiH' },
    { sourceId: '209546', controller: 'RBiH' },
    { sourceId: '209562', controller: 'RBiH' },
  ];

  for (const mun1990 of REQUIRED_MUN_1990) {
    const inMun = roster.filter((e) => mun1990_by_sid[e.controlKey] === mun1990 || mun1990_by_sid[e.sid] === mun1990);
    const nullInMun = inMun.filter((e) => by_settlement_id[e.controlKey] == null);
    if (nullInMun.length > 0) {
      process.stderr.write(`FAIL: Municipality ${mun1990} has ${nullInMun.length} settlements with null control (e.g. ${nullInMun.slice(0, 3).map((e) => e.controlKey).join(', ')})\n`);
      process.exitCode = 1;
    }
  }
  for (const { sourceId, controller } of REQUIRED_SID_CONTROLLERS) {
    const entry = roster.find((e) => e.numeric_sid === sourceId);
    if (!entry) {
      process.stdout.write(`Note: Settlement source_id ${sourceId} not in roster (skipping override validation)\n`);
      continue;
    }
    if (by_settlement_id[entry.controlKey] !== controller) {
      process.stderr.write(`FAIL: Settlement ${sourceId} expected controller ${controller}, got ${by_settlement_id[entry.controlKey]}\n`);
      process.exitCode = 1;
    }
  }
  // Phase H3.10: null count may increase due to ungraphed settlements; no fail on that.

  // Phase H3.9: Validate municipality_id overrides
  const REQUIRED_MUNICIPALITY_OVERRIDES: Array<{ sourceId: string; municipality_id: string }> = [
    { sourceId: '209538', municipality_id: NOVO_SARAJEVO_MUNICIPALITY_ID },
    { sourceId: '209520', municipality_id: NOVO_SARAJEVO_MUNICIPALITY_ID },
    { sourceId: '209554', municipality_id: NOVO_SARAJEVO_MUNICIPALITY_ID },
    { sourceId: '209503', municipality_id: NOVO_SARAJEVO_MUNICIPALITY_ID },
    { sourceId: '209546', municipality_id: NOVO_SARAJEVO_MUNICIPALITY_ID },
    { sourceId: '209562', municipality_id: NOVO_SARAJEVO_MUNICIPALITY_ID },
    { sourceId: '166138', municipality_id: NOVO_SARAJEVO_MUNICIPALITY_ID },
  ];
  for (const { sourceId, municipality_id } of REQUIRED_MUNICIPALITY_OVERRIDES) {
    const entry = roster.find((e) => e.numeric_sid === sourceId);
    if (!entry) {
      process.stdout.write(`Note: Settlement source_id ${sourceId} not in roster (skipping municipality override validation)\n`);
      continue;
    }
    const overrideMun = municipality_id_by_sid[entry.controlKey] ?? municipality_id_by_sid[entry.sid];
    if (overrideMun !== municipality_id) {
      process.stderr.write(`FAIL: Settlement ${sourceId} expected municipality_id ${municipality_id}, got ${overrideMun ?? 'undefined'}\n`);
      process.exitCode = 1;
    }
  }
  }

  if (process.exitCode === 1) process.exit(1);

  const payload = {
    meta: {
      total_settlements: roster.length,
      total_settlements_roster,
      total_in_graph,
      total_ungraphed,
      control_missing_keys: 0,
      counts,
      normalizations_applied: normalizations_applied.length > 0 ? normalizations_applied : undefined,
      municipality_overrides_count: municipality_overrides_applied > 0 ? municipality_overrides_applied : undefined,
    },
    by_settlement_id,
    mun1990_by_sid,
    // Canonical contested overlay: SECURE | CONTESTED | HIGHLY_CONTESTED per settlement (from municipalities_initial_control_status)
    control_status_by_settlement_id: Object.keys(control_status_by_settlement_id).length > 0 ? control_status_by_settlement_id : undefined,
    // Phase H3.9: Municipality ID overrides for settlements remapped to Novo Sarajevo
    municipality_id_by_sid: municipality_overrides_applied > 0 ? municipality_id_by_sid : undefined,
    // Phase H3.10: Control keys in viewer roster but not in settlement graph (ungraphed)
    ungraphed_settlement_ids: ungraphed_settlement_ids.length > 0 ? ungraphed_settlement_ids.sort() : undefined,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  process.stdout.write(`Wrote ${outPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
