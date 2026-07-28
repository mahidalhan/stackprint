---
name: stackprint
description: Safely inventory installed apps and developer command-line tools, then generate a local, reviewable builder profile with the Stackprint CLI. Use when a user asks what tools are on a computer, wants to describe or share their builder stack, compare local toolsets, create a machine tool profile, or audit a developer setup without exposing secrets or activity history.
---

# Stackprint

Create a local builder profile from installed-tool metadata. Treat detection as
evidence that a tool is available, never proof that it is actively used.

## Workflow

1. Explain the scan contract before first use:
   - Run locally without telemetry or scan-time network requests.
   - Read app names, known command presence, OS family, architecture, and shell
     basename.
   - Exclude file contents, histories, environment values, credentials,
     usernames, hostnames, paths, and repository names.
2. Inspect the exact data contract when needed:

   ```bash
   npx --yes github:mahidalhan/stackprint explain
   ```

3. Run the standard scan:

   ```bash
   npx --yes github:mahidalhan/stackprint scan
   ```

4. Generate a reviewable artifact only when requested:

   ```bash
   npx --yes github:mahidalhan/stackprint scan --markdown --output stackprint-profile.md
   ```

   Use `--json` for structured data. The CLI refuses to overwrite an existing
   output file; choose a new path instead of deleting or replacing it silently.
5. Inspect the artifact before sharing it. Never upload, post, publish, or send
   a profile without explicit approval for the exact destination.

## Extended Discovery

Use `--extended` only when the user explicitly wants custom PATH executable
names included. Warn that private internal command names may appear:

```bash
npx --yes github:mahidalhan/stackprint scan --extended --json
```

Do not infer app activity, frequency, recency, skill level, identity, or
endorsement from an extended scan.

## Scope Controls

- Use `--no-apps` to inspect known CLI tools only.
- Use `--no-cli` to inspect installed app names only.
- Keep version checks off by default. Use `--versions` only when the user wants
  versions and understands that it executes detected third-party commands with
  `--version`; only numeric version strings are retained.
- Use `--include-system-apps` only when built-in OS apps matter.
- Use `stackprint doctor` for a non-scanning runtime check.

## Docker

Treat Docker as a reproducible test surface, not the default scanner. A
container sees the container's filesystem and command path, not the host's full
desktop application inventory. Do not recommend broad host-directory mounts as
a workaround.
