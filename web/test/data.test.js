import assert from "node:assert/strict";
import test from "node:test";
import { BUILDERS } from "../src/data.js";

test("starter public builders are curated from claim-level evidence", () => {
  const required = new Set(["gokul-rajaram", "sam-altman", "farza"]);
  const curated = BUILDERS.filter((builder) => builder.curated);

  assert.deepEqual(
    new Set(curated.map((builder) => builder.slug)),
    required,
  );

  for (const builder of curated) {
    const tools = builder.tools.flatMap((group) => group.tools);
    const sources = new Set(tools.map((tool) => tool.evidence?.url));

    assert.equal(builder.demo, undefined);
    assert.equal(builder.count, tools.length);
    assert.equal(builder.evidenceCount, sources.size);
    assert.ok(tools.every((tool) => tool.source === "public"));
    assert.ok(
      tools.every(
        (tool) =>
          tool.evidence?.label &&
          tool.evidence?.note &&
          /^https:\/\/x\.com\/[^/]+\/status\/\d+$/.test(tool.evidence?.url),
      ),
    );
  }
});

test("fictional demo profiles are not part of the public starter atlas", () => {
  assert.equal(BUILDERS.some((builder) => builder.demo), false);
});
