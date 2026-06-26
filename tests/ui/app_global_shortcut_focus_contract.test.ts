// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isInteractiveElement,
  isKeyboardEventFromInteractiveControl,
} from '../../src/ui/map/utils/interactiveFocus.js';

describe('App global shortcut focus contract', () => {
  it('treats buttons, tabs, menu items, links, inputs, and contenteditable as interactive focus targets', () => {
    document.body.innerHTML = `
      <button id="button">Command</button>
      <div id="tab" role="tab" tabindex="0">Summary</div>
      <div id="menuitem" role="menuitem" tabindex="0">Open</div>
      <a id="link" href="#">Records</a>
      <input id="input" />
      <div id="editable" contenteditable="true">note</div>
    `;

    for (const id of ['button', 'tab', 'menuitem', 'link', 'input', 'editable']) {
      const element = document.getElementById(id);
      expect(isInteractiveElement(element)).toBe(true);
      const event = new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: element });
      expect(isKeyboardEventFromInteractiveControl(event)).toBe(true);
    }
  });

  it('wires App global shortcuts through the same interactive-focus guard as map shortcuts', () => {
    const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
    const shortcutSource = readFileSync('src/ui/map/hooks/useKeyboardShortcuts.ts', 'utf8');

    expect(appSource).toContain("from './utils/interactiveFocus'");
    expect(appSource).toContain('if (isKeyboardEventFromInteractiveControl(e)) return;');
    expect(shortcutSource).toContain("from '../utils/interactiveFocus'");
    expect(shortcutSource).toContain('if (isFocusInInteractiveControl()) return;');
  });
});
