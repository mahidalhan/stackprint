#!/usr/bin/env node
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import {
  RESEARCH_DIR,
  ROOT,
  monogramFor,
  parseArgs,
  positiveInteger,
  readJson,
  uniqueBy,
  writeCompactJson,
} from "./lib.mjs";

const LABELS = new Set([
  "SELF-REPORTED USE",
  "BUILT WITH",
  "PUBLIC PROJECT",
  "PUBLIC RECOMMENDATION",
  "PUBLIC DISCUSSION",
  "PUBLIC MENTION",
]);
const RESERVED_STATIC_SLUGS = new Set([
  "mahidalhan",
  "gokul-rajaram",
  "sam-altman",
  "farza",
]);
const args = parseArgs(process.argv.slice(2));
const requestedLimit = positiveInteger(args.limit, 1_000);
const profilesDir = resolve(ROOT, "web/public/data/builders");
const indexPath = resolve(ROOT, "web/public/data/builders-index.json");
const manifestPath = resolve(ROOT, "web/public/data/atlas-manifest.json");
const evidenceLines = (await readFile(
  resolve(RESEARCH_DIR, "evidence.ndjson"),
  "utf8",
).catch(() => ""))
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const toolCatalog = await readJson(
  resolve(RESEARCH_DIR, "tool-catalog.json"),
);
const toolByName = new Map(
  toolCatalog.tools.map((tool) => [tool.name.toLowerCase(), tool]),
);
const manualDir = resolve(RESEARCH_DIR, "profiles");
const manualProfiles = await Promise.all(
  (await readdir(manualDir).catch(() => []))
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(resolve(manualDir, name))),
);

function groupsFromClaims(claims) {
  const groups = new Map();
  for (const claim of claims) {
    if (!groups.has(claim.category)) groups.set(claim.category, []);
    groups.get(claim.category).push({
      name: claim.name,
      kind: claim.kind,
      source: "public",
      evidence: {
        label: claim.evidence.label,
        url: claim.evidence.url,
        date: claim.evidence.date,
        note: claim.evidence.note,
      },
    });
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, tools]) => ({
      name,
      tools: tools.sort((left, right) => left.name.localeCompare(right.name)),
    }));
}

function generatedProfile(record, index) {
  const publicClaims = record.claims.map((claim) => ({
    ...claim,
    evidence: {
      ...claim.evidence,
      label: "PUBLIC MENTION",
      note: `${
        record.name.split(/\s+/)[0]
      } publicly mentioned ${claim.name} in the linked post; this does not establish use.`,
    },
  }));
  const tools = groupsFromClaims(publicClaims);
  const sourceCount = new Set(
    publicClaims.map((claim) => claim.evidence.url),
  ).size;
  const labels = new Set(publicClaims.map((claim) => claim.evidence.label));
  return {
    schemaVersion: "1.0",
    slug: record.slug,
    name: record.name,
    handle: record.xHandle,
    xHandle: record.xHandle,
    xUrl: `https://x.com/${record.xHandle.slice(1)}`,
    role: /\bangel\b/i.test(record.roleEvidence.investorType || "")
      ? "Angel investor"
      : "Investor",
    roleEvidence: record.roleEvidence,
    count: publicClaims.length,
    categories: tools.length,
    evidenceCount: sourceCount,
    evidenceUpdatedAt: record.evidenceCheckedAt.slice(0, 10),
    tags: uniqueBy(
      [
        "Investing",
        ...publicClaims.map((claim) => {
          if (claim.category === "AI & agents") return "AI";
          if (claim.category === "Data") return "Data";
          if (claim.category === "Design") return "Design";
          if (["Build", "Infrastructure"].includes(claim.category)) {
            return "Developer tools";
          }
          return "Investing";
        }),
      ],
      (value) => value,
    ),
    monogram: monogramFor(record.name),
    motif: ["ring", "split", "circle", "diamond", "peak"][index % 5],
    curated: true,
    evidenceMode: "automated-public-mention",
    tools,
    signals: [
      `${publicClaims.length} bounded public tool ${
        publicClaims.length === 1 ? "claim" : "claims"
      }`,
      `${sourceCount} claim-level X ${
        sourceCount === 1 ? "source" : "sources"
      }`,
      labels.has("SELF-REPORTED USE")
        ? "Contains explicit self-reported use"
        : "No claim of current use",
    ],
  };
}

function isPublishableClaim(claim) {
  const tool = toolByName.get(String(claim.name || "").toLowerCase());
  if (!tool) return false;
  if (tool.name === "Python") {
    // Older cached term searches matched the animal and unrelated proper
    // nouns. New collection uses contextual aliases, but historical matches
    // cannot be revalidated because raw post text is intentionally not
    // retained in the public record.
    return false;
  }
  return !tool.since || claim.evidence?.date >= tool.since;
}

