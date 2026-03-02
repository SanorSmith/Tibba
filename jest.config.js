const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/payroll-calculator.test.ts',
    '**/__tests__/simple-*.test.ts',
  ],
  collectCoverageFrom: [
    'src/services/payroll-calculator.ts',
    'src/services/alert-service.ts',
    'src/services/workflow-service.ts',
    'src/services/report-generator.ts',
    'src/services/report-exporter.ts',
    'src/services/payslip-generator.ts',
    'src/services/bank-file-generator.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
