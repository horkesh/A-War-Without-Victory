import { useEffect } from 'react';
import { MapContainer } from './map/MapContainer';
import { TopToolbar } from './components/TopToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { FormationDetail } from './components/FormationDetail';
import { BottomStatusStrip } from './components/BottomStatusStrip';
import { OOBSidebar } from './components/OOBSidebar';
import { useGameStore } from './store/gameStore';

function App() {
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);

  // Dev: ?showPanel=1 shows the selection panel with a placeholder OSID for layout verification
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('showPanel') === '1') {
      useGameStore.getState().setSelectedOsid('S1');
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedOsid(null);
      setSelectedFormationId(null);
      setHoveredOsids([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setHoveredOsids, setSelectedFormationId, setSelectedOsid]);

  return (
    <div className="h-screen w-screen relative">
      <MapContainer />
      <TopToolbar />
      <OOBSidebar />
      <SelectionPanel />
      <FormationDetail />
      <BottomStatusStrip />
    </div>
  );
}

export default App;
