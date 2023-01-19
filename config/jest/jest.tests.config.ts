import { JestConfigWithTsJest } from 'ts-jest'
import '../dotenv'
import { configCommon } from './jest.config.common'

const config: JestConfigWithTsJest = {
  ...configCommon,
  displayName: { name: 'test', color: 'cyan' },
  testEnvironment: 'jest-environment-jsdom',
}

export default config
