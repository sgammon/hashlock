import { join, resolve, basename, dirname, normalize } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

import { glob } from './github'

import {
  HashVerifierLogger,
  HashVerifierResultsReceiver,
  createLogger,
  createReporter
} from './logger'

import {
  HashAlgorithm,
  HashEncoding,
  VerifyFailedReason,
  VerifyFailedInfo,
  VerifyHashFileInfo,
  HashFileContent,
  FileContent,
  expectedHexHashSize,
  expectedBase64HashSize,
  expectedHexCharactersRegex,
  expectedBase64CharactersRegex,
  encodedHashSizeHex,
  encodedHashSizeBase64,
  extensionMap,
  allAlgorithms
} from './model'

let logging = createLogger()

/**
 * Hash Verify Error
 *
 * Error-extending class which describes the `VerifyFailedReason` for a failure.
 */
export class HashVerifyErr extends Error {
  /**
   * Primary constructor.
   *
   * @param reason Reason for the failed verification
   * @param cause Cause (error), if any
   * @param message Message to override/report with
   */
  private constructor(
    readonly reason: VerifyFailedReason,
    readonly cause?: Error,
    message?: string
  ) {
    super(message)
  }

  /**
   * Prepare a hash verification error for the provided reason.
   *
   * @param reason Reason for the failure
   * @param message Message to show for the failure; optional
   * @returns Hash verification error
   */
  static of(reason: VerifyFailedReason, message?: string): HashVerifyErr {
    return new HashVerifyErr(reason, undefined, message)
  }
}

/**
 * Detect the hash algorithm used to produce a hash file.
 *
 * Because this action is designed to only match algorithms which is understands, errors here are thrown; only eligible
 * files should be making it this far. We need to throw a regular error to escape our custom error catch logic.
 *
 * @param file File path to detect an algorithm for
 * @returns Algorithm detected
 * @throws Error if the algorithm cannot be detected
 */
export function detectAlgorithm(file: string): HashAlgorithm {
  const split = file.split('.')
  const ext = split[split.length - 1]
  const algo = extensionMap[ext.trim().toLowerCase()]
  if (!algo) throw new Error(`Unrecognized hash algorithm for file: ${file}`)
  return algo
}

/**
 * Detect the encoding used for a hash value, based on the length and character set.
 *
 * @param hash Encoded hash value to detect the encoding for
 * @returns Detected encoding for the hash value, based on the length and character set
 */
export function detectEncodingForHash(hash: string): HashEncoding {
  const validBase64 =
    hash.match(expectedBase64CharactersRegex) != null &&
    encodedHashSizeBase64[hash.length] != null
  if (validBase64) {
    return HashEncoding.BASE64
  }
  const validHex =
    hash.match(expectedHexCharactersRegex) != null &&
    encodedHashSizeHex[hash.length] != null
  if (!validHex)
    throw HashVerifyErr.of(
      VerifyFailedReason.HASH_VALUE_INVALID,
      `Invalid hash value: ${hash}`
    )
  return HashEncoding.HEX
}

/**
 * Detect the hash algorithm expected for a hash value.
 *
 * Based on the length of an encoded hash value and its encoding, detect the algorithm which is expected to have
 * produced the hash.
 *
 * @param encoding Encoding which is in use for the hash value
 * @param hash Hash value to detect the algorithm for
 * @return Detected algorithm
 */
export function detectAlgorithmForHash(
  encoding: HashEncoding,
  hash: string
): HashAlgorithm {
  const alg =
    encoding === HashEncoding.BASE64
      ? encodedHashSizeBase64[hash.length]
      : encodedHashSizeHex[hash.length]
  if (!alg) {
    throw HashVerifyErr.of(
      VerifyFailedReason.HASH_VALUE_INVALID,
      `Invalid hash value: ${hash} (could not detect algorithm by length)`
    )
  }
  return alg as HashAlgorithm
}

