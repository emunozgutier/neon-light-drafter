import React from 'react';
import { SCALE } from '../utils/geometry';

interface SheetGridProps {
  sheetType: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  sheetCount: number;
  useMetric?: boolean;
}

export const SheetGrid: React.FC<SheetGridProps> = ({
  sheetType,
  orientation,
  useMetric = false
}) => {
  // Dimensions in inches
  const dimsInches = {
    letter: { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } },
    a4: { portrait: { w: 8.27, h: 11.69 }, landscape: { w: 11.69, h: 8.27 } }
  };

  const activeDim = dimsInches[sheetType][orientation];
  const widthPx = activeDim.w * SCALE;
  const heightPx = activeDim.h * SCALE;

  // Render a spacious 6x5 print grid of pages side by side
  const cols = 6;
  const rows = 5;
  const totalWidth = cols * widthPx;
  const totalHeight = rows * heightPx;

  // Helper to generate row letters: 0 -> A, 1 -> B, 2 -> C...
  const getRowLetter = (r: number) => String.fromCharCode(65 + r);

  // Dynamic grid pattern spacing
  const cmPx = SCALE / 2.54; // ~15.748 px
  const patternSize = useMetric ? cmPx : 40;
  const subdivisions = 10;
  const step = patternSize / subdivisions;

  // Memoized minor lines representation
  const minorPaths = React.useMemo(() => {
    let d = '';
    // Vertical minor lines
    for (let i = 1; i < subdivisions; i++) {
      const coord = i * step;
      d += `M ${coord} 0 L ${coord} ${patternSize} `;
    }
    // Horizontal minor lines
    for (let i = 1; i < subdivisions; i++) {
      const coord = i * step;
      d += `M 0 ${coord} L ${patternSize} ${coord} `;
    }
    return d;
  }, [patternSize, step, subdivisions]);

  const patternId = useMetric ? 'grid-pattern-metric' : 'grid-pattern-imperial';

  return (
    <g className="sheet-grid-group">
      <defs>
        {/* Dynamic Grid Pattern (Imperial or Metric) */}
        <pattern 
          id={patternId} 
          width={patternSize} 
          height={patternSize} 
          patternUnits="userSpaceOnUse"
        >
          {/* Minor lines (0.1 inch or 1 mm) */}
          <path 
            d={minorPaths} 
            fill="none" 
            stroke="var(--paper-grid-minor)" 
            strokeWidth="0.5" 
          />
          {/* Major lines (1 inch or 1 cm) */}
          <path 
            d={`M ${patternSize} 0 L ${patternSize} ${patternSize} M 0 ${patternSize} L ${patternSize} ${patternSize}`} 
            fill="none" 
            stroke="var(--paper-grid-major)" 
            strokeWidth="1" 
          />
        </pattern>
      </defs>

      {/* 1. Large seamless grid pattern covering the entire scrollable board */}
      <rect
        width={totalWidth}
        height={totalHeight}
        fill={`url(#${patternId})`}
      />

      {/* 2. Vertical Page Break dashed lines */}
      {Array.from({ length: cols - 1 }).map((_, c) => {
        const x = (c + 1) * widthPx;
        return (
          <line
            key={`v-break-${c}`}
            x1={x}
            y1={0}
            x2={x}
            y2={totalHeight}
            stroke="var(--paper-grid-margin)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            opacity="0.6"
          />
        );
      })}

      {/* 3. Horizontal Page Break dashed lines */}
      {Array.from({ length: rows - 1 }).map((_, r) => {
        const y = (r + 1) * heightPx;
        return (
          <line
            key={`h-break-${r}`}
            x1={0}
            y1={y}
            x2={totalWidth}
            y2={y}
            stroke="var(--paper-grid-margin)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            opacity="0.6"
          />
        );
      })}

      {/* 4. Outer Boundary solid border representing the edge of the large drafting board */}
      <rect
        width={totalWidth}
        height={totalHeight}
        fill="none"
        stroke="var(--paper-grid-margin)"
        strokeWidth="2.5"
        opacity="0.85"
      />

      {/* 5. Elegant page break indicator coordinates / watermarks in the corners */}
      {Array.from({ length: rows }).map((_, r) => (
        <g key={`row-labels-${r}`}>
          {Array.from({ length: cols }).map((_, c) => {
            const labelX = c * widthPx + 16;
            const labelY = r * heightPx + 24;
            return (
              <text
                key={`page-label-${r}-${c}`}
                x={labelX}
                y={labelY}
                fill="var(--text-muted)"
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--mono)"
                opacity="0.45"
                letterSpacing="1px"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                PAGE {getRowLetter(r)}-{c + 1} {useMetric 
                  ? `(${(activeDim.w * 2.54).toFixed(1)} cm × ${(activeDim.h * 2.54).toFixed(1)} cm)` 
                  : `(${activeDim.w}" × ${activeDim.h}")`
                }
              </text>
            );
          })}
        </g>
      ))}
    </g>
  );
};
