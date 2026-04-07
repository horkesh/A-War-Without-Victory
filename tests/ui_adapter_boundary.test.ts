import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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
    // These 7 imports are pure constants, predicates, or display helpers that have no
    // GameState access and cause no state mutation. They are documented here so any
    // FUTURE addition still triggers a failure requiring explicit review.
    const KNOWN_EXCEPTIONS = new Set([
      // Pure constant predicate — no state access
      `\\army_hq\\generateBriefing.ts:  import { isSectorAssignmentExemptCorpsId } from '../../../../sim/combat/corps_front_sectors_constants.js';`,
      // Constant value used for display-only
      `\\army_hq\\OrderInterpretationPanel.tsx:  import { RELIEF_MORALE_PENALTY } from '../../../../sim/combat/order_interpretation.js';`,
      // Pure computation helper — no state
      `\\CommanderSelectionModal.tsx:  import { getPreparationMaxTurns } from '../../../sim/combat/operation_preparation';`,
      // Pure constant predicate — no state access
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
});
