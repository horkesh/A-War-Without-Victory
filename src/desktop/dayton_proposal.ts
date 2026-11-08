import { CANONICAL_FACTIONS, type GameState } from '../state/game_state.js';
import { createEmptyCapital, type DaytonProposal, type EntityAutonomySetting } from '../state/negotiation_types.js';
import { asArray, asRecord } from '../state/schema_validators.js';
import { strictCompare } from '../state/validateGameState.js';
import { computePlayerProposalSpend, getCompositeCapital } from '../sim/negotiation/bot_negotiation.js';
import { getAllCompetencyPackages } from '../sim/negotiation/competency_packages.js';
import { getAllConstitutionalChoices, getAllReturnJusticeChoices } from '../sim/negotiation/constitutional_packages.js';
import { frontPackagesForPlayer, isFrontPackageId } from '../sim/negotiation/front_packages.js';
import { getAllInstitutionalPackages } from '../sim/negotiation/institutional_packages.js';
import { reconcileProposalPowers } from '../sim/negotiation/power_overlap.js';
import { getAllTerritorialPackages, getTerritorialPackageById } from '../sim/negotiation/territorial_packages.js';
import { isOnTheTable, playerMayConcede } from '../sim/negotiation/patron_leverage.js';

const PROPOSAL_FIELDS = new Set<keyof DaytonProposal>([
    'territorial_demands', 'territorial_concessions', 'institutional_choices',
    'entity_autonomy', 'competency_allocation', 'constitutional_choices', 'return_justice',
]);
const TERRITORY_IDS = new Set(getAllTerritorialPackages().map(pkg => pkg.id));
const TERRITORY_HOLDER = new Map(getAllTerritorialPackages().map(pkg => [pkg.id, pkg.default_holder]));
const FEDERATION = new Set(['RBiH', 'HRHB']);
const INSTITUTIONS = new Map(getAllInstitutionalPackages().map(pkg => [pkg.id, ['centralized', 'decentralized'] as const]));
const COMPETENCIES = new Map(getAllCompetencyPackages().map(pkg => [pkg.id, ['state', 'entity', 'shared'] as const]));
const CONSTITUTION = new Map(getAllConstitutionalChoices().map(choice => [choice.id, choice.options.map(option => option.id)]));
const RETURN_JUSTICE = new Map(getAllReturnJusticeChoices().map(choice => [choice.id, choice.options.map(option => option.id)]));
const AUTONOMY_SETTINGS: readonly EntityAutonomySetting[] = ['confederation', 'dayton-historical', 'federalized', 'unitary'];

function invalid(field: string): never {
    throw new Error(`Invalid Dayton proposal: ${field}`);
}

function readRecord(value: unknown, field: string): Record<string, unknown> {
    const record = asRecord(value);
    if (!record || (Object.getPrototypeOf(record) !== Object.prototype && Object.getPrototypeOf(record) !== null)) {
        invalid(field);
    }
    return record;
}

function readChoices<T extends string>(
    value: unknown,
    field: keyof DaytonProposal,
    catalog: ReadonlyMap<string, readonly T[]>,
): Record<string, T> {
    if (value === undefined) return {};
    const record = readRecord(value, field);
    const keys = Object.keys(record);
    if (keys.length > catalog.size) invalid(field);
    const choices: Record<string, T> = {};
    for (const id of keys.sort(strictCompare)) {
        const choice = catalog.get(id)?.find(option => option === record[id]);
        if (choice === undefined) invalid(field);
        choices[id] = choice;
    }
    return choices;
}

