#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const actual203 = require(path.join(__dirname, 'commander_creation_reader_203.cjs'));

const STATUSES = new Set([
    'not_reached',
    'no_brigade',
    'no_sector',
    'missing_adjacency_or_friendly_set_or_location',
    'local_occupation_bypass',
    'empty_enemy_set',
    'empty_direct_set',
    'all_filtered',
    'generic_search',
]);
const STAGES = ['disrupted_and_effective', 'elite_available', 'historical_queue_free', 'combat_ready'];
const NONFINITE_TAGS = new Set(['NaN', 'Infinity', '-Infinity']);
const EMPTY_DETAIL_ARRAYS = [
    'enemy_candidate_ids',
    'direct_candidate_ids',
    'survivor_ids',
    'ranked_objective_ids',
    'targets',
    'brigade_candidates',
];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isString = (value) => typeof value === 'string' && value.length > 0;
const strictCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const decodeFitness = (value) => typeof value === 'number'
    ? value
    : value === 'NaN'
        ? Number.NaN
        : value === 'Infinity'
            ? Number.POSITIVE_INFINITY
            : value === '-Infinity'
                ? Number.NEGATIVE_INFINITY
                : null;

function arrayOfUniqueSortedStrings(value, label, errors) {
    if (!Array.isArray(value) || value.some((entry) => !isString(entry))) {
        errors.push(`${label} must be an array of nonempty strings`);
        return [];
    }
    for (let index = 1; index < value.length; index += 1) {
        if (strictCompare(value[index - 1], value[index]) >= 0) {
            errors.push(`${label} must be strict ascending unique`);
            break;
        }
    }
    return value;
}

function arrayOfUniqueStrings(value, label, errors) {
    if (!Array.isArray(value) || value.some((entry) => !isString(entry))) {
        errors.push(`${label} must be an array of nonempty strings`);
        return [];
    }
    if (new Set(value).size !== value.length) errors.push(`${label} must not contain duplicates`);
    return value;
}

function requireEmpty(value, label, errors) {
    if (!Array.isArray(value) || value.length !== 0) errors.push(`${label} must be empty`);
}

