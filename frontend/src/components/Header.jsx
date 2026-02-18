import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinkStyle = (active) => ({
  padding: '6px 16px',
  borderRadius: 6,
  fontSize: '0.78rem',
  fontWeight: 500,
  color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
  background: active ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
  textDecoration: 'none',
  transition: 'color 0.2s ease, background 0.2s ease',
})

export default function Header() {
  const location = useLocation()
  const isGenomics = location.pathname === '/genomics'

  return (
    <header style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #0c1024 0%, #111830 50%, #0d1722 100%)',
      borderBottom: '1px solid var(--border-default)',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 15% 50%, rgba(34, 211, 238, 0.04) 0%, transparent 60%), radial-gradient(ellipse at 85% 50%, rgba(6, 182, 212, 0.025) 0%, transparent 55%)',
        pointerEvents: 'none',
      }} />

      {/* Globe logo */}
      <svg style={{ width: 34, height: 34, flexShrink: 0, position: 'relative' }} viewBox="0 0 100 100" role="img" aria-label="FluTracker globe logo">
        <defs>
          <linearGradient id="globe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#globe-grad)" strokeWidth="2.5" opacity="0.85" />
        <ellipse cx="50" cy="50" rx="44" ry="18" fill="none" stroke="url(#globe-grad)" strokeWidth="1.5" opacity="0.4" />
        <ellipse cx="50" cy="50" rx="18" ry="44" fill="none" stroke="url(#globe-grad)" strokeWidth="1.5" opacity="0.4" />
        <line x1="6" y1="50" x2="94" y2="50" stroke="url(#globe-grad)" strokeWidth="1" opacity="0.25" />
        <line x1="50" y1="6" x2="50" y2="94" stroke="url(#globe-grad)" strokeWidth="1" opacity="0.25" />
      </svg>

      {/* Branding */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          Flu<span style={{ color: 'var(--accent-cyan)' }}>Tracker</span>
        </div>
        <div style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
        }}>
          Global Influenza Surveillance
        </div>
      </div>

      {/* Navigation tabs */}
      <nav style={{
        display: 'flex',
        gap: 2,
        marginLeft: 20,
        background: 'rgba(255, 255, 255, 0.035)',
        borderRadius: 8,
        padding: 3,
        position: 'relative',
      }}>
        <Link to="/" style={navLinkStyle(!isGenomics)}>Dashboard</Link>
        <Link to="/genomics" style={navLinkStyle(isGenomics)}>Genomics</Link>
      </nav>

      {/* Live indicator */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
        <div style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 8px var(--success)',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
        }}>
          Live
        </span>
      </div>
    </header>
  )
}
