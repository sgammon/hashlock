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

import { join, resolve, normalize } from 'node:path'
import * as generator from '../src/generator'
import { HashAlgorithm, HashEncoding } from '../src/model'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

function mockFilePath(file: string): string {
  return resolve(normalize(join(__dirname, file)))
}

describe('generator', () => {
  it('should be able to generate hash values (md5)', async () => {
    expect(
      await generator.generateHash(
        HashAlgorithm.MD5,
        HashEncoding.HEX,
        'hello world'
      )
    ).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3')
  })

  it('should be able to generate hash values (sha1)', async () => {
    expect(
      await generator.generateHash(
        HashAlgorithm.SHA1,
        HashEncoding.HEX,
        'hello world'
      )
    ).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed')
  })

  it('should be able to generate hash values (sha256)', async () => {
    expect(
      await generator.generateHash(
        HashAlgorithm.SHA256,
        HashEncoding.HEX,
        'hello world'
      )
    ).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  })

  it('should be able to generate hash values (sha512)', async () => {
    expect(
      await generator.generateHash(
        HashAlgorithm.SHA512,
        HashEncoding.HEX,
        'hello world'
      )
    ).toBe(
      '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f'
    )
  })

  it('should be able to generate a hash file structure with one subject', async () => {
    expect(
      await generator.generateHashfile(HashAlgorithm.SHA512, HashEncoding.HEX, [
        {
          file: 'hello.txt',
          content: 'hello world'
        }
      ])
    ).toEqual({
      algorithm: 'sha512',
      subjects: [
        {
          hash: '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f',
          subject: 'hello.txt'
        }
      ],
      encoding: 'hex'
    })
  })

  it('should be able to generate a hash file structure with multiple subjects', async () => {
    expect(
      await generator.generateHashfile(HashAlgorithm.SHA512, HashEncoding.HEX, [
        {
          file: 'hello.txt',
          content: 'hello world'
        },
        {
          file: 'two.txt',
          content: 'hello world two'
        }
      ])
    ).toEqual({
      algorithm: 'sha512',
      subjects: [
        {
          hash: '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f',
          subject: 'hello.txt'
        },
        {
          hash: '94d177ff4c2a0066eaf6b8a536355cb030bfecee77c95164b528ef16daed3f3269f377e12efb95d639e15f6579ffc3f6ff54252410112f83b54448bbea21b4be',
          subject: 'two.txt'
        }
      ],
      encoding: 'hex'
    })
  })

  it('should not throw immediately if asked to hash a subject file which does not exist', async () => {
    const op = generator.generateHashfileForFile(
      'does-not-exist.txt',
      HashAlgorithm.SHA256,
      HashEncoding.HEX
    )
    try {
      await op
    } catch {
      // nothing
    }
  })

  it('should throw if asked to hash a subject file which does not exist', async () => {
    let caught = false
    try {
      await generator.generateHashfileForFile(
        'does-not-exist.txt',
        HashAlgorithm.SHA256,
        HashEncoding.HEX
      )
    } catch (err) {
      caught = true
    }
    expect(caught).toBe(true)
  })

  it('should be able to generate a hash file structure from a file with one subject', async () => {
    expect(
      await generator.generateHashfileForFile(
        mockFilePath('subject.txt'),
        HashAlgorithm.SHA256,
        HashEncoding.HEX
      )
    ).toEqual({
      algorithm: 'sha256',
      subjects: [
        {
          hash: '08ae78e4e070f99e9f61385653166aa63a859edaa2cb455a0d91e49935c0a666',
          subject: 'subject.txt'
        }
      ],
      encoding: 'hex'
    })
  })

  it('should be able to generate a hash file structure from a file with multiple subjects', async () => {
    expect(
      await generator.generateHashfileForFiles(
        HashAlgorithm.SHA256,
        HashEncoding.HEX,
        [mockFilePath('subject.txt'), mockFilePath('sample.bin')]
      )
    ).toEqual({
      algorithm: 'sha256',
      subjects: [
        {
          hash: '08ae78e4e070f99e9f61385653166aa63a859edaa2cb455a0d91e49935c0a666',
          subject: 'subject.txt'
        },
        {
          hash: '449694973d4e3e6eae308278fa0ad610fc096b8ed3bd5e7ede0e63bcfae0e4fb',
          subject: 'sample.bin'
        }
      ],
      encoding: 'hex'
    })
  })
})

describe('formatter', () => {
  it('should be able to format a single-entry hash file', async () => {
    expect(
      generator.formatHashfileContent({
        algorithm: HashAlgorithm.SHA256,
        encoding: HashEncoding.HEX,
        subjects: [
          {
            subject: 'hello.txt',
            hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
          }
        ]
      })
    ).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  hello.txt'
    )
  })

  it('should be able to format a multi-entry hash file', async () => {
    expect(
      generator.formatHashfileContent({
        algorithm: HashAlgorithm.SHA256,
        encoding: HashEncoding.HEX,
        subjects: [
          {
            subject: 'hello.txt',
            hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
          },
          {
            subject: 'two.txt',
            hash: '5052997bcf0a59ef4665a4bb806aab05b55990c48d7177d82a9a57d59f2dc1c6'
          }
        ]
      })
    ).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  hello.txt\n' +
        '5052997bcf0a59ef4665a4bb806aab05b55990c48d7177d82a9a57d59f2dc1c6  two.txt'
    )
  })

  it('should be able to format with absolute file paths as subjects', async () => {
    const hashfile = generator.formatHashfileContent(
      {
        algorithm: HashAlgorithm.SHA256,
        encoding: HashEncoding.HEX,
        subjects: [
          {
            subject: 'hello.txt',
            hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
          },
          {
            subject: 'two.txt',
            hash: '5052997bcf0a59ef4665a4bb806aab05b55990c48d7177d82a9a57d59f2dc1c6'
          }
        ]
      },
      {
        absolute: true
      }
    )
    expect(hashfile).toBeDefined()
    expect(hashfile).toContain(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  '
    )
    expect(hashfile).toContain('/hello.txt\n')
    expect(hashfile).toContain(
      '5052997bcf0a59ef4665a4bb806aab05b55990c48d7177d82a9a57d59f2dc1c6  '
    )
    expect(hashfile).toContain('/two.txt')
  })
})

