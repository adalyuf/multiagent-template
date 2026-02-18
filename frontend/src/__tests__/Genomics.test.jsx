import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api', () => ({
  api: {
    genomicTrends: vi.fn(),
    genomicSummary: vi.fn(),
    genomicCountries: vi.fn(),
  },
}))

vi.mock('../components/CladeTrends', () => ({
  default: () => <div>MockCladeTrends</div>,
}))

import { api } from '../api'
import Genomics from '../pages/Genomics'

const summaryData = {
  total_sequences: 12345,
  countries: 12,
  unique_clades: 9,
  dominant_clade: '3C.2a1b',
}

const countriesData = [
  { country_code: 'US', total_sequences: 1500, top_clade: '3C.2a1b' },
  { country_code: 'GB', total_sequences: 900, top_clade: '3C.2a1b.2a.1' },
]

function renderGenomics() {
  return render(
    <MemoryRouter>
      <Genomics />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.genomicTrends.mockResolvedValue([])
  api.genomicSummary.mockResolvedValue(summaryData)
  api.genomicCountries.mockResolvedValue(countriesData)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Genomics', () => {
  it('happy path — heading, KPI values, GenomicsTable rows visible', async () => {
    renderGenomics()

    expect(screen.getByText('Genomics Dashboard')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Total Sequences')).toBeInTheDocument())
    expect(screen.getByText('Countries')).toBeInTheDocument()
    expect(screen.getByText('Unique Clades')).toBeInTheDocument()
    expect(screen.getByText('Dominant Clade')).toBeInTheDocument()

    await waitFor(() => expect(screen.getAllByText('US').length).toBeGreaterThan(0))
    expect(screen.getAllByText('GB').length).toBeGreaterThan(0)
  })

  it('"3yr" button click — api.genomicTrends called with years=3', async () => {
    renderGenomics()

    fireEvent.click(screen.getByText('3yr'))

    await waitFor(() =>
      expect(api.genomicTrends).toHaveBeenCalledWith(
        expect.stringContaining('years=3'),
      ),
    )
  })

  it('"Top 4" button click — api.genomicTrends called with top_n=4', async () => {
    renderGenomics()

    fireEvent.click(screen.getByText('Top 4'))

    await waitFor(() =>
      expect(api.genomicTrends).toHaveBeenCalledWith(
        expect.stringContaining('top_n=4'),
      ),
    )
  })

  it('country select — api.genomicTrends called with country=US param', async () => {
    renderGenomics()

    await waitFor(() =>
      expect(screen.getByRole('combobox')).toBeInTheDocument(),
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'US' } })

    await waitFor(() =>
      expect(api.genomicTrends).toHaveBeenCalledWith(
        expect.stringContaining('country=US'),
      ),
    )
  })

  it('trendsError — error message shown, CladeTrends chart absent', async () => {
    api.genomicTrends.mockRejectedValue(new Error('trends failed'))
    renderGenomics()

    await waitFor(() =>
      expect(
        screen.getByText('Failed to load trend data — please refresh.'),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByText('MockCladeTrends')).not.toBeInTheDocument()
  })

  it('ArrowRight keyboard nav on year radio group cycles to next year', async () => {
    renderGenomics()

    const btn1yr = screen.getByText('1yr')
    expect(btn1yr).toHaveAttribute('aria-checked', 'true')

    fireEvent.keyDown(btn1yr, { key: 'ArrowRight' })

    await waitFor(() =>
      expect(screen.getByText('3yr')).toHaveAttribute('aria-checked', 'true'),
    )
    expect(screen.getByText('1yr')).toHaveAttribute('aria-checked', 'false')
  })
})
