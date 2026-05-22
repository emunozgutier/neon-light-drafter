import React from 'react';
import type { Tube } from '../../utils/geometry';
import { calculateTubeGeometry, formatLength } from '../../utils/geometry';

interface LineProps {
  tube: Tube;
  isSelected: boolean;
  isPowerOn: boolean;
  tool: 'select' | 'bend' | 'cut' | 'weld' | 'add';
  bendRadius: number;
  useMetric: boolean;
  hoveredSegment: { tubeId: string; segmentIndex: number; point: { x: number; y: number } } | null;
  onTubeMouseDown: (e: React.MouseEvent<SVGPathElement>, tube: Tube) => void;
  onSegmentDoubleClick: (e: React.MouseEvent<SVGPathElement>, tube: Tube) => void;
  onSegmentClick: (e: React.MouseEvent<SVGElement>, tubeId: string, segmentIndex: number, point: { x: number; y: number }) => void;
}

export const Line: React.FC<LineProps> = ({
  tube,
  isSelected,
  isPowerOn,
  tool,
  bendRadius,
  useMetric,
  hoveredSegment,
  onTubeMouseDown,
  onSegmentDoubleClick,
  onSegmentClick,
}) => {
  const { pathData, physicalLengthInches } = calculateTubeGeometry(tube.points, bendRadius);
  const isOverLength = physicalLengthInches > tube.maxLengthInches;
  
  // Responsive stroke diameters based on commercial sizes (8mm, 10mm, 12mm, 15mm)
  // Visual scale: 10mm = 8px stroke
  const strokeWidth = (tube.diameter / 10) * 8;

  return (
    <g className={`glass-tube ${isSelected ? 'selected' : ''}`}>
      {/* 1. Interactive wider invisible backing line for easy clicks */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth="24"
        cursor={tool === 'cut' ? 'crosshair' : 'pointer'}
        onMouseDown={(e) => onTubeMouseDown(e, tube)}
        onDoubleClick={(e) => onSegmentDoubleClick(e, tube)}
      />

      {/* 2. Ambient background glow reflections (neon power only) */}
      {isPowerOn && (
        <path
          d={pathData}
          fill="none"
          stroke={tube.color}
          strokeWidth={strokeWidth * 4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.08"
          style={{ filter: 'blur(16px)', pointerEvents: 'none' }}
        />
      )}

      {/* 3. Outer Neon Glow overlay */}
      {isPowerOn && (
        <path
          d={pathData}
          fill="none"
          stroke={tube.color}
          strokeWidth={strokeWidth * 2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
          className="glowing"
          style={{
            color: tube.color,
            filter: `drop-shadow(0 0 ${strokeWidth * 0.4}px ${tube.color})`,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* 4. Main Glass Tube Shell */}
      <path
        d={pathData}
        fill="none"
        stroke={isPowerOn ? tube.color : '#475569'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isPowerOn ? 0.9 : 0.65}
        style={{
          transition: 'stroke 0.3s ease, opacity 0.3s ease',
          pointerEvents: 'none'
        }}
      />

      {/* 5. Glowing core gas inside tube (neon power only) */}
      {isPowerOn && (
        <path
          d={pathData}
          fill="none"
          stroke="#ffffff"
          strokeWidth={strokeWidth * 0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 6. Physical boundary warning glow (Turns orange/red if length exceeds limits) */}
      {isOverLength && (
        <path
          d={pathData}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth * 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 6"
          opacity="0.6"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 7. Hover Cut Indicator Overlay */}
      {tool === 'cut' && hoveredSegment && hoveredSegment.tubeId === tube.id && (
        <g>
          <line
            x1={hoveredSegment.point.x}
            y1={hoveredSegment.point.y - 12}
            x2={hoveredSegment.point.x}
            y2={hoveredSegment.point.y + 12}
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeDasharray="3 2"
          />
          <circle
            cx={hoveredSegment.point.x}
            cy={hoveredSegment.point.y}
            r="18"
            fill="transparent"
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            style={{ cursor: 'cell', animation: 'grid-pulse 1s infinite' }}
            onClick={(e) => onSegmentClick(e, tube.id, hoveredSegment.segmentIndex, hoveredSegment.point)}
          />
        </g>
      )}

      {/* 8. Length Indicator Tag (Floating Badge) */}
      {isSelected && tube.points.length >= 2 && (
        <g transform={`translate(${tube.points[0].x}, ${tube.points[0].y - 20})`} style={{ pointerEvents: 'none' }}>
          <rect
            x="-40"
            y="-18"
            width="80"
            height="22"
            rx="4"
            fill="#1e293b"
            stroke={isOverLength ? '#ef4444' : '#6b7280'}
            strokeWidth="1"
            opacity="0.9"
          />
          <text
            x="0"
            y="-3"
            textAnchor="middle"
            fill={isOverLength ? '#f87171' : '#f8fafc'}
            fontSize="9.5"
            fontWeight="600"
            fontFamily="var(--mono)"
          >
            {formatLength(physicalLengthInches, useMetric)}
          </text>
        </g>
      )}
    </g>
  );
};
