#!/usr/bin/env node
/**
 * calibration_bundle_matrix.cjs
 *
 * Attribution harness for cal/organic-territory-bundle.
 * Runs 5 × 188w scenario variants (baseline + 3 flags + all-flags)
 * and writes a per-config attribution table.
 *
 * Usage:  node tools/calibration_bundle_matrix.cjs
 *
 * Env flags used by each config:
 *   AWWV_BRIEF_GAP_1   — supply modal-fallback in force_eval.ts
 *   AWWV_BRIEF_GAP_6   — recent_territory_change wired into briefing + assessThreats
 *   AWWV_KLJUC_REROOT  — Ključ interior appended to Petrovac axis
 *
 * Output files:
 *   runs/attribution/calibration_attribution.json
 *   docs/40_reports/working/20260611_bundle_attribution.md
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Config table ────────────────────────────────────────────────────────────

const CONFIGS = [
    {
        name: 'baseline',
        env: {},
    },
    {
        name: 'gap1',
        env: { AWWV_BRIEF_GAP_1: 'true' },
    },
    {
        name: 'gap6',
        env: { AWWV_BRIEF_GAP_6: 'true' },
    },
    {
        name: 'kljuc',
        env: { AWWV_KLJUC_REROOT: 'true' },
    },
    {
        name: 'all',
        env: { AWWV_BRIEF_GAP_1: 'true', AWWV_BRIEF_GAP_6: 'true', AWWV_KLJUC_REROOT: 'true' },
    },
];

const SCENARIO = 'data/scenarios/apr1992_definitive_188w.json';
const REPO_ROOT = path.resolve(__dirname, '..');
const RUNS_DIR = path.join(REPO_ROOT, 'runs', 'attribution');
const TSX = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const RUNNER = path.join(REPO_ROOT, 'tools', 'scenario_runner', 'run_scenario_with_preflight.ts');

const KLJUC_OSIDS = [
    'op:kljuc:hadzici',
    'op:kljuc:kljuc_2',
    'op:kljuc:krasulje_2',
];

const SEC6_OSIDS = [
    'op:srebrenica:srebrenica_2',
    'op:zepa:zepa_2',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Find the most recent run directory for a given config name.
 * Dirs are named: apr1992_definitive_188w__<hash>__w188_n<N>
 * We use a sentinel file we write ourselves to tag the run.
 */
function findRunDir(configName) {
    const sentinelPath = path.join(RUNS_DIR, `${configName}.run_dir`);
    if (fs.existsSync(sentinelPath)) {
        return fs.readFileSync(sentinelPath, 'utf8').trim();
    }
    return null;
}

function tagRunDir(configName, runDir) {
    ensureDir(RUNS_DIR);
    fs.writeFileSync(path.join(RUNS_DIR, `${configName}.run_dir`), runDir);
}

/**
 * Find the newest run directory in runs/ matching the 188w scenario pattern,
 * created AFTER startMs.
 */
function findNewestRunAfter(startMs) {
    const runsRoot = path.join(REPO_ROOT, 'runs');
    const entries = fs.readdirSync(runsRoot, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith('apr1992_definitive_188w__'))
        .map(e => {
            const full = path.join(runsRoot, e.name);
            const stat = fs.statSync(full);
            return { name: e.name, full, mtime: stat.mtimeMs };
        })
        .filter(e => e.mtime >= startMs)
        .sort((a, b) => b.mtime - a.mtime);
    return entries[0]?.full ?? null;
}

// ─── Run one config ──────────────────────────────────────────────────────────

