import { deriveBuilderSignals, groupByCategory } from "./profile.js";

export const DEFAULT_PUBLIC_SITE = "https://stackprint-builder.vercel.app";

export function buildPublishRequest(profile, identity) {
  if (!profile || typeof profile !== "object") {
    throw new Error("That file is not a Stackprint profile.");
  }
  const apps = Array.isArray(profile.apps) ? profile.apps : [];
  const cli = Array.isArray(profile.cli) ? profile.cli : [];
  if (!profile.summary || apps.length + cli.length === 0) {
    throw new Error("No detected Stackprint tools were found in this file.");
  }

  const grouped = new Map();
  for (const item of [...apps, ...cli]) {
    const category = titleCase(item.category || "other");
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({
      name: String(item.name || item.command || "Unknown tool"),
      kind: item.kind === "cli" || cli.includes(item) ? "cli" : "app",
      source: "detected",
    });
  }

  return {
    consent: { public: true },
    identity: {
      name: requiredIdentity(identity.name, "name"),
      handle: requiredIdentity(identity.handle, "handle"),
      role: String(identity.role || "Builder").trim(),
      xHandle: String(identity.xHandle || "").trim(),
    },
    tools: [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, tools]) => ({
        name,
        tools: tools.sort((left, right) => left.name.localeCompare(right.name)),
      })),
    signals: deriveBuilderSignals(groupByCategory([...apps, ...cli])).slice(0, 4),
    generatedAt: profile.generated_at || "",
    scanMode: profile.privacy?.scan_mode || "standard",
  };
}

export function formatPublishPreview(payload, site = DEFAULT_PUBLIC_SITE) {
  const tools = payload.tools.flatMap((group) => group.tools);
  return [
    "Stackprint public profile preview",
    `  Destination: ${site}`,
    `  Builder: ${payload.identity.name} (${payload.identity.handle})`,
    `  Role: ${payload.identity.role || "Builder"}`,
    `  Tool names: ${tools.length}`,
    `  Categories: ${payload.tools.length}`,
    "  Sent: selected tool names, kinds, categories, builder identity, signals",
    "  Not sent: system metadata, paths, histories, files, credentials, activity",
    "",
    "Review the JSON artifact before publishing. Re-run this command with --yes",
    "only when the destination and current profile are approved.",
    "",
  ].join("\n");
}

export async function publishBuilderProfile(
  payload,
  site = DEFAULT_PUBLIC_SITE,
  { fetchImpl = fetch } = {},
) {
  const base = validateSite(site);
  const response = await fetchImpl(new URL("/api/profiles", base), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "stackprint-cli",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      result.message ||
        `Publish failed with HTTP ${response.status}. Try again later.`,
    );
  }
  return result;
}

function validateSite(site) {
  const url = new URL(site);
  const local =
    url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Publish destination must use HTTPS.");
  }
  return url;
}

function requiredIdentity(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`Publish requires --${label} <value>.`);
  return text;
}

function titleCase(value) {
  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
