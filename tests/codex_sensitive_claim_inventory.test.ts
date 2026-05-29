import assert from 'node:assert';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'vitest';

const require = createRequire(import.meta.url);
const inventory = require('../tools/diagnostics/codex_sensitive_claim_inventory.cjs');

async function writeJson(filePath: string, value: unknown) {
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function expectedClaimId(file: string, line: number, fieldPath: string, matchedTerms: string[]) {
    const basis = [file, String(line), fieldPath, matchedTerms.join('|')].join('\n');
    return `sci_${createHash('sha256').update(basis).digest('hex').slice(0, 16)}`;
}

test('inventory scans bounded surfaces with stable ordering, ids, and source status', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));

    try {
        await mkdir(join(root, 'data', 'scenarios', 'essays'), { recursive: true });
        await mkdir(join(root, 'data', 'scenarios', 'events'), { recursive: true });
        await mkdir(join(root, 'data', 'codex', 'ghost_entries'), { recursive: true });
        await mkdir(join(root, 'data', 'codex', 'ghost_entries_bcs'), { recursive: true });
        await mkdir(join(root, 'src', 'ui', 'map', 'data'), { recursive: true });

        await writeJson(join(root, 'data', 'scenarios', 'essays', 'z_uncited.json'), {
            id: 'z_uncited',
            category: 'humanitarian',
            title: 'Zeta',
            body: 'The 5th Corps sweeps west and cleanses the corridor.',
            sources: [],
        });
        await writeJson(join(root, 'data', 'scenarios', 'essays', 'a_cited.json'), {
            id: 'a_cited',
            category: 'military',
            title: 'Alpha',
            body: 'The VRS captured the town after a forced displacement campaign.',
            sources: ['Fixture source A', 'Fixture source B'],
        });
        await writeJson(join(root, 'data', 'scenarios', 'essays', 'essay_index.json'), {
            body: 'TODO cleanse this index entry must stay excluded.',
        });
        await writeJson(join(root, 'data', 'scenarios', 'events', 'consequences.json'), {
            consequences: [
                {
                    id: 'dynamic_candidate',
                    text: 'If the enclave falls, refugees flee unless relief arrives.',
                },
            ],
        });
        await writeFile(
            join(root, 'data', 'codex', 'ghost_entries', 'ghost.md'),
            '# Ghost\n\nPlayer TODO: cleansing lever scaffold must not leak.\n',
        );
        await writeFile(
            join(root, 'data', 'codex', 'ghost_entries_bcs', 'ghost_bcs.md'),
            '# Ghost BCS\n\nCivilian massacre note.\n',
        );
        await writeFile(
            join(root, 'src', 'ui', 'map', 'data', 'decisionConsequenceLedger.ts'),
            "export const row = 'The Chronicle says the army sweeps west.';\n",
        );

        const result = await inventory.scanSensitiveClaimInventory({ rootDir: root });

        assert.deepStrictEqual(result.scan_scope.files, [
            'data/codex/ghost_entries/ghost.md',
            'data/codex/ghost_entries_bcs/ghost_bcs.md',
            'data/scenarios/essays/a_cited.json',
            'data/scenarios/essays/z_uncited.json',
            'data/scenarios/events/consequences.json',
            'src/ui/map/data/decisionConsequenceLedger.ts',
        ]);
        assert.strictEqual(result.scan_scope.files.includes('data/scenarios/essays/essay_index.json'), false);
        assert.deepStrictEqual(result.claims.map((claim: { file: string }) => claim.file), [
            'data/codex/ghost_entries/ghost.md',
            'data/codex/ghost_entries_bcs/ghost_bcs.md',
            'data/scenarios/essays/a_cited.json',
            'data/scenarios/essays/z_uncited.json',
            'data/scenarios/events/consequences.json',
            'src/ui/map/data/decisionConsequenceLedger.ts',
        ]);

        const cited = result.claims.find((claim: { file: string }) => claim.file === 'data/scenarios/essays/a_cited.json');
        assert.strictEqual(cited.surface, 'essay');
        assert.strictEqual(cited.field_path, '$.body');
        assert.strictEqual(cited.source_status, 'cited');
        assert.deepStrictEqual(cited.matched_terms, ['captured', 'forced displacement']);
        assert.strictEqual(cited.risk_class, 'sensitive_history_gated');
        assert.strictEqual(cited.stop_gate, 'sensitive_history');
        assert.strictEqual(cited.claim_id, expectedClaimId(cited.file, cited.line, cited.field_path, cited.matched_terms));

        const floorException = result.claims.find((claim: { file: string }) => claim.file === 'data/scenarios/essays/z_uncited.json');
        assert.strictEqual(floorException.source_status, 'source_floor_exception');
        assert.strictEqual(floorException.actor_faction, 'RBiH');
        assert.deepStrictEqual(floorException.matched_terms, ['5th Corps sweeps west', 'cleanses']);

        const consequence = result.claims.find((claim: { surface: string }) => claim.surface === 'event_consequence');
        assert.strictEqual(consequence.risk_class, 'dynamic_state_candidate');
        assert.strictEqual(consequence.stop_gate, 'mechanics');

        const srcClaim = result.claims.find((claim: { surface: string }) => claim.surface === 'src_consequence_read_model');
        assert.strictEqual(srcClaim.file, 'src/ui/map/data/decisionConsequenceLedger.ts');
        assert.strictEqual(srcClaim.source_status, 'uncited');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('inventory detects forbidden scaffold tokens and reports deterministic policy', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));

    try {
        await mkdir(join(root, 'data', 'codex', 'ghost_entries'), { recursive: true });
        await writeFile(
            join(root, 'data', 'codex', 'ghost_entries', 'scaffold.md'),
            'Designer FIXME: atrocity lever placeholder.\n',
        );

        const first = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        const second = await inventory.scanSensitiveClaimInventory({ rootDir: root });

        assert.deepStrictEqual(first, second);
        assert.strictEqual(first.schema_version, 1);
        assert.strictEqual(first.summary.claim_count, 1);
        assert.deepStrictEqual(first.summary.risk_class_counts, { unsupported_remove: 1 });
        assert.deepStrictEqual(first.policy.term_sets.forbidden_scaffold, ['FIXME', 'TODO', 'atrocity lever', 'cleansing lever', 'placeholder']);
        assert.deepStrictEqual(first.claims[0].matched_terms, ['FIXME', 'atrocity lever', 'placeholder']);
        assert.strictEqual(first.claims[0].risk_class, 'unsupported_remove');
        assert.strictEqual(first.claims[0].stop_gate, 'canon');
        assert.strictEqual(inventory.stableStringify(first), inventory.stableStringify(second));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