function validateCandidates(detail, label, errors) {
    if (!Array.isArray(detail.brigade_candidates)) {
        errors.push(`${label}.brigade_candidates must be an array`);
        return { eligible: [], selected: [] };
    }
    const eligible = [];
    const selected = [];
    for (let index = 0; index < detail.brigade_candidates.length; index += 1) {
        const candidate = detail.brigade_candidates[index];
        const candidateLabel = `${label}.brigade_candidates[${index}]`;
        if (!isObject(candidate)) {
            errors.push(`${candidateLabel} must be an object`);
            continue;
        }
        if (candidate.original_ordinal !== index) errors.push(`${candidateLabel}.original_ordinal must equal ${index}`);
        if (!isString(candidate.brigade_id)) errors.push(`${candidateLabel}.brigade_id must be a nonempty string`);
        if (!(Number.isFinite(candidate.actual_fitness) || NONFINITE_TAGS.has(candidate.actual_fitness))) {
            errors.push(`${candidateLabel}.actual_fitness must be finite or an exact nonfinite tag`);
        }
        if (!(candidate.sorted_rank === null || Number.isSafeInteger(candidate.sorted_rank) && candidate.sorted_rank >= 0)) {
            errors.push(`${candidateLabel}.sorted_rank must be null or a nonnegative integer`);
        }
        if (typeof candidate.selected !== 'boolean') errors.push(`${candidateLabel}.selected must be boolean`);
        if (candidate.selected === true) selected.push(candidate);

        if (detail.status === 'local_occupation_bypass') {
            for (const stage of STAGES) {
                if (candidate[stage] !== 'NOT_REACHED') errors.push(`${candidateLabel}.${stage} must be NOT_REACHED for bypass`);
            }
            if (candidate.sorted_rank !== null) errors.push(`${candidateLabel}.sorted_rank must be null for bypass`);
            continue;
        }

        let stopped = false;
        let passedAll = true;
        for (const stage of STAGES) {
            const value = candidate[stage];
            if (!(typeof value === 'boolean' || value === 'NOT_REACHED')) {
                errors.push(`${candidateLabel}.${stage} has invalid reach value`);
                passedAll = false;
                stopped = true;
                continue;
            }
            if (stopped && value !== 'NOT_REACHED') errors.push(`${candidateLabel}.${stage} reached after rejection`);
            if (value === false || value === 'NOT_REACHED') {
                passedAll = false;
                stopped = true;
            }
        }
        if (passedAll) eligible.push(candidate);
        else if (candidate.sorted_rank !== null || candidate.selected === true) {
            errors.push(`${candidateLabel} is ranked or selected without passing every stage`);
        }
    }

    if (detail.status !== 'local_occupation_bypass') {
        const ranked = [...eligible].sort((left, right) => {
            const fitnessDifference = decodeFitness(right.actual_fitness) - decodeFitness(left.actual_fitness);
            if (fitnessDifference !== 0) return fitnessDifference;
            return strictCompare(left.brigade_id, right.brigade_id);
        });
        ranked.forEach((candidate, index) => {
            if (candidate.sorted_rank !== index) errors.push(`${label}: candidate rank/comparator mismatch`);
        });
        if (ranked.length === 0) {
            if (selected.length !== 0 || detail.selected_brigade_id !== null) errors.push(`${label}: selected brigade without eligible survivor`);
        } else if (selected.length !== 1 || selected[0] !== ranked[0] || detail.selected_brigade_id !== ranked[0].brigade_id) {
            errors.push(`${label}: selected brigade must be the rank-zero survivor`);
        }
    }
    return { eligible, selected };
}

