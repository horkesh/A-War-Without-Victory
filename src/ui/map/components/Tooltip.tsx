/**
 * Rich tooltip system (Phase C1). HOI spec §7, §9.2.
 * 300ms delay, warm palette, pointer-events: none so tooltips never block clicks.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { buildSectorFormationAssignment, collectSectorFriendlyOsids, stripFactionSuffix } from '../utils/sectorUtils';
import { FACTION_COLORS } from '../utils/theme';
import { Z } from '../../shared/zIndex';
import { SettlementDetailContent } from './SettlementDetailContent';
import type { CorpsFrontSectorView, FormationView, FrontEdgeView } from '../data/types';
import type { TurnBattle } from '../../../state/turn_summary.js';
import {
  buildPlayerSafeFormationTooltipModel,
  buildPlayerSafeFrontTooltipModel,
  getPlayerSafeSettlementTooltipFormations,
} from './tooltipPlayerSafe';
import { filterPlayerFacingSectors, filterPlayerVisibleBattles, getPlayerFacingFaction, isFieldedTacticalFormation } from '../../shared/playerVisibility';
import {
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeSettlementName,
} from '../utils/playerSafeText';
import { t, useLocale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';

const TOOLTIP_DELAY_MS = 300;
const TOOLTIP_OFFSET = 12;
const TOOLTIP_VIEWPORT_MARGIN = 24;
const TOOLTIP_MAX_WIDTH = 380;
const TOOLTIP_MAX_HEIGHT = 520;

function clampViewportCoordinate(value: number, viewportExtent: number, estimatedExtent: number): number {
  const min = TOOLTIP_VIEWPORT_MARGIN;
  const max = Math.max(min, viewportExtent - estimatedExtent - TOOLTIP_VIEWPORT_MARGIN);
  return Math.min(Math.max(value, min), max);
}

const OUTCOME_LABEL_KEY: Record<string, MessageKey> = {
  decisive_victory: 'aar.outcome.decisive',
  victory: 'aar.outcome.victory',
  costly_victory: 'aar.outcome.costly',
  stalemate: 'aar.outcome.stalemate',
  repulsed: 'aar.outcome.repulsed',
  catastrophic: 'aar.outcome.collapse',
};
const OUTCOME_COLOR: Record<string, string> = {
  decisive_victory: '#56d364', victory: '#56d364', costly_victory: '#e8a838',
  stalemate: '#aaa', repulsed: '#f47068', catastrophic: '#f44',
};
const INTEL_FRICTION_LABEL_KEY: Record<string, MessageKey> = {
  stale_intel: 'aar.friction.staleIntel',
  defender_opsec: 'aar.friction.defenderOpsec',
  ambush_risk: 'aar.friction.ambushRisk',
};
const CONFIDENCE_BAND_LABEL_KEY: Record<string, MessageKey> = {
  low: 'aar.confidence.low',
  medium: 'aar.confidence.medium',
  high: 'aar.confidence.high',
};

function formatReportedLoss(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `−${value.toLocaleString()}`
    : t('corpsFront.unreported');
}

function BattleTooltipContent({ osid, battles, osidDisplayNames }: {
  osid: string;
  battles?: ReadonlyArray<Partial<TurnBattle> & { osid?: string }>;
  osidDisplayNames: Record<string, string> | null;
}) {
  const battle = battles?.find((b) => b.osid === osid);
  if (!battle) {
    const location = getOsidDisplayName(osid, osidDisplayNames) || getPlayerSafeSettlementName(osid, t('tooltip.thisPosition'));
    return (
      <div className="text-[11px] text-text-secondary">
        {t('tooltip.battleAtPosition', { location })}
      </div>
    );
  }
  const outcome = typeof battle.outcome === 'string' ? battle.outcome : '';
  const attackerFaction = typeof battle.attacker_faction === 'string' ? battle.attacker_faction : null;
  const defenderFaction = typeof battle.defender_faction === 'string' ? battle.defender_faction : null;
  const outcomeLabelKey = OUTCOME_LABEL_KEY[outcome];
  const outcomeLabel = outcomeLabelKey ? t(outcomeLabelKey) : t('aar.outcome.recorded');
  const outcomeColor = OUTCOME_COLOR[outcome] ?? '#aaa';
  const locationName = getOsidDisplayName(osid, osidDisplayNames) || getPlayerSafeSettlementName(osid, 'this position');
  return (
    <div className="min-w-[200px] max-w-[280px]">
      <div className="font-sans text-xs font-semibold uppercase tracking-wide border-b border-panel-border pb-1 mb-2" style={{ color: outcomeColor }}>
        {outcomeLabel}
      </div>
      <div className="text-[11px] text-text-primary mb-1">{locationName}</div>
      <div className="text-[10px] text-text-secondary mb-1.5">
        <span style={{ color: FACTION_COLORS[attackerFaction ?? ''] ?? '#aaa' }}>
          {getPlayerSafeMilitaryFactionName(attackerFaction)}
        </span>
        <span className="mx-1">→</span>
        <span style={{ color: FACTION_COLORS[defenderFaction ?? ''] ?? '#aaa' }}>
          {getPlayerSafeMilitaryFactionName(defenderFaction)}
        </span>
        {battle.was_concentrated && (
          <span className="ml-1 text-text-muted">
            ({t('tooltip.concentratedAttack', { count: battle.all_attacker_ids?.length ?? 0 })})
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 text-[10px] tabular-nums">
        <div className="text-text-secondary">{t('tooltip.attackerLosses')}</div>
        <div className="text-text-primary">{formatReportedLoss(battle.attacker_casualties)}</div>
        <div className="text-text-secondary">{t('tooltip.defenderLosses')}</div>
        <div className="text-text-primary">{formatReportedLoss(battle.defender_casualties)}</div>
      </div>
      {battle.territory_flipped && (
        <div className="mt-1 text-[9px] text-amber-400">{t('tooltip.territoryCaptured')}</div>
      )}
      {battle.execution_friction && (
        <div className="mt-1 text-[9px] text-amber-300">
          {battle.execution_friction.labels.map((label) => t(INTEL_FRICTION_LABEL_KEY[label] ?? 'aar.friction.commandFriction')).join(' / ')}
          {battle.execution_friction.attacker_confidence_band
            ? ` (${t('aar.confidenceBand', {
              band: t(CONFIDENCE_BAND_LABEL_KEY[battle.execution_friction.attacker_confidence_band] ?? 'aar.confidence.uncertain'),
            })})`
            : ''}
        </div>
      )}
      <div className="mt-1.5 text-[9px] text-text-muted italic">{t('tooltip.clickForAar')}</div>
    </div>
  );
}

/** §7.2 Formation: name, corps, personnel, cohesion bar, posture, area summary, order */
function FormationTooltipContent({
  formationId,
  formations,
  attackOrders,
  osidDisplayNames,
}: {
  formationId: string;
  formations: FormationView[] | undefined;
  attackOrders: { brigadeId: string; targetSettlementId: string }[] | undefined;
  osidDisplayNames: Record<string, string> | null;
}) {
  const [locale] = useLocale();
  const formation = formations?.find((f) => f.id === formationId);
  const playerFaction = getPlayerFacingFaction(useGameStore.getState().loadedGameState);
  const model = buildPlayerSafeFormationTooltipModel({
    formationId,
    formations,
    attackOrders,
    osidDisplayNames,
    playerFaction,
    locale,
  });
  if (!formation) return <div className="text-[11px] text-text-secondary">{t('tooltip.unknownFormation')}</div>;

  if (model.classification === 'enemy_contact') {
    return (
      <div className="min-w-[220px] max-w-[280px]">
        <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
          {model.title}
        </div>
        {model.subtitle && (
          <div className="text-[11px] text-text-secondary mb-1">{model.subtitle}</div>
        )}
        <div className="text-[11px] text-text-secondary">{t('tooltip.enemyPresenceConfirmed')}</div>
        {model.statusLine && (
          <div className="text-[10px] text-text-muted mt-1">{model.statusLine}</div>
        )}
      </div>
    );
  }

  const cohesionReported = typeof model.cohesion === 'number' && Number.isFinite(model.cohesion);
  const cohesion = cohesionReported ? Math.max(0, Math.min(100, model.cohesion as number)) : null;
  const filledSegments = cohesion == null ? 0 : Math.ceil(cohesion / 20);

  return (
    <div className="min-w-[220px] max-w-[300px]">
      <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
        {model.title}
      </div>
      {model.subtitle && (
        <div className="text-[11px] text-text-secondary mb-1">
          {model.subtitle}
        </div>
      )}
      {model.showHomeMunicipality && (
        <div className="text-[10px] text-green-400 mb-1">⌂ {t('tooltip.homeMunicipality')}</div>
      )}
      {model.personnel != null && (
        <div className="text-[11px] text-text-secondary mb-1">
          {t('tooltip.personnel', { count: model.personnel.toLocaleString() })}
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] mb-1">
        <span className="text-text-secondary">{t('tooltip.cohesion')}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`block h-1.5 w-3 rounded-sm ${i < filledSegments ? 'bg-panel-active' : 'bg-panel-card'}`}
            />
          ))}
        </div>
        <span className={cohesion == null ? 'text-text-secondary italic' : 'tabular-nums'}>
          {cohesion == null ? t('corpsFront.unreported') : Math.round(cohesion)}
        </span>
      </div>
      {model.posture && (
        <div className="text-[11px] text-text-secondary mb-1">
          <span>{t('tooltip.currentPosture')}</span>{' '}
          <span className="text-text-primary">{model.posture}</span>
        </div>
      )}
      {model.aorSummary && (
        <div className="text-[11px] text-text-secondary mb-1">
          <span>{t('tooltip.areaOfResponsibility')}</span>{' '}
          <span className="text-text-primary">{model.aorSummary}</span>
        </div>
      )}
      {model.orderLine && (
        <div className="text-[11px] text-text-secondary border-t border-panel-border pt-1">
          <span>{t('tooltip.currentOrder')}</span>{' '}
          <span className="text-text-primary">{model.orderLine}</span>
        </div>
      )}
      {model.statusLine && (
        <div className="text-[11px] text-text-secondary mt-0.5">
          <span>{t('tooltip.readiness')}</span>{' '}
          <span className="text-text-primary">{model.statusLine}</span>
        </div>
      )}
    </div>
  );
}

