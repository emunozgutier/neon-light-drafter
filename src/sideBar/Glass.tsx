import React, { useState } from 'react';
import type { Tube } from '../utils/geometry';
import { formatLength, calculateTubeGeometry, SCALE, generateId } from '../utils/geometry';
import { useSideMenu } from '../store/useSideMenu';
import { useCanvas } from '../store/useCanvas';

const NEON_PRESETS = [
  { name: 'Classic Red', value: '#ef4444', description: 'Pure Neon gas, classic warm red' },
  { name: 'Electric Blue', value: '#38bdf8', description: 'Argon + Mercury, deep electric ice blue' },
  { name: 'Acid Green', value: '#4ade80', description: 'Green phosphor coating with Argon gas' },
  { name: 'Novaglow Pink', value: '#f472b6', description: 'Phosphor pink, extremely vivid glow' },
  { name: 'Bright Gold', value: '#fbbf24', description: 'Neon in gold glass, rich amber warm yellow' },
  { name: 'Teal/Turquoise', value: '#2dd4bf', description: 'Phosphor turquoise, clean teal radiance' },
  { name: 'Super White', value: '#fafafa', description: 'White phosphor, high luxury architectural white' },
  { name: 'Ultraviolet', value: '#a855f7', description: 'Deep purple/blacklight glow effect' }
];

