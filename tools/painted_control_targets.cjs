'use strict';

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const CALIBRATION_DIR = path.join(WORKSPACE_ROOT, 'data', 'source', 'calibration');
const TARGET_PREFIX = 'painted_control_';
const TARGET_SUFFIX = '.json';

const BUILTIN_TARGETS = [
  { id: 'jan1993', label: 'January 1993', path: path.join(CALIBRATION_DIR, 'painted_control_jan1993.json') },
  { id: 'apr1994', label: 'April 1994', path: path.join(CALIBRATION_DIR, 'painted_control_apr1994.json') },
  { id: 'apr1995', label: 'April 1995', path: path.join(CALIBRATION_DIR, 'painted_control_apr1995.json') },
  { id: 'oct1995', label: 'October 1995', path: path.join(CALIBRATION_DIR, 'painted_control_oct1995.json') },
];

function strictCompare(a, b) {
  const left = String(a);
  const right = String(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function assertTargetId(id) {
  if (!/^[a-z0-9_]+$/.test(id)) {
    throw new Error(`Invalid painted target id "${id}". Use lowercase letters, digits, and underscores only.`);
  }
}

function targetPathForId(id) {
  assertTargetId(id);
  const builtin = BUILTIN_TARGETS.find((t) => t.id === id);
  if (builtin) return builtin.path;
  return path.join(CALIBRATION_DIR, `${TARGET_PREFIX}${id}${TARGET_SUFFIX}`);
}

function resolvePaintedPath(targetOrPath) {
  const value = targetOrPath || 'jan1993';
  if (/[\\/]/.test(value) || value.endsWith('.json')) {
    return path.resolve(WORKSPACE_ROOT, value);
  }
  return targetPathForId(value);
}

function canonicalizeControlMap(raw) {
  const out = {};
  for (const osid of Object.keys(raw || {}).sort(strictCompare)) {
    const faction = raw[osid];
    if (faction === 'RS' || faction === 'RBiH' || faction === 'HRHB') {
      out[osid] = faction;
    }
  }
  return out;
}

function summarizeControlMap(controlMap) {
  const counts = { RS: 0, RBiH: 0, HRHB: 0 };
  for (const faction of Object.values(controlMap || {})) {
    if (Object.prototype.hasOwnProperty.call(counts, faction)) counts[faction]++;
  }
  return {
    total_osids: Object.keys(controlMap || {}).length,
    counts,
  };
}

function normalizePaintedFile(input, targetId, label) {
  const control = canonicalizeControlMap(input.by_settlement_id || input.political_controllers || input);
  const summary = summarizeControlMap(control);
  return {
    meta: {
      schema_version: 1,
      target_id: targetId,
      label,
      description: `Painted control target: ${label || targetId}`,
      total_osids: summary.total_osids,
      counts: summary.counts,
      source: 'painted_control_targets',
    },
    by_settlement_id: control,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadPaintedTarget(targetOrPath) {
  const filePath = resolvePaintedPath(targetOrPath);
  const id = path.basename(filePath, TARGET_SUFFIX).replace(/^painted_control_/, '');
  const builtin = BUILTIN_TARGETS.find((t) => path.resolve(t.path) === path.resolve(filePath));
  const label = builtin ? builtin.label : id;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Painted control target not found at ${filePath}`);
  }
  const file = readJson(filePath);
  return {
    id,
    label: file.meta?.label || label,
    path: filePath,
    file,
    control: canonicalizeControlMap(file.by_settlement_id),
    summary: summarizeControlMap(file.by_settlement_id),
  };
}

function writePaintedTarget(id, controlMap, meta = {}) {
  assertTargetId(id);
  fs.mkdirSync(CALIBRATION_DIR, { recursive: true });
  const builtin = BUILTIN_TARGETS.find((t) => t.id === id);
  const label = meta.label || builtin?.label || id;
  const normalized = normalizePaintedFile(
    { by_settlement_id: controlMap },
    id,
    label,
  );
  normalized.meta = {
    ...normalized.meta,
    ...Object.fromEntries(
      Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    ),
    target_id: id,
    label,
    total_osids: normalized.meta.total_osids,
    counts: normalized.meta.counts,
    source: 'painted_control_targets',
  };
  const filePath = targetPathForId(id);
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return {
    id,
    label,
    path: filePath,
    summary: summarizeControlMap(normalized.by_settlement_id),
  };
}

function listPaintedTargets() {
  const seen = new Map();
  for (const target of BUILTIN_TARGETS) {
    seen.set(target.id, {
      ...target,
      exists: fs.existsSync(target.path),
      path: path.relative(WORKSPACE_ROOT, target.path).replace(/\\/g, '/'),
    });
  }
  if (fs.existsSync(CALIBRATION_DIR)) {
    for (const name of fs.readdirSync(CALIBRATION_DIR).sort(strictCompare)) {
      if (!name.startsWith(TARGET_PREFIX) || !name.endsWith(TARGET_SUFFIX)) continue;
      if (name.endsWith('_improved.json')) continue;
      const id = name.slice(TARGET_PREFIX.length, -TARGET_SUFFIX.length);
      if (seen.has(id)) {
        seen.get(id).exists = true;
        continue;
      }
      const fullPath = path.join(CALIBRATION_DIR, name);
      seen.set(id, {
        id,
        label: id,
        path: path.relative(WORKSPACE_ROOT, fullPath).replace(/\\/g, '/'),
        exists: true,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => strictCompare(a.id, b.id));
}

module.exports = {
  WORKSPACE_ROOT,
  CALIBRATION_DIR,
  BUILTIN_TARGETS,
  canonicalizeControlMap,
  listPaintedTargets,
  loadPaintedTarget,
  normalizePaintedFile,
  resolvePaintedPath,
  strictCompare,
  summarizeControlMap,
  targetPathForId,
  writePaintedTarget,
};
