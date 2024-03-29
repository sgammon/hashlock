# Security Policy

What follows is the security policy for Hashlock, which is part of the
[Elide project](https://github.com/elide-dev/elide). Please see
[Elide's Security Policy](https://github.com/elide-dev/elide/security/policy)
for questions and concerns not answered herein.

## Supported Versions

The following library versions are currently supported for security updates and
vulnerability reporting:

| Version   | Supported                |
| --------- | ------------------------ |
| `1.0.0+`  | :white_check_mark:       |
| `< 1.0.0` | Pre-release; best-effort |

---

## Reporting a Vulnerability

Please report all vulnerabilities, in private if necessary, to the
[Elide Project](https://elide.dev).

---

## Security Posture & Review

Hashlock is designed to run in multiple contexts and environments, and, in each,
the threat model and corresponding security guarantees are slightly different.
The threat model, as understood by the authors, is reviewed below, along with an
internal security review.

## Use Contexts

Hashlock can be used as a **JavaScript CLI or library**, as a **standalone
binary**, or as a **GitHub Action**. Each use context is detailed below, and
each has its own threat model and security posture notes.

### JavaScript CLI & Library

Hashlock ships as a JavaScript module
[on NPM](https://www.npmjs.com/package/hashlock), on
[GitHub Packages](https://github.com/sgammon/hashlock/pkgs/npm/hashlock), and
via [GitHub Releases](https://github.com/sgammon/hashlock/releases).

JavaScript library sources are available as ECMAScript Modules (`.mjs`), and as
CommonJS Modules (`.js`). Exports are provided explicitly, with each mapping
ESM, CJS, and TypeScript types. SLSA provenance is available for these library
releases and they are also published
[on Sigstore](https://search.sigstore.dev/?logIndex=81956357).

#### Standalone Binary

Hashlock also ships as native binary artifacts, built as
[standalone Bun binaries](https://bun.sh/docs/bundler/executables). These
artifacts are provided via
[GitHub Releases](https://github.com/sgammon/hashlock/releases), and soon NPM.

Standalone binaries are built in their native operating environment, with the
following supported platforms:

- `linux-amd64`
- `macos-amd64`
- `macos-aarch64`

Binaries are built with the latest version of Bun at the time of release,
directly from TypeScript, and package all necessary dependencies. SLSA
provenance and other verification material are available for these binaries.

#### GitHub Actions

Hashlock also ships as a
[GitHub Action](https://github.com/marketplace/actions/verify-hashes). In this
case, the action dispatches the `dist/action.js` file, which is committed to
source control with each update.

The GHA entrypoint is designed to be run on Node v20+, and builds against Node
v21.

### Threat Model

**1) Underlying primitives.**

Hashlock uses primitives from
[`node:fs/promises`](https://nodejs.org/dist/latest-v20.x/docs/api/fs.html) and
[`node:crypto`](https://nodejs.org/api/crypto.html). These primitives could, of
course, have bugs or vulnerabilities from time to time; where native executables
are concerned, Hashlock incorporates an aggressive release schedule to apply the
latest code from Bun.

Where Node is concerned (GHA and Node entrypoints), this aspect of Hashlock's
threat model is not within our control; users are encouraged to follow NVD for
Node or Bun-related vulnerabilities and patch accordingly.

**2) Underlying libraries.**

Hashlock uses [`glob`](https://www.npmjs.com/package/glob) for filesystem
scanning. Because Hashlock is packaged as a bundle, `glob` is listed as a
`devDependency`, so it is not passed along transitively. Downstream libraries,
therefore, should not inherit their own vulnerability surface from `glob`, since
Hashlock is usually used at build time, as a `devDependency` itself.

Vulnerabilities or bugs could surface in `glob` from time to time. This library
currently has no published security policy, but it is popular/high-visibility
(`136m` weekly downloads), it is maintained, and the author is responsive.

**3) Build pipelines.**

Hashlock does not perform downloads or invoke external programs. The logic
behind Hashlock does not access environment variables or execute loaded code.
Thus, especially considering release artifact provenance material, it should be
safe to use within build pipelines, with no possibility of overwriting or
otherwise mutating user code.

**4) File access.**

There is exactly one place where dynamic input turns into a system call which is
_not_ a hash: when Hashlock loads a subject file as directed by a hashfile. For
example, consider the following hashlock file:

`file.txt.sha256`

```
98ea6e4f216f2fb4b69fff9b3a44842c38686ca685f3f55dc48c5d3fb1107be4 file.txt
```

Hashlock finds this file during `hashlock check .`, reads the containing bytes,
decodes the bytes into `utf-8`, and then processes the input. Next, Hashlock
examines `file.txt`, and looks on the filesystem for a matching filename.

It is at this time that user input is taken into consideration for a suite of
syscalls. However, several mitigations are in place so that this mechanism
doesn't lose control:

- "Subject files" (as `file.txt` is called here) must be peers to their hash
  files, in the same directory
- Subject files must have a name matching either the line in the hashfile, or
  the hashfile's name itself

### Security Guarantees

Hashlock relies on the cryptographic and filesystem intrinsics provided by the
operating runtime, usually either [Node](https://github.com/nodejs/node) or
[Bun](https://github.com/oven-sh/bun).

Security guarantees provided by the software itself:

- Hashlock does not access environment variables
- Hashlock does not spawn external programs

Security guarantees provided by the software's build process:

- All releases and native executable builds happen in a cleanroom environment,
  from scratch
- All release artifacts are signed, provenance-enabled, and in most cases
  published to Sigstore
- All build steps occur in a `sudo`-less environment
- All build steps occur with strict network allowlisting and source code
  overwrite monitoring

## Relevant Policies

- [Elide Security Policy](https://github.com/elide-dev/elide/security/policy)
- [Node Security Policy](https://github.com/nodejs/node/security)
- [Bun Security Policy](https://github.com/oven-sh/bun/security)
