import '../dotenv'
import type { JestConfigWithTsJest } from 'ts-jest'
import path from 'path'
import { findModuleRoot } from '../../lib/findModuleRoot'
import { configCommon } from './jest.config.common'

const { moduleRoot } = findModuleRoot()

const shouldRunEslint = process.env.WITH_ESLINT === '1'

export const config: JestConfigWithTsJest = {
  ...configCommon,

  projects: [
    require('./jest.tests.config').default,
    shouldRunEslint && require("./jest.eslint.config").default,
    // prettier-ignore
  ].filter(Boolean),

  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname', 'jest-runner-eslint/watch-fix'],

  coverageDirectory: path.join(moduleRoot, '.reports', 'coverage'),
  collectCoverageFrom: [
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/node_modules/**/*',
    '<rootDir>/src/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/src/{i18n,types,pages}/**/*',
    '!<rootDir>/src/{constants,theme}.*',
  ],
  coverageThreshold: {
    global: {
      // TODO: write more tests?
      // branches: 33,
      // functions: 33,
      // lines: 33,
      // statements: 33,
    },
  },
}

export default config
