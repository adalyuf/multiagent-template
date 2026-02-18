import React from 'react'

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderBottom: '1px solid #2a2a4a',
  },
  logo: { width: 40, height: 40 },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' },
  subtitle: { fontSize: '0.85rem', color: '#888' },
  liveDot: {
    width: 10, height: 10, borderRadius: '50%', background: '#22c55e',
    boxShadow: '0 0 8px #22c55e',
    animation: 'pulse 2s infinite',
  },
  updated: { fontSize: '0.75rem', color: '#666', marginLeft: 'auto' },
}

export default function Header({ lastUpdated }) {
  return (
    <header style={styles.header}>
      <svg style={styles.logo} viewBox="0 0 100 100" role="img" aria-label="FluTracker globe logo">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="3" />
        <ellipse cx="50" cy="50" rx="45" ry="20" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <ellipse cx="50" cy="50" rx="20" ry="45" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="#f59e0b" strokeWidth="1" />
      </svg>
      <div>
        <div style={styles.title}>FluTracker</div>
        <div style={styles.subtitle}>Global Influenza Surveillance Dashboard</div>
      </div>
      <div style={styles.liveDot} />
      <div style={styles.updated}>
        {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'Loading...'}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </header>
  )
}
