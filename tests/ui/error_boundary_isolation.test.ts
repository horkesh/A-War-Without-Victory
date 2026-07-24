// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { RootErrorBoundary } from '../../src/ui/map/components/RootErrorBoundary.js';
import { createCrashDiagnosticsQueue } from '../../src/ui/map/services/telemetry/telemetryQueue.js';
import { CRASH_DIAGNOSTICS_APP_VERSION } from '../../src/ui/map/services/telemetry/crashCapture.js';

function ThrowingPanel(): never {
  throw new Error('right rail render failed');
}

function Zone({ testId, children }: { testId: string; children?: ReactNode }) {
  return createElement('section', { 'data-testid': testId }, children);
}

describe('RootErrorBoundary panel isolation', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('contains a right rail render error without blanking the map, sidebar, or toolbar zones', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(createElement('div', null,
      createElement(Zone, { testId: 'map-zone' }, 'Map remains mounted'),
      createElement(Zone, { testId: 'sidebar-zone' }, 'Sidebar remains mounted'),
      createElement(Zone, { testId: 'toolbar-zone' }, 'Toolbar remains mounted'),
      createElement(RootErrorBoundary, { zone: 'right panel' },
        createElement(ThrowingPanel),
      ),
    ));

    expect(screen.getByTestId('map-zone').textContent).toContain('Map remains mounted');
    expect(screen.getByTestId('sidebar-zone').textContent).toContain('Sidebar remains mounted');
    expect(screen.getByTestId('toolbar-zone').textContent).toContain('Toolbar remains mounted');
    expect(screen.getByRole('status', { name: /right panel unavailable/i }).textContent)
      .toContain('Right panel unavailable');
    expect(screen.getByRole('status', { name: /right panel unavailable/i }).textContent)
      .toContain('Open another panel or reload the map.');
  });

  it('records localized boundary crashes in the opt-in diagnostics queue', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const queue = createCrashDiagnosticsQueue({ storage: window.localStorage, sessionId: 'boundary-session' });
    queue.setConsentEnabled(true);

    render(createElement(RootErrorBoundary, { zone: 'army hq' },
      createElement(ThrowingPanel),
    ));

    expect(queue.listReports()).toMatchObject([
      {
        schemaVersion: 1,
        appVersion: CRASH_DIAGNOSTICS_APP_VERSION,
        platform: 'browser',
        osFamily: expect.any(String),
        uiSurface: 'army hq',
        errorCategory: 'unhandled_error',
        sequence: 1,
      },
    ]);
    expect(queue.listReports()[0]?.sessionId).toEqual(expect.any(String));
    expect(queue.listReports()[0]?.redactedStack).toContain('right rail render failed');
  });

  it('App wraps the tactical detail rail in a localized boundary instead of relying on a root-only catch', () => {
    const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');

    expect(appSource).toContain("import { RootErrorBoundary } from './components/RootErrorBoundary';");
    expect(appSource).toMatch(
      /<RootErrorBoundary zone="right panel">[\s\S]*railState\.panel[\s\S]*<\/RootErrorBoundary>/,
    );
    expect(appSource).toMatch(/<RootErrorBoundary zone="map">[\s\S]*<MapContainer \/>[\s\S]*<\/RootErrorBoundary>/);
    expect(appSource).toMatch(/<RootErrorBoundary zone="toolbar">[\s\S]*<PresidentialToolbar/);
    expect(appSource).toMatch(/<RootErrorBoundary zone="sidebar">[\s\S]*<OOBSidebar \/>[\s\S]*<\/RootErrorBoundary>/);
  });

  it('App wraps heavyweight modal panels in localized boundaries', () => {
    const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
    const armyHqSource = readFileSync('src/ui/map/components/army_hq/ArmyHQModal.tsx', 'utf8');

    expect(appSource).toMatch(/<RootErrorBoundary zone="army hq">[\s\S]*<ArmyHQModal[\s\S]*?\/>[\s\S]*<\/RootErrorBoundary>/);
    expect(appSource).not.toContain("import { OpsPlanningModal }");
    expect(appSource).not.toContain('<OpsPlanningModal />');
    expect(armyHqSource).not.toContain('PresidentialDecisionRoomPanel');
    expect(armyHqSource).toContain('data-testid="army-hq-decision-room-handoff"');
    expect(armyHqSource).toMatch(/<RootErrorBoundary zone="presidential decisions">[\s\S]*<PresidentialAttentionPanel[\s\S]*<\/RootErrorBoundary>/);
  });
});
