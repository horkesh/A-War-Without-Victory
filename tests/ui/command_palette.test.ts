// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { buildCommandIndex, queryCommands } from '../../src/ui/map/command_palette/search';
import { CommandPalette } from '../../src/ui/map/command_palette/CommandPalette';
import { CommandPaletteLauncher } from '../../src/ui/map/command_palette/CommandPaletteLauncher';
afterEach(cleanup);
it('opens and reopens from the focused Find button after Escape restores focus', () => {
 const view=render(h(CommandPaletteLauncher,{entries:[],blocked:false,campaignKey:'one',onActivate:()=>{}}));
 const opener=view.getByTestId('command-palette-opener');opener.focus();
 fireEvent.keyDown(opener,{key:'k',ctrlKey:true});expect(view.getByRole('combobox')).toBe(document.activeElement);
 fireEvent.keyDown(view.getByRole('combobox'),{key:'Escape'});expect(document.activeElement).toBe(opener);
 fireEvent.keyDown(opener,{key:'k',metaKey:true});expect(view.getByRole('combobox')).toBe(document.activeElement);
});
const sections = [{ id: 'map', label: 'Tactical Map' }];
it('indexes projected corps_asset corps through the same canonical corps route', () => {
 const entries=buildCommandIndex({playerFaction:'RS',formations:[{id:'own_corps',name:'First Corps',kind:'corps_asset',faction:'RS',status:'active'}],settlementNames:null,sections:[]});
 expect(queryCommands(entries,'first corps')).toEqual([{id:'corps:own_corps',targetId:'own_corps',label:'First Corps',kind:'corps'}]);
});
const formations = [
 { id:'own', name:'Čelična brigada', faction:'RBiH', kind:'brigade', status:'active' },
 { id:'corps', name:'Third Corps', faction:'RBiH', kind:'corps', status:'active' },
 { id:'hidden', name:'Secret Enemy', faction:'RS', kind:'brigade', status:'active' },
 { id:'raw_own', name:'raw_own', faction:'RBiH', kind:'brigade', status:'active' },
 { id:'unnamed', name:'', faction:'RBiH', kind:'brigade', status:'active' },
];
it('indexes own named brigades/corps and public settlement names without ID fallback/search', () => {
 const index = buildCommandIndex({ playerFaction:'RBiH', formations, settlementNames:{public:'Žepče', raw:'op:raw'}, sections });
 expect(queryCommands(index,'celicna').map(row=>row.label)).toEqual(['Čelična brigada']);
 expect(queryCommands(index,'zepce').map(row=>row.label)).toEqual(['Žepče']);
 expect(queryCommands(index,'corps').map(row=>row.label)).toEqual(['Third Corps']);
 for (const query of ['secret','raw_own','unnamed','op:raw','hidden']) expect(queryCommands(index,query)).toEqual([]);
 expect(buildCommandIndex({playerFaction:null,formations,settlementNames:null,sections})).toEqual(expect.arrayContaining([{id:'section:map',label:'Tactical Map',kind:'section',targetId:'map'}]));
});
it('guards shortcuts, required surfaces, busy mutation, stale targets and campaign changes', () => {
 const entries=buildCommandIndex({playerFaction:'RBiH',formations,settlementNames:null,sections}); const activate=vi.fn();
 const view=render(h(CommandPaletteLauncher,{entries,blocked:false,campaignKey:'one',onActivate:activate}));
 fireEvent.keyDown(window,{key:'k',ctrlKey:true,repeat:true}); expect(view.queryByRole('dialog')).toBeNull();
 fireEvent.keyDown(window,{key:'k',metaKey:true}); expect(view.getByRole('combobox')).toBe(document.activeElement);
 view.rerender(h(CommandPaletteLauncher,{entries:[],blocked:false,campaignKey:'one',onActivate:activate}));
 fireEvent.keyDown(view.getByRole('combobox'),{key:'Enter'}); expect(activate).not.toHaveBeenCalled();
 view.rerender(h(CommandPaletteLauncher,{entries,blocked:true,campaignKey:'one',onActivate:activate})); expect(view.queryByRole('dialog')).toBeNull();
 fireEvent.click(view.getByRole('button')); expect(view.queryByRole('dialog')).toBeNull();
 view.rerender(h(CommandPaletteLauncher,{entries,blocked:false,campaignKey:'one',onActivate:activate}));
 const busy=document.createElement('div');busy.setAttribute('aria-busy','true');document.body.append(busy);
 fireEvent.keyDown(window,{key:'k',ctrlKey:true}); expect(view.queryByRole('dialog')).toBeNull(); busy.remove();
 const modal=document.createElement('div');modal.setAttribute('role','dialog');document.body.append(modal);
 fireEvent.keyDown(window,{key:'k',ctrlKey:true}); expect(view.queryByRole('combobox')).toBeNull(); modal.remove();
 fireEvent.click(view.getByRole('button')); expect(view.getByRole('dialog')).toBeTruthy();
 view.rerender(h(CommandPaletteLauncher,{entries,blocked:false,campaignKey:'two',onActivate:activate})); expect(view.queryByRole('dialog')).toBeNull();
});
it('bounds deterministic ties without indexing routing identifiers', () => {
 const index=buildCommandIndex({playerFaction:'RBiH',formations:[],settlementNames:{z:'Same',a:'Same',b:'Same'},sections:[]});
 expect(queryCommands(index,'same',2).map(row=>row.targetId)).toEqual(['a','b']);
 expect(queryCommands(index,'a')).toHaveLength(3);
 expect(queryCommands(index,'section:')).toEqual([]);
});
it('mounts focused combobox, supports keyboard selection, empty results, Escape and focus return', () => {
 const opener=document.createElement('button'); document.body.append(opener); opener.focus();
 const activate=vi.fn(); const close=vi.fn();
 const rows=buildCommandIndex({playerFaction:'RBiH',formations,settlementNames:null,sections});
 const view=render(h(CommandPalette,{open:true,entries:rows,onActivate:activate,onClose:close}));
 const input=view.getByRole('combobox'); expect(document.activeElement).toBe(input);
 fireEvent.keyDown(input,{key:'ArrowDown'}); expect(view.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
 fireEvent.keyDown(input,{key:'Home'}); expect(view.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true');
 fireEvent.keyDown(input,{key:'ArrowUp'}); expect(view.getAllByRole('option').at(-1)?.getAttribute('aria-selected')).toBe('true');
 fireEvent.change(input,{target:{value:'celicna'}});
 fireEvent.keyDown(input,{key:'End'}); fireEvent.keyDown(input,{key:'Enter'});
 expect(activate).toHaveBeenCalledWith(expect.objectContaining({targetId:'own'}));
 fireEvent.change(input,{target:{value:'unfindable'}}); expect(view.queryAllByRole('option')).toHaveLength(0);
 fireEvent.keyDown(input,{key:'Enter'}); expect(activate).toHaveBeenCalledTimes(1);
 fireEvent.keyDown(input,{key:'Escape'}); expect(close).toHaveBeenCalledTimes(1);
 view.unmount(); expect(document.activeElement).toBe(opener); opener.remove();
});
it('ignores editor/composition/prevented shortcuts, ignores hidden modal owners and closes on new busy ownership', async()=>{
 const entries=buildCommandIndex({playerFaction:'RBiH',formations,settlementNames:null,sections});
 const view=render(h('div',{},h('input',{'aria-label':'Editor'}),h(CommandPaletteLauncher,{entries,blocked:false,campaignKey:'one',onActivate:()=>{}})));
 fireEvent.keyDown(view.getByRole('textbox'),{key:'k',ctrlKey:true});expect(view.queryByRole('dialog')).toBeNull();
 fireEvent.keyDown(window,{key:'k',ctrlKey:true,isComposing:true});expect(view.queryByRole('dialog')).toBeNull();
 const prevented=new KeyboardEvent('keydown',{key:'k',ctrlKey:true,cancelable:true});prevented.preventDefault();window.dispatchEvent(prevented);expect(view.queryByRole('dialog')).toBeNull();
 const hidden=document.createElement('div');hidden.setAttribute('role','dialog');hidden.hidden=true;document.body.append(hidden);
 fireEvent.keyDown(window,{key:'k',ctrlKey:true});expect(view.getByTestId('command-palette-dialog')).toBeTruthy();
 const busy=document.createElement('div');busy.setAttribute('aria-busy','true');document.body.append(busy);
 await waitFor(()=>expect(view.queryByTestId('command-palette-dialog')).toBeNull());busy.remove();hidden.remove();
});
