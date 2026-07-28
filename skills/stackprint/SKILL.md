---
name: stackprint
description: Safely inventory installed apps and developer command-line tools, generate a local reviewable builder profile, and publish only an explicitly approved subset to Stackprint. Use when a user asks what tools are on a computer, wants to describe or share their builder stack, compare local toolsets, create a machine tool profile, or audit a developer setup without exposing secrets or activity history.
---

# Stackprint

Create a builder profile from installed-tool metadata. Treat detection as
evidence that a tool is available, never proof that it is actively used. The
scan and publish steps are deliberately separate.

## Prerequisite

Require `stackprint` to already be installed and available on `PATH`. Check with:

```bash
command -v stackprint
```

If it is missing, do not download or execute remote code automatically. Direct
the user to the project README to choose and approve an installation method.

## Workflow

1. Explain the scan contract before first use:
   - Run locally without telemetry or scan-time network requests.
   - Read app names, known command presence, OS family, architecture, and shell
     basename.
   - Exclude file contents, histories, environment values, credentials,
     usernames, hostnames, paths, and repository names.
2. Inspect the exact data contract when needed:

   ```bash
   stackprint explain
   ```

3. Run the standard scan:

   ```bash
   stackprint scan
   ```

4. Generate a reviewable artifact when the user wants to inspect or share:

   ```bash
   stackprint scan --json --output stackprint-profile.json
   ```

   The CLI refuses to overwrite an existing output file; choose a new path
   instead of deleting or replacing it silently.
5. Inspect the exact public boundary without a network request:

   ```bash
   stackprint publish \
     --input stackprint-profile.json \
     --name "Builder name" \
     --handle builder-handle \
     --dry-run
   ```

6. Tell the user the exact destination, public identity, tool count, and whether
   extended discovery was used. Ask for explicit approval to publish this
   current preview to `https://stackprint-builder.vercel.app`.
7. Only after that exact approval, publish:

   ```bash
   stackprint publish \
     --input stackprint-profile.json \
     --name "Builder name" \
     --handle builder-handle \
     --yes
   ```

8. Return the exact URL printed by the CLI. Do not claim completion from a
   preview, local route, or queued deployment.

Never add `--yes` on the user's behalf before the exact current preview and
destination are approved. A prior request to scan, build, test, or preview is
not publish approval.

## Extended Discovery

Use `--extended` only when the user explicitly wants custom PATH executable
names included. Warn that private internal command names may appear:

```bash
stackprint scan --extended --json
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

## Browser Review Path

When a visual review is easier, open `https://stackprint-builder.vercel.app`,
choose **Add your stack**, and open the JSON artifact. Parsing happens locally
first. The builder can deselect individual tools and must check the public
consent box before the site sends the reviewed profile to the server.

Do not automate that final publish button without the same explicit approval
required by the CLI path.
