/**
 * One-brigade-per-target attack orders (plan: one-brigade-per-target).
 * Legacy SID-based dedup tests removed — the old bot_brigade_ai.ts was deleted.
 * Attack dedup is now enforced by corps directives in bot_corps_ai.ts + bot_brigade_ai_osid.ts.
 * TODO: Add OSID-based dedup tests when test infrastructure supports OSID state fixtures.
 */

import { test } from 'node:test';

test('bot_brigade_attack_dedup: placeholder — legacy SID-based tests removed', () => {
    // Legacy tests targeted the deleted bot_brigade_ai.ts (AoR-based).
    // Attack dedup is now enforced via corps directives (max_attackers_per_target).
});
