import { throws } from 'node:assert'
import { join } from 'node:path'
import * as core from '@actions/core'
import { HashEncoding } from '../src/model'

import checkHashes, {
  detectAlgorithmForHash,
  detectEncodingForHash
} from '../src/main'

import {
  createGithubActionsLogger,
  createGithubActionsReporter
} from '../src/github'

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let infoMock: jest.SpiedFunction<typeof core.info>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

describe('failures', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    infoMock = jest.spyOn(core, 'info').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
  })

  it('should fail if no hashes are found in strict mode', async () => {
    await checkHashes(
      [join(__dirname, 'some-non-existent-dir')],
      true,
      [],
      true,
      createGithubActionsReporter(),
      createGithubActionsLogger()
    )
    expect(errorMock).toHaveBeenCalledTimes(1)
    expect(errorMock).toHaveBeenCalledWith('No hash files to verify.')
  })

  it('should not fail if no hashes are found in lenient mode', async () => {
    await checkHashes(
      [join(__dirname, 'some-non-existent-dir')],
      false,
      [],
      true,
      createGithubActionsReporter(),
      createGithubActionsLogger()
    )
    expect(infoMock).toHaveBeenCalledTimes(1)
    expect(infoMock).toHaveBeenCalledWith('No hash files to verify.')
  })

  it('can detect a basic broken hash (bad encoding)', async () => {
    throws(() => detectEncodingForHash('not-encoded..::'))
  })

  it('can detect a basic broken hash in hex (good encoding, bad size)', async () => {
    throws(() =>
      detectAlgorithmForHash(
        HashEncoding.HEX,
        '4e245654ed86b78f5a1be1c69cadc55aaab2a09e0'
      )
    )
  })

  it('can detect a basic broken hash in base64 (good encoding, bad size)', async () => {
    throws(() =>
      detectAlgorithmForHash(
        HashEncoding.BASE64,
        'aGVsbG8gdGVzdGluZyBsb2xvbG9sb2xvbG9sb2wgaGkgaGFoYWhhaGEgb2xvbG9sb2wK'
      )
    )
  })
})
