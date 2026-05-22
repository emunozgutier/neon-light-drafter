export interface Point {
  x: number;
  y: number;
  id: string;
  isFixed?: boolean;
  // Relative control handle offsets from the anchor (x, y)
  // handleIn controls the incoming curve, handleOut controls the outgoing curve
  handleIn?: { dx: number; dy: number };
  handleOut?: { dx: number; dy: number };
}

export interface Tube {
  id: string;
  points: Point[];
  color: string;
  diameter: number; // in mm, e.g. 8, 10, 12, 15
  maxLengthInches: number; // default 48 inches (4 feet)
}

// 1 inch = 40 pixels on screen
export const SCALE = 40;

export const pxToInches = (px: number): number => px / SCALE;
export const inchesToPx = (inches: number): number => inches * SCALE;
export const pxToFeet = (px: number): number => px / (SCALE * 12);
export const inchesToFeet = (inches: number): number => inches / 12;

export const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

export const formatLength = (inches: number, useMetric: boolean = false): string => {
  if (useMetric) {
    const mm = inches * 25.4;
    if (mm >= 1000) {
      return `${(mm / 1000).toFixed(2)} m`;
    }
    return `${mm.toFixed(0)} mm`;
  }
  
  const feet = Math.floor(inches / 12);
  const remainingInches = (inches % 12).toFixed(1);
  if (feet > 0) {
    return `${feet}' ${remainingInches}"`;
  }
  return `${remainingInches}"`;
};

/**
 * Calculates a point coordinate on a cubic Bezier curve at parameter t (0 to 1).
 */
export const bezierPoint = (
  p0: { x: number; y: number },
  c0: { x: number; y: number },
  c1: { x: number; y: number },
  p1: { x: number; y: number },
  t: number
): { x: number; y: number } => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * c0.x + 3 * mt * t2 * c1.x + t3 * p1.x,
    y: mt3 * p0.y + 3 * mt2 * t * c0.y + 3 * mt * t2 * c1.y + t3 * p1.y
  };
};

/**
 * Calculates the tangent vector of a cubic Bezier curve at parameter t (0 to 1).
 * Returns a normalized direction vector.
 */
export const bezierTangent = (
  p0: { x: number; y: number },
  c0: { x: number; y: number },
  c1: { x: number; y: number },
  p1: { x: number; y: number },
  t: number
): { x: number; y: number } => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  // B'(t) = 3*(1-t)^2*(c0 - p0) + 6*(1-t)*t*(c1 - c0) + 3*t^2*(p1 - c1)
  const dx = 3 * mt2 * (c0.x - p0.x) + 6 * mt * t * (c1.x - c0.x) + 3 * t2 * (p1.x - c1.x);
  const dy = 3 * mt2 * (c0.y - p0.y) + 6 * mt * t * (c1.y - c0.y) + 3 * t2 * (p1.y - c1.y);

  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
};

/**
 * Calculates the exact SVG cubic Bezier path and physical length of a glass tube.
 */
export const calculateTubeGeometry = (
  points: Point[],
  _radiusInches: number = 0.75 // Retained for signature compatibility, unused now
): { pathData: string; physicalLengthInches: number; arcDetails: any[] } => {
  if (points.length === 0) {
    return { pathData: '', physicalLengthInches: 0, arcDetails: [] };
  }
  if (points.length === 1) {
    return { pathData: `M ${points[0].x} ${points[0].y}`, physicalLengthInches: 0, arcDetails: [] };
  }

  let pathData = `M ${points[0].x} ${points[0].y}`;
  let totalLengthPx = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    // Compute absolute handle coordinates from relative offsets
    const c0 = {
      x: p0.x + (p0.handleOut?.dx ?? 0),
      y: p0.y + (p0.handleOut?.dy ?? 0)
    };
    const c1 = {
      x: p1.x + (p1.handleIn?.dx ?? 0),
      y: p1.y + (p1.handleIn?.dy ?? 0)
    };

    // Draw the cubic Bezier curve segment
    pathData += ` C ${c0.x} ${c0.y}, ${c1.x} ${c1.y}, ${p1.x} ${p1.y}`;

    // Precise numerical length integration
    let segmentLength = 0;
    let prevPt = { x: p0.x, y: p0.y };
    const N = 30; // 30 linear steps per segment
    for (let j = 1; j <= N; j++) {
      const t = j / N;
      const currPt = bezierPoint(p0, c0, c1, p1, t);
      segmentLength += dist(prevPt, currPt);
      prevPt = currPt;
    }
    totalLengthPx += segmentLength;
  }

  return {
    pathData,
    physicalLengthInches: pxToInches(totalLengthPx),
    arcDetails: []
  };
};

/**
 * Finds the nearest point on a polyline segment to a click coordinate.
 * Upgraded to support high-resolution subdivision of cubic Bezier splines.
 */
export const findNearestPointOnPath = (
  clickPt: { x: number; y: number },
  points: Point[],
  thresholdPx: number = 20
): { segmentIndex: number; point: { x: number; y: number }; distance: number; t: number } | null => {
  if (points.length < 2) return null;

  let minDistance = Infinity;
  let nearestSegmentIndex = -1;
  let nearestPoint = { x: 0, y: 0 };
  let nearestT = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const c0 = {
      x: p0.x + (p0.handleOut?.dx ?? 0),
      y: p0.y + (p0.handleOut?.dy ?? 0)
    };
    const c1 = {
      x: p1.x + (p1.handleIn?.dx ?? 0),
      y: p1.y + (p1.handleIn?.dy ?? 0)
    };

    // Subdivide Bezier segment into K straight lines to find closest point on curve
    const K = 25;

    for (let j = 1; j <= K; j++) {
      const tStart = (j - 1) / K;
      const tEnd = j / K;
      const ptStart = bezierPoint(p0, c0, c1, p1, tStart);
      const ptEnd = bezierPoint(p0, c0, c1, p1, tEnd);

      const A = clickPt.x - ptStart.x;
      const B = clickPt.y - ptStart.y;
      const C = ptEnd.x - ptStart.x;
      const D = ptEnd.y - ptStart.y;

      const dotProduct = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) {
        param = dotProduct / lenSq;
      }

      let xx, yy;
      let subT;

      if (param < 0) {
        xx = ptStart.x;
        yy = ptStart.y;
        subT = tStart;
      } else if (param > 1) {
        xx = ptEnd.x;
        yy = ptEnd.y;
        subT = tEnd;
      } else {
        xx = ptStart.x + param * C;
        yy = ptStart.y + param * D;
        subT = tStart + param * (tEnd - tStart);
      }

      const distance = Math.sqrt((clickPt.x - xx) ** 2 + (clickPt.y - yy) ** 2);

      if (distance < minDistance) {
        minDistance = distance;
        nearestSegmentIndex = i;
        nearestPoint = { x: xx, y: yy };
        nearestT = subT;
      }
    }
  }

  if (minDistance <= thresholdPx) {
    return {
      segmentIndex: nearestSegmentIndex,
      point: nearestPoint,
      distance: minDistance,
      t: nearestT
    };
  }

  return null;
};
