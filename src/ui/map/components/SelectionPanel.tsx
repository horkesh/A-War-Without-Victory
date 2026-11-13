import { useGameStore } from '../store/gameStore';
import { getFormationsAtOsid } from '../utils/formationAtOsid';
import { SettlementDetailContent } from './SettlementDetailContent';
import { getFactionFlag } from '../utils/factionAssets';
import { useIPC } from '../desktop/useIPC';
import { useEffect, useState, type ReactNode } from 'react';
import { getMapRailStyle } from './panelRail';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { SURFACE_LABEL } from './surface/Surface';
import { MAP_RAIL_BUTTON, MapRailBody, MapRailCloseButton, MapRailFrame, MapRailHeader } from './surface/MapRail';
import { buildOsidToSectorMap } from '../utils/sectorUtils';
import { getOperationId } from '../utils/operations';
import { getCurrentEthnicForOsid } from '../map/builders/buildEthnicGeoJSON';
import { resolveMapFormationInspectionTarget } from '../map/mapSelectionRouting';
import { getPlayerSafeMunicipalityName } from '../utils/playerSafeText';
import { getLocalizedMunicipalitySupportLabel, getMunicipalitySupportTypeForFaction } from '../utils/municipalitySupportLabels';
import { t, useLocale } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { inspectOnField } from '../utils/shellNavigation';
import {
  filterPlayerFacingFormations,
  filterPlayerFacingBattlesByOsid,
  filterPlayerFacingMovementsByOsid,
  filterPlayerFacingOperationHistory,
  filterPlayerFacingSectors,
  filterPlayerVisibleMapFormations,
  isFieldedTacticalFormation,
  resolvePlayerFacingFaction,
} from '../../shared/playerVisibility';
import { getPlayerFacingSectorName, getPlayerVisibleOperations } from '../../shared/playerFacingLabels';

interface SelectionPanelProps {
  railSlot?: 'primary' | 'secondary';
  breadcrumb?: ReactNode;
}

type SettlementPropertiesForMunicipality = {
  mun1990_id?: string | number | null;
  mun_id?: string | number | null;
  mun_code?: string | number | null;
  mun?: string | number | null;
};

function normalizeMunicipalityId(value: string | number | null | undefined): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveSelectionPanelMunicipalityId(
  selectedOsid: string,
  osidPropertiesMap: Record<string, SettlementPropertiesForMunicipality> | undefined,
): string | null {
  const props = osidPropertiesMap?.[selectedOsid];
  return normalizeMunicipalityId(props?.mun1990_id)
    ?? normalizeMunicipalityId(props?.mun_id)
    ?? normalizeMunicipalityId(props?.mun_code)
    ?? normalizeMunicipalityId(props?.mun)
    ?? normalizeMunicipalityId(selectedOsid.split(':')[1]);
}

