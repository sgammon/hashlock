import { throws } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { join, resolve, normalize } from 'node:path'
import {
  HashAlgorithm,
  HashEncoding,
  HashFileContent,
  FileContent
} from '../src/model'
import * as core from '@actions/core'
import * as main from '../src/main'

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

function mockFilePath(file: string): string {
  return resolve(normalize(join(__dirname, file)))
}

async function readMockData(file: string): Promise<string> {
  return readFile(mockFilePath(file), 'utf8')
}

async function readMockDataRaw(file: string): Promise<Buffer> {
  return readFile(mockFilePath(file))
}

describe('main', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
  })

  it('can guess the algorithm from the filename', () => {
    expect(main.detectAlgorithm('subject.md5')).toBe(HashAlgorithm.MD5)
    expect(main.detectAlgorithm('subject.sha1')).toBe(HashAlgorithm.SHA1)
    expect(main.detectAlgorithm('subject.sha')).toBe(HashAlgorithm.SHA1)
    expect(main.detectAlgorithm('subject.sha256')).toBe(HashAlgorithm.SHA256)
    expect(main.detectAlgorithm('subject.sha512')).toBe(HashAlgorithm.SHA512)
    throws(() => {
      main.detectAlgorithm('subject')
    })
  })

  it('can guess the subject file from the filename', () => {
    expect(main.findSubject('some/file/path/subject.txt.md5')).toBe(
      'some/file/path/subject.txt'
    )
    expect(main.findSubject('subject.txt.md5')).toBe('subject.txt')
    expect(main.findSubject('subject.md5')).toBe('subject')
  })

  it('can read and interpret a hash file (md5)', async () => {
    const mock = mockFilePath('subject.txt.md5')
    const content = await main.readHashFile(mock)
    expect(content.length).toBe(1)
    const [entry] = content
    expect(entry.algorithm).toBe(HashAlgorithm.MD5)
    expect(entry.hash).toBe('f19b9f6bb9a156da7ab8314f6bbe88e1')
    expect(entry.subject.endsWith('subject.txt')).toBe(true)
    expect(entry.encoding).toBe(HashEncoding.HEX)
  })

  it('can read and interpret a hash file (sha1)', async () => {
    const mock = mockFilePath('subject.txt.sha1')
    const content = await main.readHashFile(mock)
    expect(content.length).toBe(1)
    const [entry] = content
    expect(entry.algorithm).toBe(HashAlgorithm.SHA1)
    expect(entry.hash).toBe('6e03b21c9bb8e330fe380caf5649622e8a523cd2')
    expect(entry.subject.endsWith('subject.txt')).toBe(true)
    expect(entry.encoding).toBe(HashEncoding.HEX)
  })

  it('can read and interpret a hash file (sha256)', async () => {
    const mock = mockFilePath('subject.txt.sha256')
    const content = await main.readHashFile(mock)
    expect(content.length).toBe(1)
    const [entry] = content
    expect(entry.algorithm).toBe(HashAlgorithm.SHA256)
    expect(entry.hash).toBe(
      '08ae78e4e070f99e9f61385653166aa63a859edaa2cb455a0d91e49935c0a666'
    )
    expect(entry.subject.endsWith('subject.txt')).toBe(true)
    expect(entry.encoding).toBe(HashEncoding.HEX)
  })

  it('can read and interpret a hash file (sha512)', async () => {
    const mock = mockFilePath('subject.txt.sha512')
    const content = await main.readHashFile(mock)
    expect(content.length).toBe(1)
    const [entry] = content
    expect(entry.algorithm).toBe(HashAlgorithm.SHA512)
    expect(entry.hash).toBe(
      '87659625c8ac6da0c6e0cd08235672db755f42aa7196379034f9b913840cb46e48deace529cb74a38e21936a17d9435a40252352df378' +
        '4a51a715a518b63eb0a'
    )
    expect(entry.subject.endsWith('subject.txt')).toBe(true)
    expect(entry.encoding).toBe(HashEncoding.HEX)
  })

  it('can read subject file content', async () => {
    const expected = await readMockData('subject.txt')
    const content = await main.readSubject(join(__dirname, 'subject.txt'))
    expect(content.contents.toString()).toBe(expected)
    expect(content.file).toBe(mockFilePath('subject.txt'))
  })

  it('can properly compare two hashes (txt)', async () => {
    const hashFile: HashFileContent = {
      algorithm: HashAlgorithm.MD5,
      encoding: HashEncoding.HEX,
      subject: 'subject.txt',
      hashfile: 'subject.txt.md5',
      hash: 'f19b9f6bb9a156da7ab8314f6bbe88e1'
    }
    const fileContent: FileContent = {
      file: mockFilePath('subject.txt'),
      contents: await readMockDataRaw('subject.txt')
    }
    const hashMismatch: HashFileContent = {
      algorithm: HashAlgorithm.MD5,
      encoding: HashEncoding.HEX,
      subject: 'subject.txt',
      hash: 'some other hash value',
      hashfile: 'subject.txt.md5'
    }

    const result = main.compareHashWithSubject(hashFile, fileContent)
    expect(result.file).toBe(mockFilePath('subject.txt'))
    expect(result.valid).toBe(true)
    if (result.valid && !result.err) {
      expect(result.algorithm).toBe(HashAlgorithm.MD5)
      expect(result.encoding).toBe(HashEncoding.HEX)
      expect(result.peer).toBe('subject.txt')
    }
    expect(main.compareHashWithSubject(hashMismatch, fileContent).valid).toBe(
      false
    )
  })

  it('can properly compare two hashes (binary)', async () => {
    const hashFile: HashFileContent = {
      algorithm: HashAlgorithm.SHA256,
      encoding: HashEncoding.HEX,
      subject: 'sample.bin',
      hash: '449694973d4e3e6eae308278fa0ad610fc096b8ed3bd5e7ede0e63bcfae0e4fb',
      hashfile: 'sample.bin.sha256'
    }
    const fileContent: FileContent = {
      file: mockFilePath('sample.bin'),
      contents: await readMockDataRaw('sample.bin')
    }
    const hashMismatch: HashFileContent = {
      algorithm: HashAlgorithm.SHA256,
      encoding: HashEncoding.HEX,
      subject: 'subject.txt',
      hash: 'some other hash value',
      hashfile: 'subject.txt.sha256'
    }

    const result = main.compareHashWithSubject(hashFile, fileContent)
    expect(result.valid).toBe(true)
    expect(result.err).toBe(false)
    expect(result.file).toBe(mockFilePath('sample.bin'))
    if (result.valid && !result.err) {
      expect(result.algorithm).toBe(HashAlgorithm.SHA256)
      expect(result.encoding).toBe(HashEncoding.HEX)
      expect(result.peer).toBe('sample.bin')
    }
    expect(main.compareHashWithSubject(hashMismatch, fileContent).valid).toBe(
      false
    )
  })

  it('can read multiple hashes from multi-hash files', async () => {
    const subjects = await main.readHashFile(mockFilePath('multi.sha512'))
    expect(subjects.length).toBe(2)
    const subjects2 = await main.readHashFile(mockFilePath('multi.sha256'))
    expect(subjects2.length).toBe(2)
    const subjectSingular = await main.readHashFile(
      mockFilePath('sample.bin.sha1')
    )
    expect(subjectSingular.length).toBe(1)
  })

  function assertShouldMatchAll(
    file: string,
    subject: string[],
    hash: HashAlgorithm,
    encoding: HashEncoding
  ) {
    it(`multi-hash file ${file} should match expected subjects (algorithm: ${hash}, encoding: ${encoding})`, async () => {
      const verification = await main.verifyHashFile(mockFilePath(file))
      expect(verification.length).toBe(subject.length)
      const allVerifiedFiles = verification.map(i => i.file)
      subject.forEach(s => {
        expect(allVerifiedFiles.find(i => i.endsWith(s))).toBeDefined()
        const target = verification.find(i => i.file.endsWith(s))
        expect(target).toBeDefined()
        expect(target?.valid).toBe(true)
        if (target?.valid) {
          expect(target?.algorithm).toBe(hash)
          expect(target?.encoding).toBe(encoding)
          expect(target?.valid).toBe(true)
          expect(target?.file?.endsWith(s)).toBe(true)
        }
      })
    })
  }

  function assertShouldMatch(
    subject: string,
    file: string,
    hash: HashAlgorithm,
    encoding: HashEncoding
  ) {
    it(`subject ${subject} should match hash file ${file} (algorithm: ${hash}, encoding: ${encoding})`, async () => {
      const verification = await main.verifyHashFile(mockFilePath(file))
      expect(verification.length).not.toBe(0)
      const allVerifiedFiles = verification.map(i => i.file)
      expect(allVerifiedFiles.find(i => i.endsWith(subject))).toBeDefined()
      const target = verification.find(i => i.file.endsWith(subject))
      expect(target).toBeDefined()
      expect(target?.valid).toBe(true)
      if (target?.valid === true) {
        expect(target?.algorithm).toBe(hash)
        expect(target?.encoding).toBe(encoding)
        expect(target?.valid).toBe(true)
        expect(target?.file?.endsWith(subject)).toBe(true)
      }
    })
  }

  function assertShouldNotMatch(subject: string, file: string) {
    it(`subject ${subject} should not match hash file ${file}`, async () => {
      const verification = await main.verifyHashFile(mockFilePath(file))
      expect(verification.length).not.toBe(0)
      expect(verification.length).toBe(1)
      const target = verification[0]
      expect(target).toBeDefined()
      expect(target?.valid).toBe(false)
    })
  }

  assertShouldMatch(
    'subject.txt',
    'subject.txt.md5',
    HashAlgorithm.MD5,
    HashEncoding.HEX
  )
  assertShouldMatch(
    'subject.txt',
    'subject.txt.sha1',
    HashAlgorithm.SHA1,
    HashEncoding.HEX
  )
  assertShouldMatch(
    'subject.txt',
    'subject.txt.sha256',
    HashAlgorithm.SHA256,
    HashEncoding.HEX
  )
  assertShouldMatch(
    'subject.txt',
    'subject.txt.sha512',
    HashAlgorithm.SHA512,
    HashEncoding.HEX
  )
  assertShouldMatch(
    'sample.bin',
    'sample.bin.md5',
    HashAlgorithm.MD5,
    HashEncoding.HEX
  )
  assertShouldMatch(
    'sample.bin',
    'sample.bin.sha1',
    HashAlgorithm.SHA1,
    HashEncoding.HEX
  )
  assertShouldMatch(
    'sample.bin',
    'sample.bin.sha256',
    HashAlgorithm.SHA256,
    HashEncoding.HEX
  )
  assertShouldMatch(
    'sample.bin',
    'sample.bin.sha512',
    HashAlgorithm.SHA512,
    HashEncoding.HEX
  )

  assertShouldNotMatch('mismatch.txt', 'mismatch.txt.md5')
  assertShouldNotMatch('mismatch.txt', 'mismatch.txt.sha1')
  assertShouldNotMatch('mismatch.txt', 'mismatch.txt.sha256')
  assertShouldNotMatch('mismatch.txt', 'mismatch.txt.sha512')

  assertShouldMatchAll(
    'multi.sha256',
    ['subject.txt', 'sample.bin'],
    HashAlgorithm.SHA256,
    HashEncoding.HEX
  )
  assertShouldMatchAll(
    'multi.sha512',
    ['subject.txt', 'sample.bin'],
    HashAlgorithm.SHA512,
    HashEncoding.HEX
  )

  // verify algorithm checks
  it('should detect if a hashfile algorithm is not supported', () => {
    throws(() => {
      main.detectAlgorithm('subject.sha500')
    })
    throws(() => {
      main.detectAlgorithm('subject.txt.sha500')
    })
  })

  it('can detect a hash type by its size (hex)', () => {
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.HEX,
        'f19b9f6bb9a156da7ab8314f6bbe88e1'
      )
    ).toBe(HashAlgorithm.MD5)
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.HEX,
        '6e03b21c9bb8e330fe380caf5649622e8a523cd2'
      )
    ).toBe(HashAlgorithm.SHA1)
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.HEX,
        '08ae78e4e070f99e9f61385653166aa63a859edaa2cb455a0d91e49935c0a666'
      )
    ).toBe(HashAlgorithm.SHA256)
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.HEX,
        '87659625c8ac6da0c6e0cd08235672db755f42aa7196379034f9b913840cb46e48deace529cb74a38e21936a17d9435a40252352df3784a51a715a518b63eb0a'
      )
    ).toBe(HashAlgorithm.SHA512)
  })

  it('can detect a hash encoding by character set (hex)', () => {
    expect(main.detectEncodingForHash('f19b9f6bb9a156da7ab8314f6bbe88e1')).toBe(
      HashEncoding.HEX
    )
    expect(
      main.detectEncodingForHash('6e03b21c9bb8e330fe380caf5649622e8a523cd2')
    ).toBe(HashEncoding.HEX)
    expect(
      main.detectEncodingForHash(
        '08ae78e4e070f99e9f61385653166aa63a859edaa2cb455a0d91e49935c0a666'
      )
    ).toBe(HashEncoding.HEX)
    expect(
      main.detectEncodingForHash(
        '87659625c8ac6da0c6e0cd08235672db755f42aa7196379034f9b913840cb46e48deace529cb74a38e21936a17d9435a40252352df3784a51a715a518b63eb0a'
      )
    ).toBe(HashEncoding.HEX)
  })

  it('can detect a hash type by its size (base64)', () => {
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.BASE64,
        'ERfR24VED5P5jtxoEmWXoA=='
      )
    ).toBe(HashAlgorithm.MD5)
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.BASE64,
        '9IhuE1tpA5ViEPJCjEDkx4ctgeo='
      )
    ).toBe(HashAlgorithm.SHA1)
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.BASE64,
        'RJaUlz1OPm6uMIJ4+grWEPwJa47TvV5+3g5jvPrg5Ps='
      )
    ).toBe(HashAlgorithm.SHA256)
    expect(
      main.detectAlgorithmForHash(
        HashEncoding.BASE64,
        'GiyIBKVAZNr32i23vgvTm6i69oU8Jt4WnnfBjArwGyBr9Rv89niqQ7hIgfQ0qfPLdpi7XPpnTVUejDUNS4x6NQ=='
      )
    ).toBe(HashAlgorithm.SHA512)
  })

  it('can detect a hash encoding by character set (base64)', () => {
    expect(main.detectEncodingForHash('ERfR24VED5P5jtxoEmWXoA==')).toBe(
      HashEncoding.BASE64
    )
    expect(main.detectEncodingForHash('9IhuE1tpA5ViEPJCjEDkx4ctgeo=')).toBe(
      HashEncoding.BASE64
    )
    expect(
      main.detectEncodingForHash('RJaUlz1OPm6uMIJ4+grWEPwJa47TvV5+3g5jvPrg5Ps=')
    ).toBe(HashEncoding.BASE64)
    expect(
      main.detectEncodingForHash(
        'GiyIBKVAZNr32i23vgvTm6i69oU8Jt4WnnfBjArwGyBr9Rv89niqQ7hIgfQ0qfPLdpi7XPpnTVUejDUNS4x6NQ=='
      )
    ).toBe(HashEncoding.BASE64)
  })
})
