import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api', () => ({
  api: {
    summary: vi.fn(),
    mapData: vi.fn(),
    historical: vi.fn(),
    forecast: vi.fn(),
    subtypes: vi.fn(),
    countries: vi.fn(),
    anomalies: vi.fn(),
    genomicTrends: vi.fn(),
  },
}))

vi.mock('../components/ChoroplethMap', () => ({
  default: ({ onSelectCountry }) => (
    <button onClick={() => onSelectCountry('US')}>MockMap</button>
  ),
}))

vi.mock('../components/HistoricalChart', () => ({
  default: () => <div>MockHistoricalChart</div>,
}))

vi.mock('../components/CladeTrends', () => ({
  default: () => <div>MockCladeTrends</div>,
}))

vi.mock('../components/SubtypeTrends', () => ({
  default: () => <div>MockSubtypeTrends</div>,
}))

import { api } from '../api'
import Dashboard from '../pages/Dashboard'

const summaryData = {
  total_cases: 100000,
  countries_reporting: 42,
  current_week_cases: 1200,
  week_change_pct: 3.5,
}

const countriesData = [
  {
    country_code: 'US',
    total_cases: 5000,
    per_100k: 15.2,
    delta_pct: 3.5,
    severity: 0.8,
    dominant_type: 'H3N2',
    sparkline: [1, 2, 3],
  },
]

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.summary.mockResolvedValue(summaryData)
  api.mapData.mockResolvedValue([])
  api.historical.mockResolvedValue([])
  api.forecast.mockResolvedValue([])
  api.subtypes.mockResolvedValue([])
  api.countries.mockResolvedValue(countriesData)
  api.anomalies.mockResolvedValue([])
  api.genomicTrends.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Dashboard', () => {
  it('happy path — KPI labels visible, AlertBar present, CountryTable header present', async () => {
    renderDashboard()

    await waitFor(() => expect(screen.getByText('Total Cases')).toBeInTheDocument())
    expect(screen.getByText('Countries Reporting')).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('Week Change')).toBeInTheDocument()

    expect(screen.getByText('No active anomalies')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Country Dashboard')).toBeInTheDocument())
  })

  it('summaryError — error message visible, KPI section absent', async () => {
    api.summary.mockRejectedValue(new Error('summary failed'))
    renderDashboard()

    await waitFor(() =>
      expect(
        screen.getByText('Failed to load summary data — please refresh.'),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByText('Total Cases')).not.toBeInTheDocument()
  })

  it('anomaliesError — AlertBar shows error message', async () => {
    api.anomalies.mockRejectedValue(new Error('anomalies failed'))
    renderDashboard()

    await waitFor(() =>
      expect(
        screen.getByText('Unable to load anomaly alerts — please refresh.'),
      ).toBeInTheDocument(),
    )
  })

  it('country selection — api.historical and api.forecast called with country=US', async () => {
    renderDashboard()

    await waitFor(() => expect(api.historical).toHaveBeenCalledWith(''))

    fireEvent.click(screen.getByText('MockMap'))

    await waitFor(() =>
      expect(api.historical).toHaveBeenCalledWith('country=US'),
    )
    expect(api.forecast).toHaveBeenCalledWith('country=US')
  })
})
