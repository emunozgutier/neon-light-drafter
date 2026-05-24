import React from 'react';
import { Drafter } from '../sideBar/Drafter';
import { Glass } from '../sideBar/Glass';
import { Grid } from '../sideBar/Grid';
import { BluePrint } from '../sideBar/BluePrint';
import { Print } from '../sideBar/Print';
import { MaterialPlanning } from '../sideBar/MaterialPlanning';
import { useCanvas } from '../store/useCanvas';
import { useSideMenu } from '../store/useSideMenu';

interface SidebarProps {
  onOpenPrint: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenPrint }) => {
  const { tubes, setTubes, resetCanvas } = useCanvas();
  const {
    sheetType,
    orientation,
    refImageX,
    refImageY,
    setRefImageSrc,
    setRefImageX,
    setRefImageY,
    setRefImageScaleX,
    setRefImageScaleY,
    setRefImageAspectRatio,
    setPrintRotation
  } = useSideMenu();

  const handleNewDraft = () => {
    if (window.confirm("⚠️ Are you sure you want to start a new draft? This will clear all glass tubes and reset your background tracing templates.")) {
      resetCanvas();
      setRefImageSrc(null);
      setRefImageX(0);
      setRefImageY(0);
      setRefImageScaleX(1.0);
      setRefImageScaleY(1.0);
      setRefImageAspectRatio(1.0);
      setPrintRotation(0);
    }
  };

  const handleCenterDesign = () => {
    if (tubes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    tubes.forEach((t) => {
      t.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });

    if (minX === Infinity) return;

    // Centering calculations
    const SCALE = 40;
    const dimsInches = {
      letter: { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } },
      a4: { portrait: { w: 8.27, h: 11.69 }, landscape: { w: 11.69, h: 8.27 } }
    };
    const activeDim = dimsInches[sheetType][orientation];
    const widthPx = activeDim.w * SCALE;
    const heightPx = activeDim.h * SCALE;

    const designCenterX = (minX + maxX) / 2;
    const designCenterY = (minY + maxY) / 2;

    // Target Page C-4 center (row C = index 2, col 4 = index 3)
    const targetCenterX = 3 * widthPx + widthPx / 2;
    const targetCenterY = 2 * heightPx + heightPx / 2;

    const dx = Math.round(targetCenterX - designCenterX);
    const dy = Math.round(targetCenterY - designCenterY);

    if (dx === 0 && dy === 0) {
      window.dispatchEvent(new CustomEvent('center-viewport-c4'));
      return;
    }

    // Translate coordinates
    setTubes(
      (prev) =>
        prev.map((t) => ({
          ...t,
          points: t.points.map((p) => ({
            ...p,
            x: Math.round(p.x + dx),
            y: Math.round(p.y + dy)
          }))
        })),
      false // Save to history for undoability!
    );

    // Shift background tracing image in sync
    setRefImageX(Math.round(refImageX + dx));
    setRefImageY(Math.round(refImageY + dy));

    // Fire custom viewport centering event to refocus the scroll view on Page C-4
    window.dispatchEvent(new CustomEvent('center-viewport-c4'));
  };

  return (
    <div style={{
      width: '360px',
      height: '100%',
      backgroundColor: 'var(--bg-sidebar)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--text-primary)',
      fontFamily: 'var(--sans)',
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      overflowY: 'auto',
      zIndex: 10,
      flexShrink: 0
    }}>
      {/* Header & Title Block */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)' }}>
        <h1 style={{
          fontSize: '22px',
          fontWeight: '700',
          margin: '0 0 6px 0',
          letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #c084fc, #38bdf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          Neon Studio Drafter 💡
        </h1>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
          Professional glass-bending layout & material calculator
        </p>

        {/* Quick Actions Row */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {/* Start New Draft Button */}
          <button
            onClick={handleNewDraft}
            title="Clear canvas and start a new layout"
            style={{
              flex: 1,
              height: '34px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '0.3px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.color = '#f87171';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'var(--border-glass)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📄 New Draft
          </button>

          {/* Center Neon Design Button */}
          <button
            onClick={handleCenterDesign}
            title="Center drawing on Page C-4"
            style={{
              flex: 1,
              height: '34px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '0.3px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.4)';
              e.currentTarget.style.color = '#e9d5ff';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(192, 132, 252, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'var(--border-glass)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🎯 Center
          </button>

          {/* Share Link Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }}
            title="Share your design link"
            style={{
              flex: 1,
              height: '34px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '0.3px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              e.currentTarget.style.color = '#bae6fd';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'var(--border-glass)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🔗 Share
          </button>
        </div>
      </div>


      {/* Collapsible Modular Sections */}
      <Drafter />
      <Glass />
      <Grid />
      <BluePrint />
      <Print onOpenPrint={onOpenPrint} />
      <MaterialPlanning />
    </div>
  );
};
