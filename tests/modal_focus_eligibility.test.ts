// @vitest-environment jsdom
import { createElement as h } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Modal } from '../src/ui/shared/Modal';
it('skips hidden, inert, negative-tabindex and disabled initial targets, and traps from the panel', () => {
 const view = render(h(Modal, { isOpen: true, initialFocusTestId: 'disabled', children: [h('button', { key:'d', disabled:true, 'data-testid':'disabled', tabIndex:0 }, 'Disabled'), h('div', {key:'h', hidden:true}, h('button', {}, 'Hidden')), h('button', {key:'n', tabIndex:-1}, 'Negative'), h('div', {key:'i', inert:''}, h('button', {}, 'Inert')), h('button', {key:'v'}, 'Visible'), h('button', {key:'l'}, 'Last')] }));
 expect(document.activeElement?.textContent).toBe('Visible');
 const panel = view.getByRole('dialog'); panel.focus();
 fireEvent.keyDown(panel, {key:'Tab', shiftKey:true});
 expect(document.activeElement?.textContent).toBe('Last');
 view.unmount();
});
it('skips CSS-hidden controls and disabled fieldsets', () => {
 const view = render(h(Modal, {isOpen:true, children:[h('div',{key:'css',style:{display:'none'}},h('button',{},'CSS hidden')), h('fieldset',{key:'f',disabled:true},h('button',{},'Fieldset')),h('button',{key:'ok'},'Reachable')]}));
 expect(document.activeElement?.textContent).toBe('Reachable'); view.unmount();
});
it('contains Tab before a required-decision child capture shield stops shell hotkeys', () => {
 const view = render(h(Modal, {isOpen:true, dismissible:false, children:h('div', {onKeyDownCapture:(event: { stopPropagation(): void }) => event.stopPropagation()}, h('button',{},'First required'),h('button',{},'Last required'))}));
 const first=view.getByRole('button',{name:'First required'}); const last=view.getByRole('button',{name:'Last required'});
 last.focus(); fireEvent.keyDown(last,{key:'Tab'}); expect(document.activeElement).toBe(first);
 first.focus(); fireEvent.keyDown(first,{key:'Tab',shiftKey:true}); expect(document.activeElement).toBe(last);
 view.unmount();
});
it('includes the native first summary in document order without hijacking its next Tab', () => {
 const view = render(h(Modal,{isOpen:true,children:[h('button',{key:'a'},'Before details'),h('details',{key:'d'},h('summary',{},'Disclosure'),h('button',{},'Closed contents')),h('button',{key:'b'},'After details')]}));
 const disclosure=view.getByText('Disclosure'); disclosure.focus();
 expect(fireEvent.keyDown(disclosure,{key:'Tab'})).toBe(true);
 expect(document.activeElement).toBe(disclosure);
 view.unmount();
});
it('excludes closed details contents while including open details contents in the trap', () => {
 const view = render(h(Modal,{isOpen:true,children:[h('button',{key:'first'},'Start'),h('details',{key:'closed'},h('summary',{},'Closed disclosure'),h('button',{},'Hidden tail'))]}));
 const first=view.getByRole('button',{name:'Start'}); first.focus();
 fireEvent.keyDown(first,{key:'Tab',shiftKey:true}); expect(document.activeElement?.textContent).toBe('Closed disclosure');
 view.unmount();
 const openView = render(h(Modal,{isOpen:true,children:h('details',{open:true},h('summary',{},'Open disclosure'),h('button',{},'Open contents'))}));
 expect(document.activeElement?.textContent).toBe('Open disclosure');
 fireEvent.keyDown(document.activeElement!,{key:'Tab',shiftKey:true}); expect(document.activeElement?.textContent).toBe('Open contents');
 openView.unmount();
});
