import type { FactionId, GameState } from '../../state/game_state.js';
import { extractWarData, type WarDataSnapshot } from '../warroom/data/war_data_extractor.js';
import { formatOperationType, toTitleCase } from '../map/utils/formatters.js';
import { humanizeOsid } from '../map/utils/osidDisplayName.js';

export type OperationalSitrepSeverity = 'critical' | 'warning' | 'info';

export interface OperationalSitrepCopyToken {
    key: string;
    params?: Record<string, string | number>;
    paramKeys?: Record<string, string>;
}

export interface OperationalSitrepAlertView {
    id: string;
    severity: OperationalSitrepSeverity;
    text: string;
    textToken?: OperationalSitrepCopyToken;
}

export interface OperationalSitrepFrontEdgeView {
    id: string;
    label: string;
    tier: 'defended' | 'garrisoned' | 'exposed';
    pressure: number;
    friction: number;
}

export interface OperationalSitrepWeakestBrigadeView {
    id: string;
    label: string;
    personnel: number;
    cohesion: number;
    posture: string;
    movementStatus: string;
}

export interface OperationalSitrepCorpsOperationView {
    corpsId: string;
    corpsName: string;
    stance: string;
    operationType: string | null;
    phase: string | null;
    startedTurn: number | null;
    summary: string;
    summaryToken?: OperationalSitrepCopyToken;
}

export interface OperationalSitrepView {
    headline: string;
    headlineToken?: OperationalSitrepCopyToken;
    territory: {
        territoryPercent: number;
        settlementsControlled: number;
        settlementsTotal: number;
        areaControlledKm2?: number;
        areaTotalKm2?: number;
    };
    front: {
        engagedCount: number;
        exposedCount: number;
        edges: OperationalSitrepFrontEdgeView[];
    };
    readiness: {
        weakestBrigades: OperationalSitrepWeakestBrigadeView[];
        encircledCount: number;
    };
    sustainment: {
        adequateCount: number;
        strainedCount: number;
        criticalCount: number;
        collapsedMunicipalities: string[];
        activeHostileTakeoverTimers: number;
        activeCamps: number;
    };
    operations: {
        activeCount: number;
        corps: OperationalSitrepCorpsOperationView[];
    };
    alerts: OperationalSitrepAlertView[];
}

const TIER_ORDER: Record<OperationalSitrepFrontEdgeView['tier'], number> = {
    exposed: 0,
    garrisoned: 1,
    defended: 2,
};

const ALERT_ORDER: Record<OperationalSitrepSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
};

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return count === 1 ? singular : plural;
}

function formatLocationLabel(value: string | null | undefined): string {
    const raw = (value ?? '').trim();
    if (!raw) return 'Unknown location';
    return humanizeOsid(raw);
}

