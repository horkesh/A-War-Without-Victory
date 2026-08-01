#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, type Dirent } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { stableStringify as stableJsonStringify } from '../../src/utils/stable_json.js';

export const FIELD_CLASSIFICATIONS = [
    'compatibility-only',
    'dead',
    'derived/transient',
    'optional-persisted',
    'required-persisted',
] as const;

export type FieldClassification = typeof FIELD_CLASSIFICATIONS[number] | 'unclassified';

type Evidence = {
    file: string;
    line: number;
};

export type GameStateFieldInventoryRow = {
    interface: 'GameState' | 'MilitaryState';
    field: string;
    declared_type: string;
    optional: boolean;
    classification: FieldClassification;
    declaration: Evidence;
    initializer: Evidence[];
    validator: Evidence[];
    migration: Evidence[];
    serializer: {
        expected: 'included' | 'excluded';
        observed: 'included-when-present';
        contract_match: boolean;
        evidence: Evidence[];
    };
    known_readers: Evidence[];
};

export type GameStateFieldInventory = {
    generated_by: 'tools/diagnostics/game_state_field_classification.ts';
    fields: GameStateFieldInventoryRow[];
    summary: {
        field_count: number;
        unclassified_count: number;
        by_classification: Record<typeof FIELD_CLASSIFICATIONS[number], number>;
    };
};

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

export function stableStringify(value: unknown): string {
    return `${stableJsonStringify(value, 2)}\n`;
}

function toRepoRelative(rootDir: string, filePath: string): string {
    return relative(rootDir, filePath).replace(/\\/g, '/');
}

function listSourceFiles(rootDir: string): string[] {
    const files: string[] = [];
    for (const topLevel of ['src', 'tools']) {
        const start = resolve(rootDir, topLevel);
        const stack = [start];
        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) continue;
            let entries: Dirent<string>[];
            try {
                entries = readdirSync(current, { withFileTypes: true, encoding: 'utf8' });
            } catch {
                continue;
            }
            for (const entry of entries.slice().sort((a, b) => strictCompare(a.name, b.name)).reverse()) {
                const absolutePath = resolve(current, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name !== 'node_modules' && entry.name !== '_archived' && entry.name !== 'output') {
                        stack.push(absolutePath);
                    }
                } else if (entry.isFile() && /\.(?:cjs|js|mjs|ts|tsx)$/.test(entry.name)) {
                    files.push(absolutePath);
                }
            }
        }
    }
    return files.sort(strictCompare);
}

function scriptKind(filePath: string): ts.ScriptKind {
    if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (filePath.endsWith('.js') || filePath.endsWith('.cjs') || filePath.endsWith('.mjs')) {
        return ts.ScriptKind.JS;
    }
    return ts.ScriptKind.TS;
}

function sourceFile(filePath: string): ts.SourceFile {
    return ts.createSourceFile(
        filePath,
        readFileSync(filePath, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        scriptKind(filePath),
    );
}

function propertyName(node: ts.PropertyName): string | null {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        return node.text;
    }
    return null;
}

function declarationComment(source: ts.SourceFile, node: ts.Node): string {
    return source.text.slice(node.getFullStart(), node.getStart(source));
}

