import { GameState } from '../state/game_state.js';
import { ValidationIssue } from './validate.js';

function asRecord(value: unknown): Record<string, unknown> | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function validateFrontPressure(state: GameState): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const stateRecord = state as GameState & { front_pressure?: unknown };
    const rec = asRecord(stateRecord.front_pressure);
    if (!rec) return issues;

    const currentTurn = typeof state?.meta?.turn === 'number' && Number.isInteger(state.meta.turn) ? state.meta.turn : null;
    const segmentKeys = new Set(Object.keys(state.military?.front_segments ?? {}));

    const keys = Object.keys(rec).sort();
    for (const key of keys) {
        const p = rec[key];
        const basePath = `front_pressure.${key}`;
        const pressureRecord = asRecord(p);
        if (!pressureRecord) continue;

        // edge_id canonical a__b with a<b
        if (typeof key !== 'string' || !key.includes('__')) {
            issues.push({
                severity: 'error',
                code: 'front_pressure.edge_id.format',
                path: basePath,
                message: 'edge_id key must contain "__" delimiter'
            });
            continue;
        }
        const parts = key.split('__');
        if (parts.length !== 2) {
            issues.push({
                severity: 'error',
                code: 'front_pressure.edge_id.format',
                path: basePath,
                message: 'edge_id must split into exactly two settlement ids'
            });
            continue;
        }
        const [a, b] = parts;
        if (!(a < b)) {
            issues.push({
                severity: 'error',
                code: 'front_pressure.edge_id.non_canonical',
                path: basePath,
                message: 'edge_id must be canonical with a < b'
            });
        }

        // value integer
        const value = pressureRecord.value;
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            issues.push({
                severity: 'error',
                code: 'front_pressure.value.invalid',
                path: `${basePath}.value`,
                message: 'value must be an integer'
            });
        }

        // max_abs integer >= abs(value)
        const maxAbs = pressureRecord.max_abs;
        if (typeof maxAbs !== 'number' || !Number.isInteger(maxAbs) || maxAbs < 0) {
            issues.push({
                severity: 'error',
                code: 'front_pressure.max_abs.invalid',
                path: `${basePath}.max_abs`,
                message: 'max_abs must be an integer >= 0'
            });
        } else if (typeof value === 'number' && Number.isInteger(value)) {
            const absValue = Math.abs(value);
            if (maxAbs < absValue) {
                issues.push({
                    severity: 'error',
                    code: 'front_pressure.max_abs.lt_value',
                    path: `${basePath}.max_abs`,
                    message: `max_abs (${maxAbs}) must be >= abs(value) (${absValue})`
                });
            }
        }

        // last_updated_turn <= state.meta.turn
        const lastUpdatedTurn = pressureRecord.last_updated_turn;
        if (typeof lastUpdatedTurn === 'number' && Number.isInteger(lastUpdatedTurn) && currentTurn !== null) {
            if (lastUpdatedTurn > currentTurn) {
                issues.push({
                    severity: 'error',
                    code: 'front_pressure.last_updated_turn.invalid',
                    path: `${basePath}.last_updated_turn`,
                    message: `last_updated_turn (${lastUpdatedTurn}) must be <= current turn (${currentTurn})`
                });
            }
        } else {
            issues.push({
                severity: 'error',
                code: 'front_pressure.last_updated_turn.invalid',
                path: `${basePath}.last_updated_turn`,
                message: 'last_updated_turn must be an integer'
            });
        }

        // unknown edge_id not in front_segments (warning)
        if (!segmentKeys.has(key)) {
            issues.push({
                severity: 'warn',
                code: 'front_pressure.edge_id.unknown',
                path: basePath,
                message: 'pressure record references edge_id not present in front_segments (historical record)'
            });
        }
    }

    return issues;
}

