import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDERS,
  FILTERS,
  HERO_LAYERS,
} from "./data.js";
import {
  filterBuilders,
  profileFromStackprint,
} from "./profile-utils.js";
import {
  ArrowIcon,
  CloseIcon,
  CopyIcon,
  SearchIcon,
  TerminalIcon,
  UploadIcon,
  XIcon,
} from "./icons.jsx";

const CLI_COMMAND =
  "stackprint scan --json --output stackprint-profile.json";

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
          {builder.demo ? <span>demo</span> : <span>real scan</span>}
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
  onOpen,
  onBuild,
  onRunCli,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Recently added");

  const visibleBuilders = useMemo(() => {
    const filtered = filterBuilders(BUILDERS, query, filter);
    return [...filtered].sort((a, b) => {
      if (sort === "Most tools") return b.count - a.count;
      if (sort === "Name A–Z") return a.name.localeCompare(b.name);
      return BUILDERS.indexOf(a) - BUILDERS.indexOf(b);
    });
  }, [filter, query, sort]);

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
              <span>1 REAL STACK</span>
              <i>·</i>
              <span>5 CLEARLY MARKED DEMOS</span>
              <i>·</i>
              <span>LOCAL-FIRST</span>
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
            <span>134 LOCALLY DETECTED TOOLS</span>
            <span>1 MANUAL ADDITION: X</span>
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

function ImportPanel({ open, onClose, onImport, onCopyCommand, commandCopied }) {
  const fileRef = useRef(null);
  const [identity, setIdentity] = useState({
    name: "",
    handle: "",
    xHandle: "",
    role: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  async function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const payload = JSON.parse(await file.text());
      const profile = profileFromStackprint(payload, identity);
      onImport(profile);
    } catch (readError) {
      setError(readError.message || "That file could not be read.");
    } finally {
      event.target.value = "";
    }
  }

  if (!open) return null;

  return (
    <div className="panel-backdrop" role="presentation">
      <section
        className="import-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
      >
        <div className="panel-head">
          <div>
            <span>LOCAL IMPORT</span>
            <h2 id="import-title">Build your Stackprint.</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <p className="panel-intro">
          Generate a JSON profile with the CLI, review it, then open it here.
          Parsing happens in this browser. Nothing is uploaded.
        </p>
        <button className="command-box" type="button" onClick={onCopyCommand}>
          <code>{CLI_COMMAND}</code>
          <span>{commandCopied ? "COPIED" : "COPY"}</span>
        </button>
        <div className="identity-fields">
          <label>
            <span>Name</span>
            <input
              value={identity.name}
              onChange={(event) => setIdentity({ ...identity, name: event.target.value })}
              placeholder="Your name"
            />
          </label>
          <label>
            <span>Handle</span>
            <input
              value={identity.handle}
              onChange={(event) => setIdentity({ ...identity, handle: event.target.value })}
              placeholder="@handle"
            />
          </label>
          <label>
            <span>What you build</span>
            <input
              value={identity.role}
              onChange={(event) => setIdentity({ ...identity, role: event.target.value })}
              placeholder="Robotics builder"
            />
          </label>
          <label>
            <span>X handle (optional)</span>
            <input
              value={identity.xHandle}
              onChange={(event) => setIdentity({ ...identity, xHandle: event.target.value })}
              placeholder="@handle"
            />
          </label>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={readFile}
        />
        <button
          className="upload-action"
          type="button"
          onClick={() => fileRef.current?.click()}
        >
          <UploadIcon />
          <span>Open Stackprint JSON</span>
        </button>
        {error ? <p className="panel-error" role="alert">{error}</p> : null}
        <p className="panel-fineprint">
          Stackprint describes installed tools. It does not claim activity,
          proficiency, preference, or endorsement.
        </p>
      </section>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(routeFromPath);
  const [importedProfile, setImportedProfile] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commandCopied, setCommandCopied] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const builder =
    route.view === "profile"
      ? importedProfile?.slug === route.slug
        ? importedProfile
        : BUILDERS.find((item) => item.slug === route.slug) || BUILDERS[0]
      : null;

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

  function importProfile(profile) {
    setImportedProfile(profile);
    setPanelOpen(false);
    go("/b/local-preview", { view: "profile", slug: "local-preview" });
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
      ) : (
        <Atlas
          onOpen={openBuilder}
          onBuild={() => setPanelOpen(true)}
          onRunCli={() => {
            setPanelOpen(true);
            copyText(CLI_COMMAND, setCommandCopied);
          }}
        />
      )}
      <ImportPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onImport={importProfile}
        commandCopied={commandCopied}
        onCopyCommand={() => copyText(CLI_COMMAND, setCommandCopied)}
      />
    </>
  );
}
