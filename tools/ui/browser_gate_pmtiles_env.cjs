/* eslint-env node */

const fs = require('node:fs');
const path = require('node:path');

const PMTILES_ARTIFACTS = [
  path.join('data', 'derived', 'tiles', 'hillshade.pmtiles'),
  path.join('data', 'derived', 'tiles', 'osm.pmtiles'),
  path.join('data', 'derived', 'tiles', 'terrain.pmtiles'),
];

function isGitLfsPointer(filePath) {
  try {
    const head = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }).slice(0, 160);
    return head.startsWith('version https://git-lfs.github.com/spec/v1');
  } catch {
    return false;
  }
}

function hasPmtilesLfsPointer(root = process.cwd()) {
  return PMTILES_ARTIFACTS.some((artifact) => isGitLfsPointer(path.join(root, artifact)));
}

function resolveBrowserGateEnv(root = process.cwd(), label = 'browser-gate') {
  const useRealPmtiles = process.env.AWWV_BROWSER_GATE_USE_PMTILES === '1';
  const disablePmtiles = !useRealPmtiles
    || process.env.VITE_AWWV_DISABLE_PMTILES === '1'
    || hasPmtilesLfsPointer(root);
  if (disablePmtiles) {
    console.warn(`[${label}] running browser proof with tileless basemap fallback`);
  }
  return {
    ...process.env,
    BROWSER: 'none',
    ...(disablePmtiles ? { VITE_AWWV_DISABLE_PMTILES: '1' } : {}),
  };
}

module.exports = {
  hasPmtilesLfsPointer,
  resolveBrowserGateEnv,
};
