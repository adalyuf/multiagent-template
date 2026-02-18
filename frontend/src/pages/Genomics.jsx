import React, { useState } from 'react'
import { api } from '../api'
import { useApi } from '../hooks/useApi'
import KpiCards from '../components/KpiCards'
import CladeTrends from '../components/CladeTrends'
import GenomicsTable from '../components/GenomicsTable'
import ErrorBoundary from '../components/ErrorBoundary'
import { SkeletonChart, SkeletonTable } from '../components/Skeleton'

const btnStyle = (active) => ({
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--border-default)',
  background: active ? 'var(--accent-cyan)' : 'var(--bg-card)',
  color: active ? '#000' : 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontFamily: 'var(--font-mono)',
  fontWeight: active ? 600 : 400,
  transition: 'all 0.15s ease',
})

export default function Genomics() {
  const [years, setYears] = useState(1)
  const [country, setCountry] = useState('')
  const [topN, setTopN] = useState(6)

  const params = `years=${years}&top_n=${topN}${country ? `&country=${country}` : ''}`
  const { data: trends, error: trendsError } = useApi(() => api.genomicTrends(params), [years, country, topN])
  const { data: summary, error: summaryError } = useApi(() => api.genomicSummary(), [])
  const { data: countries, error: countriesError } = useApi(() => api.genomicCountries(), [])

  const onYearGroupKeyDown = (event, current) => {
    const values = [1, 3, 5, 10]
    const index = values.indexOf(current)
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setYears(values[(index + 1) % values.length])
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setYears(values[(index - 1 + values.length) % values.length])
    }
  }

  const onTopNGroupKeyDown = (event, current) => {
    const values = [4, 6, 8]
    const index = values.indexOf(current)
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setTopN(values[(index + 1) % values.length])
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setTopN(values[(index - 1 + values.length) % values.length])
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Page title + controls */}
      <div style={{
        padding: '20px 24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div>
          <h1 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            Genomics Dashboard
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Influenza genomic sequence analysis
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div role="radiogroup" aria-label="Time range in years" style={{ display: 'flex', gap: 4 }}>
            {[1, 3, 5, 10].map(y => (
              <button
                key={y}
                type="button"
                role="radio"
                aria-checked={years === y}
                tabIndex={years === y ? 0 : -1}
                style={btnStyle(years === y)}
                onClick={() => setYears(y)}
                onKeyDown={(e) => onYearGroupKeyDown(e, y)}
              >
                {y}yr
              </button>
            ))}
          </div>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            <option value="">All Countries</option>
            {(countries || []).map(c => (
              <option key={c.country_code} value={c.country_code}>{c.country_code}</option>
            ))}
          </select>
          <div role="radiogroup" aria-label="Number of top results" style={{ display: 'flex', gap: 4 }}>
            {[4, 6, 8].map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={topN === n}
                tabIndex={topN === n ? 0 : -1}
                style={btnStyle(topN === n)}
                onClick={() => setTopN(n)}
                onKeyDown={(e) => onTopNGroupKeyDown(e, n)}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: '16px 24px' }}>
        {summaryError
          ? <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Failed to load genomics summary — please refresh.</p>
          : <ErrorBoundary><KpiCards data={summary} /></ErrorBoundary>}
      </div>

      {/* Clade trends chart */}
      <div style={{ padding: '0 24px 16px' }}>
        {trendsError
          ? <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Failed to load trend data — please refresh.</p>
          : trends
            ? <ErrorBoundary><CladeTrends data={trends} /></ErrorBoundary>
            : <SkeletonChart height={260} />}
      </div>

      {/* Countries table */}
      <div style={{ padding: '0 24px 24px' }}>
        {countriesError
          ? <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Failed to load countries data — please refresh.</p>
          : countries
            ? <ErrorBoundary><GenomicsTable data={countries} /></ErrorBoundary>
            : <SkeletonTable rows={5} />}
      </div>
    </div>
  )
}
