const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const outDir = __dirname;
const url = process.env.AWWV_VERDICT_VISUAL_URL ?? 'http://127.0.0.1:3002/?dev=1&live=1';
const executablePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function factionVerdict(faction, outcomeClass, score, grade, description, flags = []) {
  const capital = {
    territory_controlled_pct: 30,
    territory_controlled_km2: 15000,
    civilians_under_protection: 100000,
    refugees_created: 100000,
    refugees_received: 10000,
    military_casualties_inflicted: 10000,
    military_casualties_taken: 15000,
    civilian_casualties_caused: 3000,
    enclaves_held: [],
    enclaves_lost: [],
    peace_plans_accepted: [],
    peace_plans_rejected: [],
    operations_launched: 20,
    operations_successful: 8,
    war_crimes_events: flags.length,
    combat_effective_brigades: 12,
  };
  const dimensions = [
    ['military_credibility', 'Military Credibility', 50, 'C'],
    ['territorial_legitimacy', 'Territorial Legitimacy', 52, 'C'],
    ['international_standing', 'International Standing', 60, 'B'],
    ['patron_confidence', 'Patron Confidence', 44, 'C'],
    ['internal_cohesion', 'Internal Cohesion', 55, 'B'],
    ['negotiating_leverage', 'Negotiating Leverage', 48, 'C'],
  ].map(([dimension, label, dimensionScore, dimensionGrade]) => ({
    dimension,
    label,
    score: dimensionScore,
    grade: dimensionGrade,
  }));
  return {
    faction,
    pyrrhic_score: score,
    grade,
    grade_description: description,
    capital_breakdown: capital,
    dimension_grades: dimensions,
    outcome_class: outcomeClass,
    condemnation_flags: flags,
  };
}

const loadedState = {
  label: 'cinematic-verdict-visual-probe',
  turn: 188,
  phase: 'war',
  metadata: { turn: 188, date: '1995-10-01' },
  formations: [],
  militiaPools: [],
  controlBySettlement: { 'op:sarajevo': 'RBiH', 'op:pale': 'RS', 'op:mostar': 'HRHB' },
  statusBySettlement: {},
  brigadeAorByFormationId: {},
  attackOrders: [],
  aorOrders: [],
  recentControlEvents: [],
  allControlEvents: [],
  displacementEventLog: [],
  battlesByOsid: {},
  movementsByOsid: {},
  supplyTransitionsByOsid: {},
  historicalEventsByTurn: [],
  gameOver: true,
  gameOutcome: 'timeout_stalemate',
  gameVerdict: {
    outcome_type: 'termination',
    outcome_label: 'Dayton reckoning',
    turn: 188,
    date: '1995-10-01',
    duration_weeks: 188,
    faction_verdicts: {
      RBiH: factionVerdict('RBiH', 'pyrrhic_success', 49, 'C', 'The state survives, but the ledger defines the memory.'),
      RS: factionVerdict('RS', 'failure', 38, 'D', 'Territorial gains cannot redeem condemnation.', ['genocide_condemnation']),
      HRHB: factionVerdict('HRHB', 'negotiated_escape', 55, 'B', 'A negotiated exit preserves a reduced position.'),
    },
  },
  costLedger: {
    war_duration_weeks: 188,
    entries: [],
    rupture_consequences: [],
    total_military_killed: 46500,
    total_civilian_killed: 38000,
    findings: [{
      id: 'civilian_displacement_record',
      category: 'displacement',
      severity: 'grave',
      title: 'Civilian displacement record',
      text: 'The negotiation capital record attributes 1,950,000 refugees created to the war path.',
      sources: ['visual probe'],
    }],
  },
  historicalComparison: {
    duration_delta_weeks: -12,
    territory_divergence: { RS: 2, RBiH_HRHB_Federation: -2 },
    casualty_ratio: 0.72,
    displacement_ratio: 0.8,
    rupture_divergence: [],
    divergence_notes: [
      'War lasted 12 weeks shorter than the historical 188 weeks',
      'Total military casualties were 72% of historical levels',
    ],
    milestone_comparison: [],
  },
};

async function injectEndgameState(page) {
  const href = await page.evaluate(() => (
    performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .find(name => name.includes('/store/gameStore.ts'))
  ));
  if (!href) throw new Error('Could not find loaded gameStore module URL.');
  await page.evaluate(async ({ moduleHref, state }) => {
    const mod = await import(moduleHref);
    mod.useGameStore.setState({ loadedGameState: state, loadError: null });
  }, { moduleHref: href, state: loadedState });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const viewports = [
    { name: 'mobile_390x844', width: 390, height: 844 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'desktop_1440x900', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectEndgameState(page);
    await page.waitForSelector('[data-awwv-cinematic-verdict]', { timeout: 30000 });
    await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });
    const metrics = await page.evaluate(() => {
      const surface = document.querySelector('[data-awwv-endgame-surface="verdict"]');
      const band = document.querySelector('[data-awwv-cinematic-verdict]');
      const surfaceBox = surface?.getBoundingClientRect();
      const bandBox = band?.getBoundingClientRect();
      return {
        hasSurface: Boolean(surface),
        hasBand: Boolean(band),
        surface: surfaceBox ? { width: surfaceBox.width, height: surfaceBox.height } : null,
        band: bandBox ? { width: bandBox.width, height: bandBox.height } : null,
        bodyText: document.body.innerText.slice(0, 5000),
      };
    });
    fs.writeFileSync(path.join(outDir, `${viewport.name}.json`), JSON.stringify(metrics, null, 2));
  }

  await browser.close();
})();
