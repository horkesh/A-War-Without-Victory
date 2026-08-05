import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tactical map loading state', () => {
  it('covers stale map state and disables counter interaction until the current revision is ready', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'ui', 'map', 'map', 'MapContainer.tsx'),
      'utf8',
    );

    expect(source).toMatch(/const \[mapRenderReady, setMapRenderReady\] = useState\(false\)/);
    expect(source).toMatch(/const \[mapRenderedTurn, setMapRenderedTurn\] = useState<number \| null>\(null\)/);
    expect(source).toMatch(/const \[mapRenderedRevision, setMapRenderedRevision\] = useState<string \| null>\(null\)/);
    expect(source).toMatch(/const \[mapLoadError, setMapLoadError\] = useState<string \| null>\(null\)/);
    expect(source).toMatch(/const \[mapInitAttempt, setMapInitAttempt\] = useState\(0\)/);
    expect(source).toMatch(/const currentRevisionReady = isTacticalMapStateReady\(/);
    expect(source).toContain('const currentMapStateReady = active && revealPainted && styleReady && currentRevisionReady;');
    expect(source).toMatch(/data-map-ready=\{currentMapStateReady \? 'true' : 'false'\}/);
    expect(source).toMatch(/data-map-state-turn=\{mapRenderedTurn \?\? ''\}/);
    expect(source).toMatch(/data-map-render-ready=\{mapRenderReady \? 'true' : 'false'\}/);
    expect(source).toMatch(/data-map-revision-ready=\{currentRevisionReady \? 'true' : 'false'\}/);
    expect(source).toMatch(/data-map-style-ready=\{styleReady \? 'true' : 'false'\}/);
    expect(source).toMatch(/data-map-reveal-painted=\{revealPainted \? 'true' : 'false'\}/);
    expect(source).toMatch(/completeMapTransition\(\{/);
    expect(source).toMatch(/fingerprintMatches:\s*mapRenderedRevision === loadedStateFingerprint/);
    expect(source).toMatch(/!currentMapStateReady && \(/);
    expect(source).toMatch(/counterDomOverlay\.inert = true/);
    expect(source).toMatch(/formationCounterDomOverlayRef\.current\.inert = !currentMapStateReady/);
    expect(source).toMatch(/currentMapStateReadyRef\.current = currentMapStateReady/);
    expect(source).toMatch(/\.once\('render', readinessRenderHandler\)/);
    expect(source).toMatch(/setMapRenderedTurn\(stateTurn\)/);
    expect(source).toMatch(/setMapRenderedRevision\(stateFingerprint\)/);
    expect(source).toMatch(/isSourceLoaded\('osid-control'\)/);
    expect(source).toMatch(/\.on\('sourcedata', readinessSourceHandler\)/);
    expect(source).toMatch(/let readinessTimeoutId: number \| null = null/);
    expect(source).toMatch(/window\.setTimeout\(\(\) => \{/);
    expect(source).not.toMatch(/map\.on\('error',[\s\S]{0,300}setMapLoadError/);
    expect(source).toMatch(/data-testid="tactical-map-load-error"/);
    expect(source).toMatch(/setMapInitAttempt\(\(attempt\) => attempt \+ 1\)/);
    expect(source).toMatch(/Required SID alias data failed:[\s\S]*setMapLoadError\(message\)/);
    expect(source).toMatch(/Failed to pre-load OSID data:[\s\S]*setMapLoadError/);
    expect(source).not.toMatch(/Optional (?:census|adjacency|terrain|scar) enrichment failed:[\s\S]{0,180}setMapLoadError/);
    expect(source).toMatch(/aria-busy=\{!currentMapStateReady\}/);
    expect(source).toMatch(/tabIndex=\{inputActive && currentMapStateReady \? 0 : -1\}/);
    expect(source).toMatch(/data-testid="tactical-map-loading"/);
    expect(source).not.toMatch(/data-testid="tactical-map-loading"[\s\S]{0,220}pointer-events-none/);
    expect(source).toMatch(/t\('map\.status\.preparing'\)/);
  });

  it('localizes the player-facing loading message', () => {
    const english = readFileSync(
      join(process.cwd(), 'src', 'ui', 'map', 'i18n', 'messages.en.ts'),
      'utf8',
    );
    const bcs = readFileSync(
      join(process.cwd(), 'src', 'ui', 'map', 'i18n', 'messages.bcs.ts'),
      'utf8',
    );

    expect(english).toContain("'map.status.preparing': 'Preparing operational map...'");
    expect(english).toContain("'map.status.loadFailed': 'Operational map data could not be loaded.'");
    expect(english).toContain("'map.status.retry': 'Retry'");
    expect(bcs).toContain("'map.status.preparing': 'Priprema operativne karte...'");
    expect(bcs).toContain("'map.status.loadFailed': 'Podaci operativne karte nisu učitani.'");
    expect(bcs).toContain("'map.status.retry': 'Pokušaj ponovo'");
  });
});
