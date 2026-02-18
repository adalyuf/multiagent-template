import React, { useState } from 'react'
import { api } from '../api'
import { useApi } from '../hooks/useApi'
import AlertBar from '../components/AlertBar'
import ChoroplethMap from '../components/ChoroplethMap'
import HistoricalChart from '../components/HistoricalChart'
import CladeTrends from '../components/CladeTrends'
import SubtypeTrends from '../components/SubtypeTrends'
import CountryTable from '../components/CountryTable'
import ErrorBoundary from '../components/ErrorBoundary'
import { SkeletonKpi, SkeletonChart, SkeletonTable } from '../components/Skeleton'

function ErrorCard({ message }) {
  return (
    <div className="card" style={{ color: '#f87171', fontSize: '0.85rem' }}>
      {message}
    </div>
  )
}

function KpiCard({ label, value, accentColor = 'var(--accent-cyan)', valueColor, className = '' }) {
  return (
    <div className={`card ${className}`} style={{
      padding: '14px 16px',
      textAlign: 'center',
      borderTop: `3px solid ${accentColor}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 40,
        background: `linear-gradient(to bottom, ${accentColor}0a, transparent)`,
        pointerEvents: 'none',
      }} />
      <div className="mono" style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: valueColor || 'var(--text-primary)',
        lineHeight: 1.2,
      }}>
        {value ?? '—'}
      </div>
      <div style={{
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        marginTop: 6,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {label}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [selectedCountry, setSelectedCountry] = useState('')
  const { data: summary, error: summaryError } = useApi(() => api.summary(), [])
  const { data: mapData, error: mapError } = useApi(() => api.mapData(), [])
  const historicalParams = selectedCountry ? `country=${selectedCountry}` : ''
  const { data: historical, error: historicalError } = useApi(
    () => api.historical(historicalParams),
    [selectedCountry],
  )
  const forecastParams = selectedCountry ? `country=${selectedCountry}` : ''
  const { data: forecast, error: forecastError } = useApi(
    () => api.forecast(forecastParams),
    [selectedCountry],
  )
  const { data: subtypes, error: subtypesError } = useApi(() => api.subtypes(), [])
  const { data: countries, error: countriesError } = useApi(() => api.countries(), [])
  const { data: anomalies, error: anomaliesError } = useApi(() => api.anomalies(), [])
  const { data: cladeTrends, error: cladeTrendsError } = useApi(() => api.genomicTrends(), [])

  return (
    <div style={{ minHeight: '100vh' }}>
      <ErrorBoundary><AlertBar anomalies={anomalies} loadError={anomaliesError} /></ErrorBoundary>

      {/* KPI Cards */}
      {summaryError ? (
        <div style={{ padding: '16px 24px' }}>
          <ErrorCard message="Failed to load summary data — please refresh." />
        </div>
      ) : (
        <div className="grid-kpi">
          {summary ? (
            <>
              <KpiCard
                label="Total Cases"
                value={summary.total_cases?.toLocaleString()}
                className="fade-in-up stagger-1"
              />
              <KpiCard
                label="Countries Reporting"
                value={summary.countries_reporting}
                className="fade-in-up stagger-2"
              />
              <KpiCard
                label="This Week"
                value={summary.current_week_cases?.toLocaleString()}
                className="fade-in-up stagger-3"
              />
              <KpiCard
                label="Week Change"
                value={`${summary.week_change_pct >= 0 ? '+' : ''}${summary.week_change_pct?.toFixed(1)}%`}
                accentColor={summary.week_change_pct >= 0 ? 'var(--danger)' : 'var(--success)'}
                valueColor={summary.week_change_pct >= 0 ? 'var(--danger)' : 'var(--success)'}
                className="fade-in-up stagger-4"
              />
            </>
          ) : (
            <>
              <SkeletonKpi />
              <SkeletonKpi />
              <SkeletonKpi />
              <SkeletonKpi />
            </>
          )}
        </div>
      )}

      {/* Hero: Map + Historical */}
      <div className="grid-hero">
        {mapError ? (
          <ErrorCard message="Failed to load map data — please refresh." />
        ) : (
          <ErrorBoundary>
            <ChoroplethMap
              data={mapData}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          </ErrorBoundary>
        )}
        {historicalError ? (
          <ErrorCard message="Failed to load historical data — please refresh." />
        ) : (
          <ErrorBoundary>
            <HistoricalChart
              data={historical}
              country={selectedCountry}
              forecast={forecastError ? null : forecast}
              forecastUnavailable={!!forecastError}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Trends Section */}
      <div className="section-label">Trends</div>
      <div className="grid-half">
        {cladeTrendsError ? (
          <ErrorCard message="Failed to load clade trend data — please refresh." />
        ) : (
          <ErrorBoundary><CladeTrends data={cladeTrends} /></ErrorBoundary>
        )}
        {subtypesError ? (
          <ErrorCard message="Failed to load subtype data — please refresh." />
        ) : (
          <ErrorBoundary><SubtypeTrends data={subtypes} /></ErrorBoundary>
        )}
      </div>

      {/* Country Table */}
      <div style={{ padding: '0 24px 24px' }}>
        {countriesError ? (
          <ErrorCard message="Failed to load country data — please refresh." />
        ) : countries ? (
          <ErrorBoundary>
            <CountryTable
              data={countries}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          </ErrorBoundary>
        ) : (
          <SkeletonTable rows={8} />
        )}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '20px 16px',
        color: 'var(--text-muted)',
        fontSize: '0.7rem',
        borderTop: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
      }}>
        Data: WHO FluNet &bull; Nextstrain &bull; FluTracker is for informational purposes only
      </footer>
    </div>
  )
}
