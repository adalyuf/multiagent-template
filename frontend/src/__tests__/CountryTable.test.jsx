import { fireEvent, render, screen } from '@testing-library/react'
import CountryTable from '../components/CountryTable'

const rows = [
  {
    country_code: 'US',
    country_name: 'United States',
    total_cases: 300,
    per_100k: 10.2,
    delta_pct: 5.1,
    sparkline: [1, 2, 3],
    severity: 0.8,
    dominant_type: 'H1N1',
  },
  {
    country_code: 'GB',
    country_name: 'United Kingdom',
    total_cases: 100,
    per_100k: 4.5,
    delta_pct: -2.1,
    sparkline: [3, 2, 1],
    severity: 0.4,
    dominant_type: 'H3N2',
  },
  {
    country_code: 'CA',
    country_name: 'Canada',
    total_cases: 200,
    per_100k: 7.7,
    delta_pct: 1.2,
    sparkline: [2, 3, 4],
    severity: 0.6,
    dominant_type: 'B',
  },
]

function getVisibleCountryCodes(container) {
  return Array.from(container.querySelectorAll('tbody tr td:nth-child(2)')).map((cell) => cell.textContent)
}

describe('CountryTable', () => {
  it('filters countries by search query', () => {
    render(<CountryTable data={rows} />)
    const input = screen.getByPlaceholderText('Search countries...')

    fireEvent.change(input, { target: { value: 'kingdom' } })

    expect(screen.getByText('GB')).toBeInTheDocument()
    expect(screen.queryByText('US')).not.toBeInTheDocument()
    expect(screen.queryByText('CA')).not.toBeInTheDocument()
  })

  it('sorts by cases when clicking the Cases header', () => {
    const { container } = render(<CountryTable data={rows} />)
    const casesHeader = screen.getByText('Cases')

    fireEvent.click(casesHeader)
    expect(getVisibleCountryCodes(container)).toEqual(['GB', 'CA', 'US'])

    fireEvent.click(casesHeader)
    expect(getVisibleCountryCodes(container)).toEqual(['US', 'CA', 'GB'])
  })

  it('calls onSelectCountry when a row is clicked', () => {
    const onSelectCountry = vi.fn()
    render(<CountryTable data={rows} onSelectCountry={onSelectCountry} />)

    fireEvent.click(screen.getByText('GB'))
    expect(onSelectCountry).toHaveBeenCalledWith('GB')
  })
})
