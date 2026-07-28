import { access, readdir, readFile, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { basename, delimiter, extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { classifyApp, normalizeToolName, TOOL_CATALOG } from "./catalog.js";

const MAX_APP_DEPTH = 2;
const MAX_EXTENDED_TOOLS = 2000;
const VERSION_TIMEOUT_MS = 1500;

export async function discoverInstalledApps({
  platform = process.platform,
  includeSystemApps = false,
  homeDirectory = os.homedir()
} = {}) {
  if (platform === "darwin") {
    return discoverMacApps({ includeSystemApps, homeDirectory });
  }
  if (platform === "linux") {
    return discoverLinuxApps({ homeDirectory });
  }
  if (platform === "win32") {
    return discoverWindowsApps();
  }
  return [];
}

export async function discoverCliTools({
  includeVersions = true,
  extended = false,
  pathValue = process.env.PATH ?? "",
  platform = process.platform
} = {}) {
  const known = [];
  const knownCommands = new Set();

  for (const candidate of TOOL_CATALOG) {
    const command = await firstExecutable(candidate.commands, { pathValue, platform });
    if (!command) continue;

    knownCommands.add(command);
    const version = includeVersions ? readVersion(command) : undefined;
    known.push(compact({
      name: candidate.name,
      command,
      category: candidate.category,
      kind: "cli",
      source: "known-tool-catalog",
      version
    }));
  }

  if (!extended) {
    return sortTools(known);
  }

  const executableNames = await discoverPathExecutables({ pathValue, platform });
  const uncatalogued = executableNames
    .filter((command) => !knownCommands.has(command))
    .slice(0, MAX_EXTENDED_TOOLS)
    .map((command) => ({
      name: command,
      command,
      category: "uncatalogued-cli",
      kind: "cli",
      source: "path-metadata"
    }));

  return sortTools([...known, ...uncatalogued]);
}

export function extractVersion(text) {
  if (!text) return undefined;
  const match = String(text).match(
    /(?:^|[^\d])v?(\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?)(?:[^\d]|$)/
  );
  return match?.[1];
}

export function currentSystemProfile({
  platform = process.platform,
  architecture = process.arch,
  shell = process.env.SHELL
} = {}) {
  return compact({
    operating_system: operatingSystemName(platform),
    platform,
    architecture,
    shell: shell ? basename(shell) : undefined
  });
}

async function discoverMacApps({ includeSystemApps, homeDirectory }) {
  const roots = ["/Applications", join(homeDirectory, "Applications")];
  if (includeSystemApps) roots.push("/System/Applications");
  return discoverNamedEntries(roots, (name) => name.endsWith(".app"), true);
}

async function discoverLinuxApps({ homeDirectory }) {
  const roots = [
    "/usr/share/applications",
    "/usr/local/share/applications",
    join(homeDirectory, ".local/share/applications")
  ];
  const paths = await collectEntries(roots, (name) => name.endsWith(".desktop"), 0);
  const names = [];
  for (const path of paths) {
    const fallback = normalizeToolName(basename(path));
    try {
      const content = await readFile(path, "utf8");
      const localizedName =
        content.match(/^Name=(.+)$/m)?.[1]?.trim() || fallback;
      names.push(localizedName);
    } catch {
      names.push(fallback);
    }
  }
  return appRecords(names);
}

async function discoverWindowsApps() {
  const env = process.env;
  const roots = [
    env.ProgramFiles,
    env["ProgramFiles(x86)"],
    env.APPDATA && join(env.APPDATA, "Microsoft/Windows/Start Menu/Programs"),
    env.ProgramData && join(env.ProgramData, "Microsoft/Windows/Start Menu/Programs")
  ].filter(Boolean);
  return discoverNamedEntries(
    roots,
    (name) => [".lnk", ".exe"].includes(extname(name).toLowerCase()),
    true
  );
}

async function discoverNamedEntries(roots, predicate, includeDirectories = false) {
  const paths = await collectEntries(roots, predicate, MAX_APP_DEPTH, includeDirectories);
  return appRecords(paths.map((path) => basename(path)));
}

async function collectEntries(roots, predicate, maxDepth, includeDirectories = false) {
  const found = [];
  for (const root of roots) {
    await walk(root, 0);
  }
  return found;

  async function walk(directory, depth) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const path = join(directory, entry.name);
      if (predicate(entry.name) && (entry.isFile() || entry.isSymbolicLink() || includeDirectories)) {
        found.push(path);
        if (!includeDirectories || !entry.isDirectory()) continue;
      }
      if (entry.isDirectory() && depth < maxDepth && !entry.name.endsWith(".app")) {
        await walk(path, depth + 1);
      }
    }
  }
}

function appRecords(names) {
  const unique = [...new Set(names.map(normalizeToolName).filter(Boolean))];
  return unique
    .map((name) => ({
      name,
      category: classifyApp(name),
      kind: "app",
      source: "installed-app-metadata"
    }))
    .sort(compareTools);
}

async function discoverPathExecutables({ pathValue, platform }) {
  const names = new Set();
  const extensions = platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").toLowerCase().split(";")
    : [""];

  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isDirectory()) continue;
      const extension = extname(entry.name).toLowerCase();
      if (platform === "win32" && !extensions.includes(extension)) continue;
      const command = platform === "win32"
        ? entry.name.slice(0, Math.max(0, entry.name.length - extension.length))
        : entry.name;
      if (command) names.add(command);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

async function firstExecutable(commands, { pathValue, platform }) {
  for (const command of commands) {
    if (await isExecutableOnPath(command, { pathValue, platform })) return command;
  }
  return undefined;
}

async function isExecutableOnPath(command, { pathValue, platform }) {
  const extensions = platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const path = join(directory, `${command}${extension}`);
      try {
        const mode = platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK;
        await access(path, mode);
        const details = await stat(path);
        if (details.isFile() || details.isSymbolicLink()) return true;
      } catch {
        // Continue looking without reporting private filesystem paths.
      }
    }
  }
  return false;
}

function readVersion(command) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    timeout: VERSION_TIMEOUT_MS,
    maxBuffer: 64 * 1024,
    windowsHide: true,
    env: {
      ...process.env,
      CI: "1",
      NO_COLOR: "1"
    }
  });
  return extractVersion(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
}

function operatingSystemName(platform) {
  return {
    darwin: "macOS",
    linux: "Linux",
    win32: "Windows"
  }[platform] ?? platform;
}

function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

function sortTools(tools) {
  return [...tools].sort(compareTools);
}

function compareTools(a, b) {
  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
}
