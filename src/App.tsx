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

  // Initialize with a single 4-foot (48") horizontal tube centered on the default A4 Landscape Page A-1.
  // A4 Landscape: 11.69" width, 8.27" height.
  // Center is: x = 11.69 * 40 / 2 = 233.8px, y = 8.27 * 40 / 2 = 165.4px.
  const [tubes, setTubes] = useState<Tube[]>(() => {
    const initialTubeId = generateId();
    const lengthPx = 48 * SCALE;
    const centerX = (11.69 * SCALE) / 2;
    const centerY = (8.27 * SCALE) / 2;
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
