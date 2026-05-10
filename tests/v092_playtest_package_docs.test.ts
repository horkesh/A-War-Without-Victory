import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const PLAYTEST_DIR = join(ROOT, 'docs', 'playtesting', 'v092');

function readPlaytestDoc(name: string): string {
    return readFileSync(join(PLAYTEST_DIR, name), 'utf8');
}

describe('v0.9.2 playtest package docs', () => {
    it('ships the complete operator-deployable document set', () => {
        const requiredDocs = [
            'feedback_form_schema.md',
            'playtest_runbook.md',
            'recruitment_messages.md',
            'tester_quickstart.md',
            'known_issues_template.md',
            'triage_board.md',
            'weekly_digest_template.md',
        ];

        for (const doc of requiredDocs) {
            expect(existsSync(join(PLAYTEST_DIR, doc)), `${doc} should exist`).toBe(true);
        }
    });

    it('keeps the tester quickstart actionable without repo context', () => {
        const quickstart = readPlaytestDoc('tester_quickstart.md');

        expect(quickstart).toContain('Start with the 40-week scenario');
        expect(quickstart).toContain('What To Send Back');
        expect(quickstart).toContain('Crash, freeze, or save/load failure');
        expect(quickstart).toContain('[build link]');
        expect(quickstart).toContain('[feedback form link]');
    });

    it('keeps operator triage ready for weekly feedback cycles', () => {
        const triage = readPlaytestDoc('triage_board.md');
        const digest = readPlaytestDoc('weekly_digest_template.md');
        const knownIssues = readPlaytestDoc('known_issues_template.md');

        expect(triage).toContain('Intake');
        expect(triage).toContain('Canon review');
        expect(triage).toContain('Ready for fix');
        expect(triage).toContain('Release note / response');
        expect(digest).toContain('Top confusion points');
        expect(digest).toContain('Calibration/history flags');
        expect(digest).toContain('Already fixed');
        expect(knownIssues).toContain('Known Rough Edges');
        expect(knownIssues).toContain('Not A Bug');
    });
});
