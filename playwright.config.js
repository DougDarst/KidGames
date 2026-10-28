// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  projects: [
    {
      // Chrome on iPhone runs on Apple's WebKit engine, so this is the one that matters most.
      name: 'iphone',
      use: { ...devices['iPhone 13'] },
      testIgnore: /conventions\.spec/,
    },
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
  ],
});
