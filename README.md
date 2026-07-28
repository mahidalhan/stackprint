# Stackprint

Stackprint turns the tools installed on a computer into a reviewable builder
profile, then publishes only the tool names the builder explicitly selects.

[Explore the builder atlas](https://stackprint-builder.vercel.app) or generate
your own profile locally:

```bash
npx --yes github:mahidalhan/stackprint scan
```

It detects app names and known developer CLIs, groups them into a stack, and
derives modest signals such as “AI-assisted builder” or “mobile builder.” It
does not inspect activity history, so it says a tool is *available*, not that
the owner actively uses or endorses it.

## Why this exists

Builders learn by seeing what other builders use. Today that knowledge is
scattered across screenshots, interviews, dotfiles, and recommendation posts.
Stackprint creates the missing primitive: a portable toolset profile generated
on the builder's own machine, with sharing kept optional.

The product is local-first and consent-gated:

1. Discover the available tool stack.
2. Generate a JSON artifact the owner can inspect.
3. Remove anything the owner does not want public.
4. Publish only after a separate consent action.

## Builder atlas

The `web/` app turns a reviewed Stackprint JSON file into an editorial builder
profile. The raw file is parsed in the browser. The builder selects the public
tool names, fills in public identity fields, and explicitly consents before the
reviewed profile is uploaded to Vercel. The raw scan, system metadata, paths,
histories, and credentials are not sent. Published profiles are durable and
appear in the public builder atlas alongside clearly labeled fictional demos.

```bash
npm --prefix web install
npm run web:dev
```

Generate a profile for the import flow with:

```bash
npx --yes github:mahidalhan/stackprint scan \
  --json \
  --output stackprint-profile.json
```

Then choose **Add your stack** at
[stackprint-builder.vercel.app](https://stackprint-builder.vercel.app), or use
the fully reviewable CLI publish flow:

```bash
npx --yes github:mahidalhan/stackprint publish \
  --input stackprint-profile.json \
  --name "Your name" \
  --handle your-handle \
  --dry-run

# Run only after approving the preview and public destination:
npx --yes github:mahidalhan/stackprint publish \
  --input stackprint-profile.json \
  --name "Your name" \
  --handle your-handle \
  --yes
```

The production-shaped UI can be captured with
[Shot-scraper](https://shot-scraper.datasette.io/):

```bash
uvx shot-scraper shot http://127.0.0.1:5173/ \
  -o stackprint-home.png -w 1440 -h 1000 --reduced-motion --fail
```

## Commands

```bash
# Human-readable local summary
npx --yes github:mahidalhan/stackprint scan

# Shareable Markdown file
npx --yes github:mahidalhan/stackprint scan --markdown --output stackprint-profile.md

# Structured JSON
npx --yes github:mahidalhan/stackprint scan --json

# Inspect the privacy contract without scanning
npx --yes github:mahidalhan/stackprint explain

# Check runtime compatibility without scanning
npx --yes github:mahidalhan/stackprint doctor

# Preview the exact public boundary without uploading
npx --yes github:mahidalhan/stackprint publish \
  --input stackprint-profile.json \
  --name "Your name" \
  --handle your-handle \
  --dry-run
```

Other useful controls:

```text
--no-apps              Skip installed app names
--no-cli               Skip known CLI tools
--versions             Execute detected known tools with --version
--no-versions          Explicitly skip version checks (the default)
--include-system-apps  Include built-in operating-system apps
--extended             Include every executable basename found on PATH
```

`--extended` is opt-in because private internal command names can appear in
`PATH`. Review extended output before sharing.

## Privacy model

The scanner has no telemetry and makes no network requests. Running it through
`npx` contacts GitHub to download the package; scanning happens locally after
installation.

| Data | Standard scan | Extended scan |
| --- | --- | --- |
| Installed app names | Yes | Yes |
| Known CLI command presence | Yes | Yes |
| Safe numeric version strings | With `--versions` | With `--versions` |
| OS family, architecture, shell basename | Yes | Yes |
| All executable basenames on `PATH` | No | Yes |
| File contents or shell history | Never | Never |
| Browser history or cookies | Never | Never |
| Environment values or credentials | Never | Never |
| Username, hostname, home path, repository names | Never | Never |
| Uploading during `scan` | Never | Never |

`publish` is a separate command with a network request. It requires a reviewed
JSON file plus `--yes`, sends only the public identity, selected tool names,
categories, kinds, and bounded builder signals, and returns the durable profile
URL. Use `--dry-run` first. The browser builder exposes the same boundary and
lets the owner exclude individual tools.

Profiles are written only when `--output` is supplied. Existing files are not
overwritten.

## What it discovers

On macOS, Stackprint reads application bundle names in `/Applications` and the
current user's `Applications` directory. System apps are excluded unless
`--include-system-apps` is set.

On Linux, it reads standardized desktop-launcher names. On Windows, it uses
application and Start Menu metadata. CLI detection checks a public catalog
against `PATH`. Version checks are opt-in because they execute the detected
third-party commands; when enabled, Stackprint retains only a numeric version
from `--version` output.

The catalog covers editors, AI coding tools, runtimes, package managers,
source control, containers, cloud tools, infrastructure, databases, mobile,
media, networking, terminal utilities, and robotics.

## Agent skill

The repository includes a portable Stackprint skill with the safety and sharing
workflow:

```bash
npx skills add mahidalhan/stackprint --skill stackprint
```

The skill exists for privacy gates and state interpretation. Basic CLI usage
remains discoverable through `stackprint --help`.

## Local development

```bash
npm test
npm run check
npm run web:test
npm run web:build
node src/cli.js scan --json --no-versions
```

Requires Node.js 20 or newer. Stackprint has zero runtime dependencies.

## Contributing

Contributions are welcome, especially safe detectors, app classification rules,
platform fixtures, and privacy tests. Add only metadata-level discovery. A
detector that reads user content, histories, account identity, or secret-bearing
configuration will not be accepted.

## License

MIT
