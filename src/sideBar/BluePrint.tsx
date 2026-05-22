import React, { useState } from 'react';
import { useSideMenu } from '../store/useSideMenu';

export const BluePrint: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    refImageSrc,
    refImageOpacity,
    refImageScaleX,
    refImageScaleY,
    refImageX,
    refImageY,
    isRefImageLocked,
    setRefImageSrc,
    setRefImageOpacity,
    setRefImageScaleX,
    setRefImageScaleY,
    setRefImageX,
    setRefImageY,
    setIsRefImageLocked,
    setRefImageAspectRatio,
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
          🗺️ Tracing Overlay
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: '0 24px 20px 24px' }}>
          {!refImageSrc ? (
            <div style={{ marginTop: '10px' }}>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 12px',
                borderRadius: '8px',
                border: '1.5px dashed var(--border-glass)',
                backgroundColor: 'rgba(255,255,255,0.01)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
              className="blueprint-dropzone"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-purple)';
                e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-glass)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)';
              }}
              >
                <span style={{ fontSize: '24px', marginBottom: '6px' }}>🗺️</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Upload Tracing Guide</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG, SVG, or WEBP</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const src = event.target?.result as string;
                        setRefImageSrc(src);
                        setRefImageScaleX(1.0);
                        setRefImageScaleY(1.0);
                        
                        // Calculate and store aspect ratio
                        const img = new Image();
                        img.onload = () => {
                          if (img.width > 0) {
                            setRefImageAspectRatio(img.height / img.width);
                          }
                        };
                        img.src = src;
                        
                        // Automatically unlock so they can drag immediately
                        setIsRefImageLocked(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              
              {/* Template Status / Controls Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>🖼️</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--accent-green)', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    Template Loaded
                  </span>
                </div>
                <button
                  onClick={() => setRefImageSrc(null)}
                  title="Remove Template"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  🗑️
                </button>
              </div>

              {/* Lock / Unlock Toggle Button */}
              <button
                onClick={() => setIsRefImageLocked(!isRefImageLocked)}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: isRefImageLocked 
                    ? 'rgba(255,255,255,0.03)' 
                    : 'rgba(192, 132, 252, 0.12)',
                  border: `1px solid ${isRefImageLocked ? 'var(--border-glass)' : 'var(--accent-purple)'}`,
                  color: isRefImageLocked ? 'var(--text-secondary)' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: isRefImageLocked ? 'none' : '0 0 12px rgba(192, 132, 252, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-purple)';
                  if (isRefImageLocked) {
                    e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isRefImageLocked ? 'var(--border-glass)' : 'var(--accent-purple)';
                  e.currentTarget.style.backgroundColor = isRefImageLocked 
                    ? 'rgba(255,255,255,0.03)' 
                    : 'rgba(192, 132, 252, 0.12)';
                }}
              >
                <span>{isRefImageLocked ? '🔒 Tracing Guide Locked' : '🔓 Reposition Guide (Drag Canvas)'}</span>
              </button>

              {/* Opacity Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Guide Opacity</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                    {Math.round(refImageOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.00"
                  step="0.01"
                  value={refImageOpacity}
                  onChange={(e) => setRefImageOpacity(Number(e.target.value))}
                  style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
                />
              </div>

              {/* Scale X Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Width Scale (X)</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                    {Math.round(refImageScaleX * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="3.00"
                  step="0.05"
                  value={refImageScaleX}
                  onChange={(e) => setRefImageScaleX(Number(e.target.value))}
                  style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
                />
              </div>

              {/* Scale Y Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Height Scale (Y)</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                    {Math.round(refImageScaleY * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="3.00"
                  step="0.05"
                  value={refImageScaleY}
                  onChange={(e) => setRefImageScaleY(Number(e.target.value))}
                  style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
                />
              </div>

              {/* Position X Offset Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Horizontal Offset (X)</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                    {refImageX > 0 ? `+${refImageX}` : refImageX}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-2000"
                  max="2000"
                  step="5"
                  value={refImageX}
                  onChange={(e) => setRefImageX(Number(e.target.value))}
                  style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
                />
              </div>

              {/* Position Y Offset Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Vertical Offset (Y)</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                    {refImageY > 0 ? `+${refImageY}` : refImageY}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-2000"
                  max="2000"
                  step="5"
                  value={refImageY}
                  onChange={(e) => setRefImageY(Number(e.target.value))}
                  style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
                />
              </div>

              {/* Reset Transformation Coordinates */}
              <button
                onClick={() => {
                  setRefImageScaleX(1.0);
                  setRefImageScaleY(1.0);
                  setRefImageX(0);
                  setRefImageY(0);
                }}
                style={{
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-secondary)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  marginTop: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              >
                Reset Guide Alignment 🔄
              </button>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
