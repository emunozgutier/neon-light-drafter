import React, { useState } from 'react';

interface PrintProps {
  onOpenPrint: () => void;
}

export const Print: React.FC<PrintProps> = ({ onOpenPrint }) => {
  const [isOpen, setIsOpen] = useState(false);

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
          🖨️ Production & Print
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={onOpenPrint}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: 'rgba(192, 132, 252, 0.08)',
              border: '1px solid rgba(192, 132, 252, 0.4)',
              color: 'var(--accent-purple)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
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
            <span>🖨️ Print 1:1 Scale Outline...</span>
          </button>
          <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
            Open 1:1 scale shop drawing print workbench. Align, auto-center, and customize layout guidelines.
          </p>
        </div>
      )}
    </div>
  );
};
