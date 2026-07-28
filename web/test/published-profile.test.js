import assert from "node:assert/strict";
import test from "node:test";
import {
  makeProfileSlug,
  sanitizePublishRequest,
} from "../lib/published-profile.js";

const request = {
  consent: { public: true },
  identity: {
    name: "Maya Builder",
    handle: "@Maya.Builds",
    role: "Robotics builder",
  },
  tools: [
    {
      name: "Design",
      tools: [
        { name: "Figma", kind: "app", source: "detected" },
        { name: "Figma", kind: "app", source: "detected" },
      ],
    },
    {
      name: "Runtimes",
      tools: [{ name: "Node.js", kind: "cli", source: "detected" }],
    },
  ],
  signals: ["Robotics builder"],
  generatedAt: "2026-07-27T00:00:00.000Z",
};

test("sanitizePublishRequest keeps only bounded public profile fields", () => {
  const profile = sanitizePublishRequest(request, {
    now: new Date("2026-07-28T00:00:00.000Z"),
  });

  assert.equal(profile.handle, "@maya.builds");
  assert.equal(profile.count, 2);
  assert.equal(profile.tools[0].tools.length, 1);
  assert.equal(profile.publishedAt, "2026-07-28T00:00:00.000Z");
  assert.deepEqual(profile.signals, ["Design-enabled builder"]);
  assert.equal("system" in profile, false);
  assert.equal("privacy" in profile, false);
});

test("publishing requires explicit public consent", () => {
  assert.throws(
    () => sanitizePublishRequest({ ...request, consent: { public: false } }),
    /consent is required/i,
  );
});

test("makeProfileSlug produces an immutable share slug", () => {
  const profile = sanitizePublishRequest(request);
  assert.equal(makeProfileSlug(profile, "A1B2C3D4"), "maya-builds-a1b2c3d4");
});
