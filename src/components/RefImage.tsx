import React from 'react';

interface RefImageProps {
  refImageSrc: string;
  refImageX: number;
  refImageY: number;
  refImageScaleX: number;
  refImageScaleY: number;
  refImageAspectRatio: number;
  refImageOpacity: number;
  isRefImageLocked: boolean;
  setIsRefImageLocked: (l: boolean) => void;
  onMouseDown: (e: React.MouseEvent<SVGImageElement>) => void;
  onHandleMouseDown: (handle: string, e: React.MouseEvent<SVGCircleElement>) => void;
}

export const RefImage: React.FC<RefImageProps> = ({
  refImageSrc,
  refImageX,
  refImageY,
  refImageScaleX,
  refImageScaleY,
  refImageAspectRatio,
  refImageOpacity,
  isRefImageLocked,
  setIsRefImageLocked,
  onMouseDown,
  onHandleMouseDown,
}) => {
  const w = 1000 * refImageScaleX;
  const h = 1000 * refImageScaleY * refImageAspectRatio;

  // Midpoints
  const halfW = w / 2;
  const halfH = h / 2;

  // Handles configuration
  const handles = [
    { name: 'tl', cx: refImageX, cy: refImageY, cursor: 'nwse-resize' },
    { name: 'tc', cx: refImageX + halfW, cy: refImageY, cursor: 'ns-resize' },
    { name: 'tr', cx: refImageX + w, cy: refImageY, cursor: 'nesw-resize' },
    { name: 'rc', cx: refImageX + w, cy: refImageY + halfH, cursor: 'ew-resize' },
    { name: 'br', cx: refImageX + w, cy: refImageY + h, cursor: 'nwse-resize' },
    { name: 'bc', cx: refImageX + halfW, cy: refImageY + h, cursor: 'ns-resize' },
    { name: 'bl', cx: refImageX, cy: refImageY + h, cursor: 'nesw-resize' },
    { name: 'lc', cx: refImageX, cy: refImageY + halfH, cursor: 'ew-resize' },
  ];

  return (
    <g>
      <image
        href={refImageSrc}
        x={refImageX}
        y={refImageY}
        width={w}
        height={h}
        opacity={refImageOpacity}
        style={{
          pointerEvents: isRefImageLocked ? 'none' : 'auto',
          cursor: isRefImageLocked ? 'default' : 'move',
        }}
        onMouseDown={onMouseDown}
      />
      {!isRefImageLocked && (
        <>
          <g style={{ pointerEvents: 'none' }}>
            {/* Subtle pulsing background outline */}
            <rect
              x={refImageX}
              y={refImageY}
              width={w}
              height={h}
              fill="rgba(192, 132, 252, 0.03)"
              stroke="var(--accent-purple)"
              strokeWidth="2"
              strokeDasharray="6 4"
              style={{
                animation: 'image-border-glow 2s infinite ease-in-out',
              }}
            />

            {/* Helper Badge to guide the user */}
            <g transform={`translate(${refImageX + 12}, ${refImageY + 28})`}>
              <rect
                width="180"
                height="26"
                rx="4"
                fill="var(--bg-sidebar)"
                stroke="var(--accent-purple)"
                strokeWidth="1"
                opacity="0.9"
              />
              <text
                x="90"
                y="16.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="600"
              >
                🖐️ Drag Canvas / Handles to Fit
              </text>
            </g>
          </g>

          {/* 8 Interactive Stretch Handles */}
          {handles.map((hnd) => (
            <circle
              key={hnd.name}
              className="ref-image-handle"
              cx={hnd.cx}
              cy={hnd.cy}
              r="6.5"
              fill="#ffffff"
              stroke="var(--accent-purple)"
              strokeWidth="2.5"
              style={{
                cursor: hnd.cursor,
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onHandleMouseDown(hnd.name, e);
              }}
            />
          ))}

          {/* Floating Lock Button on Canvas (Interactive!) */}
          <g
            className="canvas-lock-btn"
            transform={`translate(${refImageX + w - 36}, ${refImageY + 12})`}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsRefImageLocked(true);
            }}
          >
            <title>Lock Tracing Guide</title>
            <circle
              cx="14"
              cy="14"
              r="16"
              fill="var(--bg-sidebar)"
              stroke="var(--accent-purple)"
              strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
            />
            <text
              x="14"
              y="19"
              textAnchor="middle"
              fontSize="14"
            >
              🔒
            </text>
          </g>
        </>
      )}
    </g>
  );
};
