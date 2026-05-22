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
  const { resetCanvas } = useCanvas();
  const {
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

        {/* Start New Draft Button */}
        <button
          onClick={handleNewDraft}
          style={{
            marginTop: '16px',
            width: '100%',
            height: '34px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)',
            fontSize: '11.5px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
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
          📄 Start New Draft
        </button>
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
