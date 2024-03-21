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

import { join, resolve, basename } from 'node:path'
import { mkdtemp, mkdir, writeFile, cp, chmod } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { globSync } from 'glob'
import rootPackageJson from '../package.json'
import packageJsonPatch from './package.patch.json'
import packageNativeBase from './package.native.json'
import { existsSync, lstatSync } from 'node:fs'

// Default registry for publishing.
const DEFAULT_REGISTRY = 'https://registry.npmjs.org'

// Get the path for a native package JSON spec.
const nativePackageJsonPath = (platform: string) =>
  join(__dirname, `native/${platform}/package.json`)

// Get the path to assets which should be included within a native package.
const packageAssets = (platform: string) => [
  `static/**`,
  `native/${platform}/cli.cjs`,
  `native/${platform}/cli.mjs`,
  `native/${platform}/README.md`
]

function log(...args: any[]) {
  console.log('[native:package]', ...args)
}

// Recurse to all string properties in `data`, replacing `$(version)` with the provided `version`.
function deepRenderVersion(version: string, data: object): object {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, value.replace(/\$\(version\)/g, version)]
      } else if (Array.isArray(value)) {
        return [
          key,
          value.map(v =>
            typeof v === 'object' ? deepRenderVersion(version, v) : v
          )
        ]
      } else if (typeof value === 'object') {
        return [key, deepRenderVersion(version, value)]
      }
      return [key, value]
    })
  )
}

/**
 * Merge package JSON templates for the provided target platform.
 *
 * @param base Base JSON object
 * @param version Version to render into `$(version)`
 * @param platform Target platform
 * @return Merged package JSON object
 */
export async function mergePackageJson(
  base: object,
  version: string,
  platform: string
): Promise<object> {
  return {
    ...base,
    ...(await import(nativePackageJsonPath(platform))).default,
    version
  }
}

/**
 * Merge package JSON templates for the provided target platform.
 *
 * @param base Base JSON object
 * @param version Version to render into `$(version)`
 * @param platform Target platform
 * @return Merged package JSON object
 */
export async function renderPackageJson(
  base: object,
  version: string,
  platform: string
): Promise<object> {
  return deepRenderVersion(
    version,
    await mergePackageJson(base, version, platform)
  )
}

export type NativePackageBuildResult = {
  buildroot: string
  packageJson: object
}

async function testPackage(pkg: string, cwd: string): Promise<void> {
  // create a temporary test root
  const testRoot = await mkdtemp(join('/', 'tmp', 'hashlock-test-'))
  log(`created temporary test root: ${testRoot}`)

  // make a node modules dir
  const nodeModules = join(testRoot, 'node_modules')
  await mkdir(nodeModules)

  // write a package.json that links to the module
  const packageJson = join(testRoot, 'package.json')
  const packageJsonContent = JSON.stringify({
    name: 'hashlock-test',
    version: '0.0.0',
    dependencies: {
      [`${pkg}`]: `file:${cwd}`
    }
  })
  await writeFile(packageJson, packageJsonContent)

  // simulate an npm install
  const npmCmd = 'npm install --no-package-lock --no-save'
  log(`running install: \`${npmCmd}\`...`)
  execSync(npmCmd, { cwd: testRoot })
  log(`... install done`)

  // try running `require('...')`
  const nodeRequireCmd = `node --eval="require('${pkg}'); console.log('test passed')"`
  log(`running require smoketest: \`${nodeRequireCmd}\`...`)
  const requireStdout = execSync(nodeRequireCmd, { cwd })
  log(
    `require smoketest: '${requireStdout.toString().trim().replace('\n', '')}'`
  )

  // try running `import('...')`
  const nodeImportCmd = `node --eval="import('${pkg}').then(() => console.log('test passed'));"`
  log(`running require smoketest: \`${nodeImportCmd}\`...`)
  const importStdout = execSync(nodeImportCmd, { cwd })
  log(`import smoketest: '${importStdout.toString().trim().replace('\n', '')}'`)
}

/**
 * Result of publishing a library
 */
type LibraryPublishResult = {
  name: string
  version: string
  registry: string
  tarball: string
  link: string
}

/**
 * Run a package publish against a built native package, using the provided inputs.
 *
 * @param name Package name to publish
 * @param version Version under publish
 * @param cwd Current working directory of the built package
 * @param tgz Packed package tarball
 * @param registry NPM registry to publish to
 * @param provenance Whether to enable provenance during publishing
 * @param dry Whether to perform a dry run
 * @param token Token to set for publishing
 */
