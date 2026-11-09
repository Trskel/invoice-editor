const config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'jest-fixed-jsdom',
  // The form tests fill their fields one by one with real timers, and the
  // slowest run close to five seconds; a page now mounts lifecycle actions per
  // row, so the default is too tight.
  testTimeout: 10000,
  testEnvironmentOptions: {
    html: '<!DOCTYPE html>',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    customExportConditions: [''],
  },
  setupFilesAfterEnv: ['<rootDir>/src/specs/setupTests.ts'],
  transform: {
    '^.+\\.(ts|js)x?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!until-async|react-router|cookie-es)',
  ],
}

export default config
