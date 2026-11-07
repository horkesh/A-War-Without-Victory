import { expect, it, vi } from 'vitest';
import { connectNativeInterfaceScale } from '../../src/ui/map/preferences/nativeInterfaceScale';
import { readInterfaceScale, setInterfaceScale, getInterfaceScale } from '../../src/ui/map/preferences/interfaceScalePreference';
it('hydrates native scale without saving defaults and requests a merge for an edit', async()=>{
 setInterfaceScale(100); const settings={interfaceScale:125,foreign:'keep'}; const save=vi.fn(async()=>({ok:true}));
 const connection=connectNativeInterfaceScale({getSettings:async()=>({ok:true,settings}),saveSettings:save});
 await connection.ready; expect(getInterfaceScale()).toBe(125); expect(save).not.toHaveBeenCalled();
 setInterfaceScale(150);await connection.flush();expect(save).toHaveBeenCalledWith({interfaceScale:150},{merge:true});
 connection.dispose();setInterfaceScale(100);
});
it('keeps a user choice made during hydration and serializes rapid changes',async()=>{
 setInterfaceScale(100);let resolve!:(value:unknown)=>void;let calls=0;const saves:unknown[]=[];
 const connection=connectNativeInterfaceScale({getSettings:async()=>++calls===1?await new Promise<any>(r=>{resolve=r;}):{ok:true,settings:{foreign:true}},saveSettings:async value=>{saves.push(value);return {ok:true};}});
 setInterfaceScale(150);resolve({ok:true,settings:{interfaceScale:125}});await connection.ready;await connection.flush();expect(getInterfaceScale()).toBe(150);
 setInterfaceScale(125);setInterfaceScale(100);await connection.flush();expect(saves.at(-1)).toEqual({interfaceScale:100});connection.dispose();
});
it('sanitizes corrupt native values and retains browser/session fallback on unavailable reads/writes',async()=>{
 setInterfaceScale(150);const corrupt=connectNativeInterfaceScale({getSettings:async()=>({ok:true,settings:{interfaceScale:'corrupt'}}),saveSettings:async()=>({ok:false})});await corrupt.ready;expect(getInterfaceScale()).toBe(100);corrupt.dispose();
 for(const getSettings of [async()=>{throw Error('offline');},async()=>({ok:false}),async()=>({ok:true,settings:[]})]){
  setInterfaceScale(125);const save=vi.fn(async()=>({ok:false}));const connection=connectNativeInterfaceScale({getSettings,saveSettings:save});await connection.ready;expect(getInterfaceScale()).toBe(125);setInterfaceScale(150);await connection.flush();expect(getInterfaceScale()).toBe(150);expect(save).toHaveBeenCalledWith({interfaceScale:150},{merge:true});connection.dispose();
 }
 const failedSave=connectNativeInterfaceScale({getSettings:async()=>({ok:true,settings:{}}),saveSettings:async()=>{throw Error('denied');}});await failedSave.ready;setInterfaceScale(150);await failedSave.flush();expect(getInterfaceScale()).toBe(150);failedSave.dispose();setInterfaceScale(100);
 expect(readInterfaceScale({getItem:()=>null})).toBe(100);
});
