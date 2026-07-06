import { useEffect } from 'react';
import { getPlayerFacingSectorName } from '../../shared/playerFacingLabels';
import { t, useLocale } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { useGameStore } from '../store/gameStore';
import { getPlayerSafeCorpsName, getPlayerSafeDisplayLabel } from '../utils/playerSafeText';
import { isFocusInInteractiveControl } from '../utils/interactiveFocus';
import type { BreadcrumbLevel, PanelRailPanel, PanelRailState } from './panelRail';

interface PanelBreadcrumbProps {
  railState: PanelRailState;
}

const PANEL_LABEL_KEYS: Record<PanelRailPanel, Parameters<typeof t>[0]> = {
  inbox: 'panelBreadcrumb.inbox',
  settlement: 'panelBreadcrumb.settlement',
  formation: 'panelBreadcrumb.formation',
  corps: 'panelBreadcrumb.corps',
  army: 'panelBreadcrumb.army',
  army_reserve: 'panelBreadcrumb.armyReserve',
  sector: 'panelBreadcrumb.sector',
  operation: 'panelBreadcrumb.operation',
  orbat: 'panelBreadcrumb.orbat',
};

function panelTypeLabel(panel: PanelRailPanel): string {
  return t(PANEL_LABEL_KEYS[panel]);
}

function levelLabel(level: BreadcrumbLevel, locale: ReturnType<typeof useLocale>[0]): string {
  const state = useGameStore.getState();
  const loaded = state.loadedGameState;
  if (level.panel === 'corps') {
    const formation = loaded?.formations?.find((item) => item.id === level.id);
    return getPlayerSafeCorpsName(formation?.name, level.id, panelTypeLabel(level.panel));
  }
  if (level.panel === 'formation') {
    const formation = loaded?.formations?.find((item) => item.id === level.id);
    return formation ? getLocalizedFormationName(formation, locale) : panelTypeLabel(level.panel);
  }
  if (level.panel === 'sector') {
    const sector = loaded?.corpsFrontSectors?.find((item) => item.sector_id === level.id);
    return getPlayerFacingSectorName(level.id, sector ? [sector] : loaded?.corpsFrontSectors ?? []);
  }
  if (level.panel === 'army_reserve') {
    const formation = loaded?.formations?.find((item) => item.id === level.id);
    return formation?.name && !formation.name.includes('_')
      ? formation.name
      : panelTypeLabel(level.panel);
  }
  if (level.panel === 'settlement') {
    return state.osidDisplayNames?.[level.id] ?? getPlayerSafeDisplayLabel(level.id, panelTypeLabel(level.panel));
  }
  return panelTypeLabel(level.panel);
}

function selectBreadcrumbLevel(level: BreadcrumbLevel): void {
  const current = useGameStore.getState();
  if (level.panel === 'army_reserve') {
    useGameStore.setState({
      selectedArmyHqId: level.id,
      selectedFormationId: null,
      selectedOsid: null,
      selectedCorpsId: null,
      selectedCorpsFrontSectorId: null,
      selectedArmyId: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    });
    return;
  }
  if (level.panel === 'army') {
    useGameStore.setState({
      selectedArmyId: level.id,
      selectedCorpsId: null,
      selectedCorpsFrontSectorId: null,
      selectedFormationId: null,
      selectedOsid: null,
      selectedArmyHqId: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    });
    return;
  }
  if (level.panel === 'corps') {
    useGameStore.setState({
      selectedArmyHqId: null,
      selectedCorpsId: level.id,
      selectedCorpsFrontSectorId: null,
      selectedFormationId: null,
      selectedOsid: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    });
    return;
  }
  if (level.panel === 'sector') {
    useGameStore.setState({
      selectedArmyHqId: null,
      selectedCorpsId: current.selectedCorpsId,
      selectedCorpsFrontSectorId: level.id,
      selectedFormationId: null,
      selectedOsid: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    });
    return;
  }
  if (level.panel === 'settlement') {
    useGameStore.getState().setSelectedOsid(level.id);
    return;
  }
  if (level.panel === 'orbat') {
    useGameStore.getState().setSelectedOrbatCorpsId(level.id);
  }
}

function closeCurrentPanel(panel: PanelRailPanel | null): void {
  const store = useGameStore.getState();
  if (panel === 'formation') store.setSelectedFormationId(null);
  else if (panel === 'sector') store.setSelectedCorpsFrontSectorId(null);
  else if (panel === 'corps') store.setSelectedCorpsId(null);
  else if (panel === 'army_reserve') store.setSelectedArmyHqId(null);
  else if (panel === 'settlement') store.setSelectedOsid(null);
  else if (panel === 'orbat') store.setSelectedOrbatCorpsId(null);
}

function navigateUp(railState: PanelRailState): void {
  const parent = railState.trail[railState.trail.length - 1];
  if (parent) selectBreadcrumbLevel(parent);
  else closeCurrentPanel(railState.panel);
}

export function PanelBreadcrumb({ railState }: PanelBreadcrumbProps) {
  const [locale] = useLocale();
  useEffect(() => {
    if (railState.panel == null || railState.panel === 'inbox') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isFocusInInteractiveControl()) return;
      event.preventDefault();
      navigateUp(railState);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [railState]);

  if (railState.trail.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-text-secondary">
      {railState.trail.map((level) => {
        const typeLabel = panelTypeLabel(level.panel);
        const label = levelLabel(level, locale);
        return (
          <button
            key={`${level.panel}:${level.id}`}
            type="button"
            className="kbd-focus rounded border border-panel-border/70 bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:border-accent-gold/50 hover:text-accent-gold"
            aria-label={t('panelBreadcrumb.backTo', { label: typeLabel })}
            title={t('panelBreadcrumb.backTo', { label })}
            onClick={() => selectBreadcrumbLevel(level)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