const LIVE_FIELD_CLASSIFICATION_GROUPS = {
    'required-persisted': [
        'GameState.displacement',
        'GameState.factions',
        'GameState.meta',
        'GameState.military',
        'GameState.political',
        'GameState.schema_version',
        'MilitaryState.army_co_decision_traces',
        'MilitaryState.army_corps_directives_by_faction',
        'MilitaryState.enabled_event_ids',
        'MilitaryState.event_decision_log',
        'MilitaryState.event_fire_counts',
        'MilitaryState.event_flags',
        'MilitaryState.event_last_fired_turn',
        'MilitaryState.event_readiness',
        'MilitaryState.fired_event_ids',
        'MilitaryState.formations',
        'MilitaryState.front_posture',
        'MilitaryState.front_posture_regions',
        'MilitaryState.front_pressure',
        'MilitaryState.front_segments',
        'MilitaryState.militia_pools',
        'MilitaryState.phantoms_spawned',
    ],
    'optional-persisted': [
        'GameState.operation_history',
        'GameState.paramilitary_decision_history',
        'GameState.paramilitary_deployment_count',
        'GameState.paramilitary_policy',
        'GameState.pending_paramilitary_requests',
        'GameState.turn_summaries',
        'MilitaryState.ai_army_decisions',
        'MilitaryState.ai_decision_log',
        'MilitaryState.airdrop_allocation',
        'MilitaryState.alliance_locks',
        'MilitaryState.army_hq_last_op_turn',
        'MilitaryState.army_hq_op_count_by_year',
        'MilitaryState.army_hq_operations',
        'MilitaryState.army_hq_overrides',
        'MilitaryState.army_stance',
        'MilitaryState.battle_damage',
        'MilitaryState.battle_narratives',
        'MilitaryState.bot_priority_shifts',
        'MilitaryState.brigade_attack_orders',
        'MilitaryState.brigade_deploy_orders',
        'MilitaryState.brigade_encircled',
        'MilitaryState.brigade_movement_orders',
        'MilitaryState.brigade_movement_state',
        'MilitaryState.brigade_posture_orders',
        'MilitaryState.brigade_sector_override',
        'MilitaryState.campaign_plans',
        'MilitaryState.cascade_penalties',
        'MilitaryState.casualty_ledger',
        'MilitaryState.closed_event_ids',
        'MilitaryState.command_authority',
        'MilitaryState.comms_override_by_corps',
        'MilitaryState.convoy_decision_history',
        'MilitaryState.corps_command',
        'MilitaryState.corps_dialogues',
        'MilitaryState.corps_equipment_reserve',
        'MilitaryState.cost_ledger_annotations',
        'MilitaryState.declined_operations',
        'MilitaryState.elite_brigade_tracker',
        'MilitaryState.enclave_state',
        'MilitaryState.equipment_quality_modifiers',
        'MilitaryState.event_aggression_modifiers',
        'MilitaryState.event_causality_log',
        'MilitaryState.event_constraints',
        'MilitaryState.event_effect_anomalies',
        'MilitaryState.event_overflow_queue',
        'MilitaryState.faction_officer_maturity',
        'MilitaryState.formation_spawn_directive',
        'MilitaryState.friction_events',
        'MilitaryState.front_edges',
        'MilitaryState.general_supply_reserve',
        'MilitaryState.guerrilla_threats',
        'MilitaryState.heavy_munitions_reserve',
        'MilitaryState.last_briefing',
        'MilitaryState.last_gathering_turn',
        'MilitaryState.logistics_priority',
        'MilitaryState.municipality_support_orders',
        'MilitaryState.must_hold_osids_by_corps',
        'MilitaryState.named_officer_data',
        'MilitaryState.named_officers',
        'MilitaryState.narrative_queue',
        'MilitaryState.negotiation',
        'MilitaryState.offensive_ops_suppressions',
        'MilitaryState.officer_decision_history',
        'MilitaryState.og_orders',
        'MilitaryState.og_promotions',
        'MilitaryState.op_injection_warnings',
        'MilitaryState.operation_opportunities',
        'MilitaryState.operation_opportunity_diagnostics',
        'MilitaryState.operation_opportunity_resolutions',
        'MilitaryState.operation_opportunity_traces',
        'MilitaryState.opsec_sectors',
        'MilitaryState.patron_defiance_supply_cuts',
        'MilitaryState.pending_convoy_decisions',
        'MilitaryState.pending_event_decisions',
        'MilitaryState.pending_event_notifications',
        'MilitaryState.pending_officer_events',
        'MilitaryState.pending_reserve_requests',
        'MilitaryState.preplanned_operations_satisfied_by_start',
        'MilitaryState.production_facilities',
        'MilitaryState.recruitment_modifiers',
        'MilitaryState.recruitment_state',
        'MilitaryState.reserve_request_history',
        'MilitaryState.sarajevo_tunnel_operational',
        'MilitaryState.sector_stance_orders',
        'MilitaryState.settlement_holdouts',
        'MilitaryState.siege_turn_counters',
        'MilitaryState.smuggling_allocation',
        'MilitaryState.smuggling_routes',
        'MilitaryState.strategic_reserves',
        'MilitaryState.tactical_groups',
        'MilitaryState.tg_formations_by_corps',
        'MilitaryState.tg_recent_compositions',
        'MilitaryState.triggered_operations_accepted',
        'MilitaryState.used_operation_names',
        'MilitaryState.war_dispatches',
        'MilitaryState.war_front_edges_osid',
        'MilitaryState.war_jna',
        'MilitaryState.war_militia_strength',
        'MilitaryState.war_timeline',
        'MilitaryState.watched_operations',
    ],
    'derived/transient': [
        'MilitaryState.active_offensives_against_corps',
        'MilitaryState.home_distance_cache',
        'MilitaryState.militia_garrison',
        'MilitaryState.sector_combat_ratings',
        'MilitaryState.sector_intel',
        'MilitaryState.unresolved_sector_brigades',
    ],
    'compatibility-only': [
        'MilitaryState.army_theatre_assignment',
        'MilitaryState.assignable_front_segments',
        'MilitaryState.brigade_desired_aor_cap',
        'MilitaryState.brigade_front_assignment',
        'MilitaryState.brigade_reposition_orders',
        'MilitaryState.corps_front_sectors',
        'MilitaryState.theatres',
    ],
    dead: [],
} as const satisfies Record<typeof FIELD_CLASSIFICATIONS[number], readonly string[]>;

