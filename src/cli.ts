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

import * as process from 'process'
import { Command } from 'commander'
import { createCliLogger, createCliReporter } from './tool'
import { HashAlgorithm, allAlgorithms } from './model'
import { HashVerifierLogger, HashVerifierResultsReceiver } from './logger'
import checkHashes from './main'

/**
 * Name of the CLI tool.
 */
export const CLI_NAME = 'hashlock'

/**
 * Version of the CLI tool.
 */
export const CLI_VERSION = '0.0.1'

/**
 * Algorithms which are considered outdated.
 */
export const outdatedAlgorithms = [HashAlgorithm.MD5, HashAlgorithm.SHA1]

/**
 * Default algorithms: All, minus outdated algorithms.
 */
export const defaultAlgorithms = allAlgorithms.filter(
  i => !outdatedAlgorithms.includes(i)
)

/**
 * Enumerates CLI sub-commands.
 */
/* eslint-disable-next-line no-shadow */
export enum CliCommand {
  CHECK = 'check',
  GENERATE = 'generate',
  FRESHEN = 'freshen'
}

/**
 * Enumerates CLI exit codes.
 */
/* eslint-disable-next-line no-shadow */
export enum CliExitCode {
  SUCCESS = 0,
  FAILURE = 1
}

/**
 * Setup CLI configuration, options, and parameters.
 */
export function setupCli(
  program: Command,
  entry: (action: CliCommand, cli: Command) => Promise<CliExitCode | number>
): void {
  // set version
  program.version(CLI_VERSION)

  const globJoiner = (value: string, previous: string[]): string[] =>
    (previous || []).concat(value.split(','))
  const entrySplitter = (value: string): string[] => value.split(',')

  // command: check
  program
    .command(CliCommand.CHECK, { isDefault: true })
    .option('--strict', 'activate strict matching mode')
    .option('-i, --ignore <paths>', 'paths to ignore from matching')
    .argument(
      '[hashfiles...]',
      'globs to check for hashfiles to check',
      globJoiner,
      []
    )
    .action(async function () {
      // @ts-expect-error runs in the context of the command
      await entry(CliCommand.CHECK, this as Command) // eslint-disable-line no-invalid-this
    })

  // command: generate
  program
    .command(CliCommand.GENERATE)
    .option(
      '-a, --algorithms <values>',
      'comma-separated algorithms to use',
      entrySplitter,
      defaultAlgorithms
    )
    .option(
      '-o, --out <path>',
      'output file path; if not provided, only one subject path is allowed'
    )
    .argument('<subjects...>', 'globs or paths of subject files', globJoiner)
    .action(async function () {
      // @ts-expect-error runs in the context of the command
      await entry(CliCommand.GENERATE, this as Command) // eslint-disable-line no-invalid-this
    })

  // command: freshen
  program
    .command(CliCommand.FRESHEN)
    .option('-i, --ignore', 'paths to ignore from matching')
    .option(
      '-a, --algorithms <values>',
      'comma-separated algorithms to consider eligible',
      entrySplitter,
      allAlgorithms
    )
    .argument(
      '[hashfiles...]',
      'globs or paths of hashfiles to update',
      globJoiner,
      ['.']
    )
    .action(async function () {
      // @ts-expect-error runs in the context of the command
      await entry(CliCommand.FRESHEN, this as Command) // eslint-disable-line no-invalid-this
    })

  // help text
  program.addHelpText(
    'after',
    `
Examples:
  $ ${CLI_NAME} ${CliCommand.CHECK} .
  $ ${CLI_NAME} ${CliCommand.CHECK} --strict --ignore ./some_root ./check-these ./also-these
  $ ${CLI_NAME} ${CliCommand.GENERATE} subject.txt
  $ ${CLI_NAME} ${CliCommand.GENERATE} -a sha256 -o ./hashfile.sha256 ./subject.txt
  $ ${CLI_NAME} ${CliCommand.FRESHEN} .
  $ ${CLI_NAME} ${CliCommand.FRESHEN} --ignore ./some_root ./freshen-these ./also-these`
  )
}

/**
 * Initialize the CLI and run it with the provided arguments and entry action.
 *
 * @param program CLI program to run
 * @param args Arguments to parse for this CLI run
 * @param entry Entrypoint function to run; expected to produce an exit code
 */
async function initializeAndRunCli(
  program: Command,
  args: string[],
  entry: (action: CliCommand, cli: Command) => Promise<CliExitCode | number>
): Promise<void> {
  setupCli(program, entry)
  program.parse(args)
}

function processBlobOrPathList(
  list: string[],
  defaultValue: () => string[]
): string[] {
  return list.length > 0 ? list : defaultValue()
}

export async function checkAction(
  cli: Command,
  logger: HashVerifierLogger,
  reporter: HashVerifierResultsReceiver
): Promise<CliExitCode> {
  // grab options and parameters
  const opts = cli.opts()
  const paths = processBlobOrPathList(cli.args, () => ['.'])
  const ignore = opts.ignore
    ? processBlobOrPathList(opts.ignore || [], () => [])
    : []
  const strict = opts.strict === true
  const results = await checkHashes(
    paths,
    strict,
    ignore,
    true, // always use globs from cli
    reporter,
    logger
  )

  return results.errors.length > 0 || results.failedVerifications.length > 0
    ? 1
    : 0
}

export async function generateAction(
  cli: Command,
  logger: HashVerifierLogger
): Promise<CliExitCode> {
  console.log('would generate', cli, logger)
  return 0
}

export async function freshenAction(
  cli: Command,
  logger: HashVerifierLogger
): Promise<CliExitCode> {
  console.log('would freshen', cli, logger)
  return 0
}

/**
 * Entrypoint for use of the `verify-hashes` project as a CLI tool; usually named `hashlock`.
 *
 * This entrypoint will prepare a CLI suite of parameters, parse them, and pass them to the underlying implementation,
 * mediating output along the way; several output options are available. Please consult program options for more info.
 *
 * @param args Arguments to run the tool with; defaults to `process.argv`
 * @param program Program implementation to use; defaults to a new `Command` with the name `hashlock`
 */
export function entrypoint(
  args: string[] = process.argv,
  program: Command = new Command(CLI_NAME)
): void {
  initializeAndRunCli(
    program,
    args,
    async (action: CliCommand, cli: Command) => {
      const logger = createCliLogger(cli)

      switch (action) {
        case CliCommand.CHECK:
          return checkAction(cli, logger, createCliReporter(cli))
        case CliCommand.GENERATE:
          return generateAction(cli, logger)
        case CliCommand.FRESHEN:
          return freshenAction(cli, logger)
      }
    }
  )
}
