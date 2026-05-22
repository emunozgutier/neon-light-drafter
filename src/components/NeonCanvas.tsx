import React, { useRef, useState, useEffect } from 'react';
import type { Point, Tube } from '../utils/geometry';
import { SCALE, findNearestPointOnPath, dist, generateId, bezierTangent } from '../utils/geometry';
import { SheetGrid } from './SheetGrid';
import { Line } from './Canvas/Line';
import { Point as PointComponent } from './Canvas/Point';
import { RefImage } from './RefImage';

import { useSideMenu } from '../store/useSideMenu';
import { useCanvas } from '../store/useCanvas';

export const NeonCanvas: React.FC = () => {
  const {
    sheetType,
    orientation,
    sheetCount,
    bendRadius,
    useMetric,
    snapToGrid,
    refImageSrc,
    refImageOpacity,
    refImageScaleX,
    refImageScaleY,
    setRefImageScaleX,
    setRefImageScaleY,
    refImageX,
    setRefImageX,
    refImageY,
    setRefImageY,
    isRefImageLocked,
    setIsRefImageLocked,
    refImageAspectRatio,
  } = useSideMenu();

  const {
    tubes,
    setTubes,
    selectedTubeId,
    setSelectedTubeId,
    tool,
    isPowerOn,
  } = useCanvas();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0); // Default to 100% zoom

  // High-performance smooth animation refs
  const targetZoomRef = useRef<number>(1.0);
  const currentZoomRef = useRef<number>(1.0);
  const animationFrameRef = useRef<number | null>(null);
  const zoomFocalPointRef = useRef<{
    mouseX: number;
    mouseY: number;
    unscaledX: number;
    unscaledY: number;
  } | null>(null);

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

  // Bezier curve handle and ghost point states
  const [draggingHandle, setDraggingHandle] = useState<{ tubeId: string; pointId: string; handleType: 'in' | 'out' } | null>(null);
  const [hoveredGhostPoint, setHoveredGhostPoint] = useState<{ x: number; y: number; segmentIndex: number; t: number; tubeId: string } | null>(null);
  
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

  // Tracing image dragging states
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const [imageDragStart, setImageDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingRefImageHandle, setDraggingRefImageHandle] = useState<string | null>(null);
  const [refImageDragStartParams, setRefImageDragStartParams] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  // Point hover/edit mode tracking to prevent adding points on click
  const [isHoveringPoint, setIsHoveringPoint] = useState<boolean>(false);
  const [hoverDisabled, setHoverDisabled] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlapping points arrow key selection states
  const [nearbyPoints, setNearbyPoints] = useState<string[]>([]);
  const [activeCycleIndex, setActiveCycleIndex] = useState<number>(-1);

  const handlePointMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoveringPoint(true);
  };

  const handlePointMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Match the 800ms CSS grace period
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoveringPoint(false);
      hoverTimeoutRef.current = null;
    }, 800);
  };

  // Clean up pending hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Helper: Get local SVG coordinates from mouse event
  const getSVGCoords = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    
    // Support coordinate scaling on zoomed svg viewBox and subtract group translation offset (translate(80, 50))
    return {
      x: (e.clientX - rect.left) / zoom - 80,
      y: (e.clientY - rect.top) / zoom - 50
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
      // Escape key to dismiss edit mode instantly
      if (e.key === 'Escape') {
        setIsHoveringPoint(false);
        setHoverDisabled(true);
        setDraggingNode(null);
        setDraggingHandle(null);
      }
      // Arrow keys to cycle overlapping points selection
      if (nearbyPoints.length > 1) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveCycleIndex(prev => (prev + 1) % nearbyPoints.length);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveCycleIndex(prev => (prev - 1 + nearbyPoints.length) % nearbyPoints.length);
        }
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
  }, [selectedTubeId, setSelectedTubeId, setTubes, nearbyPoints, setActiveCycleIndex]);

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

  // Auto-center the canvas scroll viewport on initial mount so the default tube is fully visible
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        const scrollWidth = container.scrollWidth;
        const scrollHeight = container.scrollHeight;
        const clientWidth = container.clientWidth;
        const clientHeight = container.clientHeight;

        container.scrollLeft = (scrollWidth - clientWidth) / 2;
        container.scrollTop = (scrollHeight - clientHeight) / 2;
      });
    }
  }, []);

  // Trigger zoom animation smoothly moving current zoom toward target zoom centered on focal points
  const triggerZoomAnimation = () => {
    const container = containerRef.current;
    if (!container) return;

    if (animationFrameRef.current === null) {
      const animate = () => {
        const target = targetZoomRef.current;
        const current = currentZoomRef.current;
        const focal = zoomFocalPointRef.current;

        const diff = target - current;
        // Snap to target if very close to end animation
        if (Math.abs(diff) < 0.002) {
          setZoom(target);
          currentZoomRef.current = target;
          animationFrameRef.current = null;
          return;
        }

        // LERP: Move 25% of the way to the target per frame for smooth ease-out
        const stepZoom = parseFloat((current + diff * 0.25).toFixed(3));
        setZoom(stepZoom);

        if (focal) {
          container.scrollLeft = focal.unscaledX * stepZoom - focal.mouseX;
          container.scrollTop = focal.unscaledY * stepZoom - focal.mouseY;
        }

        currentZoomRef.current = stepZoom;
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  // Zoom button triggers centered on the screen viewport center
  const handleZoomIncrement = (factor: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = rect.width / 2;
    const mouseY = rect.height / 2;

    const contentX = container.scrollLeft + mouseX;
    const contentY = container.scrollTop + mouseY;

    const unscaledX = contentX / currentZoomRef.current;
    const unscaledY = contentY / currentZoomRef.current;

    zoomFocalPointRef.current = { mouseX, mouseY, unscaledX, unscaledY };

    let nextZoom = currentZoomRef.current * factor;
    nextZoom = Math.min(Math.max(nextZoom, 0.3), 3.0);
    nextZoom = parseFloat(nextZoom.toFixed(2));

    targetZoomRef.current = nextZoom;
    triggerZoomAnimation();
  };

  const handleZoomReset = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = rect.width / 2;
    const mouseY = rect.height / 2;

    const contentX = container.scrollLeft + mouseX;
    const contentY = container.scrollTop + mouseY;

    const unscaledX = contentX / currentZoomRef.current;
    const unscaledY = contentY / currentZoomRef.current;

    zoomFocalPointRef.current = { mouseX, mouseY, unscaledX, unscaledY };
    targetZoomRef.current = 1.0;
    triggerZoomAnimation();
  };

  // Imperative non-passive wheel event handler for zooming with mouse wheel (direct smooth scrolling!)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const contentX = container.scrollLeft + mouseX;
      const contentY = container.scrollTop + mouseY;

      // Extract unscaled coordinates under the mouse focal point
      const unscaledX = contentX / currentZoomRef.current;
      const unscaledY = contentY / currentZoomRef.current;

      zoomFocalPointRef.current = { mouseX, mouseY, unscaledX, unscaledY };

      const delta = -e.deltaY;
      // High-precision smooth multiplier scaling for both physical mice and trackpads
      const factor = 1 + Math.min(Math.max(Math.abs(delta) / 1200, 0.015), 0.06);
      let nextZoom = delta > 0 ? targetZoomRef.current * factor : targetZoomRef.current / factor;

      // Constraint scaling boundaries: 30% to 300% zoom limit
      nextZoom = Math.min(Math.max(nextZoom, 0.3), 3.0);
      nextZoom = parseFloat(nextZoom.toFixed(2));

      targetZoomRef.current = nextZoom;
      triggerZoomAnimation();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleImageMouseDown = (e: React.MouseEvent<SVGImageElement>) => {
    if (isRefImageLocked) return;
    if (e.button !== 0) return; // Left click only
    e.stopPropagation();
    e.preventDefault();
    
    setIsDraggingImage(true);
    const mousePos = getSVGCoords(e as unknown as React.MouseEvent<SVGSVGElement>);
    setImageDragStart({
      x: mousePos.x - refImageX,
      y: mousePos.y - refImageY
    });
  };

  const handleRefImageHandleMouseDown = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingRefImageHandle(handle);
    const mousePos = getSVGCoords(e as unknown as React.MouseEvent<SVGSVGElement>);
    setRefImageDragStartParams({
      x: refImageX,
      y: refImageY,
      w: 1000 * refImageScaleX,
      h: 1000 * refImageScaleY * refImageAspectRatio,
      mouseX: mousePos.x,
      mouseY: mousePos.y,
    });
  };

  // Handle segment hovering and dragging interactions
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (hoverDisabled) {
      setHoverDisabled(false);
    }

    if (draggingRefImageHandle && refImageDragStartParams) {
      const mousePos = getSVGCoords(e);
      const dx = mousePos.x - refImageDragStartParams.mouseX;
      const dy = mousePos.y - refImageDragStartParams.mouseY;
      const { x: startX, y: startY, w: startW, h: startH } = refImageDragStartParams;
      
      const minSize = 50; // minimum size of 50px
      
      let newW = startW;
      let newH = startH;
      let newX = startX;
      let newY = startY;
      
      switch (draggingRefImageHandle) {
        case 'rc':
          newW = Math.max(minSize, startW + dx);
          break;
        case 'lc':
          newW = Math.max(minSize, startW - dx);
          newX = startX + (startW - newW);
          break;
        case 'bc':
          newH = Math.max(minSize, startH + dy);
          break;
        case 'tc':
          newH = Math.max(minSize, startH - dy);
          newY = startY + (startH - newH);
          break;
        case 'br':
          newW = Math.max(minSize, startW + dx);
          newH = Math.max(minSize, startH + dy);
          break;
        case 'tl':
          newW = Math.max(minSize, startW - dx);
          newH = Math.max(minSize, startH - dy);
          newX = startX + (startW - newW);
          newY = startY + (startH - newH);
          break;
        case 'tr':
          newW = Math.max(minSize, startW + dx);
          newH = Math.max(minSize, startH - dy);
          newY = startY + (startH - newH);
          break;
        case 'bl':
          newW = Math.max(minSize, startW - dx);
          newH = Math.max(minSize, startH + dy);
          newX = startX + (startW - newW);
          break;
      }
      
      setRefImageX(newX);
      setRefImageY(newY);
      setRefImageScaleX(newW / 1000);
      setRefImageScaleY(newH / (1000 * refImageAspectRatio));
      return;
    }

    if (isPanning) {
      if (containerRef.current) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        containerRef.current.scrollLeft = panScrollStart.left - dx;
        containerRef.current.scrollTop = panScrollStart.top - dy;
      }
      return;
    }

    if (isDraggingImage && !isRefImageLocked) {
      const mousePos = getSVGCoords(e);
      setRefImageX(mousePos.x - imageDragStart.x);
      setRefImageY(mousePos.y - imageDragStart.y);
      return;
    }

    const mousePos = getSVGCoords(e);

    // Overlapping points detection
    if (selectedTubeId && !draggingNode && !draggingHandle) {
      const selectedTube = tubes.find(t => t.id === selectedTubeId);
      if (selectedTube) {
        const nearby = selectedTube.points
          .filter(pt => dist(mousePos, pt) <= 30)
          .map(pt => pt.id);

        const nearbyIdsStr = nearby.join(',');
        const currentIdsStr = nearbyPoints.join(',');

        if (nearbyIdsStr !== currentIdsStr) {
          setNearbyPoints(nearby);
          if (nearby.length > 1) {
            const curFocusedId = activeCycleIndex >= 0 && activeCycleIndex < nearbyPoints.length ? nearbyPoints[activeCycleIndex] : null;
            const nextIndex = curFocusedId ? nearby.indexOf(curFocusedId) : 0;
            setActiveCycleIndex(nextIndex >= 0 ? nextIndex : 0);
          } else {
            setActiveCycleIndex(-1);
          }
        }
      } else {
        if (nearbyPoints.length > 0) {
          setNearbyPoints([]);
          setActiveCycleIndex(-1);
        }
      }
    } else {
      if (nearbyPoints.length > 0) {
        setNearbyPoints([]);
        setActiveCycleIndex(-1);
      }
    }

    // 1. DRAGGING HANDLE INTERACTION
    if (draggingHandle) {
      const { tubeId, pointId, handleType } = draggingHandle;
      setTubes(prev =>
        prev.map(t => {
          if (t.id !== tubeId) return t;
          return {
            ...t,
            points: t.points.map(p => {
              if (p.id !== pointId) return p;

              // Calculate relative displacement from the anchor
              const dx = mousePos.x - p.x;
              const dy = mousePos.y - p.y;

              if (handleType === 'in') {
                return {
                  ...p,
                  handleIn: { dx, dy },
                  handleOut: { dx: -dx, dy: -dy } // Symmetric angle & length mirroring
                };
              } else {
                return {
                  ...p,
                  handleOut: { dx, dy },
                  handleIn: { dx: -dx, dy: -dy } // Symmetric angle & length mirroring
                };
              }
            })
          };
        })
      );
      return;
    }

    // 2. DRAGGING NODE ACTION
    if (draggingNode) {
      const { tubeId, pointId } = draggingNode;
      let newX = mousePos.x;
      let newY = mousePos.y;

      // Grid Snapping (snap to 1.0 inch or 1.0 cm subdivisions depending on useMetric)
      if (snapToGrid) {
        const snapUnit = useMetric ? (SCALE / 2.54) : (1.0 * SCALE);
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

      // Update node coordinate (relative handles move in lockstep automatically)
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

    // 3. DRAGGING ENTIRE TUBE
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

    // 4. GHOST NODE DETECTION (ONLY IN SELECT/BEND MODES)
    if (!draggingNode && !draggingTube && !draggingHandle && (tool === 'select' || tool === 'bend')) {
      let closestGhost: typeof hoveredGhostPoint = null;
      let minDistance = Infinity;

      for (const tube of tubes) {
        const proj = findNearestPointOnPath(mousePos, tube.points, 24); // 24px active hover buffer
        if (proj) {
          // Verify that mouse is far enough from any existing anchors
          let farFromAnchors = true;
          for (const pt of tube.points) {
            if (dist(proj.point, pt) < 32) { // 32px distance threshold
              farFromAnchors = false;
              break;
            }
          }
          if (farFromAnchors && proj.distance < minDistance) {
            minDistance = proj.distance;
            closestGhost = {
              x: proj.point.x,
              y: proj.point.y,
              segmentIndex: proj.segmentIndex,
              t: proj.t,
              tubeId: tube.id
            };
          }
        }
      }
      setHoveredGhostPoint(closestGhost);
    } else {
      setHoveredGhostPoint(null);
    }

    // 5. HOVERING PREVIEWS FOR CUT
    if (tool === 'cut') {
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

    // Prevent adding a new point/tube or changing selection if a point is in edit mode (hovered or within grace period)
    if (isHoveringPoint || (e.target as SVGElement).closest('.point-control-group')) {
      return;
    }

    // INTERCEPT PULSING GHOST POINT CLICK TO INSERT A NODE
    if (hoveredGhostPoint && (tool === 'select' || tool === 'bend')) {
      e.preventDefault();
      e.stopPropagation();

      const { x, y, segmentIndex, t, tubeId } = hoveredGhostPoint;
      const targetTube = tubes.find(t => t.id === tubeId);
      
      if (targetTube) {
        const p0 = targetTube.points[segmentIndex];
        const p1 = targetTube.points[segmentIndex + 1];
        const c0 = { x: p0.x + (p0.handleOut?.dx ?? 0), y: p0.y + (p0.handleOut?.dy ?? 0) };
        const c1 = { x: p1.x + (p1.handleIn?.dx ?? 0), y: p1.y + (p1.handleIn?.dy ?? 0) };

        // Compute curve tangent slope at fractional parameter t to align new handles smoothly
        const tangent = bezierTangent(p0, c0, c1, p1, t);
        const handleLength = 40; // 40px default curvature amplitude
        const newNodeId = generateId();

        const newPoint: Point = {
          id: newNodeId,
          x,
          y,
          handleIn: { dx: -tangent.x * handleLength, dy: -tangent.y * handleLength },
          handleOut: { dx: tangent.x * handleLength, dy: tangent.y * handleLength }
        };

        const updatedPoints = [
          ...targetTube.points.slice(0, segmentIndex + 1),
          newPoint,
          ...targetTube.points.slice(segmentIndex + 1)
        ];

        setTubes(prev =>
          prev.map(t => {
            if (t.id !== tubeId) return t;
            return { ...t, points: updatedPoints };
          })
        );
        
        setSelectedTubeId(tubeId);
        setHoveredGhostPoint(null);

        // Start dragging the new node immediately for professional responsiveness
        setDraggingNode({ tubeId, pointId: newNodeId });
      }
      return;
    }

    const mousePos = getSVGCoords(e);

    // If clicking background and tool is 'add', spawn a new tube
    if (e.target === svgRef.current || (e.target as SVGElement).closest('.sheet-grid-group')) {
      setSelectedTubeId(null);
      
      if (tool === 'add') {
        const id = generateId();
        // Create a horizontal 4 feet (48") tube centered on the click
        const lengthPx = 48 * SCALE;
        
        let x1 = mousePos.x - lengthPx / 2;
        let x2 = mousePos.x + lengthPx / 2;
        let y = mousePos.y;
        
        if (snapToGrid) {
          const snapUnit = useMetric ? (SCALE / 2.54) : (1.0 * SCALE);
          x1 = Math.round(x1 / snapUnit) * snapUnit;
          x2 = Math.round(x2 / snapUnit) * snapUnit;
          y = Math.round(y / snapUnit) * snapUnit;
        }

        const newTube: Tube = {
          id,
          color: '#38bdf8', // Neon blue default
          diameter: 10,
          maxLengthInches: 48,
          points: [
            {
              id: generateId(),
              x: x1,
              y: y,
              handleIn: { dx: -lengthPx / 6, dy: 0 },
              handleOut: { dx: lengthPx / 6, dy: 0 }
            },
            {
              id: generateId(),
              x: x2,
              y: y,
              handleIn: { dx: -lengthPx / 6, dy: 0 },
              handleOut: { dx: lengthPx / 6, dy: 0 }
            }
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

    if (draggingRefImageHandle) {
      setDraggingRefImageHandle(null);
      setRefImageDragStartParams(null);
      return;
    }

    if (isDraggingImage) {
      setIsDraggingImage(false);
      return;
    }

    // Helper: Reverse points along with swapping handleIn and handleOut offsets
    const reversePoints = (pts: Point[]): Point[] => {
      return [...pts].reverse().map(p => ({
        ...p,
        handleIn: p.handleOut,
        handleOut: p.handleIn
      }));
    };

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
          mergedPoints = [...reversePoints(tPoints), ...sPoints.slice(1)];
        } else if (sIsStart && tIsEnd) {
          // Target appends directly to source start
          mergedPoints = [...tPoints, ...sPoints.slice(1)];
        } else if (sIsEnd && tIsStart) {
          // Target appends directly to source end
          mergedPoints = [...sPoints, ...tPoints.slice(1)];
        } else if (sIsEnd && tIsEnd) {
          // Target reversed appends to source end
          mergedPoints = [...sPoints, ...reversePoints(tPoints).slice(1)];
        }

        // Clean up points (giving them unique IDs just in case, but keep coords & handles)
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
    setDraggingHandle(null);
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

    // INTERCEPT PULSING GHOST POINT CLICK TO INSERT A NODE DIRECTLY ON THE TUBE PATH CLICK
    if (hoveredGhostPoint && hoveredGhostPoint.tubeId === tube.id && (tool === 'select' || tool === 'bend')) {
      e.stopPropagation();
      e.preventDefault();

      const { x, y, segmentIndex, t } = hoveredGhostPoint;
      const p0 = tube.points[segmentIndex];
      const p1 = tube.points[segmentIndex + 1];
      const c0 = { x: p0.x + (p0.handleOut?.dx ?? 0), y: p0.y + (p0.handleOut?.dy ?? 0) };
      const c1 = { x: p1.x + (p1.handleIn?.dx ?? 0), y: p1.y + (p1.handleIn?.dy ?? 0) };

      // Compute curve tangent slope at fractional parameter t to align new handles smoothly
      const tangent = bezierTangent(p0, c0, c1, p1, t);
      const handleLength = 40; // 40px default curvature amplitude
      const newNodeId = generateId();

      const newPoint: Point = {
        id: newNodeId,
        x,
        y,
        handleIn: { dx: -tangent.x * handleLength, dy: -tangent.y * handleLength },
        handleOut: { dx: tangent.x * handleLength, dy: tangent.y * handleLength }
      };

      const updatedPoints = [
        ...tube.points.slice(0, segmentIndex + 1),
        newPoint,
        ...tube.points.slice(segmentIndex + 1)
      ];

      setTubes(prev =>
        prev.map(t => {
          if (t.id !== tube.id) return t;
          return { ...t, points: updatedPoints };
        })
      );
      
      setSelectedTubeId(tube.id);
      setHoveredGhostPoint(null);

      // Start dragging the new node immediately for professional responsiveness
      setDraggingNode({ tubeId: tube.id, pointId: newNodeId });
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

  const handleLineSegmentDoubleClick = (e: React.MouseEvent<SVGPathElement>, tube: Tube) => {
    if (svgRef.current) {
      const mousePos = getSVGCoords(e as unknown as React.MouseEvent<SVGSVGElement>);
      const proj = findNearestPointOnPath(mousePos, tube.points, 40);
      if (proj) {
        handleSegmentDoubleClick(e, tube.id, proj.segmentIndex);
      }
    }
  };

  const handleDeleteNode = (tubeId: string, pointId: string) => {
    setTubes(prev =>
      prev.map(t => {
        if (t.id !== tubeId) return t;
        return {
          ...t,
          points: t.points.filter(p => p.id !== pointId)
        };
      })
    );
  };

  // Render glowing tubes
  const renderTubes = () => {
    return tubes.map(tube => {
      const isSelected = tube.id === selectedTubeId;

      return (
        <g key={tube.id} className={`glass-tube ${isSelected ? 'selected' : ''}`}>
          
          <Line
            tube={tube}
            isSelected={isSelected}
            isPowerOn={isPowerOn}
            tool={tool}
            bendRadius={bendRadius}
            useMetric={useMetric}
            hoveredSegment={hoveredSegment}
            onTubeMouseDown={handleTubeMouseDown}
            onSegmentDoubleClick={handleLineSegmentDoubleClick}
            onSegmentClick={handleSegmentClick}
          />

          {/* 9. Control Nodes & Handles (Photoshop-style anchors and control handles) */}
          {isSelected && tube.points.map((pt, index) => {
            const isEnd = index === 0 || index === tube.points.length - 1;

            return (
              <g key={pt.id}>
                <PointComponent
                  tubeId={tube.id}
                  pt={pt}
                  index={index}
                  totalPoints={tube.points.length}
                  draggingNode={draggingNode}
                  draggingHandle={draggingHandle}
                  onNodeMouseDown={handleNodeMouseDown}
                  onNodeContextMenu={handleNodeContextMenu}
                  onHandleMouseDown={(e, tId, pId, type) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setDraggingHandle({ tubeId: tId, pointId: pId, handleType: type });
                  }}
                  onDeleteNode={handleDeleteNode}
                  onMouseEnter={handlePointMouseEnter}
                  onMouseLeave={handlePointMouseLeave}
                  isFocused={
                    activeCycleIndex >= 0 &&
                    activeCycleIndex < nearbyPoints.length &&
                    nearbyPoints[activeCycleIndex] === pt.id
                  }
                />

                {/* Drag Entire Tube Button (Tactile Grip Handle) - Rendered only at Endpoints (Start and End nodes) */}
                {isEnd && (
                  <g
                    className="drag-tube-btn"
                    cursor="move"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const mousePos = getSVGCoords(e as unknown as React.MouseEvent<SVGSVGElement>);
                      setDraggingTube(tube.id);
                      setDragStartPos(mousePos);
                      setDragStartPoints([...tube.points]);
                    }}
                  >
                    {/* Circle backing */}
                    <circle
                      cx={pt.x - 11}
                      cy={pt.y + 11}
                      r="7.5"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
                    />
                    {/* draggble Tactile slider bars */}
                    <line
                      x1={pt.x - 14}
                      y1={pt.y + 9}
                      x2={pt.x - 8}
                      y2={pt.y + 9}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1={pt.x - 14}
                      y1={pt.y + 11}
                      x2={pt.x - 8}
                      y2={pt.y + 11}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1={pt.x - 14}
                      y1={pt.y + 13}
                      x2={pt.x - 8}
                      y2={pt.y + 13}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
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
      cursor: draggingRefImageHandle 
        ? (draggingRefImageHandle === 'tl' || draggingRefImageHandle === 'br' ? 'nwse-resize'
           : draggingRefImageHandle === 'tr' || draggingRefImageHandle === 'bl' ? 'nesw-resize'
           : draggingRefImageHandle === 'tc' || draggingRefImageHandle === 'bc' ? 'ns-resize'
           : 'ew-resize')
        : (isPanning ? 'grabbing' : (spacePressed ? 'grab' : (tool === 'cut' ? 'crosshair' : 'default')))
    }}>
      <svg
        ref={svgRef}
        className={`neon-svg-canvas ${hoverDisabled ? 'disable-hover' : ''}`}
        width={(totalWidth + 160) * zoom}
        height={(totalHeight + 120) * zoom}
        viewBox={`0 0 ${totalWidth + 160} ${totalHeight + 120}`}
        style={{
          display: 'block',
          margin: 'auto',
          backgroundColor: 'var(--bg-workbench)',
          backgroundImage: 'radial-gradient(var(--border-glass) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)'
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
            useMetric={useMetric}
          />
          
          {/* Reference Blueprint overlay image tracing guide */}
          {refImageSrc && (
            <RefImage
              refImageSrc={refImageSrc}
              refImageX={refImageX}
              refImageY={refImageY}
              refImageScaleX={refImageScaleX}
              refImageScaleY={refImageScaleY}
              refImageAspectRatio={refImageAspectRatio}
              refImageOpacity={refImageOpacity}
              isRefImageLocked={isRefImageLocked}
              setIsRefImageLocked={setIsRefImageLocked}
              onMouseDown={handleImageMouseDown}
              onHandleMouseDown={handleRefImageHandleMouseDown}
            />
          )}
          
          {/* Ghost point node projection */}
          {hoveredGhostPoint && (
            <circle
              cx={hoveredGhostPoint.x}
              cy={hoveredGhostPoint.y}
              r="6.5"
              fill="var(--accent-blue)"
              opacity="0.8"
              stroke="#ffffff"
              strokeWidth="2"
              style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 6px var(--accent-blue))', animation: 'grid-pulse 0.8s infinite' }}
            />
          )}

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
          onClick={() => handleZoomIncrement(0.9)}
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
          onClick={() => handleZoomIncrement(1.1)}
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
          onClick={() => handleZoomReset()}
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

      {/* Overlapping points keyboard selection instruction badge */}
      {nearbyPoints.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(192, 132, 252, 0.25)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(192, 132, 252, 0.4)',
          color: '#e9d5ff',
          padding: '8px 16px',
          borderRadius: '30px',
          fontSize: '11px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 100,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <span>🎯 {nearbyPoints.length} points overlapping. Press arrow keys ◄ / ► to cycle selection ({activeCycleIndex + 1}/{nearbyPoints.length})</span>
        </div>
      )}
    </div>
  );
};