function validateTargets(detail, turn, label, errors) {
    const enemyIds = arrayOfUniqueSortedStrings(detail.enemy_candidate_ids, `${label}.enemy_candidate_ids`, errors);
    const directIds = arrayOfUniqueSortedStrings(detail.direct_candidate_ids, `${label}.direct_candidate_ids`, errors);
    const survivorIds = arrayOfUniqueStrings(detail.survivor_ids, `${label}.survivor_ids`, errors);
    const rankedIds = arrayOfUniqueStrings(detail.ranked_objective_ids, `${label}.ranked_objective_ids`, errors);
    if (!Array.isArray(detail.targets)) {
        errors.push(`${label}.targets must be an array`);
        return { enemyIds, directIds, survivorIds, rankedIds };
    }
    const targetsById = new Map();
    for (let index = 0; index < detail.targets.length; index += 1) {
        const target = detail.targets[index];
        const targetLabel = `${label}.targets[${index}]`;
        if (!isObject(target) || !isString(target.target_id)) {
            errors.push(`${targetLabel} must have a nonempty target_id`);
            continue;
        }
        if (targetsById.has(target.target_id)) errors.push(`${targetLabel}.target_id is duplicated`);
        targetsById.set(target.target_id, target);
        if (target.prediction_threshold !== 'stalemate') errors.push(`${targetLabel}.prediction_threshold must be stalemate`);
        if (target.direct_filter_reached !== true || typeof target.direct_filter_passed !== 'boolean' || target.direct_filter_passed !== target.direct) {
            errors.push(`${targetLabel}: direct filter binding mismatch`);
        }
        if (target.direct === false) {
            for (const key of ['cooldown_raw_present', 'cooldown_raw_value', 'cooldown_effective_value', 'controller', 'politically_blocked', 'prediction_present', 'prediction_outcome', 'predicted_viable', 'reachable', 'approach_distance']) {
                if (target[key] !== null) errors.push(`${targetLabel}.${key} must be null before direct admission`);
            }
            for (const key of ['cooldown_filter_reached', 'politics_filter_reached', 'reachable_filter_reached', 'prediction_filter_reached']) {
                if (target[key] !== false) errors.push(`${targetLabel}.${key} must be false after direct rejection`);
            }
            for (const key of ['cooldown_filter_passed', 'politics_filter_passed', 'reachable_filter_passed', 'prediction_filter_passed']) {
                if (target[key] !== null) errors.push(`${targetLabel}.${key} must be null when unreached`);
            }
            if (target.passed !== false || target.first_rejecting_filter !== 'direct') errors.push(`${targetLabel}: direct rejection terminal mismatch`);
            continue;
        }
        if (target.direct !== true) errors.push(`${targetLabel}.direct must be boolean`);
        if (typeof target.cooldown_raw_present !== 'boolean'
            || !(target.cooldown_raw_value === null || Number.isFinite(target.cooldown_raw_value))
            || !Number.isFinite(target.cooldown_effective_value)
            || !(target.controller === null || isString(target.controller))
            || typeof target.politically_blocked !== 'boolean'
            || typeof target.prediction_present !== 'boolean'
            || !(target.prediction_outcome === null || isString(target.prediction_outcome))
            || typeof target.predicted_viable !== 'boolean'
            || typeof target.reachable !== 'boolean'
            || !(Number.isFinite(target.approach_distance) || target.approach_distance === null)) {
            errors.push(`${targetLabel}: computed direct-target fields malformed`);
        }
        if (target.reachable === true && !Number.isFinite(target.approach_distance)) errors.push(`${targetLabel}: reachable target needs finite approach distance`);
        if (target.reachable === false && target.approach_distance !== null) errors.push(`${targetLabel}: unreachable JSON target needs null approach distance`);
        if (target.cooldown_raw_present === false && target.cooldown_raw_value !== null) errors.push(`${targetLabel}: absent cooldown has a raw value`);
        if (target.cooldown_raw_present === false && target.cooldown_effective_value !== 0) errors.push(`${targetLabel}: absent cooldown must have effective value zero`);
        if (target.cooldown_raw_present === true && (!Number.isFinite(target.cooldown_raw_value) || target.cooldown_effective_value !== target.cooldown_raw_value)) {
            errors.push(`${targetLabel}: present raw cooldown must equal effective cooldown`);
        }
        if (target.prediction_present === false && (target.prediction_outcome !== null || target.predicted_viable !== true)) {
            errors.push(`${targetLabel}: absent prediction requires null outcome and viable fallback`);
        }
        if (target.prediction_present === true && !isString(target.prediction_outcome)) {
            errors.push(`${targetLabel}: present prediction requires an outcome`);
        }
        if (target.controller === null && target.politically_blocked !== false) {
            errors.push(`${targetLabel}: unknown controller cannot be politically blocked`);
        }
        const filters = [
            ['cooldown', 'cooldown_filter_reached', 'cooldown_filter_passed'],
            ['politics', 'politics_filter_reached', 'politics_filter_passed'],
            ['reachable', 'reachable_filter_reached', 'reachable_filter_passed'],
            ['predicted_viable', 'prediction_filter_reached', 'prediction_filter_passed'],
        ];
        let rejected = null;
        for (const [name, reachedKey, passedKey] of filters) {
            if (rejected === null) {
                if (target[reachedKey] !== true || typeof target[passedKey] !== 'boolean') errors.push(`${targetLabel}: ${name} filter must be reached with boolean result`);
                if (target[passedKey] === false) rejected = name;
            } else if (target[reachedKey] !== false || target[passedKey] !== null) {
                errors.push(`${targetLabel}: ${name} filter must remain unreached after ${rejected}`);
            }
        }
        if (rejected === null) {
            if (target.passed !== true || target.first_rejecting_filter !== null) errors.push(`${targetLabel}: admitted target terminal mismatch`);
        } else if (target.passed !== false || target.first_rejecting_filter !== rejected) {
            errors.push(`${targetLabel}: first rejecting filter mismatch`);
        }
        if (target.cooldown_filter_reached === true && target.cooldown_filter_passed !== (target.cooldown_effective_value <= turn)) {
            errors.push(`${targetLabel}: cooldown filter result does not match cooldown value and turn`);
        }
        if (target.politics_filter_reached === true && target.politics_filter_passed !== !target.politically_blocked) {
            errors.push(`${targetLabel}: politics filter result does not match politically_blocked`);
        }
        if (target.reachable_filter_reached === true && target.reachable_filter_passed !== target.reachable) {
            errors.push(`${targetLabel}: reachable filter result does not match reachable`);
        }
        if (target.prediction_filter_reached === true && target.prediction_filter_passed !== target.predicted_viable) {
            errors.push(`${targetLabel}: prediction filter result does not match predicted_viable`);
        }
    }
    const targetIds = [...targetsById.keys()];
    if (JSON.stringify(targetIds) !== JSON.stringify(enemyIds)) errors.push(`${label}: targets must cover enemy_candidate_ids exactly`);
    const actualDirect = [...targetsById.values()].filter((target) => target.direct === true).map((target) => target.target_id).sort(strictCompare);
    if (JSON.stringify(actualDirect) !== JSON.stringify(directIds)) errors.push(`${label}: direct_candidate_ids do not match target detail`);
    const actualSurvivors = [...targetsById.values()]
        .filter((target) => target.passed === true)
        .sort((left, right) => left.approach_distance - right.approach_distance || strictCompare(left.target_id, right.target_id))
        .map((target) => target.target_id);
    if (JSON.stringify(actualSurvivors) !== JSON.stringify(survivorIds)) errors.push(`${label}: survivor_ids do not match admitted target rank order`);
    if (JSON.stringify(actualSurvivors.slice(0, 1)) !== JSON.stringify(rankedIds)) errors.push(`${label}: ranked_objective_ids mismatch`);
    return { enemyIds, directIds, survivorIds, rankedIds };
}

