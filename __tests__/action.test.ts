/*
 * Copyright (c) 2024 Elide Technologies, Inc.
 *
 * Licensed under the MIT license (the "License"); you may not use this file except in compliance
 *  with the License. You may obtain a copy of the License at
 *
 *     https://opensource.org/license/mit/
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 *  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions and limitations under the License.
 */

import { core } from '../src/github'
import * as main from '../src/action-entry'
import { HashAlgorithm, HashEncoding } from '../src/model'

// Mock the action's entrypoint
const originalEntry = main.run
let consoleDebugMock: jest.SpiedFunction<typeof console.debug>
let runMock = jest.spyOn(main, 'run').mockImplementation()
let debugMock: jest.SpiedFunction<typeof core.debug>
let infoMock: jest.SpiedFunction<typeof core.info>
let warningMock: jest.SpiedFunction<typeof core.warning>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>

function resetMocks() {
  jest.clearAllMocks()
  consoleDebugMock = jest.spyOn(console, 'debug').mockImplementation()
  runMock = jest.spyOn(main, 'run').mockImplementation()
  debugMock = jest.spyOn(core, 'debug').mockImplementation()
  infoMock = jest.spyOn(core, 'info').mockImplementation()
  warningMock = jest.spyOn(core, 'warning').mockImplementation()
  errorMock = jest.spyOn(core, 'error').mockImplementation()
  setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
}

describe('action', () => {
  beforeEach(() => resetMocks())

  it('calls run when imported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/action')
    expect(runMock).toHaveBeenCalledTimes(1)
  })

  it('does not fail with no matches', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'paths':
          return './does-not-exist'
        default:
          return ''
      }
    })

    await originalEntry()
  })

  it('fails with no matches in strict mode', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'paths':
          return './does-not-exist'
        case 'strict':
          return 'true'
        default:
          return ''
      }
    })

    await originalEntry()
  })

  it('run against project should not fail (should report failures)', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'paths':
          return ''
        default:
          return ''
      }
    })

    const results = await originalEntry()
    expect(results.errors).toHaveLength(0) // keep in sync with expectations on project
    expect(results.failedVerifications).toHaveLength(7)
    expect(results.verifiedFiles).toHaveLength(24)
  }, 30000)

  it('should act on regular paths if told not to glob', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'paths':
          return './__tests__/sample.bin.sha256'
        case 'globs':
          return 'false'
        default:
          return ''
      }
    })

    const results = await originalEntry()
    expect(results.errors).toHaveLength(0)
    expect(results.verifiedFiles).toHaveLength(1)
    const result = results.verifiedFiles[0]
    expect(result.valid).toBe(true)
    expect(result.err).toBe(false)
    if (result.valid && !result.err) {
      expect(result.algorithm).toBe(HashAlgorithm.SHA256)
      expect(result.encoding).toBe(HashEncoding.HEX)
      expect(result.file).toMatch(/sample\.bin$/)
    }
  }, 10000)
})