function validateProfile(profile) {
  if (!profile.slug || !profile.name || !profile.roleEvidence?.url) {
    throw new Error(`${profile.slug || profile.name}: missing identity evidence.`);
  }
  if (
    !["hand-verified", "automated-public-mention"].includes(
      profile.evidenceMode,
    )
  ) {
    throw new Error(`${profile.slug}: invalid evidence mode.`);
  }
  if (!/^https:\/\//.test(profile.roleEvidence.url)) {
    throw new Error(`${profile.slug}: role evidence must use HTTPS.`);
  }
  if (
    profile.roleEvidence.investorType &&
    !/\b(angel|investor|venture|fund)\b/i.test(
      profile.roleEvidence.investorType,
    )
  ) {
    throw new Error(`${profile.slug}: role evidence is not investor-related.`);
  }
  const tools = profile.tools?.flatMap((group) => group.tools) || [];
  if (!tools.length) throw new Error(`${profile.slug}: no public tool claims.`);
  const seenToolNames = new Set();
  for (const tool of tools) {
    const normalizedToolName = tool.name.toLowerCase();
    if (seenToolNames.has(normalizedToolName)) {
      throw new Error(`${profile.slug}/${tool.name}: duplicate tool claim.`);
    }
    seenToolNames.add(normalizedToolName);
    if (tool.source !== "public") {
      throw new Error(`${profile.slug}/${tool.name}: invalid source.`);
    }
    if (!LABELS.has(tool.evidence?.label)) {
      throw new Error(`${profile.slug}/${tool.name}: invalid evidence label.`);
    }
    if (
      !/^https:\/\/x\.com\/[^/]+\/status\/\d+$/.test(tool.evidence?.url || "")
    ) {
      throw new Error(`${profile.slug}/${tool.name}: invalid X evidence URL.`);
    }
    const evidenceHandle = new URL(tool.evidence.url).pathname.split("/")[1];
    if (
      profile.xHandle &&
      evidenceHandle.toLowerCase() !== profile.xHandle.slice(1).toLowerCase()
    ) {
      throw new Error(
        `${profile.slug}/${tool.name}: evidence author does not match profile.`,
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tool.evidence?.date || "")) {
      throw new Error(`${profile.slug}/${tool.name}: invalid evidence date.`);
    }
    if (!tool.evidence?.note || tool.evidence.note.length > 240) {
      throw new Error(`${profile.slug}/${tool.name}: invalid evidence note.`);
    }
  }
  if (profile.count !== tools.length) {
    throw new Error(`${profile.slug}: count does not match tool claims.`);
  }
  profile.evidenceCount = new Set(
    tools.map((tool) => tool.evidence.url),
  ).size;
  profile.categories = profile.tools.length;
  profile.toolNames = tools.map((tool) => tool.name);
  return profile;
}

const generated = evidenceLines
  .map((record) => ({
    ...record,
    claims: (record.claims || []).filter(isPublishableClaim),
  }))
  .filter(
    (record) =>
      !record.error &&
      record.claims?.length &&
      !/\bangel group\b/i.test(record.roleEvidence?.investorType || "") &&
      !/\b(?:capital|ventures?|partners?|fund|network|syndicate|collective|angels?|club|labs|investments?|company|inc|llc)\b/i.test(
        record.name,
      ) &&
      !RESERVED_STATIC_SLUGS.has(record.slug),
  )
  .map(generatedProfile);
const profiles = uniqueBy(
  [...manualProfiles, ...generated].map(validateProfile),
  (profile) => profile.slug,
).slice(0, requestedLimit);

await rm(profilesDir, { recursive: true, force: true });
await mkdir(profilesDir, { recursive: true });
for (const profile of profiles) {
  await writeCompactJson(
    resolve(profilesDir, `${profile.slug}.json`),
    profile,
  );
}

const summaries = profiles.map((profile) => ({
  slug: profile.slug,
  name: profile.name,
  handle: profile.handle,
  role: profile.role,
  count: profile.count,
  categories: profile.categories,
  evidenceCount: profile.evidenceCount,
  evidenceUpdatedAt: profile.evidenceUpdatedAt,
  tags: profile.tags,
  monogram: profile.monogram,
  motif: profile.motif,
  curated: true,
  evidenceMode: profile.evidenceMode,
  toolNames: profile.toolNames,
}));
await writeCompactJson(indexPath, {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  profileCount: summaries.length,
  profiles: summaries,
});
await writeCompactJson(manifestPath, {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  requestedProfileCount: requestedLimit,
  profileCount: profiles.length,
  claimCount: profiles.reduce((total, profile) => total + profile.count, 0),
  sourceCount: profiles.reduce(
    (total, profile) => total + profile.evidenceCount,
    0,
  ),
  handVerifiedProfileCount: profiles.filter(
    (profile) => profile.evidenceMode === "hand-verified",
  ).length,
  automatedProfileCount: profiles.filter(
    (profile) => profile.evidenceMode === "automated-public-mention",
  ).length,
  sources: [
    {
      name: "Angel Club public investor index",
      url: "https://www.angelclub.com/resources",
      purpose: "Investor eligibility",
    },
    {
      name: "X public posts read with Bird CLI",
      url: "https://x.com",
      purpose: "Tool and workflow claims",
    },
  ],
});
process.stdout.write(
  `Built ${profiles.length}/${requestedLimit} validated public profiles.\n`,
);
if (profiles.length < requestedLimit) process.exitCode = 2;
