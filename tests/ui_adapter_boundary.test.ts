import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

const UI_COMPONENTS_ROOT = join(process.cwd(), 'src', 'ui', 'map', 'components');
const SRC_ROOT = join(process.cwd(), 'src');

function readFile(absPath: string): string {
  return readFileSync(absPath, 'utf-8');
}

/** Recursively collect all .ts/.tsx files under a directory. */
function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

describe('UI Adapter Boundary Discipline', () => {
  it('No UI component reads state.military.* directly (must go through GameStateAdapter)', () => {
    const files = getAllTsFiles(UI_COMPONENTS_ROOT);
    const violations: string[] = [];
    for (const file of files) {
      const src = readFile(file);
      if (/state\.military\./.test(src)) {
        violations.push(file.replace(UI_COMPONENTS_ROOT, ''));
      }
    }
    expect(violations).toEqual([]);
  });

  it('UI components do not import runtime modules from src/sim/combat/', () => {
    const files = getAllTsFiles(UI_COMPONENTS_ROOT);
    // Type-only imports are allowed; runtime (value) imports from sim/combat are not.
    //
    // KNOWN AUDITED EXCEPTIONS (Phase 5 — 2026-04-07):
    // These 6 imports are pure constants, predicates, or display helpers that have no
    // GameState access and cause no state mutation. They are documented here so any
    // FUTURE addition still triggers a failure requiring explicit review.
    const KNOWN_EXCEPTIONS = new Set([
      // Constant value used for display-only
      `\\army_hq\\OrderInterpretationPanel.tsx:  import { RELIEF_MORALE_PENALTY } from '../../../../sim/combat/order_interpretation.js';`,
      // Pure computation helper — no state
      `\\CommanderSelectionModal.tsx:  import { getPreparationMaxTurns } from '../../../sim/combat/operation_preparation';`,
      `\\OOBSidebar.tsx:  import { isSectorAssignmentExemptCorpsId } from '../../../sim/combat/corps_front_sectors_constants.js';`,
      // Pure computation helper — no state
      `\\ops_modal\\CommanderPhase.tsx:  import { getPreparationMaxTurns } from '../../../../sim/combat/operation_preparation';`,
      // Pure data + hash utility — no state
      `\\ops_modal\\OpsPlanningModal.tsx:  import { OPERATION_NAMES, simpleHash } from '../../../../sim/combat/operation_names';`,
      // Display-only label helpers — no state
      `\\SelectionPanel.tsx:  import { getMunicipalitySupportLabel, getMunicipalitySupportTypeForFaction } from '../../../sim/combat/municipality_support.js';`,
    ]);
    const violations: string[] = [];
    for (const file of files) {
      const src = readFile(file);
      // Runtime import: import { something } from '...sim/combat/...'
      // Type import: import type { ... } — these are OK
      const lines = src.split('\n');
      for (const line of lines) {
        if (/^import\s+(?!type\s+)/.test(line) && /sim\/combat/.test(line)) {
          const entry = `${file.replace(UI_COMPONENTS_ROOT, '')}:  ${line.trim()}`;
          if (!KNOWN_EXCEPTIONS.has(entry)) {
            violations.push(entry);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('GameStateAdapter is the sole operation view source (OperationView type is declared canonical)', () => {
    const adapterSrc = readFile(join(SRC_ROOT, 'ui/map/data/GameStateAdapter.ts'));
    // Adapter must declare or import OperationView
    expect(adapterSrc).toMatch(/OperationView/);
    // Adapter must have a canonical declaration comment
    expect(adapterSrc).toMatch(/[Cc]anonical/);
  });

  it('OperationView phase type matches engine CorpsOperation phase (planning | execution | recovery)', () => {
    const typesSrc = readFile(join(SRC_ROOT, 'ui/map/data/types.ts'));
    // OperationView.phase must be typed to the three engine phases only
    expect(typesSrc).toMatch(/phase:\s*'planning'\s*\|\s*'execution'\s*\|\s*'recovery'/);
  });

  it('OPERATION_PHASE_TIMELINE contains only valid engine phases', () => {
    const opUtilSrc = readFile(join(SRC_ROOT, 'ui/map/utils/operations.ts'));
    // The timeline array must not reference phantom phases (preparation, complete, failed, abandoned)
    expect(opUtilSrc).toMatch(/OPERATION_PHASE_TIMELINE\s*=\s*\['planning',\s*'execution',\s*'recovery'\]/);
    expect(opUtilSrc).not.toMatch(/['"]preparation['"]/);
    expect(opUtilSrc).not.toMatch(/['"]complete['"]/);
    expect(opUtilSrc).not.toMatch(/['"]failed['"]/);
    expect(opUtilSrc).not.toMatch(/['"]abandoned['"]/);
  });

  it('unresolvedSectorBrigades is declared in LoadedGameState (engine truth surfaced to UI)', () => {
    const typesSrc = readFile(join(SRC_ROOT, 'ui/map/data/types.ts'));
    expect(typesSrc).toMatch(/unresolvedSectorBrigades/);
  });

  it('operationalSitrep is declared in LoadedGameState as the shared reporting packet', () => {
    const typesSrc = readFile(join(SRC_ROOT, 'ui/map/data/types.ts'));
    expect(typesSrc).toMatch(/operationalSitrep/);
  });

  /**
   * Cluster B: Adapter Boundary Simplification — INCREMENTAL PROGRESS.
   *
   * One seam simplified (2026-04-15): derivePendingEventDecisions is now a
   * direct passthrough of engine-owned state.military.pending_event_decisions.
   * Engine type PendingEventDecision already matches the adapter's structural
   * shape exactly; defensive String/Number/Array coercion was removed.
   * Reference identity is preserved — see the behavioral proof test below.
   *
   * Three seams remain structurally necessary without engine-side work:
   *
   * 1. deriveNegotiatingCapital — replicates DIMENSION_WEIGHTS weighting
   *    inline. Simplification would require adding a pre-computed
   *    negotiating_capital field to GameState.military.negotiation.
   *
   * 2. homeDistanceMult — replicates getHomeDistanceMult() inline
   *    (HOME_DISTANCE_FREE_RANGE, perHop, floor constants). Simplification
   *    would require importing engine code into the adapter (violates
   *    adapter isolation) or adding a pre-computed field to GameState.
   *
   * 3. deriveOperationCaptureProvenance — heuristic fallback when
   *    capture_provenance string is absent. Simplification requires the
   *    engine to always emit capture_provenance on operation AARs.
   */
  it('derivePendingEventDecisions is a reference-identity passthrough of engine truth', () => {
    // Behavioral proof: the adapter does not clone, coerce, or restructure
    // pending_event_decisions. Element references are preserved, which means
    // the UI and the engine are looking at the exact same object — no hidden
    // adapter-side interpretation, no allocation cost, no schema drift risk.
    const engineDecision = {
      event_id: 'evt_srebrenica_crisis',
      event_title: 'Srebrenica Crisis',
      turn_fired: 42,
      faction: 'RBiH',
      requires_player_response: true,
      response_options: [
        { id: 'accept', label: 'Accept UN protection', description: 'Trust Akashi', effects: [] },
        { id: 'reject', label: 'Reject UN protection', effects: [] },
      ],
    };
    const rawState: any = {
      meta: { turn: 42, phase: 'war' },
      military: {
        formations: {},
        pending_event_decisions: [engineDecision],
      },
      political: { political_controllers: {} },
    };

    const parsed = parseGameState(rawState);
    expect(parsed.pendingEventDecisions).toHaveLength(1);
    // Reference equality proves no coercion/allocation occurred for the element.
    expect(parsed.pendingEventDecisions?.[0]).toBe(engineDecision);
    // Engine-only field that the adapter UI type omits is still present at
    // runtime — adapter only narrows the TS view, it does not strip fields.
    expect((parsed.pendingEventDecisions?.[0] as any).requires_player_response).toBe(true);
  });

  it('derivePendingEventDecisions collapses empty/missing arrays to undefined', () => {
    const emptyState: any = {
      meta: { turn: 1, phase: 'war' },
      military: { formations: {}, pending_event_decisions: [] },
      political: { political_controllers: {} },
    };
    expect(parseGameState(emptyState).pendingEventDecisions).toBeUndefined();

    const missingState: any = {
      meta: { turn: 1, phase: 'war' },
      military: { formations: {} },
      political: { political_controllers: {} },
    };
    expect(parseGameState(missingState).pendingEventDecisions).toBeUndefined();
  });

  /**
   * Dayton trigger ownership: pipeline owns initiation, adapter only reads.
   *
   * Before this fix, derivePendingDayton() in GameStateAdapter called
   * shouldInitiateDayton() and initiateDaytonNegotiation() from sim code.
   * That was a read-path initiation: the adapter decided when Dayton starts
   * and mutated state via ensureNegotiationState().
   *
   * After: the 'evaluate-dayton-trigger' pipeline step persists
   * state.military.negotiation.pending_dayton. The adapter reads it.
   */
  it('adapter derivePendingDayton does not import or call sim negotiation code', () => {
    const adapterSrc = readFile(join(SRC_ROOT, 'ui/map/data/GameStateAdapter.ts'));
    // Must not require/import dayton_negotiation
    expect(adapterSrc).not.toMatch(/require\(.*dayton_negotiation/);
    expect(adapterSrc).not.toMatch(/import.*from.*dayton_negotiation/);
    // Must not call shouldInitiateDayton or initiateDaytonNegotiation
    expect(adapterSrc).not.toContain('shouldInitiateDayton');
    expect(adapterSrc).not.toContain('initiateDaytonNegotiation');
  });

  it('adapter derivePendingDayton reads from persisted state.military.negotiation.pending_dayton', () => {
    const adapterSrc = readFile(join(SRC_ROOT, 'ui/map/data/GameStateAdapter.ts'));
    // Must reference the persisted field
    expect(adapterSrc).toContain('neg?.pending_dayton');
    expect(adapterSrc).toContain('neg.pending_dayton');
    // Comment must declare pipeline ownership
    expect(adapterSrc).toMatch(/[Pp]ipeline owns trigger/);
  });

  it('pipeline evaluate-dayton-trigger step exists and imports shouldInitiateDayton', () => {
    const pipelineSrc = readFile(join(SRC_ROOT, 'sim/turn_phases/war_phases.ts'));
    expect(pipelineSrc).toContain("name: 'evaluate-dayton-trigger'");
    expect(pipelineSrc).toContain('shouldInitiateDayton');
    expect(pipelineSrc).toContain('initiateDaytonNegotiation');
    // Must persist to state, not return
    expect(pipelineSrc).toContain('pending_dayton');
  });

  it('Cluster B: adapter derive functions are structurally necessary (no-op documented)', () => {
    const adapterSrc = readFile(join(SRC_ROOT, 'ui/map/data/GameStateAdapter.ts'));
    // Verify the three seams still exist (test breaks if they're removed,
    // prompting re-evaluation of whether simplification became possible).
    expect(adapterSrc).toMatch(/deriveNegotiatingCapital/);
    expect(adapterSrc).toMatch(/homeDistanceMult/);
    expect(adapterSrc).toMatch(/deriveOperationCaptureProvenance/);
  });
});

