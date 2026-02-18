import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import StackedAreaChart from '../components/StackedAreaChart'
import CladeTrends from '../components/CladeTrends'
import SubtypeTrends from '../components/SubtypeTrends'

const stackedData = [
  { date: '2024-01-01', series: 'A', value: 12 },
  { date: '2024-01-01', series: 'B', value: 8 },
  { date: '2024-01-08', series: 'A', value: 9 },
  { date: '2024-01-08', series: 'B', value: 11 },
]

describe('StackedAreaChart', () => {
  it('renders SVG, title, and header action', () => {
    const { container } = render(
      <StackedAreaChart
        data={stackedData}
        keys={['A', 'B']}
        colorScale={{ A: '#ff0000', B: '#00ff00' }}
        xAccessor={(d) => d.date}
        yAccessor={(d) => d.value}
        seriesAccessor={(d) => d.series}
        title="Stacked Test"
        ariaLabel="stacked area test chart"
        headerAction={<button type="button">Inspect</button>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Stacked Test' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inspect' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'stacked area test chart' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders one .layer path per key', async () => {
    const { container } = render(
      <StackedAreaChart
        data={stackedData}
        keys={['A', 'B']}
        colorScale={{ A: '#ff0000', B: '#00ff00' }}
        xAccessor={(d) => d.date}
        yAccessor={(d) => d.value}
        seriesAccessor={(d) => d.series}
        title="Stacked Test"
      />,
    )

    await waitFor(() => {
      expect(container.querySelectorAll('path.layer')).toHaveLength(2)
    })
  })

  it('renders no layer paths when data is empty', () => {
    const { container } = render(
      <StackedAreaChart
        data={[]}
        keys={['A', 'B']}
        colorScale={{ A: '#ff0000', B: '#00ff00' }}
        xAccessor={(d) => d.date}
        yAccessor={(d) => d.value}
        seriesAccessor={(d) => d.series}
        title="Empty Stacked"
      />,
    )

    expect(container.querySelectorAll('path.layer')).toHaveLength(0)
  })
})

describe('CladeTrends', () => {
  const cladeData = [
    { date: '2024-01-01', clade: '3C.2a1b', count: 10 },
    { date: '2024-01-08', clade: '3C.2a1b', count: 12 },
    { date: '2024-01-01', clade: '3C.2a1b.2a.1', count: 8 },
  ]

  it('renders genomics dashboard link and chart SVG', async () => {
    const { container } = render(
      <MemoryRouter>
        <CladeTrends data={cladeData} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /view genomics dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /clade trends over time/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(container.querySelector('path.layer')).toBeInTheDocument()
    })
  })
})

describe('SubtypeTrends', () => {
  const subtypeData = [
    { date: '2024-01-01', subtype: 'H1N1', cases: 21 },
    { date: '2024-01-08', subtype: 'H1N1', cases: 18 },
    { date: '2024-01-01', subtype: 'H3N2', cases: 15 },
  ]

  it('renders without crashing and shows the expected title', async () => {
    const { container } = render(<SubtypeTrends data={subtypeData} />)

    expect(screen.getByRole('heading', { name: 'Subtype Trends (1 year)' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /subtype trends over time/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(container.querySelector('path.layer')).toBeInTheDocument()
    })
  })
})
