import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import {
    ONBOARDING_STEPS,
    TUTORIAL_SPOTLIGHT_TARGETS,
} from '../src/ui/map/components/onboarding/onboardingSteps.js';

const REPO_ROOT = process.cwd();
const MAP_SRC_DIR = resolve(REPO_ROOT, 'src/ui/map');

function listSourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir).sort()) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            files.push(...listSourceFiles(full));
            continue;
        }

        const ext = extname(full);
        if (ext === '.ts' || ext === '.tsx') {
            files.push(full);
        }
    }
    return files.sort();
}

const MAP_SOURCE_FILES = Object.freeze(listSourceFiles(MAP_SRC_DIR));

function readSource(absPath: string): string {
    return readFileSync(absPath, 'utf-8');
}

function findSpotlightEmitters(token: string): string[] {
    const literalNeedle = `data-tutorial-step="${token}"`;
    const emitters: string[] = [];

    for (const file of MAP_SOURCE_FILES) {
        const source = readSource(file);
        if (source.includes(literalNeedle)) {
            emitters.push(relative(REPO_ROOT, file).replaceAll('\\', '/'));
            continue;
        }

        if (token.startsWith('army-hq-tab-')) {
            const tabId = token.slice('army-hq-tab-'.length);
            const dynamicTabEmitter =
                /data-tutorial-step=\{`army-hq-tab-\$\{[A-Za-z_][A-Za-z0-9_]*\}`\}/.test(source) &&
                new RegExp(`id:\\s*['"]${tabId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(source);
            if (dynamicTabEmitter) {
                emitters.push(relative(REPO_ROOT, file).replaceAll('\\', '/'));
            }
        }
    }

    return emitters.sort();
}

describe('onboarding spotlight targets', () => {
    it('fixes the round-two audit copy defects', () => {
        const byId = new Map(ONBOARDING_STEPS.map(step => [step.id, step]));

        expect(byId.get('01_welcome')?.body).toContain('opening presidential brief');
        expect(byId.get('03_brief')?.body).toContain('RECORDS opens the Army HQ records view');
        expect(byId.get('03_brief')?.body).toContain('CODEX keeps historical context close');
        expect(byId.get('05_decide')?.body).toBe(
            "Before you advance the turn, the President's Desk surfaces every pending choice. Each row opens its resolver or the staff panel it came from -- open it, decide, return. Resolve what you can; defer what you must.",
        );
        expect(byId.get('06_execute')?.body).toBe(
            "Your corps commanders propose operations and present them for your decision when they're ready to launch. Approve to authorize, decline to refuse, or force-launch to override their judgment at the cost of command authority. Brigades never attack alone -- every assault flows through a corps operation.",
        );
    });

    it('has a rendered data-tutorial-step emitter for every non-null step target', () => {
        const validTargets = new Set(TUTORIAL_SPOTLIGHT_TARGETS);
        const failures: string[] = [];

        for (const step of ONBOARDING_STEPS) {
            const target = step.target_ui_element;
            if (target === null) continue;

            if (!validTargets.has(target)) {
                failures.push(`${step.id}: target '${target}' is missing from TUTORIAL_SPOTLIGHT_TARGETS`);
                continue;
            }

            const emitters = findSpotlightEmitters(target);
            if (emitters.length === 0) {
                failures.push(`${step.id}: target '${target}' has no data-tutorial-step emitter under src/ui/map`);
            }
        }

        expect(failures, failures.join('\n')).toEqual([]);
    });
});
