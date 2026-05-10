import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('desktop and roadmap truth docs', () => {
  it('keeps desktop startup docs aligned with the baked apr_1992 artifact path', () => {
    const playbook = readRepoFile('docs', '20_engineering', 'GUI_PLAYBOOK_DESKTOP.md');
    const ipcContract = readRepoFile('docs', '20_engineering', 'DESKTOP_GUI_IPC_CONTRACT.md');

    expect(playbook).toContain('data/derived/startup/apr_1992_initial_save.json');
    expect(playbook).toContain('one-way derived copy of canonical builder truth');
    expect(playbook).not.toContain('apr1992_historical_52w.json');

    expect(ipcContract).toContain('loadStartupSnapshotState(...)');
    expect(ipcContract).toContain('data/derived/startup/apr_1992_initial_save.json');
    expect(ipcContract).toContain('data/scenarios/apr1992_definitive_52w.json');
  });

  it('keeps the roadmap honest about the closed startup residue and replay consumer status', () => {
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');

    expect(roadmap).toContain('The startup-snapshot interference residue is now closed');
    expect(roadmap).toContain('desktop `startNewCampaign(...)` and the Warroom/browser fallback now use the baked `apr_1992` startup snapshot as the primary start-state source');
    expect(roadmap).toContain('RESOLVED 2026-04-16 as a pre-0.9 truth lane');
    expect(roadmap).toContain('loaded-game Warroom entry now stays on the React shell path');
    expect(roadmap).toContain('replay scrubber + deterministic selected-frame summary cards');
    expect(roadmap).toContain('replay scrubber + deterministic selected-frame summary cards + sparse manifest loading');
    expect(roadmap).toContain('replay scrubber + deterministic selected-frame summary cards + sparse manifest loading + selected-frame map inspection');
    expect(roadmap).toContain('| Map That Scars | Complete');
    expect(roadmap).toContain('| Refugee Column | Complete');
    expect(roadmap).toContain('| Corridor Heartbeat | Complete');
    expect(roadmap).toContain('selected-frame map inspection is live');
    expect(roadmap).toContain('replay auto-play/animation polish remains future work');
    expect(roadmap).not.toContain('| Map That Scars | Not started');
    expect(roadmap).not.toContain('| Refugee Column | Not started');
    expect(roadmap).not.toContain('| Corridor Heartbeat | Not started');
    expect(roadmap).not.toContain('richer map-state playback remains future polish');
    expect(roadmap).not.toContain('richer replay-map inspection is still future work');
    expect(roadmap).not.toContain('Current next bounded lane: startup-snapshot proof-path interference');
    expect(roadmap).not.toContain('Warroom React Shell Recovery / Feature Parity** Ã¢â‚¬â€ main desktop entry surface still needs parity/polish');
    expect(roadmap).not.toContain('replay is still absent, tutorial/onboarding is still untouched');
    expect(roadmap).not.toContain('desktop `New Game` birth state is now canonicalized onto the loaded-save contract, but it still boots from full scenario-source init instead of a baked campaign-start snapshot');
  });

  it('keeps the master/canon docs aligned with the 2026-05-10 directive and dispatch closures', () => {
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');
    const fora = readRepoFile('docs', '10_canon', 'FORAWWV.md');
    const systems = readRepoFile('docs', '10_canon', 'Systems_Manual_v0_9_0.md');
    const knowledge = readRepoFile('docs', 'PROJECT_LEDGER_KNOWLEDGE.md');

    expect(roadmap).toContain('**Last Updated:** 2026-05-10');
    expect(roadmap).toContain('Windows fast Vitest runner recovered at `476836e4`');
    expect(roadmap).toContain('war-dispatch displacement window restored at `bc7fcc49`');
    expect(roadmap).toContain('directive metadata shipped at `bbe5a26b`');
    expect(roadmap).toContain('bridge metadata defaults shipped at `be66d1cc`');
    expect(roadmap).toContain('Baseline Regression and Desktop Release Guard green at `750e1c14`');
    expect(roadmap).toContain('Persona suppressor C3 structural fix shipped (`6cebf13e`)');
    expect(roadmap).toContain('Cost Ledger prosecutorial findings shipped 2026-05-10');
    expect(roadmap).toContain('| Cost Ledger | Advanced');
    expect(roadmap).not.toContain('war_dispatches.ts:149` 4-turn rolling window adapt to per-turn-buffer');
    expect(roadmap).not.toContain('full prosecutorial authoring still open');
    expect(roadmap).not.toContain('Persona suppressor C3 structural fix — prune routine op-lifecycle states');

    expect(fora).toContain('PRESIDENT_TO_CANONICAL_DIRECTIVE');
    expect(fora).toContain('magnitude');
    expect(fora).toContain('permission_flags');
    expect(systems).toContain('displacement_recent_by_turn');
    expect(systems).toContain('bounded 4-turn recent displacement cue');
    expect(knowledge).toContain('president_directive_bridge.ts');
    expect(knowledge).toContain('PRESIDENT_TO_CANONICAL_DIRECTIVE');
    expect(knowledge).not.toContain('Reference run_three_commanders.ts `PRESIDENT_TO_CANONICAL` table');
  });

  it('retires the stale scenario-board reds once direct proof has landed', () => {
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');

    expect(roadmap).toContain("This lane's older follow-up board is now retired");
    expect(roadmap).toContain('`unresolved_sector_brigades = 0` and anomaly alignment holds');
    expect(roadmap).toContain('`op:brcko:brka_2` is back under the current hard anchor suite');
    expect(roadmap).toContain('front-edge ownership regressions were closed by dedicated real-save ownership/display proofs');
    expect(roadmap).toContain('renderer-side white-line/Electron visual confirmation');
    expect(roadmap).not.toContain('the remaining live reds are the separate southeast-Herzegovina unresolved-frontline seam, `op:brcko:brka_2` anchor drift, and Fo');
  });

  it('keeps the v0.9.1 plan baseline aligned with already-landed comparison and codex slices', () => {
    const plan = readRepoFile('docs', 'plans', '2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md');
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');
    const bible = readRepoFile('docs', '10_canon', 'Game_Bible_v0_9_0.md');

    expect(plan).toContain('Endgame Comparison` is partially implemented');
    expect(plan).toContain('dynamic essay sections / ghost entries / divergence notes are partially implemented');
    expect(plan).toContain('Cost Ledger findings through deterministic atoms/tokens');
    expect(plan).toContain('`VerdictScreen` now renders deterministic milestone comparison rows');
    expect(plan).toContain('historical_baseline.json` now authors the first milestone rows for Srebrenica and Dayton');
    expect(plan).toContain('Codex resolver now supports deterministic `MILESTONE:<id>[:status]` atoms');
    expect(plan).toContain('optional `milestone_comparison` row contract');
    expect(plan).toContain('`dynamic_sections`, `ghost_when`');
    expect(roadmap).toContain('Cost Ledger finding atoms/tokens');
    expect(roadmap).toContain('milestone atoms/tokens');
    expect(roadmap).toContain('Srebrenica/Dayton milestone-week comparison rows live');
    expect(roadmap).toContain('| Endgame Comparison | Advanced');
    expect(bible).toContain('Dynamic Codex may also render source-labeled Cost Ledger findings');
    expect(bible).toContain('milestone comparison rows inside historical essays');
    expect(bible).toContain('VerdictScreen` may render milestone comparison rows');
    expect(bible).toContain('the first authored baseline rows are Srebrenica and Dayton');
    expect(plan).not.toContain('Endgame Comparison` is not implemented');
    expect(plan).not.toContain('dynamic essay sections / ghost entries / divergence notes are not implemented');
    expect(roadmap).not.toContain('richer milestone-week comparison UX still open');
    expect(roadmap).not.toContain('richer authored milestone data still open');
  });
});
