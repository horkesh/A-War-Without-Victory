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
  label: 'small-screen-verdict-flow-visual-probe',
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
    milestone_comparison: [{
      id: 'war_duration',
      label: 'War Duration',
      historical_week: 188,
      player_week: 176,
      delta_weeks: -12,
      status: 'early',
      summary: 'The campaign ended before the historical reference week.',
    }],
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

async function collectMetrics(page) {
  return page.evaluate(() => {
    const boxOf = selector => {
      const el = document.querySelector(selector);
      const box = el?.getBoundingClientRect();
      return box ? {
        width: Math.round(box.width),
        height: Math.round(box.height),
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
      } : null;
    };
    const flow = document.querySelector('[data-awwv-mobile-verdict-flow]');
    const band = document.querySelector('[data-awwv-cinematic-verdict]');
    return {
      hasSurface: Boolean(document.querySelector('[data-awwv-endgame-surface="verdict"]')),
      hasBand: Boolean(band),
      hasFlow: Boolean(flow),
      activeSection: flow?.getAttribute('data-awwv-mobile-section-active') ?? null,
      sectionButtons: Array.from(document.querySelectorAll('[data-awwv-mobile-flow-tab]'))
        .map(button => button.textContent?.trim())
        .filter(Boolean),
      band: boxOf('[data-awwv-cinematic-verdict]'),
      flow: boxOf('[data-awwv-mobile-verdict-flow]'),
      report: boxOf('[data-awwv-mobile-section="report"]'),
      reckoning: boxOf('[data-awwv-mobile-section="reckoning"]'),
      footer: boxOf('[data-awwv-mobile-verdict-flow] + div'),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bodyText: document.body.innerText.slice(0, 2500),
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const steps = [
    { name: 'mobile_390x844_report', width: 390, height: 844 },
    { name: 'mobile_390x844_reckoning', width: 390, height: 844, click: 'Reckoning' },
    { name: 'desktop_1440x900_overview', width: 1440, height: 900 },
  ];
  const summary = [];

  for (const step of steps) {
    await page.setViewport({ width: step.width, height: step.height, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectEndgameState(page);
    await page.waitForSelector('[data-awwv-mobile-verdict-flow]', { timeout: 30000 });
    if (step.click) {
      await page.evaluate(label => {
        const button = Array.from(document.querySelectorAll('button'))
          .find(candidate => candidate.textContent?.trim() === label);
        if (!button) throw new Error(`Could not find button ${label}`);
        button.click();
      }, step.click);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    await page.screenshot({ path: path.join(outDir, `${step.name}.png`), fullPage: false });
    const metrics = await collectMetrics(page);
    fs.writeFileSync(path.join(outDir, `${step.name}.json`), JSON.stringify(metrics, null, 2));
    summary.push({ name: step.name, metrics });
  }

  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  await browser.close();
})();
