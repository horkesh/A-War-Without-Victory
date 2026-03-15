import type { MapMode } from '../store/gameStore';

export const MAP_MODES: { id: MapMode; label: string; key: string }[] = [
  { id: 'political', label: 'Political', key: '1' },
  { id: 'ethnic', label: 'Ethnic', key: '2' },
  { id: 'supply', label: 'Supply', key: '3' },
  { id: 'casualties', label: 'Casualties', key: '4' },
  { id: 'morale', label: 'Morale', key: '5' },
  { id: 'operations', label: 'Operations', key: '6' },
  { id: 'defense', label: 'Defense', key: '7' },
];

export const DEV_LAYER_TOGGLES = [
  { key: 'frontsVisible', setKey: 'setFrontsVisible', label: 'Fronts' },
  { key: 'formationsVisible', setKey: 'setFormationsVisible', label: 'Units' },
  { key: 'labelsVisible', setKey: 'setLabelsVisible', label: 'Labels' },
  { key: 'sectorsVisible', setKey: 'setSectorsVisible', label: 'Sectors' },
  { key: 'minimapVisible', setKey: 'setMinimapVisible', label: 'Minimap' },
  { key: 'fogVisible', setKey: 'setFogVisible', label: 'Fog' },
  { key: 'battlesVisible', setKey: 'setBattlesVisible', label: 'Battles' },
  { key: 'strategicVisible', setKey: 'setStrategicVisible', label: 'Points' },
] as const;

/** Live mode: no separate "Fronts" toggle — front lines ARE sectors.
 *  "Front" toggle controls sectorsVisible (which drives front line visibility). */
export const LIVE_LAYER_TOGGLES = [
  { key: 'sectorsVisible', setKey: 'setSectorsVisible', label: 'Front' },
  { key: 'formationsVisible', setKey: 'setFormationsVisible', label: 'Units' },
  { key: 'labelsVisible', setKey: 'setLabelsVisible', label: 'Labels' },
  { key: 'minimapVisible', setKey: 'setMinimapVisible', label: 'Minimap' },
  { key: 'fogVisible', setKey: 'setFogVisible', label: 'Fog' },
  { key: 'battlesVisible', setKey: 'setBattlesVisible', label: 'Battles' },
  { key: 'strategicVisible', setKey: 'setStrategicVisible', label: 'Points' },
] as const;
