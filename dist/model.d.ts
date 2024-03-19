/// <reference types="node" />
/**
 * Hash Algorithm
 *
 * Describes the hash algorithms recognized by this action.
 */
export declare enum HashAlgorithm {
    MD5 = "md5",
    SHA1 = "sha1",
    SHA256 = "sha256",
    SHA512 = "sha512"
}
/**
 * Encoded Hash Sizes by Algorithm (Hex)
 *
 * Maps the expected size of a hex-encoded hash for a given algorithm.
 */
export declare const expectedHexHashSize: {
    md5: number;
    sha1: number;
    sha256: number;
    sha512: number;
};
/**
 * Algorithms by Encoded Hash Size (Hex)
 *
 * Maps the expected algorithm for a given hex-encoded hash size.
 */
export declare const encodedHashSizeHex: {
    [key: number]: string;
};
/**
 * Encoded Hash Sizes by Algorithm (Base64)
 *
 * Maps the expected size of a base64-encoded hash for a given algorithm.
 */
export declare const expectedBase64HashSize: {
    md5: number;
    sha1: number;
    sha256: number;
    sha512: number;
};
/**
 * Algorithms by Encoded Hash Size (Base64)
 *
 * Maps the expected algorithm for a given base64-encoded hash size.
 */
export declare const encodedHashSizeBase64: {
    [key: number]: string;
};
/**
 * Expected Hex Characters Regex
 *
 * Regular expression that matches the expected characters in a hex-encoded hash.
 */
export declare const expectedHexCharactersRegex: RegExp;
/**
 * Expected Base64 Characters Regex
 *
 * Regular expression that matches the expected characters in a base64-encoded hash.
 */
export declare const expectedBase64CharactersRegex: RegExp;
/**
 * Extension Map
 *
 * Maps file extensions to hash algorithms.
 */
export declare const extensionMap: {
    [key: string]: HashAlgorithm;
};
/**
 * All Algorithms
 *
 * All hash algorithms supported by the action.
 */
export declare const allAlgorithms: HashAlgorithm[];
/**
 * Hash Encoding
 *
 * Describes the hash encoding modes supported by the action.
 */
export declare enum HashEncoding {
    HEX = "hex",
    BASE64 = "base64"
}
/**
 * Verify Hash File Info
 *
 * Describes the result of verifying a hash file; this includes the file, the resolved subject, the detected algorithm,
 * and the result of the verification.
 */
export type VerifyHashFileInfo = {
    err: true;
    file: string;
    valid?: false;
    reason?: VerifyFailedReason;
} | {
    err: true;
    valid: false;
    found: true;
    file: string;
    peer: string;
    algorithm: HashAlgorithm;
    encoding: HashEncoding;
    reason: VerifyFailedReason;
    expected?: string;
    actual?: string;
} | {
    err: false;
    file: string;
    peer: string;
    found: true;
    valid: true;
    algorithm: HashAlgorithm;
    encoding: HashEncoding;
};
/**
 * Hash File Content
 *
 * Describes the detected algorithm, hash value, hash-file path, subject file path, and encoding, as detected from the
 * hash in the file.
 */
export type HashFileContent = {
    algorithm: HashAlgorithm;
    hash: string;
    hashfile: string;
    subject: string;
    encoding: HashEncoding;
};
/**
 * File Content
 *
 * Describes raw file content; this includes the subject file path and the file contents.
 */
export type FileContent = {
    file: string;
    contents: Buffer;
};
/**
 * Verify Failed Reason
 *
 * Enumerates reasons why hash verification can fail.
 */
export declare enum VerifyFailedReason {
    /** A subject file declared in a hash file could not be located. */
    SUBJECT_NOT_FOUND = "subject-not-found",
    /** No hash files match and strict mode was on. */
    NO_HASH_FILES_FOUND = "no-hash-files-found",
    /** There was a hash file that mismatched its subject file. */
    HASH_MISMATCH = "hash-mismatch",
    /** The hash listed in a hash file did not match the expected algorithm. */
    HASH_TYPE_MISMATCH = "hash-type-mismatch",
    /** The hash value listed in a hash value was malformed for the expected algorithm or encoding. */
    HASH_VALUE_INVALID = "hash-value-invalid",
    /** A generic error occurred while verifying: for example, a subject file exists but could not be read. */
    ERROR_WHILE_VERIFYING = "error-while-verifying"
}
/**
 * Verify Failed Info
 *
 * Describes a single hash verification check that failed during the course of action execution.
 */
export type VerifyFailedInfo = {
    reason: VerifyFailedReason;
    message: string;
};
