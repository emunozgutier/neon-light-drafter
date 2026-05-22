import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NeonCanvas } from './components/NeonCanvas';
import { useCanvas, encodeTubes } from './store/useCanvas';
import './App.css';

function App() {
  const tubes = useCanvas((state) => state.tubes);

  // Sync tubes in real-time to URL hash dynamically
  useEffect(() => {
    const encoded = encodeTubes(tubes);
    if (encoded) {
      window.history.replaceState(null, '', '#' + encoded);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [tubes]);

  return (
    <div className="app-container">
      {/* Telemetry Panel / Controls Sidebar */}
      <Sidebar />

      {/* Interactive Vector Editor Workspace */}
      <NeonCanvas />
    </div>
  );
}

export default App;
