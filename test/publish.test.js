import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublishRequest,
  formatPublishPreview,
  publishBuilderProfile,
} from "../src/publish.js";

const sourceProfile = {
  generated_at: "2026-07-28T00:00:00.000Z",
  privacy: { scan_mode: "standard" },
  summary: {
    detected_tools: 2,
    builder_signals: ["Design-enabled builder"],
  },
  apps: [{ name: "Figma", category: "design", kind: "app" }],
  cli: [{ name: "Node.js", category: "language-runtimes", kind: "cli" }],
  system: {
    operating_system: "macOS",
    architecture: "arm64",
    shell: "zsh",
  },
};

test("publish request excludes raw system metadata", () => {
  const payload = buildPublishRequest(sourceProfile, {
    name: "Maya",
    handle: "@maya",
    role: "Builder",
  });

  assert.equal(payload.tools.length, 2);
  assert.equal("system" in payload, false);
  assert.equal(JSON.stringify(payload).includes("arm64"), false);
  assert.equal(payload.consent.public, true);
  assert.deepEqual(payload.signals, ["Design-enabled builder"]);
});

test("dry-run preview states the destination and exclusion boundary", () => {
  const payload = buildPublishRequest(sourceProfile, {
    name: "Maya",
    handle: "@maya",
  });
  const preview = formatPublishPreview(payload);

  assert.match(preview, /stackprint-builder\.vercel\.app/);
  assert.match(preview, /Not sent: system metadata/);
  assert.match(preview, /Tool names: 2/);
});

test("publishBuilderProfile posts the reviewed public shape", async () => {
  const payload = buildPublishRequest(sourceProfile, {
    name: "Maya",
    handle: "@maya",
  });
  let request;
  const result = await publishBuilderProfile(payload, "https://example.com", {
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return new Response(
        JSON.stringify({
          url: "https://example.com/b/maya-abcd",
          profile: { count: 2 },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  assert.equal(request.url, "https://example.com/api/profiles");
  assert.equal(request.options.method, "POST");
  assert.equal(JSON.parse(request.options.body).identity.handle, "@maya");
  assert.equal(result.profile.count, 2);
});
