import React, { useState } from 'react';
import { useSideMenu } from '../store/useSideMenu';

export const Grid: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    sheetType,
    orientation,
    snapToGrid,
    bendRadius,
    setSheetType,
    setOrientation,
    setSnapToGrid,
    setBendRadius,
  } = useSideMenu();

  return (
    <div style={{ borderBottom: '1px solid var(--border-glass)' }}>
      {/* Collapsible Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isOpen ? 'rgba(255,255,255,0.01)' : 'transparent',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isOpen ? 'rgba(255,255,255,0.01)' : 'transparent';
        }}
      >
        <span style={{ fontSize: '11.5px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
          📐 Grid & Bending
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
          {/* Sheet Format Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sheet Format (Grid Breaks)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['letter', 'a4'] as const).map(type => {
                const isActive = sheetType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSheetType(type)}
                    style={{
                      flex: 1,
                      height: '32px',
                      borderRadius: '4px',
                      backgroundColor: isActive ? 'var(--accent-purple)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? 'transparent' : 'var(--border-glass)'}`,
                      color: isActive ? '#0d0f12' : 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {type === 'letter' ? 'Letter (11"×8.5")' : 'A4 (11.7"×8.3")'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orientation Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Page Orientation</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['landscape', 'portrait'] as const).map(ort => {
                const isActive = orientation === ort;
                return (
                  <button
                    key={ort}
                    onClick={() => setOrientation(ort)}
                    style={{
                      flex: 1,
                      height: '32px',
                      borderRadius: '4px',
                      backgroundColor: isActive ? 'var(--accent-purple)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? 'transparent' : 'var(--border-glass)'}`,
                      color: isActive ? '#0d0f12' : 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {ort === 'landscape' ? 'Landscape 🌅' : 'Portrait 📱'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Settings & Snapping */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
              />
              Snap Control Nodes to Grid
            </label>
          </div>

          {/* Bend Radius Control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>Bend Radius</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>{bendRadius.toFixed(2)}"</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2.00"
              step="0.05"
              value={bendRadius}
              onChange={(e) => setBendRadius(Number(e.target.value))}
              style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
