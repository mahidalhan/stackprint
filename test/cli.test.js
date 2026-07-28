import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(projectRoot, "src/cli.js");

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
