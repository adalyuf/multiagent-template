import { render } from '@testing-library/react'
import HistoricalChart from '../components/HistoricalChart'

const historicalData = [
  { season: '2023/2024', week_offset: 10, cases: 80 },
  { season: '2023/2024', week_offset: 15, cases: 100 },
  { season: '2023/2024', week_offset: 20, cases: 70 },
]

// Forecast where CI upper is far above historical data (100x the mean)
const wideCIForecast = {
  forecast: [
    { date: '2024-01-07', forecast: 90, lower: 50, upper: 10000 },
    { date: '2024-01-14', forecast: 85, lower: 45, upper: 9500 },
  ],
}

describe('HistoricalChart', () => {
  it('renders the svg without crashing', () => {
    const { container } = render(<HistoricalChart data={historicalData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('does not expand y-axis to forecast CI upper bound when CI is wide', () => {
    const { container } = render(
      <HistoricalChart data={historicalData} forecast={wideCIForecast} />,
    )
    const tickTexts = Array.from(
      container.querySelectorAll('svg text'),
    ).map(el => el.textContent)

    // d3.format('.2s') renders 1000+ as e.g. "1.00k", "10.0k"
    // If y-axis max were driven by CI upper (~10000), ticks would contain 'k'
    const hasKiloTick = tickTexts.some(t => t.includes('k') || t.includes('K'))
    expect(hasKiloTick).toBe(false)
  })

  it('adds a clipPath element when forecast is provided', () => {
    const { container } = render(
      <HistoricalChart data={historicalData} forecast={wideCIForecast} />,
    )
    expect(container.querySelector('clipPath')).toBeInTheDocument()
  })

  it('renders the CI clip indicator when CI upper bound exceeds yMax', () => {
    const { container } = render(
      <HistoricalChart data={historicalData} forecast={wideCIForecast} />,
    )
    // wideCIForecast has upper=10000 which far exceeds yMax (~100)
    expect(container.querySelector('.ci-clip-indicator')).toBeInTheDocument()
  })

  it('does not render the CI clip indicator when CI fits within the domain', () => {
    const fittingCIForecast = {
      forecast: [
        { date: '2024-01-07', forecast: 90, lower: 50, upper: 95 },
        { date: '2024-01-14', forecast: 85, lower: 45, upper: 95 },
      ],
    }
    const { container } = render(
      <HistoricalChart data={historicalData} forecast={fittingCIForecast} />,
    )
    // upper=95 < yMax=100, so no clipping indicator
    expect(container.querySelector('.ci-clip-indicator')).not.toBeInTheDocument()
  })
})
