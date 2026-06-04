import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiAdvisorPanel } from '../../src/ui/map/components/AiAdvisorPanel.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

describe('AiAdvisorPanel product copy', () => {
  it('frames the advisor as Chief-of-Staff counsel, not generic AI', () => {
    setLocale('en');

    const html = renderToStaticMarkup(
      React.createElement(AiAdvisorPanel, {
        response: {
          commander_name: 'Chief of Staff',
          assessment: 'The front can hold for one more turn.',
          recommendations: [
            { priority: 1, action: 'Review reserves', reasoning: 'A weak sector is under pressure.' },
          ],
        },
        onClose: () => {},
      }),
    );

    expect(html).toContain('Chief-of-Staff Counsel');
    expect(html).toContain('Staff assessment');
    expect(html).not.toContain('AI Advisor');
  });
});
