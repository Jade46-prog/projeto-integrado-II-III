import { defineConfig } from '@playwright/test';
const port = Number(process.env.E2E_FRONTEND_PORT || 5173);
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { API_PROXY_TARGET: process.env.E2E_API_URL || 'http://127.0.0.1:58080' },
  },
});