async function publishPackage(
  name: string,
  version: string,
  cwd: string,
  tgz: string,
  registry: string,
  provenance: boolean,
  dry: boolean,
  token: string
): Promise<LibraryPublishResult> {
  const args: string[] = ['publish', `--registry="${registry}"`]
  if (dry) args.push('--dry-run')
  if (provenance) args.push('--provenance')
  const cmd = `npm ${args.join(' ')}`

  const tokenFound = token && token.length > 0 ? 'found' : 'not found'
  log(`resolving NPM token... ${tokenFound}`)
  log(
    `publishing package ('${name}@${version}' → '${registry}'): \`${cmd}\` (token: ${tokenFound}, dry: ${dry})`
  )

  execSync(cmd, {
    cwd,
    env: {
      ...process.env,
      NPM_TOKEN: token || undefined
    }
  })

  log(`... package published!`)
  return {
    name,
    version,
    registry,
    tarball: tgz,
    link: `${registry}/${name}/-/${name}-${version}.tgz`
  }
}

/**
 * Build a package distribution file structure for the provided inputs.
 *
 * @param os Operating system to build a package for
 * @param arch Architecture to build a package for
 * @param provenance Whether to enable provenance during publishing
 * @param publish Whether to publish the package
 * @param dry Whether to perform a dry run
 */
export default async function nativePackage(
  os: string,
  arch: string,
  provenance: boolean,
  publish: boolean,
  dry: boolean,
  registry?: string
): Promise<
  NativePackageBuildResult | (NativePackageBuildResult & LibraryPublishResult)
> {
  // resolve the path to the built binary; fail if it is not present
  const binaryPath = resolve(join(__dirname, `../bin/hashlock`))
  if (!existsSync(binaryPath))
    throw new Error(`Binary not found at ${binaryPath}`)

  const platform = `${os}-${arch}`
  log(`Packaging hashlock for platform '${platform}'...`)
  const version = rootPackageJson.version
  const packageJson = (await renderPackageJson(
    packageNativeBase,
    version,
    platform
  )) as any
  const packageDir = await mkdtemp(
    join('/', 'tmp', `package-dist-hashlock-${platform}`)
  )
  const packageJsonPath = join(packageDir, 'package.json')
  const { name } = packageJson

  // Write the package JSON file.
  log(`writing package.json → ${packageJsonPath}`)
  const binDir = join(packageDir, 'bin')
  writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))

  // create `bin/`
  log(`creating bin dir → ${binDir}`)
  await mkdir(binDir)

  // copy binary into `bin/hashlock`
  const binaryTarget = join(binDir, 'hashlock')
  log(`copying binary '${binaryPath}' → '${binaryTarget}'`)
  await cp(binaryPath, binaryTarget)
  await chmod(binaryTarget, 0o755)

  // smoke test the binary
  const versionStdout = execSync(`"${binaryTarget}" --version`)
    .toString()
    .trim()
    .replace('\n', '')
  log(`smoke test output ('--version'): ${versionStdout}`)

  // resolve globs relative to the base directory (this one)
  const globPaths = packageAssets(platform).map(pattern =>
    join(__dirname, pattern)
  )
  for (const pattern of globPaths) {
    for (const asset of globSync(pattern)) {
      const stat = lstatSync(asset)
      if (!stat.isFile()) continue
      const target = basename(asset)
      const targetPath = join(packageDir, target)
      log(`copying asset '${asset}' → '${targetPath}'`)
      await cp(asset, targetPath)
    }
  }

  // smoke test the package
  log(`smoke testing package at '${packageDir}'...`)
  await testPackage(`@hashlock/hashlock-${platform}`, packageDir)

  // fixup the `package.json` for publishing
  const fixupCmd = `npm pkg fix`
  log(`fixing up package.json with \`${fixupCmd}\`...`)
  execSync(fixupCmd, { cwd: packageDir })

  // build the package
  log(`using registry: ${registry}`)
  const pkgCmd = `npm pack`
  log(`building package with \`${pkgCmd}\`...`)
  execSync(pkgCmd, { cwd: packageDir })
  log(`... package ready`)

  const buildResult = {
    buildroot: packageDir,
    packageJson
  }

  // publish the package
  if (publish) {
    const publishResult = await publishPackage(
      name,
      version,
      packageDir,
      join(packageDir, `${name}-${version}.tgz`),
      registry || DEFAULT_REGISTRY,
      provenance,
      dry,
      process.env.PUBLISHING_TOKEN || process.env.PUBLISH_TOKEN || process.env.NPM_TOKEN || ''
    )
    return { ...buildResult, ...publishResult }
  }
  return buildResult
}
