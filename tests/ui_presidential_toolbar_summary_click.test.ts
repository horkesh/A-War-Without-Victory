import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('presidential toolbar summary action', () => {
  it('does not pass the React click event as a summary focus section', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    const toolbarStart = source.indexOf('<PresidentialToolbar');
    const toolbarEnd = source.indexOf('/>', toolbarStart);
    const toolbarProps = source.slice(toolbarStart, toolbarEnd);

    expect(toolbarProps).toContain('onOpenSummary={() => openSummary()}');
    expect(toolbarProps).not.toContain('onOpenSummary={openSummary}');
  });
});
