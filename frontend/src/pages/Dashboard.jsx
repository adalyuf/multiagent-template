import React, { useState } from 'react'
import { api } from '../api'
import { useApi } from '../hooks/useApi'
import Header from '../components/Header'
import AlertBar from '../components/AlertBar'
import ChoroplethMap from '../components/ChoroplethMap'
import HistoricalChart from '../components/HistoricalChart'
import CompareChart from '../components/CompareChart'
import CladeTrends from '../components/CladeTrends'
import SubtypeTrends from '../components/SubtypeTrends'
import CountryTable from '../components/CountryTable'
import ForecastChart from '../components/ForecastChart'
import ErrorBoundary from '../components/ErrorBoundary'

const grid2 = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  padding: '0 24px',
  marginBottom: 16,
}

function ErrorCard({ message }) {
  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: 8,
      padding: '16px',
      border: '1px solid #2a2a4a',
      color: '#f87171',
      fontSize: '0.85rem',
    }}>
      {message}
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
  const { data: subtypes, error: subtypesError } = useApi(() => api.subtypes(), [])
  const { data: countries, error: countriesError } = useApi(() => api.countries(), [])
  const { data: anomalies, error: anomaliesError } = useApi(() => api.anomalies(), [])
  const { data: forecast, error: forecastError } = useApi(() => api.forecast(), [])
  const { data: cladeTrends, error: cladeTrendsError } = useApi(() => api.genomicTrends(), [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <Header lastUpdated={summary ? new Date().toISOString() : null} />
      <ErrorBoundary><AlertBar anomalies={anomalies} loadError={anomaliesError} /></ErrorBoundary>

      {/* Summary KPIs */}
      {summaryError ? (
        <div style={{ padding: '16px 24px' }}>
          <ErrorCard message="Failed to load summary data — please refresh." />
        </div>
      ) : summary && (
        <ErrorBoundary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 24px' }}>
            <KpiCard label="Total Cases" value={summary.total_cases?.toLocaleString()} />
            <KpiCard label="Countries Reporting" value={summary.countries_reporting} />
            <KpiCard label="This Week" value={summary.current_week_cases?.toLocaleString()} />
            <KpiCard
              label="Week Change"
              value={`${summary.week_change_pct >= 0 ? '+' : ''}${summary.week_change_pct?.toFixed(1)}%`}
              color={summary.week_change_pct >= 0 ? '#ef4444' : '#22c55e'}
            />
          </div>
        </ErrorBoundary>
      )}

      {/* Main grid: Map + Historical */}
      <div style={grid2}>
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
            <HistoricalChart data={historical} country={selectedCountry} />
          </ErrorBoundary>
        )}
      </div>

      {/* Compare + Forecast */}
      <div style={grid2}>
        <ErrorBoundary><CompareChart /></ErrorBoundary>
        {forecastError ? (
          <ErrorCard message="Failed to load forecast data — please refresh." />
        ) : (
          <ErrorBoundary><ForecastChart data={forecast} /></ErrorBoundary>
        )}
      </div>

      {/* Secondary: Clade + Subtype */}
      <div style={grid2}>
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

      {/* Country table */}
      <div style={{ padding: '0 24px 24px' }}>
        {countriesError ? (
          <ErrorCard message="Failed to load country data — please refresh." />
        ) : (
          <ErrorBoundary>
            <CountryTable
              data={countries}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px', color: '#555', fontSize: '0.75rem', borderTop: '1px solid #1a1a2e' }}>
        Data: WHO FluNet &bull; Nextstrain &bull; FluTracker is for informational purposes only
      </footer>
    </div>
  )
}

function KpiCard({ label, value, color = '#f59e0b' }) {
  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: 8,
      padding: '12px 16px',
      border: '1px solid #2a2a4a',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  )
}
