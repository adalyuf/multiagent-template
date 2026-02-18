import React, { useState } from 'react'
import { severityColor } from '../utils/colors'
import { cardContainerStyle, tableStyles } from '../utils/tableStyles'

const styles = {
  container: cardContainerStyle,
  controls: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  input: {
    background: '#1a1a2e',
    color: '#ccc',
    border: '1px solid #333',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: '0.8rem',
  },
  th: {
    ...tableStyles.th,
    cursor: 'pointer',
  },
  table: tableStyles.table,
  td: tableStyles.td,
}

function Sparkline({ data, width = 80, height = 20 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - (v / max) * height}`
  ).join(' ')

  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
    </svg>
  )
}

function SeverityMeter({ value }) {
  return (
    <div style={{ width: 60, height: 8, background: '#1a1a2e', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${value * 100}%`, height: '100%', background: severityColor(value), borderRadius: 4 }} />
    </div>
  )
}

export default function CountryTable({ data, selectedCountry = '', onSelectCountry = () => {} }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('total_cases')
  const [sortDir, setSortDir] = useState(-1)

  if (!data) return null

  const filtered = data.filter(r =>
    r.country_code.toLowerCase().includes(search.toLowerCase()) ||
    (r.country_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    return (a[sortField] > b[sortField] ? 1 : -1) * sortDir
  })

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(-sortDir)
    else { setSortField(field); setSortDir(-1) }
  }

  return (
    <div style={styles.container}>
      <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 12 }}>Country Dashboard</h3>
      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="Search countries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th} onClick={() => toggleSort('country_code')}>Country</th>
              <th style={styles.th} onClick={() => toggleSort('total_cases')}>Cases</th>
              <th style={styles.th} onClick={() => toggleSort('per_100k')}>Per 100k</th>
              <th style={styles.th} onClick={() => toggleSort('delta_pct')}>Δ Prior Year</th>
              <th style={styles.th}>Sparkline</th>
              <th style={styles.th}>Severity</th>
              <th style={styles.th}>Dominant Type</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={r.country_code}
                style={{
                  color: '#ccc',
                  cursor: 'pointer',
                  background: r.country_code === selectedCountry ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                }}
                onClick={() => onSelectCountry(r.country_code === selectedCountry ? '' : r.country_code)}
              >
                <td style={styles.td}>{i + 1}</td>
                <td style={styles.td}>{r.country_code}</td>
                <td style={styles.td}>{r.total_cases?.toLocaleString()}</td>
                <td style={styles.td}>{r.per_100k?.toFixed(1)}</td>
                <td style={{ ...styles.td, color: r.delta_pct >= 0 ? '#ef4444' : '#22c55e' }}>
                  {r.delta_pct >= 0 ? '+' : ''}{r.delta_pct?.toFixed(1)}%
                </td>
                <td style={styles.td}><Sparkline data={r.sparkline} /></td>
                <td style={styles.td}><SeverityMeter value={r.severity || 0} /></td>
                <td style={styles.td}>{r.dominant_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
