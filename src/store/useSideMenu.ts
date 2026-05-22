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
  refImageScaleX: number;
  refImageScaleY: number;
  refImageX: number;
  refImageY: number;
  isRefImageLocked: boolean;
  refImageAspectRatio: number;
  printRotation: number;
  fitMargin: number; // in inches, margin for error subtracted when scaling to fit
  isPreviewOpen: boolean;

  setSheetType: (type: 'letter' | 'a4') => void;
  setOrientation: (orientation: 'portrait' | 'landscape') => void;
  setSheetCount: (count: number) => void;
  setBendRadius: (radius: number) => void;
  setUseMetric: (useMetric: boolean) => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  setRefImageSrc: (src: string | null) => void;
  setRefImageOpacity: (opacity: number) => void;
  setRefImageScale: (scale: number) => void;
  setRefImageScaleX: (scaleX: number) => void;
  setRefImageScaleY: (scaleY: number) => void;
  setRefImageX: (x: number) => void;
  setRefImageY: (y: number) => void;
  setIsRefImageLocked: (locked: boolean) => void;
  setRefImageAspectRatio: (ratio: number) => void;
  setPrintRotation: (rotation: number) => void;
  setFitMargin: (margin: number) => void;
  setIsPreviewOpen: (open: boolean) => void;
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
  refImageScaleX: 1.0,
  refImageScaleY: 1.0,
  refImageX: 0,
  refImageY: 0,
  isRefImageLocked: true,
  refImageAspectRatio: 1.0,
  printRotation: 0,
  fitMargin: 0,
  isPreviewOpen: false,

  setSheetType: (sheetType) => set({ sheetType }),
  setOrientation: (orientation) => set({ orientation }),
  setSheetCount: (sheetCount) => set({ sheetCount }),
  setBendRadius: (bendRadius) => set({ bendRadius }),
  setUseMetric: (useMetric) => set({ useMetric }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setRefImageSrc: (refImageSrc) => set({ refImageSrc }),
  setRefImageOpacity: (refImageOpacity) => set({ refImageOpacity }),
  setRefImageScale: (refImageScale) => set({ refImageScale, refImageScaleX: refImageScale, refImageScaleY: refImageScale }),
  setRefImageScaleX: (refImageScaleX) => set({ refImageScaleX }),
  setRefImageScaleY: (refImageScaleY) => set({ refImageScaleY }),
  setRefImageX: (refImageX) => set({ refImageX }),
  setRefImageY: (refImageY) => set({ refImageY }),
  setIsRefImageLocked: (isRefImageLocked) => set({ isRefImageLocked }),
  setRefImageAspectRatio: (refImageAspectRatio) => set({ refImageAspectRatio }),
  setPrintRotation: (printRotation) => set({ printRotation }),
  setFitMargin: (fitMargin) => set({ fitMargin }),
  setIsPreviewOpen: (isPreviewOpen) => set({ isPreviewOpen }),
}));
