import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_PROMPT,
  INSTALL_CLI_COMMAND,
  INSTALL_SKILL_COMMAND,
  RUN_ONCE_COMMAND,
} from "../src/install-copy.js";

test("first-run copy distinguishes CLI download, skill install, and approval", () => {
  assert.match(RUN_ONCE_COMMAND, /github:mahidalhan\/stackprint#v0\.3\.1/);
  assert.match(RUN_ONCE_COMMAND, /--output stackprint-profile\.json/);
  assert.match(INSTALL_CLI_COMMAND, /npm install --global/);
  assert.match(INSTALL_SKILL_COMMAND, /npx skills add mahidalhan\/stackprint/);
  assert.match(INSTALL_SKILL_COMMAND, /-a codex/);
  assert.match(AGENT_PROMPT, /ask before publishing anything/i);
});