function buildLiveClassificationRegistry(): ReadonlyMap<string, typeof FIELD_CLASSIFICATIONS[number]> {
    const registry = new Map<string, typeof FIELD_CLASSIFICATIONS[number]>();
    for (const classification of FIELD_CLASSIFICATIONS) {
        for (const key of LIVE_FIELD_CLASSIFICATION_GROUPS[classification]) {
            if (registry.has(key)) throw new Error(`Duplicate GameState field classification: ${key}`);
            registry.set(key, classification);
        }
    }
    return registry;
}

const LIVE_FIELD_CLASSIFICATION_REGISTRY = buildLiveClassificationRegistry();

function classifyField(key: string, comment: string): FieldClassification {
    const marker = comment.match(/@persistence\s+(compatibility-only|dead|derived\/transient|optional-persisted|required-persisted)\b/i);
    if (marker) return marker[1].toLowerCase() as typeof FIELD_CLASSIFICATIONS[number];
    return LIVE_FIELD_CLASSIFICATION_REGISTRY.get(key) ?? 'unclassified';
}

function normalizeType(node: ts.TypeNode, source: ts.SourceFile): string {
    return node.getText(source).replace(/\s+/g, ' ').trim();
}

function collectDeclarations(rootDir: string): GameStateFieldInventoryRow[] {
    const filePath = resolve(rootDir, 'src', 'state', 'game_state.ts');
    const source = sourceFile(filePath);
    const rows: GameStateFieldInventoryRow[] = [];

    for (const statement of source.statements) {
        if (!ts.isInterfaceDeclaration(statement)) continue;
        if (statement.name.text !== 'GameState' && statement.name.text !== 'MilitaryState') continue;
        const interfaceName = statement.name.text;
        for (const member of statement.members) {
            if (!ts.isPropertySignature(member) || !member.type) continue;
            const field = propertyName(member.name);
            if (!field) continue;
            const { line } = source.getLineAndCharacterOfPosition(member.name.getStart(source));
            const optional = member.questionToken !== undefined;
            const key = `${interfaceName}.${field}`;
            const classification = classifyField(key, declarationComment(source, member));
            const expectedSerializerPolicy = classification === 'derived/transient' ? 'excluded' : 'included';
            rows.push({
                interface: interfaceName,
                field,
                declared_type: normalizeType(member.type, source),
                optional,
                classification,
                declaration: { file: toRepoRelative(rootDir, filePath), line: line + 1 },
                initializer: [],
                validator: [],
                migration: [],
                serializer: {
                    expected: expectedSerializerPolicy,
                    observed: 'included-when-present',
                    contract_match: expectedSerializerPolicy === 'included',
                    evidence: [],
                },
                known_readers: [],
            });
        }
    }

    return rows.sort((a, b) => strictCompare(a.interface, b.interface) || strictCompare(a.field, b.field));
}

