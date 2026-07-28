import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(projectRoot, "src/cli.js");

test("--version reports the installed Stackprint release", () => {
  const output = execFileSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8",
  });
  assert.equal(output.trim(), "0.3.2");
});

test("doctor is non-scanning and reports readiness", () => {
  const output = execFileSync(process.execPath, [cliPath, "doctor"], {
    encoding: "utf8"
  });
  assert.match(output, /Ready: yes/);
  assert.match(output, /Network during scan: disabled by design/);
});

test("JSON scan returns the public schema without app or command execution", () => {
  const output = execFileSync(
    process.execPath,
    [cliPath, "scan", "--json", "--no-apps"],
    { encoding: "utf8", timeout: 15_000 }
  );
  const profile = JSON.parse(output);
  assert.equal(profile.schema_version, "1.0");
  assert.equal(profile.summary.detected_apps, 0);
  assert.equal(profile.privacy.network_used, false);
  assert.equal(profile.privacy.third_party_commands_executed, false);
});

test("invalid options fail closed", () => {
  const result = spawnSync(process.execPath, [cliPath, "scan", "--upload"], {
    encoding: "utf8"
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option/);
});

test("publish dry-run is reviewable and makes no upload", () => {
  const directory = mkdtempSync(join(tmpdir(), "stackprint-publish-"));
  const profilePath = join(directory, "profile.json");
  writeFileSync(
    profilePath,
    JSON.stringify({
      generated_at: "2026-07-28T00:00:00.000Z",
      privacy: { scan_mode: "standard" },
      summary: { detected_tools: 1, builder_signals: [] },
      apps: [{ name: "Figma", category: "design", kind: "app" }],
      cli: [],
    }),
  );
  const output = execFileSync(
    process.execPath,
    [
      cliPath,
      "publish",
      "--input",
      profilePath,
      "--name",
      "Maya",
      "--handle",
      "maya",
      "--dry-run",
    ],
    { encoding: "utf8" },
  );

  assert.match(output, /public profile preview/);
  assert.match(output, /Not sent: system metadata/);
});

test("publish without explicit yes fails closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "stackprint-publish-"));
  const profilePath = join(directory, "profile.json");
  writeFileSync(
    profilePath,
    JSON.stringify({
      summary: { detected_tools: 1, builder_signals: [] },
      apps: [{ name: "Figma", category: "design", kind: "app" }],
      cli: [],
    }),
  );
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "publish",
      "--input",
      profilePath,
      "--name",
      "Maya",
      "--handle",
      "maya",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires --yes/);
});
