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

/**
 * MIT License
 * Copyright (c) 2020 Evan Wallace
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Adapted from `esbuild`'s install flow; all credit to `evanw` for this original code. Evan's copyright is embedded
 * above.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const packageDarwin_arm64 = '@hashlock/hashlock-darwin-arm64'
const packageDarwin_x64 = '@hashlock/hashlock-darwin-amd64'

export const knownWindowsPackages: Record<string, string> = {
  'win32 x64 LE': '@hashlock/hashlock-win32-amd64'
}

export const knownUnixlikePackages: Record<string, string> = {
  'darwin arm64 LE': '@hashlock/hashlock-darwin-arm64',
  'darwin x64 LE': '@hashlock/hashlock-darwin-amd64',
  'linux x64 LE': '@hashlock/hashlock-linux-amd64'
}

export function pkgAndSubpathForCurrentPlatform(): {
  pkg: string
  subpath: string
} {
  let pkg: string
  let subpath: string
  let isWASM = false
  let platformKey = `${process.platform} ${os.arch()} ${os.endianness()}`

  if (platformKey in knownWindowsPackages) {
    pkg = knownWindowsPackages[platformKey]
    subpath = 'hashlock.exe'
  } else if (platformKey in knownUnixlikePackages) {
    pkg = knownUnixlikePackages[platformKey]
    subpath = 'bin/hashlock'
  } else {
    throw new Error(`Unsupported platform: ${platformKey}`)
  }

  return { pkg, subpath }
}

function pkgForSomeOtherPlatform(): string | null {
  const libMainJS = require.resolve('hashlock')
  const nodeModulesDirectory = path.dirname(
    path.dirname(path.dirname(libMainJS))
  )

  if (path.basename(nodeModulesDirectory) === 'node_modules') {
    for (const unixKey in knownUnixlikePackages) {
      try {
        const pkg = knownUnixlikePackages[unixKey]
        if (fs.existsSync(path.join(nodeModulesDirectory, pkg))) return pkg
      } catch {}
    }

    for (const windowsKey in knownWindowsPackages) {
      try {
        const pkg = knownWindowsPackages[windowsKey]
        if (fs.existsSync(path.join(nodeModulesDirectory, pkg))) return pkg
      } catch {}
    }
  }

  return null
}

export function downloadedBinPath(pkg: string, subpath: string): string {
  const libDir = path.dirname(require.resolve('hashlock'))
  return path.join(
    libDir,
    `downloaded-${pkg.replace('/', '-')}-${path.basename(subpath)}`
  )
}

export function generateBinPath(): { binPath: string } {
  const { pkg, subpath } = pkgAndSubpathForCurrentPlatform()
  let binPath: string

  try {
    // First check for the binary package from our "optionalDependencies". This
    // package should have been installed alongside this package at install time.
    binPath = require.resolve(`${pkg}/${subpath}`)
  } catch (e) {
    // If that didn't work too, check to see whether the package is even there
    // at all. It may not be (for a few different reasons).
    try {
      require.resolve(pkg)
    } catch {
      // If we can't find the package for this platform, then it's possible
      // that someone installed this for some other platform and is trying
      // to use it without reinstalling. That won't work of course, but
      // people do this all the time with systems like Docker. Try to be
      // helpful in that case.
      const otherPkg = pkgForSomeOtherPlatform()
      if (otherPkg) {
        let suggestions = `
Specifically the "${otherPkg}" package is present but this platform
needs the "${pkg}" package instead. People often get into this
situation by installing hashlock on Windows or macOS and copying "node_modules"
into a Docker image that runs Linux, or by copying "node_modules" between
Windows and WSL environments.

If you are installing with npm, you can try not copying the "node_modules"
directory when you copy the files over, and running "npm ci" or "npm install"
on the destination platform after the copy. Or you could consider using yarn
instead of npm which has built-in support for installing a package on multiple
platforms simultaneously.

If you are installing with yarn, you can try listing both this platform and the
other platform in your ".yarnrc.yml" file using the "supportedArchitectures"
feature: https://yarnpkg.com/configuration/yarnrc/#supportedArchitectures
Keep in mind that this means multiple copies of hashlock will be present.
`

        // Use a custom message for macOS-specific architecture issues
        if (
          (pkg === packageDarwin_x64 && otherPkg === packageDarwin_arm64) ||
          (pkg === packageDarwin_arm64 && otherPkg === packageDarwin_x64)
        ) {
          suggestions = `
Specifically the "${otherPkg}" package is present but this platform
needs the "${pkg}" package instead. People often get into this
situation by installing hashlock with npm running inside of Rosetta 2 and then
trying to use it with node running outside of Rosetta 2, or vice versa (Rosetta
2 is Apple's on-the-fly x86_64-to-arm64 translation service).

If you are installing with npm, you can try ensuring that both npm and node are
not running under Rosetta 2 and then reinstalling hashlock. This likely involves
changing how you installed npm and/or node. For example, installing node with
the universal installer here should work: https://nodejs.org/en/download/. Or
you could consider using yarn instead of npm which has built-in support for
installing a package on multiple platforms simultaneously.

If you are installing with yarn, you can try listing both "arm64" and "x64"
in your ".yarnrc.yml" file using the "supportedArchitectures" feature:
https://yarnpkg.com/configuration/yarnrc/#supportedArchitectures
Keep in mind that this means multiple copies of hashlock will be present.
`
        }

        throw new Error(`
You installed hashlock for another platform than the one you're currently using.
${suggestions}
`)
      }

      // If that didn't work too, then maybe someone installed hashlock with
      // both the "--no-optional" and the "--ignore-scripts" flags. The fix
      // for this is to just not do that. We don't attempt to handle this
      // case at all.
      //
      // In that case we try to have a nice error message if we think we know
      // what's happening. Otherwise we just rethrow the original error message.
      throw new Error(`The package "${pkg}" could not be found, and is needed by hashlock.

If you are installing hashlock with npm, make sure that you don't specify the
"--no-optional" or "--omit=optional" flags. The "optionalDependencies" feature
of "package.json" is used by hashlock to install the correct binary executable
for your current platform.`)
    }
    throw e
  }
  return { binPath }
}
