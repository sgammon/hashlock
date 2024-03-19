# Verify Hashes Action

[![CI](https://github.com/sgammon/verify-hashes/actions/workflows/on.push.yml/badge.svg)](https://github.com/sgammon/verify-hashes/actions/workflows/on.push.yml)
[![Check: Dist](https://github.com/sgammon/verify-hashes/actions/workflows/check.dist.yml/badge.svg)](https://github.com/sgammon/verify-hashes/actions/workflows/check.dist.yml)
[![Check: CodeQL](https://github.com/sgammon/verify-hashes/actions/workflows/check.codeql-analysis.yml/badge.svg)](https://github.com/sgammon/verify-hashes/actions/workflows/check.codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

---

> A very simple action:

```shell
find . -name "<filename>.{md5,sha,sha1,sha256,sha512} -exec \
  # (verify <filenames> within <hashfile>)
```

---

## Getting Started

```yaml
- name: 'Check: Hashes'
  uses: sgammon/verify-hashes@v1
```

This will check all files in your codebase that look like:

```
filename.ext
filename.ext.{md5,sha,sha1,sha256,sha512}
```

For example, say you have a hash file:

**`something.txt.sha256`**:

```
98ea6e4f216f2fb4b69fff9b3a44842c38686ca685f3f55dc48c5d3fb1107be4  something.txt
```

And you have the subject it asserts upon:

**`something.txt`**:

```
hi
```

This action will detect `something.txt.sha256`, find `something.txt`, hash it
according to SHA-256, and make sure the two match.

## Usage

| Input                   | Description                                      | Default         |
| ----------------------- | ------------------------------------------------ | --------------- |
| `paths`                 | Paths to search under. See _Paths_.              | `.`             |
| `strict`                | Activate strict mode. See below.                 | `false`         |
| `ignored`               | Paths to ignore. See _Paths_.                    | `node_modules/` |
| `follow-symbolic-links` | Controls link behavior with globs.               | `true`          |
| `globs`                 | Controls whether paths are interpreted as globs. | `true`          |
| `warn-only`             | Doesn't fail the build if hashes mismatch.       | `false`         |

**By default, the following cases will fail the action:**

- There was a hash file, the subject file was found, the hash did not match
- There was a hash file, the subject file was not found
- There was a hash file, it was malformed or broken
- There was a hash file with no subject or the subject file is ambiguous

**In `strict` mode, the following _additional_ cases fail the action:**

- There were no hash files found under any `paths`, or all of them were ignored

## Examples

### Fail if hash files are not found

Strict mode will fail if hash files are not found or all of them are ignored:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/verify-hashes@v1
  with:
    strict: true
```

### Verify a specific set of hash files

Turn off globs to do that. Multi-line values are accepted for `paths`:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/verify-hashes@v1
  with:
    globs: false
    paths: |
      some/cool/hashfile.txt.sha256
```

## Behavior

This section describes in detail how the action behaves.

### Paths

By default, `paths` and `ignored` are treated as globs. Entries in `ignored` are
actually just globbed against each algorithm, same as `paths`, but with `!`
prepended. So, for example:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/verify-hashes@v1
  with:
    paths: hello
    ignored: goodbye
```

The effective glob is:

```
hello/**/*.{md5,sha,sha1,sha256,sha512}
!goodbye
```

#### Literal paths mode

When you pass `globs: false`, the `paths` entries become regular literal paths:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/verify-hashes@v1
  with:
    paths: |
      hello.sha256
      djkhaledanotherone.sha256
    globs: false
```

The effective paths are:

```
hello.sha256
djkhaledanotherone.sha256
```
