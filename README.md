# `hashlock`

> Latest release: `1.0.0-rc5`

[![CI](https://github.com/sgammon/hashlock/actions/workflows/on.push.yml/badge.svg)](https://github.com/sgammon/hashlock/actions/workflows/on.push.yml)
![NPM Version](https://img.shields.io/npm/v/hashlock)
![SLSA](https://img.shields.io/badge/SLSA-white?logoColor=white&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB2aWV3Qm94PSIwIDAgMjggMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI%2BPGRlZnM%2BPGNsaXBQYXRoIGlkPSJjbGlwMF8xMjNfMTEyNyI%2BPHBhdGggZD0iTTAgNS42QzAgMi41MDcyMSAyLjUwNzIxIDAgNS42IDBIMjIuNEMyNS40OTI4IDAgMjggMi41MDcyMSAyOCA1LjZWMjIuNEMyOCAyNS40OTI4IDI1LjQ5MjggMjggMjIuNCAyOEg1LjZDMi41MDcyMSAyOCAwIDI1LjQ5MjggMCAyMi40VjUuNloiIGZpbGw9IndoaXRlIi8%2BPC9jbGlwUGF0aD48L2RlZnM%2BPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzEyM18xMTI3KSIgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgLTguODgxNzg0MTk3MDAxMjUyZS0xNiwgLTMuNTUyNzEzNjc4ODAwNTAxZS0xNSkiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMjYuMTA1MiAzLjA2MzY4ZS0wNUwyNi4xODIyIC0wLjA4NzA1NTdMMjQuNjgzNiAtMS40MTE1TDI0LjAyMTQgLTAuNjYyMTkxQzIzLjgyMzcgLTAuNDM4NTA2IDIzLjYyMzIgLTAuMjE3NzUyIDIzLjQxOTkgMy4wNjM2OGUtMDVIMi44NjEwMmUtMDZWMS41NTg0MUwtMS4zNzU5OCAyLjQwNjQ2TC0wLjg1MTI5NyAzLjI1Nzc2Qy0wLjU3NjYwMiAzLjcwMzQ2IC0wLjI5MjcyNyA0LjE0MTY4IDIuODYxMDJlLTA2IDQuNTcyMjRWMjMuMjU2NEMtMC4wMDY3ODE4MiAyMy4yNTY2IC0wLjAxMzU2NjkgMjMuMjU2NyAtMC4wMjAzNTIxIDIzLjI1NjlMLTEuMDIwMTQgMjMuMjc3MkwtMC45Nzk0MzUgMjUuMjc2OEwyLjg2MTAyZS0wNiAyNS4yNTY5VjI4SDI4VjEwLjI2MzJDMjguMjg4MSA5Ljg0ODU1IDI4LjU2NzkgOS40MjY2MiAyOC44MzkyIDguOTk3NTlDMjkuMjk0OSA4LjMxMTczIDI5LjYzMzMgNy43MjUzMiAyOS44NTk4IDcuMzA2QzI5Ljk3MzcgNy4wOTUyMSAzMC4wNTk1IDYuOTI2MjkgMzAuMTE3OCA2LjgwNzc2QzMwLjE0NyA2Ljc0ODQ5IDMwLjE2OTMgNi43MDE3OCAzMC4xODQ5IDYuNjY4N0wzMC4yMDMyIDYuNjI5NDJMMzAuMjA4NiA2LjYxNzY5TDMwLjIxMDQgNi42MTM4NEwzMC4yMTEgNi42MTI0M0wzMC4yMTEzIDYuNjExODVMMzAuMjExNCA2LjYxMTU5QzMwLjIxMTQgNi42MTE0OCAzMC4yMTE1IDYuNjExMzYgMjkuMzU1NyA2LjIyNTE1TDMwLjIxMTUgNi42MTEzNkwzMC42MjI4IDUuNjk5ODdMMjguNzk5OCA0Ljg3NzIyTDI4LjM4OSA1Ljc4NzU4TDI4LjM4ODkgNS43ODc3OUwyOC4zODg4IDUuNzg3OTdMMjguMzg4NyA1Ljc4ODNMMjguMzg4NiA1Ljc4ODQ5TDI4LjM4ODUgNS43ODg3TDI4LjM4NjkgNS43OTIxOUwyOC4zNzU2IDUuODE2NTFDMjguMzY0NyA1LjgzOTUgMjguMzQ3NCA1Ljg3NTgzIDI4LjMyMzQgNS45MjQ0OEMyOC4yNzU1IDYuMDIxOCAyOC4yMDEzIDYuMTY4MjQgMjguMTAwMiA2LjM1NTQ4QzI4LjA2OTMgNi40MTI2NyAyOC4wMzU5IDYuNDczNjIgMjggNi41MzgxMVYzLjA2MzY4ZS0wNUgyNi4xMDUyWk0yNi4xMDUyIDMuMDYzNjhlLTA1SDIzLjQxOTlDMTkuMDEwNiA0LjcyMzcgMTMuMzAxNSA4LjA0OTI3IDcuMDIxNTMgOS41NTU4QzQuNjQ2NTcgNy40NDc2NyAyLjU2MDU2IDQuOTgxNjkgMC44NTEzMDMgMi4yMDg0TDAuMzI2NjIzIDEuMzU3MUwyLjg2MTAyZS0wNiAxLjU1ODQxVjQuNTcyMjRDMS43NDE1MyA3LjEzMzczIDMuNzk2NDggOS40MjQgNi4wOTY0NyAxMS40MDM1QzkuNDAyNDQgMTQuMjQ4NyAxMy4yMTQ3IDE2LjQ1MTggMTcuMzMwNCAxNy44OTU2QzEzLjg0NTcgMjAuMTczMSA5LjkzNzk1IDIxLjc4NTMgNS44MDgwMSAyMi42MTY2QzMuOTEyNTIgMjIuOTk4MSAxLjk3MDA4IDIzLjIxNTEgMi44NjEwMmUtMDYgMjMuMjU2NFYyNS4yNTY5TDAuMDIwMzU3OCAyNS4yNTY0QzIuMTE3MTcgMjUuMjEzOCA0LjE4NDg5IDI0Ljk4MzQgNi4yMDI2NCAyNC41NzcyQzExLjI4MzIgMjMuNTU0NiAxNi4wNDYxIDIxLjQxODEgMjAuMTU5NyAxOC4zNTkzQzIzLjE2MTggMTYuMTI3MSAyNS44MTgzIDEzLjQwMzUgMjggMTAuMjYzMlY2LjUzODExQzI3LjgwMDcgNi44OTYyNiAyNy41MjQxIDcuMzYzNTEgMjcuMTY3NCA3Ljg5OTcxTDI3LjE2MDkgNy45MDk1MkwyNy4xNTQ2IDcuOTE5NDhDMjUuMDUyMiAxMS4yNDczIDIyLjQwMjggMTQuMTIyNiAxOS4zNjIxIDE2LjQ1NTRDMTUuNTg1OSAxNS4zMTM2IDEyLjA1MTMgMTMuNTAzOCA4LjkyNjI4IDExLjEyM0MxNS4zMjI3IDkuMjk3MTkgMjEuMDkxNSA1LjY3MzA5IDI1LjUyIDAuNjYyMjUyTDI2LjEwNTIgMy4wNjM2OGUtMDVaIiBmaWxsPSIjRkY2NzQwIi8%2BPC9nPjwvc3ZnPg%3D%3D)
![CII Best Practices](https://img.shields.io/cii/level/8721?label=openssf&link=https%3A%2F%2Fwww.bestpractices.dev%2Fen%2Fprojects%2F8721)
![OSSF-Scorecard Score](https://img.shields.io/ossf-scorecard/github.com/sgammon/hashlock?label=scorecard&link=https%3A%2F%2Fsecurityscorecards.dev%2Fviewer%2F%3Furi%3Dgithub.com%2Fsgammon%2Fhashlock)
[![codecov](https://codecov.io/gh/sgammon/verify-hashes/graph/badge.svg?token=WjsLdBMl6u)](https://codecov.io/gh/sgammon/verify-hashes)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=sgammon_verify-hashes&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=sgammon_verify-hashes)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=sgammon_verify-hashes&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=sgammon_verify-hashes)

---

> Use it as a CLI to check hash files like `something.txt.sha256`:

```shell
hashlock check .
```

> Or to generate hash lock files:

```shell
hashlock -a sha256 generate something.txt
# equivalent to `sha256sum something.txt > something.txt.sha256`
```

> Or, use it as a GitHub Action:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/hashlock@v1
```

> Or, use it as a library, from TypeScript or JavaScript:

```
{
  "devDependencies": {
    "hashlock": "..."
  }
}
```

```javascript
import { checkHashes } from 'hashlock'
```

---

## Usage: CLI

This package is also usable as a command line tool, under the name `hashlock`.
The CLI is distributed on
[NPM as a JavaScript package](https://www.npmjs.com/package/hashlock), as well
as here, [on GitHub](https://github.com/sgammon/hashlock/releases), as a
[standalone executable built by Bun](https://bun.sh/docs/bundler/executables).

> [!NOTE] The CLI does not support Windows yet. Once
> [Bun](https://github.com/oven-sh/bun/issues/43) ships support for standalone
> Windows executables, this project will follow suit.

### Installing the CLI

```
npm install -g hashlock
yarn install -g hashlock
pnpm install -g hashlock
bun install -g hashlock
```

### Using the CLI

```
hashlock --help
```

### Quick runs without installing

```
npx hashlock ...
yarnpkg hashlock ...
pnpm dlx hashlock ...
bun x hashlock ...
```

---

## Usage: Actions

```yaml
- name: 'Check: Hashes'
  uses: sgammon/hashlock@v1
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

### Inputs

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

### Examples

#### Fail if hash files are not found

Strict mode will fail if hash files are not found or all of them are ignored:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/hashlock@v1
  with:
    strict: true
```

#### Verify a specific set of hash files

Turn off globs to do that. Multi-line values are accepted for `paths`:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/hashlock@v1
  with:
    globs: false
    paths: |
      some/cool/hashfile.txt.sha256
```

### Behavior

This section describes in detail how the action behaves.

#### Paths

By default, `paths` and `ignored` are treated as globs. Entries in `ignored` are
actually just globbed against each algorithm, same as `paths`, but with `!`
prepended. So, for example:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/hashlock@v1
  with:
    paths: hello
    ignored: goodbye
```

The effective glob is:

```
hello/**/*.{md5,sha,sha1,sha256,sha512}
!goodbye
```

##### Literal paths mode

When you pass `globs: false`, the `paths` entries become regular literal paths:

```yaml
- name: 'Check: Hashes'
  uses: sgammon/hashlock@v1
  with:
    paths: |
      hello.sha256
      djkhaledanotherone.sha256
    globs: false
```

The effective paths are:

```text
hello.sha256
djkhaledanotherone.sha256
```

---

## Usage: Library

This package is also usable as a JavaScript or TypeScript library. Simply
install `hashlock` and you should have the main code + typings. The package
ships with source maps as well.

---

## Dependency Security

SLSA, Sigstore provenance, and SPDX are all supported by this package. All
release artifacts are shipped with provenance metadata.
