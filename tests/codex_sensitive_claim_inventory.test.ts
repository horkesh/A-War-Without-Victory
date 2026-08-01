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
            'data/scenarios/essays/a_cited.json',
            'data/scenarios/essays/z_uncited.json',
            'data/scenarios/essays/z_uncited.json',
            'data/scenarios/events/consequences.json',
            'src/ui/map/data/decisionConsequenceLedger.ts',
        ]);

        const cited = result.claims.find((claim: { file: string; field_path: string }) => (
            claim.file === 'data/scenarios/essays/a_cited.json' && claim.field_path === '$.body'
        ));
        assert.strictEqual(cited.surface, 'essay');
        assert.strictEqual(cited.field_path, '$.body');
        assert.strictEqual(cited.source_status, 'cited');
        assert.deepStrictEqual(cited.matched_terms, ['captured', 'forced displacement']);
        assert.strictEqual(cited.risk_class, 'sensitive_history_gated');
        assert.strictEqual(cited.stop_gate, 'sensitive_history');
        assert.strictEqual(cited.claim_id, expectedClaimId(cited.file, cited.line, cited.field_path, cited.matched_terms));

        const floorException = result.claims.find((claim: { file: string; field_path: string }) => (
            claim.file === 'data/scenarios/essays/z_uncited.json' && claim.field_path === '$.body'
        ));
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
        // Both dynamic-section prose fields are claims, including prose without
        // a sensitive dictionary hit. The duplicated top-level canonical body
        // remains excluded, so the body is not double-counted.
        assert.strictEqual(indexClaims.length, 2);

        const hostage = indexClaims.find((claim: { matched_terms: string[] }) => (
            claim.matched_terms.includes('detention')
        ));
        assert.ok(hostage);
        assert.strictEqual(hostage.file, 'data/scenarios/essays/essay_index.json');
        assert.deepStrictEqual(hostage.matched_terms, ['detention']);
        assert.strictEqual(hostage.risk_class, 'sensitive_history_gated');
        assert.strictEqual(hostage.stop_gate, 'sensitive_history');
        // Codex #338 P2: the parent essay is `diplomatic` (floor 2) but carries
        // only ONE source, so the dynamic-section claim must inherit the same
        // two-source editorial floor exception as the canonical essay body —
        // NOT report `cited` off the lone parent citation. (Before the #338 fix
        // `sourceStatusFor` only ran the floor check for surface === 'essay',
        // so this claim wrongly reported `cited` and bypassed the gate.)
        assert.strictEqual(hostage.source_status, 'source_floor_exception');
        assert.deepStrictEqual(hostage.provenance_gaps, ['source_floor', 'source_note', 'source_tier']);
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

