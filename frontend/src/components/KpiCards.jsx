import React from 'react'

export default function KpiCards({ data }) {
  if (!data) return null

  const cards = [
    { label: 'Total Sequences', value: data.total_sequences?.toLocaleString() || '0' },
    { label: 'Countries', value: data.countries || 0 },
    { label: 'Unique Clades', value: data.unique_clades || 0 },
    { label: 'Dominant Clade', value: data.dominant_clade || '\u2014' },
  ]

  return (
    <div className="grid-kpi" style={{ padding: 0 }}>
      {cards.map((c, i) => (
        <div key={c.label} className={`card fade-in-up stagger-${i + 1}`} style={{
          padding: '14px 16px',
          textAlign: 'center',
          borderTop: '3px solid var(--accent-cyan)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 40,
            background: 'linear-gradient(to bottom, rgba(34, 211, 238, 0.04), transparent)',
            pointerEvents: 'none',
          }} />
          <div className="mono" style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}>
            {c.value}
          </div>
          <div style={{
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            marginTop: 6,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  )
}
