import { core } from './github'
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

export function createLogger(): HashVerifierLogger {
  return {
    debug: (message: string) => core.debug(message),
    info: (message: string) => core.info(message),
    warning: (message: string) => core.warning(message),
    error: (message: string) => core.error(message),
    setFailed: (message: string) => core.setFailed(message)
  }
}

export function createReporter(): HashVerifierResultsReceiver {
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
