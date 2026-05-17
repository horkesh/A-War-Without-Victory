#!/usr/bin/env node
/**
 * prepare_launch_artifacts.cjs
 *
 * Deterministic launch/playtest artifact dry-run planner. It records what an
 * operator would distribute, which repo templates must be filled, and which
 * evidence remains external to the repo. It does not build packages, upload
 * releases, or claim clean-VM evidence.
 *
 * Usage:
 *   node tools/release/prepare_launch_artifacts.cjs --dry-run
 *   node tools/release/prepare_launch_artifacts.cjs --dry-run --artifact dist-packaged/AWWV-Setup.exe
 *   node tools/release/prepare_launch_artifacts.cjs --dry-run --format markdown
 */
'use strict';

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

const TEMPLATE_PATHS = [
    'docs/50_launch/release/checklist.md',
    'docs/50_launch/release/launch_day_automation_template.md',
    'docs/40_reports/release/20260517_RELEASE_EVIDENCE_TEMPLATE.md',
    'docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md',
    'docs/40_reports/playtest/20260517_EXTERNAL_PLAYTEST_DRY_RUN_TEMPLATE.md',
    'docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md',
    'docs/playtesting/v092/tester_quickstart.md',
    'docs/playtesting/v092/feedback_form_schema.md',
];

const OPERATOR_ONLY_GATES = [
    'clean_vm_windows_install_launch_save_load_uninstall',
    'smartscreen_wording_capture',
    'settings_apps_entry_version',
    'appdata_persistence',
    'nsis_uninstaller_registry_cleanup',
    'tester_distribution_and_feedback_intake',
];

const AUTOMATED_GATES = [
    { id: 'typecheck', command: 'npm.cmd run typecheck' },
    { id: 'fast_tests', command: 'npm.cmd run test:vitest:fast' },
    { id: 'scenario_tests', command: 'npm.cmd run test:vitest:scenario' },
    { id: 'desktop_release_check', command: 'npm.cmd run desktop:release:check' },
    { id: 'package_probe', command: 'npm.cmd run desktop:package:probe' },
    { id: 'nsis_smoke', command: 'npm.cmd run desktop:package:win:nsis:smoke -- --report-only' },
];

function byteCompare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function parseArgs(argv) {
    const args = {
        artifact: null,
        channel: 'external-playtest',
        commit: null,
        packageVersion: null,
        dryRun: false,
        format: 'json',
        help: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--artifact' && i + 1 < argv.length) {
            args.artifact = argv[i + 1];
            i++;
        } else if (arg === '--channel' && i + 1 < argv.length) {
            args.channel = argv[i + 1];
            i++;
        } else if (arg === '--commit' && i + 1 < argv.length) {
            args.commit = argv[i + 1];
            i++;
        } else if (arg === '--package-version' && i + 1 < argv.length) {
            args.packageVersion = argv[i + 1];
            i++;
        } else if (arg === '--format' && i + 1 < argv.length) {
            args.format = argv[i + 1];
            i++;
        } else if (arg === '--dry-run') {
            args.dryRun = true;
        } else if (arg === '--help' || arg === '-h') {
            args.help = true;
        }
    }

    return args;
}

