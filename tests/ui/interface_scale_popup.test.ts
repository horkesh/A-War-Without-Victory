// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RadialMenu } from '../../src/ui/map/components/RadialMenu';
import { setInterfaceScale } from '../../src/ui/map/preferences/interfaceScalePreference';
afterEach(()=>{cleanup();setInterfaceScale(100);document.querySelector('[data-interface-portal-root]')?.remove();});
it('ports map-owned HTML popup into scaled UI, compensates physical anchors and preserves action owner',()=>{
 const target=document.createElement('div');target.setAttribute('data-interface-portal-root','');document.body.append(target);setInterfaceScale(150);
 const action=vi.fn();const close=vi.fn();const view=render(h(RadialMenu,{items:[{id:'inspect',label:'Inspect',icon:'i',action}],position:{x:300,y:300},onClose:close}));
 const menu=view.getByTestId('map-context-menu');expect(target.contains(menu)).toBe(true);expect(menu.style.left).toBe('200px');expect(menu.style.top).toBe('200px');
 fireEvent.click(view.getByRole('button',{name:'i Inspect'}));expect(action).toHaveBeenCalledTimes(1);expect(close).toHaveBeenCalledTimes(1);
});
it('keeps an unscaled popup at physical coordinates without an interface layer',()=>{
 setInterfaceScale(150);const view=render(h(RadialMenu,{items:[{id:'inspect',label:'Inspect',icon:'i',action:()=>{}}],position:{x:300,y:300},onClose:()=>{}}));
 expect(view.getByTestId('map-context-menu').style.left).toBe('300px');
});
