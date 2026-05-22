import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { NeonCanvas } from './components/NeonCanvas';
import type { Tube } from './utils/geometry';
import { generateId, SCALE } from './utils/geometry';
import './App.css';



function App() {
  const [sheetType, setSheetType] = useState<'letter' | 'a4'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const sheetCount = 1;

  // Initialize with a single 4-foot (48") horizontal tube snapped and centered on the 6x5 grid workspace.
  // A4 Landscape: 11.69" width, 8.27" height.
  // cols = 6, rows = 5, total grid width = 2805.6px, total grid height = 1654px.
  // Center is: x = 1402.8px (snapped to 1400px), y = 827px (snapped to 830px).
  const [tubes, setTubes] = useState<Tube[]>(() => {
    const initialTubeId = generateId();
    const lengthPx = 48 * SCALE;
    
    const dimsInches = {
      letter: { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } },
      a4: { portrait: { w: 8.27, h: 11.69 }, landscape: { w: 11.69, h: 8.27 } }
    };
    const activeDim = dimsInches['a4']['landscape'];
    const totalWidthPx = 6 * activeDim.w * SCALE;
    const totalHeightPx = 5 * activeDim.h * SCALE;

    const rawCenterX = totalWidthPx / 2;
    const rawCenterY = totalHeightPx / 2;

    // Snap to the grid intersections (10px increments)
    const centerX = Math.round(rawCenterX / 10) * 10;
    const centerY = Math.round(rawCenterY / 10) * 10;

    return [
      {
        id: initialTubeId,
        color: '#38bdf8', // Electric Blue default
        diameter: 10,     // 10mm standard
        maxLengthInches: 48, // 4 feet
        points: [
          { id: generateId(), x: centerX - lengthPx / 2, y: centerY },
          { id: generateId(), x: centerX - lengthPx / 4, y: centerY },
          { id: generateId(), x: centerX + lengthPx / 4, y: centerY },
          { id: generateId(), x: centerX + lengthPx / 2, y: centerY }
        ]
      }
    ];
  });

  const [selectedTubeId, setSelectedTubeId] = useState<string | null>(() => {
    return tubes[0]?.id || null;
  });
  const [tool, setTool] = useState<'select' | 'bend' | 'cut' | 'weld' | 'add'>('select');
  const [isPowerOn, setIsPowerOn] = useState<boolean>(true); // Power ON by default for high visual impact!
  
  // Custom settings
  const [bendRadius, setBendRadius] = useState<number>(0.75); // 0.75" standard bend radius
  const [useMetric, setUseMetric] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  return (
    <div className="app-container">
      {/* Telemetry Panel / Controls Sidebar */}
      <Sidebar
        tubes={tubes}
        setTubes={setTubes}
        selectedTubeId={selectedTubeId}
        setSelectedTubeId={setSelectedTubeId}
        tool={tool}
        setTool={setTool}
        isPowerOn={isPowerOn}
        setIsPowerOn={setIsPowerOn}
        bendRadius={bendRadius}
        setBendRadius={setBendRadius}
        useMetric={useMetric}
        setUseMetric={setUseMetric}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        sheetType={sheetType}
        setSheetType={setSheetType}
        orientation={orientation}
        setOrientation={setOrientation}
      />

      {/* Interactive Vector Editor Workspace */}
      <NeonCanvas
        tubes={tubes}
        setTubes={setTubes}
        selectedTubeId={selectedTubeId}
        setSelectedTubeId={setSelectedTubeId}
        tool={tool}
        isPowerOn={isPowerOn}
        sheetType={sheetType}
        orientation={orientation}
        sheetCount={sheetCount}
        bendRadius={bendRadius}
        useMetric={useMetric}
        snapToGrid={snapToGrid}
      />
    </div>
  );
}

export default App;