function turnToDateLabel(turn: number | null | undefined): string {
    if (typeof turn !== 'number' || !Number.isFinite(turn)) return 'an unrecorded turn';
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const daysInYear = (year: number): number => (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    const daysInMonth = (year: number, monthIndex: number): number => (
        monthIndex === 1 && daysInYear(year) === 366 ? 29 : monthLengths[monthIndex]
    );
    let year = 1992;
    let dayOfYear = 31 + 29 + 31 + 5 + Math.max(0, Math.floor(turn)) * 7;
    while (dayOfYear >= daysInYear(year)) {
        dayOfYear -= daysInYear(year);
        year += 1;
    }
    let monthIndex = 0;
    while (dayOfYear >= daysInMonth(year, monthIndex)) {
        dayOfYear -= daysInMonth(year, monthIndex);
        monthIndex += 1;
    }
    return `${dayOfYear + 1} ${monthLabels[monthIndex]} ${year}`;
}

const OPERATION_TYPE_KEYS: Record<string, string> = {
    sector_attack: 'opsPlanning.param.opType.sector_attack',
    general_offensive: 'opsPlanning.param.opType.general_offensive',
    strategic_defense: 'opsPlanning.param.opType.strategic_defense',
    reorganization: 'opsPlanning.param.opType.reorganization',
    feint: 'opsPlanning.param.opType.feint',
    probe: 'opsPlanning.param.opType.probe',
};

const OPERATION_PHASE_KEYS: Record<string, string> = {
    planning: 'operationHistory.weekly.phase.planning',
    execution: 'operationHistory.weekly.phase.execution',
};

function operationSummary(operation: WarDataSnapshot['ownCorpsOps'][number]['operation']): string {
    if (!operation) return 'No active operation';
    return `${formatOperationType(operation.type)} in ${toTitleCase(operation.phase)} since ${turnToDateLabel(operation.started_turn)}.`;
}

function operationSummaryToken(operation: WarDataSnapshot['ownCorpsOps'][number]['operation']): OperationalSitrepCopyToken {
    if (!operation) return { key: 'operationalSitrep.operation.none' };
    return {
        key: 'operationalSitrep.operation.activeSince',
        params: {
            type: formatOperationType(operation.type),
            phase: toTitleCase(operation.phase),
            date: turnToDateLabel(operation.started_turn),
        },
        paramKeys: {
            ...(OPERATION_TYPE_KEYS[operation.type] ? { type: OPERATION_TYPE_KEYS[operation.type] } : {}),
            ...(OPERATION_PHASE_KEYS[operation.phase] ? { phase: OPERATION_PHASE_KEYS[operation.phase] } : {}),
        },
    };
}

function exposedFrontSummary(count: number): string {
    if (count >= 100) return 'Widespread thinly held front sectors need staff review.';
    if (count >= 25) return 'Many thinly held front sectors need staff review.';
    if (count >= 6) return 'Several thinly held front sectors need staff review.';
    if (count > 0) return 'A thinly held front sector needs staff review.';
    return 'No thinly held front sectors are currently reported.';
}

function exposedFrontSummaryToken(count: number): OperationalSitrepCopyToken {
    if (count >= 100) return { key: 'operationalSitrep.headline.frontExposed.widespread' };
    if (count >= 25) return { key: 'operationalSitrep.headline.frontExposed.many' };
    if (count >= 6) return { key: 'operationalSitrep.headline.frontExposed.several' };
    if (count > 0) return { key: 'operationalSitrep.headline.frontExposed.one' };
    return { key: 'operationalSitrep.headline.frontExposed.none' };
}

function toHeadline(view: Omit<OperationalSitrepView, 'headline'>): string {
    if (view.front.exposedCount > 0) {
        return exposedFrontSummary(view.front.exposedCount);
    }
    if (view.readiness.encircledCount > 0) {
        return `${view.readiness.encircledCount} brigade${view.readiness.encircledCount === 1 ? '' : 's'} are encircled.`;
    }
    if (view.sustainment.collapsedMunicipalities.length > 0) {
        return 'Sustainment has collapsed in at least one controlled municipality.';
    }
    if (view.sustainment.criticalCount > 0) {
        return `${view.sustainment.criticalCount} controlled municipality${view.sustainment.criticalCount === 1 ? '' : 'ies'} are at critical sustainability.`;
    }
    if (view.operations.activeCount > 0) {
        return `${view.operations.activeCount} corps command${view.operations.activeCount === 1 ? '' : 's'} are running active operations.`;
    }
    if (view.front.engagedCount > 0) {
        return `${view.front.engagedCount} front contact${view.front.engagedCount === 1 ? '' : 's'} currently reported.`;
    }
    return 'No urgent operational developments are currently reported.';
}

function toHeadlineToken(view: Omit<OperationalSitrepView, 'headline'>): OperationalSitrepCopyToken {
    if (view.front.exposedCount > 0) {
        return exposedFrontSummaryToken(view.front.exposedCount);
    }
    if (view.readiness.encircledCount > 0) {
        return {
            key: view.readiness.encircledCount === 1
                ? 'operationalSitrep.headline.encircled.one'
                : 'operationalSitrep.headline.encircled.many',
            params: { count: view.readiness.encircledCount },
        };
    }
    if (view.sustainment.collapsedMunicipalities.length > 0) {
        return { key: 'operationalSitrep.headline.sustainmentCollapsed' };
    }
    if (view.sustainment.criticalCount > 0) {
        return {
            key: view.sustainment.criticalCount === 1
                ? 'operationalSitrep.headline.sustainmentCritical.one'
                : 'operationalSitrep.headline.sustainmentCritical.many',
            params: { count: view.sustainment.criticalCount },
        };
    }
    if (view.operations.activeCount > 0) {
        return {
            key: view.operations.activeCount === 1
                ? 'operationalSitrep.headline.activeOperations.one'
                : 'operationalSitrep.headline.activeOperations.many',
            params: { count: view.operations.activeCount },
        };
    }
    if (view.front.engagedCount > 0) {
        return {
            key: view.front.engagedCount === 1
                ? 'operationalSitrep.headline.frontContacts.one'
                : 'operationalSitrep.headline.frontContacts.many',
            params: { count: view.front.engagedCount },
        };
    }
    return { key: 'operationalSitrep.headline.noUrgent' };
}

export function toOperationalSitrepView(snapshot: WarDataSnapshot): OperationalSitrepView {
    const ownTerritory = snapshot.ownTerritory ?? {
        territoryPercent: 0,
        settlementsControlled: 0,
        settlementsTotal: 0,
        areaControlledKm2: undefined,
        areaTotalKm2: undefined,
    };
    const frontEdges = snapshot.engagedFrontEdges
        .map((edge) => ({
            id: edge.edgeId,
            label: `${formatLocationLabel(edge.settlementA)} - ${formatLocationLabel(edge.settlementB)}`,
            tier: edge.tier,
            pressure: edge.pressure,
            friction: edge.friction,
        }))
        .sort((a, b) => {
            const tierDelta = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
            if (tierDelta !== 0) return tierDelta;
            if (a.pressure !== b.pressure) return b.pressure - a.pressure;
            if (a.friction !== b.friction) return b.friction - a.friction;
            const labelDelta = compareText(a.label, b.label);
            if (labelDelta !== 0) return labelDelta;
            return compareText(a.id, b.id);
        });

    const weakestBrigades = snapshot.ownForces.formationDetails
        .filter((formation) => formation.kind === 'brigade')
        .map((formation) => ({
            id: formation.id,
            label: formation.name,
            personnel: formation.personnel,
            cohesion: formation.cohesion,
            posture: formation.posture,
            movementStatus: formation.movementStatus,
        }))
        .sort((a, b) => {
            if (a.personnel !== b.personnel) return a.personnel - b.personnel;
            if (a.cohesion !== b.cohesion) return a.cohesion - b.cohesion;
            const labelDelta = compareText(a.label, b.label);
            if (labelDelta !== 0) return labelDelta;
            return compareText(a.id, b.id);
        })
        .slice(0, 5);

    const corpsOperations = snapshot.ownCorpsOps
        .map((entry) => ({
            corpsId: entry.corpsId,
            corpsName: entry.corpsName,
            stance: entry.stance,
            operationType: entry.operation?.type ?? null,
            phase: entry.operation?.phase ?? null,
            startedTurn: entry.operation?.started_turn ?? null,
            summary: operationSummary(entry.operation),
            summaryToken: operationSummaryToken(entry.operation),
        }))
        .sort((a, b) => {
            const nameDelta = compareText(a.corpsName, b.corpsName);
            if (nameDelta !== 0) return nameDelta;
            return compareText(a.corpsId, b.corpsId);
        });

    const collapsedMunicipalities = [...snapshot.ownSupply.collapsedMunicipalities]
        .map((municipalityId) => formatLocationLabel(municipalityId))
        .sort(compareText);

    const alerts: OperationalSitrepAlertView[] = [];
    if (frontEdges.some((edge) => edge.tier === 'exposed')) {
        const exposedCount = frontEdges.filter((edge) => edge.tier === 'exposed').length;
        alerts.push({
            id: 'front-exposed',
            severity: 'critical',
            text: exposedFrontSummary(exposedCount),
            textToken: exposedFrontSummaryToken(exposedCount),
        });
    }
    if (snapshot.brigadeMovement.encircled.length > 0) {
        const encircledCount = snapshot.brigadeMovement.encircled.length;
        alerts.push({
            id: 'brigades-encircled',
            severity: 'critical',
            text: `${encircledCount} brigade${encircledCount === 1 ? '' : 's'} are encircled.`,
            textToken: {
                key: encircledCount === 1
                    ? 'operationalSitrep.alert.brigadesEncircled.one'
                    : 'operationalSitrep.alert.brigadesEncircled.many',
                params: { count: encircledCount },
            },
        });
    }
    if (snapshot.ownExhaustion.collapseEligible) {
        alerts.push({
            id: 'collapse-eligible',
            severity: 'critical',
            text: 'Faction is collapse-eligible.',
            textToken: { key: 'operationalSitrep.alert.collapseEligible' },
        });
    }
    if (collapsedMunicipalities.length > 0) {
        alerts.push({
            id: 'sustainment-collapsed',
            severity: 'warning',
            text: `Collapsed sustainment: ${collapsedMunicipalities.join(', ')}.`,
            textToken: {
                key: 'operationalSitrep.alert.sustainmentCollapsed',
                params: { locations: collapsedMunicipalities.join(', ') },
            },
        });
    } else if (snapshot.ownSupply.criticalCount > 0) {
        const criticalCount = snapshot.ownSupply.criticalCount;
        alerts.push({
            id: 'sustainment-critical',
            severity: 'warning',
            text: `${criticalCount} controlled municipality${criticalCount === 1 ? '' : 'ies'} are at critical sustainability.`,
            textToken: {
                key: criticalCount === 1
                    ? 'operationalSitrep.alert.sustainmentCritical.one'
                    : 'operationalSitrep.alert.sustainmentCritical.many',
                params: { count: criticalCount },
            },
        });
    }
    if (snapshot.ownAuthority.authority < 0.3) {
        alerts.push({
            id: 'authority-critical',
            severity: 'warning',
            text: 'Central authority is critically low.',
            textToken: { key: 'operationalSitrep.alert.authorityCritical' },
        });
    }
    if (snapshot.ownExhaustion.increasing) {
        alerts.push({
            id: 'exhaustion-worsening',
            severity: 'warning',
            text: 'Exhaustion trend worsening.',
            textToken: { key: 'operationalSitrep.alert.exhaustionWorsening' },
        });
    }
    if (
        (snapshot.playerFaction === 'RBiH' || snapshot.playerFaction === 'HRHB')
        && snapshot.ownDiplomacy.rbihHrhbState
        && snapshot.ownDiplomacy.rbihHrhbState.allianceValue < 0.2
    ) {
        alerts.push({
            id: 'alliance-strained',
            severity: 'warning',
            text: 'Alliance with partner faction is severely strained.',
            textToken: { key: 'operationalSitrep.alert.allianceStrained' },
        });
    }
    if (snapshot.ownDisplacement.activeHostileTakeoverTimers > 0) {
        const timerCount = snapshot.ownDisplacement.activeHostileTakeoverTimers;
        alerts.push({
            id: 'hostile-takeovers',
            severity: 'warning',
            text: `${timerCount} hostile takeover timer${timerCount === 1 ? '' : 's'} remain active.`,
            textToken: {
                key: timerCount === 1
                    ? 'operationalSitrep.alert.hostileTakeovers.one'
                    : 'operationalSitrep.alert.hostileTakeovers.many',
                params: { count: timerCount },
            },
        });
    }
    if (snapshot.brigadeMovement.packing.length > 0) {
        const packingCount = snapshot.brigadeMovement.packing.length;
        alerts.push({
            id: 'brigades-packing',
            severity: 'warning',
            text: `${packingCount} brigade${packingCount === 1 ? '' : 's'} are packing; front gaps may open.`,
            textToken: {
                key: packingCount === 1
                    ? 'operationalSitrep.alert.brigadesPacking.one'
                    : 'operationalSitrep.alert.brigadesPacking.many',
                params: { count: packingCount },
            },
        });
    }
    const activeOperationCount = corpsOperations.filter((entry) => entry.operationType !== null).length;
    if (activeOperationCount > 0) {
        alerts.push({
            id: 'active-operations',
            severity: 'info',
            text: `${activeOperationCount} corps command${activeOperationCount === 1 ? '' : 's'} are running active operations.`,
            textToken: {
                key: activeOperationCount === 1
                    ? 'operationalSitrep.alert.activeOperations.one'
                    : 'operationalSitrep.alert.activeOperations.many',
                params: { count: activeOperationCount },
            },
        });
    }

    alerts.sort((a, b) => {
        const severityDelta = ALERT_ORDER[a.severity] - ALERT_ORDER[b.severity];
        if (severityDelta !== 0) return severityDelta;
        const textDelta = compareText(a.text, b.text);
        if (textDelta !== 0) return textDelta;
        return compareText(a.id, b.id);
    });

    const viewWithoutHeadline = {
        territory: {
            territoryPercent: ownTerritory.territoryPercent,
            settlementsControlled: ownTerritory.settlementsControlled,
            settlementsTotal: ownTerritory.settlementsTotal,
            areaControlledKm2: ownTerritory.areaControlledKm2,
            areaTotalKm2: ownTerritory.areaTotalKm2,
        },
        front: {
            engagedCount: frontEdges.length,
            exposedCount: frontEdges.filter((edge) => edge.tier === 'exposed').length,
            edges: frontEdges,
        },
        readiness: {
            weakestBrigades,
            encircledCount: snapshot.brigadeMovement.encircled.length,
        },
        sustainment: {
            adequateCount: snapshot.ownSupply.adequateCount,
            strainedCount: snapshot.ownSupply.strainedCount,
            criticalCount: snapshot.ownSupply.criticalCount,
            collapsedMunicipalities,
            activeHostileTakeoverTimers: snapshot.ownDisplacement.activeHostileTakeoverTimers,
            activeCamps: snapshot.ownDisplacement.activeCamps,
        },
        operations: {
            activeCount: activeOperationCount,
            corps: corpsOperations,
        },
        alerts,
    };

    return {
        headline: toHeadline(viewWithoutHeadline),
        headlineToken: toHeadlineToken(viewWithoutHeadline),
        ...viewWithoutHeadline,
    };
}

export function getOperationalSitrepView(
    gameState: GameState,
    playerFaction: FactionId,
): OperationalSitrepView {
    return toOperationalSitrepView(extractWarData(gameState, playerFaction));
}
