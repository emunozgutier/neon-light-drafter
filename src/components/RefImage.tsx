import React from 'react';

interface RefImageProps {
  refImageSrc: string;
  refImageX: number;
  refImageY: number;
  refImageScale: number;
  refImageAspectRatio: number;
  refImageOpacity: number;
  isRefImageLocked: boolean;
  setIsRefImageLocked: (l: boolean) => void;
  onMouseDown: (e: React.MouseEvent<SVGImageElement>) => void;
}

export const RefImage: React.FC<RefImageProps> = ({
  refImageSrc,
  refImageX,
  refImageY,
  refImageScale,
  refImageAspectRatio,
  refImageOpacity,
  isRefImageLocked,
  setIsRefImageLocked,
  onMouseDown,
}) => {
  return (
    <g>
      <image
        href={refImageSrc}
        x={refImageX}
        y={refImageY}
        width={1000 * refImageScale}
        height={1000 * refImageScale * refImageAspectRatio}
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
              width={1000 * refImageScale}
              height={1000 * refImageScale * refImageAspectRatio}
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
                🖐️ Drag Image to Reposition
              </text>
            </g>
          </g>

          {/* Floating Lock Button on Canvas (Interactive!) */}
          <g
            className="canvas-lock-btn"
            transform={`translate(${refImageX + 1000 * refImageScale - 36}, ${refImageY + 12})`}
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
