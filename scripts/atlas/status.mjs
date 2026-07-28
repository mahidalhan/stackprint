#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RESEARCH_DIR, ROOT, parseArgs } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const candidates = JSON.parse(
  await readFile(resolve(RESEARCH_DIR, "candidates.json"), "utf8").catch(
    () => '{"candidates":[]}',
  ),
);
const evidence = (await readFile(
  resolve(RESEARCH_DIR, "evidence.ndjson"),
  "utf8",
).catch(() => ""))
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const manifest = JSON.parse(
  await readFile(
    resolve(ROOT, "web/public/data/atlas-manifest.json"),
    "utf8",
  ).catch(() => '{"profileCount":0,"claimCount":0,"sourceCount":0}'),
);
const target = 1_000;
const status = {
  targetProfiles: target,
  candidateCount: candidates.candidates.length,
  rejectedAmbiguousIdentityCount:
    candidates.rejectedAmbiguousIdentityCount || 0,
  searchCheckedCount: evidence.filter((record) => record.searchChecked).length,
  retainedEvidenceCount: evidence.filter((record) => record.claims?.length)
    .length,
  builtProfileCount: manifest.profileCount || 0,
  claimCount: manifest.claimCount || 0,
  sourceCount: manifest.sourceCount || 0,
  remainingProfiles: Math.max(target - (manifest.profileCount || 0), 0),
};

if (args.json) {
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
} else {
  process.stdout.write(
    [
      `Candidates: ${status.candidateCount}`,
      `Search-checked: ${status.searchCheckedCount}`,
      `Retained evidence: ${status.retainedEvidenceCount}`,
      `Built profiles: ${status.builtProfileCount}/${target}`,
      `Claims: ${status.claimCount}`,
      `Source posts: ${status.sourceCount}`,
      `Remaining profiles: ${status.remainingProfiles}`,
    ].join("\n") + "\n",
  );
}
