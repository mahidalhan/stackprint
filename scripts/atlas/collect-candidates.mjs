#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ANGEL_CLUB_RESOURCES_URL,
  CACHE_DIR,
  RESEARCH_DIR,
  cachedAngelRows,
  mapWithConcurrency,
  normalizePersonName,
  parseArgs,
  positiveInteger,
  readJson,
  runBirdJson,
  slugify,
  writeJson,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const pageCount = positiveInteger(args.pages, 10);
const perPage = positiveInteger(args["per-page"], 50);
const concurrency = positiveInteger(args.concurrency, 2);
const requestedLimit = positiveInteger(args.limit, 1_500);
const expansionCount = positiveInteger(args.expand, 0);
const refresh = args.refresh === true;
const seedConfig = await readJson(resolve(RESEARCH_DIR, "seeds.json"));
const angelRows = await cachedAngelRows({ refresh });
const angelByName = new Map();
const isAngel = (candidate) =>
  /\bangel\b/i.test(candidate.roleEvidence?.investorType || "");
const candidateSort = (left, right) =>
  Number(isAngel(right)) - Number(isAngel(left)) ||
  right.discoveredVia.length - left.discoveredVia.length ||
  left.name.localeCompare(right.name);

for (const row of angelRows) {
  const key = normalizePersonName(row.Name);
  if (!angelByName.has(key)) angelByName.set(key, []);
  angelByName.get(key).push(row);
}

async function resolveSeed(handle) {
  const path = resolve(CACHE_DIR, "seeds", `${handle.toLowerCase()}.json`);
  if (!refresh) {
    const cached = await readFile(path, "utf8").catch(() => "");
    if (cached) return JSON.parse(cached);
  }
  const tweets = await runBirdJson([
    "search",
    `from:${handle}`,
    "-n",
    "1",
    "--json-full",
  ]);
  const seed = {
    handle,
    userId: tweets[0]?.authorId || "",
    name: tweets[0]?.author?.name || "",
  };
  if (!seed.userId) throw new Error(`Could not resolve X user ID for @${handle}.`);
  await writeJson(path, seed);
  return seed;
}

async function followingFor(seed) {
  const path = resolve(CACHE_DIR, "following", `${seed.handle.toLowerCase()}.json`);
  if (!refresh) {
    const cached = await readFile(path, "utf8").catch(() => "");
    if (cached) {
      const payload = JSON.parse(cached);
      return Array.isArray(payload) ? payload : payload.users || [];
    }
  }
  const payload = await runBirdJson(
    [
      "following",
      "--user",
      seed.userId,
      "-n",
      String(perPage),
      "--all",
      "--max-pages",
      String(pageCount),
    ],
    { timeoutMs: 240_000 },
  );
  await writeJson(path, payload);
  return Array.isArray(payload) ? payload : payload.users || [];
}

const seeds = await mapWithConcurrency(
  seedConfig.seeds,
  concurrency,
  async (handle) => {
    try {
      const seed = await resolveSeed(handle);
      const following = await followingFor(seed);
      process.stdout.write(`@${handle}: ${following.length} followed accounts\n`);
      return { ...seed, following };
    } catch (error) {
      process.stderr.write(`@${handle}: ${error.message}\n`);
      return { handle, error: error.message, following: [] };
    }
  },
);

const candidatesByHandle = new Map();
let successfulExpansionSeedCount = 0;
function addFollowing(seed, accounts) {
  for (const account of accounts) {
    const normalizedName = normalizePersonName(account.name);
    const matches = angelByName.get(normalizedName) || [];
    if (matches.length !== 1) continue;
    const key = account.username.toLowerCase();
    const row = matches[0];
    const existing = candidatesByHandle.get(key);
    const discoveredVia = [
      ...(existing?.discoveredVia || []),
      `@${seed.handle}`,
    ];
    candidatesByHandle.set(key, {
      slug: slugify(row.Name),
      name: row.Name,
      xHandle: `@${account.username}`,
      xUserId: account.id,
      exactNameMatch: true,
      discoveredVia: [...new Set(discoveredVia)],
      roleEvidence: {
        label: "PUBLIC INVESTOR INDEX",
        url: ANGEL_CLUB_RESOURCES_URL,
        sourceUrl: row["Source URL"] || "",
        indexUrl: ANGEL_CLUB_RESOURCES_URL,
        source: "Angel Club public investor index",
        checkedAt: row["Last Verified"],
        verificationStatus: row["Verification Status"],
        investorType: row["Type of Investor"],
      },
    });
  }
}

for (const seed of seeds) addFollowing(seed, seed.following);

if (expansionCount > 0) {
  const expansionSeeds = [...candidatesByHandle.values()]
    .sort(candidateSort)
    .slice(0, expansionCount);
  let consecutiveExpansionFailures = 0;
  let expansionPaused = false;
  const expansions = await mapWithConcurrency(
    expansionSeeds,
    concurrency,
    async (candidate) => {
      const seed = {
        handle: candidate.xHandle.slice(1),
        userId: candidate.xUserId,
      };
      if (expansionPaused) return { ...seed, following: [], paused: true };
      try {
        const following = await followingFor(seed);
        consecutiveExpansionFailures = 0;
        process.stdout.write(
          `expand @${seed.handle}: ${following.length} followed accounts\n`,
        );
        return { ...seed, following };
      } catch (error) {
        consecutiveExpansionFailures += 1;
        process.stderr.write(`expand @${seed.handle}: ${error.message}\n`);
        if (consecutiveExpansionFailures >= 6) {
          expansionPaused = true;
          process.stderr.write(
            "Expansion paused after repeated Bird failures; rerun to resume from cached graphs.\n",
          );
        }
        return { ...seed, following: [], error: error.message };
      }
    },
  );
  successfulExpansionSeedCount = expansions.filter(
    (seed) => !seed.error && !seed.paused,
  ).length;
  for (const seed of expansions) addFollowing(seed, seed.following);
}

const identityGroups = new Map();
for (const candidate of candidatesByHandle.values()) {
  if (!identityGroups.has(candidate.slug)) {
    identityGroups.set(candidate.slug, []);
  }
  identityGroups.get(candidate.slug).push(candidate);
}
const ambiguousIdentities = [...identityGroups.values()]
  .filter((group) => group.length > 1)
  .map((group) => ({
    name: group[0].name,
    handles: group.map((candidate) => candidate.xHandle).sort(),
  }));
const candidates = [...identityGroups.values()]
  .filter((group) => group.length === 1)
  .map((group) => group[0])
  .sort(candidateSort)
  .slice(0, requestedLimit);

const output = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  method:
    "Exact normalized display-name joins between Bird CLI following graphs and the Angel Club public investor index.",
  source: {
    name: "Angel Club public investor index",
    url: ANGEL_CLUB_RESOURCES_URL,
    eligibleRows: angelRows.length,
  },
  seedCount: seeds.length,
  expansionSeedCount: expansionCount,
  successfulExpansionSeedCount,
  candidateCount: candidates.length,
  rejectedAmbiguousIdentityCount: ambiguousIdentities.length,
  ambiguousIdentities,
  failedSeeds: seeds
    .filter((seed) => seed.error)
    .map(({ handle, error }) => ({ handle, error })),
  candidates,
};

await writeJson(resolve(RESEARCH_DIR, "candidates.json"), output);
process.stdout.write(`Wrote ${candidates.length} exact-match candidates.\n`);
if (candidates.length < requestedLimit) {
  process.stderr.write(
    `Only ${candidates.length}/${requestedLimit} candidates met the strict join. Add seeds or pages before relaxing identity matching.\n`,
  );
}
