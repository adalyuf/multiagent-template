// @ts-check
const { test, expect } = require('@playwright/test')

const TIMEOUT = 10_000

test.describe('Genomics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/genomics')
    await expect(page.getByText('Genomics Dashboard')).toBeVisible({ timeout: TIMEOUT })
  })

  test('"3yr" button click sets aria-checked="true" on that button', async ({ page }) => {
    const btn3yr = page.getByRole('radio', { name: '3yr' })
    await expect(btn3yr).toBeVisible({ timeout: TIMEOUT })

    // Initially 1yr is selected
    await expect(page.getByRole('radio', { name: '1yr' })).toHaveAttribute('aria-checked', 'true')

    await btn3yr.click()

    await expect(btn3yr).toHaveAttribute('aria-checked', 'true', { timeout: TIMEOUT })
    await expect(page.getByRole('radio', { name: '1yr' })).toHaveAttribute('aria-checked', 'false')
  })
})
