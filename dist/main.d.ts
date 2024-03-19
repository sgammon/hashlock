import { HashVerifierLogger, HashVerifierResultsReceiver } from './logger';
import { HashAlgorithm, HashEncoding, VerifyFailedReason, VerifyFailedInfo, VerifyHashFileInfo, HashFileContent, FileContent } from './model';
/**
 * Hash Verify Error
 *
 * Error-extending class which describes the `VerifyFailedReason` for a failure.
 */
export declare class HashVerifyErr extends Error {
    readonly reason: VerifyFailedReason;
    readonly cause?: Error | undefined;
    /**
     * Primary constructor.
     *
     * @param reason Reason for the failed verification
     * @param cause Cause (error), if any
     * @param message Message to override/report with
     */
    private constructor();
    /**
     * Prepare a hash verification error for the provided reason.
     *
     * @param reason Reason for the failure
     * @param message Message to show for the failure; optional
     * @returns Hash verification error
     */
    static of(reason: VerifyFailedReason, message?: string): HashVerifyErr;
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
export declare function detectAlgorithm(file: string): HashAlgorithm;
/**
 * Detect the encoding used for a hash value, based on the length and character set.
 *
 * @param hash Encoded hash value to detect the encoding for
 * @returns Detected encoding for the hash value, based on the length and character set
 */
export declare function detectEncodingForHash(hash: string): HashEncoding;
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
export declare function detectAlgorithmForHash(encoding: HashEncoding, hash: string): HashAlgorithm;
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
export declare function findSubject(file: string): string;
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
export declare function readSubject(expected: string): Promise<FileContent>;
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
export declare function readHashFile(file: string): Promise<HashFileContent[]>;
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
export declare function compareHashWithSubject(hash: HashFileContent, subject: FileContent): VerifyHashFileInfo;
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
export declare function verifyHashFile(file: string): Promise<VerifyHashFileInfo[]>;
/**
 * Report hash-file verification results.
 *
 * @param eligible All eligible files which were scanned
 * @param verified Verified hash-file info records which matched
 * @param failures Hash files which did not match (but did not error)
 * @param err Hash file checks which failed because of errors
 * @param reporter Receiver for results
 */
export declare function reportResults(eligible: string[], verified: VerifyHashFileInfo[], failures: VerifyHashFileInfo[], err: VerifyFailedInfo[], reporter: HashVerifierResultsReceiver): void;
/**
 * Check Hashes Result
 *
 * Packages up results of a call to `checkHashes`, with all verified files, failed verifications, and errors.
 */
export type CheckHashesResult = {
    verifiedFiles: VerifyHashFileInfo[];
    failedVerifications: VerifyHashFileInfo[];
    errors: VerifyFailedInfo[];
};
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
export default function checkHashes(paths: string[], strict: boolean, ignored: string[], globs: boolean, followSymbolicLinks: boolean, reporter?: HashVerifierResultsReceiver, logger?: HashVerifierLogger): Promise<CheckHashesResult>;
