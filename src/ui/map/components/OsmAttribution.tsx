/**
 * OpenStreetMap credit for map surfaces that draw OpenStreetMap-derived data.
 *
 * ODbL 1.0 requires the credit to be visible where the data is shown, so the war
 * map and the minimap each carry this small plate. The full credit, licence name
 * and copyright page also appear on the Credits screen and in THIRD_PARTY_NOTICES.md.
 *
 * Style: dark NATO ops plate (near-black, ops-green hairline, gold text), 12px so it
 * stays at the campaign text floor.
 *
 * Links: the Electron app has no external-link route (the main process installs no
 * window-open handler, so a target="_blank" link would open the site in a new app
 * window with the app's preload). In the desktop app the credit is therefore plain
 * text; in a browser it links to the OpenStreetMap copyright page.
 */
import type { CSSProperties } from 'react';
import { Z } from '../../shared/zIndex';
import { t } from '../i18n';

export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

export type OsmAttributionPlacement = 'war-map' | 'minimap';

/** True outside the Electron shell, where the preload bridge (`window.awwv`) is absent. */
export function canOpenExternalLinks(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as Window & { awwv?: unknown }).awwv == null;
}

const PLATE_STYLE: CSSProperties = {
  position: 'absolute',
  zIndex: Z.MAP_HUD_LOW,
  fontFamily: 'var(--font-command)',
  fontSize: '0.75rem',
  lineHeight: 1.25,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  color: '#c4a35a',
  background: 'rgba(16, 19, 15, 0.82)',
  border: '1px solid rgba(80, 184, 80, 0.38)',
  borderRadius: 2,
  padding: '1px 6px',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.45)',
};

const PLACEMENT_STYLE: Record<OsmAttributionPlacement, CSSProperties> = {
  // Bottom-left of the war map, just above the bottom status strip, on the map legend's
  // column (MapModeLegend: left calc(17rem + 1rem), bottom 6rem) beside the command
  // sidebar. The bottom-right belongs to the floating Find button (globals.css
  // .command-palette-opener) and the right-edge rails. A left map rail covers this slot
  // while it is open, as it covers the legend.
  'war-map': {
    left: 'calc(17rem + 1rem)',
    bottom: 'calc(var(--awwv-bottom-bar-clearance, 2.5rem) + 0.375rem)',
  },
  // Inside the minimap frame, bottom-left. The minimap's lowest 8px sit behind the Find
  // button (bottom 3.25rem, about 2rem tall; the minimap starts 76px up), so the plate
  // starts 12px up: 88px from the window bottom, where right-edge rails end
  // (RIGHT_RAIL_BOTTOM, 5.5rem). An open rail then hides it whole rather than cutting it.
  minimap: {
    left: 4,
    bottom: 12,
  },
};

const LINK_STYLE: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  outlineColor: '#50b850',
};

export function OsmAttribution({ placement }: { placement: OsmAttributionPlacement }) {
  const label = t('map.attribution.osm');
  const linkable = canOpenExternalLinks();
  return (
    <div
      data-testid={`osm-attribution-${placement}`}
      // On the war map, unit counters treat the plate as a panel and clear it rather than
      // drawing under it. The minimap frame is already an occluder.
      data-awwv-counter-occluder={placement === 'war-map' ? 'true' : undefined}
      style={{
        ...PLATE_STYLE,
        ...PLACEMENT_STYLE[placement],
        pointerEvents: linkable ? 'auto' : 'none',
      }}
    >
      {linkable ? (
        <a
          href={OSM_COPYRIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('map.attribution.osmLinkLabel')}
          className="hover:underline focus-visible:underline hover:text-[#d8b86c] focus-visible:text-[#d8b86c]"
          style={LINK_STYLE}
        >
          {label}
        </a>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}
