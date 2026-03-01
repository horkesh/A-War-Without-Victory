'use strict';

/**
 * compare_painted_vs_sim.cjs
 * Compare painted historical control targets (Jan 1993) against a sim run's final_save.json.
 * Reports OSID-level match rate by region and highlights mismatches.
 *
 * Usage: node tools/compare_painted_vs_sim.cjs <run_dir>
 *
 * CommonJS — runs with plain node, no tsx/ESM needed.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Region mapping: municipality slug (middle part of OSID) → region name
// ---------------------------------------------------------------------------
const REGION_MAP = {
  // KRAJINA
  bosanska_krupa:      'KRAJINA',
  bosanski_petrovac:   'KRAJINA',
  bihac:               'KRAJINA',
  cazin:               'KRAJINA',
  velika_kladusa:      'KRAJINA',
  kljuc:               'KRAJINA',
  sanski_most:         'KRAJINA',
  prijedor:            'KRAJINA',
  banja_luka:          'KRAJINA',
  laktasi:             'KRAJINA',
  bosanska_gradiska:   'KRAJINA',
  srbac:               'KRAJINA',
  kotor_varos:         'KRAJINA',
  celinac:             'KRAJINA',
  bosanska_dubica:     'KRAJINA',
  bosanska_kostajnica: 'KRAJINA',
  mrkonjic_grad:       'KRAJINA',
  sipovo:              'KRAJINA',
  skender_vakuf:       'KRAJINA',

  // POSAVINA_NE
  brcko:          'POSAVINA_NE',
  orasje:         'POSAVINA_NE',
  modrica:        'POSAVINA_NE',
  derventa:       'POSAVINA_NE',
  bosanski_brod:  'POSAVINA_NE',
  odzak:          'POSAVINA_NE',
  gradacac:       'POSAVINA_NE',
  lopare:         'POSAVINA_NE',
  srebrenik:      'POSAVINA_NE',
  tuzla:          'POSAVINA_NE',
  gracanica:      'POSAVINA_NE',
  lukavac:        'POSAVINA_NE',
  teocak:         'POSAVINA_NE',
  sapna:          'POSAVINA_NE',
  zvornik:        'POSAVINA_NE',
  ugljevik:       'POSAVINA_NE',
  bijeljina:      'POSAVINA_NE',
  pelagicevo:     'POSAVINA_NE',
  bosanski_samac: 'POSAVINA_NE',

  // DRINA
  bratunac:     'DRINA',
  srebrenica:   'DRINA',
  visegrad:     'DRINA',
  foca:         'DRINA',
  gorazde:      'DRINA',
  rogatica:     'DRINA',
  sokolac:      'DRINA',
  hanpijesak:   'DRINA',
  han_pijesak:  'DRINA',
  vlasenica:    'DRINA',
  milici:       'DRINA',
  sekovici:     'DRINA',
  bosanski_novi:'DRINA',
  kalinovik:    'DRINA',
  cajnice:      'DRINA',
  rudo:         'DRINA',

  // CENTRAL_CORRIDOR
  tesanj:      'CENTRAL_CORRIDOR',
  maglaj:      'CENTRAL_CORRIDOR',
  zavidovici:  'CENTRAL_CORRIDOR',
  zenica:      'CENTRAL_CORRIDOR',
  kakanj:      'CENTRAL_CORRIDOR',
  visoko:      'CENTRAL_CORRIDOR',
  breza:       'CENTRAL_CORRIDOR',
  ilijas:      'CENTRAL_CORRIDOR',
  doboj:       'CENTRAL_CORRIDOR',
  teslic:      'CENTRAL_CORRIDOR',
  prnjavor:    'CENTRAL_CORRIDOR',

  // CENTRAL_BOSNIA
  travnik:      'CENTRAL_BOSNIA',
  novi_travnik: 'CENTRAL_BOSNIA',
  vitez:        'CENTRAL_BOSNIA',
  busovaca:     'CENTRAL_BOSNIA',
  kiseljak:     'CENTRAL_BOSNIA',
  fojnica:      'CENTRAL_BOSNIA',
  kresevo:      'CENTRAL_BOSNIA',
  bugojno:      'CENTRAL_BOSNIA',
  gornji_vakuf: 'CENTRAL_BOSNIA',
  prozor:       'CENTRAL_BOSNIA',
  jablanica:    'CENTRAL_BOSNIA',
  konjic:       'CENTRAL_BOSNIA',
  hadzici:      'CENTRAL_BOSNIA',
  jajce:        'CENTRAL_BOSNIA',
  donji_vakuf:  'CENTRAL_BOSNIA',
  zepce:        'CENTRAL_BOSNIA',
  vares:        'CENTRAL_BOSNIA',
  olovo:        'CENTRAL_BOSNIA',
  kalesija:     'CENTRAL_BOSNIA',
  kladanj:      'CENTRAL_BOSNIA',
  zivinice:     'CENTRAL_BOSNIA',
  banovici:     'CENTRAL_BOSNIA',
  bosansko_grahovo: 'CENTRAL_BOSNIA',

  // SARAJEVO
  centar_sarajevo:     'SARAJEVO',
  ilidza:              'SARAJEVO',
  vogosca:             'SARAJEVO',
  pale:                'SARAJEVO',
  trnovo:              'SARAJEVO',
  novi_grad_sarajevo:  'SARAJEVO',
  novo_sarajevo:       'SARAJEVO',
  stari_grad_sarajevo: 'SARAJEVO',

  // HERZEGOVINA
  mostar:        'HERZEGOVINA',
  citluk:        'HERZEGOVINA',
  capljina:      'HERZEGOVINA',
  stolac:        'HERZEGOVINA',
  neum:          'HERZEGOVINA',
  grude:         'HERZEGOVINA',
  siroki_brijeg: 'HERZEGOVINA',
  ljubuski:      'HERZEGOVINA',
  posusje:       'HERZEGOVINA',
  livno:         'HERZEGOVINA',
  tomislavgrad:  'HERZEGOVINA',
  kupres:        'HERZEGOVINA',
  glamoc:        'HERZEGOVINA',
  drvar:         'HERZEGOVINA',
  titov_drvar:   'HERZEGOVINA',
  listica:       'HERZEGOVINA',
  ljubinje:      'HERZEGOVINA',
  bileca:        'HERZEGOVINA',
  trebinje:      'HERZEGOVINA',
  nevesinje:     'HERZEGOVINA',
  gacko:         'HERZEGOVINA',
  duvno:         'HERZEGOVINA',
};

const REGION_ORDER = [
  'KRAJINA',
  'POSAVINA_NE',
  'DRINA',
  'CENTRAL_CORRIDOR',
  'CENTRAL_BOSNIA',
  'SARAJEVO',
  'HERZEGOVINA',
  'OTHER',
];

const FACTIONS = ['RS', 'RBiH', 'HRHB'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract municipality slug from OSID (middle segment). */
function getMuniSlug(osid) {
  const parts = osid.split(':');
  return parts.length >= 3 ? parts[1] : 'unknown';
}

