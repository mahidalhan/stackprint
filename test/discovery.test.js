import test from "node:test";
import assert from "node:assert/strict";
import { currentSystemProfile, extractVersion } from "../src/discovery.js";

test("extractVersion returns only a numeric version", () => {
  assert.equal(extractVersion("Docker version 27.2.0, build abc123"), "27.2.0");
  assert.equal(extractVersion("v22.14.0"), "22.14.0");
  assert.equal(extractVersion("tool 1.2.3-beta.1 (/Users/private/bin)"), "1.2.3-beta.1");
  assert.equal(extractVersion("no version here"), undefined);
});

test("system profile never includes identity or a full shell path", () => {
  assert.deepEqual(
    currentSystemProfile({
      platform: "darwin",
      architecture: "arm64",
      shell: "/bin/zsh"
    }),
    {
      operating_system: "macOS",
      platform: "darwin",
      architecture: "arm64",
      shell: "zsh"
    }
  );
});
