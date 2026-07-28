const MAX_TOOLS = 500;
const MAX_GROUPS = 40;

export class ProfileValidationError extends Error {}

export function sanitizePublishRequest(body, { now = new Date() } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ProfileValidationError("Expected a Stackprint publish request.");
  }
  if (body.consent?.public !== true) {
    throw new ProfileValidationError("Public profile consent is required.");
  }

  const identity = body.identity || {};
  const name = requiredText(identity.name, "Name", 80);
  const handleName = normalizeHandle(identity.handle);
  const role = optionalText(identity.role, 120) || "Builder";
  const xHandleName = identity.xHandle
    ? normalizeHandle(identity.xHandle)
    : "";
  const tools = sanitizeGroups(body.tools);
  const detectedCount = tools.reduce(
    (total, group) =>
      total + group.tools.filter((tool) => tool.source !== "manual").length,
    0,
  );
  const manualCount = tools.reduce(
    (total, group) =>
      total + group.tools.filter((tool) => tool.source === "manual").length,
    0,
  );
  const signals = deriveSignalsFromTools(tools);
  const generatedAt = safeDate(body.generatedAt);

  return {
    schemaVersion: "1.0",
    name,
    handle: `@${handleName}`,
    xHandle: xHandleName ? `@${xHandleName}` : "",
    xUrl: xHandleName ? `https://x.com/${xHandleName}` : "",
    role,
    count: detectedCount + manualCount,
    detectedCount,
    manualCount,
    categories: tools.length,
    monogram: monogramFor(name),
    motif: "local",
    demo: false,
    published: true,
    publishedAt: now.toISOString(),
    generatedAt,
    scanMode:
      body.scanMode === "extended-path-metadata"
        ? "extended-path-metadata"
        : "standard",
    tools,
    toolNames: tools.flatMap((group) =>
      group.tools.map((tool) => tool.name),
    ),
    signals,
  };
}

export function makeProfileSlug(profile, randomSuffix) {
  if (
    profile.name === "Stackprint E2E" &&
    profile.handle === "@stackprint-e2e"
  ) {
    return "stackprint-e2e";
  }
  const base = profile.handle
    .slice(1)
    .replace(/[._]+/g, "-")
    .replace(/-+/g, "-");
  const suffix = String(randomSuffix || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  if (suffix.length < 4) {
    throw new ProfileValidationError("A profile suffix could not be created.");
  }
  return `${base}-${suffix}`;
}

export function isE2EProfile(profile) {
  return profile.slug === "stackprint-e2e";
}

function sanitizeGroups(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ProfileValidationError("Select at least one tool to publish.");
  }

  const groups = [];
  const seenTools = new Set();
  let totalTools = 0;

  for (const rawGroup of input.slice(0, MAX_GROUPS)) {
    const groupName = requiredText(rawGroup?.name, "Category", 60);
    const groupTools = [];

    for (const rawTool of Array.isArray(rawGroup?.tools)
      ? rawGroup.tools
      : []) {
      const name = requiredText(rawTool?.name, "Tool name", 100);
      const kind = rawTool?.kind === "cli" ? "cli" : "app";
      const source = rawTool?.source === "manual" ? "manual" : "detected";
      const key = `${kind}:${name.toLowerCase()}`;
      if (seenTools.has(key)) continue;
      seenTools.add(key);
      groupTools.push({ name, kind, source });
      totalTools += 1;
      if (totalTools > MAX_TOOLS) {
        throw new ProfileValidationError(
          `A public profile can include at most ${MAX_TOOLS} tools.`,
        );
      }
    }

    if (groupTools.length) {
      groups.push({
        name: groupName,
        tools: groupTools.sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      });
    }
  }

  if (!totalTools) {
    throw new ProfileValidationError("Select at least one tool to publish.");
  }

  return groups.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeHandle(value) {
  const handle = String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,38}$/.test(handle)) {
    throw new ProfileValidationError(
      "Handle must be 2–39 letters, numbers, dots, underscores, or hyphens.",
    );
  }
  return handle;
}

function requiredText(value, label, maxLength) {
  const text = optionalText(value, maxLength);
  if (!text) throw new ProfileValidationError(`${label} is required.`);
  return text;
}

function optionalText(value, maxLength) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function deriveSignalsFromTools(groups) {
  const counts = Object.fromEntries(
    groups.map((group) => [
      group.name.toLowerCase().replaceAll(" ", "-"),
      group.tools.length,
    ]),
  );
  const signals = [];

  if ((counts["ai-assistants"] ?? 0) > 0) signals.push("AI-assisted builder");
  if ((counts["language-runtimes"] ?? 0) >= 3) signals.push("Polyglot builder");
  if (
    (counts.cloud ?? 0) +
      (counts.containers ?? 0) +
      (counts.infrastructure ?? 0) >=
    3
  ) {
    signals.push("Cloud and infrastructure builder");
  }
  if ((counts.mobile ?? 0) >= 2) signals.push("Mobile builder");
  if ((counts.robotics ?? 0) > 0) signals.push("Robotics builder");
  if ((counts.design ?? 0) > 0) signals.push("Design-enabled builder");
  if ((counts.databases ?? 0) >= 2) signals.push("Data-oriented builder");

  return signals;
}

function monogramFor(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
