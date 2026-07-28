export function renderJson(profile) {
  return `${JSON.stringify(profile, null, 2)}\n`;
}

export function renderMarkdown(profile) {
  const lines = [
    "# My Stackprint",
    "",
    `Generated locally with Stackprint ${profile.generator.version}.`,
    "",
    "> Detected means available on this computer. It does not prove active use.",
    "",
    "## Builder profile",
    ""
  ];

  const signals = profile.summary.builder_signals;
  if (signals.length) {
    for (const signal of signals) lines.push(`- ${signal}`);
  } else {
    lines.push("- No builder signals inferred yet");
  }

  lines.push("", "## Tool stack", "");
  for (const section of profile.stack) {
    lines.push(`### ${titleCase(section.category)}`, "");
    for (const tool of section.tools) {
      const version = tool.version ? ` (${tool.version})` : "";
      lines.push(`- ${tool.name}${version}`);
    }
    lines.push("");
  }

  lines.push(
    "## Privacy note",
    "",
    `Scan mode: \`${profile.privacy.scan_mode}\`. Network used by Stackprint: \`${profile.privacy.network_used}\`. Third-party commands executed: \`${profile.privacy.third_party_commands_executed}\`.`,
    "No file contents, shell history, browser history, environment values, credentials, usernames, hostnames, or repository names were collected.",
    ""
  );
  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderTerminal(profile) {
  const lines = [
    `Stackprint found ${profile.summary.detected_tools} tools`,
    `${profile.summary.detected_apps} apps · ${profile.summary.detected_cli_tools} CLI tools · ${profile.summary.categories} categories`,
    ""
  ];

  if (profile.summary.builder_signals.length) {
    lines.push("Builder signals");
    for (const signal of profile.summary.builder_signals) lines.push(`  • ${signal}`);
    lines.push("");
  }

  for (const section of profile.stack) {
    lines.push(titleCase(section.category));
    lines.push(`  ${section.tools.map((tool) => tool.name).join(", ")}`);
  }
  lines.push(
    "",
    "Local-only scan. Installed does not mean actively used.",
    "Use --markdown or --json for a shareable, reviewable profile."
  );
  return `${lines.join("\n")}\n`;
}

function titleCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
