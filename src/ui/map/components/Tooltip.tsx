/**
 * Rich tooltip system (Phase C1). HOI spec §7, §9.2.
 * 300ms delay, warm palette, pointer-events: none so tooltips never block clicks.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { stripFactionSuffix } from '../utils/sectorUtils';
import { FACTION_COLORS } from '../utils/theme';
import { SettlementDetailContent } from './SettlementDetailContent';
import type { CorpsFrontSectorView, FormationView } from '../data/types';
import type { TurnBattle } from '../../../state/turn_summary.js';
import { humanizeOsid } from '../utils/osidDisplayName';
import {
  buildPlayerSafeFormationTooltipModel,
  buildPlayerSafeFrontTooltipModel,
  getPlayerSafeSettlementTooltipFormations,
} from './tooltipPlayerSafe';
import { getPlayerFacingFaction } from '../../shared/playerVisibility';

const TOOLTIP_DELAY_MS = 300;
const TOOLTIP_OFFSET = 12;

const OUTCOME_LABEL: Record<string, string> = {
  decisive_victory: 'Decisive Victory', victory: 'Victory', costly_victory: 'Costly Victory',
  stalemate: 'Stalemate', repulsed: 'Repulsed', catastrophic: 'Catastrophic Defeat',
};
const OUTCOME_COLOR: Record<string, string> = {
  decisive_victory: '#56d364', victory: '#56d364', costly_victory: '#e8a838',
  stalemate: '#aaa', repulsed: '#f47068', catastrophic: '#f44',
};
const FACTION_LABEL: Record<string, string> = { RS: 'VRS', RBiH: 'ARBiH', HRHB: 'HVO' };

function BattleTooltipContent({ osid, battles, osidDisplayNames }: {
  osid: string;
  battles?: TurnBattle[];
  osidDisplayNames: Record<string, string> | null;
}) {
  const battle = battles?.find((b) => b.osid === osid);
  if (!battle) {
    return <div className="text-[11px] text-text-secondary">Battle at {humanizeOsid(osid)}</div>;
  }
  const outcomeLabel = OUTCOME_LABEL[battle.outcome] ?? battle.outcome;
  const outcomeColor = OUTCOME_COLOR[battle.outcome] ?? '#aaa';
  const locationName = getOsidDisplayName(osid, osidDisplayNames) || humanizeOsid(osid);
  return (
    <div className="min-w-[200px] max-w-[280px]">
      <div className="font-sans text-xs font-semibold uppercase tracking-wide border-b border-panel-border pb-1 mb-2" style={{ color: outcomeColor }}>
        {outcomeLabel}
      </div>
      <div className="text-[11px] text-text-primary mb-1">{locationName}</div>
      <div className="text-[10px] text-text-secondary mb-1.5">
        <span style={{ color: FACTION_COLORS[battle.attacker_faction] ?? '#aaa' }}>{FACTION_LABEL[battle.attacker_faction] ?? battle.attacker_faction}</span>
        <span className="mx-1">→</span>
        <span style={{ color: FACTION_COLORS[battle.defender_faction] ?? '#aaa' }}>{FACTION_LABEL[battle.defender_faction] ?? battle.defender_faction}</span>
        {battle.was_concentrated && <span className="ml-1 text-text-muted">({battle.all_attacker_ids.length}× concentrated)</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-3 text-[10px] tabular-nums">
        <div className="text-text-secondary">Attacker losses</div>
        <div className="text-text-primary">−{battle.attacker_casualties.toLocaleString()}</div>
        <div className="text-text-secondary">Defender losses</div>
        <div className="text-text-primary">−{battle.defender_casualties.toLocaleString()}</div>
      </div>
      {battle.territory_flipped && (
        <div className="mt-1 text-[9px] text-amber-400">Territory captured</div>
      )}
      <div className="mt-1.5 text-[9px] text-text-muted italic">Click for After-Action Report</div>
    </div>
  );
}

/** §7.2 Formation: name, corps, personnel, cohesion bar, posture, AoR summary, order */
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
  const formation = formations?.find((f) => f.id === formationId);
  const playerFaction = getPlayerFacingFaction(useGameStore.getState().loadedGameState);
  const model = buildPlayerSafeFormationTooltipModel({
    formationId,
    formations,
    attackOrders,
    osidDisplayNames,
    playerFaction,
  });
  if (!formation) return <div className="text-[11px] text-text-secondary">Unknown formation</div>;

  if (model.classification === 'enemy_contact') {
    return (
      <div className="min-w-[220px] max-w-[280px]">
        <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
          {model.title}
        </div>
        {model.subtitle && (
          <div className="text-[11px] text-text-secondary mb-1">{model.subtitle}</div>
        )}
        <div className="text-[11px] text-text-secondary">Staff confirms visible enemy presence.</div>
        {model.statusLine && (
          <div className="text-[10px] text-text-muted mt-1">{model.statusLine}</div>
        )}
      </div>
    );
  }

  const cohesion = Math.max(0, Math.min(100, model.cohesion ?? 0));
  const filledSegments = Math.ceil(cohesion / 20);

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
        <div className="text-[10px] text-green-400 mb-1">⌂ Home municipality</div>
      )}
      {model.personnel != null && (
        <div className="text-[11px] text-text-secondary mb-1">
          Personnel: {model.personnel.toLocaleString()}
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] mb-1">
        <span className="text-text-secondary">Cohesion:</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`block h-1.5 w-3 rounded-sm ${i < filledSegments ? 'bg-panel-active' : 'bg-panel-card'}`}
            />
          ))}
        </div>
        <span className="tabular-nums">{Math.round(cohesion)}</span>
      </div>
      {model.posture && (
        <div className="text-[11px] text-text-secondary mb-1">Posture: {model.posture}</div>
      )}
      {model.aorSummary && (
        <div className="text-[11px] text-text-secondary mb-1">AoR: {model.aorSummary}</div>
      )}
      {model.orderLine && (
        <div className="text-[11px] text-text-secondary border-t border-panel-border pt-1">
          Order: {model.orderLine}
        </div>
      )}
      {model.statusLine && <div className="text-[11px] text-text-secondary mt-0.5">Status: {model.statusLine}</div>}
    </div>
  );
}

