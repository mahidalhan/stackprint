#!/usr/bin/env node
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  CACHE_DIR,
  RESEARCH_DIR,
  mapWithConcurrency,
  parseArgs,
  positiveInteger,
  readJson,
  runBirdJson,
  writeJson,
} from "./lib.mjs";
import {
  buildToolMatchers,
  claimsFromTweets,
} from "./evidence-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const requestedLimit = positiveInteger(args.limit, Number.MAX_SAFE_INTEGER);
const pages = positiveInteger(args.pages, 4);
const concurrency = positiveInteger(args.concurrency, 2);
const refresh = args.refresh === true;
const reclassify = args.reclassify === true;
const candidates = await readJson(resolve(RESEARCH_DIR, "candidates.json"));
const catalog = await readJson(resolve(RESEARCH_DIR, "tool-catalog.json"));
const outputPath = resolve(RESEARCH_DIR, "evidence.ndjson");
const selectedCandidates = candidates.candidates.slice(0, requestedLimit);
const existingLines = refresh || reclassify
  ? []
  : (await readFile(outputPath, "utf8").catch(() => ""))
      .split("\n")
      .filter(Boolean);
const existing = new Map(
  existingLines.map((line) => {
    const record = JSON.parse(line);
    return [record.slug, record];
  }),
);

const toolMatchers = buildToolMatchers(catalog);

async function collect(candidate) {
  if (!refresh && existing.has(candidate.slug) && !existing.get(candidate.slug).error) {
    process.stdout.write(`${candidate.slug}: cached\n`);
    return existing.get(candidate.slug);
  }
  const cachePath = resolve(CACHE_DIR, "timelines", `${candidate.slug}.json`);
  let tweets = [];
  if (!refresh) {
    const cached = await readFile(cachePath, "utf8").catch(() => "");
    if (cached) tweets = JSON.parse(cached);
  }
  if (!tweets.length) {
    const payload = await runBirdJson(
      [
        "user-tweets",
        candidate.xHandle.slice(1),
        "-n",
        "100",
        "--max-pages",
        String(pages),
      ],
      { timeoutMs: 240_000 },
    );
    tweets = Array.isArray(payload) ? payload : payload.tweets || [];
    await writeJson(cachePath, tweets);
  }
  const claims = claimsFromTweets(candidate, tweets, toolMatchers);
  const record = {
    schemaVersion: "1.0",
    ...candidate,
    evidenceCheckedAt: new Date().toISOString(),
    timelinePostCount: tweets.length,
    claims,
  };
  process.stdout.write(`${candidate.slug}: ${claims.length} claims\n`);
  return record;
}

if (refresh || reclassify) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, "");
}

const records = await mapWithConcurrency(
  selectedCandidates,
  concurrency,
  async (candidate) => {
    try {
      return await collect(candidate);
    } catch (error) {
      process.stderr.write(`${candidate.slug}: ${error.message}\n`);
      return {
        schemaVersion: "1.0",
        ...candidate,
        evidenceCheckedAt: new Date().toISOString(),
        error: error.message,
        claims: [],
      };
    }
  },
);

const newRecords = records.filter(
  (record) =>
    refresh || !existing.has(record.slug) || existing.get(record.slug).error,
);
if (newRecords.length) {
  await appendFile(
    outputPath,
    `${newRecords.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
}
const retained = records.filter((record) => record.claims.length > 0).length;
process.stdout.write(
  `Evidence complete: ${records.length} checked, ${retained} with at least one claim.\n`,
);
