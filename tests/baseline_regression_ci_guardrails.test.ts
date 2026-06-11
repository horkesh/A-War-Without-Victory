import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

test('baseline regression workflow installs nested map UI deps before typecheck, test, and scenarios jobs', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'baseline-regression.yml'),
        'utf8',
    );

    const nestedInstalls = workflow.match(/npm install --legacy-peer-deps --prefix src\/ui\/map/g) ?? [];

    // 5 jobs: typecheck, scenario-anchors, test, scenarios, engine-health-188w.
    // Baselines job removed 2026-05-04 (LANE-NIGHTSHIFT-PLATFORM-STABLE-MANIFEST
    // follow-up) because byte-hash baseline comparison is platform-bound and
    // fails between Windows dev and Linux CI. scenario-anchors job added later.
    // engine-health-188w (advisory) added 2026-06-11 — it runs a --map 188w
    // scenario for the engine-health gate, so it likewise installs the nested
    // map UI deps before running.
    assert.strictEqual(
        nestedInstalls.length,
        5,
        'baseline regression workflow should install nested map UI dependencies in the typecheck, scenario-anchors, test, scenarios, and engine-health-188w jobs',
    );
    assert.match(
        workflow,
        /npx tsc --noEmit/,
        'baseline regression workflow should keep the canonical root typecheck gate',
    );
    assert.match(
        workflow,
        /npm run test:vitest/,
        'baseline regression workflow should keep the canonical Vitest gate',
    );
});
