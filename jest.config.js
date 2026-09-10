const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Default to node: most of what we test is server-side (password hashing,
  // session parsing, API routes). Component tests opt into jsdom with a
  // `@jest-environment jsdom` docblock at the top of the file.
  testEnvironment: 'node',

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // A git worktree lives under .claude/worktrees and contains a second copy of
  // the whole app, including package.json. Without this, jest-haste-map aborts
  // with a "naming collision" before running anything.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/.claude/'],

  // Relative globs, not `<rootDir>/…`. On Windows the interpolated rootDir
  // arrives with a backslash before `.claude`, and a glob reads `\.` as an
  // escaped dot, so the pattern silently matched nothing and jest reported
  // "no tests found" from inside a worktree while the same files ran fine
  // from the main checkout. The ignore patterns below are regexes rather than
  // globs, so they were never affected and still keep node_modules and other
  // worktrees out.
  testMatch: ['**/src/__tests__/**/*.test.ts', '**/src/__tests__/**/*.test.tsx'],

  collectCoverageFrom: [
    'src/lib/workspace.ts',
    'src/lib/auth/password.ts',
    'src/services/payroll-calculator.ts',
    'src/services/alert-service.ts',
    'src/services/workflow-service.ts',
  ],

  testTimeout: 30000,
}

module.exports = createJestConfig(customJestConfig)
