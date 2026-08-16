/**
 * Integration test config.
 *
 * These tests sign in against a running dev server and read the real database,
 * so they are deliberately not part of `npm test`. Run them with:
 *
 *     npm run test:isolation
 *
 * Point them somewhere else with TEST_BASE_URL if the server is not on :3000.
 */
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/.claude/'],
  testMatch: [
    '<rootDir>/src/__tests__/integration/facility-isolation.test.ts',
    '<rootDir>/src/__tests__/integration/login-auth.test.ts',
  ],
  testTimeout: 120000,
})
