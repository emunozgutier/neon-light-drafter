import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { NeonCanvas } from './components/NeonCanvas';
import { useCanvas, encodeTubes } from './store/useCanvas';
import { useSideMenu } from './store/useSideMenu';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { calculateTubeGeometry, SCALE } from './utils/geometry';
import { LivePreviewWindow } from './components/LivePreviewWindow';
import './App.css';

function App() {
  const tubes = useCanvas((state) => state.tubes);
  const {
    sheetType,
    orientation,
    bendRadius,
    printRotation,
    isPreviewOpen,
    refImageSrc,
    refImageOpacity,
    refImageScaleX,
    refImageScaleY,
    refImageX,
    refImageY,
    refImageAspectRatio
  } = useSideMenu();

  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Calibration dimensions in inches for target paper
  const dimsInches = {
    letter: { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } },
    a4: { portrait: { w: 8.27, h: 11.69 }, landscape: { w: 11.69, h: 8.27 } }
  };

  const activeDim = dimsInches[sheetType][orientation];
  const widthPx = activeDim.w * SCALE;
  const heightPx = activeDim.h * SCALE;

  // Sync tubes in real-time to URL hash dynamically
  useEffect(() => {
    const encoded = encodeTubes(tubes);
    if (encoded) {
      window.history.replaceState(null, '', '#' + encoded);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [tubes]);

  // Recover off-sheet / negative-coordinate drawings on initial load to center on Page A-1
  useEffect(() => {
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

    // Check if drawing is off the entire 6x5 drafting grid board
    const isOffSheet = maxX < 0 || minX > 6 * widthPx || maxY < 0 || minY > 5 * heightPx;

    if (isOffSheet) {
      const designCenterX = (minX + maxX) / 2;
      const designCenterY = (minY + maxY) / 2;

      const targetCenterX = widthPx / 2;
      const targetCenterY = heightPx / 2;

      const dx = Math.round(targetCenterX - designCenterX);
      const dy = Math.round(targetCenterY - designCenterY);

      useCanvas.getState().setTubes(prev =>
        prev.map(t => ({
          ...t,
          points: t.points.map(p => ({
            ...p,
            x: Math.round(p.x + dx),
            y: Math.round(p.y + dy)
          }))
        })),
        true // Skip history on recovery
      );

      // Translate reference image in sync
      const currentX = useSideMenu.getState().refImageX;
      const currentY = useSideMenu.getState().refImageY;
      useSideMenu.getState().setRefImageX(Math.round(currentX + dx));
      useSideMenu.getState().setRefImageY(Math.round(currentY + dy));
    }
  }, [tubes, widthPx, heightPx]);

  return (
    <>
      <div className="app-container">
        {/* Telemetry Panel / Controls Sidebar */}
        <Sidebar onOpenPrint={() => setIsPrintOpen(true)} />

        {/* Interactive Vector Editor Workspace */}
        <NeonCanvas />
      </div>

      {/* 1:1 Scale Print Output Node (Hidden by default, shown strictly inside @media print) */}
      <div className="print-only-container">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${widthPx} ${heightPx}`}
          style={{ display: 'block', background: 'transparent' }}
        >
          {/* Tubes outlines (Rotatable group) */}
          <g transform={`rotate(${printRotation}, ${widthPx / 2}, ${heightPx / 2})`}>
            {refImageSrc && (
              <image
                href={refImageSrc}
                x={refImageX}
                y={refImageY}
                width={1000 * refImageScaleX}
                height={1000 * refImageScaleY * refImageAspectRatio}
                opacity={refImageOpacity}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {tubes.map((t) => {
              const { pathData } = calculateTubeGeometry(t.points, bendRadius);
              const strokeWidth = (t.diameter / 10) * 8;

              return (
                <g key={t.id}>
                  {/* 1. Bending Template rendering (Thick solid black line with centerline guide) */}
                  <g className="print-bending-path">
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#000000"
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="2 3"
                      opacity="0.85"
                    />
                    {/* Anchor points circles to assist bending start/stops */}
                    {t.points.map((p, idx) => (
                      <circle
                        key={p.id}
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill={idx === 0 || idx === t.points.length - 1 ? '#ef4444' : '#3b82f6'}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    ))}
                  </g>

                  {/* 2. Neon Showcase rendering (Vibrant ambient neon glow mockup) */}
                  <g className="print-showcase-path">
                    {/* Ambient neon backglow reflection */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={t.color}
                      strokeWidth={strokeWidth * 3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.15"
                    />
                    {/* Main outer glow overlay */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={t.color}
                      strokeWidth={strokeWidth * 1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.6"
                    />
                    {/* Outer neon curve path shell */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={t.color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                    {/* High illumination white gas core filament */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={strokeWidth * 0.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.98"
                    />
                  </g>
                </g>
              );
            })}
          </g>

          {/* 1:1 Scale CAD Calibration Box (CAD standard block for physical scaling check) */}
          <g transform={`translate(${widthPx - 60}, ${heightPx - 60})`}>
            <rect
              width="40"
              height="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.3" />
            <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.3" />
            <text
              x="20"
              y="18"
              textAnchor="middle"
              fill="currentColor"
              fontSize="6.5"
              fontWeight="bold"
            >
              1 INCH
            </text>
            <text
              x="20"
              y="28"
              textAnchor="middle"
              fill="currentColor"
              fontSize="5"
              fontWeight="600"
            >
              CALIBRATION
            </text>
          </g>
        </svg>
      </div>

      {/* Interactive print shop centering modal */}
      {isPrintOpen && <PrintPreviewModal onClose={() => setIsPrintOpen(false)} />}

      {/* Floating draggable/resizable Live Neon Glow Preview */}
      {isPreviewOpen && <LivePreviewWindow />}
    </>
  );
}

export default App;
