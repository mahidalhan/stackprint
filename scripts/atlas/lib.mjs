import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const RESEARCH_DIR = resolve(ROOT, "research/angels");
export const CACHE_DIR = resolve(RESEARCH_DIR, ".cache");
export const ANGEL_CLUB_CSV_URL =
  "https://docs.google.com/spreadsheets/d/14aN1eDgQHC2Aup7-XctKhy4zkKNQMKFWqWPjKwjuUao/gviz/tq?tqx=out:csv&sheet=Angel%20Investors";
export const ANGEL_CLUB_RESOURCES_URL = "https://www.angelclub.com/resources";

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeCompactJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`);
}

export function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values[key] = next;
      index += 1;
    } else {
      values[key] = true;
    }
  }
  return values;
}

export function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizePersonName(value = "") {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(value = "") {
  return normalizePersonName(value).replaceAll(" ", "-");
}

export function monogramFor(value = "") {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function angelRowsFromCsv(text) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0] === "Name");
  if (headerIndex < 0) throw new Error("Angel Club CSV header was not found.");
  const headers = rows[headerIndex];
  return rows
    .slice(headerIndex + 1)
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
    )
    .filter((row) => {
      const type = row["Type of Investor"];
      const name = row.Name.trim();
      const organizationLikeName =
        /\b(?:capital|ventures?|partners?|fund|network|syndicate|collective|angels?|club|labs|investments?|company|inc|llc)\b/i.test(
          name,
        );
      return (
        name.length >= 3 &&
        !organizationLikeName &&
        !/^(?:\(?\s*(?:no contact|unknown|anonymous|not available|n\/a)\s*\)?)$/i.test(
          name,
        ) &&
        row["Verification Status"] === "Listed" &&
        !/\bangel group\b/i.test(type) &&
        /\b(angel|investor|venture|fund)\b/i.test(type)
      );
    });
}

export async function cachedAngelRows({ refresh = false } = {}) {
  const path = resolve(CACHE_DIR, "angel-club.csv");
  let text;
  if (!refresh) {
    text = await readFile(path, "utf8").catch(() => "");
  }
  if (!text) {
    const response = await fetch(ANGEL_CLUB_CSV_URL);
    if (!response.ok) {
      throw new Error(`Angel Club CSV download failed (${response.status}).`);
    }
    text = await response.text();
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path, text);
  }
  return angelRowsFromCsv(text);
}

function run(command, args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const output = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8").trim();
      if (code !== 0) {
        reject(
          new Error(
            `Bird CLI exited ${code}${errorOutput ? `: ${errorOutput}` : ""}`,
          ),
        );
      } else {
        resolvePromise(output);
      }
    });
  });
}

export async function runBirdJson(args, options = {}) {
  const bird = process.env.BIRD_BIN || "bird";
  const commandArgs = ["--plain", ...args, "--json"];
  let output;

  if (process.platform === "darwin") {
    output = await run(
      "/usr/bin/script",
      ["-q", "/dev/null", bird, ...commandArgs],
      options,
    );
  } else {
    output = await run(bird, commandArgs, options);
  }

  const clean = output
    .replaceAll("\r", "")
    .replace(/^\^D(?:\x08){2}/, "")
    .trim();
  const jsonStart = clean.match(/^(?:\{|\[)(?=\s*(?:[\[{\]"]|$))/m);
  if (!jsonStart || jsonStart.index === undefined) {
    throw new Error(`Bird CLI did not return JSON: ${clean.slice(0, 200)}`);
  }
  return JSON.parse(clean.slice(jsonStart.index));
}

export async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function uniqueBy(items, keyFor) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
