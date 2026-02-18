import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useApi } from '../hooks/useApi'
import KpiCards from '../components/KpiCards'
import CladeTrends from '../components/CladeTrends'
import GenomicsTable from '../components/GenomicsTable'
import ErrorBoundary from '../components/ErrorBoundary'

export default function Genomics() {
  const [years, setYears] = useState(1)
  const [country, setCountry] = useState('')
  const [topN, setTopN] = useState(6)

  const params = `years=${years}&top_n=${topN}${country ? `&country=${country}` : ''}`
  const { data: trends, error: trendsError } = useApi(() => api.genomicTrends(params), [years, country, topN])
  const { data: summary, error: summaryError } = useApi(() => api.genomicSummary(), [])
  const { data: countries, error: countriesError } = useApi(() => api.genomicCountries(), [])

  const btnStyle = (active) => ({
    padding: '6px 14px',
    borderRadius: 4,
    border: '1px solid #333',
    background: active ? '#f59e0b' : '#1a1a2e',
    color: active ? '#000' : '#ccc',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0' }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderBottom: '1px solid #2a2a4a',
      }}>
        <Link to="/" style={{ color: '#f59e0b', fontSize: '0.8rem', textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
        <h1 style={{ fontSize: '1.3rem', color: '#f59e0b', marginTop: 4 }}>Genomics Dashboard</h1>
        <p style={{ fontSize: '0.8rem', color: '#888' }}>Influenza genomic sequence analysis</p>
      </header>

      {/* Controls */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 3, 5, 10].map(y => (
            <button key={y} style={btnStyle(years === y)} onClick={() => setYears(y)}>
              {y}yr
            </button>
          ))}
        </div>
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: '6px 12px', fontSize: '0.8rem' }}
        >
          <option value="">All Countries</option>
          {(countries || []).map(c => (
            <option key={c.country_code} value={c.country_code}>{c.country_code}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {[4, 6, 8].map(n => (
            <button key={n} style={btnStyle(topN === n)} onClick={() => setTopN(n)}>
              Top {n}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: '0 24px 16px' }}>
        {summaryError
          ? <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Failed to load genomics summary — please refresh.</p>
          : <ErrorBoundary><KpiCards data={summary} /></ErrorBoundary>}
      </div>

      {/* Clade trends chart */}
      <div style={{ padding: '0 24px 16px' }}>
        {trendsError
          ? <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Failed to load trend data — please refresh.</p>
          : <ErrorBoundary><CladeTrends data={trends} /></ErrorBoundary>}
      </div>

      {/* Countries table */}
      <div style={{ padding: '0 24px 24px' }}>
        {countriesError
          ? <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Failed to load countries data — please refresh.</p>
          : <ErrorBoundary><GenomicsTable data={countries} /></ErrorBoundary>}
      </div>
    </div>
  )
}
