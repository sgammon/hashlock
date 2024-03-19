import { core } from './github'
import checkHashes, { CheckHashesResult } from './main'

/**
 * Run the GitHub Action.
 *
 * @returns A Promise.
 */
export async function run(): Promise<CheckHashesResult> {
  const strict = core.getInput('strict').toUpperCase() !== 'FALSE'
  const paths = (core.getInput('paths') || '.').split('\n').filter(i => !!i)
  const globs = (core.getInput('globs') || 'true').toUpperCase() !== 'FALSE'
  const ignored: string[] = core
    .getInput('ignored')
    .split('\n')
    .filter(i => !!i)
  const followSymbolicLinks =
    core.getInput('follow-symbolic-links').toUpperCase() !== 'FALSE'
  return await checkHashes(paths, strict, ignored, globs, followSymbolicLinks)
}
