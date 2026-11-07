// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { InterfaceScaleLayer, InterfaceScaleSettings } from '../../src/ui/map/preferences/InterfaceScale';
import { readInterfaceScale, setInterfaceScale, INTERFACE_SCALE_STORAGE_KEY } from '../../src/ui/map/preferences/interfaceScalePreference';
afterEach(()=>{cleanup();setInterfaceScale(100);localStorage.clear();});
it('sanitizes absent, corrupt, unsupported and unavailable storage',()=>{
 for(const value of [null,'garbage','NaN','200','1.5','125px']) expect(readInterfaceScale({getItem:()=>value})).toBe(100);
 expect(readInterfaceScale({getItem:()=> '125'})).toBe(125);
 expect(readInterfaceScale({getItem:()=>{throw Error('denied')}})).toBe(100);
 expect(setInterfaceScale(150,{setItem:()=>{throw Error('denied')}})).toBe(150);
});
it('scales a sibling interface layer, persists and resets without touching canvas/native zoom',()=>{
 const view=render(h('div',{},h('canvas',{'data-testid':'map-canvas'}),h(InterfaceScaleLayer,{},h(InterfaceScaleSettings))));
 fireEvent.change(view.getByRole('combobox'),{target:{value:'150'}});
 expect(localStorage.getItem(INTERFACE_SCALE_STORAGE_KEY)).toBe('150');
 const layer=view.getByTestId('interface-scale-layer'); expect(layer.style.transform).toBe('scale(1.5)');
 expect(Number(layer.style.zIndex)).toBeGreaterThan(10);
 expect(layer.contains(view.getByTestId('map-canvas'))).toBe(false);
 expect(document.documentElement.style.getPropertyValue('zoom')).toBe('');
 fireEvent.click(view.getByRole('button')); expect(layer.style.transform).toBe('scale(1)');
});