/**
 * Find the subject file described by a hash file, or fail.
 *
 * Given a hash file, guess the filename of the subject file it relates to; this method of guessing the subject is only
 * used when the subject is not listed within the hash file.
 *
 * This method of guessing is not always entirely safe: it assumes that the hash file is named after the subject file,
 * and that the hash file is in the same directory as the subject file. This is a common convention, but not a rule.
 *
 * @param file Filename for the hash file
 * @returns Guessed filename for the subject file
 */
export function findSubject(file: string): string {
  // like: `some/file.txt.sha256`
  const parent = dirname(file)
  const filename = basename(file)
  const split = filename.split('.')

  // `subject.md5`
  if (split.length < 3) {
    // `subject`
    return join(parent, split[0])
  }

  // `subject.txt.md5` → `subject.txt`
  return join(parent, split.slice(0, split.length - 1).join('.'))
}

/**
 * Read the subject file described by a hash file, or fail.
 *
 * Given an absolute (resolved) path to a subject file, read it, returning a `FileContents` for it; if the file cannot
 * be safely read, throw hard. Errors here are considered verification failures (for example, a file which cannot be
 * read because of permissions).
 *
 * @param expected Expected file path where the file should be read from. Absolute.
 * @returns File contents
 * @throws HashVerifyErr if the file cannot be read.
 */
export async function readSubject(expected: string): Promise<FileContent> {
  if (!existsSync(expected)) {
    logging.warning(`Subject file not found at '${expected}'`)
    throw HashVerifyErr.of(VerifyFailedReason.SUBJECT_NOT_FOUND)
  }
  return {
    file: expected,
    contents: await readFile(expected)
  }
}

/**
 * Read a hash file and interpret it into a data structure suitable for comparison.
 *
 * Given the absolute and normalized path to a hash-file, resolve the path to an absolute normalized path, read it, and
 * interpret the file contents into one `HashFileContent` record per entry in the hash file. This method is designed to
 * tolerate errors while reading or decoding the hash file; these are propagated upward as `HashVerifyErr` exceptions.
 *
 * This method parses the hash file contents and will error aggressively if the contents do not match an expected
 * format. There are two supported variants of the format:
 *
 * 1) Hash files inline in the file, between 1 and N, like:
 *
 * **somefile.txt**:
 * ```text
 * (content)
 * ```
 *
 * **some-hash-file.txt.md5**:
 * ```text
 * 1234567890abcdef1234567890abcdef  somefile.txt
 * 1234567890abcdef1234567890abcdef  some/other/file.txt
 * ```
 *
 * In this mode, the hash file is expected to contain one hash per line, with the hash and the subject separated by
 * whitespace (any whitespace of any amount is fine). The subject is expected to be a relative path to the hash file, or
 * to be a peer file within the same directory if no path is present.
 *
 * The hash file filename does not need to match anything in particular in this mode. Mode 1 is the default mode; mode 2
 * (described below) only kicks in if no file is specified at all.
 *
 * 2) Hash files named alongside their subject, with no file specified, like:
 *
 * * **somefile.txt**:
 * ```text
 * (content)
 * ```
 *
 * **somefile.txt.md5**:
 * ```text
 * 1234567890abcdef1234567890abcdef
 * ```
 *
 * There are additional restrictions in this mode: (1) it only functions as a fallback to mode #1; (2) the hash file
 * can only list one hash (any additional non-blank lines cause an error), and (3) the hash file must be named after
 * the subject file, and must be in the same directory as the subject file.
 *
 * @param file Absolute and normalized path to a hash file
 * @returns Array of assertions specified within the hash file; one per subject/hash pair
 */
