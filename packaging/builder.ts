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

import platforms from './native/platforms.json'
import build from './package'

// Whether to enable provenance for publishing.
const enableProvenance = process.env.ENABLE_PROVENANCE === 'true'
const enablePublish = true
const dryRun = process.env.PUBLISH_LIVE_UNLOCK_GATE !== 'true'
const registry = process.env.PUBLISH_REGISTRY || ''

const os = process.platform
const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch]
if (!arch) throw new Error('unrecognized arch: ' + process.arch)
console.log(`Building native package for platform '${os}-${arch}'...`)

let built = false
for (const platform of platforms) {
  if (
    platform.enabled === true &&
    platform.os === os &&
    platform.arch === arch
  ) {
    built = true
    await build(os, arch, enableProvenance, enablePublish, dryRun, registry)
    break
  }
}

if (!built) console.log('No builds enabled for platform.')
