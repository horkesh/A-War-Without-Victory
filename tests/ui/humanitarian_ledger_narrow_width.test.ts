/**
 * Rider on Ledger lines 1-2 (orchestrator, 2026-11-24): at 400px the four-column "Controlling or
 * besieging side" table outgrew the Ledger's scroll body by 6px. Its figures cannot wrap, so the table
 * scrolls inside its own overflow-x-auto box and the panel never scrolls sideways. Rendered evidence:
 * coordination evidence/s6_ledger12_20261124/rider_*.jpg. This guard keeps the box and forbids nowrap.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(join(process.cwd(), 'src/ui/map/components/HumanitarianLedgerPanel.tsx'), 'utf8');

describe('Humanitarian Ledger at narrow width', () => {
    it('the by-side table scrolls inside its own box', () => {
        const box = SRC.indexOf('data-testid="humanitarian-ledger-side-table" className="overflow-x-auto"');
        const header = SRC.indexOf("t('humanitarianLedger.col.perpetrator')");
        expect(box).toBeGreaterThan(-1);
        expect(header).toBeGreaterThan(box);
        expect(SRC.indexOf('<table', box)).toBeLessThan(header);
    });

    it('no Ledger text is forced onto one line', () => {
        expect(SRC).not.toMatch(/whitespace-nowrap|white-space:\s*nowrap|\bnowrap\b/);
    });
});
