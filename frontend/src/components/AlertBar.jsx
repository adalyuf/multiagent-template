import React from 'react'

const styles = {
  bar: {
    display: 'flex',
    gap: '8px',
    padding: '8px 24px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
    overflowX: 'auto',
    minHeight: 40,
    alignItems: 'center',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '16px',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    color: '#fca5a5',
  },
  severityText: { fontWeight: 600, color: '#fecaca' },
  dot: (severity) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: severity === 'high' ? '#ef4444' : '#f59e0b',
  }),
  empty: { fontSize: '0.8rem', color: '#666' },
}

function severityLabel(severity) {
  const value = String(severity || '').toLowerCase()
  if (value === 'high') return 'High'
  if (value === 'medium') return 'Medium'
  if (value === 'low') return 'Low'
  if (value === 'unknown') return 'Unknown'
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'Unknown'
}

export default function AlertBar({ anomalies, loadError }) {
  if (loadError) {
    return (
      <div style={styles.bar} role="region" aria-label="Anomaly alerts">
        <span style={{ ...styles.empty, color: '#f87171' }}>Unable to load anomaly alerts — please refresh.</span>
      </div>
    )
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <div style={styles.bar} role="region" aria-label="Anomaly alerts">
        <span style={styles.empty}>No active anomalies</span>
      </div>
    )
  }

  return (
    <div style={styles.bar} role="region" aria-label="Anomaly alerts">
      {anomalies.map((a, i) => (
        <div key={a.id || i} style={styles.chip}>
          <span style={styles.dot(a.severity)} aria-hidden="true" />
          <span style={styles.severityText}>
            {severityLabel(a.severity)}:
          </span>
          {a.message}
        </div>
      ))}
    </div>
  )
}
