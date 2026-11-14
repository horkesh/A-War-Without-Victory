import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Owner playtest R8V2: the object nav row sits behind the review panel while a panel is open
// and its left-most button used to peek out at the panel's edge. jsdom cannot lay this out, so
// pin the CSS contract; the rendered Dayton review screenshots are in the PR.
describe('Dayton room nav while a panel is open', () => {
    const css = readFileSync('src/ui/map/dayton_conference/live.css', 'utf8');
    it('is hidden while the room is inert behind a panel', () => {
        expect(css).toMatch(/\.dayton-live-room\[inert\]\s*>\s*\.dayton-live-nav\s*\{\s*visibility:\s*hidden;/);
    });
    it('is hidden by visibility, not display, so the opener keeps focus restoration', () => {
        expect(css).not.toMatch(/\.dayton-live-room\[inert\][^{]*\{[^}]*display:\s*none/);
    });
});
