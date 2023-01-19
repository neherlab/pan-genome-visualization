import type { JestConfigWithTsJest } from 'ts-jest'
import { findModuleRoot } from '../../lib/findModuleRoot'

const { moduleRoot } = findModuleRoot()

export const configCommon: JestConfigWithTsJest = {
  rootDir: moduleRoot,
  roots: ['<rootDir>/src'],
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.cm?[jt]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          useESM: true,
          module: 'esnext',
          target: 'esnext',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
        babelConfig: false,
        diagnostics: {
          pathRegex: /(\/__tests?__\/.*|([./])(test|spec))\.[jt]sx?$/,
          warnOnly: true,
        },
      },
    ],
    '^.+\\.(md|mdx)$': 'jest-transformer-mdx',
    '\\.(txt|fasta|csv|tsv)': 'jest-raw-loader',
  },
  testMatch: [
    '<rootDir>/src/**/*.(spec|test).{cjs,js,jsx,mjs,ts,tsx}',
    '<rootDir>/src/**/(__)?(spec|test)s?(__)?/**/*.{cjs,js,jsx,mjs,ts,tsx}',
  ],
  transformIgnorePatterns: ['node_modules/(?!(d3-scale)/)'],
  moduleNameMapper: {
    '^src/(.*)': '<rootDir>/src/$1',
    '\\.(eot|otf|webp|ttf|woff\\d?|svg|png|jpe?g|gif)$': '<rootDir>/config/jest/mocks/fileMock.js',
    '\\.(css|scss)$': 'identity-obj-proxy',
    'react-children-utilities': '<rootDir>/config/jest/mocks/mockReactChildrenUtilities.js',
    'react-i18next': '<rootDir>/config/jest/mocks/mockReactI18next.js',
    'popper-js': '<rootDir>/config/jest/mockPopperJS.js',
    'use-debounce': '<rootDir>/config/jest/mocks/mockUseDebounce.js',
  },
  setupFiles: ['core-js', 'regenerator-runtime'],
  setupFilesAfterEnv: [
    '<rootDir>/config/jest/setupDotenv.js',
    'jest-chain',
    'jest-extended',
    'jest-axe/extend-expect',
    '@testing-library/jest-dom/extend-expect',
  ],
}
