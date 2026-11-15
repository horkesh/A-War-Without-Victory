'use strict';

const fs = require('node:fs');
const path = require('node:path');

function isSafeSaveRecordFilename(filename) {
  return typeof filename === 'string'
    && filename.length > 5
    && filename.toLowerCase().endsWith('.json')
    && path.basename(filename) === filename
    && !filename.includes('/')
    && !filename.includes('\\');
}

function resolveSaveRecordPath(savesDir, filename) {
  if (!isSafeSaveRecordFilename(filename)) {
    throw new Error('Invalid save record filename.');
  }
  return path.join(savesDir, filename);
}

function strictCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function listSaveRecords(savesDir) {
  let entries;
  try {
    entries = await fs.promises.readdir(savesDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }

  const records = [];
  for (const entry of entries.sort((left, right) => strictCompare(left.name, right.name))) {
    if (!entry.isFile() || !isSafeSaveRecordFilename(entry.name)) continue;
    const filePath = resolveSaveRecordPath(savesDir, entry.name);
    try {
      const [raw, stat] = await Promise.all([
        fs.promises.readFile(filePath, 'utf8'),
        fs.promises.stat(filePath),
      ]);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
      const meta = parsed.meta;
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) continue;
      const turn = Number.isInteger(meta.turn) && meta.turn >= 0 ? meta.turn : 0;
      const faction = meta.player_faction === 'RBiH' || meta.player_faction === 'RS' || meta.player_faction === 'HRHB'
        ? meta.player_faction
        : null;
      records.push({
        filename: entry.name,
        turn,
        faction,
        modifiedAtMs: stat.mtimeMs,
      });
    } catch (_error) {
      // A malformed or concurrently-written record is not offered to the player.
    }
  }

  return records.sort((left, right) => {
    const timeOrder = right.modifiedAtMs - left.modifiedAtMs;
    return timeOrder !== 0 ? timeOrder : strictCompare(left.filename, right.filename);
  });
}

/**
 * Write bytes so a reader (or a crash) never sees a half-written save: write a sibling temp file,
 * then rename it over the target. A multi-MB autosave rewritten in place was observed torn by a
 * concurrent reader in the R8 dry run. Windows can refuse the rename while another process holds
 * the target open (EPERM/EBUSY/EACCES), so retry briefly, then fall back to the direct write so a
 * save is never lost to the safeguard itself. The temp name never ends in .json, so
 * listSaveRecords cannot offer it.
 */
function writeFileAtomically(filePath, contents) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, contents, 'utf-8');
  const transient = new Set(['EPERM', 'EBUSY', 'EACCES']);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.renameSync(tempPath, filePath);
      return;
    } catch (error) {
      if (!transient.has(error && error.code)) {
        fs.rmSync(tempPath, { force: true });
        throw error;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40 * (attempt + 1));
    }
  }
  try {
    fs.writeFileSync(filePath, contents, 'utf-8');
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

module.exports = {
  isSafeSaveRecordFilename,
  writeFileAtomically,
  listSaveRecords,
  resolveSaveRecordPath,
};
