/**
 * Phase E0.1: Roadmap alignment tests.
 * - PHASE_E_DIRECTIVE_SPATIAL_v1.md exists.
 * - It contains the exact Phase E title "Phase E — Spatial & Interaction Systems".
 * - It contains explicit prohibition of negotiation/end-state work in Phase E.
 */

import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const DIRECTIVE_PATH = resolve('docs/PHASE_E_DIRECTIVE_SPATIAL_v1.md');
const PHASE_E_TITLE = 'Phase E — Spatial & Interaction Systems';

test('Phase E0.1: docs/PHASE_E_DIRECTIVE_SPATIAL_v1.md exists', () => {
    assert.ok(existsSync(DIRECTIVE_PATH), 'PHASE_E_DIRECTIVE_SPATIAL_v1.md must exist');
});

test('Phase E0.1: directive contains exact Phase E title', () => {
    const content = readFileSync(DIRECTIVE_PATH, 'utf8');
    assert.ok(
        content.includes(PHASE_E_TITLE),
        `Directive must contain "${PHASE_E_TITLE}"`
    );
});

test('Phase E0.1: directive contains explicit prohibition of negotiation/end-state in Phase E', () => {
    const content = readFileSync(DIRECTIVE_PATH, 'utf8');
    const hasProhibition =
        (content.includes('DO NOT implement negotiation') || content.includes('do not implement negotiation')) &&
        (content.includes('end-state') || content.includes('end_state'));
    assert.ok(
        hasProhibition,
        'Directive must explicitly prohibit negotiation and end-state work in Phase E'
    );
});
