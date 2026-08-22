/** Audit weekly operation diagnostics for simultaneous brigade commitments. */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonRecord = Record<string, unknown>;

export interface OperationCommitmentCollision {
    week: number;
    brigade_id: string;
    first_operation: string;
    second_operation: string;
}

function records(value: unknown): JsonRecord[] {
    return Array.isArray(value)
        ? value.filter((row): row is JsonRecord => row !== null && typeof row === 'object' && !Array.isArray(row))
        : [];
}

function strings(value: unknown): string[] {
    return Array.isArray(value)
        ? [...new Set(value.filter((item): item is string => typeof item === 'string'))].sort()
        : [];
}

function operationLabel(operation: JsonRecord): string {
    return `${String(operation.corps_id ?? '')}|${String(operation.operation_name ?? '')}|${String(operation.operation_phase ?? '')}`;
}

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

export function auditOperationCommitments(weeklyRows: JsonRecord[]) {
    const collisions: OperationCommitmentCollision[] = [];
    let membership_count = 0;

    for (const weekly of weeklyRows) {
        const week = typeof weekly.week_index === 'number' ? weekly.week_index : 0;
        const seen = new Map<string, string>();
        for (const operation of records(weekly.operation_diagnostics)) {
            if (operation.operation_phase !== 'planning' && operation.operation_phase !== 'execution') continue;
            const label = operationLabel(operation);
            for (const brigadeId of strings(operation.participating_brigades)) {
                membership_count += 1;
                const prior = seen.get(brigadeId);
                if (prior && prior !== label) {
                    collisions.push({
                        week,
                        brigade_id: brigadeId,
                        first_operation: prior,
                        second_operation: label,
                    });
                } else {
                    seen.set(brigadeId, label);
                }
            }
        }
    }

    collisions.sort((a, b) => a.week - b.week
        || compareText(a.brigade_id, b.brigade_id)
        || compareText(a.first_operation, b.first_operation)
        || compareText(a.second_operation, b.second_operation));
    return { membership_count, collisions };
}

export function runOperationCommitmentPositiveControl(weeklyRows: JsonRecord[]) {
    const controlled = structuredClone(weeklyRows);
    for (const weekly of controlled) {
        const operations = records(weekly.operation_diagnostics).filter((operation) =>
            (operation.operation_phase === 'planning' || operation.operation_phase === 'execution')
            && strings(operation.participating_brigades).length > 0);
        for (const sourceOperation of operations) {
            const brigadeId = strings(sourceOperation.participating_brigades)[0];
            if (!brigadeId) continue;
            const targetOperation = operations.find((operation) =>
                operation !== sourceOperation && !strings(operation.participating_brigades).includes(brigadeId));
            if (!targetOperation) continue;
            targetOperation.participating_brigades = [...strings(targetOperation.participating_brigades), brigadeId];
            const baseline = auditOperationCommitments(weeklyRows);
            const result = auditOperationCommitments(controlled);
            return {
                injected: true,
                brigade_id: brigadeId,
                week: typeof weekly.week_index === 'number' ? weekly.week_index : 0,
                collision_delta: result.collisions.length - baseline.collisions.length,
            };
        }
    }
    return { injected: false, brigade_id: null, week: null, collision_delta: 0 };
}

export function parseWeeklyJsonLines(payload: string): JsonRecord[] {
    return payload.split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as JsonRecord);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
    const input = process.argv[2];
    if (!input) throw new Error('Usage: npm run diagnose:operation-commitments -- <run-dir|weekly_report.jsonl>');
    const resolved = resolve(input);
    const weeklyPath = existsSync(resolved) && statSync(resolved).isDirectory()
        ? join(resolved, 'weekly_report.jsonl')
        : resolved;
    const weeklyRows = parseWeeklyJsonLines(readFileSync(weeklyPath, 'utf8'));
    const audit = auditOperationCommitments(weeklyRows);
    const positive_control = runOperationCommitmentPositiveControl(weeklyRows);
    process.stdout.write(`${JSON.stringify({ weekly_report: weeklyPath, ...audit, positive_control }, null, 2)}\n`);
    if (!positive_control.injected || positive_control.collision_delta !== 1 || audit.collisions.length > 0) {
        process.exitCode = 1;
    }
}
