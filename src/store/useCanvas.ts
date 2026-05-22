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
  
  // History fields
  past: string[];
  future: string[];

  setTubes: (tubes: Tube[] | ((prev: Tube[]) => Tube[]), skipHistory?: boolean) => void;
  setSelectedTubeId: (id: string | null) => void;
  setTool: (tool: 'select' | 'bend' | 'cut' | 'weld' | 'add') => void;
  setIsPowerOn: (isPowerOn: boolean) => void;

  // History methods
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  resetCanvas: () => void;
}

export const useCanvas = create<CanvasState>((set) => {
  const initialTubes = getInitialTubes();
  return {
    tubes: initialTubes,
    selectedTubeId: initialTubes[0]?.id || null,
    tool: 'select',
    isPowerOn: true,
    past: [],
    future: [],

    setTubes: (tubes, skipHistory = false) =>
      set((state) => {
        const nextTubes = typeof tubes === 'function' ? tubes(state.tubes) : tubes;
        
        // If we are skipping history (e.g. during dragging), or if tubes list is identical, just set the tubes
        if (skipHistory || JSON.stringify(state.tubes) === JSON.stringify(nextTubes)) {
          return { tubes: nextTubes };
        }

        // Otherwise save current state to history and clear future (redo stack)
        return {
          past: [...state.past, JSON.stringify(state.tubes)],
          future: [],
          tubes: nextTubes,
        };
      }),

    setSelectedTubeId: (selectedTubeId) => set({ selectedTubeId }),
    setTool: (tool) => set({ tool }),
    setIsPowerOn: (isPowerOn) => set({ isPowerOn }),

    saveHistory: () =>
      set((state) => {
        const last = state.past[state.past.length - 1];
        const currentStr = JSON.stringify(state.tubes);
        if (last === currentStr) return {};
        return {
          past: [...state.past, currentStr],
          future: [],
        };
      }),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return {};
        const previousStr = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        const currentStr = JSON.stringify(state.tubes);
        
        const decodedTubes: Tube[] = JSON.parse(previousStr);
        const selectedExists = decodedTubes.some(t => t.id === state.selectedTubeId);
        const nextSelectedId = selectedExists ? state.selectedTubeId : (decodedTubes[0]?.id || null);

        return {
          past: newPast,
          future: [currentStr, ...state.future],
          tubes: decodedTubes,
          selectedTubeId: nextSelectedId,
        };
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return {};
        const nextStr = state.future[0];
        const newFuture = state.future.slice(1);
        const currentStr = JSON.stringify(state.tubes);

        const decodedTubes: Tube[] = JSON.parse(nextStr);
        const selectedExists = decodedTubes.some(t => t.id === state.selectedTubeId);
        const nextSelectedId = selectedExists ? state.selectedTubeId : (decodedTubes[0]?.id || null);

        return {
          past: [...state.past, currentStr],
          future: newFuture,
          tubes: decodedTubes,
          selectedTubeId: nextSelectedId,
        };
      }),

    resetCanvas: () =>
      set(() => {
        // Clear URL hash
        window.location.hash = '';

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

        const centerX = Math.round(rawCenterX / SCALE) * SCALE;
        const centerY = Math.round(rawCenterY / SCALE) * SCALE;

        const defaultTubes = [
          {
            id: initialTubeId,
            color: '#38bdf8',
            diameter: 10,
            maxLengthInches: 48,
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

        return {
          tubes: defaultTubes,
          selectedTubeId: initialTubeId,
          tool: 'select',
          past: [],
          future: [],
        };
      }),
  };
});