/** Map an OSID to its region name. */
function getRegion(osid) {
  return REGION_MAP[getMuniSlug(osid)] || 'OTHER';
}

/** Format percentage with one decimal place. */
function pct(n, total) {
  if (total === 0) return '0.0';
  return ((n / total) * 100).toFixed(1);
}

/** Left-pad a string to width with spaces. */
function rpad(str, width) {
  const s = String(str);
  return ' '.repeat(Math.max(0, width - s.length)) + s;
}

/** Right-pad a string to width with spaces. */
function lpad(str, width) {
  const s = String(str);
  return s + ' '.repeat(Math.max(0, width - s.length));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node tools/compare_painted_vs_sim.cjs <run_dir>');
    process.exit(1);
  }

  const runDir = args[0];

  // Resolve painted path relative to this script's directory
  const paintedPath = path.resolve(
    __dirname,
    '../data/source/calibration/painted_control_jan1993.json'
  );
  const simPath = path.resolve(runDir, 'final_save.json');

  if (!fs.existsSync(paintedPath)) {
    console.error('ERROR: Painted control file not found at:', paintedPath);
    process.exit(1);
  }
  if (!fs.existsSync(simPath)) {
    console.error('ERROR: final_save.json not found at:', simPath);
    process.exit(1);
  }

  const paintedFile = JSON.parse(fs.readFileSync(paintedPath, 'utf8'));
  const simFile     = JSON.parse(fs.readFileSync(simPath, 'utf8'));

  const paintedCtrl = paintedFile.by_settlement_id; // osid → faction
  const simCtrl     = simFile.political_controllers;  // osid → faction

  if (!paintedCtrl) {
    console.error('ERROR: Painted file missing "by_settlement_id" field');
    process.exit(1);
  }
  if (!simCtrl) {
    console.error('ERROR: final_save.json missing "political_controllers" field');
    process.exit(1);
  }

  // Canonical sorted list of OSIDs from the painted ground truth
  const paintedOsids = Object.keys(paintedCtrl).sort();
  const totalOsids   = paintedOsids.length;

  // ---------------------------------------------------------------------------
  // Initialise accumulators
  // ---------------------------------------------------------------------------

  let totalMatch    = 0;
  let totalMismatch = 0;

  const simFactionCount     = { RS: 0, RBiH: 0, HRHB: 0 };
  const paintedFactionCount = { RS: 0, RBiH: 0, HRHB: 0 };

  /** @type {Record<string, { match: number, total: number, simFaction: Record<string,number>, paintedFaction: Record<string,number> }>} */
  const regionStats = {};
  for (const r of REGION_ORDER) {
    regionStats[r] = {
      match: 0,
      total: 0,
      simFaction:     { RS: 0, RBiH: 0, HRHB: 0 },
      paintedFaction: { RS: 0, RBiH: 0, HRHB: 0 },
    };
  }

  /** @type {Array<{ osid: string, paintedFaction: string, simFaction: string, region: string }>} */
  const mismatches = [];

  // ---------------------------------------------------------------------------
  // Main comparison loop (iterate painted OSIDs in sorted order)
  // ---------------------------------------------------------------------------

  for (const osid of paintedOsids) {
    const paintedFaction = paintedCtrl[osid];
    const simFaction     = simCtrl[osid]; // undefined if missing in sim
    const region         = getRegion(osid);

    // Ensure the region bucket exists (handles any future 'OTHER' entries)
    if (!regionStats[region]) {
      regionStats[region] = {
        match: 0, total: 0,
        simFaction:     { RS: 0, RBiH: 0, HRHB: 0 },
        paintedFaction: { RS: 0, RBiH: 0, HRHB: 0 },
      };
    }

    const stats = regionStats[region];
    stats.total++;

    // Painted faction tallies
    if (FACTIONS.includes(paintedFaction)) {
      paintedFactionCount[paintedFaction]++;
      stats.paintedFaction[paintedFaction]++;
    }

    if (simFaction === undefined || simFaction === null) {
      // Sim is missing this OSID entirely — treat as mismatch
      totalMismatch++;
      mismatches.push({ osid, paintedFaction, simFaction: '(missing)', region });
    } else {
      // Sim faction tallies
      if (FACTIONS.includes(simFaction)) {
        simFactionCount[simFaction]++;
        stats.simFaction[simFaction]++;
      }

      if (simFaction === paintedFaction) {
        totalMatch++;
        stats.match++;
      } else {
        totalMismatch++;
        mismatches.push({ osid, paintedFaction, simFaction, region });
      }
    }
  }

  // OSIDs in sim but not in painted (informational only, do not affect match rate)
  const simOnlyOsids = Object.keys(simCtrl)
    .filter(k => !Object.prototype.hasOwnProperty.call(paintedCtrl, k))
    .sort();

  // Sort mismatches: by region order first, then osid alphabetically
  const regionIndex = {};
  REGION_ORDER.forEach(function(r, i) { regionIndex[r] = i; });

  mismatches.sort(function(a, b) {
    const ra = regionIndex[a.region] !== undefined ? regionIndex[a.region] : 9999;
    const rb = regionIndex[b.region] !== undefined ? regionIndex[b.region] : 9999;
    if (ra !== rb) return ra - rb;
    return a.osid < b.osid ? -1 : a.osid > b.osid ? 1 : 0;
  });

  // ---------------------------------------------------------------------------
  // Render output
  // ---------------------------------------------------------------------------

  const lines = [];

  lines.push('=== Painted vs Sim Comparison ===');
  lines.push('Run: ' + runDir);
  lines.push('Total OSIDs: ' + totalOsids);
  lines.push('');

  lines.push('OVERALL');
  lines.push('  Match:    ' + totalMatch + ' / ' + totalOsids + '  (' + pct(totalMatch, totalOsids) + '%)');
  lines.push('  Mismatch: ' + totalMismatch + ' / ' + totalOsids + '  (' + pct(totalMismatch, totalOsids) + '%)');
  lines.push('');

  lines.push('FACTION TOTALS');
  lines.push('  Painted  RS=' + paintedFactionCount.RS + '  RBiH=' + paintedFactionCount.RBiH + '  HRHB=' + paintedFactionCount.HRHB);
  lines.push('  Sim      RS=' + simFactionCount.RS + '  RBiH=' + simFactionCount.RBiH + '  HRHB=' + simFactionCount.HRHB);
  const dRS   = simFactionCount.RS   - paintedFactionCount.RS;
  const dRBiH = simFactionCount.RBiH - paintedFactionCount.RBiH;
  const dHRHB = simFactionCount.HRHB - paintedFactionCount.HRHB;
  lines.push(
    '  Delta    RS=' + (dRS   >= 0 ? '+' : '') + dRS +
    '  RBiH='        + (dRBiH >= 0 ? '+' : '') + dRBiH +
    '  HRHB='        + (dHRHB >= 0 ? '+' : '') + dHRHB
  );
  lines.push('');

  lines.push('BY REGION');
  const maxRLen = Math.max.apply(null, REGION_ORDER.map(function(r) { return r.length; }));
  for (const region of REGION_ORDER) {
    const s = regionStats[region];
    if (!s || s.total === 0) continue;
    const matchStr = s.match + '/' + s.total;
    const pctStr   = '(' + pct(s.match, s.total) + '%)';
    const simStr   = 'RS_sim=' + s.simFaction.RS + ' RBiH_sim=' + s.simFaction.RBiH + ' HRHB_sim=' + s.simFaction.HRHB;
    const paintStr = 'painted RS=' + s.paintedFaction.RS + ' RBiH=' + s.paintedFaction.RBiH + ' HRHB=' + s.paintedFaction.HRHB;
    lines.push(
      '  ' + lpad(region, maxRLen) +
      '  match  ' + rpad(matchStr, 8) +
      ' ' + lpad(pctStr, 8) +
      '  ' + simStr +
      ' | ' + paintStr
    );
  }
  lines.push('');

  lines.push('MISMATCHES (painted\u2192sim)');
  if (mismatches.length === 0) {
    lines.push('  (none)');
  } else {
    const maxOLen = Math.max.apply(null, mismatches.map(function(m) { return m.osid.length; }));
    const maxPLen = Math.max.apply(null, mismatches.map(function(m) { return m.paintedFaction.length; }));
    const maxSLen = Math.max.apply(null, mismatches.map(function(m) { return m.simFaction.length; }));
    for (const m of mismatches) {
      lines.push(
        '  ' + lpad(m.osid, maxOLen) +
        '  painted=' + lpad(m.paintedFaction, maxPLen) +
        '  sim=' + lpad(m.simFaction, maxSLen) +
        '  region=' + m.region
      );
    }
  }

  if (simOnlyOsids.length > 0) {
    lines.push('');
    lines.push('NOTE: ' + simOnlyOsids.length + ' OSID(s) in sim but not in painted file (skipped from match rate):');
    for (const osid of simOnlyOsids) {
      lines.push('  ' + osid);
    }
  }

  console.log(lines.join('\n'));
}

main();
