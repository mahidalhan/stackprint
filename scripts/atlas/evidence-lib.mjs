import { isoDate, uniqueBy } from "./lib.mjs";

export const CLAIM_PRIORITY = [
  "SELF-REPORTED USE",
  "BUILT WITH",
  "PUBLIC PROJECT",
  "PUBLIC RECOMMENDATION",
  "PUBLIC DISCUSSION",
];

function aliasRegex(alias) {
  return new RegExp(
    `(?:^|[^a-z0-9])${alias
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replaceAll("\\ ", "\\s+")}(?:$|[^a-z0-9])`,
    "i",
  );
}

export function buildToolMatchers(catalog) {
  return catalog.tools.map((tool) => ({
    ...tool,
    matchers: tool.aliases.map(aliasRegex),
  }));
}

export function isToolAvailableOnDate(tool, date) {
  return !tool.since || (date && date >= tool.since);
}

export function labelFor(text) {
  const opening = String(text || "").slice(0, 420);
  if (
    /(?:^|[\n.!?]\s+)(?:i|we)\s+(?:use|used|am using|are using|started using|have been using|love using|rely on|prefer|switched to|run)\b/i.test(
      opening,
    )
  ) {
    return "SELF-REPORTED USE";
  }
  if (
    /(?:^|[\n.!?]\s+)(?:i|we)\s+(?:built|made|created)\b.{0,100}\b(?:with|using|on)\b/i.test(
      opening,
    ) ||
    /(?:^|[\n.!?]\s+)(?:my|our)\b.{0,100}\b(?:is|was|are|were)\s+(?:built|made|powered)\s+(?:with|by|using|on)\b/i.test(
      opening,
    )
  ) {
    return "BUILT WITH";
  }
  if (
    /(?:^|[\n.!?]\s+)(?:i|we)\s+(?:founded|co-founded|launched|maintain|am building|are building|built)\b/i.test(
      opening,
    )
  ) {
    return "PUBLIC PROJECT";
  }
  if (
    /(?:^|[\n.!?]\s+)(?:i|we)\s+(?:recommend|recommended)\b/i.test(opening) ||
    /(?:^|[\n.!?]\s+)(?:try|check out)\b/i.test(opening)
  ) {
    return "PUBLIC RECOMMENDATION";
  }
  return "PUBLIC DISCUSSION";
}

function noteFor(candidate, tool, label) {
  const name = candidate.name.split(/\s+/)[0];
  const templates = {
    "SELF-REPORTED USE": `${name} explicitly described using ${tool.name} in the linked public post.`,
    "BUILT WITH": `${name} explicitly connected ${tool.name} to a first-person public build in the linked post.`,
    "PUBLIC PROJECT": `${name} explicitly connected themselves to building or maintaining ${tool.name} in the linked post.`,
    "PUBLIC RECOMMENDATION": `${name} publicly recommended or invited readers to try ${tool.name} in the linked post.`,
    "PUBLIC DISCUSSION": `${name} substantively discussed ${tool.name} in the linked post; this does not establish use.`,
  };
  return templates[label];
}

export function claimsFromTweets(candidate, tweets, toolMatchers) {
  const claims = [];
  for (const tweet of tweets) {
    if (
      tweet.author?.username?.toLowerCase() !==
      candidate.xHandle.slice(1).toLowerCase()
    ) {
      continue;
    }
    for (const tool of toolMatchers) {
      const evidenceDate = isoDate(tweet.createdAt);
      if (!isToolAvailableOnDate(tool, evidenceDate)) continue;
      if (!tool.matchers.some((matcher) => matcher.test(tweet.text || ""))) continue;
      const label = labelFor(tweet.text || "");
      claims.push({
        name: tool.name,
        category: tool.category,
        kind: tool.kind,
        source: "public",
        evidence: {
          label,
          url: `https://x.com/${tweet.author.username}/status/${tweet.id}`,
          date: evidenceDate,
          note: noteFor(candidate, tool, label),
          tweetId: tweet.id,
        },
      });
    }
  }
  return uniqueBy(
    claims.sort(
      (left, right) =>
        CLAIM_PRIORITY.indexOf(left.evidence.label) -
          CLAIM_PRIORITY.indexOf(right.evidence.label) ||
        right.evidence.date.localeCompare(left.evidence.date),
    ),
    (claim) => claim.name.toLowerCase(),
  );
}

export function mergeClaims(...claimSets) {
  return uniqueBy(
    claimSets
      .flat()
      .sort(
        (left, right) =>
          CLAIM_PRIORITY.indexOf(left.evidence.label) -
            CLAIM_PRIORITY.indexOf(right.evidence.label) ||
          right.evidence.date.localeCompare(left.evidence.date),
      ),
    (claim) => claim.name.toLowerCase(),
  );
}
