/**
 * D7 defect #8 — BottomStatusStrip duplicate "DEFENSE" label.
 *
 * The bottom-bar map-mode pills are sourced from `MAP_MODES` and split into
 * primary (rendered always) vs secondary (rendered when +MORE is expanded).
 * Every map-mode label must appear at most once in the union of the two
 * rendered sets — no label may appear in both primary and secondary, and no
 * label may appear twice within either bucket.
 *
 * Source plan: docs/plans/2026-05-16-gui-playtest-defects-plan.md track D7.
 * Source report: docs/40_reports/playtest/GUI_PLAYTEST_2026-05-16.md defect #8.
 */
import { describe, expect, it } from 'vitest';
import { t } from '../../src/ui/map/i18n/index.js';
import { MAP_MODES } from '../../src/ui/map/utils/mapModes.js';

const PRIMARY_MODES = ['political', 'ethnic', 'supply', 'operations'] as const;
const primaryModes = MAP_MODES.filter((m) => (PRIMARY_MODES as readonly string[]).includes(m.id));
const secondaryModes = MAP_MODES.filter((m) => !(PRIMARY_MODES as readonly string[]).includes(m.id));

describe('BottomStatusStrip map mode labels (playtest defect #8)', () => {
    it('contains each map mode id exactly once across primary + secondary', () => {
        const ids = [...primaryModes, ...secondaryModes].map((m) => m.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it('contains each localized rendered label exactly once across primary + secondary', () => {
        const entries = [...primaryModes, ...secondaryModes];
        const labelKeys = entries.map((m) => m.labelKey);
        const uniqueKeys = new Set(labelKeys);
        expect(uniqueKeys.size).toBe(labelKeys.length);

        for (const locale of ['en', 'bcs'] as const) {
            const labels = entries.map((m) => t(m.labelKey, undefined, locale));
            const uniqueLabels = new Set(labels);
            expect(uniqueLabels.size).toBe(labels.length);
        }
    });

    it('does not place any mode in both primary and secondary buckets', () => {
        const primaryIds = new Set(primaryModes.map((m) => m.id));
        for (const m of secondaryModes) {
            expect(primaryIds.has(m.id)).toBe(false);
        }
    });
});