function isAssignment(node: ts.Node): boolean {
    const parent = node.parent;
    if (ts.isBinaryExpression(parent) && parent.left === node) {
        return parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
            && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
    }
    return (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))
        && (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken);
}

function accessedField(node: ts.Node): { field: string; write: boolean } | null {
    if (ts.isPropertyAccessExpression(node)) {
        return { field: node.name.text, write: isAssignment(node) };
    }
    if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
        return { field: node.argumentExpression.text, write: isAssignment(node) };
    }
    return null;
}

function addEvidence(target: Evidence[], evidence: Evidence): void {
    if (!target.some((row) => row.file === evidence.file && row.line === evidence.line)) {
        target.push(evidence);
    }
}

function createAnalysisProgram(rootDir: string, filePaths: string[]): ts.Program {
    const configPath = ts.findConfigFile(rootDir, existsSync, 'tsconfig.json');
    let options: ts.CompilerOptions = {
        allowJs: true,
        checkJs: false,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        skipLibCheck: true,
        target: ts.ScriptTarget.ESNext,
    };
    if (configPath) {
        const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
        if (!loaded.error) {
            options = ts.parseJsonConfigFileContent(loaded.config, ts.sys, rootDir).options;
        }
    }
    return ts.createProgram({ rootNames: filePaths, options });
}

function stateFieldKeyFromSymbol(symbol: ts.Symbol | undefined, rootDir: string): string | null {
    for (const declaration of symbol?.declarations ?? []) {
        if (!ts.isPropertySignature(declaration) || !ts.isInterfaceDeclaration(declaration.parent)) continue;
        const interfaceName = declaration.parent.name.text;
        if (interfaceName !== 'GameState' && interfaceName !== 'MilitaryState') continue;
        if (toRepoRelative(rootDir, declaration.getSourceFile().fileName) !== 'src/state/game_state.ts') continue;
        const field = propertyName(declaration.name);
        if (field) return `${interfaceName}.${field}`;
    }
    return null;
}

function typedStateFieldAccess(
    node: ts.Node,
    checker: ts.TypeChecker,
    rootDir: string,
): { key: string; write: boolean } | null {
    if (ts.isPropertyAccessExpression(node)) {
        const key = stateFieldKeyFromSymbol(checker.getSymbolAtLocation(node.name), rootDir);
        return key ? { key, write: isAssignment(node) } : null;
    }
    if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
        const key = stateFieldKeyFromSymbol(
            checker.getTypeAtLocation(node.expression).getProperty(node.argumentExpression.text),
            rootDir,
        );
        return key ? { key, write: isAssignment(node) } : null;
    }
    if (ts.isPropertyAssignment(node)) {
        const field = propertyName(node.name);
        if (!field) return null;
        let ownerType = checker.getContextualType(node.parent);
        const container = node.parent.parent;
        if (!ownerType && (ts.isAsExpression(container) || ts.isTypeAssertionExpression(container))) {
            ownerType = checker.getTypeAtLocation(container.type);
        }
        if (!ownerType) return null;
        const key = stateFieldKeyFromSymbol(ownerType.getProperty(field), rootDir);
        return key ? { key, write: true } : null;
    }
    return null;
}

const MIGRATION_FIELD_HELPERS = new Set(['ensureArray', 'ensureRecord']);

function migrationHelperField(node: ts.Node, isMigration: boolean): string | null {
    if (!isMigration || !ts.isCallExpression(node)) return null;
    const helperName = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
            ? node.expression.name.text
            : null;
    if (!helperName || !MIGRATION_FIELD_HELPERS.has(helperName)) return null;
    const fieldArgument = node.arguments[1];
    return fieldArgument && ts.isStringLiteral(fieldArgument) ? fieldArgument.text : null;
}

