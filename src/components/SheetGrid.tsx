import React from 'react';
import { SCALE } from '../utils/geometry';

interface SheetGridProps {
  sheetType: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  sheetCount: number;
}

export const SheetGrid: React.FC<SheetGridProps> = ({
  sheetType,
  orientation
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

  return (
    <g className="sheet-grid-group">
      <defs>
        {/* 1-inch (40px) Grid Pattern with 0.1-inch subdivisions */}
        <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
          {/* Minor lines every 4px (0.1 inch) */}
          <path d="M 4 0 L 4 40 M 8 0 L 8 40 M 12 0 L 12 40 M 16 0 L 16 40 M 20 0 L 20 40 M 24 0 L 24 40 M 28 0 L 28 40 M 32 0 L 32 40 M 36 0 L 36 40" 
                fill="none" stroke="var(--paper-grid-minor)" strokeWidth="0.5" />
          <path d="M 0 4 L 40 4 M 0 8 L 40 8 M 0 12 L 40 12 M 0 16 L 40 16 M 0 20 L 40 20 M 0 24 L 40 24 M 0 28 L 40 28 M 0 32 L 40 32 M 0 36 L 40 36" 
                fill="none" stroke="var(--paper-grid-minor)" strokeWidth="0.5" />
          {/* Major lines every 40px (1 inch) */}
          <path d="M 40 0 L 40 40 M 0 40 L 40 40" fill="none" stroke="var(--paper-grid-major)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* 1. Large seamless grid pattern covering the entire scrollable board */}
      <rect
        width={totalWidth}
        height={totalHeight}
        fill="url(#grid-pattern)"
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
                PAGE {getRowLetter(r)}-{c + 1} ({activeDim.w}" × {activeDim.h}")
              </text>
            );
          })}
        </g>
      ))}
    </g>
  );
};
