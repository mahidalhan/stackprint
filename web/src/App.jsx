import { useEffect, useMemo, useState } from "react";
import {
  BUILDERS,
  FILTERS,
  HERO_LAYERS,
} from "./data.js";
import { PublishPanel } from "./components/PublishPanel.jsx";
import { filterBuilders } from "./profile-utils.js";
import {
  getPublishedProfile,
  listPublishedProfiles,
} from "./publishing.js";
import {
  ArrowIcon,
  CopyIcon,
  SearchIcon,
  TerminalIcon,
  XIcon,
} from "./icons.jsx";

function routeFromPath() {
  const match = window.location.pathname.match(/^\/b\/([^/]+)\/?$/);
  return match ? { view: "profile", slug: match[1] } : { view: "atlas" };
}

function Brand({ onHome }) {
  return (
    <button className="brand" type="button" onClick={onHome}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>STACKPRINT</span>
    </button>
  );
}

function Header({ onHome, onBuild, onRunCli, profile, copied, onCopy }) {
  return (
    <header className="site-header">
      <Brand onHome={onHome} />
      <div className="header-actions">
        {profile ? (
          <>
            <button className="header-link" type="button" onClick={onCopy}>
              <CopyIcon />
              <span>{copied ? "Profile link copied" : "Copy profile link"}</span>
            </button>
            <button className="primary-action" type="button" onClick={onBuild}>
              <span>Build your Stackprint</span>
              <ArrowIcon />
            </button>
          </>
        ) : (
          <>
            <button className="primary-action" type="button" onClick={onBuild}>
              <span>Add your stack</span>
              <ArrowIcon />
            </button>
            <button className="secondary-action" type="button" onClick={onRunCli}>
              <span>Run the CLI</span>
              <TerminalIcon />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function HeroStack() {
  return (
    <div className="hero-stack" aria-label="A stack of app and tool layers">
      <div className="stack-guide stack-guide-left">BUILDER / MAHID</div>
      <div className="stack-guide stack-guide-right">08 LAYERS</div>
      <div className="stack-platform" />
      {HERO_LAYERS.map((label, index) => (
        <div
          className={`stack-layer ${label.startsWith("X") ? "manual" : ""}`}
          style={{ "--layer": index }}
          key={label}
        >
          <span>{label}</span>
          <b>{String(index + 1).padStart(2, "0")}</b>
        </div>
      ))}
    </div>
  );
}

function BuilderTile({ builder, onOpen }) {
  const names =
    builder.toolNames ||
    builder.tools.flatMap((group) => group.tools.map((tool) => tool.name)).slice(0, 8);
  return (
    <article className="builder-tile">
      <button
        className="tile-hit"
        type="button"
        onClick={() => onOpen(builder)}
        aria-label={`View ${builder.name}'s Stackprint`}
      />
      <div className={`monogram motif-${builder.motif}`} aria-hidden="true">
        <span>{builder.monogram}</span>
      </div>
      <div className="builder-copy">
        <div className="builder-title-row">
          <div>
            <h2>{builder.name}</h2>
            <span className="handle">{builder.handle}</span>
          </div>
          <span className="tile-arrow" aria-hidden="true">
            <ArrowIcon />
          </span>
        </div>
        <p>{builder.role}</p>
        <div className="builder-count">
          {builder.count} tools
          {builder.demo ? (
            <span>demo</span>
          ) : builder.published ? (
            <span>published</span>
          ) : (
            <span>real scan</span>
          )}
        </div>
      </div>
      <div className="tool-line" aria-label="Selected tools">
        {names.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
    </article>
  );
}

function Atlas({
  builders,
  onOpen,
  onBuild,
  onRunCli,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Recently added");

  const visibleBuilders = useMemo(() => {
    const filtered = filterBuilders(builders, query, filter);
    return [...filtered].sort((a, b) => {
      if (sort === "Most tools") return b.count - a.count;
      if (sort === "Name A–Z") return a.name.localeCompare(b.name);
      return builders.indexOf(a) - builders.indexOf(b);
    });
  }, [builders, filter, query, sort]);
  const publicCount = builders.filter((builder) => !builder.demo).length;
  const detectedCount = builders
    .filter((builder) => !builder.demo)
    .reduce((total, builder) => total + (builder.detectedCount || 0), 0);

  return (
    <>
      <Header onHome={() => {}} onBuild={onBuild} onRunCli={onRunCli} />
      <main>
        <section className="atlas-hero">
          <div className="hero-copy">
            <span className="hero-label">PUBLIC BUILDER ATLAS</span>
            <h1>How builders build<span>.</span></h1>
            <p>
              A living atlas of the apps, tools, and workflows behind the
              people making what’s next.
            </p>
            <div className="hero-proof">
              <span>{publicCount} PUBLIC {publicCount === 1 ? "STACK" : "STACKS"}</span>
              <i>·</i>
              <span>5 CLEARLY MARKED DEMOS</span>
              <i>·</i>
              <span>CONSENT-GATED PUBLISHING</span>
            </div>
          </div>
          <HeroStack />
        </section>

        <section className="catalog" aria-label="Builder atlas">
          <div className="catalog-toolbar">
            <label className="search-control">
              <SearchIcon />
              <span className="sr-only">Search builders or tools</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search builders or tools"
              />
            </label>
            <div className="filter-row" aria-label="Filter builders">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="sort-control">
              <span>Sort by</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option>Recently added</option>
                <option>Most tools</option>
                <option>Name A–Z</option>
              </select>
            </label>
          </div>

          <div className="catalog-meta">
            <span>{visibleBuilders.length} PROFILES</span>
            <span>{detectedCount} REVIEWED TOOL NAMES</span>
            <span>LOCAL SCAN · PUBLIC BY CHOICE</span>
          </div>

          {visibleBuilders.length ? (
            <div className="builder-grid">
              {visibleBuilders.map((builder) => (
                <BuilderTile
                  key={builder.slug}
                  builder={builder}
                  onOpen={onOpen}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No stack matches that search.</h2>
              <button type="button" onClick={() => { setQuery(""); setFilter("All"); }}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Fingerprint({ groups }) {
  return (
    <div className="fingerprint" aria-label="Stack fingerprint by category">
      <span className="fingerprint-label">STACK FINGERPRINT</span>
      <div className="fingerprint-groups">
        {groups.slice(0, 8).map((group, groupIndex) => (
          <div className="fingerprint-column" key={group.name}>
            <span>{group.name}</span>
            <div className="fingerprint-bars">
              {group.tools.slice(0, 7).map((item, index) => (
                <i
                  key={item.name}
                  style={{
                    "--w": `${30 + ((index * 19 + groupIndex * 11) % 66)}%`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolRow({ item }) {
  const initials = item.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <li className="tool-row">
      <span className="tool-glyph" aria-hidden="true">{initials}</span>
      <span className="tool-name">{item.name}</span>
      <span className={`tool-source ${item.source}`}>
        {item.source === "manual" ? "MANUAL" : item.kind.toUpperCase()}
      </span>
      <span className="detected-mark" aria-hidden="true">
        {item.source === "manual" ? "+" : item.kind === "cli" ? ">_" : "●"}
      </span>
    </li>
  );
}

function Profile({
  builder,
  onHome,
  onBuild,
  copied,
  onCopy,
}) {
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const allGroups = builder.tools || [];
  const groups = allGroups
    .map((group) => ({
      ...group,
      tools: group.tools.filter((item) => {
        const kindMatch = kind === "all" || item.kind === kind;
        return kindMatch &&
          item.name.toLowerCase().includes(query.trim().toLowerCase());
      }),
    }))
    .filter((group) => group.tools.length);

  return (
    <>
      <Header
        onHome={onHome}
        onBuild={onBuild}
        profile
        copied={copied}
        onCopy={onCopy}
      />
      <main className="profile-page">
        <button className="back-link" type="button" onClick={onHome}>
          <ArrowIcon direction="left" />
          <span>Builder atlas</span>
        </button>

        <section className="profile-hero">
          <div className={`profile-monogram motif-${builder.motif}`}>
            <span>{builder.monogram}</span>
          </div>
          <div className="profile-identity">
            <h1>{builder.name}</h1>
            <span className="handle">{builder.handle}</span>
            <p>{builder.role}</p>
            <div className="profile-count">
              {builder.detectedCount ?? builder.count} DETECTED
              {builder.manualCount ? ` · ${builder.manualCount} MANUAL` : ""}
              {" · "}
              {builder.categories ?? builder.tools.length} CATEGORIES
            </div>
            {builder.xUrl ? (
              <a
                className="x-link"
                href={builder.xUrl}
                target="_blank"
                rel="noreferrer"
              >
                <XIcon />
                <span>{builder.xHandle}</span>
                <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            <p className="privacy-note">
              The tools on this page were detected on-device. Stackprint does
              not inspect files, history, credentials, or activity.
            </p>
          </div>
          <Fingerprint groups={allGroups} />
        </section>

        <section className="profile-directory">
          <div className="profile-toolbar">
            <div className="kind-tabs" aria-label="Filter by tool kind">
              {[
                ["all", "All tools"],
                ["app", "Apps"],
                ["cli", "CLI"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={kind === value ? "active" : ""}
                  onClick={() => setKind(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="search-control profile-search">
              <SearchIcon />
              <span className="sr-only">Find a tool in this stack</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a tool in this stack"
              />
            </label>
          </div>

          <div className="directory-layout">
            <div className="tool-groups">
              {groups.length ? groups.map((group) => (
                <section className="tool-group" key={group.name}>
                  <h2>{group.name}</h2>
                  <ul>
                    {group.tools.map((item) => (
                      <ToolRow key={`${group.name}-${item.name}`} item={item} />
                    ))}
                  </ul>
                </section>
              )) : (
                <div className="empty-state compact">
                  <h2>No tool matches that filter.</h2>
                </div>
              )}
            </div>
            <aside className="signals">
              <h2>BUILDER SIGNALS</h2>
              {(builder.signals || []).map((signal, index) => (
                <div className="signal" key={signal}>
                  <span aria-hidden="true">
                    {["◎", "</>", "☁", "⌁"][index] || "·"}
                  </span>
                  <p>{signal}</p>
                </div>
              ))}
              <p className="signal-note">
                Signals describe the available stack, not skill level or usage.
              </p>
            </aside>
          </div>
        </section>

        <section className="profile-footer">
          <h2>Your stack is your blueprint.</h2>
          <p>Turn your tools into a Stackprint and share only what you choose.</p>
          <button className="primary-action" type="button" onClick={onBuild}>
            <span>Build your Stackprint</span>
            <ArrowIcon />
          </button>
        </section>
      </main>
    </>
  );
}

function ProfileLoadState({ status, onHome, onBuild }) {
  return (
    <>
      <Header
        onHome={onHome}
        onBuild={onBuild}
        onRunCli={onBuild}
      />
      <main className="profile-load-state">
        <span>{status === "loading" ? "LOADING PROFILE" : "PROFILE NOT FOUND"}</span>
        <h1>
          {status === "loading"
            ? "Reading this Stackprint…"
            : "This Stackprint does not exist."}
        </h1>
        {status !== "loading" ? (
          <button type="button" onClick={onHome}>
            Return to the builder atlas
          </button>
        ) : null}
      </main>
    </>
  );
}

export default function App() {
  const [route, setRoute] = useState(routeFromPath);
  const [importedProfile, setImportedProfile] = useState(null);
  const [publishedProfiles, setPublishedProfiles] = useState([]);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState("idle");
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listPublishedProfiles({ signal: controller.signal })
      .then(setPublishedProfiles)
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.warn("Stackprint catalog could not refresh.", error);
        }
      });
    return () => controller.abort();
  }, []);

  const allBuilders = useMemo(() => {
    const seen = new Set();
    return [...publishedProfiles, ...BUILDERS].filter((builder) => {
      if (seen.has(builder.slug)) return false;
      seen.add(builder.slug);
      return true;
    });
  }, [publishedProfiles]);

  const localBuilder =
    route.view === "profile" && importedProfile?.slug === route.slug
      ? importedProfile
      : null;
  const catalogBuilder =
    route.view === "profile"
      ? allBuilders.find((item) => item.slug === route.slug) || null
      : null;
  const builder =
    route.view === "profile"
      ? localBuilder || catalogBuilder || remoteProfile
      : null;

  useEffect(() => {
    if (
      route.view !== "profile" ||
      localBuilder ||
      catalogBuilder
    ) {
      setRemoteProfile(null);
      setRemoteStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    setRemoteProfile(null);
    setRemoteStatus("loading");
    getPublishedProfile(route.slug, { signal: controller.signal })
      .then((profile) => {
        setRemoteProfile(profile);
        setRemoteStatus(profile ? "ready" : "not-found");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setRemoteStatus("not-found");
      });
    return () => controller.abort();
  }, [catalogBuilder, localBuilder, route]);

  function go(path, nextRoute) {
    window.history.pushState({}, "", path);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openBuilder(item) {
    go(`/b/${item.slug}`, { view: "profile", slug: item.slug });
  }

  function openAtlas() {
    go("/", { view: "atlas" });
  }

  async function copyText(text, setter) {
    await navigator.clipboard.writeText(text);
    setter(true);
    window.setTimeout(() => setter(false), 1800);
  }

  function previewProfile(profile) {
    setImportedProfile(profile);
    setPanelOpen(false);
    go("/b/local-preview", { view: "profile", slug: "local-preview" });
  }

  function openPublishedProfile(profile) {
    setPublishedProfiles((current) => [
      profile,
      ...current.filter((item) => item.slug !== profile.slug),
    ]);
    setPanelOpen(false);
    openBuilder(profile);
  }

  return (
    <>
      {builder ? (
        <Profile
          builder={builder}
          onHome={openAtlas}
          onBuild={() => setPanelOpen(true)}
          copied={copied}
          onCopy={() => copyText(window.location.href, setCopied)}
        />
      ) : route.view === "profile" ? (
        <ProfileLoadState
          status={remoteStatus}
          onHome={openAtlas}
          onBuild={() => setPanelOpen(true)}
        />
      ) : (
        <Atlas
          builders={allBuilders}
          onOpen={openBuilder}
          onBuild={() => setPanelOpen(true)}
          onRunCli={() => setPanelOpen(true)}
        />
      )}
      <PublishPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onPreview={previewProfile}
        onPublished={openPublishedProfile}
      />
    </>
  );
}