export async function readHashFile(file: string): Promise<HashFileContent[]> {
  logging.debug(`- Reading hash file at '${file}'`)
  const content = readFile(file, 'utf8')

  // detect the expected algorithm
  const algorithm = detectAlgorithm(file)
  const lines = (await content)
    .split('\n') // split by line
    .map(it => it.trim()) // trim each line
    // must be non-empty, non-whitespace-only
    .filter(it => it.length > 0 && it.replace(/\s/g, '').length > 0)

  const assertions = lines
    .map(line => {
      const split = line.split(/[ \t]{1,3}/)
      switch (split.length) {
        case 1:
          // special case: subject-less hashfiles can only have one non-blank line
          // so if this is not the only line with content, we should fail.
          if (lines.length > 1)
            throw HashVerifyErr.of(
              VerifyFailedReason.HASH_VALUE_INVALID,
              `Invalid hash file format at '${file}': subject-less hash files can only have one hash`
            )
          return {
            hash: split[0],
            encoding: detectEncodingForHash(split[0]),
            subject: resolve(
              normalize(join(dirname(file), basename(findSubject(file))))
            ),
            hashfile: file,
            algorithm
          }
        case 2:
          return {
            hash: split[0],
            encoding: detectEncodingForHash(split[0]),
            subject: resolve(
              normalize(join(dirname(file), basename(split[1])))
            ),
            hashfile: file,
            algorithm
          }
        default:
          logging.warning(`Unrecognized hash file format at '${file}'`)
          return
      }
    })
    .filter(it => !!it) as HashFileContent[]

  for (const assertion of assertions) {
    // the assertion should match the expected algorithm
    const expectedSizes =
      assertion.encoding === HashEncoding.HEX
        ? expectedHexHashSize
        : expectedBase64HashSize

    if (expectedSizes[algorithm] !== assertion.hash.length)
      throw HashVerifyErr.of(
        VerifyFailedReason.HASH_VALUE_INVALID,
        `Invalid hash value for file at '${file}': ${assertion.hash}`
      )
  }
  return assertions
}

/**
 * Compare the hashfile with the subject file, producing info about the result.
 *
 * This function performs the actual hashing and comparison for a given subject file content record; the content is
 * hashed as raw data, and then encoded according to the expected encoding from the hash file. The result is then
 * compared with the expected hash value.
 *
 * The results of this comparison are packaged up in full and returned to the caller for further processing. Errors
 * which escape this function are fatal and should be treated as such.
 *
 * @param hash Hashfile content (interpreted) to compare with the provided file contnt
 * @param subject Subject file content to hash and compare with the hashfile content
 * @returns Result of the comparison between the hash file and the hashed subject file content
 */
export function compareHashWithSubject(
  hash: HashFileContent,
  subject: FileContent
): VerifyHashFileInfo {
  const { algorithm, encoding, hash: expected } = hash
  logging.debug(
    `- Comparing hash for '${subject.file}' (algorithm: ${algorithm}, encoding: ${encoding}, expected: ${expected})`
  )

  const actual: string = createHash(algorithm)
    .update(subject.contents)
    .digest(encoding)
  const valid = actual === expected
  logging.debug(
    `- Hash comparison result for '${subject.file}': ${valid ? 'valid' : 'invalid'} (actual: ${actual})`
  )
  if (valid) {
    return {
      err: false,
      file: subject.file,
      peer: hash.subject,
      found: true,
      valid: true,
      algorithm,
      encoding
    }
  } else {
    return {
      err: true,
      found: true,
      valid: false,
      file: subject.file,
      peer: hash.subject,
      reason: VerifyFailedReason.HASH_MISMATCH,
      expected,
      actual,
      algorithm,
      encoding
    }
  }
}

/**
 * Verify a hash file at the provided name.
 *
 * Given the relative path to a hash file, resolve the path to an absolute normalized path, read it, and interpret the
 * hash file contents. For each declared hash assertion within the file (either in the file name as one hash, or in the
 * file body as 1-N hashes), compare the hash with the subject file, and return the results of these comparisons.
 *
 * For details about the hash file format and the expected behavior of this function, see `readHashFile` and the method
 * `compareHashWithSubject`.
 *
 * @param file Path to the hash file to be verified; will be resolved and normalized
 * @returns Result of hash comparisons performed
 */
export async function verifyHashFile(
  file: string
): Promise<VerifyHashFileInfo[]> {
  const abs = resolve(normalize(file))
  try {
    return Promise.all(
      (await readHashFile(abs)).map(async hash => {
        try {
          return compareHashWithSubject(hash, await readSubject(hash.subject))
        } catch (err) {
          if (err instanceof HashVerifyErr) {
            return {
              err: true,
              file: abs,
              valid: false,
              reason: err.reason
            }
          }
          /* c8 ignore next */
          throw err
          /* c8 ignore next */
        }
      })
    )
  } catch (err) {
    if (err instanceof HashVerifyErr) {
      return [
        {
          err: true,
          file: abs,
          valid: false,
          reason: err.reason
        }
      ]
    }
    /* c8 ignore next */
    throw err
    /* c8 ignore next */
  }
}

