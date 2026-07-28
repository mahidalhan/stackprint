import assert from "node:assert/strict";
import test from "node:test";
import {
  filterBuilders,
  normalizeHandle,
  profileFromStackprint,
  publicProfileRequest,
  toolKey,
} from "../src/profile-utils.js";

test("normalizeHandle returns one leading at sign", () => {
  assert.equal(normalizeHandle("mahid"), "@mahid");
  assert.equal(normalizeHandle("@mahid"), "@mahid");
  assert.equal(normalizeHandle(""), "");
});

test("profileFromStackprint groups app and CLI metadata", () => {
  const profile = profileFromStackprint(
    {
      summary: {
        detected_tools: 2,
        categories: 2,
        builder_signals: ["Polyglot builder"],
      },
      apps: [{ name: "Figma", category: "design", kind: "app" }],
      cli: [{ name: "Node.js", category: "runtimes", kind: "cli" }],
    },
    { name: "Maya", handle: "@maya" },
  );

  assert.equal(profile.name, "Maya");
  assert.equal(profile.count, 2);
  assert.equal(profile.tools.length, 2);
  assert.equal(profile.tools[1].tools[0].kind, "cli");
});

test("profileFromStackprint rejects empty or unrelated JSON", () => {
  assert.throws(
    () => profileFromStackprint({ summary: {}, apps: [], cli: [] }),
    /No detected Stackprint tools/,
  );
});

test("filterBuilders matches both builder and tool names", () => {
  const builders = [
    {
      name: "Maya",
      handle: "@maya",
      role: "Designer",
      tags: ["Design"],
      toolNames: ["Figma"],
    },
  ];
  assert.equal(filterBuilders(builders, "figma", "All").length, 1);
  assert.equal(filterBuilders(builders, "", "AI").length, 0);
});

test("publicProfileRequest includes only explicitly selected tools and signals", () => {
  const profile = profileFromStackprint(
    {
      summary: {
        detected_tools: 3,
        categories: 3,
        builder_signals: [
          "AI-assisted builder",
          "Design-enabled builder",
        ],
      },
      apps: [
        { name: "Figma", category: "design", kind: "app" },
        {
          name: "Cursor",
          category: "ai-assistants",
          kind: "app",
        },
      ],
      cli: [{ name: "Node.js", category: "runtimes", kind: "cli" }],
    },
    { name: "Maya", handle: "@maya" },
  );
  const selected = new Set([
    toolKey("Ai Assistants", { name: "Cursor", kind: "app" }),
  ]);
  const request = publicProfileRequest(
    profile,
    { name: "Maya", handle: "@maya", role: "Builder", xHandle: "" },
    selected,
  );

  assert.equal(request.tools.length, 1);
  assert.equal(request.tools[0].tools[0].name, "Cursor");
  assert.deepEqual(request.signals, ["AI-assisted builder"]);
  assert.equal("sourcePayload" in request, false);
  assert.equal("system" in request, false);
});