/** Density label + color class */
function densityBadge(density: number): { label: string; color: string } {
  if (density < 0.5) return { label: 'THIN', color: 'text-red-400' };
  if (density > 1.0) return { label: 'DENSE', color: 'text-green-400' };
  return { label: 'Normal', color: 'text-amber-300' };
}

/** Threat label + color class */
function threatBadge(ratio: number): { label: string; color: string } {
  if (ratio > 1.5) return { label: 'critical', color: 'text-red-400' };
  if (ratio > 0.8) return { label: 'contested', color: 'text-amber-300' };
  return { label: 'secure', color: 'text-green-400' };
}

/** §7.3 Front edge: factions, sector, density, threat, pressure, formations each side */
function FrontTooltipContent({
  edgeId,
  frontEdgesOsid,
  frontPressureByEdge,
  formations,
  assignableFrontSegments,
  corpsFrontSectors,
}: {
  edgeId: string;
  frontEdgesOsid: { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[] | undefined;
  frontPressureByEdge: Record<string, { value: number; max_abs: number }> | undefined;
  formations: FormationView[] | undefined;
  assignableFrontSegments: { front_id: string; edge_ids: string[]; side_a: string | null; side_b: string | null }[] | undefined;
  corpsFrontSectors?: CorpsFrontSectorView[];
}) {
  // Strip faction suffix from composite hover ID to match canonical edge IDs
  const baseEdgeId = stripFactionSuffix(edgeId);

  const edge = frontEdgesOsid?.find((e) => e.edge_id === baseEdgeId);
  const playerFaction = getPlayerFacingFaction(useGameStore.getState().loadedGameState);
  const model = buildPlayerSafeFrontTooltipModel({
    edgeId: baseEdgeId,
    frontEdgesOsid,
    frontPressureByEdge,
    formations,
    fogOfWar: useGameStore.getState().loadedGameState?.fogOfWar,
    assignableFrontSegments,
    corpsFrontSectors,
    playerFaction,
  });
  const segment = assignableFrontSegments?.find((s) => s.edge_ids.includes(baseEdgeId));
  const persistenceLine = segment ? `${segment.edge_ids.length} edges` : '—';

  return (
    <div className="min-w-[220px] max-w-[300px]">
      <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
        {model.title}
      </div>
      {model.sectorName && (
        <div className="text-[11px] text-text-secondary mb-1.5">
          Sector: {model.sectorName}
        </div>
      )}
      <div className="text-[11px] text-text-secondary mb-1">Persistence: {persistenceLine}</div>
      <div className="text-[11px] text-text-secondary mb-1">Pressure: {model.pressureLine}</div>
      {model.densityValue != null && model.densityLabel && (
        <div className="text-[11px] text-text-secondary mb-1">
          Density: <span className={densityBadge(model.densityValue).color}>{model.densityValue.toFixed(2)} ({model.densityLabel})</span>
        </div>
      )}
      {model.threatValue != null && model.threatLabel && (
        <div className="text-[11px] text-text-secondary mb-2">
          Threat: <span className={threatBadge(model.threatValue).color}>{model.threatValue.toFixed(2)}× ({model.threatLabel})</span>
        </div>
      )}
      {model.ownFormationLabels.length > 0 && (
        <div className="text-[11px] mb-1 border-t border-panel-border pt-1">
          <span className={FACTION_COLORS[playerFaction ?? ''] ?? 'text-text-primary'}>{playerFaction ?? 'Own'}:</span>{' '}
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
}: {
  osid: string;
  sectors: CorpsFrontSectorView[] | undefined;
  formations: FormationView[] | undefined;
}) {
  const info = useMemo(() => {
    if (!sectors || !formations) return null;
    const formationMap = new Map(formations.map(f => [f.id, f]));

    // Find the sector containing this OSID via edge_ids (format: "osidA::osidB")
    const sector = sectors.find(s =>
      s.edge_ids?.some((eid: string) => {
        const parts = eid.split('::');
        return parts[0] === osid || parts[1] === osid;
      })
    );
    if (!sector) return null;

    const brigadeIds = [...(sector.assigned_brigade_ids ?? []), ...(sector.reserve_brigade_ids ?? [])];
    const munFromOsid = (o: string | undefined): string | undefined => o?.split(':')[1];
    const targetMun = munFromOsid(osid);

    let physicalCount = 0;
    let reactiveCount = 0;
    const brigades: { id: string; name: string; atOsid: boolean; isHome: boolean }[] = [];

    for (const bid of brigadeIds) {
      const f = formationMap.get(bid);
      if (!f || !f.location_osid || !f.personnel || f.personnel <= 0) continue;
      const atOsid = f.location_osid === osid;
      const isHome = !!(munFromOsid(f.home_osid) && munFromOsid(f.home_osid) === targetMun);
      if (atOsid) physicalCount++;
      else reactiveCount++;
      brigades.push({ id: bid, name: f.name, atOsid, isHome });
    }

    return {
      sector_id: sector.sector_id,
      stance: sector.sector_stance ?? 'defend',
      physicalCount,
      reactiveCount,
      brigades: brigades.sort((a, b) => (a.atOsid === b.atOsid ? 0 : a.atOsid ? -1 : 1)),
    };
  }, [osid, sectors, formations]);

  if (!info) return null;

  const STANCE_LABEL: Record<string, string> = {
    fortify: 'Fortify', defend: 'Defend', elastic: 'Elastic',
    active_defense: 'Active Def.', screening: 'Screening',
  };

  return (
    <div className="mt-2 pt-2 border-t border-panel-border/40">
      <div className="text-[9px] text-text-muted uppercase tracking-wide mb-1">Defense Preview</div>
      <div className="text-[10px] text-text-secondary flex gap-2">
        <span>Sector stance: <span className="text-text-primary">{STANCE_LABEL[info.stance] ?? info.stance}</span></span>
      </div>
      <div className="text-[10px] text-text-secondary mt-0.5">
        {info.physicalCount > 0
          ? <span><span className="text-text-primary">{info.physicalCount}</span> at OSID</span>
          : <span className="text-amber-400">No brigades at OSID</span>
        }
        {info.reactiveCount > 0 && (
          <span className="ml-2"><span className="text-text-primary">{info.reactiveCount}</span> reactive</span>
        )}
      </div>
      {info.brigades.length > 0 && (
        <div className="mt-1 space-y-px">
          {info.brigades.slice(0, 5).map(b => (
            <div key={b.id} className="text-[9px] text-text-muted flex items-center gap-1">
              <span className="text-text-secondary">{b.atOsid ? '⊕' : '↷'}</span>
              {b.isHome && <span title="Home municipality">⌂</span>}
              <span className="truncate">{b.name}</span>
            </div>
          ))}
          {info.brigades.length > 5 && (
            <div className="text-[9px] text-text-muted">+{info.brigades.length - 5} more</div>
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
  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x + TOOLTIP_OFFSET,
    top: position.y + TOOLTIP_OFFSET,
    zIndex: 9999,
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
              sectors={loadedGameState?.corpsFrontSectors}
              formations={(loadedGameState?.formations ?? []).filter((formation) => formation.faction === playerFaction)}
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
          assignableFrontSegments={loadedGameState?.assignableFrontSegments}
          corpsFrontSectors={loadedGameState?.corpsFrontSectors}
        />
      )}
      {delayedTarget.type === 'battle' && (
        <BattleTooltipContent
          osid={delayedTarget.id}
          battles={loadedGameState?.latestTurnSummary?.battles}
          osidDisplayNames={osidDisplayNames}
        />
      )}
    </div>
  );
});
