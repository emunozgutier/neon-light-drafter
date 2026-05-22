import React from 'react';
import { Drafter } from '../sideBar/Drafter';
import { Glass } from '../sideBar/Glass';
import { Grid } from '../sideBar/Grid';
import { BluePrint } from '../sideBar/BluePrint';
import { Print } from '../sideBar/Print';
import { MaterialPlanning } from '../sideBar/MaterialPlanning';

interface SidebarProps {
  onOpenPrint: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenPrint }) => {
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
