/**
 * Jest configuration.
 *
 * Uses `next/jest` so tests compile with the same SWC pipeline and path aliases as
 * the app — no duplicate Babel or tsconfig-paths setup to drift out of sync.
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@styles/(.*)$': '<rootDir>/styles/$1',
    '^@public/(.*)$': '<rootDir>/public/$1',
    '^@editor/(.*)$': '<rootDir>/components/Objects/Editor/$1',
    '^@hooks/(.*)$': '<rootDir>/components/Hooks/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['lib/offline/**/*.ts', '!lib/offline/**/*.d.ts'],
}

module.exports = createJestConfig(customJestConfig)