function collectLifecycleEvidence(rootDir: string, rows: GameStateFieldInventoryRow[]): void {
    const filePaths = listSourceFiles(rootDir);
    const program = createAnalysisProgram(rootDir, filePaths.filter((path) => /\.tsx?$/.test(path)));
    const checker = program.getTypeChecker();
    const rowsByKey = new Map(rows.map((row) => [`${row.interface}.${row.field}`, row]));
    const rowsByField = new Map<string, GameStateFieldInventoryRow[]>();
    for (const row of rows) {
        const existing = rowsByField.get(row.field) ?? [];
        existing.push(row);
        rowsByField.set(row.field, existing);
    }

    const initializerOwners = new Set([
        'src/scenario/scenario_runner.ts',
        'src/state/initialize_new_game_state.ts',
        'src/state/serialize.ts',
    ]);

    for (const filePath of filePaths) {
        const relativePath = toRepoRelative(rootDir, filePath);
        if (relativePath === 'src/state/game_state.ts') continue;
        const programSource = program.getSourceFile(filePath);
        const source = programSource ?? sourceFile(filePath);
        const isValidator = relativePath === 'src/state/validateGameState.ts'
            || relativePath.startsWith('src/validate/');
        const isMigration = relativePath === 'src/state/save_migration.ts';
        const isInitializer = initializerOwners.has(relativePath);

        const visit = (node: ts.Node): void => {
            const typedAccess = programSource ? typedStateFieldAccess(node, checker, rootDir) : null;
            const fallbackAccess = accessedField(node);
            const helperField = migrationHelperField(node, isMigration);
            const matchingRows = typedAccess
                ? [rowsByKey.get(typedAccess.key)].filter((row): row is GameStateFieldInventoryRow => row !== undefined)
                : (isValidator || isMigration) && (helperField || fallbackAccess)
                    ? rowsByField.get(helperField ?? fallbackAccess!.field) ?? []
                    : [];
            if (matchingRows.length > 0) {
                const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
                const evidence = { file: relativePath, line: line + 1 };
                for (const row of matchingRows) {
                    if (isValidator) addEvidence(row.validator, evidence);
                    if (isMigration) addEvidence(row.migration, evidence);
                    if (isInitializer && typedAccess?.write) addEvidence(row.initializer, evidence);
                    if (typedAccess && !typedAccess.write && !isMigration) addEvidence(row.known_readers, evidence);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);

        if (relativePath === 'src/state/serializeGameState.ts') {
            let serializerLine = 1;
            for (const statement of source.statements) {
                if (ts.isFunctionDeclaration(statement) && statement.name?.text === 'serializeGameState') {
                    serializerLine = source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1;
                    break;
                }
            }
            for (const row of rows) {
                row.serializer.evidence.push({ file: relativePath, line: serializerLine });
            }
        }
    }

    for (const row of rows) {
        for (const evidence of [row.initializer, row.validator, row.migration, row.serializer.evidence, row.known_readers]) {
            evidence.sort((a, b) => strictCompare(a.file, b.file) || a.line - b.line);
        }
    }
}

export function assertCompleteFieldClassification(rows: GameStateFieldInventoryRow[]): void {
    const unclassified = rows
        .filter((row) => row.classification === 'unclassified' || !FIELD_CLASSIFICATIONS.includes(row.classification as never))
        .map((row) => `${row.interface}.${row.field}`)
        .sort(strictCompare);
    if (unclassified.length > 0) {
        throw new Error(`Unclassified GameState fields: ${unclassified.join(', ')}`);
    }
}

export function buildGameStateFieldClassification(rootDir = process.cwd()): GameStateFieldInventory {
    const resolvedRoot = resolve(rootDir);
    const fields = collectDeclarations(resolvedRoot);
    collectLifecycleEvidence(resolvedRoot, fields);
    assertCompleteFieldClassification(fields);

    const byClassification = Object.fromEntries(
        FIELD_CLASSIFICATIONS.map((classification) => [classification, 0]),
    ) as Record<typeof FIELD_CLASSIFICATIONS[number], number>;
    for (const row of fields) {
        if (row.classification !== 'unclassified') byClassification[row.classification] += 1;
    }

    return {
        generated_by: 'tools/diagnostics/game_state_field_classification.ts',
        fields,
        summary: {
            field_count: fields.length,
            unclassified_count: 0,
            by_classification: byClassification,
        },
    };
}

function main(): void {
    const rootDir = process.argv[2] ?? process.cwd();
    process.stdout.write(stableStringify(buildGameStateFieldClassification(rootDir)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
