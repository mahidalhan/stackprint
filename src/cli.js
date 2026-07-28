#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import {
  buildProfile,
  buildPublishRequest,
  DEFAULT_PUBLIC_SITE,
  discoverCliTools,
  discoverInstalledApps,
  formatPublishPreview,
  publishBuilderProfile,
  renderJson,
  renderMarkdown,
  renderTerminal
} from "./index.js";

const HELP = `Stackprint — generate a private builder profile from local tool metadata

Usage:
  stackprint scan [options]
  stackprint publish --input <profile.json> --name <name> --handle <handle> [options]
  stackprint doctor
  stackprint explain
  stackprint --help

Scan options:
  --json                 Output JSON
  --markdown             Output Markdown
  --output <file>        Write to a file instead of stdout
  --no-apps              Skip installed app names
  --no-cli               Skip known CLI tools
  --versions             Execute known tools with --version
  --no-versions          Explicitly skip version checks (the default)
  --include-system-apps  Include operating-system apps
  --extended             Also list all executable names found on PATH

Publish options:
  --input <file>         Reviewed JSON created by stackprint scan
  --name <name>          Public builder name
  --handle <handle>      Public builder handle
  --role <text>          What you build (default: Builder)
  --x-handle <handle>    Optional public X handle
  --site <url>           Stackprint host (default: ${DEFAULT_PUBLIC_SITE})
  --dry-run              Show exactly what would be public; no network request
  --yes                  Confirm the reviewed profile may be uploaded publicly
  --json                 Emit the publish result as JSON

Privacy:
  Scans run locally without network requests or telemetry. Standard mode reads
  installed app names and checks a public catalog of CLI command names.
  --extended may reveal private executable names, so review before sharing.

Examples:
  stackprint scan
  stackprint scan --markdown --output stackprint-profile.md
  stackprint scan --json --no-apps
  stackprint publish --input stackprint-profile.json --name "Maya" --handle maya --dry-run
  stackprint publish --input stackprint-profile.json --name "Maya" --handle maya --yes
`;

const EXPLAIN = `What Stackprint reads

Standard scan:
  • Names of installed apps from operating-system application directories
  • Presence of known developer commands on PATH
  • OS family, CPU architecture, and shell name

Optional version scan:
  • --versions executes each detected known command with --version
  • Only a numeric version is retained

Extended scan:
  • Everything above
  • Basenames of executable files in PATH directories

What Stackprint never reads or emits:
  • User documents or arbitrary file contents
  • Shell or browser history
  • Environment variable values
  • Credentials, tokens, cookies, or password stores
  • Usernames, hostnames, home paths, or repository names

The scan itself makes no network requests and has no telemetry. Installing it
may contact the package host. Detected tooling is not proof of use.
`;

async function main(argv) {
  const args = [...argv];
  const command = args[0]?.startsWith("-") ? "scan" : (args.shift() ?? "scan");

  if (command === "help" || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(HELP);
    return;
  }
  if (command === "explain") {
    process.stdout.write(EXPLAIN);
    return;
  }
  if (command === "doctor") {
    process.stdout.write(doctor());
    return;
  }
  if (command === "publish") {
    await runPublish(args);
    return;
  }
  if (command !== "scan" && command !== "profile") {
    throw new CliError(`Unknown command: ${command}\n\n${HELP}`);
  }

  const options = parseScanOptions(args);
  if (options.extended) {
    process.stderr.write(
      "Stackprint: extended mode includes custom executable names. Review before sharing.\n"
    );
  }

  const [apps, cli] = await Promise.all([
    options.apps
      ? discoverInstalledApps({ includeSystemApps: options.includeSystemApps })
      : [],
    options.cli
      ? discoverCliTools({
          includeVersions: options.versions,
          extended: options.extended
        })
      : []
  ]);

  const profile = buildProfile({
    apps,
    cli,
    extended: options.extended,
    includeVersions: options.cli && options.versions && cli.length > 0
  });
  const format = inferFormat(options);
  const output = {
    json: renderJson,
    markdown: renderMarkdown,
    terminal: renderTerminal
  }[format](profile);

  if (options.output) {
    const outputPath = resolve(options.output);
    await writeFile(outputPath, output, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`Wrote ${format} profile to ${outputPath}\n`);
  } else {
    process.stdout.write(output);
  }
}