test('dynamic_section claims clear the source floor when the parent has enough sources (#338)', async () => {
    // Codex #338 P2 positive case: the floor exception is conditional on the
    // PARENT essay's source count, not a blanket downgrade. A diplomatic parent
    // (floor 2) carrying TWO sources keeps its dynamic-section claims `cited`.
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));

    try {
        await mkdir(join(root, 'data', 'scenarios', 'essays'), { recursive: true });
        await writeJson(join(root, 'data', 'scenarios', 'essays', 'essay_index.json'), {
            essays: [
                {
                    id: 'essay_two_source',
                    category: 'diplomatic',
                    title: 'Two Source',
                    content: 'Canonical body.',
                    sources: ['ICTY source A', 'UN source B'],
                    dynamic_sections: [
                        {
                            id: 'a1c_two_source_branch',
                            condition: 'RESPONSE:two_source:branch',
                            insert_after_paragraph: 1,
                            variant: 'divergence',
                            content: 'Prolonged detention of peacekeepers as human shields.',
                        },
                    ],
                },
            ],
        });

        const result = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        const indexClaims = result.claims.filter(
            (claim: { surface: string }) => claim.surface === 'essay_dynamic_section',
        );
        assert.strictEqual(indexClaims.length, 1);
        assert.strictEqual(indexClaims[0].source_status, 'cited');
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
        assert.strictEqual(first.schema_version, 4);
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

test('inventory emits actionable historical provenance and interaction ownership', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));

    try {
        await mkdir(join(root, 'data', 'scenarios', 'events'), { recursive: true });
        await writeJson(join(root, 'data', 'scenarios', 'events', 'war_1993.json'), [
            {
                id: 'grabovica_uzdol_massacres_1993',
                category: 'humanitarian',
                narrative: 'ARBiH soldiers killed Croat civilians at Grabovica and Uzdol in September 1993.',
                source_tier: 'icty_icj_un',
                historical_source: 'ICTY Halilovic Trial Judgment (IT-01-48-T).',
                source_note: 'Provenance only; distinguishes charged acts from the acquittal on command responsibility.',
                responding_faction: 'RBiH',
                trigger: {
                    turn_min: 74,
                    turn_max: 76,
                    phase: 'war',
                    requires_events: ['operation_neretva_93_1993'],
                },
                once: true,
            },
            {
                id: 'forbidden_choice_1993',
                category: 'humanitarian',
                narrative: 'A sensitive-history fixture.',
                source_tier: 'design_counterfactual',
                historical_source: 'Fixture citation.',
                source_note: 'Fixture source note.',
                responding_faction: 'RBiH',
                trigger: { turn_min: 74, turn_max: 76, phase: 'war' },
                response_options: [{ id: 'authorize', label: 'Authorize forced displacement of civilians' }],
            },
        ]);

        const result = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        const grabovica = result.claims.find((claim: { subject_id: string; field_path: string }) => (
            claim.subject_id === 'grabovica_uzdol_massacres_1993' && claim.field_path === '$[0].narrative'
        ));
        assert.ok(grabovica);
        assert.strictEqual(result.schema_version, 4);
        assert.strictEqual(grabovica.ring, 'ring_2_informational');
        assert.strictEqual(grabovica.claim, grabovica.excerpt);
        assert.strictEqual(grabovica.date_window, 'turns 74-76');
        assert.strictEqual(grabovica.state_predicate, 'phase=war; requires_events=operation_neretva_93_1993');
        assert.strictEqual(grabovica.source_tier, 'icty_icj_un');
        assert.strictEqual(grabovica.source_tier_status, 'resolved');
        assert.strictEqual(grabovica.citation, 'ICTY Halilovic Trial Judgment (IT-01-48-T).');
        assert.strictEqual(grabovica.respondent, 'RBiH');
        assert.strictEqual(grabovica.player_interaction_type, 'informational');
        assert.strictEqual(grabovica.status, 'documented');
        assert.strictEqual(grabovica.owner, 'historian');

        const forbiddenChoice = result.claims.find((claim: { subject_id: string; field_path: string }) => (
            claim.subject_id === 'forbidden_choice_1993' && claim.field_path.includes('response_options')
        ));
        assert.ok(forbiddenChoice);
        assert.strictEqual(forbiddenChoice.ring, 'ring_3_refused_candidate');
        assert.strictEqual(forbiddenChoice.player_interaction_type, 'player_choice');
        assert.strictEqual(forbiddenChoice.status, 'blocked_sensitive_player_choice');
        assert.strictEqual(forbiddenChoice.owner, 'historian+game-designer');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('inventory blocks direct sensitive acts without treating contextual or canon-allowed wording as choices', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));

    try {
        await mkdir(join(root, 'data', 'scenarios', 'events'), { recursive: true });
        await writeJson(join(root, 'data', 'scenarios', 'events', 'war_1992.json'), [
            {
                id: 'direct_displacement_choice_1992',
                historical_source: 'Fixture source.',
                source_note: 'Fixture boundary note.',
                response_options: [{ id: 'systematic', label: 'Systematic cleansing' }],
            },
            {
                id: 'direct_genocide_choice_1992',
                historical_source: 'Fixture source.',
                source_note: 'Fixture boundary note.',
                response_options: [{
                    id: 'aggressive',
                    description: 'General Staff warned of genocide. Proceed anyway and make it swift.',
                }],
            },
            {
                id: 'direct_refused_verbs_1992',
                historical_source: 'Fixture source.',
                source_note: 'Fixture boundary note.',
                response_options: [
                    { id: 'expel', label: 'Expel the population' },
                    { id: 'camps', label: 'Authorize concentration camps' },
                    { id: 'kill', label: 'Order civilians killed' },
                    { id: 'deport', label: 'Deport the civilian population' },
                    { id: 'continue', label: 'Continue expulsions' },
                    { id: 'forced', label: 'Authorize forced displacement' },
                    { id: 'cleansing', label: 'Proceed with ethnic cleansing' },
                    { id: 'negated_then_kill', description: 'Do not authorize detention camps, then kill civilians' },
                    { id: 'refuse_then_execute', description: 'Refuse to deploy paramilitary forces, then execute the displaced families' },
                    { id: 'investigate_then_genocide', description: 'Authorize an investigation of concentration camps, then commit genocide' },
                ],
            },
            {
                id: 'lexical_context_1992',
                historical_source: 'Fixture source.',
                source_note: 'Fixture boundary note.',
                response_options: [
                    { id: 'political', label: 'Keep the hardline camp together' },
                    { id: 'command', description: 'Civilian authority over the military must be established.' },
                    { id: 'press', description: 'Invite scrutiny of front-line conditions and treatment of civilians.' },
                    { id: 'dayton', description: 'Accept Annex 7 refugee-return commitments.' },
                    {
                        id: 'guarded',
                        label: 'Adopt the platform',
                        future_consequences: [{
                            explanation: 'This branch may not re-author cleansing or forced displacement.',
                        }],
                    },
                ],
            },
            {
                id: 'rs_paramilitary_policy_1992',
                family: 'rs_paramilitary_policy',
                historical_source: 'Fixture source.',
                source_note: 'Fixture boundary note.',
                response_options: [
                    {
                        id: 'always_allow',
                        label: 'Always allow paramilitary deployment',
                        description: 'Each approved sweep records civilian casualties.',
                    },
                    { id: 'commit_genocide', label: 'Commit genocide' },
                    { id: 'kill_civilians', label: 'Kill civilians' },
                ],
            },
            {
                id: 'generic_symmetry_1992',
                historical_source: 'Fixture source.',
                source_note: 'Fixture boundary note.',
                narrative: 'No faction in the war holds clean hands after atrocities against civilians.',
            },
        ]);

        const report = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        const blocked = report.claims.filter((claim: { status: string }) => (
            claim.status === 'blocked_sensitive_player_choice'
        ));
        assert.deepStrictEqual([...new Set(blocked.map((claim: { subject_id: string }) => claim.subject_id))], [
            'direct_displacement_choice_1992',
            'direct_genocide_choice_1992',
            'direct_refused_verbs_1992',
            'rs_paramilitary_policy_1992',
        ]);
        assert.strictEqual(blocked.filter((claim: { subject_id: string }) => (
            claim.subject_id === 'direct_refused_verbs_1992'
        )).length, 10);

        const contextual = report.claims.filter((claim: { subject_id: string }) => (
            claim.subject_id === 'lexical_context_1992'
        ));
        assert.ok(contextual.length > 0);
        assert.strictEqual(contextual.every((claim: { status: string }) => (
            claim.status !== 'blocked_sensitive_player_choice'
        )), true);
        assert.strictEqual(contextual.some((claim: { player_interaction_type: string }) => (
            claim.player_interaction_type === 'decision_context'
        )), true);

        const allowed = report.claims.filter((claim: { subject_id: string; field_path: string }) => (
            claim.subject_id === 'rs_paramilitary_policy_1992'
            && claim.field_path === '$[4].response_options[0].label'
        ));
        assert.ok(allowed.length > 0);
        assert.strictEqual(allowed.every((claim: { status: string }) => (
            claim.status !== 'blocked_sensitive_player_choice'
        )), true);
        assert.strictEqual(blocked.filter((claim: { subject_id: string }) => (
            claim.subject_id === 'rs_paramilitary_policy_1992'
        )).length, 2);

        const symmetry = report.claims.find((claim: { subject_id: string }) => (
            claim.subject_id === 'generic_symmetry_1992'
        ));
        assert.ok(symmetry);
        assert.strictEqual(symmetry.status, 'needs_actor_specificity');
        assert.strictEqual(symmetry.owner, 'historian');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('inventory reports the 1993 placement/window contract for Neretva, Grabovica, and Uzdol', async () => {
    const result = await inventory.scanSensitiveClaimInventory({ rootDir: process.cwd() });
    const anchors = result.historical_anchors;

    assert.deepStrictEqual(anchors.map((row: { anchor_id: string }) => row.anchor_id), [
        'grabovica_uzdol_massacres_1993',
        'operation_neretva_93_1993',
    ]);
    assert.deepStrictEqual(anchors.map((row: { chronology_status: string }) => row.chronology_status), ['pass', 'pass']);
    assert.deepStrictEqual(anchors.map((row: { provenance_status: string }) => row.provenance_status), ['blocked', 'blocked']);
    for (const row of anchors) {
        assert.strictEqual(row.event_file, 'data/scenarios/events/war_1993.json');
        assert.strictEqual(row.event_window, 'turns 74-76');
        assert.strictEqual(row.essay_file.endsWith('_1993.json'), true);
        assert.strictEqual(row.status, 'blocked');
        assert.ok(row.authored_provenance);
        assert.strictEqual(row.source, undefined);
    }
});

test('inventory covers claim prose without relying on a narrow keyword list', async () => {
    const report = await inventory.scanSensitiveClaimInventory({ rootDir: process.cwd() });
    const subjects = new Set(report.claims.map((claim: { subject_id: string }) => claim.subject_id));
    for (const id of [
        'operation_neretva_93_1993',
        'turajlic_assassination_1993',
        'essay_east_mostar_siege_1993',
        'un_hostage_crisis_1995',
    ]) {
        assert.ok(subjects.has(id), `missing claim subject ${id}`);
    }
    const neretvaNarrative = report.claims.find((claim: { subject_id: string; field_path: string }) => (
        claim.subject_id === 'operation_neretva_93_1993' && claim.field_path.endsWith('.narrative')
    ));
    assert.ok(neretvaNarrative);
    assert.deepStrictEqual(neretvaNarrative.matched_terms, []);
    const triggerEvidence = report.claims.find((claim: { field_path: string; matched_terms: string[] }) => (
        claim.field_path.includes('.trigger_evidence[') && claim.matched_terms.length === 0
    ));
    assert.ok(triggerEvidence, 'missing unmatched trigger-evidence prose');
    assert.ok(report.policy.claim_prose_keys.includes('trigger_evidence'));
});

test('documented status requires a recognized and resolved authored source tier', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));
    try {
        await mkdir(join(root, 'data', 'scenarios', 'events'), { recursive: true });
        await writeJson(join(root, 'data', 'scenarios', 'events', 'war_1993.json'), [
            {
                id: 'missing_tier_1993',
                title: 'A sourced historical record',
                narrative: 'A documented event enters the record.',
                historical_source: 'Fixture tribunal judgment.',
                source_note: 'Fixture provenance boundary.',
            },
            {
                id: 'invalid_tier_1993',
                narrative: 'A second documented event enters the record.',
                historical_source: 'Fixture citation.',
                source_note: 'Fixture provenance boundary.',
                source_tier: 'tribunal',
            },
            {
                id: 'pending_tier_1993',
                narrative: 'A third documented event enters the record.',
                historical_source: 'Fixture citation.',
                source_note: 'Fixture provenance boundary.',
                source_tier: 'pending',
            },
        ]);

        const report = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        const narrative = report.claims.find((claim: { field_path: string }) => claim.field_path.endsWith('.narrative'));
        assert.ok(narrative);
        assert.strictEqual(narrative.source_tier, null);
        assert.strictEqual(narrative.source_tier_status, 'missing');
        assert.strictEqual(narrative.status, 'needs_source_tier');
        assert.deepStrictEqual(narrative.provenance_gaps, ['source_tier']);

        const invalid = report.claims.find((claim: { subject_id: string }) => claim.subject_id === 'invalid_tier_1993');
        assert.ok(invalid);
        assert.strictEqual(invalid.source_tier, 'tribunal');
        assert.strictEqual(invalid.source_tier_status, 'invalid');
        assert.strictEqual(invalid.status, 'needs_source_tier');
        assert.deepStrictEqual(invalid.provenance_gaps, ['source_tier']);

        const pending = report.claims.find((claim: { subject_id: string }) => claim.subject_id === 'pending_tier_1993');
        assert.ok(pending);
        assert.strictEqual(pending.source_tier, 'pending');
        assert.strictEqual(pending.source_tier_status, 'pending');
        assert.strictEqual(pending.status, 'needs_source_tier');
        assert.deepStrictEqual(pending.provenance_gaps, ['source_tier']);
        assert.deepStrictEqual(report.policy.source_tiers, {
            recognized: [
                'agreement_text',
                'balkan_battlegrounds',
                'corroborated_participant',
                'design_counterfactual',
                'icty_icj_un',
                'pending',
            ],
            resolved: [
                'agreement_text',
                'balkan_battlegrounds',
                'corroborated_participant',
                'design_counterfactual',
                'icty_icj_un',
            ],
        });
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('duplicate prose receives the exact line for each JSON field', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));
    try {
        await mkdir(join(root, 'data', 'scenarios', 'events'), { recursive: true });
        await writeJson(join(root, 'data', 'scenarios', 'events', 'war_1993.json'), [{
            id: 'duplicate_lines_1993',
            narrative: 'Civilian displacement is recorded.',
            effects: [
                { kind: 'narrative', text: 'Civilian displacement is recorded.' },
                { kind: 'narrative', text: 'Civilian displacement is recorded.' },
            ],
        }]);

        const report = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        const duplicates = report.claims.filter((claim: { claim: string }) => (
            claim.claim === 'Civilian displacement is recorded.'
        ));
        assert.strictEqual(duplicates.length, 3);
        assert.deepStrictEqual(duplicates.map((claim: { line: number }) => claim.line), [
            ...new Set(duplicates.map((claim: { line: number }) => claim.line)),
        ]);
        assert.ok(duplicates[0].line < duplicates[1].line && duplicates[1].line < duplicates[2].line);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('inventory fails closed on event and essay year mismatches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-sensitive-claims-'));
    try {
        await mkdir(join(root, 'data', 'scenarios', 'events'), { recursive: true });
        await mkdir(join(root, 'data', 'scenarios', 'essays'), { recursive: true });
        await writeJson(join(root, 'data', 'scenarios', 'events', 'war_1992.json'), [{
            id: 'misfiled_claim_1993',
            title: 'Misfiled claim',
            narrative: 'Civilian displacement is recorded.',
        }]);
        await writeJson(join(root, 'data', 'scenarios', 'essays', 'misfiled_claim_1994.json'), {
            id: 'essay_misfiled_claim_1994',
            event_id: 'misfiled_claim_1993',
            year: 1994,
            title: 'Misfiled essay',
            content: 'Civilian displacement is recorded.',
            sources: ['Fixture A', 'Fixture B'],
        });

        const report = await inventory.scanSensitiveClaimInventory({ rootDir: root });
        assert.deepStrictEqual(report.date_mismatches.map((row: { code: string }) => row.code), [
            'event_essay_date_mismatch',
            'event_essay_date_mismatch',
        ]);
        assert.strictEqual(report.date_mismatches.every((row: { status: string }) => row.status === 'blocked'), true);
        assert.strictEqual(report.date_mismatches.every((row: { owner: string }) => row.owner === 'historian'), true);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
