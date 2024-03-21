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

import { Command } from 'commander'
import { createCliLogger, createCliReporter } from '../src/tool'
import { HashVerifierLogger, HashVerifierResultsReceiver } from '../src/logger'
import { HashAlgorithm, HashEncoding, VerifyFailedReason } from '../src/model'
import * as cli from '../src/cli'

let debugMock: jest.SpiedFunction<typeof console.debug>
let infoMock: jest.SpiedFunction<typeof console.info>
let warnMock: jest.SpiedFunction<typeof console.warn>
let errorMock: jest.SpiedFunction<typeof console.error>
let exitMock: jest.SpiedFunction<typeof process.exit>
let checkActionMock: jest.SpiedFunction<typeof cli.checkAction>
let generateActionMock: jest.SpiedFunction<typeof cli.generateAction>
let freshenActionMock: jest.SpiedFunction<typeof cli.freshenAction>
let entryMock: jest.SpiedFunction<typeof cli.entrypoint>

const program = new Command('tests')
const actualLogger = createCliLogger(program)
const actualReporter = createCliReporter(program)
let optionsMock: jest.SpiedFunction<typeof program.opts>

function resetMocks() {
  jest.clearAllMocks()
  debugMock = jest.spyOn(console, 'debug').mockImplementation()
  infoMock = jest.spyOn(console, 'info').mockImplementation()
  warnMock = jest.spyOn(console, 'warn').mockImplementation()
  errorMock = jest.spyOn(console, 'error').mockImplementation()
  exitMock = jest.spyOn(process, 'exit').mockImplementation()
  checkActionMock = jest.spyOn(cli, 'checkAction').mockImplementation()
  generateActionMock = jest.spyOn(cli, 'generateAction').mockImplementation()
  freshenActionMock = jest.spyOn(cli, 'freshenAction').mockImplementation()
  entryMock = jest.spyOn(cli, 'entrypoint').mockImplementation()
  optionsMock = jest.spyOn(program, 'opts').mockImplementation(() => {
    return {}
  })
}

function createMockCmd(overrides?: object): Command {
  return {
    ...program,
    opts: optionsMock,
    ...(overrides || {})
  } as unknown as Command
}

function createSubjectLogger(overrides?: object): HashVerifierLogger {
  return createCliLogger(createMockCmd(overrides))
}

function createSubjectReporter(
  overrides?: object
): HashVerifierResultsReceiver {
  return createCliReporter(createMockCmd(overrides))
}

describe('cli logger', () => {
  beforeEach(() => resetMocks())

  it('should not fail to construct', () => {
    createSubjectLogger()
  })

  it('`debug` logging should be off by default', () => {
    const logger = createSubjectLogger()
    logger.debug('test')
    expect(debugMock).not.toHaveBeenCalled()
  })

  it('`debug` should call `console.debug` when debug logging is on', () => {
    optionsMock.mockImplementation(() => {
      return {
        debug: true
      }
    })

    const logger = createSubjectLogger()
    logger.debug('test')
    expect(debugMock).toHaveBeenCalledWith('test')
    expect(infoMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('`info` should call `console.info`', () => {
    const logger = createSubjectLogger()
    logger.info('test')
    expect(infoMock).toHaveBeenCalledWith('test')
    expect(debugMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('`warning` should call `console.warn`', () => {
    const logger = createSubjectLogger()
    logger.warning('test')
    expect(warnMock).toHaveBeenCalledWith('test')
    expect(debugMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('`error` should call `console.error`', () => {
    const logger = createSubjectLogger()
    logger.error('test')
    expect(errorMock).toHaveBeenCalledWith('test')
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(debugMock).not.toHaveBeenCalled()
  })

  it('`setFailed` should call `console.error` and then `process.exit` with code `1`', () => {
    const logger = createSubjectLogger()
    logger.setFailed('test')
    expect(errorMock).toHaveBeenCalledWith('test')
    expect(exitMock).toHaveBeenCalledWith(1)
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(debugMock).not.toHaveBeenCalled()
  })
})

describe('cli reporter', () => {
  beforeEach(() => resetMocks())

  it('should not fail to construct', () => {
    createSubjectReporter()
  })

  it('default should not fail to construct', () => {
    createSubjectReporter()
  })

  it('default `eligible` should do nothing`', () => {
    createSubjectReporter().eligible(['hi', 'test'])
  })

  it('default `result` should do nothing`', () => {
    createSubjectReporter().result({
      err: false,
      valid: true,
      found: true,
      file: 'sample.txt',
      peer: 'sample.txt',
      algorithm: HashAlgorithm.SHA256,
      encoding: HashEncoding.HEX
    })
  })

  it('`failure` should call `console.warn` in lenient mode', () => {
    createSubjectReporter().failure({
      reason: VerifyFailedReason.HASH_MISMATCH,
      message: 'testing'
    })
    expect(warnMock).toHaveBeenCalledWith(
      'Hash check failed: hash-mismatch; testing'
    )
  })

  it('`failure` should call `console.error` and `process.exit` with code `1` in strict mode', () => {
    optionsMock.mockImplementation(() => {
      return {
        strict: true
      }
    })

    createSubjectReporter().failure({
      reason: VerifyFailedReason.HASH_MISMATCH,
      message: 'testing'
    })
    expect(errorMock).toHaveBeenCalledWith(
      'Hash check failed: hash-mismatch; testing'
    )
    expect(warnMock).not.toHaveBeenCalled()
  })
})

describe('cli', () => {
  beforeEach(() => resetMocks())

  it('imports at the entrypoint without error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/entry')
  })

  it('setting up the cli should not fail', () => {
    cli.setupCli(new Command(), async () => 0)
  })

  it('entrypoint default run should not fail', () => {
    entryMock.mockRestore()
    cli.entrypoint()
  })

  it('entrypoint explicit check default run should not fail', () => {
    entryMock.mockRestore()
    cli.entrypoint([...process.argv, 'check'])
  })

  it('entrypoint explicit check default run should not fail', () => {
    entryMock.mockRestore()
    cli.entrypoint([...process.argv, 'generate', './package.json'])
  })

  it('entrypoint explicit check default run should not fail', () => {
    entryMock.mockRestore()
    cli.entrypoint([...process.argv, 'freshen', './package.json.sha256'])
  })

  it('`checkAction` default run should not fail', async () => {
    checkActionMock.mockRestore()

    await cli.checkAction(
      createMockCmd(),
      createSubjectLogger(),
      createSubjectReporter()
    )
  })

  // @TODO after implementation
  it('`generateAction` default run should not fail', async () => {
    generateActionMock.mockRestore()
    await cli.generateAction(createMockCmd(), createSubjectLogger())
  })

  // @TODO after implementation
  it('`freshenAction` default run should not fail', async () => {
    freshenActionMock.mockRestore()
    await cli.freshenAction(createMockCmd(), createSubjectLogger())
  })
})
