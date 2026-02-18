import React, { useState } from 'react'
import { severityColor } from '../utils/colors'

function Sparkline({ data, width = 80, height = 20 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - (v / max) * height}`
  ).join(' ')

  return (
    <svg width={width} height={height} role="img" aria-label="Weekly country trend sparkline">
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.8" />
    </svg>
  )
}

function SeverityMeter({ value }) {
  return (
    <div style={{
      width: 60,
      height: 6,
      background: 'var(--bg-elevated)',
      borderRadius: 3,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${value * 100}%`,
        height: '100%',
        background: severityColor(value),
        borderRadius: 3,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function SortArrow({ field, sortField, sortDir }) {
  if (field !== sortField) return <span style={{ opacity: 0.3, marginLeft: 4 }}>{'\u2195'}</span>
  return <span style={{ marginLeft: 4, color: 'var(--accent-cyan)' }}>{sortDir === -1 ? '\u25BC' : '\u25B2'}</span>
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

  const thClass = (field) => sortField === field ? 'sorted' : ''

  return (
    <div className="card fade-in-up stagger-3">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <h3 style={{
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          Country Dashboard
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="country-search" style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
          }}>
            Search
          </label>
          <input
            id="country-search"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-display)',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            placeholder="Search countries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--accent-cyan-dim)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
          />
        </div>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 420 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th className={thClass('country_code')} onClick={() => toggleSort('country_code')}>
                Country<SortArrow field="country_code" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={thClass('total_cases')} onClick={() => toggleSort('total_cases')}>
                Cases<SortArrow field="total_cases" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={thClass('per_100k')} onClick={() => toggleSort('per_100k')}>
                Per 100k<SortArrow field="per_100k" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={thClass('delta_pct')} onClick={() => toggleSort('delta_pct')}>
                {'\u0394'} Prior Year<SortArrow field="delta_pct" sortField={sortField} sortDir={sortDir} />
              </th>
              <th>Sparkline</th>
              <th>Severity</th>
              <th>Dominant Type</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const isSelected = r.country_code === selectedCountry
              return (
                <tr
                  key={r.country_code}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => onSelectCountry(isSelected ? '' : r.country_code)}
                >
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{i + 1}</td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{r.country_code}</span>
                  </td>
                  <td className="mono">{r.total_cases?.toLocaleString()}</td>
                  <td className="mono">{r.per_100k?.toFixed(1)}</td>
                  <td style={{ color: r.delta_pct >= 0 ? 'var(--danger)' : 'var(--success)' }}>
                    <span className="mono">{r.delta_pct >= 0 ? '+' : ''}{r.delta_pct?.toFixed(1)}%</span>
                  </td>
                  <td><Sparkline data={r.sparkline} /></td>
                  <td><SeverityMeter value={r.severity || 0} /></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{r.dominant_type}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
