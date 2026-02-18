import { expect, test } from '@playwright/test'

const mapTopology = {
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

const historicalGlobal = [
  { season: '2023/2024', week_offset: 2, date: '2023-10-15', cases: 120 },
  { season: '2023/2024', week_offset: 8, date: '2023-11-26', cases: 200 },
  { season: '2024/2025', week_offset: 2, date: '2024-10-15', cases: 180 },
  { season: '2024/2025', week_offset: 8, date: '2024-11-26', cases: 260 },
]

const historicalUs = [
  { season: '2024/2025', week_offset: 2, date: '2024-10-15', cases: 90 },
  { season: '2024/2025', week_offset: 8, date: '2024-11-26', cases: 145 },
]

const historicalGb = [
  { season: '2024/2025', week_offset: 2, date: '2024-10-15', cases: 70 },
  { season: '2024/2025', week_offset: 8, date: '2024-11-26', cases: 101 },
]

const forecastGlobal = {
  forecast: [
    { date: '2025-01-10', forecast: 280, lower: 230, upper: 320 },
    { date: '2025-01-17', forecast: 300, lower: 240, upper: 340 },
  ],
}

const forecastUs = {
  forecast: [
    { date: '2025-01-10', forecast: 150, lower: 120, upper: 180 },
    { date: '2025-01-17', forecast: 160, lower: 130, upper: 190 },
  ],
}

const countries = [
  {
    rank: 1,
    country_code: 'US',
    country_name: 'United States',
    total_cases: 500,
    per_100k: 15.6,
    prior_year_cases: 430,
    delta_pct: 16.3,
    dominant_type: 'H1N1',
    sparkline: [20, 26, 33, 41],
    severity: 0.9,
  },
  {
    rank: 2,
    country_code: 'GB',
    country_name: 'United Kingdom',
    total_cases: 320,
    per_100k: 9.4,
    prior_year_cases: 300,
    delta_pct: 6.7,
    dominant_type: 'H3N2',
    sparkline: [12, 16, 19, 24],
    severity: 0.55,
  },
]

async function mockDashboardApi(page, requestLog = null) {
  await page.route('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mapTopology),
    })
  })

  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const path = `${requestUrl.pathname}${requestUrl.search}`
    if (requestLog) requestLog.push(path)

    let payload = null

    if (requestUrl.pathname.endsWith('/cases/summary')) {
      payload = {
        total_cases: 820,
        countries_reporting: 2,
        current_week_cases: 120,
        prior_week_cases: 100,
        week_change_pct: 20,
      }
    } else if (requestUrl.pathname.endsWith('/cases/map')) {
      payload = [
        { country_code: 'US', total_cases: 500, per_100k: 15.6 },
        { country_code: 'GB', total_cases: 320, per_100k: 9.4 },
      ]
    } else if (requestUrl.pathname.endsWith('/cases/historical')) {
      const country = requestUrl.searchParams.get('country')
      if (country === 'US') payload = historicalUs
      else if (country === 'GB') payload = historicalGb
      else payload = historicalGlobal
    } else if (requestUrl.pathname.endsWith('/forecast')) {
      const country = requestUrl.searchParams.get('country')
      payload = country === 'US' ? forecastUs : forecastGlobal
    } else if (requestUrl.pathname.endsWith('/cases/subtypes')) {
      payload = []
    } else if (requestUrl.pathname.endsWith('/cases/countries')) {
      payload = countries
    } else if (requestUrl.pathname.endsWith('/anomalies')) {
      payload = []
    } else if (requestUrl.pathname.endsWith('/genomics/trends')) {
      payload = []
    } else {
      await route.fulfill({ status: 404, body: 'Not mocked in E2E test' })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

test('renders historical season lines on dashboard load', async ({ page }) => {
  await mockDashboardApi(page)

  await page.goto('/')

  const chart = page.getByRole('img', { name: /line chart comparing historical seasonal flu cases with forecast/i })
  await expect(chart).toBeVisible()

  const chartPaths = chart.locator('path')
  await expect.poll(async () => chartPaths.count()).toBeGreaterThan(2)
})

test('renders forecast series when forecast data is available', async ({ page }) => {
  await mockDashboardApi(page)

  await page.goto('/')

  await expect(page.getByText('Forecast')).toBeVisible()
})

test('country filtering updates dashboard data requests and selected country label', async ({ page }) => {
  const requestLog = []
  await mockDashboardApi(page, requestLog)

  await page.goto('/')

  await expect(page.getByText('Historical Season Comparison (Global)')).toBeVisible()

  await page.getByRole('cell', { name: 'GB' }).first().click()

  await expect(page.getByText('Historical Season Comparison (GB)')).toBeVisible()

  await expect.poll(() => requestLog.some((p) => p.includes('/cases/historical?country=GB'))).toBeTruthy()
  await expect.poll(() => requestLog.some((p) => p.includes('/forecast?country=GB'))).toBeTruthy()
})