function gitCapture(gitArgs) {
    return execFileSync('git', gitArgs, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

function resolveCommit(explicit) {
    if (explicit && explicit.length > 0) return explicit;
    try {
        return gitCapture(['rev-parse', 'HEAD']);
    } catch (_e) {
        return 'UNKNOWN_COMMIT';
    }
}

function resolvePackageVersion(explicit) {
    if (explicit && explicit.length > 0) return explicit;
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    return String(pkg.version || 'UNKNOWN_VERSION');
}

function normalizeArtifactPath(artifact) {
    if (!artifact || artifact.length === 0) return null;
    const absolute = path.resolve(ROOT, artifact);
    return {
        input: artifact,
        absolute: absolute,
        relative: path.relative(ROOT, absolute).replace(/\\/g, '/'),
    };
}

function sha256File(filePath) {
    const hash = createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
}

function describeArtifact(artifact) {
    const normalized = normalizeArtifactPath(artifact);
    if (!normalized) {
        return {
            path: null,
            exists: false,
            sizeBytes: null,
            sha256: null,
            note: 'No artifact path supplied. Dry-run only.',
        };
    }
    if (!fs.existsSync(normalized.absolute) || !fs.statSync(normalized.absolute).isFile()) {
        return {
            path: normalized.relative,
            exists: false,
            sizeBytes: null,
            sha256: null,
            note: 'Artifact not found. Do not distribute until a real artifact is supplied and hashed.',
        };
    }
    const stat = fs.statSync(normalized.absolute);
    return {
        path: normalized.relative,
        exists: true,
        sizeBytes: stat.size,
        sha256: sha256File(normalized.absolute),
        note: 'Artifact identity recorded only; clean-VM evidence is still required.',
    };
}

function buildLaunchArtifactPlan(options) {
    const channel = options.channel === 'gold' ? 'gold' : 'external-playtest';
    const artifact = describeArtifact(options.artifact);
    const templates = TEMPLATE_PATHS.slice().sort(byteCompare).map((p) => ({
        path: p,
        exists: fs.existsSync(path.join(ROOT, p)),
    }));

    return {
        schemaVersion: 1,
        mode: options.dryRun ? 'dry-run' : 'plan',
        channel: channel,
        packageVersion: resolvePackageVersion(options.packageVersion),
        commit: resolveCommit(options.commit),
        artifact: artifact,
        automatedGates: AUTOMATED_GATES.slice(),
        evidenceTemplates: templates,
        operatorOnlyRemaining: OPERATOR_ONLY_GATES.slice().sort(byteCompare),
        policy: {
            exactArtifactOnly: true,
            cleanVmRequiredBeforeDistribution: true,
            distributionApproved: false,
            noCleanVmEvidenceClaimed: true,
            noUploadPerformed: true,
        },
        outputs: {
            releaseEvidence: 'docs/40_reports/release/20260517_RELEASE_EVIDENCE_TEMPLATE.md',
            cleanVmEvidence: 'docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md',
            playtestDryRun: 'docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md',
        },
    };
}

function renderMarkdown(plan) {
    const lines = [];
    lines.push('# Launch Artifact Dry Run');
    lines.push('');
    lines.push('- mode: `' + plan.mode + '`');
    lines.push('- channel: `' + plan.channel + '`');
    lines.push('- package version: `' + plan.packageVersion + '`');
    lines.push('- commit: `' + plan.commit + '`');
    lines.push('- artifact: `' + (plan.artifact.path || 'not supplied') + '`');
    lines.push('- artifact exists: `' + String(plan.artifact.exists) + '`');
    lines.push('- artifact sha256: `' + (plan.artifact.sha256 || 'not available') + '`');
    lines.push('');
    lines.push('## Policy');
    lines.push('');
    lines.push('- exact artifact only: `' + String(plan.policy.exactArtifactOnly) + '`');
    lines.push('- clean VM required before distribution: `' + String(plan.policy.cleanVmRequiredBeforeDistribution) + '`');
    lines.push('- distribution approved: `' + String(plan.policy.distributionApproved) + '`');
    lines.push('- no clean-VM evidence claimed: `' + String(plan.policy.noCleanVmEvidenceClaimed) + '`');
    lines.push('');
    lines.push('## Automated Gates');
    lines.push('');
    for (const gate of plan.automatedGates) {
        lines.push('- `' + gate.id + '`: `' + gate.command + '`');
    }
    lines.push('');
    lines.push('## Operator-Only Remaining');
    lines.push('');
    for (const gate of plan.operatorOnlyRemaining) {
        lines.push('- `' + gate + '`');
    }
    lines.push('');
    lines.push('## Templates');
    lines.push('');
    for (const template of plan.evidenceTemplates) {
        lines.push('- `' + template.path + '` exists=`' + String(template.exists) + '`');
    }
    lines.push('');
    return lines.join('\n');
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        process.stdout.write('Usage: node tools/release/prepare_launch_artifacts.cjs --dry-run [--artifact <path>] [--channel external-playtest|gold] [--format json|markdown]\n');
        return 0;
    }
    if (!args.dryRun) {
        process.stderr.write('Refusing to run without --dry-run. This tool only prepares evidence plans.\n');
        return 2;
    }
    const plan = buildLaunchArtifactPlan(args);
    if (args.format === 'markdown') {
        process.stdout.write(renderMarkdown(plan));
    } else {
        process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
    }
    return 0;
}

if (require.main === module) {
    process.exit(main());
}

module.exports = {
    parseArgs,
    buildLaunchArtifactPlan,
    renderMarkdown,
    byteCompare,
};