/** Density color class */
function densityColorClass(density: number): string {
  if (density < 0.5) return 'text-red-400';
  if (density > 1.0) return 'text-green-400';
  return 'text-amber-300';
}

/** §7.3 Front edge: factions, sector, density, threat, pressure, formations each side */
function FrontTooltipContent({
  edgeId,
  frontEdgesOsid,
  frontPressureByEdge,
  formations,
  corpsFrontSectors,
}: {
  edgeId: string;
  frontEdgesOsid: { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[] | undefined;
  frontPressureByEdge: Record<string, { value: number; max_abs: number }> | undefined;
  formations: FormationView[] | undefined;
  corpsFrontSectors?: CorpsFrontSectorView[];
}) {
  const [locale] = useLocale();
  // Strip faction suffix from composite hover ID to match canonical edge IDs
  const baseEdgeId = stripFactionSuffix(edgeId);

  const edge = frontEdgesOsid?.find((e) => e.edge_id === baseEdgeId);
  const sector = corpsFrontSectors?.find((entry) => entry.edge_ids.includes(baseEdgeId));
  const playerFaction = getPlayerFacingFaction(useGameStore.getState().loadedGameState);
  const model = buildPlayerSafeFrontTooltipModel({
    edgeId: baseEdgeId,
    frontEdgesOsid,
    frontPressureByEdge,
    formations,
    fogOfWar: useGameStore.getState().loadedGameState?.fogOfWar,
    corpsFrontSectors,
    playerFaction,
    locale,
  });
  const persistenceLine = sector
    ? t('tooltip.frontSegments', { count: sector.length_edges ?? sector.edge_ids.length }, locale)
    : '—';

  return (
    <div className="min-w-[220px] max-w-[300px]">
      <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
        {model.title}
      </div>
      {model.sectorName && (
        <div className="text-[11px] text-text-secondary mb-1.5">
          <span>{t('tooltip.sector')}</span>{' '}
          <span className="text-text-primary">{model.sectorName}</span>
        </div>
      )}
      <div className="text-[11px] text-text-secondary mb-1">
        <span>{t('tooltip.frontExtent')}</span>{' '}
        <span className="text-text-primary">{persistenceLine}</span>
      </div>
      <div className="text-[11px] text-text-secondary mb-1">
        <span>{t('tooltip.pressure')}</span>{' '}
        <span className="text-text-primary">{model.pressureLine}</span>
      </div>
      {model.sectorStatusLine && (
        <div className="text-[11px] text-amber-300 mb-1">
          {model.sectorStatusLine}
        </div>
      )}
      {model.densityValue != null && model.densityLabel && (
        <div className="text-[11px] text-text-secondary mb-1">
          <span>{t('tooltip.density')}</span>{' '}
          <span className={densityColorClass(model.densityValue)}>{model.densityValue.toFixed(2)} ({model.densityLabel})</span>
        </div>
      )}
      {model.threatSummary && (
        <div className="text-[11px] text-text-secondary mb-2">
          <span>{t('tooltip.threat')}</span>{' '}
          <span className="text-amber-300 uppercase">{model.threatSummary}</span>
        </div>
      )}
      {model.ownFormationLabels.length > 0 && (
        <div className="text-[11px] mb-1 border-t border-panel-border pt-1">
          <span className={FACTION_COLORS[playerFaction ?? ''] ?? 'text-text-primary'}>{playerFaction ? getPlayerSafeMilitaryFactionName(playerFaction) : 'Own'}:</span>{' '}
          {model.ownFormationLabels.join(', ')}
        </div>
      )}
      {model.enemyContactSummary && (
        <div className="text-[11px] text-text-secondary border-t border-panel-border pt-1">
          {model.enemyContactSummary}
        </div>
      )}
    </div>
  );
}

/** C5: Defense strength preview shown in defense map mode on OSID hover. */
function DefensePreviewContent({
  osid,
  sectors,
  formations,
  frontEdgesOsid,
}: {
  osid: string;
  sectors: CorpsFrontSectorView[] | undefined;
  formations: FormationView[] | undefined;
  frontEdgesOsid: FrontEdgeView[] | undefined;
}) {
  const [locale] = useLocale();
  const info = useMemo(() => {
    if (!sectors || !formations) return null;
    const formationMap = new Map(formations.map(f => [f.id, f]));

    const sector = sectors.find(s =>
      collectSectorFriendlyOsids(s, frontEdgesOsid).includes(osid)
        || Boolean(s.territory_osids?.includes(osid))
    );
    if (!sector) return null;

    const sectorAssignment = buildSectorFormationAssignment(sector, formations, sectors);
    const brigadeIds = sectorAssignment.lineHoldingIds;
    const munFromOsid = (o: string | undefined): string | undefined => o?.split(':')[1];
    const targetMun = munFromOsid(osid);

    let physicalCount = 0;
    let reactiveCount = 0;
    const brigades: { id: string; name: string; atOsid: boolean; isHome: boolean }[] = [];

    for (const bid of brigadeIds) {
      const f = formationMap.get(bid);
      if (!f || !isFieldedTacticalFormation(f) || !f.location_osid || !f.personnel || f.personnel <= 0) continue;
      const atOsid = f.location_osid === osid;
      const isHome = !!(munFromOsid(f.home_osid) && munFromOsid(f.home_osid) === targetMun);
      if (atOsid) physicalCount++;
      else reactiveCount++;
      brigades.push({ id: bid, name: getLocalizedFormationName(f, locale), atOsid, isHome });
    }

    return {
      sector_id: sector.sector_id,
      stance: sector.sector_stance ?? null,
      physicalCount,
      reactiveCount,
      brigades: brigades.sort((a, b) => (a.atOsid === b.atOsid ? 0 : a.atOsid ? -1 : 1)),
    };
  }, [osid, sectors, formations, frontEdgesOsid, locale]);

  if (!info) return null;

  const STANCE_LABEL_KEY: Record<string, MessageKey> = {
    fortify: 'tooltip.stance.fortify',
    defend: 'tooltip.stance.defend',
    elastic: 'tooltip.stance.elastic',
    active_defense: 'tooltip.stance.activeDefense',
    screening: 'tooltip.stance.screening',
  };
  const stanceLabel = info.stance ? t(STANCE_LABEL_KEY[info.stance] ?? 'tooltip.stance.review') : t('tooltip.stance.review');

  return (
    <div className="mt-2 pt-2 border-t border-panel-border/40">
      <div className="text-[9px] text-text-muted uppercase tracking-wide mb-1">{t('tooltip.defensePreview')}</div>
      <div className="text-[10px] text-text-secondary flex gap-2">
        <span>{t('tooltip.sectorStance')} <span className="text-text-primary">{stanceLabel}</span></span>
      </div>
      <div className="text-[10px] text-text-secondary mt-0.5">
        {info.physicalCount > 0
          ? <span>{t('tooltip.brigadesAtPosition', { count: info.physicalCount })}</span>
          : <span className="text-amber-400">{t('tooltip.noBrigadesAtOsid')}</span>
        }
        {info.reactiveCount > 0 && (
          <span className="ml-2">{t('tooltip.respondingBrigades', { count: info.reactiveCount })}</span>
        )}
      </div>
      {info.brigades.length > 0 && (
        <div className="mt-1 space-y-px">
          {info.brigades.slice(0, 5).map(b => (
            <div key={b.id} className="text-[9px] text-text-muted flex items-center gap-1">
              <span className="text-text-secondary">{b.atOsid ? '⊕' : '↷'}</span>
              {b.isHome && <span title={t('tooltip.homeMunicipality')}>⌂</span>}
              <span className="truncate">{b.name}</span>
            </div>
          ))}
          {info.brigades.length > 5 && (
            <div className="text-[9px] text-text-muted">{t('tooltip.moreBrigades', { count: info.brigades.length - 5 })}</div>
          )}
        </div>
      )}
    </div>
  );
}

export const Tooltip = React.memo(function Tooltip() {
  const tooltipTarget = useGameStore((s) => s.tooltipTarget);
  const tooltipPosition = useGameStore((s) => s.tooltipPosition);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const mapMode = useGameStore((s) => s.mapMode);
  const playerFaction = getPlayerFacingFaction(loadedGameState);

  const [visible, setVisible] = useState(false);
  const [delayedTarget, setDelayedTarget] = useState<typeof tooltipTarget>(null);

  useEffect(() => {
    if (!tooltipTarget) {
      setDelayedTarget(null);
      setVisible(false);
      return;
    }
    setDelayedTarget(tooltipTarget);
    const t = setTimeout(() => setVisible(true), TOOLTIP_DELAY_MS);
    return () => clearTimeout(t);
  }, [tooltipTarget]);

  useEffect(() => {
    if (!visible || !tooltipTarget) return;
    setDelayedTarget(tooltipTarget);
  }, [visible, tooltipTarget]);

  if (!delayedTarget || !visible) return null;

  const position = tooltipPosition ?? { x: 24, y: 24 };
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 720 : window.innerHeight;
  const style: React.CSSProperties = {
    position: 'fixed',
    left: clampViewportCoordinate(position.x + TOOLTIP_OFFSET, viewportWidth, TOOLTIP_MAX_WIDTH),
    top: clampViewportCoordinate(position.y + TOOLTIP_OFFSET, viewportHeight, TOOLTIP_MAX_HEIGHT),
    maxWidth: TOOLTIP_MAX_WIDTH,
    zIndex: Z.TOOLTIP,
    pointerEvents: 'none',
  };

  return (
    <div
      className="bg-panel-bg border border-panel-border rounded-lg shadow-xl p-3 text-text-primary font-sans"
      style={style}
    >
      {delayedTarget.type === 'osid' && (
        <>
          <SettlementDetailContent
            osid={delayedTarget.id}
            osidDisplayNames={osidDisplayNames}
            osidPropertiesMap={osidPropertiesMap}
            controlBySettlement={loadedGameState?.controlBySettlement}
            formationsAtOsid={getPlayerSafeSettlementTooltipFormations(loadedGameState, delayedTarget.id)}
            variant="tooltip"
          />
          {mapMode === 'defense' && (
            <DefensePreviewContent
              osid={delayedTarget.id}
              sectors={filterPlayerFacingSectors(loadedGameState)}
              formations={(loadedGameState?.formations ?? []).filter((formation) => formation.faction === playerFaction)}
              frontEdgesOsid={loadedGameState?.frontEdgesOsid}
            />
          )}
        </>
      )}
      {delayedTarget.type === 'formation' && (
        <FormationTooltipContent
          formationId={delayedTarget.id}
          formations={loadedGameState?.formations}
          attackOrders={loadedGameState?.attackOrders}
          osidDisplayNames={osidDisplayNames}
        />
      )}
      {delayedTarget.type === 'front' && (
        <FrontTooltipContent
          edgeId={delayedTarget.id}
          frontEdgesOsid={loadedGameState?.frontEdgesOsid}
          frontPressureByEdge={loadedGameState?.frontPressureByEdge}
          formations={loadedGameState?.formations}
          corpsFrontSectors={loadedGameState?.corpsFrontSectors}
        />
      )}
      {delayedTarget.type === 'battle' && (
        <BattleTooltipContent
          osid={delayedTarget.id}
          battles={filterPlayerVisibleBattles(loadedGameState?.latestTurnSummary?.battles, loadedGameState)}
          osidDisplayNames={osidDisplayNames}
        />
      )}
    </div>
  );
});
