import React, { useRef, useState, useEffect } from 'react';
import type { Point, Tube } from '../utils/geometry';
import { SCALE, calculateTubeGeometry, findNearestPointOnPath, dist, generateId, formatLength } from '../utils/geometry';
import { SheetGrid } from './SheetGrid';

interface NeonCanvasProps {
  tubes: Tube[];
  setTubes: React.Dispatch<React.SetStateAction<Tube[]>>;
  selectedTubeId: string | null;
  setSelectedTubeId: (id: string | null) => void;
  tool: 'select' | 'bend' | 'cut' | 'weld' | 'add';
  isPowerOn: boolean;
  sheetType: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  sheetCount: number;
  bendRadius: number;
  useMetric: boolean;
  snapToGrid: boolean;
}

export const NeonCanvas: React.FC<NeonCanvasProps> = ({
  tubes,
  setTubes,
  selectedTubeId,
  setSelectedTubeId,
  tool,
  isPowerOn,
  sheetType,
  orientation,
  sheetCount,
  bendRadius,
  useMetric,
  snapToGrid
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0); // Default to 100% zoom

  // Panning and Spacebar states
  const [spacePressed, setSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panScrollStart, setPanScrollStart] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

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
  
  // Drag states
  const [draggingNode, setDraggingNode] = useState<{ tubeId: string; pointId: string } | null>(null);
  const [draggingTube, setDraggingTube] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPoints, setDragStartPoints] = useState<Point[] | null>(null);
  
  // Hover & Weld preview states
  const [hoveredSegment, setHoveredSegment] = useState<{
    tubeId: string;
    segmentIndex: number;
    point: { x: number; y: number };
  } | null>(null);
  
  const [weldPreview, setWeldPreview] = useState<{
    sourceTubeId: string;
    sourcePointId: string;
    targetTubeId: string;
    targetPointId: string;
    weldPos: { x: number; y: number };
  } | null>(null);

  // Helper: Get local SVG coordinates from mouse event
  const getSVGCoords = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    
    // Support coordinate scaling on zoomed svg viewBox
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  // Spacebar and standard key keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Spacebar to enable canvas panning (block standard page scroll)
      if (e.code === 'Space') {
        const active = document.activeElement;
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true');
        if (!isInput) {
          e.preventDefault();
          setSpacePressed(true);
        }
      }
      // Delete selected tube
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTubeId) {
        setTubes(prev => prev.filter(t => t.id !== selectedTubeId));
        setSelectedTubeId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedTubeId, setSelectedTubeId, setTubes]);

  // Prevent panning/space from getting stuck if browser window loses focus
  useEffect(() => {
    const handleBlur = () => {
      setSpacePressed(false);
      setIsPanning(false);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  // Global mouseup release to safely clear any panning drag operations
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Imperative non-passive wheel event handler for zooming with mouse wheel (direct scrolling!)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Current mouse coordinate relative to scroll container coordinates
      const contentX = container.scrollLeft + mouseX;
      const contentY = container.scrollTop + mouseY;

      setZoom(prevZoom => {
        const delta = -e.deltaY;
        // High-precision smooth multiplier scaling for both mice and trackpads
        const factor = 1 + Math.min(Math.max(Math.abs(delta) / 1200, 0.015), 0.08);
        let nextZoom = delta > 0 ? prevZoom * factor : prevZoom / factor;

        // Constraint scaling boundaries: 30% to 300% zoom limit
        nextZoom = Math.min(Math.max(nextZoom, 0.3), 3.0);
        nextZoom = parseFloat(nextZoom.toFixed(2));

        if (nextZoom !== prevZoom) {
          const ratio = nextZoom / prevZoom;
          requestAnimationFrame(() => {
            // Keep the exact same point under the cursor stable during zooming
            container.scrollLeft = contentX * ratio - mouseX;
            container.scrollTop = contentY * ratio - mouseY;
          });
        }
        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Handle segment hovering in Cut mode
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      if (containerRef.current) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        containerRef.current.scrollLeft = panScrollStart.left - dx;
        containerRef.current.scrollTop = panScrollStart.top - dy;
      }
      return;
    }

    const mousePos = getSVGCoords(e);

    // 1. DRAGGING NODE ACTION
    if (draggingNode) {
      const { tubeId, pointId } = draggingNode;
      let newX = mousePos.x;
      let newY = mousePos.y;

      // Grid Snapping (snap to 0.25 inch / 10px subdivisions)
      if (snapToGrid) {
        const snapUnit = 0.25 * SCALE; // 10px
        newX = Math.round(newX / snapUnit) * snapUnit;
        newY = Math.round(newY / snapUnit) * snapUnit;
      }

      // Check Weld snapping if in weld mode and dragging an endpoint
      let isSnapped = false;
      if (tool === 'weld') {
        const activeTube = tubes.find(t => t.id === tubeId);
        if (activeTube) {
          const ptIndex = activeTube.points.findIndex(p => p.id === pointId);
          const isEndpoint = ptIndex === 0 || ptIndex === activeTube.points.length - 1;
          
          if (isEndpoint) {
            // Find other tube endpoints close to current mouse pos
            for (const otherTube of tubes) {
              if (otherTube.id === tubeId) continue;
              
              const otherEnds = [
                { pt: otherTube.points[0], label: 'start' },
                { pt: otherTube.points[otherTube.points.length - 1], label: 'end' }
              ];

              for (const end of otherEnds) {
                if (dist({ x: newX, y: newY }, end.pt) < 20) {
                  // Snap to target point
                  newX = end.pt.x;
                  newY = end.pt.y;
                  isSnapped = true;
                  setWeldPreview({
                    sourceTubeId: tubeId,
                    sourcePointId: pointId,
                    targetTubeId: otherTube.id,
                    targetPointId: end.pt.id,
                    weldPos: end.pt
                  });
                  break;
                }
              }
              if (isSnapped) break;
            }
          }
        }
      }

      if (!isSnapped) {
        setWeldPreview(null);
      }

      // Update node coordinate
      setTubes(prev =>
        prev.map(t => {
          if (t.id !== tubeId) return t;
          return {
            ...t,
            points: t.points.map(p => {
              if (p.id !== pointId) return p;
              return { ...p, x: newX, y: newY };
            })
          };
        })
      );
      return;
    }

    // 2. DRAGGING ENTIRE TUBE
    if (draggingTube && dragStartPos && dragStartPoints) {
      const dx = mousePos.x - dragStartPos.x;
      const dy = mousePos.y - dragStartPos.y;

      setTubes(prev =>
        prev.map(t => {
          if (t.id !== draggingTube) return t;
          return {
            ...t,
            points: dragStartPoints.map(p => ({
              ...p,
              x: p.x + dx,
              y: p.y + dy
            }))
          };
        })
      );
      return;
    }

    // 3. HOVERING PREVIEWS
    if (tool === 'cut') {
      // Search for nearest segment to mouse
      let closestSegment: typeof hoveredSegment = null;
      let minDistance = Infinity;

      for (const tube of tubes) {
        const projection = findNearestPointOnPath(mousePos, tube.points, 20);
        if (projection && projection.distance < minDistance) {
          minDistance = projection.distance;
          closestSegment = {
            tubeId: tube.id,
            segmentIndex: projection.segmentIndex,
            point: projection.point
          };
        }
      }
      setHoveredSegment(closestSegment);
    } else {
      setHoveredSegment(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const isMiddleButton = e.button === 1;
    const isLeftButton = e.button === 0;

    // Handle spacebar + drag panning or middle-mouse-button panning
    if (isMiddleButton || (isLeftButton && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      if (containerRef.current) {
        setPanScrollStart({
          left: containerRef.current.scrollLeft,
          top: containerRef.current.scrollTop
        });
      }
      return;
    }

    if (!isLeftButton) return;

    const mousePos = getSVGCoords(e);

    // If clicking background and tool is 'add', spawn a new tube
    if (e.target === svgRef.current || (e.target as SVGElement).classList.contains('sheet-grid-group')) {
      setSelectedTubeId(null);
      
      if (tool === 'add') {
        const id = generateId();
        // Create a horizontal 4 feet (48") tube centered on the click
        const lengthPx = 48 * SCALE;
        const newTube: Tube = {
          id,
          color: '#38bdf8', // Neon blue default
          diameter: 10,
          maxLengthInches: 48,
          points: [
            { id: generateId(), x: mousePos.x - lengthPx / 4, y: mousePos.y },
            { id: generateId(), x: mousePos.x - lengthPx / 8, y: mousePos.y },
            { id: generateId(), x: mousePos.x + lengthPx / 8, y: mousePos.y },
            { id: generateId(), x: mousePos.x + lengthPx / 4, y: mousePos.y }
          ]
        };
        setTubes(prev => [...prev, newTube]);
        setSelectedTubeId(id);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Handle Snapped Weld Operation on Mouse Up
    if (tool === 'weld' && weldPreview) {
      const { sourceTubeId, sourcePointId, targetTubeId, targetPointId } = weldPreview;
      
      const sourceTube = tubes.find(t => t.id === sourceTubeId);
      const targetTube = tubes.find(t => t.id === targetTubeId);

      if (sourceTube && targetTube) {
        const sPoints = [...sourceTube.points];
        const tPoints = [...targetTube.points];

        const sIsStart = sPoints[0].id === sourcePointId;
        const sIsEnd = sPoints[sPoints.length - 1].id === sourcePointId;
        const tIsStart = tPoints[0].id === targetPointId;
        const tIsEnd = tPoints[tPoints.length - 1].id === targetPointId;

        let mergedPoints: Point[] = [];

        if (sIsStart && tIsStart) {
          // Reverse target, prepend to source
          mergedPoints = [...tPoints.reverse(), ...sPoints.slice(1)];
        } else if (sIsStart && tIsEnd) {
          // Target appends directly to source start
          mergedPoints = [...tPoints, ...sPoints.slice(1)];
        } else if (sIsEnd && tIsStart) {
          // Target appends directly to source end
          mergedPoints = [...sPoints, ...tPoints.slice(1)];
        } else if (sIsEnd && tIsEnd) {
          // Target reversed appends to source end
          mergedPoints = [...sPoints, ...tPoints.reverse().slice(1)];
        }

        // Clean up points (giving them unique IDs just in case, but keep coords)
        const finalPoints = mergedPoints.map((pt) => ({
          ...pt,
          id: pt.id || generateId()
        }));

        setTubes(prev => {
          // Remove target tube, update source tube points
          return prev
            .filter(t => t.id !== targetTubeId)
            .map(t => {
              if (t.id !== sourceTubeId) return t;
              return {
                ...t,
                points: finalPoints
              };
            });
        });
        setSelectedTubeId(sourceTubeId);
      }
      setWeldPreview(null);
    }

    setDraggingNode(null);
    setDraggingTube(null);
    setDragStartPos(null);
    setDragStartPoints(null);
  };

  // Perform split/cut on click in Cut mode
  const handleSegmentClick = (e: React.MouseEvent<SVGElement>, tubeId: string, segmentIndex: number, cutPt: { x: number; y: number }) => {
    e.stopPropagation();
    if (tool !== 'cut') return;

    const targetTube = tubes.find(t => t.id === tubeId);
    if (!targetTube) return;

    const points = targetTube.points;
    
    // Split the points into two arrays:
    // Left part: points 0 to segmentIndex, plus the new cut point
    // Right part: the new cut point, plus points segmentIndex + 1 to end
    const cutNodeId1 = generateId();
    const cutNodeId2 = generateId();
    
    const leftPoints: Point[] = [
      ...points.slice(0, segmentIndex + 1),
      { id: cutNodeId1, x: cutPt.x, y: cutPt.y }
    ];

    const rightPoints: Point[] = [
      { id: cutNodeId2, x: cutPt.x, y: cutPt.y },
      ...points.slice(segmentIndex + 1)
    ];

    const id1 = targetTube.id; // Recycle existing tube ID for left segment
    const id2 = generateId();  // New ID for right segment

    const tube2: Tube = {
      ...targetTube,
      id: id2,
      points: rightPoints
    };

    setTubes(prev => {
      return prev
        .map(t => {
          if (t.id === id1) {
            return { ...t, points: leftPoints };
          }
          return t;
        })
        .concat(tube2);
    });

    setHoveredSegment(null);
    setSelectedTubeId(id2); // Select the newly created tube section
  };

  // Start dragging an entire tube
  const handleTubeMouseDown = (e: React.MouseEvent<SVGElement>, tube: Tube) => {
    if (e.button === 1) {
      // Allow middle click propagation so canvas panning intercepts it!
      return;
    }
    e.stopPropagation();
    setSelectedTubeId(tube.id);
    
    if (e.button === 0 && tool === 'select') {
      const mousePos = getSVGCoords(e as unknown as React.MouseEvent<SVGSVGElement>);
      setDraggingTube(tube.id);
      setDragStartPos(mousePos);
      setDragStartPoints([...tube.points]);
    }
  };

  // Node actions (dragging or right-clicking to delete)
  const handleNodeMouseDown = (e: React.MouseEvent<SVGCircleElement>, tubeId: string, pointId: string) => {
    if (e.button === 1) {
      // Allow middle click propagation so canvas panning intercepts it!
      return;
    }
    e.stopPropagation();
    setSelectedTubeId(tubeId);
    
    if (e.button === 0 && (tool === 'select' || tool === 'bend' || tool === 'weld')) {
      setDraggingNode({ tubeId, pointId });
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent<SVGCircleElement>, tubeId: string, pointId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Right-click a node to delete it (middle nodes only, endpoints cannot be deleted without splitting/cutting)
    const targetTube = tubes.find(t => t.id === tubeId);
    if (!targetTube) return;

    if (targetTube.points.length <= 2) {
      // Cannot delete if only 2 points left
      return;
    }

    const ptIndex = targetTube.points.findIndex(p => p.id === pointId);
    const isEndpoint = ptIndex === 0 || ptIndex === targetTube.points.length - 1;
    
    if (isEndpoint) {
      // Let's allow shortening the tube by deleting endpoints
      setTubes(prev =>
        prev.map(t => {
          if (t.id !== tubeId) return t;
          return {
            ...t,
            points: t.points.filter(p => p.id !== pointId)
          };
        })
      );
    } else {
      // Middle node deletion makes it go straight
      setTubes(prev =>
        prev.map(t => {
          if (t.id !== tubeId) return t;
          return {
            ...t,
            points: t.points.filter(p => p.id !== pointId)
          };
        })
      );
    }
  };

  // Add middle point via segment double-click
  const handleSegmentDoubleClick = (e: React.MouseEvent<SVGElement>, tubeId: string, _segmentIndex: number) => {
    e.stopPropagation();
    if (tool !== 'select' && tool !== 'bend') return;

    const mousePos = getSVGCoords(e as unknown as React.MouseEvent<SVGSVGElement>);
    const targetTube = tubes.find(t => t.id === tubeId);
    if (!targetTube) return;

    // Projection to insert node exactly on line segment
    const points = targetTube.points;
    const projection = findNearestPointOnPath(mousePos, points, 50);

    if (projection) {
      const newNodeId = generateId();
      const newPoints = [
        ...points.slice(0, projection.segmentIndex + 1),
        { id: newNodeId, x: projection.point.x, y: projection.point.y },
        ...points.slice(projection.segmentIndex + 1)
      ];

      setTubes(prev =>
        prev.map(t => {
          if (t.id !== tubeId) return t;
          return { ...t, points: newPoints };
        })
      );
      
      // Start dragging the new node immediately!
      setDraggingNode({ tubeId, pointId: newNodeId });
    }
  };

  // Render glowing tubes
  const renderTubes = () => {
    return tubes.map(tube => {
      const isSelected = tube.id === selectedTubeId;
      const { pathData, physicalLengthInches } = calculateTubeGeometry(tube.points, bendRadius);
      const isOverLength = physicalLengthInches > tube.maxLengthInches;
      
      // Responsive stroke diameters based on commercial sizes (8mm, 10mm, 12mm, 15mm)
      // Visual scale: 10mm = 8px stroke
      const strokeWidth = (tube.diameter / 10) * 8;

      return (
        <g key={tube.id} className={`glass-tube ${isSelected ? 'selected' : ''}`}>
          
          {/* 1. Interactive wider invisible backing line for easy clicks */}
          <path
            d={pathData}
            fill="none"
            stroke="transparent"
            strokeWidth="24"
            cursor={tool === 'cut' ? 'crosshair' : 'pointer'}
            onMouseDown={(e) => handleTubeMouseDown(e, tube)}
            onDoubleClick={(e) => {
              // Double click to add a node on the segment
              // We need to calculate which segment was clicked
              if (svgRef.current) {
                const mousePos = getSVGCoords(e as unknown as React.MouseEvent<SVGSVGElement>);
                const proj = findNearestPointOnPath(mousePos, tube.points, 40);
                if (proj) {
                  handleSegmentDoubleClick(e, tube.id, proj.segmentIndex);
                }
              }
            }}
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
                onClick={(e) => handleSegmentClick(e, tube.id, hoveredSegment.segmentIndex, hoveredSegment.point)}
              />
            </g>
          )}

          {/* 8. Length Indicator Tag (Floating Badge) */}
          {isSelected && tube.points.length >= 2 && (
            <g transform={`translate(${tube.points[0].x}, ${tube.points[0].y - 20})`}>
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

          {/* 9. Control Nodes & Handles */}
          {isSelected && tube.points.map((pt, index) => {
            const isEnd = index === 0 || index === tube.points.length - 1;
            const isNodeHovered = draggingNode?.pointId === pt.id;

            return (
              <circle
                key={pt.id}
                cx={pt.x}
                cy={pt.y}
                r={isEnd ? (isNodeHovered ? 9 : 7) : (isNodeHovered ? 7 : 5.5)}
                fill={isEnd ? '#10b981' : '#c084fc'}
                stroke="#ffffff"
                strokeWidth="1.5"
                cursor="move"
                style={{ transition: 'r 0.1s ease', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                onMouseDown={(e) => handleNodeMouseDown(e, tube.id, pt.id)}
                onContextMenu={(e) => handleNodeContextMenu(e, tube.id, pt.id)}
              />
            );
          })}
        </g>
      );
    });
  };

  return (
    <div ref={containerRef} className="canvas-container" style={{
      flex: 1,
      height: '100%',
      backgroundColor: 'var(--bg-workbench)',
      position: 'relative',
      overflow: 'auto',
      padding: '80px',
      cursor: isPanning ? 'grabbing' : (spacePressed ? 'grab' : (tool === 'cut' ? 'crosshair' : 'default'))
    }}>
      <svg
        ref={svgRef}
        width={(totalWidth + 160) * zoom}
        height={(totalHeight + 120) * zoom}
        viewBox={`0 0 ${totalWidth + 160} ${totalHeight + 120}`}
        style={{
          display: 'block',
          margin: 'auto',
          backgroundColor: 'var(--bg-workbench)',
          backgroundImage: 'radial-gradient(var(--border-glass) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)',
          transition: 'width 0.1s ease, height 0.1s ease'
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <g transform="translate(80, 50)">
          {/* Renders the A4/Letter Graph Sheet Paper */}
          <SheetGrid
            sheetType={sheetType}
            orientation={orientation}
            sheetCount={sheetCount}
          />
          
          {/* Renders the neon/glass tubes */}
          {renderTubes()}
 
          {/* Snapping weld preview indicator */}
          {tool === 'weld' && weldPreview && (
            <g transform={`translate(${weldPreview.weldPos.x}, ${weldPreview.weldPos.y})`}>
              <circle
                r="14"
                fill="rgba(16, 185, 129, 0.25)"
                stroke="#10b981"
                strokeWidth="1.5"
                style={{ animation: 'grid-pulse 0.8s infinite' }}
              />
              <circle r="3" fill="#10b981" />
            </g>
          )}
        </g>
      </svg>
 
      {/* Floating Instructions/Status Badge */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        padding: '10px 16px',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isPowerOn ? 'var(--accent-green)' : 'var(--text-muted)',
            boxShadow: isPowerOn ? '0 0 8px var(--accent-green)' : 'none'
          }} />
          <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
            Studio System: {isPowerOn ? 'ONLINE (Humming)' : 'STANDBY'}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {tool === 'select' && '🖱️ Drag lines to reposition. Double-click line to add bend node.'}
          {tool === 'bend' && '🟣 Drag control nodes to bend glass. Right-click node to delete.'}
          {tool === 'cut' && '✂️ Hover over glass segments and click to slice tube.'}
          {tool === 'weld' && '🟢 Drag endpoints together to snap & weld separate tubes.'}
          {tool === 'add' && '➕ Click on sheets to spawn a new 4ft horizontal tube.'}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '4px', borderTop: '1px solid var(--border-glass)', paddingTop: '4px' }}>
          💡 Scroll wheel zooms. Hold Space + Drag or press Middle Mouse button to pan.
        </span>
      </div>
 
      {/* Scale Ruler (Bottom-Left Corner) */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'var(--mono)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 20
      }}>
        <span>SCALE:</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '120px', height: '6px', borderLeft: '1px solid var(--text-secondary)', borderRight: '1px solid var(--text-secondary)', borderBottom: '1px solid var(--text-secondary)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', height: '4px', width: '1px', backgroundColor: 'var(--text-secondary)', bottom: '0' }} />
          </div>
          <span style={{ fontSize: '9px', marginTop: '2px' }}>3.0 feet (120px)</span>
        </div>
      </div>
 
      {/* Floating Zoom Controls Widget (Bottom-Right Corner) */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        padding: '6px 10px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 20
      }}>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.3))}
          title="Zoom Out (Scroll Down)"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
        >
          ➖
        </button>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--mono)',
          color: 'var(--text-primary)',
          fontWeight: 'bold',
          minWidth: '40px',
          textAlign: 'center'
        }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.min(prev + 0.1, 3.0))}
          title="Zoom In (Scroll Up)"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
        >
          ➕
        </button>
        <button
          onClick={() => setZoom(1.0)}
          title="Reset to 100%"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-secondary)',
            padding: '0 8px',
            height: '28px',
            borderRadius: '4px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
            outline: 'none'
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
