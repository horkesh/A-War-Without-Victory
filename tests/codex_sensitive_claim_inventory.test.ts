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

test('inventory covers essay_index dynamic_sections (A1c morphing prose) the runtime serves', async () => {
    // Regression for the #334 §6-governance gap: the runtime Codex panel imports
    // essay_index.json and serves its dynamic_sections to the player, but the
    // per-essay JSON files have NO dynamic_sections. The inventory must scan the
    // index's dynamic_sections slice (and ONLY that slice) so sensitive
    // morphing-prose claims are inventoried + source-checked.
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));

    try {
        await mkdir(join(root, 'data', 'scenarios', 'essays'), { recursive: true });

        // Per-essay body file: canonical body only, no dynamic_sections (the
        // real-world shape). This is what carries the body claim.
        await writeJson(join(root, 'data', 'scenarios', 'essays', 'un_hostage_crisis_1995.json'), {
            id: 'essay_un_hostage_crisis_1995',
            category: 'diplomatic',
            title: 'UN Hostage Crisis',
            content: 'The crisis unfolded over weeks.',
            sources: ['Per-essay source A', 'Per-essay source B'],
        });

        // Index: canonical body duplicated PLUS the A1c morphing branch. Only the
        // dynamic_sections must be scanned here; the duplicated body must NOT be
        // (it is covered by the per-essay file above — no double-count).
        await writeJson(join(root, 'data', 'scenarios', 'essays', 'essay_index.json'), {
            essays: [
                {
                    id: 'essay_un_hostage_crisis_1995',
                    category: 'diplomatic',
                    title: 'UN Hostage Crisis',
                    content: 'The crisis unfolded over weeks.',
                    sources: [
                        'ICTY Karadzic Trial Judgment (IT-95-5/18-T), Count 11 (hostage-taking)',
                    ],
                    dynamic_sections: [
                        {
                            id: 'v091_index_only_body_clone',
                            insert_after_paragraph: 0,
                            // Body-flavored prose with NO sensitive term: must not produce a claim.
                            content: 'The conference record is read against the war that followed.',
                        },
                        {
                            id: 'a1c_un_hostage_branch_maintain',
                            condition: 'RESPONSE:un_hostage_crisis_1995:maintain_hostages',
                            insert_after_paragraph: 6,
                            variant: 'divergence',
                            content: 'Prolonged detention of peacekeepers as human shields is addressed in the ICTY record (Karadzic Trial Judgement, IT-95-5/18-T).',
                        },
                    ],
                },
            ],
        });

        const result = await inventory.scanSensitiveClaimInventory({ rootDir: root });

        // The index now appears in scan scope BECAUSE it carries dynamic_sections.
        assert.strictEqual(result.scan_scope.files.includes('data/scenarios/essays/essay_index.json'), true);

        const indexClaims = result.claims.filter(
            (claim: { surface: string }) => claim.surface === 'essay_dynamic_section',
        );
        // Exactly one claim: the sensitive `detention` branch. The body-clone
        // dynamic section has no sensitive vocabulary → no claim (no double-count
        // of the canonical body).
        assert.strictEqual(indexClaims.length, 1);

        const hostage = indexClaims[0];
        assert.strictEqual(hostage.file, 'data/scenarios/essays/essay_index.json');
        assert.deepStrictEqual(hostage.matched_terms, ['detention']);
        assert.strictEqual(hostage.risk_class, 'sensitive_history_gated');
        assert.strictEqual(hostage.stop_gate, 'sensitive_history');
        // Source attribution falls back to the parent essay's `sources` (the
        // ICTY citation) — the claim is cited, not uncited.
        assert.strictEqual(hostage.source_status, 'cited');
        // field_path is keyed by the parent essay id for human traceability.
        assert.strictEqual(
            hostage.field_path.startsWith('$.essay_un_hostage_crisis_1995.dynamic_sections'),
            true,
        );

        // The per-essay body claim is still present and classified as a plain essay.
        const bodyClaims = result.claims.filter(
            (claim: { file: string }) => claim.file === 'data/scenarios/essays/un_hostage_crisis_1995.json',
        );
        assert.strictEqual(bodyClaims.every((c: { surface: string }) => c.surface === 'essay'), true);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('inventory keeps a dynamic_sections-free essay_index out of scan scope', async () => {
    // A body-only index (no essay carries dynamic_sections) contributes nothing
    // and must stay excluded — preserving the original body-duplication exclusion.
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));

    try {
        await mkdir(join(root, 'data', 'scenarios', 'essays'), { recursive: true });
        await writeJson(join(root, 'data', 'scenarios', 'essays', 'essay_index.json'), {
            essays: [
                {
                    id: 'essay_plain',
                    category: 'diplomatic',
                    title: 'Plain',
                    content: 'The VRS captured the town after a forced displacement campaign.',
                    sources: ['Source A'],
                },
            ],
        });

        const result = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        assert.strictEqual(result.scan_scope.files.includes('data/scenarios/essays/essay_index.json'), false);
        assert.strictEqual(
            result.claims.some((claim: { surface: string }) => claim.surface === 'essay_dynamic_section'),
            false,
        );
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