export function SelectionPanel({ railSlot = 'primary', breadcrumb }: SelectionPanelProps) {
  const ipc = useIPC();
  const [locale] = useLocale();
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupportMessage(null);
  }, [selectedOsid]);

  if (!selectedOsid) return null;

  if (!loadedGameState || !osidPropertiesMap?.[selectedOsid]) {
    return (
      <MapRailFrame className="panel-slide-in-right" style={getMapRailStyle()}>
        <div className="h-16 border-b border-[#262b35] bg-[#141821] panel-shimmer" />
        <div className="space-y-3 p-5">
          <div className="h-6 w-3/4 rounded bg-[#161a22] panel-shimmer" />
          <div className="h-4 w-full rounded bg-[#161a22] panel-shimmer" />
          <div className="h-40 w-full rounded bg-[#161a22] panel-shimmer" />
        </div>
      </MapRailFrame>
    );
  }

  const playerFacingFormations = filterPlayerFacingFormations(loadedGameState);
  const formations = getFormationsAtOsid(playerFacingFormations, selectedOsid);
  const playerFaction = resolvePlayerFacingFaction(loadedGameState);
  const enemyContactCount = playerFaction
    ? getFormationsAtOsid(filterPlayerVisibleMapFormations(loadedGameState), selectedOsid)
      .filter((formation) => formation.faction !== playerFaction && isFieldedTacticalFormation(formation))
      .length
    : 0;
  const selectedMunId = resolveSelectionPanelMunicipalityId(selectedOsid, osidPropertiesMap);
  const rawActiveSupport = playerFaction ? loadedGameState?.municipalitySupportOrders?.[playerFaction] : undefined;
  const activeSupport = rawActiveSupport?.staged_turn === loadedGameState?.turn ? rawActiveSupport : undefined;
  const supportType = playerFaction ? getMunicipalitySupportTypeForFaction(playerFaction) : null;
  const supportLabel = getLocalizedMunicipalitySupportLabel(supportType);
  const canStageSupport = Boolean(ipc.isAvailable && playerFaction && selectedMunId && supportType);
  const localSupportUnavailableReason = canStageSupport
    ? null
    : !ipc.isAvailable
      ? t('selection.commandBridgeUnavailable')
      : !supportType
        ? t('selection.localSupportUnavailable')
        : null;
  const formationsForDetail = formations.map((f) => ({
    id: f.id,
    name: getLocalizedFormationName(f, locale),
    faction: f.faction,
    personnel: f.personnel,
    kind: f.kind,
    readiness: f.readiness,
    cohesion: f.cohesion,
  }));

  const operationsTargetingOsid =
    getPlayerVisibleOperations(loadedGameState?.operations ?? [], playerFaction)
      ?.filter((op) => op.objectives?.includes(selectedOsid))
      .map((op) => ({ name: op.display_name, faction: op.faction, phase: op.phase, operationKey: getOperationId(op) }))
    ?? [];
  const recentControlEventsForOsid =
    loadedGameState?.recentControlEvents
      ?.filter((e) => e.settlementId === selectedOsid)
      .slice(-8)
      .reverse()
      .map((e) => ({ turn: e.turn, from: e.from, to: e.to, mechanism: e.mechanism }))
    ?? [];
  const statusLabel = loadedGameState?.statusBySettlement?.[selectedOsid] ?? null;

  const sectorInfo = (() => {
    const sectors = filterPlayerFacingSectors(loadedGameState);
    const edgesOsid = loadedGameState?.frontEdgesOsid;
    if (!sectors?.length || !edgesOsid?.length) {
      return {
        sectorName: null as string | null,
        sectorFaction: null as string | null,
        sectorId: null as string | null,
        sectorCorpsId: null as string | null,
      };
    }
    const osidToSector = buildOsidToSectorMap(sectors, edgesOsid);
    const sectorId = osidToSector.get(selectedOsid);
    if (!sectorId) return { sectorName: null, sectorFaction: null, sectorId: null, sectorCorpsId: null };
    const sector = sectors.find((s) => s.sector_id === sectorId);
    return {
      sectorName: sector ? getPlayerFacingSectorName(sector.sector_id, [sector]) : null,
      sectorFaction: sector?.faction ?? null,
      sectorId,
      sectorCorpsId: sector?.corps_id ?? null,
    };
  })();

  const departedByEthnicity = (() => {
    const raw = loadedGameState?.departedByOsid?.[selectedOsid];
    if (raw && Object.keys(raw).length > 0) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'number' && v > 0) out[k] = v;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    }
    // Fallback: no per-OSID events (e.g. Kamičani); use mun-level breakdown scaled to this settlement's out+lost
    const osidDisp = loadedGameState?.displacementByOsid?.[selectedOsid];
    const munBreakdown = selectedMunId ? loadedGameState?.departedByMun?.[selectedMunId] : undefined;
    const disp = selectedMunId ? loadedGameState?.displacementByMun?.[selectedMunId] : undefined;
    const targetTotal = osidDisp != null
      ? osidDisp.out + osidDisp.lost
      : disp && disp.originalPopulation > 0
        ? (() => {
            const popOriginal = Number(osidPropertiesMap?.[selectedOsid]?.population_total) || 0;
            if (popOriginal <= 0) return 0;
            const share = popOriginal / disp.originalPopulation;
            return Math.round(disp.displacedOut * share) + Math.round(disp.lostPopulation * share);
          })()
        : 0;
    if (targetTotal <= 0 || !munBreakdown) return undefined;
    const munTotal = Object.values(munBreakdown).reduce((a, n) => a + (typeof n === 'number' ? n : 0), 0);
    if (munTotal <= 0) return undefined;
    const popOriginal = Number(osidPropertiesMap?.[selectedOsid]?.population_total) || 0;
    if (popOriginal <= 0 && osidDisp == null) return undefined;
    const scale = targetTotal / munTotal;
    const out: Record<string, number> = {};
    const entries = Object.entries(munBreakdown)
      .filter(([, n]) => typeof n === 'number' && n > 0)
      .sort(([a], [b]) => a.localeCompare(b));
    let sum = 0;
    for (let i = 0; i < entries.length; i++) {
      const [eth, n] = entries[i];
      const v = i < entries.length - 1
        ? Math.floor((n as number) * scale)
        : Math.max(0, targetTotal - sum);
      if (v > 0) out[eth] = v;
      sum += v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  const brigadeCountByFaction: Record<string, number> = {};
  for (const f of formationsForDetail) {
    brigadeCountByFaction[f.faction] = (brigadeCountByFaction[f.faction] ?? 0) + 1;
  }
  const playerFormationIds = new Set(playerFacingFormations.map((formation) => formation.id));
  const playerFacingBattlesByOsid = filterPlayerFacingBattlesByOsid(loadedGameState);
  const playerFacingOperationHistory = filterPlayerFacingOperationHistory(loadedGameState);
  const playerFacingMovementsByOsid = filterPlayerFacingMovementsByOsid(loadedGameState);

  const pendingOrders = (() => {
    if (!loadedGameState) return undefined;
    const attack =
      loadedGameState.attackOrders?.filter((o) => o.targetSettlementId === selectedOsid && playerFormationIds.has(o.brigadeId)).map((o) => ({
        brigadeId: o.brigadeId,
        brigadeName: playerFacingFormations.find((fr) => fr.id === o.brigadeId)
          ? getLocalizedFormationName(playerFacingFormations.find((fr) => fr.id === o.brigadeId)!, locale)
          : undefined,
      })) ?? [];
    const move =
      loadedGameState.movementOrdersSettlement?.filter((o) => o.targetSettlementIds?.includes(selectedOsid) && playerFormationIds.has(o.brigadeId)).map((o) => ({
        brigadeId: o.brigadeId,
        brigadeName: playerFacingFormations.find((fr) => fr.id === o.brigadeId)
          ? getLocalizedFormationName(playerFacingFormations.find((fr) => fr.id === o.brigadeId)!, locale)
          : undefined,
      })) ?? [];
    const reposition =
      loadedGameState.repositionOrders?.filter((o) => o.settlementIds?.includes(selectedOsid) && playerFormationIds.has(o.brigadeId)).map((o) => ({
        brigadeId: o.brigadeId,
        brigadeName: playerFacingFormations.find((fr) => fr.id === o.brigadeId)
          ? getLocalizedFormationName(playerFacingFormations.find((fr) => fr.id === o.brigadeId)!, locale)
          : undefined,
      })) ?? [];
    if (attack.length === 0 && move.length === 0 && reposition.length === 0) return undefined;
    return { attack, move, reposition };
  })();

  const militiaPoolsForMun =
    selectedMunId && loadedGameState?.militiaPools?.length
      ? loadedGameState.militiaPools.filter(
        (p) => String(p.munId).toLowerCase().trim() === String(selectedMunId).toLowerCase().trim()
      )
      : [];
  const militiaPoolsProp =
    militiaPoolsForMun.length > 0
      ? militiaPoolsForMun.map((p) => ({
        faction: p.faction,
        available: p.available,
        committed: p.committed,
        exhausted: p.exhausted,
      }))
      : undefined;

  const currentEthnicEvidence =
    Boolean(departedByEthnicity && Object.keys(departedByEthnicity).length > 0)
    || Boolean(selectedMunId && Object.values(loadedGameState?.displacementByMun?.[selectedMunId]?.arrivedByFaction ?? {}).some((value) => (
      typeof value === 'number' && value > 0
    )));

  const currentEthnic =
    selectedOsid && osidPropertiesMap && currentEthnicEvidence
      ? getCurrentEthnicForOsid(
        selectedOsid,
        osidPropertiesMap,
        loadedGameState?.displacementByMun ?? undefined,
        loadedGameState?.departedByOsid ?? undefined
      )
      : null;

  const handleStageSupport = async () => {
    if (!playerFaction || !selectedMunId || !supportType) return;
    const result = await ipc.stageMunicipalitySupportOrder({
      faction: playerFaction,
      munId: selectedMunId,
      type: supportType,
    });
    setSupportMessage(result.ok ? t('selection.localSupportStaged') : (result.error ?? t('selection.localSupportFailed')));
  };

  const controller = loadedGameState?.controlBySettlement?.[selectedOsid];
  const controllerFlag = controller ? getFactionFlag(controller) : null;

  return (
    <MapRailFrame
      data-testid="selection-panel"
      data-rail-slot={railSlot}
      className="panel-slide-in-right"
      style={getMapRailStyle()}
    >
      <MapRailHeader
        breadcrumb={breadcrumb}
        mark={controllerFlag ? (
          <img
            src={controllerFlag}
            alt={t('selection.controllerFlag')}
            className="h-3.5 w-5 rounded-sm border border-black/20 object-cover"
          />
        ) : undefined}
        eyebrow={t('mapRail.eyebrow.settlement')}
        title={getOsidDisplayName(selectedOsid, osidDisplayNames)}
        subtitle={selectedMunId ? getPlayerSafeMunicipalityName(selectedMunId) : undefined}
        close={(
          <MapRailCloseButton
            onClick={() => setSelectedOsid(null)}
            aria-label={t('selection.close')}
            title={t('selection.close')}
          />
        )}
      />

      <MapRailBody className="gap-3 pt-0">
        <SettlementDetailContent
          osid={selectedOsid}
          osidDisplayNames={osidDisplayNames}
          osidPropertiesMap={osidPropertiesMap}
          controlBySettlement={loadedGameState?.controlBySettlement}
          formationsAtOsid={formationsForDetail}
          enemyContactCount={enemyContactCount}
          displacementByMun={loadedGameState?.displacementByMun ?? undefined}
          displacementByOsid={loadedGameState?.displacementByOsid ?? undefined}
          variant="panel"
          statusLabel={statusLabel ?? undefined}
          operationsTargetingOsid={operationsTargetingOsid.length > 0 ? operationsTargetingOsid : undefined}
          recentControlEvents={recentControlEventsForOsid.length > 0 ? recentControlEventsForOsid : undefined}
          departedByEthnicity={departedByEthnicity && Object.keys(departedByEthnicity).length > 0 ? departedByEthnicity : undefined}
          departedByOsid={loadedGameState?.departedByOsid as Record<string, Record<string, number>> | undefined}
          sectorName={sectorInfo.sectorName}
          sectorFaction={sectorInfo.sectorFaction}
          sectorId={sectorInfo.sectorId}
          brigadeCountByFaction={Object.keys(brigadeCountByFaction).length > 0 ? brigadeCountByFaction : undefined}
          pendingOrders={pendingOrders}
          militiaPools={militiaPoolsProp}
          onFormationClick={(formationId) => inspectOnField(
            useGameStore.getState(),
            resolveMapFormationInspectionTarget(formationId, { location_osid: selectedOsid }, loadedGameState),
          )}
          onSectorClick={(sectorId) => inspectOnField(useGameStore.getState(), sectorInfo.sectorCorpsId
            ? { kind: 'field-sector-in-corps', sectorId, corpsId: sectorInfo.sectorCorpsId, osid: selectedOsid }
            : { kind: 'field-sector', sectorId, osid: selectedOsid })}
          onOperationClick={(operationKey) => inspectOnField(useGameStore.getState(), { kind: 'field-operation', operationKey })}
          currentEthnic={currentEthnic ?? undefined}
          displacementEventLog={loadedGameState?.displacementEventLog}
          allControlEvents={loadedGameState?.allControlEvents}
          operationHistory={playerFacingOperationHistory}
          battlesByOsid={playerFacingBattlesByOsid}
          movementsByOsid={playerFacingMovementsByOsid}
          supplyTransitionsByOsid={loadedGameState?.supplyTransitionsByOsid}
          historicalEventsByTurn={loadedGameState?.historicalEventsByTurn}
          initialControlBySettlement={loadedGameState?.initialControlBySettlement}
          supplyStateByOsid={loadedGameState?.supplyStateByOsid}
        />
        {playerFaction && selectedMunId && (
          <div
            data-testid="settlement-local-support"
            data-target-mun-id={selectedMunId}
            className="mt-2 flex flex-col gap-2.5 rounded-md border border-[#2a303c] bg-[#161a22] px-4 py-3"
          >
            <div className={SURFACE_LABEL}>
              {t('selection.localSupport')}
            </div>
            <div className="text-[15px] text-[#c2b69c]">
              {activeSupport
                ? t('selection.localSupportTarget', {
                  label: getLocalizedMunicipalitySupportLabel(activeSupport.type),
                  target: getPlayerSafeMunicipalityName(activeSupport.mun_id),
                })
                : t('selection.noLocalSupportStaged')}
            </div>
            <button
              type="button"
              onClick={() => void handleStageSupport()}
              disabled={!canStageSupport}
              aria-describedby={localSupportUnavailableReason ? 'settlement-local-support-unavailable' : undefined}
              title={localSupportUnavailableReason ?? undefined}
              className={MAP_RAIL_BUTTON}
            >
              {t('selection.stageSupport', { label: supportLabel })}
            </button>
            <div className="text-[14px] text-[#b9ad94]">
              {t('selection.targetMunicipality', { municipality: getPlayerSafeMunicipalityName(selectedMunId) })}
            </div>
            {localSupportUnavailableReason && (
              <div id="settlement-local-support-unavailable" className="text-[14px] text-amber-200/90">
                {localSupportUnavailableReason}
              </div>
            )}
            {supportMessage && <div className="text-[14px] text-[#b9ad94]">{supportMessage}</div>}
          </div>
        )}
      </MapRailBody>
    </MapRailFrame>
  );
}
