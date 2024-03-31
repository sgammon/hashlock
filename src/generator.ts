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

//
// Note: While these tools are exposed for packages downstream, they are considered low-level (no error handling, etc.)
// and use outside of this package does not guarantee API stability.
//

import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto' // @TODO(sgammon): streaming?
import { readFile, writeFile } from 'node:fs/promises'
import { normalize, resolve, join, dirname, basename } from 'node:path'
import { HashAlgorithm, HashEncoding, HashFile } from './model'

/**
 * Generate an encoded hash for the provided content
 *
 * @param algo Algorithm to use when generating the hash
 * @param encoding Encoding to use to encode the hash
 * @param content Content to hash as a raw buffer or string
 * @return Encoded hash value
 */
export async function generateHash(
  algo: HashAlgorithm,
  encoding: HashEncoding,
  content: Buffer | string
): Promise<string> {
  return createHash(algo).update(content).digest(encoding)
}

/**
 * Generate a hash file with one or more subjects; each subject is a file with its content
 *
 * @param algo Algorithm to use when generating the hashes
 * @param encoding Encoding to use to encode the hashes
 * @param subjects Subject files with their paths and content
 * @return Hash file content structure
 */
export async function generateHashfile(
  algo: HashAlgorithm,
  encoding: HashEncoding,
  subjects: { file: string; content: Buffer | string }[]
): Promise<HashFile> {
  const targets: { hash: string; subject: string }[] = []
  for (const subject of subjects) {
    const hash = await generateHash(algo, encoding, subject.content)
    targets.push({ hash, subject: subject.file })
  }
  return {
    algorithm: algo,
    subjects: targets,
    encoding
  }
}

/**
 * Generate a hash file as a peer to the specified `file`; the hash file content is not written, it is returned
 *
 * If the file cannot be located or cannot be read, an error is thrown. The provided file path is resolved, normalized,
 * and otherwise cleaned up before reading.
 *
 * @param file Subject filepath; can be relative or absolute
 * @param algo Algorithm to use when generating the hashes
 * @param encoding Encoding to use to encode the hashes
 * @return Hash file content structure
 */
export async function generateHashfileForFile(
  file: string,
  algo: HashAlgorithm,
  encoding: HashEncoding
): Promise<HashFile> {
  const path = resolve(normalize(file))
  if (!existsSync(path)) throw new Error(`could not locate file at ${path}`)

  const hashValue = generateHash(algo, encoding, await readFile(path))
  return {
    algorithm: algo,
    encoding,
    subjects: [
      {
        hash: await hashValue,
        subject: basename(file)
      }
    ]
  }
}

/**
 * Generate a hash file from multiple input `files`; the hash file content is not written, it is returned
 *
 * If any specified file cannot be located or cannot be read, an error is thrown. The provided file paths are resolved,
 * normalized, and otherwise cleaned up before reading.
 *
 * @param algo Algorithm to use when generating the hashes
 * @param encoding Encoding to use to encode the hashes
 * @param file Subject file paths; each can be relative or absolute
 * @return Hash file content structure
 */
export async function generateHashfileForFiles(
  algo: HashAlgorithm,
  encoding: HashEncoding,
  files: string[]
): Promise<HashFile> {
  const subjects: { subject: string; hash: string }[] = []
  const promises: Promise<HashFile>[] = []
  for (const file of files) {
    const path = resolve(normalize(file))
    promises.push(generateHashfileForFile(path, algo, encoding))
  }
  for (const result of promises) {
    subjects.push(...(await result).subjects)
  }
  return {
    algorithm: algo,
    subjects,
    encoding
  }
}

/**
 * Options to apply when formatting a hash file
 */
export type HashfileFormatOptions = {
  /**
   * Whether to include subject file paths; defaults to `true` and should usually be left on.
   */
  subjects: boolean

  /**
   * Whether to express paths in the hashfile (subject file paths) as absolute paths. Defaults to `false` and should
   * usually be left off.
   */
  absolute: boolean

  /**
   * Separator string to use between the hash value and subject file path; defaults to a double-space for compatibility
   * with existing tools.
   */
  separator: string
}

/**
 * Default options for hashfile formatting.
 */
export const defaultFormatOptions: HashfileFormatOptions = {
  subjects: true,
  absolute: false,
  separator: '  '
}

/**
 * Format the provided hash-file content as a well-formed mapping of hashes to their subject paths.
 *
 * The format is as follows:
 *
 * ```text
 * <hash>  <subject>
 * ```
 *
 * For example:
 * ```text
 * 3e25960a79dbc69b674cd4ec67a72c62  /path/to/file
 * ```
 *
 * If multiple subjects are present in the hash file structure, all are written to the string. It is expected that all
 * provided hashes are of the same algorithm and encoding. Each subject/hash pair is written to a new line.
 *
 * This function produces identical output to the `shasum` series of command line tools for nix-like operating systems,
 * and is tested against these tools for compatibility.
 *
 * @param file File content to format as a hash-file
 * @param options Options which govern the formatting of the file
 * @return Formatted hash-file content
 */
export function formatHashfileContent(
  file: HashFile,
  options?: Partial<HashfileFormatOptions>
): string {
  const lines: string[] = []
  const opts = {
    ...defaultFormatOptions,
    ...(options || {})
  }
  for (const subject of file.subjects) {
    let path
    if (opts.absolute) {
      path = resolve(normalize(subject.subject))
    } else {
      path = subject.subject
    }
    lines.push(`${subject.hash}${opts.separator}${path}`)
  }
  return lines.join('\n')
}

/**
 * Generate a hash file for the specified `file`, and then write it as a peer, unless `name` is provided, in which case
 * it is used.
 *
 * @param file File to hash as the subject file
 * @param algo Algorithm to use for the hashing
 * @param encoding Encoding to use for encoding the hash value
 * @param path Path to write the hash file name at; can be a name, which is resolved against the subject file
 * @param options Options to apply when formatting the hash file
 * @return Object with the written hashfile path and generated hashfile content
 */
export async function writeHashfileForFile(
  file: string,
  algo: HashAlgorithm,
  encoding: HashEncoding,
  path?: string,
  options?: Partial<HashfileFormatOptions>
): Promise<{ path: string; content: HashFile }> {
  const filename = basename(file)
  const generated = generateHashfile(algo, encoding, [
    { file: filename, content: await readFile(file) }
  ])
  const outpath = path
    ? resolve(normalize(path))
    : join(dirname(file), `${filename}.${algo}`)
  const content = await generated
  const formatted = formatHashfileContent(content, options)
  await writeFile(outpath, formatted)
  return { path: outpath, content }
}

/**
 * Generate a hash file for the specified `files`, and then write it as a peer at `name`.
 *
 * @param algo Algorithm to use for the hashing
 * @param encoding Encoding to use for encoding the hash value
 * @param path Path of the hash file to write
 * @param files Files to hash as the subject file
 * @param options Options to apply when formatting the file
 * @return Object with the written hashfile path and generated hashfile content
 */
export async function writeHashfileForFiles(
  algo: HashAlgorithm,
  encoding: HashEncoding,
  path: string,
  files: string[],
  options?: Partial<HashfileFormatOptions>
): Promise<{ path: string; content: HashFile }> {
  const generated = generateHashfileForFiles(algo, encoding, files)
  const outpath = resolve(normalize(path))
  const content = await generated
  const formatted = formatHashfileContent(content, options)
  await writeFile(outpath, formatted)
  return { path: outpath, content }
}
