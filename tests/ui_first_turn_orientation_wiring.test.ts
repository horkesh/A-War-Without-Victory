/**
 * Wiring test for the NIGHTSHIFT-G2 first-turn orientation card.
 *
 * Verifies:
 *  - The pure read-model lives at src/ui/map/data/firstTurnOrientation.ts and
 *    is determinism-clean (no Date / Math.random / locale).
 *  - The component lives at src/ui/map/components/FirstTurnOrientationCard.tsx
 *    and routes through canonical shellNavigation helpers — does NOT touch
 *    Decision Room / Pre-Advance / Warroom files.
 *  - App.tsx mounts the card (and only App.tsx — no Warroom shell mount).
 *  - The localStorage key is `awwv_seen_first_turn_intro`.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('first-turn orientation wiring', () => {
  it('keeps the read-model pure and deterministic', () => {
    const model = read('../src/ui/map/data/firstTurnOrientation.ts');
    expect(model).toContain('buildFirstTurnOrientation');
    expect(model).toContain('hasSeenIntro');
    expect(model).not.toContain('Math.random');
    expect(model).not.toContain('Date.now');
    expect(model).not.toContain('new Date');
    expect(model).not.toContain('performance.now');
    expect(model).not.toContain('crypto.randomUUID');
    expect(model).not.toContain('localeCompare');
    // Pure read-model — must not import IPC / engine modules.
    expect(model).not.toMatch(/from ['"].*src\/sim\//);
    expect(model).not.toMatch(/from ['"].*\/desktop\//);
  });

  it('component routes through canonical shellNavigation helpers and selection-clearing', () => {
    const cmp = read('../src/ui/map/components/FirstTurnOrientationCard.tsx');
    // Chronicle and Codex go through canonical shellNavigation helpers.
    expect(cmp).toContain('openChronicle');
    expect(cmp).toContain('openCodex');
    // Inbox surface = default tactical rail panel; revealed by clearing selections
    // (mirrors openInboxHome in App.tsx). Advance Turn = warroom advance-turn handoff.
    expect(cmp).toContain('setSelectedOsid');
    expect(cmp).toContain('setAdvanceTurnPending');
    // Persistence: documents the localStorage flag.
    expect(cmp).toContain('awwv_seen_first_turn_intro');
    // STOP-GATE: must NOT touch Decision Room / Pre-Advance / Warroom data files.
    expect(cmp).not.toContain('presidentialDecisionRoom');
    expect(cmp).not.toContain('preAdvanceCommandReview');
    expect(cmp).not.toContain('warroomPriorityDocket');
    // Determinism in pure render.
    expect(cmp).not.toContain('Math.random');
    expect(cmp).not.toContain('Date.now');
  });

  it('App.tsx mounts the orientation card and reads localStorage', () => {
    const app = read('../src/ui/map/App.tsx');
    expect(app).toContain('FirstTurnOrientationCard');
    expect(app).toContain('buildFirstTurnOrientation');
    // App imports the canonical storage-key constant from the component module.
    expect(app).toContain('FIRST_TURN_INTRO_STORAGE_KEY');
    // App reads the storage flag on mount inside an effect, not pure render.
    expect(app).toContain('localStorage');
  });

  it('Warroom shell does NOT mount the orientation card (App.tsx only)', () => {
    const warroomShell = read('../src/ui/map/components/warroom/WarroomShellLayer.tsx');
    expect(warroomShell).not.toContain('FirstTurnOrientationCard');
    expect(warroomShell).not.toContain('buildFirstTurnOrientation');
  });
});
