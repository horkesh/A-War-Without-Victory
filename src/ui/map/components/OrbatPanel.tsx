import { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { LEFT_DETAIL_PANEL_STYLE } from './panelRail';
import { BrigadeRow } from './BrigadeRow';
import { FACTION_COLORS } from '../utils/theme';
import { getFormationCommander, resolveCorpsCommanderDisplay } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { CommanderDisplayPanel } from './CommanderDisplayPanel';
import type { CorpsFrontSectorView } from '../data/types';
import { t, useLocale } from '../i18n';
import { inspectOnField } from '../utils/shellNavigation';
import { getPlayerFacingSectorName } from '../../shared/playerFacingLabels';
import { isFieldedTacticalFormation } from '../../shared/playerVisibility';
import { resolveCurrentSectorForFormation } from '../utils/sectorUtils';
import { compareLocalizedFormationNames } from '../data/formationNameLocalizations';
import { getPlayerSafeCorpsName } from '../utils/playerSafeText';
import { formatReportedPersonnel, sumReportedPersonnel } from '../utils/reportedMetrics';

export function OrbatPanel() {
    const [locale] = useLocale();
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const selectedOrbatCorpsId = useGameStore((s) => s.selectedOrbatCorpsId);
    const setSelectedOrbatCorpsId = useGameStore((s) => s.setSelectedOrbatCorpsId);
    const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
    const setHoveredCorpsId = useGameStore((s) => s.setHoveredCorpsId);
    const setHoveredSectorId = useGameStore((s) => s.setHoveredSectorId);
    const setTooltipTargetWithPosition = useGameStore((s) => s.setTooltipTargetWithPosition);
    const clearTooltipTarget = useGameStore((s) => s.clearTooltipTarget);
    const panToOsid = useGameStore((s) => s.panToOsid);
    const setFlashOsid = useGameStore((s) => s.setFlashOsid);

    const corps = useMemo(() => {
        if (!loadedGameState || !selectedOrbatCorpsId) return null;
        return loadedGameState.formations.find((f) => f.id === selectedOrbatCorpsId) ?? null;
    }, [loadedGameState, selectedOrbatCorpsId]);

    const brigades = useMemo(() => {
        if (!loadedGameState || !selectedOrbatCorpsId) return [];
        return loadedGameState.formations
            .filter((f) => f.corps_id === selectedOrbatCorpsId && isFieldedTacticalFormation(f))
            .sort((a, b) => compareLocalizedFormationNames(a, b, locale));
    }, [loadedGameState, selectedOrbatCorpsId, locale]);

    const commander = useMemo(() => {
        if (!loadedGameState || !corps) return null;
        return getFormationCommander(corps, loadedGameState);
    }, [loadedGameState, corps]);

    const commanderDisplay = useMemo(() => {
        if (!loadedGameState || !corps || commander) return null;
        return resolveCorpsCommanderDisplay(corps.id, corps.faction, loadedGameState);
    }, [loadedGameState, corps, commander]);

    const corpsSectors: CorpsFrontSectorView[] = useMemo(() => {
        if (!loadedGameState?.corpsFrontSectors || !selectedOrbatCorpsId) return [];
        return loadedGameState.corpsFrontSectors.filter(
            (s) => s.corps_id === selectedOrbatCorpsId
        );
    }, [loadedGameState?.corpsFrontSectors, selectedOrbatCorpsId]);

    const sectorIdByBrigadeId = useMemo(() => {
        const map = new Map<string, string>();
        for (const brigade of brigades) {
            const sector = resolveCurrentSectorForFormation(brigade, corpsSectors);
            if (sector) map.set(brigade.id, sector.sector_id);
        }
        return map;
    }, [brigades, corpsSectors]);

    const sectorByBrigadeId = useMemo(() => {
        const map = new Map<string, ReturnType<typeof resolveCurrentSectorForFormation>>();
        for (const brigade of brigades) {
            const sector = resolveCurrentSectorForFormation(brigade, corpsSectors);
            if (sector) map.set(brigade.id, sector);
        }
        return map;
    }, [brigades, corpsSectors]);

    useEffect(() => {
        if (!selectedOrbatCorpsId) return;
        setHoveredCorpsId(selectedOrbatCorpsId);
        return () => {
            if (useGameStore.getState().hoveredCorpsId === selectedOrbatCorpsId) {
                setHoveredCorpsId(null);
            }
        };
    }, [selectedOrbatCorpsId, setHoveredCorpsId]);

    if (!corps) return null;

    const totalPersonnel = formatReportedPersonnel(sumReportedPersonnel(brigades), {
        partial: (personnel) => t('corpsFront.partialPersonnel', { personnel }),
        unreported: t('orbat.metricUnreported'),
    });
    const factionClass = FACTION_COLORS[corps.faction] ?? 'text-text-primary';
    const corpsDisplayName = getPlayerSafeCorpsName(corps.name, corps.id);

    return (
        <div
            className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl overflow-hidden paper-grain relative"
            style={{ ...LEFT_DETAIL_PANEL_STYLE, width: '24rem' }}
        >
            <div className="bg-panel-header border-b border-panel-border px-4 py-3 flex items-center justify-between shrink-0 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-text-secondary tracking-widest font-bold">{t('orbat.orderOfBattle')}</span>
                    <h2 className={`text-lg font-bold uppercase tracking-tight leading-tight ${factionClass}`}>
                        {corpsDisplayName}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setSelectedOrbatCorpsId(null)}
                    className="w-8 h-8 flex items-center justify-center rounded border border-panel-border bg-panel-bg hover:bg-panel-hover text-text-secondary transition-colors"
                    title={t('orbat.closePanel')}
                    aria-label={t('orbat.closePanel')}
                >
                    &times;
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {commander ? (
                    <OfficerProfile officer={commander} label={t('formationDetail.corpsCommander')} />
                ) : commanderDisplay && (
                    <CommanderDisplayPanel display={commanderDisplay} label={t('formationDetail.corpsCommander')} />
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-black/10 rounded border border-panel-border/30">
                        <div className="text-[9px] uppercase text-text-secondary font-semibold">{t('orbat.totalPersonnel')}</div>
                        <div className="text-sm font-mono text-text-primary">{totalPersonnel}</div>
                    </div>
                    <div className="p-2 bg-black/10 rounded border border-panel-border/30">
                        <div className="text-[9px] uppercase text-text-secondary font-semibold">{t('orbat.brigades')}</div>
                        <div className="text-sm font-mono text-text-primary">{brigades.length}</div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="text-[10px] uppercase text-text-secondary tracking-wider font-bold mb-2 pb-1 border-b border-panel-border/30">
                        {t('orbat.subordinateBrigades')}
                    </div>
                    <div className="divide-y divide-panel-border/30">
                        {brigades.map((b) => {
                            const sector = sectorByBrigadeId.get(b.id) ?? null;
                            return (
                                <div key={b.id} className="py-1">
                                    <BrigadeRow
                                        formation={b}
                                        compact
                                        onClick={() => {
                                            inspectOnField(useGameStore.getState(), sector
                                                ? {
                                                    kind: 'field-formation-in-sector',
                                                    formationId: b.id,
                                                    sectorId: sector.sector_id,
                                                    corpsId: corps.id,
                                                    osid: b.location_osid,
                                                }
                                                : {
                                                    kind: 'field-formation-in-corps',
                                                    formationId: b.id,
                                                    corpsId: corps.id,
                                                    osid: b.location_osid,
                                                });
                                            const osid = b.location_osid;
                                            if (osid) {
                                                panToOsid?.(osid);
                                                setFlashOsid(osid);
                                            }
                                        }}
                                        onHoverChange={(hovered, e) => {
                                            const osids = hovered ? (b.aorSettlementIds ?? (b.location_osid ? [b.location_osid] : [])) : [];
                                            setHoveredOsids(osids);
                                            setHoveredSectorId(hovered ? (sectorIdByBrigadeId.get(b.id) ?? null) : null);
                                            if (hovered) {
                                                setTooltipTargetWithPosition(
                                                    { type: 'formation', id: b.id },
                                                    e ? { x: e.clientX, y: e.clientY } : undefined
                                                );
                                                if (b.location_osid) setFlashOsid(b.location_osid);
                                            } else {
                                                clearTooltipTarget();
                                            }
                                        }}
                                    />
                                    <div className="mt-0.5 px-2 text-[9px] uppercase tracking-wide text-text-secondary/80">
                                        {sector
                                            ? t('orbat.currentSector', { sector: getPlayerFacingSectorName(sector.sector_id, corpsSectors) })
                                            : t('orbat.noCurrentSector')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="px-4 py-2 bg-black/40 border-t border-panel-border flex justify-between items-center shrink-0">
                <span className="text-[9px] font-mono text-text-secondary uppercase">
                    {corpsSectors.length > 0
                        ? t('orbat.sectorSummary', { count: corpsSectors.length, sectors: corpsSectors.map((s) => getPlayerFacingSectorName(s.sector_id, corpsSectors)).join(', ') })
                        : t('orbat.noActiveSectors')
                    }
                </span>
            </div>
        </div>
    );
}
