#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ANGEL_CLUB_RESOURCES_URL,
  RESEARCH_DIR,
  ROOT,
  parseArgs,
  positiveInteger,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const minimumProfiles = positiveInteger(args.min, 0);

const index = JSON.parse(
  await readFile(resolve(ROOT, "web/public/data/builders-index.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(resolve(ROOT, "web/public/data/atlas-manifest.json"), "utf8"),
);
const catalog = JSON.parse(
  await readFile(resolve(RESEARCH_DIR, "tool-catalog.json"), "utf8"),
);
const toolByName = new Map(
  catalog.tools.map((tool) => [tool.name.toLowerCase(), tool]),
);
const files = (await readdir(resolve(ROOT, "web/public/data/builders"))).filter(
  (name) => name.endsWith(".json"),
);
const slugs = new Set();
let claimCount = 0;
let sourceCount = 0;
let handVerifiedProfileCount = 0;
let automatedProfileCount = 0;

for (const file of files) {
  const profile = JSON.parse(
    await readFile(resolve(ROOT, "web/public/data/builders", file), "utf8"),
  );
  if (slugs.has(profile.slug)) throw new Error(`Duplicate slug ${profile.slug}.`);
  slugs.add(profile.slug);
  const tools = profile.tools.flatMap((group) => group.tools);
  claimCount += tools.length;
  sourceCount += new Set(tools.map((tool) => tool.evidence.url)).size;
  if (profile.count !== tools.length) {
    throw new Error(`${profile.slug}: incorrect claim count.`);
  }
  if (!profile.roleEvidence?.url) {
    throw new Error(`${profile.slug}: missing role evidence.`);
  }
  if (
    !["hand-verified", "automated-public-mention"].includes(
      profile.evidenceMode,
    )
  ) {
    throw new Error(`${profile.slug}: invalid evidence mode.`);
  }
  if (profile.evidenceMode === "hand-verified") {
    handVerifiedProfileCount += 1;
  } else {
    automatedProfileCount += 1;
    if (profile.roleEvidence.url !== ANGEL_CLUB_RESOURCES_URL) {
      throw new Error(`${profile.slug}: automated role source is not Angel Club.`);
    }
    if (
      /\bangel group\b/i.test(profile.roleEvidence.investorType || "") ||
      /\b(?:capital|ventures?|partners?|fund|network|syndicate|collective|angels?|club|labs|investments?|company|inc|llc)\b/i.test(
        profile.name,
      )
    ) {
      throw new Error(`${profile.slug}: automated profile is not an individual.`);
    }
  }
  if (!/^https:\/\//.test(profile.roleEvidence.url)) {
    throw new Error(`${profile.slug}: invalid role evidence URL.`);
  }
  for (const tool of tools) {
    const catalogTool = toolByName.get(tool.name.toLowerCase());
    if (!catalogTool) {
      throw new Error(`${profile.slug}/${tool.name}: tool is not in catalog.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tool.evidence?.date || "")) {
      throw new Error(`${profile.slug}/${tool.name}: invalid evidence date.`);
    }
    if (
      catalogTool.since &&
      tool.evidence.date < catalogTool.since
    ) {
      throw new Error(
        `${profile.slug}/${tool.name}: evidence predates product availability.`,
      );
    }
    if (
      profile.evidenceMode === "automated-public-mention" &&
      tool.evidence?.label !== "PUBLIC MENTION"
    ) {
      throw new Error(
        `${profile.slug}/${tool.name}: automated claim is too strong.`,
      );
    }
    if (
      profile.evidenceMode === "automated-public-mention" &&
      catalogTool.name === "Python"
    ) {
      throw new Error(
        `${profile.slug}/${tool.name}: ambiguous historical match is public.`,
      );
    }
    if (!/^https:\/\/x\.com\/[^/]+\/status\/\d+$/.test(tool.evidence?.url)) {
      throw new Error(`${profile.slug}/${tool.name}: invalid evidence URL.`);
    }
    const evidenceHandle = new URL(tool.evidence.url).pathname.split("/")[1];
    if (
      profile.xHandle &&
      evidenceHandle.toLowerCase() !== profile.xHandle.slice(1).toLowerCase()
    ) {
      throw new Error(
        `${profile.slug}/${tool.name}: evidence author mismatch.`,
      );
    }
  }
}

if (index.profileCount !== files.length || index.profiles.length !== files.length) {
  throw new Error("Index count does not match profile files.");
}
if (manifest.profileCount !== files.length) {
  throw new Error("Manifest count does not match profile files.");
}
if (manifest.claimCount !== claimCount || manifest.sourceCount !== sourceCount) {
  throw new Error("Manifest evidence totals do not match profile files.");
}
if (
  manifest.handVerifiedProfileCount !== handVerifiedProfileCount ||
  manifest.automatedProfileCount !== automatedProfileCount
) {
  throw new Error("Manifest evidence-mode totals do not match profile files.");
}
if (!slugs.has("naval-ravikant")) {
  throw new Error("Naval Ravikant validation profile is missing.");
}
if (files.length < minimumProfiles) {
  throw new Error(
    `Atlas has ${files.length} profiles; required minimum is ${minimumProfiles}.`,
  );
}
process.stdout.write(
  `Validated ${files.length} profiles, ${claimCount} claims, ${sourceCount} sources.\n`,
);
