import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const warroomSource = readFileSync('src/ui/warroom/warroom.ts', 'utf8');
const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
const profilerSource = readFileSync('tools/ui/map_transition_profile.cjs', 'utf8');

function method(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `${startMarker} must exist`).toBeGreaterThanOrEqual(0);
  expect(end, `${endMarker} must follow ${startMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Warroom tactical shell document lifecycle', () => {
  it('uses one deterministic canonical document for every operational shell entry', () => {
    expect(warroomSource).toContain("const OPERATIONAL_SHELL_DOCUMENT = 'index.html?embedded=1&view=warroom';");
    expect(warroomSource).not.toMatch(/Date\.now\(|Math\.random\(|cacheBuster/);
    expect(warroomSource).not.toContain('intro=war_start');

    const ensureShell = method(
      warroomSource,
      'private async ensureOperationalShellIframe',
      'private async ensureSandboxIframe',
    );
    expect(ensureShell).toContain('OPERATIONAL_SHELL_DOCUMENT');
    expect(ensureShell).toContain('iframe.src = shellUrl;');
    expect(warroomSource).not.toContain('this.tacticalMapIframe.src =');
  });

  it('uses the shared handoff protocol for operational map requests and HQ return', () => {
    const toolbar = method(warroomSource, 'private wireToolbar()', '/** Update the toolbar turn display');
    expect(toolbar).toContain("void this.openTacticalShellHandoff({ kind: 'war-map' });");
    expect(toolbar).not.toContain("showTacticalMapScene('operational')");

    const handoff = method(
      warroomSource,
      'private async openTacticalShellHandoff',
      'private flushPendingShellHandoff',
    );
    expect(handoff).toContain("await this.showTacticalMapScene('warroom');");
    expect(handoff).toContain("type: 'awwv-shell:handoff'");

    const returnToShell = method(
      warroomSource,
      'private async returnToOperationalWarroomShell',
      'private async showTacticalMapScene',
    );
    expect(returnToShell).toContain("type: 'awwv-shell:show-warroom'");
    expect(returnToShell).toContain("await this.showTacticalMapScene('warroom');");
  });

  it('keeps sandbox in a separate iframe and never replaces the operational document', () => {
    expect(warroomSource).toContain("const SANDBOX_DOCUMENT = 'tactical_sandbox.html?embedded=1&desktop_window=sandbox';");
    expect(warroomSource).toContain('private tacticalSandboxIframe: HTMLIFrameElement | null = null;');

    const ensureSandbox = method(
      warroomSource,
      'private async ensureSandboxIframe',
      'private async showTacticalMapScene',
    );
    expect(ensureSandbox).toContain('SANDBOX_DOCUMENT');
    expect(ensureSandbox).toContain('this.tacticalSandboxIframe = iframe;');
    expect(ensureSandbox).not.toContain('this.tacticalMapIframe = iframe;');
  });

  it('uses messages for campaign reset and validates the cross-origin frame boundary', () => {
    expect(warroomSource).toContain("type: 'awwv-shell:fresh-campaign-started'");
    expect(warroomSource).toContain('private isTrustedTacticalFrameMessage(event: MessageEvent): boolean');
    expect(warroomSource).not.toContain('iframeWindow.document');
    expect(warroomSource).not.toContain('contentWindow.document');
    expect(appSource).toContain('if (window.parent !== window && event.source !== window.parent) return;');
  });

  it('profiles the canonical document from creation instead of reassigning iframe.src', () => {
    const startCampaign = method(profilerSource, 'async function startCleanCampaign(page)', 'async function readCurrentTurn');
    expect(startCampaign).toContain("next.searchParams.set('profile_map_transition', '1');");
    expect(startCampaign).toContain('window.history.replaceState');
    expect(startCampaign).not.toContain('iframe.src =');
  });
});
