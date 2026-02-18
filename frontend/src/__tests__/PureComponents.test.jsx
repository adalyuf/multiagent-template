import React from 'react'
import { render, screen } from '@testing-library/react'

import AlertBar from '../components/AlertBar'
import ErrorBoundary from '../components/ErrorBoundary'
import GenomicsTable from '../components/GenomicsTable'
import Header from '../components/Header'
import KpiCards from '../components/KpiCards'
import { severityColor } from '../utils/colors'

describe('AlertBar', () => {
  it('renders empty state when anomalies list is empty', () => {
    render(<AlertBar anomalies={[]} />)
    expect(screen.getByText('No active anomalies')).toBeInTheDocument()
  })

  it('renders load error state', () => {
    render(<AlertBar anomalies={[]} loadError />)
    expect(screen.getByText('Unable to load anomaly alerts — please refresh.')).toBeInTheDocument()
  })

  it('renders high and medium severity chips with expected dot colors', () => {
    render(
      <AlertBar
        anomalies={[
          { id: 1, severity: 'high', message: 'High alert' },
          { id: 2, severity: 'medium', message: 'Medium alert' },
        ]}
      />,
    )

    const dots = screen.getAllByRole('generic', { hidden: true }).filter((node) => node.getAttribute('aria-hidden') === 'true')
    expect(dots).toHaveLength(2)
    expect(dots[0]).toHaveStyle({ background: '#ef4444' })
    expect(dots[1]).toHaveStyle({ background: '#f59e0b' })
  })
})

describe('Header', () => {
  it('shows Loading... when lastUpdated is null', () => {
    render(<Header lastUpdated={null} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows formatted timestamp for valid ISO input', () => {
    const iso = '2025-01-02T03:04:05.000Z'
    const expected = `Last updated: ${new Date(iso).toLocaleString()}`

    render(<Header lastUpdated={iso} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})

describe('KpiCards', () => {
  it('renders nothing when data is null', () => {
    const { container } = render(<KpiCards data={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders 4 KPI cards when data is present', () => {
    render(
      <KpiCards
        data={{
          total_sequences: 12345,
          countries: 12,
          unique_clades: 9,
          dominant_clade: '3C.2a1b',
        }}
      />,
    )

    expect(screen.getByText('Total Sequences')).toBeInTheDocument()
    expect(screen.getByText('Countries')).toBeInTheDocument()
    expect(screen.getByText('Unique Clades')).toBeInTheDocument()
    expect(screen.getByText('Dominant Clade')).toBeInTheDocument()
  })
})

function Crashy({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('boom')
  }
  return <div>Child loaded</div>
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error

  beforeAll(() => {
    console.error = vi.fn()
  })

  afterAll(() => {
    console.error = originalConsoleError
  })

  it('shows fallback UI when child throws', () => {
    render(
      <ErrorBoundary resetKey="a">
        <Crashy shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong loading this section.')).toBeInTheDocument()
  })

  it('recovers when resetKey changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="a">
        <Crashy shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong loading this section.')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKey="b">
        <Crashy shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.queryByText('Something went wrong loading this section.')).not.toBeInTheDocument()
    expect(screen.getByText('Child loaded')).toBeInTheDocument()
  })
})

describe('GenomicsTable', () => {
  it('renders nothing when data is null or empty', () => {
    const { container, rerender } = render(<GenomicsTable data={null} />)
    expect(container.firstChild).toBeNull()

    rerender(<GenomicsTable data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders ranked rows when data exists', () => {
    render(
      <GenomicsTable
        data={[
          { country_code: 'US', total_sequences: 1500, top_clade: '3C.2a1b' },
          { country_code: 'GB', total_sequences: 900, top_clade: '3C.2a1b.2a.1' },
        ]}
      />,
    )

    expect(screen.getByText('Top Countries by Sequences')).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
    expect(screen.getByText('GB')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

describe('severityColor', () => {
  it('returns expected colors at threshold boundaries', () => {
    expect(severityColor(0)).toBe('#22c55e')
    expect(severityColor(0.2499)).toBe('#22c55e')
    expect(severityColor(0.25)).toBe('#eab308')
    expect(severityColor(0.5)).toBe('#f59e0b')
    expect(severityColor(0.75)).toBe('#ef4444')
  })
})
