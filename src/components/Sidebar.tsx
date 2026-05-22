import React from 'react';
import type { Tube } from '../utils/geometry';
import { formatLength, calculateTubeGeometry, SCALE, generateId } from '../utils/geometry';
import { useSideMenu } from '../store/useSideMenu';
import { useCanvas } from '../store/useCanvas';

// Curated high-fidelity neon colors
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

export const Sidebar: React.FC = () => {
  const {
    sheetType,
    orientation,
    bendRadius,
    useMetric,
    snapToGrid,
    refImageSrc,
    refImageOpacity,
    refImageScale,
    refImageX,
    refImageY,
    isRefImageLocked,
    setSheetType,
    setOrientation,
    setBendRadius,
    setUseMetric,
    setSnapToGrid,
    setRefImageSrc,
    setRefImageOpacity,
    setRefImageScale,
    setRefImageX,
    setRefImageY,
    setIsRefImageLocked,
    setRefImageAspectRatio,
  } = useSideMenu();

  const {
    tubes,
    setTubes,
    selectedTubeId,
    setSelectedTubeId,
    tool,
    setTool,
    isPowerOn,
    setIsPowerOn,
  } = useCanvas();

  const selectedTube = tubes.find(t => t.id === selectedTubeId);

  // Calculate material telemetry
  let totalLengthInches = 0;
  let overLengthCount = 0;

  tubes.forEach(t => {
    const { physicalLengthInches } = calculateTubeGeometry(t.points, bendRadius);
    totalLengthInches += physicalLengthInches;
    if (physicalLengthInches > t.maxLengthInches) {
      overLengthCount++;
    }
  });

  const tubeLimitInches = 48; // Standard 4-foot physical tubing length
  const totalStandardTubesRequired = Math.ceil(totalLengthInches / tubeLimitInches);
  const totalPurchasedLength = totalStandardTubesRequired * tubeLimitInches;
  const scrapLengthInches = Math.max(0, totalPurchasedLength - totalLengthInches);
  const wastePercentage = totalPurchasedLength > 0 ? (scrapLengthInches / totalPurchasedLength) * 100 : 0;

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
      {/* 1. Header & Title Block */}
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

      {/* 2. Neon Power Transformer Switch (Visual Wow Factor) */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
            High-Voltage Power
          </span>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Flick on to ignite glowing neon gas
          </p>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={() => setIsPowerOn(!isPowerOn)}
          style={{
            width: '68px',
            height: '34px',
            borderRadius: '17px',
            backgroundColor: isPowerOn ? 'var(--accent-green)' : '#272a34',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
            boxShadow: isPowerOn ? '0 0 16px var(--accent-green)' : 'none',
            display: 'flex',
            alignItems: 'center',
            padding: '3px'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            transform: isPowerOn ? 'translateX(34px)' : 'translateX(0px)',
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

      {/* 3. Designer's Toolkit */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
          Drafter Toolkit
        </span>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '6px',
          marginTop: '10px'
        }}>
          {[
            { id: 'select', icon: '🖱️', label: 'Select' },
            { id: 'bend', icon: '🟣', label: 'Bend' },
            { id: 'cut', icon: '✂️', label: 'Cut' },
            { id: 'weld', icon: '🟢', label: 'Weld' },
            { id: 'add', icon: '➕', label: 'Add Tube' }
          ].map(t => {
            const isActive = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id as any)}
                title={t.label}
                style={{
                  height: '46px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'var(--accent-purple)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'transparent' : 'var(--border-glass)'}`,
                  color: isActive ? '#0d0f12' : 'var(--text-primary)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  boxShadow: isActive ? '0 4px 12px rgba(192, 132, 252, 0.4)' : 'none'
                }}
              >
                <span>{t.icon}</span>
                <span style={{ fontSize: '7.5px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Selection Customizer */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-glass)',
        backgroundColor: selectedTube ? 'rgba(192, 132, 252, 0.04)' : 'transparent',
        transition: 'background-color 0.3s ease'
      }}>
        <span style={{ fontSize: '11.5px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
          Glass Customizer
        </span>

        {selectedTube ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
            {/* Length info */}
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

            {/* Neon Color Gas presets */}
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

            {/* Tube Diameter */}
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

              {/* Physical Limit Capacity */}
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

      {/* 5. Grid Settings & Bends */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
          Grid & Bending Settings
        </span>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
          
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
      </div>

      {/* 5.5. Reference Blueprint Overlay Image Card */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
          Blueprint Tracing Overlay
        </span>
        
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
            
            {/* Template Status / Controls row */}
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

            {/* Opacity slider */}
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

            {/* Scale slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Scale Ratio</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                  {Math.round(refImageScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="3.00"
                step="0.05"
                value={refImageScale}
                onChange={(e) => setRefImageScale(Number(e.target.value))}
                style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
              />
            </div>

            {/* Position X Offset slider */}
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

            {/* Position Y Offset slider */}
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

            {/* Reset transformation coordinates */}
            <button
              onClick={() => {
                setRefImageScale(1.0);
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

      {/* 6. Material telemetry and planner (Material Monitor) */}
      <div style={{
        padding: '24px',
        marginTop: 'auto',
        borderTop: '1px solid var(--border-glass)',
        backgroundColor: 'rgba(0,0,0,0.2)'
      }}>
        <span style={{ fontSize: '11.5px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
          Material Planning
        </span>

        {tubes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {/* Total length */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Neon Glass:</span>
              <span style={{ fontSize: '16px', fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {formatLength(totalLengthInches, useMetric)}
              </span>
            </div>

            {/* Standard tubes count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Standard 4ft Tubes:</span>
              <span style={{ fontSize: '14.5px', fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                {totalStandardTubesRequired} {totalStandardTubesRequired === 1 ? 'length' : 'lengths'}
              </span>
            </div>

            {/* Waste and scrap factor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Leftover / Waste:</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-secondary)' }}>
                {formatLength(scrapLengthInches, useMetric)} ({wastePercentage.toFixed(0)}% scrap)
              </span>
            </div>

            {/* Progress bar to visual scrap comparison */}
            {totalPurchasedLength > 0 && (
              <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: '#1e293b', overflow: 'hidden', display: 'flex' }}>
                <div style={{
                  width: `${(totalLengthInches / totalPurchasedLength) * 100}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent-purple)'
                }} />
                <div style={{
                  width: `${(scrapLengthInches / totalPurchasedLength) * 100}%`,
                  height: '100%',
                  backgroundColor: '#ef4444',
                  opacity: 0.6
                }} />
              </div>
            )}

            {/* Warning if any segment exceeds 4 feet without an custom layout */}
            {overLengthCount > 0 && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#f87171',
                lineHeight: '1.4'
              }}>
                ⚠️ <strong>{overLengthCount} glass tube(s)</strong> exceed their physical raw size limit! Drag to bend or slice them using the Cut tool ✂️ to stay within boundaries.
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '16px 0 0 0',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            textAlign: 'center'
          }}>
            No glass tubes present.<br/>Click "Add Tube" to start drafting!
          </div>
        )}

        {/* Global Units Toggle & Grid snap option */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-glass)'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Workspace Units</span>
          <button
            onClick={() => setUseMetric(!useMetric)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-purple)',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {useMetric ? 'Metric (mm/m)' : 'Imperial (in/ft)'}
          </button>
        </div>
      </div>
    </div>
  );
};
