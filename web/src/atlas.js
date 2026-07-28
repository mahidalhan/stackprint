export async function listAtlasProfiles({ signal } = {}) {
  const response = await fetch("/data/builders-index.json", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("The public-evidence atlas is unavailable.");
  const payload = await response.json();
  return Array.isArray(payload.profiles)
    ? payload.profiles.map((profile) => ({ ...profile, generated: true }))
    : [];
}

export async function getAtlasProfile(slug, { signal } = {}) {
  const response = await fetch(
    `/data/builders/${encodeURIComponent(slug)}.json`,
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("That public-evidence profile is unavailable.");
  return response.json();
}
