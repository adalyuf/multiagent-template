import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const topologyFixture = {
  type: 'Topology',
  transform: { scale: [1, 1], translate: [0, 0] },
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Polygon', id: '840', arcs: [[0]] },
        { type: 'Polygon', id: '826', arcs: [[1]] },
      ],
    },
  },
  arcs: [
    [[0, 0], [10, 0], [0, 10], [-10, 0], [0, -10]],
    [[20, 0], [10, 0], [0, 10], [-10, 0], [0, -10]],
  ],
}

async function loadComponentWithMockedMap() {
  vi.resetModules()

  const mockJson = vi.fn().mockResolvedValue(topologyFixture)
  vi.doMock('d3', async () => {
    const actual = await vi.importActual('d3')
    return {
      ...actual,
      json: mockJson,
    }
  })

  const module = await import('../components/ChoroplethMap')
  return { ChoroplethMap: module.default, mockJson }
}

afterEach(() => {
  vi.doUnmock('d3')
  vi.restoreAllMocks()
})

describe('ChoroplethMap', () => {
  it('renders SVG but no country paths when data is null', async () => {
    const { ChoroplethMap, mockJson } = await loadComponentWithMockedMap()

    const { container } = render(<ChoroplethMap data={null} />)

    expect(screen.getByRole('img', { name: /world choropleth map/i })).toBeInTheDocument()
    expect(container.querySelectorAll('path.country')).toHaveLength(0)
    expect(mockJson).not.toHaveBeenCalled()
  })

  it('renders country paths when data and topology resolve', async () => {
    const { ChoroplethMap } = await loadComponentWithMockedMap()

    const { container } = render(
      <ChoroplethMap
        data={[
          { country_code: 'US', per_100k: 15 },
          { country_code: 'GB', per_100k: 9 },
        ]}
      />,
    )

    await waitFor(() => {
      expect(container.querySelectorAll('path.country').length).toBeGreaterThan(0)
    })
  })

  it('calls onSelectCountry("US") when clicking US path', async () => {
    const { ChoroplethMap } = await loadComponentWithMockedMap()
    const onSelectCountry = vi.fn()

    const { container } = render(
      <ChoroplethMap
        data={[{ country_code: 'US', per_100k: 15 }]}
        onSelectCountry={onSelectCountry}
      />,
    )

    await waitFor(() => {
      expect(container.querySelectorAll('path.country')).toHaveLength(2)
    })

    const usPath = Array.from(container.querySelectorAll('path.country')).find((path) =>
      path.querySelector('title')?.textContent?.startsWith('US:'),
    )

    expect(usPath).toBeTruthy()
    fireEvent.click(usPath)
    expect(onSelectCountry).toHaveBeenCalledWith('US')
  })

  it('calls onSelectCountry("") when clicking selected country path', async () => {
    const { ChoroplethMap } = await loadComponentWithMockedMap()
    const onSelectCountry = vi.fn()

    const { container } = render(
      <ChoroplethMap
        data={[{ country_code: 'US', per_100k: 15 }]}
        selectedCountry="US"
        onSelectCountry={onSelectCountry}
      />,
    )

    await waitFor(() => {
      expect(container.querySelectorAll('path.country')).toHaveLength(2)
    })

    const usPath = Array.from(container.querySelectorAll('path.country')).find((path) =>
      path.querySelector('title')?.textContent?.startsWith('US:'),
    )

    expect(usPath).toBeTruthy()
    fireEvent.click(usPath)
    expect(onSelectCountry).toHaveBeenCalledWith('')
  })

  it('highlights selected country stroke with #f59e0b', async () => {
    const { ChoroplethMap } = await loadComponentWithMockedMap()

    const { container } = render(
      <ChoroplethMap
        data={[{ country_code: 'US', per_100k: 15 }]}
        selectedCountry="US"
      />,
    )

    await waitFor(() => {
      expect(container.querySelectorAll('path.country')).toHaveLength(2)
    })

    const usPath = Array.from(container.querySelectorAll('path.country')).find((path) =>
      path.querySelector('title')?.textContent?.startsWith('US:'),
    )

    expect(usPath).toBeTruthy()
    expect(usPath).toHaveAttribute('stroke', '#f59e0b')
  })

  it('renders legend labels 0 and 40+', async () => {
    const { ChoroplethMap } = await loadComponentWithMockedMap()

    render(<ChoroplethMap data={[{ country_code: 'US', per_100k: 15 }]} />)

    await screen.findByText('0')
    expect(screen.getByText('40+')).toBeInTheDocument()
  })
})
