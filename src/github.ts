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

import * as core from '@actions/core'
import { VerifyFailedInfo } from './model'
import { HashVerifierLogger, HashVerifierResultsReceiver } from './logger'

export { core }

export function createGithubActionsLogger(): HashVerifierLogger {
  return {
    debug: (message: string) => core.debug(message),
    info: (message: string) => core.info(message),
    warning: (message: string) => core.warning(message),
    error: (message: string) => core.error(message),
    setFailed: (message: string) => core.setFailed(message)
  }
}

export function createGithubActionsReporter(): HashVerifierResultsReceiver {
  return {
    eligible: () => {
      /* nothing at this time @TODO */
    },
    result: () => {
      /* nothing at this time @TODO */
    },
    failure: (result: VerifyFailedInfo) => {
      /* c8 ignore next */
      core.error(`Hash check failed: ${result.reason}; ${result.message}`)
      /* c8 ignore next */
    }
  }
}
