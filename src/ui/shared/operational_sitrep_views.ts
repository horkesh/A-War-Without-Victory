import type { FactionId, GameState } from '../../state/game_state.js';
import { extractWarData, type WarDataSnapshot } from '../warroom/data/war_data_extractor.js';
import { formatOperationType, toTitleCase } from '../map/utils/formatters.js';
import { humanizeOsid } from '../map/utils/osidDisplayName.js';

export type OperationalSitrepSeverity = 'critical' | 'warning' | 'info';

export interface OperationalSitrepAlertView {
    id: string;
    severity: OperationalSitrepSeverity;
    text: string;
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
}

export interface OperationalSitrepView {
    headline: string;
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
    const startDate = new Date('1992-04-06T00:00:00Z');
    startDate.setUTCDate(startDate.getUTCDate() + turn * 7);
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][startDate.getUTCMonth()];
    return `${startDate.getUTCDate()} ${month} ${startDate.getUTCFullYear()}`;
}

function operationSummary(operation: WarDataSnapshot['ownCorpsOps'][number]['operation']): string {
    if (!operation) return 'No active operation';
    return `${formatOperationType(operation.type)} in ${toTitleCase(operation.phase)} since ${turnToDateLabel(operation.started_turn)}.`;
}

function toHeadline(view: Omit<OperationalSitrepView, 'headline'>): string {
    if (view.front.exposedCount > 0) {
        return `${view.front.exposedCount} exposed front ${pluralize(view.front.exposedCount, 'sector')} require immediate attention.`;
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
            text: `${exposedCount} exposed front ${pluralize(exposedCount, 'sector')} require attention.`,
        });
    }
    if (snapshot.brigadeMovement.encircled.length > 0) {
        const encircledCount = snapshot.brigadeMovement.encircled.length;
        alerts.push({
            id: 'brigades-encircled',
            severity: 'critical',
            text: `${encircledCount} brigade${encircledCount === 1 ? '' : 's'} are encircled.`,
        });
    }
    if (snapshot.ownExhaustion.collapseEligible) {
        alerts.push({
            id: 'collapse-eligible',
            severity: 'critical',
            text: 'Faction is collapse-eligible.',
        });
    }
    if (collapsedMunicipalities.length > 0) {
        alerts.push({
            id: 'sustainment-collapsed',
            severity: 'warning',
            text: `Collapsed sustainment: ${collapsedMunicipalities.join(', ')}.`,
        });
    } else if (snapshot.ownSupply.criticalCount > 0) {
        const criticalCount = snapshot.ownSupply.criticalCount;
        alerts.push({
            id: 'sustainment-critical',
            severity: 'warning',
            text: `${criticalCount} controlled municipality${criticalCount === 1 ? '' : 'ies'} are at critical sustainability.`,
        });
    }
    if (snapshot.ownAuthority.authority < 0.3) {
        alerts.push({
            id: 'authority-critical',
            severity: 'warning',
            text: 'Central authority is critically low.',
        });
    }
    if (snapshot.ownExhaustion.increasing) {
        alerts.push({
            id: 'exhaustion-worsening',
            severity: 'warning',
            text: 'Exhaustion trend worsening.',
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
        });
    }
    if (snapshot.ownDisplacement.activeHostileTakeoverTimers > 0) {
        const timerCount = snapshot.ownDisplacement.activeHostileTakeoverTimers;
        alerts.push({
            id: 'hostile-takeovers',
            severity: 'warning',
            text: `${timerCount} hostile takeover timer${timerCount === 1 ? '' : 's'} remain active.`,
        });
    }
    if (snapshot.brigadeMovement.packing.length > 0) {
        const packingCount = snapshot.brigadeMovement.packing.length;
        alerts.push({
            id: 'brigades-packing',
            severity: 'warning',
            text: `${packingCount} brigade${packingCount === 1 ? '' : 's'} are packing; front gaps may open.`,
        });
    }
    const activeOperationCount = corpsOperations.filter((entry) => entry.operationType !== null).length;
    if (activeOperationCount > 0) {
        alerts.push({
            id: 'active-operations',
            severity: 'info',
            text: `${activeOperationCount} corps command${activeOperationCount === 1 ? '' : 's'} are running active operations.`,
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
        ...viewWithoutHeadline,
    };
}

export function getOperationalSitrepView(
    gameState: GameState,
    playerFaction: FactionId,
): OperationalSitrepView {
    return toOperationalSitrepView(extractWarData(gameState, playerFaction));
}
