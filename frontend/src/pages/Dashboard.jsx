import React from 'react'
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

export default function Dashboard() {
  const { data: summary } = useApi(() => api.summary(), [])
  const { data: mapData } = useApi(() => api.mapData(), [])
  const { data: historical } = useApi(() => api.historical(), [])
  const { data: subtypes } = useApi(() => api.subtypes(), [])
  const { data: countries } = useApi(() => api.countries(), [])
  const { data: anomalies } = useApi(() => api.anomalies(), [])
  const { data: forecast } = useApi(() => api.forecast(), [])
  const { data: cladeTrends } = useApi(() => api.genomicTrends(), [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <Header lastUpdated={summary ? new Date().toISOString() : null} />
      <ErrorBoundary><AlertBar anomalies={anomalies} /></ErrorBoundary>

      {/* Summary KPIs */}
      {summary && (
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
        <ErrorBoundary><ChoroplethMap data={mapData} /></ErrorBoundary>
        <ErrorBoundary><HistoricalChart data={historical} /></ErrorBoundary>
      </div>

      {/* Compare + Forecast */}
      <div style={grid2}>
        <ErrorBoundary><CompareChart /></ErrorBoundary>
        <ErrorBoundary><ForecastChart data={forecast} /></ErrorBoundary>
      </div>

      {/* Secondary: Clade + Subtype */}
      <div style={grid2}>
        <ErrorBoundary><CladeTrends data={cladeTrends} /></ErrorBoundary>
        <ErrorBoundary><SubtypeTrends data={subtypes} /></ErrorBoundary>
      </div>

      {/* Country table */}
      <div style={{ padding: '0 24px 24px' }}>
        <ErrorBoundary><CountryTable data={countries} /></ErrorBoundary>
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
