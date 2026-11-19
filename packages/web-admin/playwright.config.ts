import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run seed && npm run dev:api',
      cwd: '../..',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000
    },
    {
      command: 'npm run dev:admin',
      cwd: '../..',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000
    }
  ]
})
