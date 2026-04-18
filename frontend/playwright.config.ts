import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for FlowSync Arena E2E tests.
 *
 * Tests run against the local dev server.
 * In CI, the server is started automatically via `webServer`.
 */
export default defineConfig({
  testDir: './e2e',

  // Timeout per test
  timeout: 30_000,

  // Fail fast in CI
  forbidOnly: !!process.env.CI,

  // Retry flaky tests in CI
  retries: process.env.CI ? 2 : 0,

  // Parallelism
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    // All tests use this base URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',

    // Collect traces for failures
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Viewport
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Optionally run on Firefox in CI
    ...(process.env.CI
      ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }]
      : []),
  ],

  // Automatically start the dev server when running locally
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
