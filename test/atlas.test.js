import assert from "node:assert/strict";
import test from "node:test";
import {
  angelRowsFromCsv,
  normalizePersonName,
  parseCsv,
  slugify,
} from "../scripts/atlas/lib.mjs";

test("atlas CSV parser preserves quoted commas and escaped quotes", () => {
  assert.deepEqual(parseCsv('"Name","Note"\n"Naval","A, ""quoted"" note"\n'), [
    ["Name", "Note"],
    ["Naval", 'A, "quoted" note'],
  ]);
});

test("angel eligibility parser ignores non-data preamble and non-listed rows", () => {
  const csv = [
    '"ANGEL CLUB",""',
    '"Name","Type of Investor","Verification Status","Source URL"',
    '"Naval Ravikant","Angel Investor","Listed","https://example.com/naval"',
    '"(no contact)","Angel Investor","Listed","https://example.com/placeholder"',
    '"Person Two","Founder","Listed","https://example.com/two"',
    '"Person Three","Investor","Removed","https://example.com/three"',
  ].join("\n");
  assert.deepEqual(
    angelRowsFromCsv(csv).map((row) => row.Name),
    ["Naval Ravikant"],
  );
});

test("angel eligibility excludes organizations from the people atlas", () => {
  const csv = [
    "Name,Type of Investor,Verification Status",
    "Ada Lovelace,Angel Investor,Listed",
    "Example Angel Network,Angel Group,Listed",
    "Example Capital,Venture Fund,Listed",
  ].join("\n");
  assert.deepEqual(
    angelRowsFromCsv(csv).map((row) => row.Name),
    ["Ada Lovelace"],
  );
});

test("identity normalization is strict but accent insensitive", () => {
  assert.equal(normalizePersonName("  José  López (Investor) "), "jose lopez");
  assert.equal(slugify("Naval Ravikant"), "naval-ravikant");
});
