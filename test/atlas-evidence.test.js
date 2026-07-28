import assert from "node:assert/strict";
import test from "node:test";
import {
  buildToolMatchers,
  claimsFromTweets,
  isToolAvailableOnDate,
  labelFor,
} from "../scripts/atlas/evidence-lib.mjs";

test("automatic evidence labels require first-person author language", () => {
  assert.equal(
    labelFor("I use Claude every day for research."),
    "SELF-REPORTED USE",
  );
  assert.equal(
    labelFor("Dianne uses Claude and her team built Claude Code."),
    "PUBLIC DISCUSSION",
  );
  assert.equal(
    labelFor("We built this with Replit over the weekend."),
    "BUILT WITH",
  );
});

test("ambiguous recommendations stay public discussion", () => {
  assert.equal(
    labelFor("A friend recommended Cursor to me."),
    "PUBLIC DISCUSSION",
  );
  assert.equal(labelFor("Try Figma for this workflow."), "PUBLIC RECOMMENDATION");
});

test("tool availability floors reject impossible historical matches", () => {
  assert.equal(
    isToolAvailableOnDate({ name: "Gemini", since: "2023-12-06" }, "2010-01-01"),
    false,
  );
  assert.equal(
    isToolAvailableOnDate({ name: "Gemini", since: "2023-12-06" }, "2024-01-01"),
    true,
  );
});

test("contextual Python aliases avoid ordinary-language collisions", () => {
  const candidate = { name: "Ada Lovelace", xHandle: "@ada" };
  const matchers = buildToolMatchers({
    tools: [
      {
        name: "Python",
        category: "Build",
        kind: "cli",
        aliases: ["Python programming", "Python code"],
      },
    ],
  });
  const tweets = [
    {
      id: "1",
      text: "A python crossed the road.",
      createdAt: "2024-01-01T00:00:00.000Z",
      author: { username: "ada" },
    },
    {
      id: "2",
      text: "I use Python code for this analysis.",
      createdAt: "2024-01-02T00:00:00.000Z",
      author: { username: "ada" },
    },
  ];
  const claims = claimsFromTweets(candidate, tweets, matchers);
  assert.equal(claims.length, 1);
  assert.equal(claims[0].name, "Python");
  assert.equal(claims[0].evidence.url, "https://x.com/ada/status/2");
});
