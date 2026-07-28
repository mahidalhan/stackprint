const UNKNOWN = "Other";

export function normalizeHandle(value = "") {
  const trimmed = value.trim().replace(/^@/, "");
  return trimmed ? `@${trimmed}` : "";
}

export function profileFromStackprint(payload, identity = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("That file is not a Stackprint profile.");
  }

  const apps = Array.isArray(payload.apps) ? payload.apps : [];
  const cli = Array.isArray(payload.cli) ? payload.cli : [];
  if (!payload.summary || apps.length + cli.length === 0) {
    throw new Error("No detected Stackprint tools were found in this file.");
  }

  const grouped = new Map();
  for (const item of [...apps, ...cli]) {
    const category = String(item.category || UNKNOWN)
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({
      name: String(item.name || item.command || "Unknown tool"),
      kind: item.kind === "cli" || cli.includes(item) ? "cli" : "app",
      source: "detected",
    });
  }

  const name = identity.name?.trim() || "Local builder";
  const handle = normalizeHandle(identity.handle) || "@local-preview";
  const count =
    Number(payload.summary.detected_tools) || apps.length + cli.length;

  return {
    slug: "local-preview",
    name,
    handle,
    xHandle: normalizeHandle(identity.xHandle),
    xUrl: identity.xHandle
      ? `https://x.com/${identity.xHandle.trim().replace(/^@/, "")}`
      : "",
    role: identity.role?.trim() || "Builder",
    count,
    detectedCount: count,
    manualCount: 0,
    categories:
      Number(payload.summary.categories) || Math.max(grouped.size, 1),
    monogram: name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
    motif: "local",
    demo: false,
    localPreview: true,
    generatedAt: payload.generated_at || "",
    scanMode: payload.privacy?.scan_mode || "standard",
    sourcePayload: payload,
    tools: [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, tools]) => ({
        name: groupName,
        tools: tools.sort((a, b) => a.name.localeCompare(b.name)),
      })),
    signals: Array.isArray(payload.summary.builder_signals)
      ? payload.summary.builder_signals.slice(0, 4)
      : [],
  };
}

export function toolKey(groupName, tool) {
  return `${groupName}\u001f${tool.kind}\u001f${tool.name}`;
}

export function publicProfileRequest(profile, identity, selected) {
  const groups = profile.tools
    .map((group) => ({
      name: group.name,
      tools: group.tools.filter((tool) =>
        selected.has(toolKey(group.name, tool)),
      ),
    }))
    .filter((group) => group.tools.length);

  return {
    consent: { public: true },
    identity: {
      name: identity.name,
      handle: identity.handle,
      role: identity.role,
      xHandle: identity.xHandle,
    },
    tools: groups,
    signals: deriveSignalsFromGroups(groups),
    generatedAt: profile.generatedAt,
    scanMode: profile.scanMode,
  };
}

function deriveSignalsFromGroups(groups) {
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

export function filterBuilders(builders, query, category) {
  const needle = query.trim().toLowerCase();
  return builders.filter((builder) => {
    const inCategory = category === "All" || builder.tags?.includes(category);
    const names = builder.toolNames || builder.tools?.flatMap((g) =>
      g.tools.map((item) => item.name),
    ) || [];
    const haystack = [
      builder.name,
      builder.handle,
      builder.role,
      ...names,
    ]
      .join(" ")
      .toLowerCase();
    return inCategory && (!needle || haystack.includes(needle));
  });
}
