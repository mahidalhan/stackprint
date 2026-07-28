import { currentSystemProfile } from "./discovery.js";

export const SCHEMA_VERSION = "1.0";
export const GENERATOR_VERSION = "0.1.0";

export function buildProfile({
  apps = [],
  cli = [],
  extended = false,
  includeVersions = false,
  generatedAt = new Date().toISOString(),
  system = currentSystemProfile()
} = {}) {
  const stack = groupByCategory([...apps, ...cli]);
  const detected = [...apps, ...cli];

  return {
    schema_version: SCHEMA_VERSION,
    generator: {
      name: "stackprint",
      version: GENERATOR_VERSION,
      offline: true
    },
    generated_at: generatedAt,
    privacy: {
      scan_mode: extended ? "extended-path-metadata" : "standard",
      network_used: false,
      third_party_commands_executed: includeVersions,
      claims_activity: false,
      excluded: [
        "file contents",
        "shell history",
        "browser history",
        "environment values",
        "credentials and tokens",
        "hostnames and usernames",
        "repository names"
      ]
    },
    system,
    summary: {
      detected_tools: detected.length,
      detected_apps: apps.length,
      detected_cli_tools: cli.length,
      categories: stack.length,
      builder_signals: deriveBuilderSignals(stack)
    },
    stack,
    apps,
    cli
  };
}

export function groupByCategory(tools) {
  const categories = new Map();
  for (const item of tools) {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category).push(item);
  }
  return [...categories]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, items]) => ({
      category,
      tools: items
        .map(({ name, kind, version }) => compact({ name, kind, version }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }));
}

export function deriveBuilderSignals(stack) {
  const counts = Object.fromEntries(
    stack.map(({ category, tools }) => [category, tools.length])
  );
  const signals = [];

  if ((counts["ai-assistants"] ?? 0) > 0) signals.push("AI-assisted builder");
  if ((counts["language-runtimes"] ?? 0) >= 3) signals.push("Polyglot builder");
  if ((counts.cloud ?? 0) + (counts.containers ?? 0) + (counts.infrastructure ?? 0) >= 3) {
    signals.push("Cloud and infrastructure builder");
  }
  if ((counts.mobile ?? 0) >= 2) signals.push("Mobile builder");
  if ((counts.robotics ?? 0) > 0) signals.push("Robotics builder");
  if ((counts.design ?? 0) > 0) signals.push("Design-enabled builder");
  if ((counts.databases ?? 0) >= 2) signals.push("Data-oriented builder");

  return signals;
}

function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}
