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

module.exports = {
  isSafeSaveRecordFilename,
  listSaveRecords,
  resolveSaveRecordPath,
};
