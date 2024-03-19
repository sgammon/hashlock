import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as main from '../src/action-entry'
import { HashAlgorithm, HashEncoding } from '../src/model'

// Mock the action's entrypoint
const originalEntry = main.run
let runMock = jest.spyOn(main, 'run').mockImplementation()
let debugMock: jest.SpiedFunction<typeof core.debug>
let infoMock: jest.SpiedFunction<typeof core.info>
let warningMock: jest.SpiedFunction<typeof core.warning>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
// let globMock: jest.SpiedFunction<typeof glob.create>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    runMock = jest.spyOn(main, 'run').mockImplementation()
    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    infoMock = jest.spyOn(core, 'info').mockImplementation()
    warningMock = jest.spyOn(core, 'warning').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    // globMock = jest.spyOn(glob, 'create').mockImplementation()
  })

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
    expect(results.verifiedFiles).toHaveLength(16)
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
