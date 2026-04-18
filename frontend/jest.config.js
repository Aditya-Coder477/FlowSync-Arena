const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Path to your Next.js app — needed to load next.config.js and .env files
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  // Use jsdom environment to simulate the browser
  testEnvironment: 'jest-environment-jsdom',

  // Run this file before each test suite
  setupFilesAfterFramework: ['<rootDir>/jest.setup.js'],

  // Module name mapper for path aliases (@/...)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Only run unit/component tests here — E2E is handled by Playwright
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
  ],

  // Collect coverage from these paths
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
}

module.exports = createJestConfig(config)