export const Glass: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    bendRadius,
    useMetric,
    fitMargin,
    setFitMargin,
  } = useSideMenu();

  const {
    tubes,
    setTubes,
    selectedTubeId,
    setSelectedTubeId,
  } = useCanvas();

  const selectedTube = tubes.find(t => t.id === selectedTubeId);

  const handleUpdateSelectedTube = (updates: Partial<Tube>) => {
    if (!selectedTubeId) return;
    setTubes(prev =>
      prev.map(t => (t.id === selectedTubeId ? { ...t, ...updates } : t))
    );
  };

  const handleDeleteTube = () => {
    if (!selectedTubeId) return;
    setTubes(prev => prev.filter(t => t.id !== selectedTubeId));
    setSelectedTubeId(null);
  };

  const handleExpandSelectedToLimit = () => {
    if (!selectedTubeId || !selectedTube) return;
    const rawTubeSize = selectedTube.maxLengthInches !== 999
      ? selectedTube.maxLengthInches
      : 48;
    const targetLengthInches = Math.max(0.1, rawTubeSize - fitMargin);
    const { physicalLengthInches } = calculateTubeGeometry(selectedTube.points, bendRadius);
    if (physicalLengthInches <= 0) return;

    const scaleFactor = targetLengthInches / physicalLengthInches;

    // Calculate center of the tube (centroid of all anchor points)
    let sumX = 0;
    let sumY = 0;
    selectedTube.points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
    });
    const centerX = sumX / selectedTube.points.length;
    const centerY = sumY / selectedTube.points.length;

    // Scale all points and handles relative to the center
    const scaledPoints = selectedTube.points.map(p => {
      const newPt = {
        ...p,
        x: centerX + (p.x - centerX) * scaleFactor,
        y: centerY + (p.y - centerY) * scaleFactor,
      };
      if (p.handleIn) {
        newPt.handleIn = {
          dx: p.handleIn.dx * scaleFactor,
          dy: p.handleIn.dy * scaleFactor
        };
      }
      if (p.handleOut) {
        newPt.handleOut = {
          dx: p.handleOut.dx * scaleFactor,
          dy: p.handleOut.dy * scaleFactor
        };
      }
      return newPt;
    });

    handleUpdateSelectedTube({ points: scaledPoints });
  };

  return (
    <div style={{
      borderBottom: '1px solid var(--border-glass)',
      backgroundColor: (isOpen && selectedTube) ? 'rgba(192, 132, 252, 0.02)' : 'transparent',
      transition: 'background-color 0.3s ease'
    }}>
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
          🧪 Glass Customizer
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: '0 24px 20px 24px' }}>
          {selectedTube ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              {/* Length Info */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)'
              }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Selected Tube ID</span>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-secondary)' }}>{selectedTube.id}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Length</span>
                  <div style={{
                    fontSize: '14px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 'bold',
                    color: (calculateTubeGeometry(selectedTube.points, bendRadius).physicalLengthInches > selectedTube.maxLengthInches) ? '#ef4444' : 'var(--accent-green)'
                  }}>
                    {formatLength(calculateTubeGeometry(selectedTube.points, bendRadius).physicalLengthInches, useMetric)}
                  </div>
                </div>
              </div>

              {/* Neon Color Gas Presets */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Gas/Color Filament</span>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginTop: '6px'
                }}>
                  {NEON_PRESETS.map(preset => {
                    const isColorActive = selectedTube.color === preset.value;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => handleUpdateSelectedTube({ color: preset.value })}
                        title={preset.description}
                        style={{
                          height: '32px',
                          borderRadius: '4px',
                          backgroundColor: '#1b1d26',
                          border: `1.5px solid ${isColorActive ? preset.value : 'transparent'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: isColorActive ? `0 0 10px ${preset.value}80` : 'none'
                        }}
                      >
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: preset.value,
                          boxShadow: `0 0 6px ${preset.value}`
                        }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tube Diameter & Physical Limit Capacity */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Glass Diameter</span>
                  <select
                    value={selectedTube.diameter}
                    onChange={(e) => handleUpdateSelectedTube({ diameter: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      height: '32px',
                      borderRadius: '4px',
                      backgroundColor: '#1b1d26',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-primary)',
                      padding: '0 8px',
                      fontSize: '12px',
                      fontFamily: 'var(--mono)',
                      outline: 'none'
                    }}
                  >
                    <option value={8}>8 mm (Accent)</option>
                    <option value={10}>10 mm (Standard)</option>
                    <option value={12}>12 mm (Block)</option>
                    <option value={15}>15 mm (Heavy Bold)</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tube Raw Length</span>
                  <select
                    value={selectedTube.maxLengthInches}
                    onChange={(e) => handleUpdateSelectedTube({ maxLengthInches: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      height: '32px',
                      borderRadius: '4px',
                      backgroundColor: '#1b1d26',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-primary)',
                      padding: '0 8px',
                      fontSize: '12px',
                      fontFamily: 'var(--mono)',
                      outline: 'none'
                    }}
                  >
                    <option value={24}>2 feet (24")</option>
                    <option value={36}>3 feet (36")</option>
                    <option value={48}>4 feet (48") [Default]</option>
                    <option value={72}>6 feet (72")</option>
                    <option value={96}>8 feet (96")</option>
                    <option value={999}>Unlimited</option>
                  </select>
                </div>
              </div>

              {/* Safety Margin Slider / Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px', backgroundColor: 'rgba(0,0,0,0.15)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', alignItems: 'center' }}>
                  <span>Safety Margin / Tolerance</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)', fontSize: '12px' }}>
                    {useMetric ? `${(fitMargin * 25.4).toFixed(0)} mm` : `${fitMargin}"`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={fitMargin}
                  onChange={(e) => setFitMargin(Number(e.target.value))}
                  style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)', margin: '4px 0' }}
                />
                <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Raw Limit: {formatLength(selectedTube.maxLengthInches !== 999 ? selectedTube.maxLengthInches : 48, useMetric)}</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
                    Final Target: {formatLength((selectedTube.maxLengthInches !== 999 ? selectedTube.maxLengthInches : 48) - fitMargin, useMetric)}
                  </span>
                </div>
              </div>

              {/* Expand to Limit Button */}
              <button
                onClick={handleExpandSelectedToLimit}
                style={{
                  width: '100%',
                  height: '34px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px dashed rgba(56, 189, 248, 0.4)',
                  color: 'var(--accent-blue)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  marginTop: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📏 Fit Selected to Tube Limit (Scale)
              </button>

              {/* Actions for active tube */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    // Reset tube to simple horizontal straight line
                    const lengthPx = 48 * SCALE;
                    const centerX = 340;
                    const centerY = 220;
                    handleUpdateSelectedTube({
                      points: [
                        { id: generateId(), x: centerX - lengthPx/4, y: centerY },
                        { id: generateId(), x: centerX - lengthPx/8, y: centerY },
                        { id: generateId(), x: centerX + lengthPx/8, y: centerY },
                        { id: generateId(), x: centerX + lengthPx/4, y: centerY }
                      ]
                    });
                  }}
                  style={{
                    flex: 1,
                    height: '32px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-secondary)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                >
                  Reset Straight
                </button>

                <button
                  onClick={handleDeleteTube}
                  style={{
                    flex: 1,
                    height: '32px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.borderColor = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  }}
                >
                  Delete Glass
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '24px 0',
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}>
              No glass tube selected.<br/>Select a glass tube to customize its properties.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