function runConfig(config) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running config: ${config.name}`);
    console.log(`  env flags: ${JSON.stringify(config.env)}`);
    console.log(`${'='.repeat(60)}`);

    const outDir = path.join(RUNS_DIR, config.name);
    ensureDir(outDir);

    const startMs = Date.now();

    const childEnv = {
        ...process.env,
        ...config.env,
    };

    const result = spawnSync(
        process.execPath,
        [TSX, RUNNER, '--scenario', SCENARIO, '--unique'],
        {
            cwd: REPO_ROOT,
            env: childEnv,
            stdio: 'inherit',
            timeout: 30 * 60 * 1000, // 30 min per run
        },
    );

    if (result.status !== 0) {
        console.error(`Config ${config.name} FAILED with exit code ${result.status}`);
        return null;
    }

    // Find the run directory that was just created
    const runDir = findNewestRunAfter(startMs);
    if (!runDir) {
        console.error(`Could not find output run directory for config ${config.name}`);
        return null;
    }
    tagRunDir(config.name, runDir);
    console.log(`  -> run dir: ${runDir}`);
    return runDir;
}

// ─── Extract metrics from a run dir ─────────────────────────────────────────

function extractMetrics(runDir) {
    if (!runDir || !fs.existsSync(runDir)) return null;

    const summary = readJson(path.join(runDir, 'run_summary.json'));
    const controlDelta = readJson(path.join(runDir, 'control_delta.json'));
    const finalSave = readJson(path.join(runDir, 'final_save.json'));

    if (!summary || !controlDelta || !finalSave) return null;

    // Final state hash
    const finalStateHash = summary.final_state_hash ?? 'n/a';

    // Net control counts after
    const netCounts = {};
    for (const entry of (controlDelta.net_control_counts_after ?? [])) {
        netCounts[entry.controller] = entry.count;
    }

    // Anchors
    const anchorChecks = summary.anchor_checks ?? summary.historical_fit?.anchor_checks ?? [];
    const anchorsPassed = anchorChecks.filter(a => a.passed).length;
    const anchorsTotal = anchorChecks.length;

    // All controlled OSIDs at end
    const pol = finalSave.political ?? finalSave.state?.political ?? {};
    const politicalControllers = pol.political_controllers ?? {};

    // §6 check
    const sec6 = {};
    for (const osid of SEC6_OSIDS) {
        sec6[osid] = politicalControllers[osid] ?? 'unknown';
    }

    // Ključ interior OSIDs
    const kljucControllers = {};
    for (const osid of KLJUC_OSIDS) {
        kljucControllers[osid] = politicalControllers[osid] ?? 'unknown';
    }

    // KIA — from attack_resolution casualties
    const ar = summary.attack_resolution ?? {};
    const kia = {
        attacker: ar.casualty_attacker ?? null,
        defender: ar.casualty_defender ?? null,
    };

    // vs_historical for reference counts
    const vsHist = summary.vs_historical ?? {};
    const histCounts = {};
    for (const entry of (vsHist.counts_by_controller ?? [])) {
        histCounts[entry.controller] = { final: entry.final_count, ref: entry.reference_count, delta: entry.delta };
    }

    return {
        finalStateHash,
        netCounts,
        anchorsPassed,
        anchorsTotal,
        sec6,
        kljucControllers,
        kia,
        histCounts,
        runDir,
    };
}

// ─── Diff metrics vs baseline ────────────────────────────────────────────────

function diffOsids(metricsA, metricsB, allControllers) {
    // Find OSIDs where controller differs between two runs
    // We use political_controllers from final_save
    const different = [];
    for (const osid of Object.keys(allControllers)) {
        const a = metricsA._controllers?.[osid];
        const b = metricsB._controllers?.[osid];
        if (a !== b) different.push({ osid, baseline: a, config: b });
    }
    return different;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
    ensureDir(RUNS_DIR);

    const results = {};
    const allMetrics = {};

    // Run all configs serially
    for (const config of CONFIGS) {
        const runDir = runConfig(config);
        const metrics = extractMetrics(runDir);
        if (!metrics) {
            console.error(`Failed to extract metrics for ${config.name}`);
            results[config.name] = null;
            continue;
        }

        // Also store raw political_controllers for OSID diffing
        const finalSave = readJson(path.join(runDir, 'final_save.json'));
        const pol = finalSave?.political ?? finalSave?.state?.political ?? {};
        metrics._controllers = pol.political_controllers ?? {};

        results[config.name] = metrics;
        allMetrics[config.name] = metrics;
    }

    // Build per-config OSID diff vs baseline
    const baselineMetrics = results['baseline'];
    const configDiffs = {};
    if (baselineMetrics) {
        const allOsids = new Set(Object.keys(baselineMetrics._controllers ?? {}));
        for (const config of CONFIGS.slice(1)) {
            const m = results[config.name];
            if (!m) { configDiffs[config.name] = null; continue; }
            for (const osid of Object.keys(m._controllers ?? {})) allOsids.add(osid);

            const diff = [];
            for (const osid of [...allOsids].sort()) {
                const base = baselineMetrics._controllers?.[osid];
                const cand = m._controllers?.[osid];
                if (base !== cand) diff.push({ osid, baseline: base ?? 'unset', config: cand ?? 'unset' });
            }
            configDiffs[config.name] = diff;
        }
    }

    // ─── Write JSON output ───────────────────────────────────────────────────

    const attribution = {
        generated: new Date().toISOString(),
        configs: {},
        diffs_vs_baseline: configDiffs,
    };

    for (const [name, m] of Object.entries(results)) {
        if (!m) { attribution.configs[name] = null; continue; }
        attribution.configs[name] = {
            final_state_hash: m.finalStateHash,
            net_counts: m.netCounts,
            anchors: `${m.anchorsPassed}/${m.anchorsTotal}`,
            sec6: m.sec6,
            kljuc_controllers: m.kljucControllers,
            kia: m.kia,
            hist_counts: m.histCounts,
            run_dir: m.runDir,
        };
    }

    const jsonOutPath = path.join(RUNS_DIR, 'calibration_attribution.json');
    fs.writeFileSync(jsonOutPath, JSON.stringify(attribution, null, 2));
    console.log(`\nWrote: ${jsonOutPath}`);

    // ─── Write Markdown report ───────────────────────────────────────────────

    const mdLines = [
        '# Bundle Attribution Report — cal/organic-territory-bundle',
        '',
        `**Generated:** ${new Date().toISOString()}  `,
        `**Scenario:** ${SCENARIO}  `,
        `**Floor reference:** 345e044b7642aeab / 649 OSIDs  `,
        '',
        '## Per-Config Summary',
        '',
        '| Config | Hash | RS | RBiH | HRHB | Anchors | sreb_2 | zepa_2 | hadzici | kljuc_2 | krasulje_2 | att_KIA | def_KIA |',
        '|--------|------|----|------|------|---------|--------|--------|---------|---------|------------|---------|---------|',
    ];

    for (const config of CONFIGS) {
        const m = results[config.name];
        if (!m) {
            mdLines.push(`| ${config.name} | FAILED | - | - | - | - | - | - | - | - | - | - | - |`);
            continue;
        }
        const rs = m.netCounts['RS'] ?? '-';
        const rbih = m.netCounts['RBiH'] ?? '-';
        const hrhb = m.netCounts['HRHB'] ?? '-';
        const anch = `${m.anchorsPassed}/${m.anchorsTotal}`;
        const sreb = m.sec6['op:srebrenica:srebrenica_2'];
        const zepa = m.sec6['op:zepa:zepa_2'];
        const hadz = m.kljucControllers['op:kljuc:hadzici'];
        const klj2 = m.kljucControllers['op:kljuc:kljuc_2'];
        const krau = m.kljucControllers['op:kljuc:krasulje_2'];
        const attKia = m.kia.attacker ?? '-';
        const defKia = m.kia.defender ?? '-';
        mdLines.push(`| ${config.name} | \`${m.finalStateHash}\` | ${rs} | ${rbih} | ${hrhb} | ${anch} | ${sreb} | ${zepa} | ${hadz} | ${klj2} | ${krau} | ${attKia} | ${defKia} |`);
    }

    mdLines.push('', '## ΔOSID vs Baseline (per flag)', '');

    for (const config of CONFIGS.slice(1)) {
        const diff = configDiffs[config.name];
        mdLines.push(`### ${config.name}`);
        if (!diff) {
            mdLines.push('FAILED or no data.', '');
            continue;
        }
        if (diff.length === 0) {
            mdLines.push('INERT — byte-identical OSID controllers vs baseline.', '');
            continue;
        }
        mdLines.push(`${diff.length} OSID(s) differ vs baseline:`, '');
        mdLines.push('| OSID | Baseline | Config |');
        mdLines.push('|------|----------|--------|');
        for (const d of diff) {
            mdLines.push(`| ${d.osid} | ${d.baseline} | ${d.config} |`);
        }
        mdLines.push('');
    }

    mdLines.push('## Notes', '', '- `baseline` = no flags (should match floor hash `345e044b7642aeab`)');
    mdLines.push('- `gap1` = AWWV_BRIEF_GAP_1: supply modal-fallback in getBrigadeSupplyState');
    mdLines.push('- `gap6` = AWWV_BRIEF_GAP_6: recent_territory_change wired into briefing + assessThreats');
    mdLines.push('- `kljuc` = AWWV_KLJUC_REROOT: Ključ interior appended to Petrovac axis');
    mdLines.push('- `all` = all three flags active');
    mdLines.push('- §6 check: srebrenica_2=RS + zepa_2=RS = nominal (both fell historically)');
    mdLines.push('- Panel decides GO/NO-GO; no verdict in this document.');
    mdLines.push('');

    ensureDir(path.join(REPO_ROOT, 'docs', '40_reports', 'working'));
    const mdOutPath = path.join(REPO_ROOT, 'docs', '40_reports', 'working', '20260611_bundle_attribution.md');
    fs.writeFileSync(mdOutPath, mdLines.join('\n'));
    console.log(`Wrote: ${mdOutPath}`);

    // ─── Console summary ─────────────────────────────────────────────────────

    console.log('\n' + '='.repeat(60));
    console.log('ATTRIBUTION SUMMARY');
    console.log('='.repeat(60));
    for (const config of CONFIGS) {
        const m = results[config.name];
        if (!m) { console.log(`${config.name}: FAILED`); continue; }
        const diff = configDiffs[config.name];
        const deltaStr = diff == null ? 'n/a' : (diff.length === 0 ? 'INERT' : `+${diff.length} diff`);
        console.log(`${config.name.padEnd(10)} hash=${m.finalStateHash}  RS=${m.netCounts['RS']}  RBiH=${m.netCounts['RBiH']}  HRHB=${m.netCounts['HRHB']}  anchors=${m.anchorsPassed}/${m.anchorsTotal}  Δ=${deltaStr}`);
    }

    console.log('\nDone.');
}

main();
