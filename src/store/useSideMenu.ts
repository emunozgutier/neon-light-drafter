import { create } from 'zustand';

export interface SideMenuState {
  sheetType: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  sheetCount: number;
  bendRadius: number;
  useMetric: boolean;
  snapToGrid: boolean;
  refImageSrc: string | null;
  refImageOpacity: number;
  refImageScale: number;
  refImageX: number;
  refImageY: number;
  isRefImageLocked: boolean;
  refImageAspectRatio: number;

  setSheetType: (type: 'letter' | 'a4') => void;
  setOrientation: (orientation: 'portrait' | 'landscape') => void;
  setSheetCount: (count: number) => void;
  setBendRadius: (radius: number) => void;
  setUseMetric: (useMetric: boolean) => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  setRefImageSrc: (src: string | null) => void;
  setRefImageOpacity: (opacity: number) => void;
  setRefImageScale: (scale: number) => void;
  setRefImageX: (x: number) => void;
  setRefImageY: (y: number) => void;
  setIsRefImageLocked: (locked: boolean) => void;
  setRefImageAspectRatio: (ratio: number) => void;
}

export const useSideMenu = create<SideMenuState>((set) => ({
  sheetType: 'a4',
  orientation: 'landscape',
  sheetCount: 1,
  bendRadius: 0.75,
  useMetric: false,
  snapToGrid: true,
  refImageSrc: null,
  refImageOpacity: 0.4,
  refImageScale: 1.0,
  refImageX: 0,
  refImageY: 0,
  isRefImageLocked: true,
  refImageAspectRatio: 1.0,

  setSheetType: (sheetType) => set({ sheetType }),
  setOrientation: (orientation) => set({ orientation }),
  setSheetCount: (sheetCount) => set({ sheetCount }),
  setBendRadius: (bendRadius) => set({ bendRadius }),
  setUseMetric: (useMetric) => set({ useMetric }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setRefImageSrc: (refImageSrc) => set({ refImageSrc }),
  setRefImageOpacity: (refImageOpacity) => set({ refImageOpacity }),
  setRefImageScale: (refImageScale) => set({ refImageScale }),
  setRefImageX: (refImageX) => set({ refImageX }),
  setRefImageY: (refImageY) => set({ refImageY }),
  setIsRefImageLocked: (isRefImageLocked) => set({ isRefImageLocked }),
  setRefImageAspectRatio: (refImageAspectRatio) => set({ refImageAspectRatio }),
}));
