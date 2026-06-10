// @vitest-environment jsdom
/**
 * EventModal effect-display filter.
 *
 * Once `consequences.json` joined the modal def-loader (so `csq_*` notification
 * stills resolve), the modal began enriching fired events with consequence
 * `effects` — which include engine/audit-only kinds (recruitment_modifier,
 * cost_ledger_annotation, etc.) that have no curated label and would render as
 * raw machine names or long ledger text in the Intelligence Assessment box.
 * `NON_DISPLAY_EFFECT_KINDS` filters those out; genuinely player-facing state
 * changes (morale/supply/cohesion/…) still render.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { EventModal, type EventDisplayData } from '../../src/ui/map/components/EventModal';

const EVENT: EventDisplayData = {
    id: 'csq_industrial_conscription_wave',
    title: 'Industrial Conscription Wave',
    narrative: 'The factories empty as the call-up widens.',
    category: 'military',
    effects: [
        { kind: 'morale_change', description: 'RBiH morale -1' },
        { kind: 'recruitment_modifier', description: 'recruitment_modifier' },
        { kind: 'cost_ledger_annotation', description: 'An audit annotation that should never reach the player.' },
        { kind: 'equipment_quality_modifier', description: 'equipment_quality_modifier' },
    ],
    isDecision: false,
};

describe('EventModal engine/audit effect filter', () => {
    it('hides engine/audit-only effect kinds and keeps player-facing ones', () => {
        const { unmount } = render(createElement(EventModal, { event: EVENT, onAcknowledge: vi.fn() }));
        const html = document.body.innerHTML;

        // Player-facing state change is shown.
        expect(html).toContain('morale');
        // Engine/audit kinds are filtered out (no raw labels, no audit ledger text).
        expect(html).not.toContain('recruitment_modifier');
        expect(html).not.toContain('equipment_quality_modifier');
        expect(html).not.toContain('audit annotation that should never reach the player');
        unmount();
    });

    it('still renders the modal when every effect is filtered out', () => {
        const allAudit: EventDisplayData = {
            ...EVENT,
            effects: [
                { kind: 'recruitment_modifier', description: 'recruitment_modifier' },
                { kind: 'bot_priority_shift', description: 'bot_priority_shift' },
            ],
        };
        const { unmount } = render(createElement(EventModal, { event: allAudit, onAcknowledge: vi.fn() }));
        // Modal still mounts with its title/narrative (no crash on an empty effect list).
        expect(screen.getByRole('dialog', { name: 'Industrial Conscription Wave' })).toBeTruthy();
        expect(document.body.innerHTML).not.toContain('recruitment_modifier');
        unmount();
    });
});
