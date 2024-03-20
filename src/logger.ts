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

import { VerifyHashFileInfo, VerifyFailedInfo } from './model'

/**
 * Results Interface
 *
 * Generalized results receiver interface used to communicate results to GitHub Actions or the CLI.
 */
export interface HashVerifierResultsReceiver {
  /**
   * Report a result.
   *
   * @param result Result to report
   */
  result(result: VerifyHashFileInfo): void

  /**
   * Report a check failure.
   *
   * @param result Failure to report
   */
  failure(result: VerifyFailedInfo): void

  /**
   * Reports all eligible files after verification.
   *
   * @param files All eligible files seen during the operation
   */
  eligible(files: string[]): void
}

/**
 * Logger Interface
 *
 * Generalized logger interface used to communicate logs to GitHub Actions or the CLI.
 */
export interface HashVerifierLogger {
  /**
   * Log a debug-level message.
   *
   * @param message Message to log
   */
  debug(message: string): void

  /**
   * Log an info-level message.
   *
   * @param message Message to log
   */
  info(message: string): void

  /**
   * Log a warning-level message.
   *
   * @param message Message to log
   */
  warning(message: string): void

  /**
   * Log an error-level message.
   *
   * @param message Message to log
   */
  error(message: string): void

  /**
   * Set the exit failure reason
   *
   * @param message Failure reason
   */
  setFailed(message: Error | string): void
}

/**
 * Create a default logger which uses the console
 *
 * @returns Default hash verifier logger
 */
export function createDefaultLogger(): HashVerifierLogger {
  return {
    debug: (message: string) => console.debug(message),
    info: (message: string) => console.info(message),
    warning: (message: string) => console.warn(message),
    error: (message: string) => console.error(message),
    setFailed: (message: string) => {
      console.error(message)
      process.exit(1)
    }
  }
}

/**
 * Create a default hash verifier results receiver which logs results.
 *
 * @returns Default hash verifier results receiver
 */
export function createDefaultReporter(): HashVerifierResultsReceiver {
  return {
    eligible: () => {
      /* nothing at this time @TODO */
    },
    result: () => {
      /* nothing at this time @TODO */
    },
    failure: (result: VerifyFailedInfo) => {
      /* c8 ignore next */
      console.error(`Hash check failed: ${result.reason}; ${result.message}`)
      /* c8 ignore next */
    }
  }
}