/** Validate the desktop request against the same catalog and capital rules as signing. */
export function parseDaytonProposal(payload: unknown, state: GameState): DaytonProposal {
    const input = payload === undefined ? {} : readRecord(payload, 'expected an object');
    if (Object.keys(input).some(key => !PROPOSAL_FIELDS.has(key as keyof DaytonProposal))) {
        invalid('unknown field');
    }

    const playerFaction = state.meta.player_faction ?? 'RBiH';
    // Each captured-ground package needs at least one wartime controller cell.
    const seenTerritory = new Set<string>();
    let frontPackages: ReturnType<typeof frontPackagesForPlayer> | undefined;
    let frontIds: Set<string> | undefined;
    function readTerritory(field: 'territorial_demands' | 'territorial_concessions'): string[] {
        if (input[field] === undefined) return [];
        const entries = asArray(input[field]);
        if (!entries || (entries.length > TERRITORY_IDS.size
            && entries.length > TERRITORY_IDS.size + Object.keys(state.political.political_controllers ?? {}).length)) {
            invalid(field);
        }
        const ids: string[] = [];
        for (const id of entries) {
            if (typeof id !== 'string' || seenTerritory.has(id)) invalid(field);
            let holder: string | undefined;
            if (!TERRITORY_IDS.has(id)) {
                if (!isFrontPackageId(id)) invalid(field);
                if (!frontIds) {
                    frontPackages = frontPackagesForPlayer(state, playerFaction);
                    frontIds = new Set(frontPackages.map(pkg => pkg.id));
                }
                if (!frontIds.has(id)) invalid(field);
                holder = frontPackages?.find(pkg => pkg.id === id)?.default_holder;
            } else {
                holder = TERRITORY_HOLDER.get(id);
                // Dayton drew the inter-entity line only: a Federation party cannot raise
                // its partner's ground (the room hides these; the bridge refuses them too).
                if (field === 'territorial_demands' && holder !== playerFaction
                    && FEDERATION.has(holder ?? '') && FEDERATION.has(playerFaction)) invalid(field);
            }
            // The room offers Demand only on ground the map gives someone else, and
            // Concede only on ground it gives the player.
            if (field === 'territorial_demands' && holder === playerFaction) invalid(field);
            if (field === 'territorial_concessions' && holder !== playerFaction) invalid(field);
            // Ground never on the table (Mostar and western Herzegovina, DC A6 panel).
            if (field === 'territorial_demands') {
                const pkg = TERRITORY_IDS.has(id) ? getTerritorialPackageById(id) : frontPackages?.find(p => p.id === id);
                if (pkg && !isOnTheTable(pkg)) invalid(field);
            }
            // A player never gives up its own protected ground (Brčko excepted, D1).
            if (field === 'territorial_concessions' && TERRITORY_IDS.has(id)) {
                const pkg = getTerritorialPackageById(id);
                if (pkg && !playerMayConcede(pkg, playerFaction)) invalid(field);
            }
            seenTerritory.add(id);
            ids.push(id);
        }
        return ids.sort(strictCompare);
    }

    const proposal: DaytonProposal = {
        territorial_demands: readTerritory('territorial_demands'),
        territorial_concessions: readTerritory('territorial_concessions'),
        institutional_choices: readChoices(input.institutional_choices, 'institutional_choices', INSTITUTIONS),
    };
    if (input.entity_autonomy !== undefined) {
        const autonomy = AUTONOMY_SETTINGS.find(setting => setting === input.entity_autonomy);
        if (!autonomy) invalid('entity_autonomy');
        proposal.entity_autonomy = autonomy;
    }
    if (input.competency_allocation !== undefined) {
        proposal.competency_allocation = readChoices(input.competency_allocation, 'competency_allocation', COMPETENCIES);
    }
    if (input.constitutional_choices !== undefined) {
        proposal.constitutional_choices = readChoices(input.constitutional_choices, 'constitutional_choices', CONSTITUTION);
    }
    if (input.return_justice !== undefined) {
        proposal.return_justice = readChoices(input.return_justice, 'return_justice', RETURN_JUSTICE);
    }

    const negotiation = state.military.negotiation;
    // The resolver initializes capital for the canonical factions when negotiation is absent.
    const capital = negotiation
        ? negotiation.capital[playerFaction]
        : CANONICAL_FACTIONS.includes(playerFaction) ? createEmptyCapital() : undefined;
    const available = capital ? getCompositeCapital(capital, playerFaction, negotiation?.strategic_dimensions) : 0;
    // One operative assignment per power: an explicit competency or constitutional slot
    // wins over a contradicting legacy toggle (power_overlap.ts) before the budget check.
    const reconciled = reconcileProposalPowers(proposal);
    if (computePlayerProposalSpend(reconciled, playerFaction, frontPackages) > available) {
        throw new Error('Dayton proposal exceeds the available negotiation budget');
    }
    return reconciled;
}
