import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloseIcon,
  CopyIcon,
  TerminalIcon,
  UploadIcon,
} from "../icons.jsx";
import {
  profileFromStackprint,
  publicProfileRequest,
  toolKey,
} from "../profile-utils.js";
import {
  AGENT_PROMPT,
  INSTALL_CLI_COMMAND,
  INSTALL_SKILL_COMMAND,
  RUN_ONCE_COMMAND,
} from "../install-copy.js";
import { publishProfile } from "../publishing.js";

export function PublishPanel({
  open,
  onClose,
  onPreview,
  onPublished,
}) {
  const fileRef = useRef(null);
  const [phase, setPhase] = useState("scan");
  const [sourceProfile, setSourceProfile] = useState(null);
  const [identity, setIdentity] = useState({
    name: "",
    handle: "",
    xHandle: "",
    role: "",
  });
  const [selected, setSelected] = useState(() => new Set());
  const [consent, setConsent] = useState(false);
  const [installMode, setInstallMode] = useState("terminal");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [published, setPublished] = useState(null);

  const resetWorkflow = useCallback(() => {
    setPhase("scan");
    setSourceProfile(null);
    setIdentity({ name: "", handle: "", xHandle: "", role: "" });
    setSelected(new Set());
    setConsent(false);
    setError("");
    setPublished(null);
  }, []);

  const handleClose = useCallback(() => {
    if (phase === "success") resetWorkflow();
    onClose();
  }, [onClose, phase, resetWorkflow]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape" && phase !== "publishing") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose, open, phase]);

  const allToolKeys = useMemo(
    () =>
      sourceProfile?.tools.flatMap((group) =>
        group.tools.map((tool) => toolKey(group.name, tool)),
      ) || [],
    [sourceProfile],
  );
  const selectedCount = selected.size;
  const canPublish =
    identity.name.trim() &&
    identity.handle.trim() &&
    selectedCount > 0 &&
    consent &&
    phase === "review";

  async function copyText(value, key) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const payload = JSON.parse(await file.text());
      const profile = profileFromStackprint(payload, identity);
      const keys = profile.tools.flatMap((group) =>
        group.tools.map((tool) => toolKey(group.name, tool)),
      );
      setSourceProfile(profile);
      setSelected(new Set(keys));
      setPhase("review");
    } catch (readError) {
      setError(readError.message || "That file could not be read.");
    } finally {
      event.target.value = "";
    }
  }

  function toggleTool(key) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(
      selectedCount === allToolKeys.length
        ? new Set()
        : new Set(allToolKeys),
    );
  }

  async function publish() {
    if (!canPublish) return;
    setPhase("publishing");
    setError("");
    try {
      const result = await publishProfile(
        publicProfileRequest(sourceProfile, identity, selected),
      );
      setPublished(result);
      setPhase("success");
    } catch (publishError) {
      setError(publishError.message);
      setPhase("review");
    }
  }

  function preview() {
    if (!sourceProfile || selectedCount === 0) return;
    onPreview(
      profileFromStackprint(
        {
          ...sourceProfile.sourcePayload,
          apps: sourceProfile.sourcePayload.apps.filter((tool) =>
            selected.has(toolKeyForSource(tool, "app")),
          ),
          cli: sourceProfile.sourcePayload.cli.filter((tool) =>
            selected.has(toolKeyForSource(tool, "cli")),
          ),
        },
        identity,
      ),
    );
  }

  if (!open) return null;

  return (
    <div className="panel-backdrop" role="presentation">
      <section
        className="import-panel publish-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
      >
        <div className="panel-head">
          <div>
            <span>
              {phase === "scan"
                ? "01 / INSTALL & SCAN LOCALLY"
                : phase === "success"
                  ? "03 / LIVE"
                  : "02 / REVIEW & PUBLISH"}
            </span>
            <h2 id="publish-title">
              {phase === "scan"
                ? "Get Stackprint."
                : phase === "success"
                  ? "Your profile is live."
                  : "Choose what becomes public."}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={handleClose}
            aria-label="Close"
            disabled={phase === "publishing"}
          >
            <CloseIcon />
          </button>
        </div>

        {phase === "scan" ? (
          <ScanStep
            installMode={installMode}
            setInstallMode={setInstallMode}
            copied={copied}
            onCopy={copyText}
            onOpen={() => fileRef.current?.click()}
          />
        ) : null}

        {phase === "review" || phase === "publishing" ? (
          <ReviewStep
            identity={identity}
            setIdentity={setIdentity}
            profile={sourceProfile}
            selected={selected}
            selectedCount={selectedCount}
            allCount={allToolKeys.length}
            consent={consent}
            setConsent={setConsent}
            onToggle={toggleTool}
            onSelectAll={selectAll}
            onBack={() => {
              setError("");
              setConsent(false);
              setPhase("scan");
            }}
            onPreview={preview}
            onPublish={publish}
            canPublish={Boolean(canPublish)}
            publishing={phase === "publishing"}
          />
        ) : null}

        {phase === "success" && published ? (
          <SuccessStep
            result={published}
            copied={copied}
            onCopy={copyText}
            onView={() => {
              resetWorkflow();
              onPublished(published.profile);
            }}
          />
        ) : null}

        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={readFile}
        />
        {error ? (
          <p className="panel-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ScanStep({
  installMode,
  setInstallMode,
  copied,
  onCopy,
  onOpen,
}) {
  return (
    <>
      <p className="panel-intro">
        No installer app or Docker image. Choose Terminal or your coding agent,
        then copy the steps below. The scan stays on your computer.
      </p>
      <div className="publish-mode-tabs" aria-label="Choose setup path">
        <button
          type="button"
          className={installMode === "terminal" ? "active" : ""}
          onClick={() => setInstallMode("terminal")}
        >
          <TerminalIcon />
          Terminal
        </button>
        <button
          type="button"
          className={installMode === "agent" ? "active" : ""}
          onClick={() => setInstallMode("agent")}
        >
          Codex / agent
        </button>
      </div>
      {installMode === "terminal" ? (
        <div className="setup-route">
          <SetupBlock
            number="1"
            title="Run once — no manual download"
            description="Requires Node.js 20+. npx downloads the pinned open-source CLI from GitHub, runs the local scan, and writes one JSON file."
          >
            <CopyCommand
              value={RUN_ONCE_COMMAND}
              copyKey="run-once"
              copied={copied}
              onCopy={onCopy}
            />
          </SetupBlock>
          <SetupBlock
            number="OR"
            title="Install the stackprint command"
            description="Use this if you want stackprint available in Terminal after today."
          >
            <CopyCommand
              value={INSTALL_CLI_COMMAND}
              copyKey="install-cli"
              copied={copied}
              onCopy={onCopy}
              compact
            />
          </SetupBlock>
        </div>
      ) : (
        <div className="setup-route">
          <SetupBlock
            number="1"
            title="Install the CLI"
            description="The skill controls the safe workflow; the CLI performs the local scan."
          >
            <CopyCommand
              value={INSTALL_CLI_COMMAND}
              copyKey="agent-cli"
              copied={copied}
              onCopy={onCopy}
              compact
            />
          </SetupBlock>
          <SetupBlock
            number="2"
            title="Install the agent skill"
            description="This adds Stackprint’s privacy and approval rules to Codex and other supported agents."
          >
            <CopyCommand
              value={INSTALL_SKILL_COMMAND}
              copyKey="agent-skill"
              copied={copied}
              onCopy={onCopy}
              compact
            />
          </SetupBlock>
          <SetupBlock
            number="3"
            title="Paste this into a new task"
            description="The agent will stop at the review boundary and ask before publishing."
          >
            <CopyCommand
              value={AGENT_PROMPT}
              copyKey="agent-prompt"
              copied={copied}
              onCopy={onCopy}
              prompt
            />
          </SetupBlock>
        </div>
      )}
      <div className="install-links">
        <a
          href="https://github.com/mahidalhan/stackprint/releases/latest"
          target="_blank"
          rel="noreferrer"
        >
          Download release ↗
        </a>
        <a
          href="https://github.com/mahidalhan/stackprint"
          target="_blank"
          rel="noreferrer"
        >
          View source ↗
        </a>
        <a href="https://nodejs.org/en/download" target="_blank" rel="noreferrer">
          Get Node.js ↗
        </a>
      </div>
      <ol className="publish-steps">
        <li>
          <b>Scan locally</b>
          <span>Only installed app names and known CLI presence are read.</span>
        </li>
        <li>
          <b>Open it here</b>
          <span>Remove any tool you do not want on your profile.</span>
        </li>
        <li>
          <b>Publish deliberately</b>
          <span>The upload happens only after a separate public-consent step.</span>
        </li>
      </ol>
      <button className="upload-action" type="button" onClick={onOpen}>
        <UploadIcon />
        <span>Open Stackprint JSON</span>
      </button>
      <p className="panel-fineprint">
        The website is the public directory; the open-source CLI is the local
        scanner. Your raw machine profile stays local until you choose what to
        publish.
      </p>
    </>
  );
}

function SetupBlock({ number, title, description, children }) {
  return (
    <section className="setup-block">
      <span className="setup-number">{number}</span>
      <div className="setup-copy">
        <b>{title}</b>
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}

function CopyCommand({
  value,
  copyKey,
  copied,
  onCopy,
  compact = false,
  prompt = false,
}) {
  return (
    <button
      className={`command-box ${compact ? "compact" : ""} ${
        prompt ? "prompt-box" : ""
      }`}
      type="button"
      onClick={() => onCopy(value, copyKey)}
    >
      <code>{value}</code>
      <span>{copied === copyKey ? "COPIED" : "COPY"}</span>
    </button>
  );
}

function ReviewStep({
  identity,
  setIdentity,
  profile,
  selected,
  selectedCount,
  allCount,
  consent,
  setConsent,
  onToggle,
  onSelectAll,
  onBack,
  onPreview,
  onPublish,
  canPublish,
  publishing,
}) {
  return (
    <>
      <div className="review-summary">
        <span>PUBLIC PROFILE PREVIEW</span>
        <b>{selectedCount} tools selected</b>
        <button type="button" onClick={onSelectAll}>
          {selectedCount === allCount ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div className="identity-fields">
        <IdentityField
          label="Name"
          value={identity.name}
          placeholder="Your name"
          onChange={(name) => setIdentity({ ...identity, name })}
        />
        <IdentityField
          label="Handle"
          value={identity.handle}
          placeholder="@handle"
          onChange={(handle) => setIdentity({ ...identity, handle })}
        />
        <IdentityField
          label="What you build"
          value={identity.role}
          placeholder="Robotics builder"
          onChange={(role) => setIdentity({ ...identity, role })}
        />
        <IdentityField
          label="X handle (optional)"
          value={identity.xHandle}
          placeholder="@handle"
          onChange={(xHandle) => setIdentity({ ...identity, xHandle })}
        />
      </div>
      <div className="tool-review" aria-label="Tools selected for publishing">
        {profile.tools.map((group) => (
          <section key={group.name}>
            <h3>{group.name}</h3>
            {group.tools.map((tool) => {
              const key = toolKey(group.name, tool);
              return (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => onToggle(key)}
                  />
                  <span>{tool.name}</span>
                  <i>{tool.kind === "cli" ? "CLI" : "APP"}</i>
                </label>
              );
            })}
          </section>
        ))}
      </div>
      <label className="consent-check">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          I understand that my selected tool names and builder identity will be
          public at stackprint-builder.vercel.app.
        </span>
      </label>
      <div className="publish-actions">
        <button type="button" className="text-action" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="preview-action"
          onClick={onPreview}
          disabled={!selectedCount || publishing}
        >
          Preview first
        </button>
        <button
          type="button"
          className="upload-action"
          onClick={onPublish}
          disabled={!canPublish}
        >
          {publishing ? "Publishing…" : "Publish profile"}
        </button>
      </div>
    </>
  );
}

function SuccessStep({ result, copied, onCopy, onView }) {
  return (
    <div className="publish-success">
      <div className="success-mark" aria-hidden="true">
        <span>{result.profile.monogram}</span>
      </div>
      <p>
        {result.profile.count} selected tools are now in the public builder
        atlas. Your raw JSON file and system metadata were not uploaded.
      </p>
      <button
        className="command-box success-url"
        type="button"
        onClick={() => onCopy(result.url, "url")}
      >
        <code>{result.url}</code>
        <span>
          <CopyIcon />
          {copied === "url" ? "COPIED" : "COPY"}
        </span>
      </button>
      <button className="upload-action" type="button" onClick={onView}>
        View public profile
      </button>
      <p className="panel-fineprint">
        Published profile URLs are immutable in this first public version.
        Re-publishing creates a new reviewed profile.
      </p>
    </div>
  );
}

function IdentityField({ label, value, placeholder, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function toolKeyForSource(tool, fallbackKind) {
  const category = String(tool.category || "Other")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return toolKey(category, {
    name: String(tool.name || tool.command || "Unknown tool"),
    kind: tool.kind || fallbackKind,
  });
}