describe('writer', () => {
  it('should be able to write a single-entry hash file', async () => {
    // prep work
    const tmpdir = await mkdtemp(join('/tmp', 'hashfile-test'))
    const subject = resolve(join(tmpdir, 'hello.txt'))
    await writeFile(subject, 'hello world')
    expect(existsSync(subject)).toBe(true)

    const result = await generator.writeHashfileForFile(
      subject,
      HashAlgorithm.SHA256,
      HashEncoding.HEX
    )

    // // expect `hello.txt.sha256` to exist
    expect(result.path.endsWith('hello.txt.sha256')).toBe(true)
    expect(existsSync(result.path)).toBe(true)
    expect(result.content.subjects).toHaveLength(1)
    expect(result.content.subjects[0].hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    )
    expect(result.content.subjects[0].subject).toBe('hello.txt')

    const hashfileContent = await readFile(result.path, 'utf8')
    expect(hashfileContent).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  hello.txt'
    )
  })

  it('should be able to write a multi-entry hash file', async () => {
    // prep work
    const tmpdir = await mkdtemp(join('/tmp', 'hashfile-test-multi'))
    const subject = resolve(join(tmpdir, 'hello.txt'))
    const subject2 = resolve(join(tmpdir, 'hello2.txt'))
    await writeFile(subject, 'hello world')
    await writeFile(subject2, 'hello world 2')
    expect(existsSync(subject)).toBe(true)
    expect(existsSync(subject2)).toBe(true)

    const result = await generator.writeHashfileForFiles(
      HashAlgorithm.SHA256,
      HashEncoding.HEX,
      resolve(join(tmpdir, 'hello-hashes.txt.sha256')),
      [subject, subject2]
    )

    // // expect `hello.txt.sha256` to exist
    expect(result.path.endsWith('hello-hashes.txt.sha256')).toBe(true)
    expect(existsSync(result.path)).toBe(true)
    expect(result.content.subjects).toHaveLength(2)
    expect(result.content.subjects[0].hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    )
    expect(result.content.subjects[1].hash).toBe(
      'ed12932f3ef94c0792fbc55263968006e867e522cf9faa88274340a2671d4441'
    )
    expect(result.content.subjects[0].subject).toBe('hello.txt')
    expect(result.content.subjects[1].subject).toBe('hello2.txt')

    const hashfileContent = await readFile(result.path, 'utf8')
    expect(hashfileContent).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  hello.txt\n' +
        'ed12932f3ef94c0792fbc55263968006e867e522cf9faa88274340a2671d4441  hello2.txt'
    )
  })

  it('should be able to write a single-entry hash file with explicit path', async () => {
    // prep work
    const tmpdir = await mkdtemp(join('/tmp', 'hashfile-test'))
    const subject = resolve(join(tmpdir, 'hello.txt'))
    await writeFile(subject, 'hello world')
    expect(existsSync(subject)).toBe(true)

    const result = await generator.writeHashfileForFile(
      subject,
      HashAlgorithm.SHA256,
      HashEncoding.HEX,
      resolve(join(tmpdir, 'hello.sha256'))
    )

    // // expect `hello.txt.sha256` to exist
    expect(result.path.endsWith('hello.sha256')).toBe(true)
    expect(existsSync(result.path)).toBe(true)
    expect(result.content.subjects).toHaveLength(1)
    expect(result.content.subjects[0].hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    )
    expect(result.content.subjects[0].subject).toBe('hello.txt')

    const hashfileContent = await readFile(result.path, 'utf8')
    expect(hashfileContent).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  hello.txt'
    )
  })

  it('should be able to write a multi-entry hash file with explicit path', async () => {
    // prep work
    const tmpdir = await mkdtemp(join('/tmp', 'hashfile-test-multi'))
    const subject = resolve(join(tmpdir, 'hello.txt'))
    const subject2 = resolve(join(tmpdir, 'hello2.txt'))
    await writeFile(subject, 'hello world')
    await writeFile(subject2, 'hello world 2')
    expect(existsSync(subject)).toBe(true)
    expect(existsSync(subject2)).toBe(true)

    const result = await generator.writeHashfileForFiles(
      HashAlgorithm.SHA256,
      HashEncoding.HEX,
      resolve(join(tmpdir, 'hello-hashes.sha256')),
      [subject, subject2]
    )

    // // expect `hello.txt.sha256` to exist
    expect(result.path.endsWith('hello-hashes.sha256')).toBe(true)
    expect(existsSync(result.path)).toBe(true)
    expect(result.content.subjects).toHaveLength(2)
    expect(result.content.subjects[0].hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    )
    expect(result.content.subjects[1].hash).toBe(
      'ed12932f3ef94c0792fbc55263968006e867e522cf9faa88274340a2671d4441'
    )
    expect(result.content.subjects[0].subject).toBe('hello.txt')
    expect(result.content.subjects[1].subject).toBe('hello2.txt')

    const hashfileContent = await readFile(result.path, 'utf8')
    expect(hashfileContent).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  hello.txt\n' +
        'ed12932f3ef94c0792fbc55263968006e867e522cf9faa88274340a2671d4441  hello2.txt'
    )
  })
})