async function runPublish(args) {
  const options = parsePublishOptions(args);
  const source = JSON.parse(await readFile(resolve(options.input), "utf8"));
  const payload = buildPublishRequest(source, {
    name: options.name,
    handle: options.handle,
    role: options.role,
    xHandle: options.xHandle
  });

  if (options.dryRun) {
    process.stdout.write(formatPublishPreview(payload, options.site));
    if (options.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  if (!options.yes) {
    throw new CliError(
      "Publishing is public and requires --yes after reviewing a --dry-run preview."
    );
  }

  const result = await publishBuilderProfile(payload, options.site);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(
    [
      `Published: ${result.url}`,
      `Shared: ${result.profile?.count ?? 0} reviewed tool names`,
      "Not shared: raw scan file, system metadata, paths, histories, or credentials",
      ""
    ].join("\n")
  );
}

function parsePublishOptions(args) {
  const options = {
    input: "",
    name: "",
    handle: "",
    role: "Builder",
    xHandle: "",
    site: DEFAULT_PUBLIC_SITE,
    dryRun: false,
    yes: false,
    json: false
  };
  const values = {
    "--input": "input",
    "-i": "input",
    "--name": "name",
    "--handle": "handle",
    "--role": "role",
    "--x-handle": "xHandle",
    "--site": "site"
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--yes") options.yes = true;
    else if (arg === "--json") options.json = true;
    else if (values[arg]) {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new CliError(`${arg} requires a value`);
      }
      options[values[arg]] = value;
      index += 1;
    } else {
      throw new CliError(`Unknown publish option: ${arg}`);
    }
  }

  if (!options.input) {
    throw new CliError(
      "Publish requires --input <reviewed-profile.json>. Run stackprint scan --json --output <file> first."
    );
  }
  if (!options.name) throw new CliError("Publish requires --name <name>.");
  if (!options.handle) throw new CliError("Publish requires --handle <handle>.");
  if (options.dryRun && options.yes) {
    throw new CliError("Choose either --dry-run or --yes, not both.");
  }
  return options;
}

function parseScanOptions(args) {
  const options = {
    apps: true,
    cli: true,
    versions: false,
    includeSystemApps: false,
    extended: false,
    json: false,
    markdown: false,
    output: undefined
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--markdown" || arg === "--md") options.markdown = true;
    else if (arg === "--no-apps") options.apps = false;
    else if (arg === "--no-cli") options.cli = false;
    else if (arg === "--versions") options.versions = true;
    else if (arg === "--no-versions") options.versions = false;
    else if (arg === "--include-system-apps") options.includeSystemApps = true;
    else if (arg === "--extended") options.extended = true;
    else if (arg === "--output" || arg === "-o") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new CliError(`${arg} requires a file path`);
      }
      options.output = value;
      index += 1;
    } else {
      throw new CliError(`Unknown option: ${arg}`);
    }
  }

  if (options.json && options.markdown) {
    throw new CliError("Choose either --json or --markdown, not both");
  }
  return options;
}

function inferFormat(options) {
  if (options.json) return "json";
  if (options.markdown) return "markdown";
  if (options.output) {
    const extension = extname(options.output).toLowerCase();
    if (extension === ".json") return "json";
    if (extension === ".md" || extension === ".markdown") return "markdown";
  }
  return "terminal";
}

function doctor() {
  const lines = [
    "Stackprint doctor",
    `  Node.js: ${process.versions.node}`,
    `  Platform: ${process.platform}`,
    `  Architecture: ${process.arch}`,
    "  Network during scan: disabled by design",
    "  Ready: yes"
  ];
  return `${lines.join("\n")}\n`;
}

class CliError extends Error {}

main(process.argv.slice(2)).catch((error) => {
  const message = error instanceof CliError
    ? error.message
    : `Stackprint failed: ${error.message}`;
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
