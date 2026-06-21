import type { MessageKey } from '../i18n';
import type { MapMode } from '../store/gameStore';

export const MAP_MODES: { id: MapMode; label: string; labelKey: MessageKey; key: string }[] = [
  { id: 'political', label: 'Political', labelKey: 'map.mode.political', key: '1' },
  { id: 'ethnic', label: 'Ethnic', labelKey: 'map.mode.ethnic', key: '2' },
  { id: 'supply', label: 'Supply', labelKey: 'map.mode.supply', key: '3' },
  { id: 'casualties', label: 'Casualties', labelKey: 'map.mode.casualties', key: '4' },
  { id: 'morale', label: 'Morale', labelKey: 'map.mode.morale', key: '5' },
  { id: 'operations', label: 'Operations', labelKey: 'map.mode.operations', key: '6' },
  { id: 'defense', label: 'Defense', labelKey: 'map.mode.defense', key: '7' },
  { id: 'authority', label: 'Authority', labelKey: 'map.mode.authority', key: '8' },
  { id: 'legitimacy', label: 'Legitimacy', labelKey: 'map.mode.legitimacy', key: '9' },
];

export const DEV_LAYER_TOGGLES = [
  { key: 'frontsVisible', setKey: 'setFrontsVisible', label: 'Fronts', labelKey: 'map.layer.fronts' },
  { key: 'formationsVisible', setKey: 'setFormationsVisible', label: 'Units', labelKey: 'map.layer.units' },
  { key: 'labelsVisible', setKey: 'setLabelsVisible', label: 'Labels', labelKey: 'map.layer.labels' },
  { key: 'sectorsVisible', setKey: 'setSectorsVisible', label: 'Sectors', labelKey: 'map.layer.sectors' },
  { key: 'minimapVisible', setKey: 'setMinimapVisible', label: 'Minimap', labelKey: 'map.layer.minimap' },
  { key: 'fogVisible', setKey: 'setFogVisible', label: 'Fog', labelKey: 'map.layer.fog' },
  { key: 'municipalityBordersVisible', setKey: 'setMunicipalityBordersVisible', label: 'Borders', labelKey: 'map.layer.borders' },
  { key: 'ghostMapVisible', setKey: 'setGhostMapVisible', label: '1991', labelKey: 'map.layer.ghost1991' },
] as const;

/**
 * Live mode: no separate "Fronts" toggle. Front lines are sectors.
 * "Front" controls sectorsVisible, which drives front-line visibility.
 */
export const LIVE_LAYER_TOGGLES = [
  { key: 'sectorsVisible', setKey: 'setSectorsVisible', label: 'Front', labelKey: 'map.layer.front' },
  { key: 'formationsVisible', setKey: 'setFormationsVisible', label: 'Units', labelKey: 'map.layer.units' },
  { key: 'labelsVisible', setKey: 'setLabelsVisible', label: 'Labels', labelKey: 'map.layer.labels' },
  { key: 'minimapVisible', setKey: 'setMinimapVisible', label: 'Minimap', labelKey: 'map.layer.minimap' },
  { key: 'fogVisible', setKey: 'setFogVisible', label: 'Fog', labelKey: 'map.layer.fog' },
  { key: 'municipalityBordersVisible', setKey: 'setMunicipalityBordersVisible', label: 'Borders', labelKey: 'map.layer.borders' },
  { key: 'ghostMapVisible', setKey: 'setGhostMapVisible', label: '1991', labelKey: 'map.layer.ghost1991' },
] as const;