/**
 * Report hash-file verification results.
 *
 * @param eligible All eligible files which were scanned
 * @param verified Verified hash-file info records which matched
 * @param failures Hash files which did not match (but did not error)
 * @param err Hash file checks which failed because of errors
 * @param reporter Receiver for results
 */
export function reportResults(
  eligible: string[],
  verified: VerifyHashFileInfo[],
  failures: VerifyHashFileInfo[],
  err: VerifyFailedInfo[],
  reporter: HashVerifierResultsReceiver
): void {
  // report all eligible files for missing file calculations
  reporter.eligible(eligible)

  // report all verified and error states
  for (const result of verified.concat(failures)) {
    reporter.result(result)
  }
  for (const error of err) {
    reporter.failure(error)
  }
}

/**
 * Check Hashes Result
 *
 * Packages up results of a call to `checkHashes`, with all verified files, failed verifications, and errors.
 */
export type CheckHashesResult = {
  verifiedFiles: VerifyHashFileInfo[]
  failedVerifications: VerifyHashFileInfo[]
  errors: VerifyFailedInfo[]
}

/**
 * Check a specified set of globs or file paths for hash files; any hash files that are found are verified according to
 * the assertions they contain.
 *
 * The results of verifications are reported to the provided receiver, and then returned to the caller; the function
 * will fail if any verification fails and the `strict` flag is set, or if a fatal error or unexpected error occurs.
 * Otherwise, simple hash failures, missing subject files, etc., are all reported as results.
 *
 * @param paths Paths which are eligible for scanning
 * @param strict Whether to fail the action if any verification fails
 * @param ignored Paths to ignore
 * @param globs Whether to treat paths as globs
 * @param followSymbolicLinks Whether to follow symbolic links
 * @param reporter Custom receiver for results; optional.
 * @param logger Custom logger for the action; optional.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export default async function checkHashes(
  paths: string[],
  strict: boolean,
  ignored: string[],
  globs: boolean,
  followSymbolicLinks: boolean,
  reporter?: HashVerifierResultsReceiver,
  logger?: HashVerifierLogger
): Promise<CheckHashesResult> {
  const reportTo = reporter || createReporter()
  logging = logger || logging
  let files: string[]

  if (globs) {
    // grab inputs/config for globbing
    const globOptions = {
      followSymbolicLinks,
      matchDirectories: false
    }

    // start generating globs
    const patterns = paths
      .flatMap(path => allAlgorithms.map(hash => `${path}/**/*.${hash}`))
      .concat(ignored.map(entry => `!${entry}`))

    // prepare globber, start globbing
    const globber = await glob.create(patterns.join('\n'), globOptions)
    files = await globber.glob()
  } else {
    files = paths.filter(path => {
      return !ignored.includes(path)
    })
  }

  if (files.length === 0) {
    const msg = 'No hash files to verify.'
    if (strict) {
      logging.error(msg)
    } else {
      logging.info(msg)
    }
    return {
      verifiedFiles: [],
      failedVerifications: [],
      errors: []
    }
  }

  // begin verifying files
  logging.debug(`Verifying ${files.length} hash files...`)
  const promises = files.map(file => {
    logging.debug(`- Verifying '${file}'`)
    return {
      file,
      operation: verifyHashFile(file)
    }
  })

  // verify matched files
  const results: VerifyHashFileInfo[] = []
  const errors: VerifyFailedInfo[] = []

  for (const promise of promises) {
    results.push(...(await promise.operation))
  }

  const verifiedFiles = results.filter(({ valid }) => valid)
  const failedVerifications = results.filter(({ valid }) => !valid)
  reportResults(files, verifiedFiles, failedVerifications, errors, reportTo)
  return {
    verifiedFiles,
    failedVerifications,
    errors
  }
}
