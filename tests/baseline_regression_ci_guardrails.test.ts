import assert from 'node:assert';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

test('baseline regression workflow keeps the canonical typecheck and Vitest gates', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'baseline-regression.yml'),
        'utf8',
    );

    assert.match(
        workflow,
        /npm run typecheck/,
        'baseline regression workflow should keep the canonical root typecheck gate',
    );
    assert.match(
        workflow,
        /npm run test:vitest/,
        'baseline regression workflow should keep the canonical Vitest gate',
    );
});

test('baseline regression is the sole always-run typecheck owner on main pushes and pull requests', async () => {
    const workflowDir = join(process.cwd(), '.github', 'workflows');
    const workflow = await readFile(join(workflowDir, 'baseline-regression.yml'), 'utf8');

    await assert.rejects(
        access(join(workflowDir, 'typecheck.yml')),
        'the duplicate standalone pull-request typecheck workflow should stay retired',
    );
    assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/);
    assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\[main\]/);
    assert.match(workflow, /\n  typecheck:\s*\n\s*runs-on:\s*ubuntu-latest/);
    assert.match(workflow, /npm run typecheck/);
});

test('event CI retains development-branch type feedback and every distinct event contract', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'event-system-ci.yml'),
        'utf8',
    );

    assert.match(
        workflow,
        /name: TypeScript typecheck \(development-branch pushes\)\s*\n\s*if: github\.event_name == 'push' && github\.ref != 'refs\/heads\/main'\s*\n\s*run: npm run typecheck/,
        'Event CI should retain typecheck feedback only where Baseline Regression has no same-event owner',
    );
    assert.match(workflow, /- name: Event-system \+ Phase E\/F\/H suite\s*\n\s*run: \|/);
    assert.match(workflow, /- name: Phase F2 strict gate \(canon-compliance hard rail\)\s*\n\s*run: \|/);
    assert.match(workflow, /- name: Baseline regression\s*\n\s*run: node node_modules\/tsx\/dist\/cli\.mjs tools\/scenario_runner\/run_baseline_regression\.ts/);
});

test('always-report engine health fails when its required scenario parent fails', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'baseline-regression.yml'),
        'utf8',
    );
    const engineHealth = workflow.slice(workflow.indexOf('  engine-health-188w:'));

    assert.match(engineHealth, /needs: scenarios\s*\n\s*if: \$\{\{ always\(\) \}\}/);
    assert.match(engineHealth, /if: \$\{\{ needs\.scenarios\.result != 'success' \}\}/);
    assert.match(engineHealth, /exit 1/);
});
