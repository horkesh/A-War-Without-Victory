import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const TOOL_PATH = resolve(ROOT, 'tools', 'release', 'prepare_launch_artifacts.cjs');
const tool = require(TOOL_PATH) as {
    buildLaunchArtifactPlan: (options: {
        artifact: string | null;
        channel: string;
        commit: string | null;
        packageVersion: string | null;
        dryRun: boolean;
        format: string;
    }) => {
        mode: string;
        channel: string;
        packageVersion: string;
        commit: string;
        artifact: { path: string | null; exists: boolean; sha256: string | null };
        policy: {
            exactArtifactOnly: boolean;
            cleanVmRequiredBeforeDistribution: boolean;
            distributionApproved: boolean;
            noCleanVmEvidenceClaimed: boolean;
        };
        operatorOnlyRemaining: string[];
        evidenceTemplates: Array<{ path: string; exists: boolean }>;
    };
};

function runDryRun(args: string[]): string {
    return execFileSync(process.execPath, [TOOL_PATH, '--dry-run', ...args], {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
    });
}

describe('launch/operator artifact support', () => {
    it('dry-run manifest is deterministic and refuses distribution approval', () => {
        const a = runDryRun(['--artifact', 'dist-packaged/DOES_NOT_EXIST.exe', '--commit', 'TEST_SHA', '--package-version', '0.0.0-test']);
        const b = runDryRun(['--artifact', 'dist-packaged/DOES_NOT_EXIST.exe', '--commit', 'TEST_SHA', '--package-version', '0.0.0-test']);
        expect(a).toBe(b);

        const manifest = JSON.parse(a);
        expect(manifest.mode).toBe('dry-run');
        expect(manifest.artifact.exists).toBe(false);
        expect(manifest.artifact.sha256).toBeNull();
        expect(manifest.policy.exactArtifactOnly).toBe(true);
        expect(manifest.policy.cleanVmRequiredBeforeDistribution).toBe(true);
        expect(manifest.policy.distributionApproved).toBe(false);
        expect(manifest.policy.noCleanVmEvidenceClaimed).toBe(true);
        expect(manifest.operatorOnlyRemaining).toContain('clean_vm_windows_install_launch_save_load_uninstall');
        expect(manifest.operatorOnlyRemaining).toContain('tester_distribution_and_feedback_intake');
    });

    it('exports a plan builder with existing template coverage', () => {
        const plan = tool.buildLaunchArtifactPlan({
            artifact: null,
            channel: 'gold',
            commit: 'TEST_SHA',
            packageVersion: '1.0.0-test',
            dryRun: true,
            format: 'json',
        });

        expect(plan.channel).toBe('gold');
        expect(plan.commit).toBe('TEST_SHA');
        expect(plan.packageVersion).toBe('1.0.0-test');

        const templatePaths = plan.evidenceTemplates.map(t => t.path).sort();
        expect(templatePaths).toContain('docs/50_launch/release/launch_day_automation_template.md');
        expect(templatePaths).toContain('docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md');
        expect(templatePaths).toContain('docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md');
        for (const template of plan.evidenceTemplates) {
            expect(template.exists, `${template.path} should exist`).toBe(true);
        }
    });

    it('keeps operator templates explicit about clean-VM and exact-artifact gates', () => {
        const requiredDocs = [
            'docs/50_launch/release/launch_day_automation_template.md',
            'docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md',
            'docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md',
        ];

        for (const doc of requiredDocs) {
            const fullPath = join(ROOT, doc);
            expect(existsSync(fullPath), `${doc} should exist`).toBe(true);
            const body = readFileSync(fullPath, 'utf8');
            expect(body).toContain('SHA-256');
            expect(body).toContain('clean-VM');
            expect(body).toContain('pending');
        }

        const launchDay = readFileSync(join(ROOT, 'docs/50_launch/release/launch_day_automation_template.md'), 'utf8');
        expect(launchDay).toContain('npm.cmd run launch:artifacts:dry-run');
        expect(launchDay).toContain('distributionApproved');

        const cleanVm = readFileSync(join(ROOT, 'docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md'), 'utf8');
        expect(cleanVm).toContain('SmartScreen wording captured');
        expect(cleanVm).toContain('Settings -> Apps entry shows correct name/version');
        expect(cleanVm).toContain('Registry uninstall entry removed');

        const playtest = readFileSync(join(ROOT, 'docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md'), 'utf8');
        expect(playtest).toContain('Use only the exact artifact that passed clean-VM validation');
        expect(playtest).toContain('Feedback form matches schema');
        expect(playtest).toContain('External distribution approved: pending');
    });

    it('tool source has no time, randomness, upload, or write side effects', () => {
        const src = readFileSync(TOOL_PATH, 'utf8');
        const stripped = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n')
            .map((line) => {
                const idx = line.indexOf('//');
                return idx >= 0 ? line.slice(0, idx) : line;
            })
            .join('\n');

        expect(stripped).not.toMatch(/Math\.random/);
        expect(stripped).not.toMatch(/Date\.now/);
        expect(stripped).not.toMatch(/new Date\b/);
        expect(stripped).not.toMatch(/performance\.now/);
        expect(stripped).not.toMatch(/process\.hrtime/);
        expect(stripped).not.toMatch(/writeFile|appendFile|fetch\(|https?\.request/);
    });
});
