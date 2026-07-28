import assert from "node:assert/strict";
import test from "node:test";
import {
  getAtlasProfile,
  listAtlasProfiles,
} from "../src/atlas.js";

test("listAtlasProfiles marks compact summaries for lazy loading", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      profiles: [{ slug: "naval-ravikant", name: "Naval Ravikant" }],
    }),
  });
  try {
    const profiles = await listAtlasProfiles();
    assert.equal(profiles[0].generated, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAtlasProfile uses a bounded profile path and handles missing profiles", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: false, status: 404 };
  };
  try {
    assert.equal(await getAtlasProfile("naval/ravikant"), null);
    assert.equal(calls[0], "/data/builders/naval%2Fravikant.json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
