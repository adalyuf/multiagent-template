// @ts-check
const { test, expect } = require('@playwright/test')

const TIMEOUT = 10_000

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('4 KPI cards are visible', async ({ page }) => {
    await expect(page.getByText('Total Cases')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText('Countries Reporting')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText('This Week')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText('Week Change')).toBeVisible({ timeout: TIMEOUT })
  })

  test('AlertBar container is present', async ({ page }) => {
    // AlertBar always renders below the page header in one of three states:
    // "No active anomalies", a load-error message, or anomaly chips.
    // Wait for the KPI section to confirm the page settled.
    await expect(page.getByText('Total Cases')).toBeVisible({ timeout: TIMEOUT })

    // Assert that none of AlertBar's states triggered an ErrorBoundary crash.
    await expect(
      page.getByText('Something went wrong loading this section.'),
    ).not.toBeVisible()

    // One of the known text states must be visible, or anomaly chips exist.
    const emptyState = page.getByText('No active anomalies')
    const errorState = page.getByText('Unable to load anomaly alerts — please refresh.')
    const chipState = page.locator('[style*="rgba(239, 68, 68, 0.15)"]').first()

    const found = await Promise.any([
      emptyState.waitFor({ state: 'visible', timeout: TIMEOUT }),
      errorState.waitFor({ state: 'visible', timeout: TIMEOUT }),
      chipState.waitFor({ state: 'visible', timeout: TIMEOUT }),
    ]).then(() => true).catch(() => false)

    expect(found, 'AlertBar should render in one of its known states').toBe(true)
  })

  test('Country table has at least one data row', async ({ page }) => {
    await expect(page.getByText('Country Dashboard')).toBeVisible({ timeout: TIMEOUT })

    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: TIMEOUT })

    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Clicking a table row highlights it and chart SVG remains present', async ({ page }) => {
    await expect(page.getByText('Country Dashboard')).toBeVisible({ timeout: TIMEOUT })

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.waitFor({ timeout: TIMEOUT })
    await firstRow.click()

    // Row receives a highlighted background (amber tint applied via inline style)
    await expect(firstRow).toHaveCSS('background-color', /^rgba\(245, 158, 11/)

    // Chart SVG is still present (HistoricalChart or ChoroplethMap)
    await expect(page.locator('svg').first()).toBeVisible({ timeout: TIMEOUT })
  })

  test('Navigate to Genomics via "View Genomics Dashboard" link', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /View Genomics Dashboard/i }),
    ).toBeVisible({ timeout: TIMEOUT })

    await page.getByRole('link', { name: /View Genomics Dashboard/i }).click()

    await expect(page).toHaveURL('/genomics', { timeout: TIMEOUT })
    await expect(page.getByText('Genomics Dashboard')).toBeVisible({ timeout: TIMEOUT })
  })
})
