import React, { useState } from 'react';
import { formatLength, calculateTubeGeometry } from '../utils/geometry';
import { useSideMenu } from '../store/useSideMenu';
import { useCanvas } from '../store/useCanvas';

export const MaterialPlanning: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    bendRadius,
    useMetric,
    fitMargin,
    setFitMargin,
    setUseMetric,
  } = useSideMenu();

  const {
    tubes,
    setTubes,
  } = useCanvas();

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

  // Scale all tubes globally so that total physical length becomes exactly 48" - fitMargin
  const handleExpandTo4FeetGlobal = () => {
    if (tubes.length === 0) return;

    const targetLengthInches = Math.max(0.1, 48 - fitMargin);

    // 1. Calculate total current length
    let totalLength = 0;
    tubes.forEach(t => {
      const { physicalLengthInches } = calculateTubeGeometry(t.points, bendRadius);
      totalLength += physicalLengthInches;
    });

    if (totalLength <= 0) return;
    const scaleFactor = targetLengthInches / totalLength;

    // 2. Calculate center of all points across all tubes
    let sumX = 0;
    let sumY = 0;
    let totalPointsCount = 0;
    tubes.forEach(t => {
      t.points.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        totalPointsCount++;
      });
    });

    if (totalPointsCount === 0) return;
    const centerX = sumX / totalPointsCount;
    const centerY = sumY / totalPointsCount;

    // 3. Scale all tubes
    setTubes(prev =>
      prev.map(t => {
        const scaledPoints = t.points.map(p => {
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
        return {
          ...t,
          points: scaledPoints
        };
      })
    );
  };

  return (
    <div style={{
      borderBottom: '1px solid var(--border-glass)',
      backgroundColor: isOpen ? 'rgba(0,0,0,0.1)' : 'transparent',
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
          📊 Material Planning
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          {tubes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

              {/* Warning if any segment exceeds raw limit */}
              {overLengthCount > 0 && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: '#f87171',
                  lineHeight: '1.4',
                  marginTop: '4px'
                }}>
                  ⚠️ <strong>{overLengthCount} glass tube(s)</strong> exceed their physical raw size limit! Drag to bend or slice them using the Cut tool ✂️ to stay within boundaries.
                </div>
              )}

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
                  <span>Raw Limit: {formatLength(48, useMetric)}</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
                    Final Target: {formatLength(48 - fitMargin, useMetric)}
                  </span>
                </div>
              </div>

              {/* Fit Total Design to 4' Button */}
              <button
                onClick={handleExpandTo4FeetGlobal}
                style={{
                  width: '100%',
                  height: '32px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(192, 132, 252, 0.08)',
                  border: '1px dashed rgba(192, 132, 252, 0.4)',
                  color: 'var(--accent-purple)',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  marginTop: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.15)';
                  e.currentTarget.style.borderColor = 'var(--accent-purple)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(192, 132, 252, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.4)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📏 Fit Total Design to 4' (Scale)
              </button>
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
      )}
    </div>
  );
};
