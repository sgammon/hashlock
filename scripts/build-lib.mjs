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

import common from './build-common.mjs'
import * as esbuild from 'esbuild'

const buildSettings = {
  ...common,
  entryPoints: [
    'src/index.ts',
    'src/generator.ts',
    'src/logger.ts',
    'src/main.ts',
    'src/model.ts',
    'src/tool.ts'
  ]
}

const buildSettingsCjs = {
  ...buildSettings,
  format: 'cjs',
  outdir: 'dist/cjs'
}

const buildSettingsEsm = {
  ...buildSettings,
  format: 'esm',
  outdir: 'dist/esm',
  outExtension: {
    '.js': '.mjs'
  }
}

export default async function buildLib() {
  console.info("- Building 'hashlock' (lib, cjs)...")
  await esbuild.build(buildSettingsCjs)

  console.info("- Building 'hashlock' (lib, esm)...")
  await esbuild.build(buildSettingsEsm)
}
