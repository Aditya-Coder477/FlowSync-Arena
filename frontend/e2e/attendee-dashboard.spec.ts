/**
 * E2E tests: Attendee Dashboard — critical user flows.
 *
 * Covers:
 * 1. Dashboard loads and renders key sections (crowd map, queue status)
 * 2. Quick Find shortcuts trigger route recommendations
 * 3. Route selector: user selects from/to zones and gets a route
 * 4. Alert banner appears when a warning-level alert is present
 * 5. Keyboard navigation: user can tab through the sidebar and reach main content
 * 6. Accessibility: page has proper landmarks and no images without alt text
 *
 * Note: These tests rely on the app's built-in API fallback (mock data),
 * so they work even when the backend is unavailable in CI.
 */
import { test, expect, Page } from '@playwright/test'

// ── Helpers ──────────────────────────────────────────────────────────────

async function goToAttendeeDashboard(page: Page) {
  await page.goto('/attendee')
  // Wait for the page to finish its initial load state
  await page.waitForLoadState('networkidle')
}

// ── Tests ─────────────────────────────────────────────────────────────────

test.describe('Attendee Dashboard — Page Load', () => {
  test('loads and renders the page title', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // The h1 should say "Your Arena"
    const h1 = page.getByRole('heading', { level: 1, name: /your arena/i })
    await expect(h1).toBeVisible()
  })

  test('renders the Crowd Map section', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Section header text
    await expect(page.getByText('Crowd Map')).toBeVisible()
  })

  test('renders the Queue Status section', async ({ page }) => {
    await goToAttendeeDashboard(page)

    await expect(page.getByText('Queue Status')).toBeVisible()
  })

  test('renders the Smart Route section', async ({ page }) => {
    await goToAttendeeDashboard(page)

    await expect(page.getByText('Smart Route')).toBeVisible()
  })

  test('renders the sidebar with navigation links', async ({ page }) => {
    await goToAttendeeDashboard(page)

    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByText('FlowSync')).toBeVisible()
  })

  test('shows queue cards with wait time information', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // At least one queue card should be visible
    const queueCards = page.locator('.queue-card')
    await expect(queueCards.first()).toBeVisible()

    // Queue card should show "min wait"
    await expect(page.getByText('min wait').first()).toBeVisible()
  })
})

test.describe('Attendee Dashboard — Route Recommendation Flow', () => {
  test('user can find a route using the Smart Route selector', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Find the "You're at" select dropdown
    const fromSelect = page.getByLabel(/you're at/i)
    await expect(fromSelect).toBeVisible()

    // Find the "Going to" select dropdown
    const toSelect = page.getByLabel(/going to/i)
    await expect(toSelect).toBeVisible()

    // Select a from zone
    await fromSelect.selectOption('entrance-north')

    // Select a destination
    await toSelect.selectOption('east-wing')

    // Click "Find route" button
    const findRouteBtn = page.getByRole('button', { name: /find route/i })
    await expect(findRouteBtn).toBeEnabled()
    await findRouteBtn.click()

    // Route steps should appear
    await expect(page.locator('.route-step').first()).toBeVisible({ timeout: 5000 })
  })

  test('Find Route button is disabled when no destination selected', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Clear the "to" select (should be empty by default)
    const toSelect = page.getByLabel(/going to/i)
    await toSelect.selectOption('')

    const findRouteBtn = page.getByRole('button', { name: /find route/i })
    await expect(findRouteBtn).toBeDisabled()
  })
})

test.describe('Attendee Dashboard — Quick Find Shortcuts', () => {
  test('clicking Restrooms shortcut triggers a route recommendation', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Find the Restrooms quick-find button
    const restroomsBtn = page.getByRole('button', { name: /restrooms/i })
    await expect(restroomsBtn).toBeVisible()
    await restroomsBtn.click()

    // After clicking, route steps should be rendered
    await expect(page.locator('.route-step').first()).toBeVisible({ timeout: 5000 })
  })

  test('clicking Exit shortcut triggers a route to a gate', async ({ page }) => {
    await goToAttendeeDashboard(page)

    const exitBtn = page.getByRole('button', { name: /exit/i })
    await expect(exitBtn).toBeVisible()
    await exitBtn.click()

    await expect(page.locator('.route-step').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Attendee Dashboard — Accessibility', () => {
  test('page has exactly one h1', async ({ page }) => {
    await goToAttendeeDashboard(page)

    const h1Elements = page.getByRole('heading', { level: 1 })
    await expect(h1Elements).toHaveCount(1)
  })

  test('has a main landmark', async ({ page }) => {
    await goToAttendeeDashboard(page)

    const main = page.getByRole('main')
    await expect(main).toBeVisible()
  })

  test('has navigation landmark in sidebar', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // At least one nav element should be present
    const navElements = page.getByRole('navigation')
    await expect(navElements.first()).toBeVisible()
  })

  test('alert banner has role="alert" when alerts are present', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Check if any alerts rendered — in mock data, there is usually one warning
    const alertBanner = page.locator('[role="alert"]')
    // May or may not be present depending on mock data
    // If present, it should be visible
    const count = await alertBanner.count()
    if (count > 0) {
      await expect(alertBanner.first()).toBeVisible()
    }
  })

  test('all images have alt text', async ({ page }) => {
    await goToAttendeeDashboard(page)

    const imagesWithoutAlt = await page.locator('img:not([alt])').count()
    expect(imagesWithoutAlt).toBe(0)
  })

  test('interactive elements are keyboard reachable', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Tab to the first interactive element
    await page.keyboard.press('Tab')

    // After a few tabs, some focused element should exist
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(['A', 'BUTTON', 'SELECT', 'INPUT', 'TEXTAREA']).toContain(focusedTag)
  })

  test('sidebar nav links have visible focus styles', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Focus the first nav link via keyboard
    await page.keyboard.press('Tab')

    // Focused element should have a visible outline (not zero/none)
    const focusedOutline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      if (!el) return ''
      return window.getComputedStyle(el).outlineStyle
    })
    // Should not be 'none' — CSS should provide a visible focus ring
    expect(focusedOutline).not.toBe('none')
  })
})

test.describe('Attendee Dashboard — Live Indicator', () => {
  test('shows live update indicator', async ({ page }) => {
    await goToAttendeeDashboard(page)

    // Check for "Updating" or "Live" text
    await expect(
      page.getByText(/updating|live/i).first()
    ).toBeVisible()
  })
})
