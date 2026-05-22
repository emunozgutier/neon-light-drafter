import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NeonCanvas } from './components/NeonCanvas';
import type { Tube } from './utils/geometry';
import { generateId, SCALE } from './utils/geometry';
import './App.css';

// Encode tubes to a compressed base64 string
const encodeTubes = (tubesList: Tube[]): string => {
  try {
    const compact = tubesList.map(t => ({
      c: t.color,
      d: t.diameter,
      m: t.maxLengthInches,
      p: t.points.map(p => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        i: p.handleIn ? { x: Math.round(p.handleIn.dx), y: Math.round(p.handleIn.dy) } : undefined,
        o: p.handleOut ? { x: Math.round(p.handleOut.dx), y: Math.round(p.handleOut.dy) } : undefined
      }))
    }));
    const jsonStr = JSON.stringify(compact);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  } catch (e) {
    console.error('Error encoding tubes', e);
    return '';
  }
};

// Decode tubes from a base64 string
const decodeTubes = (hash: string): Tube[] | null => {
  if (!hash) return null;
  try {
    const jsonStr = decodeURIComponent(escape(atob(hash)));
    const compact = JSON.parse(jsonStr);
    if (!Array.isArray(compact)) return null;
    
    return compact.map((t: any) => ({
      id: generateId(),
      color: t.c || '#38bdf8',
      diameter: t.d || 10,
      maxLengthInches: t.m || 48,
      points: t.p.map((p: any) => ({
        id: generateId(),
        x: p.x,
        y: p.y,
        handleIn: p.i ? { dx: p.i.x, dy: p.i.y } : undefined,
        handleOut: p.o ? { dx: p.o.x, dy: p.o.y } : undefined
      }))
    }));
  } catch (e) {
    console.error('Error decoding tubes from URL', e);
    return null;
  }
};

function App() {
  const [sheetType, setSheetType] = useState<'letter' | 'a4'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const sheetCount = 1;

  // Initialize with a single 4-foot (48") horizontal tube snapped and centered on the 6x5 grid workspace.
  // A4 Landscape: 11.69" width, 8.27" height.
  // cols = 6, rows = 5, total grid width = 2805.6px, total grid height = 1654px.
  // Center is: x = 1402.8px (snapped to 1400px), y = 827px (snapped to 830px).
  const [tubes, setTubes] = useState<Tube[]>(() => {
    // Check URL hash first for project data
    const hash = window.location.hash.substring(1);
    const decoded = decodeTubes(hash);
    if (decoded && decoded.length > 0) {
      return decoded;
    }

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

    // Snap to the 1-inch grid intersections (SCALE increments)
    const centerX = Math.round(rawCenterX / SCALE) * SCALE;
    const centerY = Math.round(rawCenterY / SCALE) * SCALE;

    return [
      {
        id: initialTubeId,
        color: '#38bdf8', // Electric Blue default
        diameter: 10,     // 10mm standard
        maxLengthInches: 48, // 4 feet
        points: [
          {
            id: generateId(),
            x: centerX - lengthPx / 2,
            y: centerY,
            handleIn: { dx: -lengthPx / 6, dy: 0 },
            handleOut: { dx: lengthPx / 6, dy: 0 }
          },
          {
            id: generateId(),
            x: centerX + lengthPx / 2,
            y: centerY,
            handleIn: { dx: -lengthPx / 6, dy: 0 },
            handleOut: { dx: lengthPx / 6, dy: 0 }
          }
        ]
      }
    ];
  });

  // Sync tubes in real-time to URL hash dynamically
  useEffect(() => {
    const encoded = encodeTubes(tubes);
    if (encoded) {
      window.history.replaceState(null, '', '#' + encoded);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [tubes]);

  const [selectedTubeId, setSelectedTubeId] = useState<string | null>(() => {
    return tubes[0]?.id || null;
  });
  const [tool, setTool] = useState<'select' | 'bend' | 'cut' | 'weld' | 'add'>('select');
  const [isPowerOn, setIsPowerOn] = useState<boolean>(true); // Power ON by default for high visual impact!
  
  // Custom settings
  const [bendRadius, setBendRadius] = useState<number>(0.75); // 0.75" standard bend radius
  const [useMetric, setUseMetric] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Reference Image overlays states
  const [refImageSrc, setRefImageSrc] = useState<string | null>(null);
  const [refImageOpacity, setRefImageOpacity] = useState<number>(0.4); // Default to 40% (semi-transparent)
  const [refImageScale, setRefImageScale] = useState<number>(1.0);
  const [refImageX, setRefImageX] = useState<number>(0);
  const [refImageY, setRefImageY] = useState<number>(0);
  const [isRefImageLocked, setIsRefImageLocked] = useState<boolean>(true);
  const [refImageAspectRatio, setRefImageAspectRatio] = useState<number>(1.0);

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
        refImageSrc={refImageSrc}
        setRefImageSrc={setRefImageSrc}
        refImageOpacity={refImageOpacity}
        setRefImageOpacity={setRefImageOpacity}
        refImageScale={refImageScale}
        setRefImageScale={setRefImageScale}
        refImageX={refImageX}
        setRefImageX={setRefImageX}
        refImageY={refImageY}
        setRefImageY={setRefImageY}
        isRefImageLocked={isRefImageLocked}
        setIsRefImageLocked={setIsRefImageLocked}
        refImageAspectRatio={refImageAspectRatio}
        setRefImageAspectRatio={setRefImageAspectRatio}
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
        refImageSrc={refImageSrc}
        refImageOpacity={refImageOpacity}
        refImageScale={refImageScale}
        refImageX={refImageX}
        setRefImageX={setRefImageX}
        refImageY={refImageY}
        setRefImageY={setRefImageY}
        isRefImageLocked={isRefImageLocked}
        setIsRefImageLocked={setIsRefImageLocked}
        refImageAspectRatio={refImageAspectRatio}
      />
    </div>
  );
}

export default App;
