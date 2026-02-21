/**
 * Phase E0.1 guard: roadmap-aligned Phase E (Spatial & Interaction Systems) directive.
 * Runtime guardrail: Phase E modules must not reference negotiation, end_state,
 * enforcement, or termination (Phase O scope); fail fast if found.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Forbidden phase-name substrings in Phase E modules (Phase O — Negotiation & End-State is out of scope). */
const PHASE_E_FORBIDDEN_SUBSTRINGS = [
    'negotiation',
    'end_state',
    'enforcement',
    'termination'
] as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHASE_E_DIR = resolve(__dirname);

/**
 * Scans all .ts files under src/sim/phase_e/ (excluding this guard file) for forbidden
 * phase-name references. Throws if any file contains them (dev-only safety rail).
 */
export function assertPhaseENoNegotiationOrEndState(): void {
    const files = readdirSync(PHASE_E_DIR, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.endsWith('.ts') && d.name !== 'phase_e0_1_guard.ts');
    for (const d of files) {
        const path = join(PHASE_E_DIR, d.name);
        const content = readFileSync(path, 'utf8');
        for (const sub of PHASE_E_FORBIDDEN_SUBSTRINGS) {
            if (content.includes(sub)) {
                throw new Error(
                    `Phase E module must not reference "${sub}": ${d.name}. ` +
                    'Phase E = Spatial & Interaction only. Negotiation/end-state/enforcement/termination are Phase O (out of scope).'
                );
            }
        }
    }
}

// Run guardrail at module load so any import of this guard enforces the rule.
assertPhaseENoNegotiationOrEndState();
