export async function listPublishedProfiles({ signal } = {}) {
  const response = await fetch("/api/profiles", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Published profiles are unavailable.");
  const payload = await response.json();
  return Array.isArray(payload.profiles) ? payload.profiles : [];
}

export async function getPublishedProfile(slug, { signal } = {}) {
  const response = await fetch(
    `/api/profiles?slug=${encodeURIComponent(slug)}`,
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("That profile could not be loaded.");
  const payload = await response.json();
  return payload.profile || null;
}

export async function publishProfile(payload) {
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      result.message || "Stackprint could not publish this profile.",
    );
  }
  return result;
}