function detailErrors(row, label = 'row') {
    const errors = [];
    const receipt = row?.probe_gate_receipt;
    const detail = receipt?.target_selection_detail;
    if (!isObject(receipt)
        || receipt.selector?.turn !== row?.turn
        || receipt.selector?.faction !== row?.faction
        || receipt.selector?.corps_id !== row?.corps_id) {
        errors.push(`${label}: selector binding mismatch`);
    }
    if (!isObject(detail) || !STATUSES.has(detail.status)) return [...errors, `${label}: missing or unknown target-selection detail`];

    if (detail.status === 'not_reached') {
        for (const key of ['selected_brigade_id', 'selected_brigade_location', 'derived_sector_id']) {
            if (detail[key] !== null) errors.push(`${label}.${key} must be null for not_reached`);
        }
        for (const key of EMPTY_DETAIL_ARRAYS) requireEmpty(detail[key], `${label}.${key}`, errors);
        return errors;
    }

    const { eligible, selected } = validateCandidates(detail, label, errors);
    if (detail.status === 'no_brigade') {
        if (detail.brigade_candidates.length === 0 || eligible.length !== 0) errors.push(`${label}: no_brigade requires evaluated candidates and no survivor`);
        for (const key of ['selected_brigade_id', 'selected_brigade_location', 'derived_sector_id']) if (detail[key] !== null) errors.push(`${label}.${key} must be null for no_brigade`);
        for (const key of EMPTY_DETAIL_ARRAYS.slice(0, -1)) requireEmpty(detail[key], `${label}.${key}`, errors);
        return errors;
    }

    if (!isString(detail.selected_brigade_id) || selected.length !== 1) errors.push(`${label}: status requires exactly one selected brigade`);
    if (!(detail.selected_brigade_location === null || isString(detail.selected_brigade_location))) errors.push(`${label}.selected_brigade_location must be null or nonempty string`);
    if (detail.status === 'no_sector') {
        if (detail.derived_sector_id !== null) errors.push(`${label}.derived_sector_id must be null for no_sector`);
        for (const key of EMPTY_DETAIL_ARRAYS.slice(0, -1)) requireEmpty(detail[key], `${label}.${key}`, errors);
        return errors;
    }
    if (!isString(detail.derived_sector_id)) errors.push(`${label}: status requires a derived sector`);

    if (detail.status === 'local_occupation_bypass') {
        requireEmpty(detail.enemy_candidate_ids, `${label}.enemy_candidate_ids`, errors);
        requireEmpty(detail.direct_candidate_ids, `${label}.direct_candidate_ids`, errors);
        requireEmpty(detail.targets, `${label}.targets`, errors);
        if (selected.length !== 1 || selected[0].brigade_id !== detail.selected_brigade_id) errors.push(`${label}: bypass selected identity mismatch`);
        if (!Array.isArray(detail.survivor_ids) || detail.survivor_ids.length !== 1
            || !Array.isArray(detail.ranked_objective_ids) || detail.ranked_objective_ids.length !== 1
            || detail.survivor_ids[0] !== detail.ranked_objective_ids[0]
            || !isString(detail.survivor_ids[0])) {
            errors.push(`${label}: bypass must carry one identical survivor and ranked objective`);
        }
        return errors;
    }

    const targetSets = validateTargets(detail, row.turn, label, errors);
    if (detail.status === 'missing_adjacency_or_friendly_set_or_location') {
        for (const key of EMPTY_DETAIL_ARRAYS.slice(0, -1)) requireEmpty(detail[key], `${label}.${key}`, errors);
    } else if (detail.status === 'empty_enemy_set') {
        if (targetSets.enemyIds.length !== 0) errors.push(`${label}: empty_enemy_set has enemy candidates`);
    } else if (detail.status === 'empty_direct_set') {
        if (targetSets.enemyIds.length === 0 || targetSets.directIds.length !== 0) errors.push(`${label}: empty_direct_set requires enemies and no direct candidates`);
    } else if (detail.status === 'all_filtered') {
        if (targetSets.directIds.length === 0 || targetSets.survivorIds.length !== 0 || targetSets.rankedIds.length !== 0) errors.push(`${label}: all_filtered stage cardinality mismatch`);
    } else if (detail.status === 'generic_search') {
        if (targetSets.directIds.length === 0 || targetSets.survivorIds.length === 0 || targetSets.rankedIds.length !== 1) errors.push(`${label}: generic_search requires a ranked survivor`);
    }
    return errors;
}

function checkRow(row, label = 'row') {
    return [...actual203.checkRow(row, label), ...detailErrors(row, label)];
}

function validateFile(file) {
    const parsed = actual203.parseLines(fs.readFileSync(file, 'utf8').split(/\r?\n/));
    const violations = [...parsed.errs];
    let completionRows = 0;
    for (const entry of parsed.records) {
        if (entry.r.phase !== 'build_operations_complete') continue;
        completionRows += 1;
        violations.push(...checkRow(entry.r, `line${entry.line}`));
    }
    if (completionRows === 0) violations.push('coverage: no build_operations_complete rows');
    return { records: parsed.records.length, completion_rows: completionRows, violations };
}

function main() {
    const [input, output] = process.argv.slice(2);
    if (!input || !output) {
        process.stderr.write('usage: commander_target_selection_reader.cjs INPUT OUTPUT\n');
        process.exit(3);
    }
    const result = validateFile(input);
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ pass: result.violations.length === 0, ...result, violations: result.violations.length })}\n`);
    process.exit(result.violations.length === 0 ? 0 : 2);
}

if (require.main === module) main();
module.exports = { checkRow, detailErrors, validateFile };
