import test from "node:test";
import assert from "node:assert/strict";
import { classifyApp, normalizeToolName, TOOL_CATALOG } from "../src/catalog.js";

test("catalog names and primary commands are unique", () => {
  const names = TOOL_CATALOG.map((tool) => tool.name);
  const commands = TOOL_CATALOG.map((tool) => tool.commands[0]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(commands).size, commands.length);
});

test("app classification is transparent and case-insensitive", () => {
  assert.equal(classifyApp("Visual Studio Code"), "editors");
  assert.equal(classifyApp("ChatGPT"), "ai-assistants");
  assert.equal(classifyApp("Figma Beta"), "design");
  assert.equal(classifyApp("An Unknown App"), "other-apps");
});

test("tool names are normalized from application metadata", () => {
  assert.equal(normalizeToolName("Visual_Studio-Code.app"), "Visual Studio Code");
  assert.equal(normalizeToolName("org.example.Editor.desktop"), "org.example.Editor");
});
