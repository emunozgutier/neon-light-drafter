import { create } from 'zustand';
import type { Tube } from '../utils/geometry';
import { generateId, SCALE } from '../utils/geometry';

// Encode tubes to a compressed base64 string
export const encodeTubes = (tubesList: Tube[]): string => {
  try {
    const compact = tubesList.map((t) => ({
      c: t.color,
      d: t.diameter,
      m: t.maxLengthInches,
      p: t.points.map((p) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        i: p.handleIn ? { x: Math.round(p.handleIn.dx), y: Math.round(p.handleIn.dy) } : undefined,
        o: p.handleOut ? { x: Math.round(p.handleOut.dx), y: Math.round(p.handleOut.dy) } : undefined,
      })),
    }));
    const jsonStr = JSON.stringify(compact);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  } catch (e) {
    console.error('Error encoding tubes', e);
    return '';
  }
};

// Decode tubes from a base64 string
export const decodeTubes = (hash: string): Tube[] | null => {
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
        handleOut: p.o ? { dx: p.o.x, dy: p.o.y } : undefined,
      })),
    }));
  } catch (e) {
    console.error('Error decoding tubes from URL', e);
    return null;
  }
};

// Initial state calculation matching App.tsx
const getInitialTubes = (): Tube[] => {
  const hash = window.location.hash.substring(1);
  const decoded = decodeTubes(hash);
  if (decoded && decoded.length > 0) {
    return decoded;
  }

  const initialTubeId = generateId();
  const lengthPx = 48 * SCALE;

  const dimsInches = {
    letter: { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } },
    a4: { portrait: { w: 8.27, h: 11.69 }, landscape: { w: 11.69, h: 8.27 } },
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
      diameter: 10, // 10mm standard
      maxLengthInches: 48, // 4 feet
      points: [
        {
          id: generateId(),
          x: centerX - lengthPx / 2,
          y: centerY,
          handleIn: { dx: -lengthPx / 6, dy: 0 },
          handleOut: { dx: lengthPx / 6, dy: 0 },
        },
        {
          id: generateId(),
          x: centerX + lengthPx / 2,
          y: centerY,
          handleIn: { dx: -lengthPx / 6, dy: 0 },
          handleOut: { dx: lengthPx / 6, dy: 0 },
        },
      ],
    },
  ];
};

export interface CanvasState {
  tubes: Tube[];
  selectedTubeId: string | null;
  tool: 'select' | 'bend' | 'cut' | 'weld' | 'add';
  isPowerOn: boolean;

  setTubes: (tubes: Tube[] | ((prev: Tube[]) => Tube[])) => void;
  setSelectedTubeId: (id: string | null) => void;
  setTool: (tool: 'select' | 'bend' | 'cut' | 'weld' | 'add') => void;
  setIsPowerOn: (isPowerOn: boolean) => void;
}

export const useCanvas = create<CanvasState>((set) => {
  const initialTubes = getInitialTubes();
  return {
    tubes: initialTubes,
    selectedTubeId: initialTubes[0]?.id || null,
    tool: 'select',
    isPowerOn: true,

    setTubes: (tubes) =>
      set((state) => ({
        tubes: typeof tubes === 'function' ? tubes(state.tubes) : tubes,
      })),
    setSelectedTubeId: (selectedTubeId) => set({ selectedTubeId }),
    setTool: (tool) => set({ tool }),
    setIsPowerOn: (isPowerOn) => set({ isPowerOn }),
  };
});
