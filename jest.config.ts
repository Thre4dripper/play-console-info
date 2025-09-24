import type { Config } from 'jest';
import { createDefaultPreset } from 'ts-jest';

const config: Config = {
  ...createDefaultPreset(),
  clearMocks: true,
  resetMocks: true,
  resetModules: true,
  restoreMocks: true,
  maxWorkers: '50%',

  // Disable Jest's built-in coverage when using c8
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{js,ts,mjs,mts}'],

  // Optional: specify test patterns if needed
  testMatch: [
    '**/tests/**/*.test.{js,ts,mjs,mts}',
    '**/tests/**/*.spec.{js,ts,mjs,mts}',
  ],
};

export default config;
