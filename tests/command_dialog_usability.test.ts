// @vitest-environment jsdom
import { createElement as h } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useDialogFocus } from '../src/ui/shared/Modal';
function Dialog({open}:{open:boolean}) {
 const focus = useDialogFocus(open);
 return open ? h('div',{ref:focus.ref,onKeyDown:focus.onKeyDown,role:'dialog',tabIndex:-1},h('button',{},'First'),h('button',{},'Last')) : null;
}
it('custom HQ-style dialogs focus, contain tab traversal and return focus on close', () => {
 const origin = document.createElement('button'); document.body.append(origin); origin.focus();
 const view=render(h(Dialog,{open:true})); expect(document.activeElement?.textContent).toBe('First');
 fireEvent.keyDown(document.activeElement!,{key:'Tab',shiftKey:true}); expect(document.activeElement?.textContent).toBe('Last');
 view.rerender(h(Dialog,{open:false})); expect(document.activeElement).toBe(origin); view.unmount();origin.remove();
});
vi.mock('../src/ui/map/components/army_hq/WarSummaryContent',()=>({WarSummaryContent:()=>h('div',{},'Summary')}));
import { WarSummaryModal } from '../src/ui/map/components/WarSummaryModal';
it('names the War Summary close control',()=>{
 const view=render(h(WarSummaryModal,{isOpen:true,onClose:vi.fn()}));
 expect(view.getByRole('button',{name:'Close war summary'})).toBeTruthy();view.unmount();
});
function DisclosureDialog() {
 const focus = useDialogFocus(true);
 return h('div',{ref:focus.ref,onKeyDown:focus.onKeyDown,role:'dialog',tabIndex:-1},h('button',{},'First command'),h('details',{},h('summary',{},'Command details'),h('button',{},'Closed command')),h('button',{},'Last command'));
}
it('keeps native summary traversal in the custom command dialog focus contract', () => {
 const view=render(h(DisclosureDialog)); const summary=view.getByText('Command details'); summary.focus();
 expect(fireEvent.keyDown(summary,{key:'Tab'})).toBe(true);
 expect(document.activeElement).toBe(summary); view.unmount();
});
