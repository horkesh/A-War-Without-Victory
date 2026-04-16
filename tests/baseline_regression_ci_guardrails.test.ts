import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

test('baseline regression workflow installs nested map UI deps before typecheck and test jobs', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'baseline-regression.yml'),
        'utf8',
    );

    const nestedInstalls = workflow.match(/npm install --legacy-peer-deps --prefix src\/ui\/map/g) ?? [];

    assert.strictEqual(
        nestedInstalls.length,
        4,
        'baseline regression workflow should install nested map UI dependencies in the typecheck, test, scenarios, and baselines jobs',
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
    assert.match(
        workflow,
        /npm run test:baselines/,
        'baseline regression workflow should keep the canonical baseline regression gate',
    );
});
