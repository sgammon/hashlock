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

import {
  core,
  createGithubActionsLogger,
  createGithubActionsReporter
} from '../src/github'

import { HashAlgorithm, HashEncoding, VerifyFailedReason } from '../src/model'

let debugMock: jest.SpiedFunction<typeof core.debug>
let infoMock: jest.SpiedFunction<typeof core.info>
let warnMock: jest.SpiedFunction<typeof core.warning>
let errorMock: jest.SpiedFunction<typeof core.error>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>

describe('gha logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    infoMock = jest.spyOn(core, 'info').mockImplementation()
    warnMock = jest.spyOn(core, 'warning').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  })

  it('can be constructed without error', () => {
    createGithubActionsLogger()
  })

  it('`debug` should call `core.debug`', () => {
    const logger = createGithubActionsLogger()
    logger.debug('test')
    expect(debugMock).toHaveBeenCalledWith('test')
    expect(infoMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('`info` should call `core.info`', () => {
    const logger = createGithubActionsLogger()
    logger.info('test')
    expect(infoMock).toHaveBeenCalledWith('test')
    expect(debugMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('`warning` should call `core.warn`', () => {
    const logger = createGithubActionsLogger()
    logger.warning('test')
    expect(warnMock).toHaveBeenCalledWith('test')
    expect(debugMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('`error` should call `core.error`', () => {
    const logger = createGithubActionsLogger()
    logger.error('test')
    expect(errorMock).toHaveBeenCalledWith('test')
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(debugMock).not.toHaveBeenCalled()
  })

  it('`setFailed` should call `core.setFailed`', () => {
    const logger = createGithubActionsLogger()
    logger.setFailed('test')
    expect(setFailedMock).toHaveBeenCalledWith('test')
    expect(errorMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(debugMock).not.toHaveBeenCalled()
  })
})

describe('gha reporter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    infoMock = jest.spyOn(core, 'info').mockImplementation()
    warnMock = jest.spyOn(core, 'warning').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  })

  it('can be constructed without error', () => {
    createGithubActionsReporter()
  })

  it('`eligible` should do nothing`', () => {
    createGithubActionsReporter().eligible(['hi', 'test'])
  })

  it('`result` should do nothing`', () => {
    createGithubActionsReporter().result({
      err: false,
      valid: true,
      found: true,
      file: 'sample.txt',
      peer: 'sample.txt',
      algorithm: HashAlgorithm.SHA256,
      encoding: HashEncoding.HEX
    })
  })

  it('`failure` should call `core.error``', () => {
    createGithubActionsReporter().failure({
      reason: VerifyFailedReason.HASH_MISMATCH,
      message: 'testing'
    })
    expect(errorMock).toHaveBeenCalledWith(
      'Hash check failed: hash-mismatch; testing'
    )
  })
})
