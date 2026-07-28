import test from "node:test";
import assert from "node:assert/strict";
import { buildProfile } from "../src/profile.js";
import { renderMarkdown } from "../src/render.js";

const apps = [
  { name: "Figma", category: "design", kind: "app", source: "fixture" },
  { name: "ChatGPT", category: "ai-assistants", kind: "app", source: "fixture" }
];
const cli = [
  { name: "Python", category: "language-runtimes", kind: "cli", version: "3.13.1" },
  { name: "Node.js", category: "language-runtimes", kind: "cli", version: "22.14.0" },
  { name: "Go", category: "language-runtimes", kind: "cli", version: "1.24.0" }
];

test("profile is deterministic and makes bounded builder inferences", () => {
  const profile = buildProfile({
    apps,
    cli,
    generatedAt: "2026-07-27T00:00:00.000Z",
    system: { operating_system: "macOS", platform: "darwin", architecture: "arm64" }
  });

  assert.equal(profile.summary.detected_tools, 5);
  assert.deepEqual(profile.summary.builder_signals, [
    "AI-assisted builder",
    "Polyglot builder",
    "Design-enabled builder"
  ]);
  assert.equal(profile.privacy.network_used, false);
  assert.equal(profile.privacy.third_party_commands_executed, false);
  assert.equal(profile.privacy.claims_activity, false);
});

test("rendered Markdown explicitly distinguishes installation from use", () => {
  const profile = buildProfile({ apps, cli });
  const markdown = renderMarkdown(profile);
  assert.match(markdown, /does not prove active use/i);
  assert.match(markdown, /No file contents/);
  assert.doesNotMatch(markdown, /mahidalhan|\/Users\/|\"hostname\"\s*:/i);
});
