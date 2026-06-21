// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { SettingsModal } from '../../src/ui/warroom/components/SettingsModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

describe('Warroom Settings modal i18n', () => {
  afterEach(() => {
    setLocale('en', undefined);
    document.body.innerHTML = '';
  });

  it('renders settings chrome through BCS labels', () => {
    setLocale('bcs', undefined);

    const modal = new SettingsModal({ meta: { player_faction: 'RBiH' } }).render();
    document.body.appendChild(modal);

    const copy = document.body.textContent ?? '';
    expect(copy).toContain('Sistemske postavke');
    expect(copy).toContain('Glavna jacina zvuka');
    expect(copy).toContain('CRT linije');
    expect(copy).toContain('Primijeni i zatvori');
    expect(copy).not.toMatch(/SYSTEM SETTINGS|Master Volume|CRT Scanline Effect|APPLY & CLOSE/i);
  });
});
