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

import { createDefaultLogger, createDefaultReporter } from '../src/logger'
import { HashAlgorithm, HashEncoding, VerifyFailedReason } from '../src/model'

let debugMock: jest.SpiedFunction<typeof console.debug>
let infoMock: jest.SpiedFunction<typeof console.info>
let warnMock: jest.SpiedFunction<typeof console.warn>
let errorMock: jest.SpiedFunction<typeof console.error>
let exitMock: jest.SpiedFunction<typeof process.exit>

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    debugMock = jest.spyOn(console, 'debug').mockImplementation()
    infoMock = jest.spyOn(console, 'info').mockImplementation()
    warnMock = jest.spyOn(console, 'warn').mockImplementation()
    errorMock = jest.spyOn(console, 'error').mockImplementation()
    exitMock = jest.spyOn(process, 'exit').mockImplementation()
  })

  it('default should not fail to construct', () => {
    createDefaultLogger()
  })

  it('default `debug` should call `console.debug`', () => {
    const logger = createDefaultLogger()
    logger.debug('test')
    expect(debugMock).toHaveBeenCalledWith('test')
    expect(infoMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('default `info` should call `console.info`', () => {
    const logger = createDefaultLogger()
    logger.info('test')
    expect(infoMock).toHaveBeenCalledWith('test')
    expect(debugMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('default `warning` should call `console.warn`', () => {
    const logger = createDefaultLogger()
    logger.warning('test')
    expect(warnMock).toHaveBeenCalledWith('test')
    expect(debugMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('default `error` should call `console.error`', () => {
    const logger = createDefaultLogger()
    logger.error('test')
    expect(errorMock).toHaveBeenCalledWith('test')
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(debugMock).not.toHaveBeenCalled()
  })

  it('default `setFailed` should call `console.error` and then `process.exit` with code `1`', () => {
    const logger = createDefaultLogger()
    logger.setFailed('test')
    expect(errorMock).toHaveBeenCalledWith('test')
    expect(exitMock).toHaveBeenCalledWith(1)
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(debugMock).not.toHaveBeenCalled()
  })
})

describe('reporter', () => {
  it('default should not fail to construct', () => {
    createDefaultReporter()
  })

  it('default `eligible` should do nothing`', () => {
    createDefaultReporter().eligible(['hi', 'test'])
  })

  it('default `result` should do nothing`', () => {
    createDefaultReporter().result({
      err: false,
      valid: true,
      found: true,
      file: 'sample.txt',
      peer: 'sample.txt',
      algorithm: HashAlgorithm.SHA256,
      encoding: HashEncoding.HEX
    })
  })

  it('default `failure` should call `console.error`', () => {
    createDefaultReporter().failure({
      reason: VerifyFailedReason.HASH_MISMATCH,
      message: 'testing'
    })
    expect(errorMock).toHaveBeenCalledWith(
      'Hash check failed: hash-mismatch; testing'
    )
  })
})
