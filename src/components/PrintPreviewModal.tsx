import React, { useState } from 'react';
import { useSideMenu } from '../store/useSideMenu';
import { useCanvas } from '../store/useCanvas';
import { calculateTubeGeometry, SCALE } from '../utils/geometry';

interface PrintPreviewModalProps {
  onClose: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ onClose }) => {
  const {
    sheetType,
    setSheetType,
    orientation,
    setOrientation,
    bendRadius,
    useMetric,
    printRotation,
    setPrintRotation
  } = useSideMenu();

  const {
    tubes,
    setTubes,
    saveHistory
  } = useCanvas();

  // Modal configuration states
  const [printStyle, setPrintStyle] = useState<'bending' | 'showcase'>('bending');
  const [showControlPoints, setShowControlPoints] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dimensions in inches
  const dimsInches = {
    letter: { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } },
    a4: { portrait: { w: 8.27, h: 11.69 }, landscape: { w: 11.69, h: 8.27 } }
  };

  const activeDim = dimsInches[sheetType][orientation];
  const widthPx = activeDim.w * SCALE;
  const heightPx = activeDim.h * SCALE;

  // Visual aspect ratio and scaling for the modal preview screen
  const maxPreviewWidth = 480;
  const maxPreviewHeight = 480;
  const previewScale = Math.min(maxPreviewWidth / widthPx, maxPreviewHeight / heightPx);
  const scaledWidth = widthPx * previewScale;
  const scaledHeight = heightPx * previewScale;

  // Helper to rotate vectors by the print rotation angle (counteracting the display tilt)
  const rotateVector = (vx: number, vy: number, angleDegrees: number) => {
    const rad = -angleDegrees * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: vx * cos - vy * sin,
      y: vx * sin + vy * cos
    };
  };

  // Auto-Center math
  const handleAutoCenter = () => {
    if (tubes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    tubes.forEach(t => {
      t.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });

    if (minX === Infinity) return;

    const designCenterX = (minX + maxX) / 2;
    const designCenterY = (minY + maxY) / 2;

    const targetCenterX = widthPx / 2;
    const targetCenterY = heightPx / 2;

    const dx = targetCenterX - designCenterX;
    const dy = targetCenterY - designCenterY;

    // Apply translation to store directly so it shifts visually instantly!
    setTubes(prev =>
      prev.map(t => ({
        ...t,
        points: t.points.map(p => ({
          ...p,
          x: Math.round(p.x + dx),
          y: Math.round(p.y + dy)
        }))
      }))
    );
  };

  // Automatically trigger auto-center when the modal mounts if the design is currently off-sheet/off-screen
  React.useEffect(() => {
    if (tubes.length === 0) return;
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    tubes.forEach(t => {
      t.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });

    if (minX === Infinity) return;

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    const isOffSheet = contentCenterX < 0 || contentCenterX > widthPx || contentCenterY < 0 || contentCenterY > heightPx;

    if (isOffSheet) {
      handleAutoCenter();
    }
  }, []);

  // Micro adjustments in pixels (e.g. 5px steps or 1px shifts)
  const handleTranslate = (dx: number, dy: number, skipHistory = false) => {
    setTubes(prev =>
      prev.map(t => ({
        ...t,
        points: t.points.map(p => ({
          ...p,
          x: Math.round(p.x + dx),
          y: Math.round(p.y + dy)
        }))
      }))
    , skipHistory);
  };

  // Interactive mouse dragging of tubes right on the preview sheet SVG
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (tubes.length === 0) return;
    saveHistory();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / previewScale;
    const dy = (e.clientY - dragStart.y) / previewScale;

    if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
      // Compensate for preview sheet visual rotation
      const rotated = rotateVector(dx, dy, printRotation);
      handleTranslate(rotated.x, rotated.y, true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const triggerPrint = () => {
    // Inject the print target format in body class so custom CSS applies
    document.body.classList.add(`print-format-${sheetType}`, `print-orient-${orientation}`, `print-style-${printStyle}`);
    
    // Tiny timeout to let style layout register
    setTimeout(() => {
      window.print();
      // Remove temporary print configurations on finish
      document.body.classList.remove(`print-format-${sheetType}`, `print-orient-${orientation}`, `print-style-${printStyle}`);
    }, 100);
  };

  // Calculate current bounding center of design for info panel display
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  tubes.forEach(t => {
    t.points.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
  });
  const hasContent = minX !== Infinity;
  const contentW = hasContent ? (maxX - minX) / SCALE : 0;
  const contentH = hasContent ? (maxY - minY) / SCALE : 0;
  const contentCenterX = hasContent ? (minX + maxX) / 2 : 0;
  const contentCenterY = hasContent ? (minY + maxY) / 2 : 0;

  // Let's check how close the design is centered to the page:
  const isCloseToCenter = hasContent && 
    Math.abs(contentCenterX - widthPx / 2) < 2 && 
    Math.abs(contentCenterY - heightPx / 2) < 2;

  // Metric conversion helpers for coordinates output
  const formatInchesOrMetric = (valInches: number) => {
    if (useMetric) {
      return `${(valInches * 2.54).toFixed(1)} cm`;
    }
    return `${valInches.toFixed(2)}"`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 7, 10, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div style={{
        width: '920px',
        height: '620px',
        backgroundColor: '#12151c',
        borderRadius: '16px',
        border: '1px solid var(--border-glass)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        display: 'flex',
        overflow: 'hidden',
        color: 'var(--text-primary)',
        fontFamily: 'var(--sans)'
      }}>
        {/* Left Side: Visual Interactive Paper Preview Area */}
        <div style={{
          flex: 1,
          backgroundColor: '#0a0c10',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          borderRight: '1px solid var(--border-glass)',
          position: 'relative'
        }}>
          {/* Visual Workspace Watermark Grid */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '24px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-muted)',
            fontWeight: '600'
          }}>
            1:1 Real Scale Printable Paper
          </div>

          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '24px',
            fontSize: '10.5px',
            color: '#38bdf8',
            fontWeight: '500',
            fontStyle: 'italic',
            opacity: 0.75
          }}>
            💡 Drag elements inside the sheet below to adjust position manually!
          </div>

          {/* Interactive Bending Sheet Preview Container */}
          <div 
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              backgroundColor: printStyle === 'showcase' ? '#12151c' : '#ffffff',
              border: printStyle === 'showcase' ? '1px dashed rgba(255,255,255,0.2)' : '1px solid #d1d5db',
              boxShadow: printStyle === 'showcase' 
                ? '0 16px 40px rgba(56, 189, 248, 0.15)' 
                : '0 16px 40px rgba(0, 0, 0, 0.4)',
              transition: 'background-color 0.3s, box-shadow 0.3s',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              position: 'relative'
            }}
          >
            {/* SVG Bending Outline Renderer */}
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${widthPx} ${heightPx}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ display: 'block', userSelect: 'none' }}
            >
              {/* Paper light layout grid overlay (only bending outline template mode) */}
              {printStyle === 'bending' && (
                <g opacity="0.35">
                  {/* Vertical lines */}
                  {Array.from({ length: Math.ceil(activeDim.w) }).map((_, i) => {
                    const x = i * SCALE;
                    return <line key={`v-${i}`} x1={x} y1={0} x2={x} y2={heightPx} stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="3 3" />;
                  })}
                  {/* Horizontal lines */}
                  {Array.from({ length: Math.ceil(activeDim.h) }).map((_, i) => {
                    const y = i * SCALE;
                    return <line key={`h-${i}`} x1={0} y1={y} x2={widthPx} y2={y} stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="3 3" />;
                  })}
                </g>
              )}

              {/* Showcase Grid pattern if neon showcase */}
              {printStyle === 'showcase' && (
                <g opacity="0.1">
                  {/* Dark-themed visual coordinate lines */}
                  {Array.from({ length: Math.ceil(activeDim.w) }).map((_, i) => (
                    <line key={`sv-${i}`} x1={i * SCALE} y1={0} x2={i * SCALE} y2={heightPx} stroke="#38bdf8" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: Math.ceil(activeDim.h) }).map((_, i) => (
                    <line key={`sh-${i}`} x1={0} y1={i * SCALE} x2={widthPx} y2={i * SCALE} stroke="#38bdf8" strokeWidth="0.5" />
                  ))}
                </g>
              )}

              {/* RENDER TUBES ON SHEET PREVIEW (Rotatable group) */}
              <g transform={`rotate(${printRotation}, ${widthPx / 2}, ${heightPx / 2})`}>
                {tubes.map(t => {
                  const { pathData } = calculateTubeGeometry(t.points, bendRadius);
                  const strokeWidth = (t.diameter / 10) * 8;

                  if (printStyle === 'bending') {
                  // Bending Template Mode: Pristine High-Contrast Shop Drawing (Solid Outlines)
                  return (
                    <g key={t.id}>
                      {/* Main solid black bending curve contour */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#000000"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Inner guide centerline to trace alignment precise bending arcs */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="2 3"
                        opacity="0.8"
                      />
                      {/* Control Node points to let fabricator see segment divisions */}
                      {showControlPoints && t.points.map((p, idx) => (
                        <circle
                          key={p.id}
                          cx={p.x}
                          cy={p.y}
                          r="3"
                          fill={idx === 0 || idx === t.points.length - 1 ? '#ef4444' : '#3b82f6'}
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                      ))}
                    </g>
                  );
                } else {
                  // Neon Showcase Mode: Dark ambient glowing preview
                  return (
                    <g key={t.id}>
                      {/* Neon glow */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={t.color}
                        strokeWidth={strokeWidth * 3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.15"
                        style={{ filter: 'blur(12px)' }}
                      />
                      <path
                        d={pathData}
                        fill="none"
                        stroke={t.color}
                        strokeWidth={strokeWidth * 1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                        style={{ filter: 'drop-shadow(0 0 4px ' + t.color + ')' }}
                      />
                      {/* Tube outline */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={t.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                      {/* Glowing white core filament */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={strokeWidth * 0.25}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.95"
                      />
                    </g>
                  );
                }
              })}
              </g>

              {/* 1:1 Scale Calibration Block (CAD Standard) */}
              <g transform={`translate(${widthPx - 60}, ${heightPx - 60})`} style={{ pointerEvents: 'none' }}>
                <rect
                  width="40"
                  height="40"
                  fill="none"
                  stroke={printStyle === 'showcase' ? '#38bdf8' : '#000000'}
                  strokeWidth="1.5"
                />
                {/* Visual grid markings inside block */}
                <line x1="20" y1="0" x2="20" y2="40" stroke={printStyle === 'showcase' ? 'rgba(56,189,248,0.3)' : 'rgba(0,0,0,0.2)'} strokeWidth="0.5" />
                <line x1="0" y1="20" x2="40" y2="20" stroke={printStyle === 'showcase' ? 'rgba(56,189,248,0.3)' : 'rgba(0,0,0,0.2)'} strokeWidth="0.5" />
                
                <text
                  x="20"
                  y="18"
                  textAnchor="middle"
                  fill={printStyle === 'showcase' ? '#fafafa' : '#000000'}
                  fontSize="6.5"
                  fontWeight="bold"
                >
                  1 INCH
                </text>
                <text
                  x="20"
                  y="28"
                  textAnchor="middle"
                  fill={printStyle === 'showcase' ? '#94a3b8' : '#4b5563'}
                  fontSize="5"
                  fontWeight="600"
                >
                  CALIBRATION
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Right Side: Alignment Control Panel HUD */}
        <div style={{
          width: '380px',
          backgroundColor: '#12151c',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#ffffff' }}>🖨️ Print Shop Preview</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Centering, margins, and CAD calibration</p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
                borderRadius: '50%',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            
            {/* Sheet Settings */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Paper Layout Settings
              </span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Format</span>
                  <select
                    value={sheetType}
                    onChange={(e) => setSheetType(e.target.value as any)}
                    style={{
                      width: '100%',
                      height: '30px',
                      backgroundColor: '#1b1d26',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      padding: '0 6px',
                      outline: 'none'
                    }}
                  >
                    <option value="letter">Letter (8.5" × 11")</option>
                    <option value="a4">A4 (8.27" × 11.69")</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Orientation</span>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    style={{
                      width: '100%',
                      height: '30px',
                      backgroundColor: '#1b1d26',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      padding: '0 6px',
                      outline: 'none'
                    }}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Design Tilt & Rotation */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                📐 Design Tilt & Rotation
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Rotation Angle:</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                  {printRotation}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={printRotation}
                onChange={(e) => setPrintRotation(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent-purple)',
                  marginBottom: '10px',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[-90, 0, 90, 180].map((angle) => (
                  <button
                    key={angle}
                    onClick={() => setPrintRotation(angle)}
                    style={{
                      flex: 1,
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: printRotation === angle ? 'rgba(192, 132, 252, 0.15)' : '#1b1d26',
                      border: printRotation === angle ? '1px solid var(--accent-purple)' : '1px solid var(--border-glass)',
                      color: printRotation === angle ? 'var(--accent-purple)' : 'var(--text-secondary)',
                      fontSize: '10.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {angle === 0 ? 'Reset (0°)' : `${angle > 0 ? '+' : ''}${angle}°`}
                  </button>
                ))}
              </div>
            </div>

            {/* Print Aesthetics Settings */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Print Style & Aesthetic
              </span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={() => setPrintStyle('bending')}
                  style={{
                    flex: 1,
                    height: '30px',
                    borderRadius: '4px',
                    backgroundColor: printStyle === 'bending' ? 'var(--accent-purple)' : '#1b1d26',
                    border: printStyle === 'bending' ? 'none' : '1px solid var(--border-glass)',
                    color: printStyle === 'bending' ? '#0d0f12' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  📐 Bending Template
                </button>
                <button
                  onClick={() => setPrintStyle('showcase')}
                  style={{
                    flex: 1,
                    height: '30px',
                    borderRadius: '4px',
                    backgroundColor: printStyle === 'showcase' ? 'var(--accent-purple)' : '#1b1d26',
                    border: printStyle === 'showcase' ? 'none' : '1px solid var(--border-glass)',
                    color: printStyle === 'showcase' ? '#0d0f12' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  ✨ Neon Showcase
                </button>
              </div>

              {printStyle === 'bending' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    checked={showControlPoints}
                    onChange={(e) => setShowControlPoints(e.target.checked)}
                    style={{ accentColor: 'var(--accent-purple)' }}
                  />
                  Print Curve Anchor Control Nodes
                </label>
              )}
            </div>

            {/* Bounding telemetry and center state */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Layout Positioning Status
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Design Bounding Box:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: '600' }}>
                    {formatInchesOrMetric(contentW)} × {formatInchesOrMetric(contentH)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Centered Status:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: isCloseToCenter ? 'var(--accent-green)' : '#ef4444' 
                  }}>
                    {isCloseToCenter ? '🎯 Perfectly Centered' : '⚠️ Misaligned / Off-Center'}
                  </span>
                </div>
              </div>
            </div>

            {/* Align & Center Controllers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleAutoCenter}
                disabled={!hasContent}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1.5px dashed rgba(56, 189, 248, 0.4)',
                  color: 'var(--accent-blue)',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: hasContent ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: 'none',
                  opacity: hasContent ? 1 : 0.4
                }}
                onMouseEnter={(e) => {
                  if (hasContent) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasContent) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                🎯 Auto-Center Design on Page
              </button>

              {/* D-Pad Micro translation buttons */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
                  Micro Nudge (Translate Nodes)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gridTemplateRows: 'repeat(2, 30px)', gap: '4px', justifyContent: 'center' }}>
                  <div />
                  <button
                    onClick={() => { const r = rotateVector(0, -5, printRotation); handleTranslate(r.x, r.y); }}
                    title="Move Up 5px"
                    style={{ height: '30px', width: '30px', borderRadius: '4px', border: '1px solid var(--border-glass)', backgroundColor: '#1b1d26', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ▲
                  </button>
                  <div />
                  <button
                    onClick={() => { const r = rotateVector(-5, 0, printRotation); handleTranslate(r.x, r.y); }}
                    title="Move Left 5px"
                    style={{ height: '30px', width: '30px', borderRadius: '4px', border: '1px solid var(--border-glass)', backgroundColor: '#1b1d26', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => { const r = rotateVector(0, 5, printRotation); handleTranslate(r.x, r.y); }}
                    title="Move Down 5px"
                    style={{ height: '30px', width: '30px', borderRadius: '4px', border: '1px solid var(--border-glass)', backgroundColor: '#1b1d26', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => { const r = rotateVector(5, 0, printRotation); handleTranslate(r.x, r.y); }}
                    title="Move Right 5px"
                    style={{ height: '30px', width: '30px', borderRadius: '4px', border: '1px solid var(--border-glass)', backgroundColor: '#1b1d26', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ▶
                  </button>
                </div>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '6px' }}>nudge increments are 5 pixels (~0.125 inches)</span>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                height: '42px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
            >
              Cancel
            </button>
            <button
              onClick={triggerPrint}
              disabled={!hasContent}
              style={{
                flex: 2,
                height: '42px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-purple)',
                border: 'none',
                color: '#0d0f12',
                fontSize: '13.5px',
                fontWeight: 'bold',
                cursor: hasContent ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(192, 132, 252, 0.4)',
                opacity: hasContent ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (hasContent) {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(192, 132, 252, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (hasContent) {
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(192, 132, 252, 0.4)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              🖨️ Print 1:1 Scale Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
