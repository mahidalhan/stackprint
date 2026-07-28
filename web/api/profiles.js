import { randomBytes } from "node:crypto";
import { list, put } from "@vercel/blob";
import {
  isE2EProfile,
  makeProfileSlug,
  ProfileValidationError,
  sanitizePublishRequest,
} from "../lib/published-profile.js";

const PROFILE_PREFIX = "profiles/v1/";
const E2E_PATH = "qa/v1/stackprint-e2e.json";
const MAX_REQUEST_BYTES = 180_000;
const PUBLIC_SITE = "https://stackprint-builder.vercel.app";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

export default async function handler(request, response) {
  if (request.method === "GET") {
    return handleGet(request, response);
  }
  if (request.method === "POST") {
    return handlePost(request, response);
  }
  response.setHeader("Allow", "GET, POST");
  return response.status(405).json({ error: "method_not_allowed" });
}

async function handleGet(request, response) {
  try {
    const slug = cleanSlug(request.query?.slug);
    if (slug) {
      const profile = await getProfile(slug);
      if (!profile) {
        return response.status(404).json({ error: "profile_not_found" });
      }
      response.setHeader("Cache-Control", "public, max-age=30, s-maxage=60");
      return response.status(200).json({ profile });
    }

    const { blobs } = await list({ prefix: PROFILE_PREFIX, limit: 100 });
    const profiles = (
      await Promise.all(blobs.map((blob) => readBlobJson(blob)))
    )
      .filter(Boolean)
      .filter((profile) => !isE2EProfile(profile))
      .sort(
        (left, right) =>
          Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
      );
    response.setHeader("Cache-Control", "public, max-age=30, s-maxage=60");
    return response.status(200).json({ profiles });
  } catch (error) {
    return serverError(response, error);
  }
}

async function handlePost(request, response) {
  try {
    if (!originAllowed(request)) {
      return response.status(403).json({ error: "origin_not_allowed" });
    }
    const contentLength = Number(request.headers["content-length"] || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return response.status(413).json({ error: "profile_too_large" });
    }

    const profile = sanitizePublishRequest(request.body);
    profile.slug = makeProfileSlug(
      profile,
      randomBytes(4).toString("hex"),
    );
    const isE2E = isE2EProfile(profile);
    if (!isE2E && !consumePublishAttempt(request)) {
      response.setHeader("Retry-After", "600");
      return response.status(429).json({ error: "publish_rate_limited" });
    }
    const pathname = isE2E
      ? E2E_PATH
      : `${PROFILE_PREFIX}${profile.slug}.json`;
    await put(pathname, JSON.stringify(profile), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: isE2E,
      cacheControlMaxAge: isE2E ? 60 : 31_536_000,
      contentType: "application/json",
    });

    response.setHeader("Cache-Control", "no-store");
    return response.status(201).json({
      profile,
      url: `${requestOrigin(request)}/b/${profile.slug}`,
    });
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return response
        .status(400)
        .json({ error: "invalid_profile", message: error.message });
    }
    return serverError(response, error);
  }
}

async function getProfile(slug) {
  const pathname =
    slug === "stackprint-e2e"
      ? E2E_PATH
      : `${PROFILE_PREFIX}${slug}.json`;
  const { blobs } = await list({ prefix: pathname, limit: 2 });
  const exact = blobs.find((blob) => blob.pathname === pathname);
  return exact ? readBlobJson(exact) : null;
}

async function readBlobJson(blob) {
  try {
    const result = await fetch(blob.downloadUrl || blob.url, {
      headers: { Accept: "application/json" },
    });
    if (!result.ok) return null;
    return await result.json();
  } catch {
    return null;
  }
}

function cleanSlug(value) {
  if (!value) return "";
  const slug = String(value).trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,60}$/.test(slug) ? slug : "";
}

function originAllowed(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (origin === PUBLIC_SITE) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
}

function requestOrigin(request) {
  const forwardedHost = String(
    request.headers["x-forwarded-host"] || request.headers.host || "",
  ).split(",")[0];
  const forwardedProtocol = String(
    request.headers["x-forwarded-proto"] ||
      (forwardedHost.startsWith("localhost") ||
      forwardedHost.startsWith("127.0.0.1")
        ? "http"
        : "https"),
  ).split(",")[0];
  if (!forwardedHost) return PUBLIC_SITE;
  return `${forwardedProtocol}://${forwardedHost}`;
}

function consumePublishAttempt(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "");
  const address = forwarded.split(",")[0].trim() || "unknown";
  const key = `stackprint:${address}`;
  const now = Date.now();
  const buckets =
    globalThis.__stackprintPublishBuckets ||
    (globalThis.__stackprintPublishBuckets = new Map());
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

function serverError(response, error) {
  console.error("stackprint_profiles_error", {
    name: error?.name,
    message: error?.message,
  });
  return response.status(500).json({ error: "profile_service_unavailable" });
}
