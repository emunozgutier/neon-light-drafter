import React from 'react';
import type { Point as GeometryPoint } from '../../utils/geometry';

interface PointProps {
  tubeId: string;
  pt: GeometryPoint;
  index: number;
  totalPoints: number;
  draggingNode: { tubeId: string; pointId: string } | null;
  draggingHandle: { tubeId: string; pointId: string; handleType: 'in' | 'out' } | null;
  onNodeMouseDown: (e: React.MouseEvent<SVGCircleElement>, tubeId: string, pointId: string) => void;
  onNodeContextMenu: (e: React.MouseEvent<SVGCircleElement>, tubeId: string, pointId: string) => void;
  onHandleMouseDown: (e: React.MouseEvent<SVGCircleElement>, tubeId: string, pointId: string, handleType: 'in' | 'out') => void;
  onDeleteNode: (tubeId: string, pointId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isFocused?: boolean;
}

export const Point: React.FC<PointProps> = ({
  tubeId,
  pt,
  index,
  totalPoints,
  draggingNode,
  draggingHandle,
  onNodeMouseDown,
  onNodeContextMenu,
  onHandleMouseDown,
  onDeleteNode,
  onMouseEnter,
  onMouseLeave,
  isFocused,
}) => {
  const isNodeHovered = draggingNode?.pointId === pt.id;
  const isHandleHovered = draggingHandle?.pointId === pt.id;
  const isDragging = isNodeHovered || isHandleHovered;
  const isEnd = index === 0 || index === totalPoints - 1;

  const hasHandleIn = pt.handleIn && (pt.handleIn.dx !== 0 || pt.handleIn.dy !== 0);
  const hasHandleOut = pt.handleOut && (pt.handleOut.dx !== 0 || pt.handleOut.dy !== 0);

  const inX = pt.x + (pt.handleIn?.dx ?? 0);
  const inY = pt.y + (pt.handleIn?.dy ?? 0);
  const outX = pt.x + (pt.handleOut?.dx ?? 0);
  const outY = pt.y + (pt.handleOut?.dy ?? 0);

  // Calculate dynamic bounding box coordinates for edit mode dashed rectangle, rotated to match handles
  let angle = 0;
  if (hasHandleOut && index < totalPoints - 1 && pt.handleOut) {
    angle = Math.atan2(pt.handleOut.dy, pt.handleOut.dx);
  } else if (hasHandleIn && index > 0 && pt.handleIn) {
    angle = Math.atan2(-pt.handleIn.dy, -pt.handleIn.dx);
  }

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Project global point into local space rotated by angle centered at pt
  const toLocal = (gx: number, gy: number) => {
    const dx = gx - pt.x;
    const dy = gy - pt.y;
    return {
      x: dx * cos + dy * sin,
      y: -dx * sin + dy * cos,
    };
  };

  const pad = isEnd ? 10 : 8;
  const localXCoords: number[] = [-pad, pad];
  const localYCoords: number[] = [-pad, pad];

  if (totalPoints > 2) {
    const delLocal = toLocal(pt.x + 11, pt.y - 11);
    localXCoords.push(delLocal.x - 10, delLocal.x + 10);
    localYCoords.push(delLocal.y - 10, delLocal.y + 10);
  }

  if (hasHandleIn && index > 0) {
    const inLocal = toLocal(inX, inY);
    localXCoords.push(inLocal.x - 8, inLocal.x + 8);
    localYCoords.push(inLocal.y - 8, inLocal.y + 8);
  }

  if (hasHandleOut && index < totalPoints - 1) {
    const outLocal = toLocal(outX, outY);
    localXCoords.push(outLocal.x - 8, outLocal.x + 8);
    localYCoords.push(outLocal.y - 8, outLocal.y + 8);
  }

  const minX = Math.min(...localXCoords);
  const maxX = Math.max(...localXCoords);
  const minY = Math.min(...localYCoords);
  const maxY = Math.max(...localYCoords);

  const rectX = minX - 6;
  const rectY = minY - 6;
  const rectW = (maxX - minX) + 12;
  const rectH = (maxY - minY) + 12;

  const angleInDegrees = (angle * 180) / Math.PI;

  return (
    <g
      className={`point-control-group ${isDragging || isFocused ? 'active' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Invisible large hover catcher (makes it easy to hover nearby handles without losing state) */}
      <circle
        cx={pt.x}
        cy={pt.y}
        r="18"
        fill="none"
        pointerEvents="all"
        style={{ cursor: 'pointer' }}
      />

      {/* Dashed Circle: shown when NOT in edit mode */}
      <circle
        className="non-edit-dash-indicator"
        cx={pt.x}
        cy={pt.y}
        r={isEnd ? 12 : 10}
        fill="none"
        stroke={isEnd ? "#10b981" : "#38bdf8"}
        strokeWidth="1.2"
        strokeDasharray="3 3"
        style={{ pointerEvents: 'none' }}
      />

      {/* Dashed Rectangle: shown when in edit mode */}
      <rect
        className="edit-dash-indicator"
        x={rectX}
        y={rectY}
        width={rectW}
        height={rectH}
        rx="6"
        ry="6"
        fill="none"
        stroke="rgba(192, 132, 252, 0.7)"
        strokeWidth="1.2"
        strokeDasharray="4 3"
        transform={`translate(${pt.x}, ${pt.y}) rotate(${angleInDegrees})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Invisible thick line and circle catchers for handles to bridge the hover space */}
      {hasHandleIn && index > 0 && (
        <>
          <line
            className="handle-catcher"
            x1={pt.x}
            y1={pt.y}
            x2={inX}
            y2={inY}
            stroke="none"
            strokeWidth="60"
            style={{ cursor: 'pointer' }}
          />
          <circle
            className="handle-catcher"
            cx={inX}
            cy={inY}
            r="30"
            fill="none"
            style={{ cursor: 'pointer' }}
          />
        </>
      )}

      {hasHandleOut && index < totalPoints - 1 && (
        <>
          <line
            className="handle-catcher"
            x1={pt.x}
            y1={pt.y}
            x2={outX}
            y2={outY}
            stroke="none"
            strokeWidth="60"
            style={{ cursor: 'pointer' }}
          />
          <circle
            className="handle-catcher"
            cx={outX}
            cy={outY}
            r="30"
            fill="none"
            style={{ cursor: 'pointer' }}
          />
        </>
      )}

      {/* Handle connector lines */}
      {hasHandleIn && index > 0 && (
        <line
          className="handle-line"
          x1={pt.x}
          y1={pt.y}
          x2={inX}
          y2={inY}
          stroke="rgba(192, 132, 252, 0.75)"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {hasHandleOut && index < totalPoints - 1 && (
        <line
          className="handle-line"
          x1={pt.x}
          y1={pt.y}
          x2={outX}
          y2={outY}
          stroke="rgba(192, 132, 252, 0.75)"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Handle incoming control knob */}
      {hasHandleIn && index > 0 && (
        <circle
          className="handle-knob"
          cx={inX}
          cy={inY}
          r="4.5"
          fill="#c084fc"
          stroke="#ffffff"
          strokeWidth="1.5"
          cursor="pointer"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}
          onMouseDown={(e) => onHandleMouseDown(e, tubeId, pt.id, 'in')}
        />
      )}

      {/* Handle outgoing control knob */}
      {hasHandleOut && index < totalPoints - 1 && (
        <circle
          className="handle-knob"
          cx={outX}
          cy={outY}
          r="4.5"
          fill="#c084fc"
          stroke="#ffffff"
          strokeWidth="1.5"
          cursor="pointer"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}
          onMouseDown={(e) => onHandleMouseDown(e, tubeId, pt.id, 'out')}
        />
      )}

      {/* Main Anchor Point Knob */}
      <circle
        cx={pt.x}
        cy={pt.y}
        r={isEnd ? (isNodeHovered ? 8.5 : 6.5) : (isNodeHovered ? 7.5 : 5.5)}
        fill={isEnd ? '#10b981' : '#38bdf8'}
        stroke="#ffffff"
        strokeWidth="1.5"
        cursor="move"
        style={{ transition: 'r 0.1s ease', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
        onMouseDown={(e) => onNodeMouseDown(e, tubeId, pt.id)}
        onContextMenu={(e) => onNodeContextMenu(e, tubeId, pt.id)}
      />

      {/* Delete Node Button (Cross X) - Rendered only when tube has more than 2 points */}
      {totalPoints > 2 && (
        <g
          className="delete-node-btn"
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDeleteNode(tubeId, pt.id);
          }}
        >
          {/* Small circular backing */}
          <circle
            cx={pt.x + 11}
            cy={pt.y - 11}
            r="7.5"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="1.2"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
          />
          {/* Cross X shapes */}
          <line
            x1={pt.x + 8.5}
            y1={pt.y - 13.5}
            x2={pt.x + 13.5}
            y2={pt.y - 8.5}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1={pt.x + 13.5}
            y1={pt.y - 13.5}
            x2={pt.x + 8.5}
            y2={pt.y - 8.5}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
};
