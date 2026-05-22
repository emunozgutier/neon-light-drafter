export interface Point {
  x: number;
  y: number;
  id: string;
  isFixed?: boolean;
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
 * Calculates the exact SVG path and physical length of a glass tube,
 * taking into account rounded bends at intermediate control points.
 */
export const calculateTubeGeometry = (
  points: Point[],
  radiusInches: number = 0.75 // Default bend radius of 0.75 inches for glass
): { pathData: string; physicalLengthInches: number; arcDetails: { center: {x:number, y:number}, radius: number }[] } => {
  if (points.length === 0) {
    return { pathData: '', physicalLengthInches: 0, arcDetails: [] };
  }
  if (points.length === 1) {
    return { pathData: `M ${points[0].x} ${points[0].y}`, physicalLengthInches: 0, arcDetails: [] };
  }

  const R = radiusInches * SCALE; // Radius in pixels
  let pathData = `M ${points[0].x} ${points[0].y}`;
  let straightLengthPx = 0;
  let arcLengthPx = 0;
  const arcDetails: { center: {x:number, y:number}, radius: number }[] = [];

  // If only 2 points, it's a straight line
  if (points.length === 2) {
    const length = dist(points[0], points[1]);
    return {
      pathData: `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`,
      physicalLengthInches: pxToInches(length),
      arcDetails: []
    };
  }

  // Multi-point path with rounded corners
  const activePoints = points;
  let currentStart: { x: number; y: number } = activePoints[0];

  for (let i = 1; i < activePoints.length - 1; i++) {
    const A = activePoints[i - 1];
    const B = activePoints[i];
    const C = activePoints[i + 1];

    // Vectors
    const u = { x: A.x - B.x, y: A.y - B.y };
    const v = { x: C.x - B.x, y: C.y - B.y };

    const distA = dist(A, B);
    const distC = dist(C, B);

    if (distA < 0.1 || distC < 0.1) {
      continue;
    }

    // Normalize
    const uHat = { x: u.x / distA, y: u.y / distA };
    const vHat = { x: v.x / distC, y: v.y / distC };

    // Dot product & Angle
    const dot = uHat.x * vHat.x + uHat.y * vHat.y;
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const beta = Math.acos(clampedDot); // Angle ABC in radians

    // If angle is straight or near-straight, do not round
    if (beta > Math.PI - 0.05 || beta < 0.05) {
      pathData += ` L ${B.x} ${B.y}`;
      straightLengthPx += dist(currentStart, B);
      currentStart = B;
      continue;
    }

    // Turn angle
    const phi = Math.PI - beta;

    // Tangent length T = R * tan(phi / 2)
    let T = R * Math.tan(phi / 2);

    // Safety: cap tangent length to 45% of segment lengths to avoid overlapping arcs
    const maxT = Math.min(distA, distC) * 0.45;
    let actualR = R;
    if (T > maxT) {
      T = maxT;
      actualR = T / Math.tan(phi / 2);
    }

    // Tangent points
    const S = { x: B.x + uHat.x * T, y: B.y + uHat.y * T };
    const E = { x: B.x + vHat.x * T, y: B.y + vHat.y * T };

    // Line from currentStart to tangent start S
    pathData += ` L ${S.x} ${S.y}`;
    straightLengthPx += dist(currentStart, S);

    // Arc from S to E
    // Determing Sweep Flag using 2D cross product of normalized direction vectors
    // dir1 (B -> S) and dir2 (B -> E)
    const cross = uHat.x * vHat.y - uHat.y * vHat.x;
    const sweepFlag = cross < 0 ? 1 : 0;

    pathData += ` A ${actualR} ${actualR} 0 0 ${sweepFlag} ${E.x} ${E.y}`;
    
    // Add physical arc length
    const arcLen = actualR * phi;
    arcLengthPx += arcLen;

    // Store arc details for display if needed
    arcDetails.push({
      center: B, // Approximate center of bend
      radius: actualR
    });

    currentStart = E;
  }

  // Final line segment to last point
  const lastPoint = activePoints[activePoints.length - 1];
  pathData += ` L ${lastPoint.x} ${lastPoint.y}`;
  straightLengthPx += dist(currentStart, lastPoint);

  const totalLengthPx = straightLengthPx + arcLengthPx;

  return {
    pathData,
    physicalLengthInches: pxToInches(totalLengthPx),
    arcDetails
  };
};

/**
 * Finds the nearest point on a polyline segment to a click coordinate.
 * Used for inserting new control points or cutting segments.
 */
export const findNearestPointOnPath = (
  clickPt: { x: number; y: number },
  points: Point[],
  thresholdPx: number = 20
): { segmentIndex: number; point: { x: number; y: number }; distance: number } | null => {
  let minDistance = Infinity;
  let nearestSegmentIndex = -1;
  let nearestPoint = { x: 0, y: 0 };

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const A = clickPt.x - p1.x;
    const B = clickPt.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;

    const dotProduct = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dotProduct / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = p1.x;
      yy = p1.y;
    } else if (param > 1) {
      xx = p2.x;
      yy = p2.y;
    } else {
      xx = p1.x + param * C;
      yy = p1.y + param * D;
    }

    const distance = Math.sqrt((clickPt.x - xx) ** 2 + (clickPt.y - yy) ** 2);

    if (distance < minDistance) {
      minDistance = distance;
      nearestSegmentIndex = i;
      nearestPoint = { x: xx, y: yy };
    }
  }

  if (minDistance <= thresholdPx) {
    return {
      segmentIndex: nearestSegmentIndex,
      point: nearestPoint,
      distance: minDistance
    };
  }

  return null;
};
