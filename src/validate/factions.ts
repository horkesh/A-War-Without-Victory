import type { GameState } from '../state/game_state.js';
import { POLITICAL_SIDES, type PoliticalSideId } from '../state/identity.js';
import type { ValidationIssue } from './validate.js';

function isPoliticalSideId(value: string): value is PoliticalSideId {
    return (POLITICAL_SIDES as readonly string[]).includes(value);
}

export function validateFactions(state: GameState): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const factions = state.factions;
    if (!Array.isArray(factions)) {
        issues.push({ severity: 'error', code: 'factions.invalid', path: 'factions', message: 'factions must be an array' });
        return issues;
    }

    factions.forEach((faction, index) => {
        const basePath = `factions[${index}]`;
        if (!faction || typeof faction !== 'object') {
            issues.push({ severity: 'error', code: 'faction.invalid', path: basePath, message: 'faction must be an object' });
            return;
        }

        if (!faction.id || typeof faction.id !== 'string') {
            issues.push({ severity: 'error', code: 'faction.id.invalid', path: `${basePath}.id`, message: 'id must be a non-empty string' });
        } else if (!isPoliticalSideId(faction.id)) {
            issues.push({
                severity: 'error',
                code: 'faction.id.not_political_side',
                path: `${basePath}.id`,
                message: `faction id must be one of: ${POLITICAL_SIDES.join(', ')}`
            });
        }

        // command_capacity validation (Phase 9)
        const commandCapacity = faction.command_capacity;
        if (commandCapacity !== undefined) {
            if (!Number.isInteger(commandCapacity) || commandCapacity < 0) {
                issues.push({
                    severity: 'error',
                    code: 'faction.command_capacity.invalid',
                    path: `${basePath}.command_capacity`,
                    message: 'command_capacity must be an integer >= 0'
                });
            }
        }
    });

    return issues;
}
