#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  CACHE_DIR,
  RESEARCH_DIR,
  parseArgs,
  positiveInteger,
  readJson,
  runBirdJson,
  writeJson,
} from "./lib.mjs";
import {
  buildToolMatchers,
  claimsFromTweets,
  mergeClaims,
} from "./evidence-lib.mjs";

const SEARCH_TERMS = [
  "ChatGPT",
  "Claude",
  "Codex",
  "Gemini",
  "Grok",
  "Perplexity",
  "Cursor",
  "Replit",
  "GitHub",
  "Figma",
  "Notion",
  "Slack",
  "Zoom",
  "Superhuman",
  "Gmail",
  '"Google Docs"',
  "WhatsApp",
  "Discord",
  "Substack",
  "Shopify",
  "Stripe",
  "AngelList",
  "Vercel",
  "Docker",
  "Python",
  '"Product Hunt"',
  "LinkedIn",
  "Airtable",
  "Canva",
  "Webflow",
];

const args = parseArgs(process.argv.slice(2));
const requestedLimit = positiveInteger(args.limit, Number.MAX_SAFE_INTEGER);
const batchSize = positiveInteger(args.batch, 6);
const pages = positiveInteger(args.pages, 1);
const candidatesPayload = await readJson(resolve(RESEARCH_DIR, "candidates.json"));
const catalog = await readJson(resolve(RESEARCH_DIR, "tool-catalog.json"));
const toolMatchers = buildToolMatchers(catalog);
const candidates = candidatesPayload.candidates.slice(0, requestedLimit);
const evidencePath = resolve(RESEARCH_DIR, "evidence.ndjson");
const existingRecords = (await readFile(evidencePath, "utf8").catch(() => ""))
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const recordBySlug = new Map(existingRecords.map((record) => [record.slug, record]));
const workCandidates = args["empty-only"]
  ? candidates.filter(
      (candidate) => !(recordBySlug.get(candidate.slug)?.claims || []).length,
    )
  : args.recheck
    ? candidates
    : candidates.filter(
        (candidate) =>
          recordBySlug.get(candidate.slug)?.searchChecked !== true,
      );
const candidateByHandle = new Map(
  candidates.map((candidate) => [
    candidate.xHandle.slice(1).toLowerCase(),
    candidate,
  ]),
);
let consecutiveFailures = 0;

function queryFor(batch) {
  const authors = batch
    .map((candidate) => `from:${candidate.xHandle.slice(1)}`)
    .join(" OR ");
  let terms = [];
  for (const term of SEARCH_TERMS) {
    const candidateTerms = [...terms, term];
    const query = `(${authors}) (${candidateTerms.join(" OR ")})`;
    if (query.length > 480) break;
    terms = candidateTerms;
  }
  return `(${authors}) (${terms.join(" OR ")})`;
}

async function tweetsFor(batch) {
  const query = queryFor(batch);
  const hash = createHash("sha256")
    .update(`${query}\npages=${pages}`)
    .digest("hex")
    .slice(0, 16);
  const cachePath = resolve(CACHE_DIR, "search", `${hash}.json`);
  const cached = await readFile(cachePath, "utf8").catch(() => "");
  if (cached) return JSON.parse(cached);
  const command = ["search", query, "-n", "100"];
  if (pages > 1) {
    command.push("--all", "--max-pages", String(pages));
  }
  const payload = await runBirdJson(command, { timeoutMs: 240_000 });
  const tweets = Array.isArray(payload) ? payload : payload.tweets || [];
  await writeJson(cachePath, tweets);
  return tweets;
}

for (let offset = 0; offset < workCandidates.length; offset += batchSize) {
  const batch = workCandidates.slice(offset, offset + batchSize);
  try {
    const tweets = await tweetsFor(batch);
    consecutiveFailures = 0;
    const tweetsByHandle = new Map();
    for (const tweet of tweets) {
      const handle = tweet.author?.username?.toLowerCase();
      if (!candidateByHandle.has(handle)) continue;
      if (!tweetsByHandle.has(handle)) tweetsByHandle.set(handle, []);
      tweetsByHandle.get(handle).push(tweet);
    }
    for (const candidate of batch) {
      const handle = candidate.xHandle.slice(1).toLowerCase();
      const current = recordBySlug.get(candidate.slug);
      const claims = claimsFromTweets(
        candidate,
        tweetsByHandle.get(handle) || [],
        toolMatchers,
      );
      recordBySlug.set(candidate.slug, {
        schemaVersion: "1.0",
        ...candidate,
        evidenceCheckedAt: new Date().toISOString(),
        searchChecked: true,
        searchPostCount: (tweetsByHandle.get(handle) || []).length,
        claims: mergeClaims(current?.claims || [], claims),
      });
    }
    const retained = batch.filter(
      (candidate) => recordBySlug.get(candidate.slug)?.claims.length,
    ).length;
    process.stdout.write(
      `${Math.min(offset + batch.length, workCandidates.length)}/${workCandidates.length} pending: ${tweets.length} posts, ${retained}/${batch.length} retained\n`,
    );
  } catch (error) {
    consecutiveFailures += 1;
    process.stderr.write(
      `${offset + 1}-${offset + batch.length}: ${error.message}\n`,
    );
    if (consecutiveFailures >= 3) {
      process.stderr.write(
        "Paused after three consecutive Bird failures; rerun to resume from cached batches.\n",
      );
      break;
    }
  }
}

const ordered = candidates.map((candidate) => {
  const current = recordBySlug.get(candidate.slug);
  return current
    ? {
        ...current,
        ...candidate,
        claims: current.claims || [],
      }
    : {
      schemaVersion: "1.0",
      ...candidate,
      evidenceCheckedAt: new Date().toISOString(),
      searchChecked: false,
      claims: [],
    };
});
await mkdir(dirname(evidencePath), { recursive: true });
await writeFile(
  evidencePath,
  `${ordered.map((record) => JSON.stringify(record)).join("\n")}\n`,
);
const retained = ordered.filter((record) => record.claims.length).length;
const checked = ordered.filter((record) => record.searchChecked).length;
process.stdout.write(
  `Search evidence checkpoint: ${ordered.length} candidates, ${checked} search-checked, ${retained} with at least one claim.\n`,
);
