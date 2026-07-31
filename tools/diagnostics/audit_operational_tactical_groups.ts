/**
 * Read-only Operational/Tactical Group lifecycle audit.
 *
 * Determinism contract:
 * - every record traversal and emitted id list is sorted with `strictCompare`;
 * - output contains no timestamp or wall-clock-derived value;
 * - the CLI reads one save and writes JSON only to stdout.
 *
 * CLI:
 *   npm exec -- tsx tools/diagnostics/audit_operational_tactical_groups.ts <save-path>
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { deserializeState } from '../../src/state/serialize.js';
import { strictCompare } from '../../src/state/validateGameState.js';

type LooseRecord = Record<string, unknown>;

export interface StatusCount {
    status: string;
    count: number;
}

export interface OperationalTacticalGroupAudit {
    turn: number | null;
    tactical_groups: {
        count: number;
        formation_count_total: number;
        formation_counts_by_corps: Array<{
            corps_id: string;
            count: number;
        }>;
        status_counts: StatusCount[];
        groups: Array<{
            id: string;
            status: string;
            age_turns: number | null;
            cohesion: number | null;
        }>;
    };
    army_hq_operations: {
        count: number;
        status_counts: StatusCount[];
        operations: Array<{
            id: string;
            status: string;
            tg_id: string | null;
        }>;
        stale_tg_links: Array<{
            army_hq_operation_id: string;
            tg_id: string;
        }>;
        active_without_corps_operation_ids: string[];
    };
    participations: {
        live_count: number;
        archived_count: number;
    };
    legacy_operational_groups: {
        active_formation_ids: string[];
        queued_orders: Array<{
            corps_id: string;
            donor_brigade_ids: string[];
            focus_settlement_ids: string[];
        }>;
    };
    duplicate_promotion_display_names: Array<{
        display_name: string;
        corps_ids: string[];
    }>;
}

function isRecord(value: unknown): value is LooseRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): LooseRecord {
    return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sortedRecordEntries(value: unknown): Array<[string, unknown]> {
    return Object.entries(asRecord(value)).sort(([a], [b]) => strictCompare(a, b));
}

function sortedStrings(values: Iterable<string>): string[] {
    return [...values].sort(strictCompare);
}

function buildStatusCounts(statuses: readonly string[]): StatusCount[] {
    const counts = new Map<string, number>();
    for (const status of statuses) counts.set(status, (counts.get(status) ?? 0) + 1);
    return sortedStrings(counts.keys()).map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

function auditTacticalGroups(military: LooseRecord, turn: number | null): OperationalTacticalGroupAudit['tactical_groups'] {
    const formationCountsByCorps = sortedRecordEntries(military.tg_formations_by_corps).map(([corpsId, rawCount]) => ({
        corps_id: corpsId,
        count: asFiniteNumber(rawCount) ?? 0,
    }));
    const groups = sortedRecordEntries(military.tactical_groups).map(([key, raw]) => {
        const group = asRecord(raw);
        const formedTurn = asFiniteNumber(group.formed_on_turn);
        return {
            id: asString(group.id, key),
            status: asString(group.status, 'unknown'),
            age_turns: turn === null || formedTurn === null ? null : Math.max(0, turn - formedTurn),
            cohesion: asFiniteNumber(group.cohesion),
        };
    }).sort((a, b) => strictCompare(a.id, b.id));

    return {
        count: groups.length,
        formation_count_total: formationCountsByCorps.reduce((total, entry) => total + entry.count, 0),
        formation_counts_by_corps: formationCountsByCorps,
        status_counts: buildStatusCounts(groups.map((group) => group.status)),
        groups,
    };
}

function hasMatchingLiveCorpsOperation(
    military: LooseRecord,
    armyHqOperationId: string,
    armyHqOperation: LooseRecord,
): boolean {
    const anchorCorpsId = asString(armyHqOperation.anchor_corps_id);
    const operationName = asString(armyHqOperation.name);
    if (anchorCorpsId.length === 0 || operationName.length === 0) return false;

    const corpsCommand = asRecord(military.corps_command);
    const activeOperations = asRecord(corpsCommand[anchorCorpsId]).active_operations;
    if (!Array.isArray(activeOperations)) return false;

    return activeOperations.some((rawOperation) => {
        const operation = asRecord(rawOperation);
        if (asString(operation.name) !== operationName) return false;
        const linkedArmyHqOperationId = asString(operation.army_hq_op_id);
        return linkedArmyHqOperationId.length === 0 || linkedArmyHqOperationId === armyHqOperationId;
    });
}

function auditArmyHqOperations(
    military: LooseRecord,
    liveTacticalGroupIds: ReadonlySet<string>,
): OperationalTacticalGroupAudit['army_hq_operations'] {
    const auditedOperations = sortedRecordEntries(military.army_hq_operations).map(([key, raw]) => {
        const operation = asRecord(raw);
        const tgId = asString(operation.tg_id);
        const id = asString(operation.id, key);
        return {
            id,
            status: asString(operation.status, 'unknown'),
            tg_id: tgId.length > 0 ? tgId : null,
            has_matching_corps_operation: hasMatchingLiveCorpsOperation(military, id, operation),
        };
    }).sort((a, b) => strictCompare(a.id, b.id));
    const operations = auditedOperations.map(({ id, status, tg_id }) => ({ id, status, tg_id }));

    const staleTgLinks = operations
        .filter((operation) => operation.tg_id !== null && !liveTacticalGroupIds.has(operation.tg_id))
        .map((operation) => ({
            army_hq_operation_id: operation.id,
            tg_id: operation.tg_id as string,
        }));

    const activeWithoutCorpsOperationIds = auditedOperations
        .filter((operation) => (
            operation.status === 'planning' || operation.status === 'executing'
        ) && !operation.has_matching_corps_operation)
        .map((operation) => operation.id)
        .sort(strictCompare);

    return {
        count: operations.length,
        status_counts: buildStatusCounts(operations.map((operation) => operation.status)),
        operations,
        stale_tg_links: staleTgLinks,
        active_without_corps_operation_ids: activeWithoutCorpsOperationIds,
    };
}

function auditParticipations(military: LooseRecord): OperationalTacticalGroupAudit['participations'] {
    let liveCount = 0;
    let archivedCount = 0;
    for (const [, rawFormation] of sortedRecordEntries(military.formations)) {
        const history = asRecord(asRecord(rawFormation).brigade_history);
        if (Array.isArray(history.tg_participations)) liveCount += history.tg_participations.length;
        if (Array.isArray(history.archived_tg_participations)) archivedCount += history.archived_tg_participations.length;
    }
    return { live_count: liveCount, archived_count: archivedCount };
}

function auditLegacyOperationalGroups(military: LooseRecord): OperationalTacticalGroupAudit['legacy_operational_groups'] {
    const activeFormationIds: string[] = [];
    for (const [key, rawFormation] of sortedRecordEntries(military.formations)) {
        const formation = asRecord(rawFormation);
        if (formation.kind === 'og' && formation.status === 'active') {
            activeFormationIds.push(asString(formation.id, key));
        }
    }
    activeFormationIds.sort(strictCompare);

    const rawOrders = Array.isArray(military.og_orders) ? military.og_orders : [];
    const queuedOrders = rawOrders.map((rawOrder) => {
        const order = asRecord(rawOrder);
        const donors = Array.isArray(order.donors) ? order.donors : [];
        const focusSettlements = Array.isArray(order.focus_settlements) ? order.focus_settlements : [];
        return {
            corps_id: asString(order.corps_id),
            donor_brigade_ids: donors
                .map((donor) => asString(asRecord(donor).brigade_id))
                .filter((id) => id.length > 0)
                .sort(strictCompare),
            focus_settlement_ids: focusSettlements
                .map((settlementId) => asString(settlementId))
                .filter((id) => id.length > 0)
                .sort(strictCompare),
        };
    }).sort((a, b) => (
        strictCompare(a.corps_id, b.corps_id)
        || strictCompare(a.donor_brigade_ids.join('\u0000'), b.donor_brigade_ids.join('\u0000'))
        || strictCompare(a.focus_settlement_ids.join('\u0000'), b.focus_settlement_ids.join('\u0000'))
    ));

    return {
        active_formation_ids: activeFormationIds,
        queued_orders: queuedOrders,
    };
}

function auditDuplicatePromotionDisplayNames(
    military: LooseRecord,
): OperationalTacticalGroupAudit['duplicate_promotion_display_names'] {
    const corpsIdsByDisplayName = new Map<string, Set<string>>();
    for (const [, rawPromotion] of sortedRecordEntries(military.og_promotions)) {
        const promotion = asRecord(rawPromotion);
        const displayName = asString(promotion.division_display_name);
        const corpsId = asString(promotion.corps_id);
        if (displayName.length === 0 || corpsId.length === 0) continue;
        const corpsIds = corpsIdsByDisplayName.get(displayName) ?? new Set<string>();
        corpsIds.add(corpsId);
        corpsIdsByDisplayName.set(displayName, corpsIds);
    }

    return sortedStrings(corpsIdsByDisplayName.keys())
        .map((displayName) => ({
            display_name: displayName,
            corps_ids: sortedStrings(corpsIdsByDisplayName.get(displayName) ?? []),
        }))
        .filter((duplicate) => duplicate.corps_ids.length > 1);
}

/** Build a deterministic, read-only lifecycle report from a deserialized save. */
export function auditOperationalTacticalGroups(rawState: unknown): OperationalTacticalGroupAudit {
    const state = asRecord(rawState);
    const military = asRecord(state.military);
    const turn = asFiniteNumber(asRecord(state.meta).turn);
    const tacticalGroups = auditTacticalGroups(military, turn);
    const liveTacticalGroupIds = new Set(tacticalGroups.groups.map((group) => group.id));

    return {
        turn,
        tactical_groups: tacticalGroups,
        army_hq_operations: auditArmyHqOperations(military, liveTacticalGroupIds),
        participations: auditParticipations(military),
        legacy_operational_groups: auditLegacyOperationalGroups(military),
        duplicate_promotion_display_names: auditDuplicatePromotionDisplayNames(military),
    };
}

/** Canonical pretty JSON for CLI output and byte-stability tests. */
export function serializeOperationalTacticalGroupAudit(report: OperationalTacticalGroupAudit): string {
    return `${JSON.stringify(report, null, 2)}\n`;
}

/** Read, migrate, and validate a canonical in-memory state before auditing it. */
export function auditOperationalTacticalGroupSave(savePath: string): OperationalTacticalGroupAudit {
    const state = deserializeState(readFileSync(path.resolve(savePath), 'utf8'));
    return auditOperationalTacticalGroups(state);
}

function main(): void {
    const savePath = process.argv[2];
    if (!savePath) {
        process.stderr.write('Usage: audit_operational_tactical_groups.ts <save-path>\n');
        process.exitCode = 1;
        return;
    }

    try {
        process.stdout.write(serializeOperationalTacticalGroupAudit(auditOperationalTacticalGroupSave(savePath)));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`audit_operational_tactical_groups: ${message}\n`);
        process.exitCode = 1;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
