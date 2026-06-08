#!/usr/bin/env node
/**
 * v0.9.0 consequence substrate inventory.
 *
 * Read-only diagnostic for the consequence-system refresh C1 packet. It scans
 * authored event JSON and reports which consequence-capable effect substrates
 * are present, which factions they touch, and which engine/UI owner currently
 * consumes the state they write.
 *
 * Usage:
 *   node tools/diagnostics/consequence_substrate_inventory.cjs [--json] [events_dir]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_EVENTS_DIR = path.join(process.cwd(), 'data', 'scenarios', 'events');
const FACTIONS = ['HRHB', 'RBiH', 'RS'];

const SUBSTRATE_OWNERS = {
  aggression_modifier: {
    class: 'mechanical',
    writer: 'applyEventEffects -> state.military.active_modifiers',
    consumer: 'commander/directive aggression modifier readers',
    status: 'live',
  },
  alliance_change: {
    class: 'mechanical',
    writer: 'applyEventEffects -> political alliance state',
    consumer: 'alliance / Washington Agreement / HRHB-RBiH transition logic',
    status: 'live',
  },
  alliance_lock: {
    class: 'mechanical',
    writer: 'applyEventEffects -> state.military.alliance_locks',
    consumer: 'alliance_change clamp via active_modifiers',
    status: 'live',
  },
  bot_priority_shift: {
    class: 'mechanical',
    writer: 'applyEventEffects -> state.military.bot_priority_shifts',
    consumer: 'bot strategy objective accessor',
    status: 'live',
  },
  cohesion_change: {
    class: 'mechanical',
    writer: 'applyEventEffects -> active formations cohesion',
    consumer: 'combat / command quality surfaces',
    status: 'live',
  },
  control_change: {
    class: 'mechanical',
    writer: 'applyEventEffects -> political controllers',
    consumer: 'map/control/termination surfaces',
    status: 'live',
  },
  cost_ledger_annotation: {
    class: 'narrative',
    writer: 'applyEventEffects -> state.military.cost_ledger_annotations',
    consumer: 'buildCostLedger narrative findings',
    status: 'live-reader',
  },
  doctrine_constraint: {
    class: 'mechanical',
    writer: 'applyEventEffects -> state.military.event_constraints',
    consumer: 'operation blocking / doctrine override / scope filters',
    status: 'live',
  },
  equipment_grant: {
    class: 'mechanical',
    writer: 'applyEventEffects -> equipment pools',
    consumer: 'equipment and combat readiness state',
    status: 'live',
  },
  equipment_quality_modifier: {
    class: 'mechanical',
    writer: 'applyEventEffects -> active equipment quality modifiers',
    consumer: 'combat_math attacker/defender power readers',
    status: 'live',
  },
  guerrilla_threat: {
    class: 'mechanical',
    writer: 'applyEventEffects -> state.military.guerrilla_threats',
    consumer: 'applyGuerrillaAttrition via getActiveGuerrillaThreatIntensity',
    status: 'live',
  },
  humanitarian_impact: {
    class: 'mechanical',
    writer: 'applyEventEffects -> faction humanitarian counters',
    consumer: 'Cost Ledger / verdict / war-crimes surfaces',
    status: 'live',
  },
  morale_change: {
    class: 'mechanical',
    writer: 'applyEventEffects -> active formations morale',
    consumer: 'combat / dissolution / command surfaces',
    status: 'live',
  },
  narrative: {
    class: 'reader-only',
    writer: 'event fire log',
    consumer: 'Chronicle / event log / Codex context',
    status: 'live',
  },
  negotiation_capital: {
    class: 'mechanical',
    writer: 'applyEventEffects -> negotiation capital',
    consumer: 'treaty acceptance / endgame negotiation surfaces',
    status: 'live',
  },
  offensive_ops_suppression: {
    class: 'mechanical',
    writer: 'applyEventEffects -> state.military.offensive_ops_suppressions',
    consumer: 'sector_offensive launch-gate via isFactionOffensiveOpsSuppressed',
    status: 'live',
  },
  patron_pressure: {
    class: 'mechanical',
    writer: 'applyEventEffects -> patron pressure',
    consumer: 'political logic / event pressure / briefing surfaces',
    status: 'live',
  },
  recruitment_modifier: {
    class: 'mechanical',
    writer: 'applyEventEffects -> active recruitment modifiers',
    consumer: 'ongoing_mobilization via getActiveRecruitmentMultiplier',
    status: 'live',
  },
  supply_delta: {
    class: 'mechanical',
    writer: 'applyEventEffects -> faction supply profile',
    consumer: 'supply and command surfaces',
    status: 'live',
  },
};

function strictCompare(a, b) {
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listEventFiles(eventsDir) {
  return fs.readdirSync(eventsDir)
    .filter((name) => name.endsWith('.json'))
    .sort(strictCompare)
    .map((name) => path.join(eventsDir, name));
}

function eventArrayFromFile(filePath) {
  const raw = readJson(filePath);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.events)) return raw.events;
  return [];
}

function collectEventFiles(eventsDir) {
  const rows = [];
  for (const filePath of listEventFiles(eventsDir)) {
    const file = path.basename(filePath);
    for (const event of eventArrayFromFile(filePath)) {
      if (event && typeof event === 'object') {
        rows.push({ file, event });
      }
    }
  }
  return rows.sort((a, b) => strictCompare(String(a.event.id || ''), String(b.event.id || '')));
}

function collectEffects(event) {
  const out = [];
  if (event.effect) out.push({ source: 'primary', effect: event.effect });
  for (const effect of asArray(event.effects)) out.push({ source: 'additional', effect });
  for (const response of asArray(event.responses)) {
    const responseId = String(response && response.id || 'response');
    for (const effect of asArray(response && response.effects)) {
      out.push({ source: `response:${responseId}`, effect });
    }
  }
  return out.filter((row) => row.effect && typeof row.effect.kind === 'string');
}

function initKindCell(kind) {
  const owner = SUBSTRATE_OWNERS[kind] || {
    class: 'unknown',
    writer: 'unknown',
    consumer: 'unknown',
    status: 'unknown',
  };
  return {
    kind,
    class: owner.class,
    status: owner.status,
    writer: owner.writer,
    consumer: owner.consumer,
    event_count: 0,
    effect_count: 0,
    files: [],
    factions: {},
    example_events: [],
  };
}

function pushUniqueSorted(list, value) {
  const text = String(value || '');
  if (text && !list.includes(text)) {
    list.push(text);
    list.sort(strictCompare);
  }
}

function buildInventory(eventsDir = DEFAULT_EVENTS_DIR) {
  const eventRows = collectEventFiles(eventsDir);
  const byKind = new Map();
  const eventIdsByKind = new Map();

  for (const { file, event } of eventRows) {
    const eventId = String(event.id || '');
    for (const { effect } of collectEffects(event)) {
      const kind = String(effect.kind);
      if (!byKind.has(kind)) byKind.set(kind, initKindCell(kind));
      const cell = byKind.get(kind);
      cell.effect_count += 1;
      pushUniqueSorted(cell.files, file);
      if (effect.faction) {
        const faction = String(effect.faction);
        cell.factions[faction] = (cell.factions[faction] || 0) + 1;
      }
      if (!eventIdsByKind.has(kind)) eventIdsByKind.set(kind, new Set());
      eventIdsByKind.get(kind).add(eventId);
      if (cell.example_events.length < 5 && eventId && !cell.example_events.includes(eventId)) {
        cell.example_events.push(eventId);
      }
    }
  }

  const kinds = Array.from(byKind.keys()).sort(strictCompare);
  const effect_kinds = kinds.map((kind) => {
    const cell = byKind.get(kind);
    cell.event_count = eventIdsByKind.get(kind).size;
    cell.factions = Object.fromEntries(Object.keys(cell.factions).sort(strictCompare).map((f) => [f, cell.factions[f]]));
    return cell;
  });

  const missing_factions_by_kind = {};
  for (const cell of effect_kinds) {
    const present = new Set(Object.keys(cell.factions));
    const missing = FACTIONS.filter((faction) => !present.has(faction));
    if (present.size > 0 && missing.length > 0) {
      missing_factions_by_kind[cell.kind] = missing;
    }
  }

  return {
    events_dir: path.relative(process.cwd(), eventsDir).replace(/\\/g, '/'),
    total_events: eventRows.length,
    total_effects: effect_kinds.reduce((sum, cell) => sum + cell.effect_count, 0),
    effect_kind_count: effect_kinds.length,
    live_substrates: effect_kinds.filter((cell) => String(cell.status).startsWith('live')).map((cell) => cell.kind),
    partial_substrates: effect_kinds.filter((cell) => String(cell.status).startsWith('partial')).map((cell) => cell.kind),
    unknown_substrates: effect_kinds.filter((cell) => cell.status === 'unknown').map((cell) => cell.kind),
    missing_factions_by_kind,
    effect_kinds,
  };
}

function fmtFactions(factions) {
  const keys = Object.keys(factions).sort(strictCompare);
  return keys.length ? keys.map((key) => `${key}:${factions[key]}`).join(', ') : '-';
}

function renderMarkdown(inventory) {
  const lines = [];
  lines.push('# Consequence Substrate Inventory');
  lines.push('');
  lines.push(`- Events dir: \`${inventory.events_dir}\``);
  lines.push(`- Events scanned: ${inventory.total_events}`);
  lines.push(`- Effect instances: ${inventory.total_effects}`);
  lines.push(`- Effect kinds: ${inventory.effect_kind_count}`);
  lines.push(`- Live substrates: ${inventory.live_substrates.length}`);
  lines.push(`- Partial-reader substrates: ${inventory.partial_substrates.join(', ') || '-'}`);
  lines.push(`- Unknown substrates: ${inventory.unknown_substrates.join(', ') || '-'}`);
  lines.push('');
  lines.push('| Kind | Status | Class | Events | Effects | Factions | Consumer | Examples |');
  lines.push('|---|---|---|---:|---:|---|---|---|');
  for (const cell of inventory.effect_kinds) {
    lines.push(`| ${cell.kind} | ${cell.status} | ${cell.class} | ${cell.event_count} | ${cell.effect_count} | ${fmtFactions(cell.factions)} | ${cell.consumer} | ${cell.example_events.join(', ') || '-'} |`);
  }
  lines.push('');
  lines.push('## Missing Faction Coverage');
  const missingKinds = Object.keys(inventory.missing_factions_by_kind).sort(strictCompare);
  if (missingKinds.length === 0) {
    lines.push('');
    lines.push('- No faction-scoped kind has asymmetric coverage.');
  } else {
    lines.push('');
    for (const kind of missingKinds) {
      lines.push(`- ${kind}: missing ${inventory.missing_factions_by_kind[kind].join(', ')}`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(argv) {
  const json = argv.includes('--json');
  const dirArg = argv.find((arg) => arg !== '--json');
  const eventsDir = dirArg ? path.resolve(process.cwd(), dirArg) : DEFAULT_EVENTS_DIR;
  const inventory = buildInventory(eventsDir);
  process.stdout.write(json ? `${JSON.stringify(inventory, null, 2)}\n` : renderMarkdown(inventory));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  buildInventory,
  collectEffects,
  renderMarkdown,
  SUBSTRATE_OWNERS,
};
