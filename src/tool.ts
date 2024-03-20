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
import { HashVerifierLogger, HashVerifierResultsReceiver } from './logger'
import { VerifyHashFileInfo } from './model'

export function createCliLogger(cli: Command): HashVerifierLogger {
  return {
    debug: (message: string) => {
      if (cli.opts().debug) console.debug(message)
    },
    info: (message: string) => console.info(message),
    warning: (message: string) => console.warn(message),
    error: (message: string) => console.error(message),
    setFailed: (message: string) => {
      console.error(message)
      process.exit(1)
    }
  }
}

export function createCliReporter(cli: Command): HashVerifierResultsReceiver {
  return {
    eligible: () => {
      /* nothing at this time @TODO */
    },
    result: (result: VerifyHashFileInfo) => {
      /* nothing at this time @TODO */
      if (result.valid === true) {
        console.info(`Hash check passed: ${result.file}`)
      } else {
        const msg = `Hash check failed: ${result.file}; ${result.reason}`
        if (cli.opts().strict) {
          console.error(msg)
        } else {
          console.warn(msg)
        }
      }
    },
    failure: result => {
      const msg = `Hash check failed: ${result.reason}; ${result.message}`
      if (cli.opts().strict) {
        console.error(msg)
      } else {
        console.warn(msg)
      }
    }
  }
}
