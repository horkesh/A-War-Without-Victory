import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('field operation plan preserves retained-map identity and ordering contracts', () => {
  it('keeps the single campaign-scoped retained viewport and same-dossier return identity', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/ui/map/App.tsx'), 'utf8');
    expect(appSource).toContain('<CampaignTacticalViewportOwner');
    expect(appSource).toContain('fieldOperationPlanReturnCardId');
    expect(appSource).toContain("openWarroomDecisionRoomFromField('all', dossierCardId)");
    expect(appSource).toContain('tacticalChromeVisible && fieldOperationPlanFocus === null');
  });

  it('publishes the retained graphics controller only after initial style load', () => {
    const mapSource = readFileSync(join(process.cwd(), 'src/ui/map/map/MapContainer.tsx'), 'utf8');
    const styleGateIndex = mapSource.indexOf('await styleLoadedPromise;');
    expect(styleGateIndex).toBeGreaterThan(-1);
    expect(mapSource.indexOf('ensureTacticalIcons(map);')).toBeGreaterThan(styleGateIndex);
    expect(mapSource.indexOf('setMapReady(true);')).toBeGreaterThan(styleGateIndex);
  });

  it('uses explicit controller arbitration and receipt diagnostics', () => {
    const mapSource = readFileSync(join(process.cwd(), 'src/ui/map/map/MapContainer.tsx'), 'utf8');
    expect(mapSource).toContain('createFieldOperationFocusController');
    expect(mapSource).toContain('ordinaryCameraOwnsNavigation(fieldOperationFocusControllerRef.current)');
    expect(mapSource).not.toContain('if (operationPlanFocusRef.current) return;');
    expect(mapSource).toContain('syncFieldOperationOverlayWhenStyleReady');
    expect(mapSource).toContain('data-field-operation-focus-status');
    expect(mapSource).toContain('isPointInsideFieldOperationSafeViewport');
  });

  it('keeps historical-operation dossier actions readable without hidden truncation', () => {
    const panelSource = readFileSync(
      join(process.cwd(), 'src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx'),
      'utf8',
    );
    const reviewStart = panelSource.indexOf('data-testid="decision-room-dossier-review"');
    const reviewEnd = panelSource.indexOf('</button>', reviewStart);
    const reviewAction = panelSource.slice(reviewStart, reviewEnd);

    expect(reviewStart).toBeGreaterThan(-1);
    expect(reviewAction).toContain('min-h-8');
    expect(reviewAction).toContain('whitespace-normal');
    expect(reviewAction).not.toContain('truncate');
  });
});
