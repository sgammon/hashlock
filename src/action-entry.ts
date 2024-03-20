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

import checkHashes, { CheckHashesResult } from './main'

import {
  core,
  createGithubActionsLogger,
  createGithubActionsReporter
} from './github'

/**
 * Run the GitHub Action.
 *
 * @returns A Promise.
 */
export async function run(): Promise<CheckHashesResult> {
  const strict = core.getInput('strict').toUpperCase() !== 'FALSE'
  const paths = (core.getInput('paths') || '.')
    .split('\n')
    .filter((i: string) => !!i)
  const globs = (core.getInput('globs') || 'true').toUpperCase() !== 'FALSE'
  const ignored: string[] = core
    .getInput('ignored')
    .split('\n')
    .filter((i: string) => !!i)

  return await checkHashes(
    paths,
    strict,
    ignored,
    globs,
    createGithubActionsReporter(),
    createGithubActionsLogger()
  )
}
