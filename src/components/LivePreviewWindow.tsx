import React, { useState, useEffect } from 'react';
import { useSideMenu } from '../store/useSideMenu';
import { useCanvas } from '../store/useCanvas';
import { calculateTubeGeometry, SCALE } from '../utils/geometry';

export const LivePreviewWindow: React.FC = () => {
  const {
    sheetType,
    orientation,
    bendRadius,
    setIsPreviewOpen
  } = useSideMenu();

  const { tubes, isPowerOn } = useCanvas();

  // Position and Size states
  const [position, setPosition] = useState({ x: 400, y: 100 });
  const [size, setSize] = useState({ w: 340, h: 260 });

  // Drag states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [windowStart, setWindowStart] = useState({ x: 0, y: 0 });

  // Resize states
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState({ w: 0, h: 0 });
  const [resizeStartMouse, setResizeStartMouse] = useState({ x: 0, y: 0 });

  // Auto-center positioning on mount
  useEffect(() => {
    const initialX = Math.max(40, window.innerWidth - 340 - 40 - (window.innerWidth > 1000 ? 360 : 0));
    setPosition({ x: initialX, y: 80 });
  }, []);

  // Dragging event loop handler
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      let newX = windowStart.x + dx;
      let newY = windowStart.y + dy;

      const maxX = window.innerWidth - size.w - 10;
      const maxY = window.innerHeight - size.h - 10;

      newX = Math.max(10, Math.min(newX, maxX));
      newY = Math.max(10, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, windowStart, size]);

  // Resizing event loop handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartMouse.x;
      const dy = e.clientY - resizeStartMouse.y;

      let newW = resizeStartSize.w + dx;
      let newH = resizeStartSize.h + dy;

      // Enforce premium size boundaries
      newW = Math.max(240, Math.min(newW, 800));
      newH = Math.max(180, Math.min(newH, 600));

      setSize({ w: newW, h: newH });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartMouse, resizeStartSize]);

  // Dimensions in inches
  const dimsInches = {
    letter: { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } },
    a4: { portrait: { w: 8.27, h: 11.69 }, landscape: { w: 11.69, h: 8.27 } }
  };

  const activeDim = dimsInches[sheetType][orientation];
  const widthPx = activeDim.w * SCALE;
  const heightPx = activeDim.h * SCALE;

  const cols = 6;
  const rows = 5;
  const totalWidth = cols * widthPx;
  const totalHeight = rows * heightPx;

  const svgW = totalWidth + 160;
  const svgH = totalHeight + 120;

  // Calculate exact bounding box of all tubes' curves to auto-zoom and maximize fit
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  tubes.forEach(t => {
    if (t.points.length === 0) return;
    
    // Add the first point
    const pFirst = t.points[0];
    if (pFirst.x < minX) minX = pFirst.x;
    if (pFirst.x > maxX) maxX = pFirst.x;
    if (pFirst.y < minY) minY = pFirst.y;
    if (pFirst.y > maxY) maxY = pFirst.y;

    for (let i = 0; i < t.points.length - 1; i++) {
      const p0 = t.points[i];
      const p1 = t.points[i + 1];

      const c0 = {
        x: p0.x + (p0.handleOut?.dx ?? 0),
        y: p0.y + (p0.handleOut?.dy ?? 0)
      };
      const c1 = {
        x: p1.x + (p1.handleIn?.dx ?? 0),
        y: p1.y + (p1.handleIn?.dy ?? 0)
      };

      // Add intermediate bezier points to bounding box calculation
      const N = 15; // 15 steps per segment is plenty fast and very accurate
      for (let j = 1; j <= N; j++) {
        const tVal = j / N;
        const mt = 1 - tVal;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = tVal * tVal;
        const t3 = t2 * tVal;

        const bx = mt3 * p0.x + 3 * mt2 * tVal * c0.x + 3 * mt * t2 * c1.x + t3 * p1.x;
        const by = mt3 * p0.y + 3 * mt2 * tVal * c0.y + 3 * mt * t2 * c1.y + t3 * p1.y;

        if (bx < minX) minX = bx;
        if (bx > maxX) maxX = bx;
        if (by < minY) minY = by;
        if (by > maxY) maxY = by;
      }
    }
  });

  const hasTubes = tubes.length > 0 && minX !== Infinity;
  // Dynamic padding based on tube diameter to ensure outer glow isn't clipped
  let maxDiameter = 12;
  tubes.forEach(t => {
    if (t.diameter > maxDiameter) maxDiameter = t.diameter;
  });
  const strokeWidthBase = (maxDiameter / 10) * 8;
  const padding = Math.max(50, strokeWidthBase * 8); // generous glow boundary safety

  const viewBoxX = hasTubes ? minX - padding : 0;
  const viewBoxY = hasTubes ? minY - padding : 0;
  const viewBoxW = hasTubes ? (maxX - minX) + padding * 2 : svgW;
  const viewBoxH = hasTubes ? (maxY - minY) + padding * 2 : svgH;

  const handleHeaderMouseDown = (e: React.MouseEvent) => {

    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setWindowStart({ x: position.x, y: position.y });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation(); // Stop propagation so we do not trigger drag!
    setIsResizing(true);
    setResizeStartMouse({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ w: size.w, h: size.h });
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.w}px`,
        height: `${size.h}px`,
        backgroundColor: 'rgba(10, 12, 16, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        zIndex: 500, // Floats above workspace but under Print Modal (1000)
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          height: '38px',
          minHeight: '38px',
          padding: '0 12px 0 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'move'
        }}
      >
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            letterSpacing: '0.8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ✨ Live Neon Glow
        </span>

        {/* Close Button */}
        <button
          onClick={() => setIsPreviewOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          ✖
        </button>
      </div>

      {/* Glow Workbench Viewport Screen */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#050608', // pure solid black background makes neon pop!
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {tubes.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No glass tubes to preview
          </div>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
            style={{
              display: 'block',
              background: 'transparent'
            }}
          >
            {tubes.map((t) => {

                const { pathData } = calculateTubeGeometry(t.points, bendRadius);
                const strokeWidth = (t.diameter / 10) * 8;

                return (
                  <g key={t.id}>
                    {/* 1. Ambient backglow reflection */}
                    {isPowerOn && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke={t.color}
                        strokeWidth={strokeWidth * 4.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.08"
                        style={{ filter: 'blur(16px)', pointerEvents: 'none' }}
                      />
                    )}

                    {/* 2. Outer Neon Glow overlay */}
                    {isPowerOn && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke={t.color}
                        strokeWidth={strokeWidth * 2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.55"
                        style={{
                          filter: `drop-shadow(0 0 ${strokeWidth * 0.4}px ${t.color})`,
                          pointerEvents: 'none'
                        }}
                      />
                    )}

                    {/* 3. Main Glass Tube Shell */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isPowerOn ? t.color : '#475569'}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isPowerOn ? 0.9 : 0.65}
                      style={{
                        transition: 'stroke 0.3s ease, opacity 0.3s ease',
                        pointerEvents: 'none'
                      }}
                    />

                    {/* 4. Glowing core gas inside tube */}
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
                  </g>
                );
              })}
          </svg>
        )}

      </div>

      {/* Resize Handle Grid Grabber in Bottom Right corner */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: '0',
          right: '0',
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '0 3px 3px 0',
          pointerEvents: 'auto'
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M8,1 L1,8 M9,4 L4,9 M9,7 L7,9"
            stroke="var(--text-muted)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
};
