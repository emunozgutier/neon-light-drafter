import React, { useState } from 'react';
import { useCanvas } from '../store/useCanvas';

export const Drafter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);

  const {
    tool,
    setTool,
    isPowerOn,
    setIsPowerOn,
    selectedTubeId,
    setTubes,
    setSelectedTubeId
  } = useCanvas();

  const handleDeleteTube = () => {
    if (!selectedTubeId) return;
    setTubes(prev => prev.filter(t => t.id !== selectedTubeId));
    setSelectedTubeId(null);
  };

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
          🛠️ Drafter Toolkit
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Neon Power Transformer Switch (Visual Wow Factor) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px'
          }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                High-Voltage Power
              </span>
              <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Flick on to ignite glowing neon gas
              </p>
            </div>
            
            {/* Toggle Switch */}
            <button
              onClick={() => setIsPowerOn(!isPowerOn)}
              style={{
                width: '60px',
                height: '30px',
                borderRadius: '15px',
                backgroundColor: isPowerOn ? 'var(--accent-green)' : '#272a34',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                boxShadow: isPowerOn ? '0 0 12px var(--accent-green)' : 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                transform: isPowerOn ? 'translateX(30px)' : 'translateX(0px)',
                transition: 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: isPowerOn ? 'var(--accent-green)' : '#94a3b8' }}>
                  {isPowerOn ? 'I' : 'O'}
                </span>
              </div>
            </button>
          </div>

          {/* Toolkit Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '6px'
          }}>
            {[
              { id: 'select', icon: '🖱️', label: 'Select' },
              { id: 'bend', icon: '🟣', label: 'Bend' },
              { id: 'cut', icon: '✂️', label: 'Cut' },
              { id: 'weld', icon: '🟢', label: 'Weld' },
              { id: 'add', icon: '➕', label: 'Add' },
              { id: 'delete', icon: '🗑️', label: 'Delete', isAction: true }
            ].map(t => {
              const isActive = tool === t.id;
              const isHovered = hoveredToolId === t.id;
              const isDisabled = t.isAction && t.id === 'delete' && !selectedTubeId;

              return (
                <button
                  key={t.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (t.isAction) {
                      if (t.id === 'delete') handleDeleteTube();
                    } else {
                      setTool(t.id as any);
                    }
                  }}
                  onMouseEnter={() => !isDisabled && setHoveredToolId(t.id)}
                  onMouseLeave={() => setHoveredToolId(null)}
                  title={t.label}
                  style={{
                    height: '42px',
                    borderRadius: '6px',
                    backgroundColor: isDisabled 
                      ? 'rgba(255,255,255,0.01)'
                      : (isActive 
                        ? 'var(--accent-purple)' 
                        : (isHovered 
                          ? (t.id === 'delete' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.08)')
                          : 'rgba(255,255,255,0.03)')),
                    border: `1px solid ${
                      isDisabled 
                        ? 'rgba(255,255,255,0.03)'
                        : (isActive 
                          ? 'transparent' 
                          : (isHovered 
                            ? (t.id === 'delete' ? 'rgba(239, 68, 68, 0.4)' : 'var(--accent-purple)')
                            : 'var(--border-glass)'))
                    }`,
                    color: isDisabled 
                      ? 'var(--text-muted)' 
                      : (isActive 
                        ? '#0d0f12' 
                        : (t.id === 'delete' ? '#ef4444' : 'var(--text-primary)')),
                    fontSize: '16px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    opacity: isDisabled ? 0.35 : 1,
                    boxShadow: isActive ? '0 4px 12px rgba(192, 132, 252, 0.4)' : 'none'
                  }}
                >
                  <span>{t.icon}</span>
                  <span style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
