import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

test('baseline regression workflow keeps the canonical typecheck and Vitest gates', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'baseline-regression.yml'),
        'utf8',
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
