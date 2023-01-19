import type { JestConfigWithTsJest } from 'ts-jest'
import '../dotenv'
import { configCommon } from './jest.config.common'

const config: JestConfigWithTsJest = {
  ...configCommon,
  runner: 'jest-runner-eslint',
  displayName: { name: 'lint', color: 'blue' },
}

export default config
