new Promise((resolve, reject) => {
  const delay = (ms) => new Promise((done) => setTimeout(done, ms));
  const waitFor = async (check, timeout = 15_000) => {
    const started = Date.now();
    while (!check()) {
      if (Date.now() - started > timeout) throw new Error("UI wait timed out");
      await delay(75);
    }
  };
  const setValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  (async () => {
    document.querySelector(".primary-action")?.click();
    await waitFor(() => document.querySelector('input[type="file"]'));

    const payload = {
      schema_version: "1.0",
      generated_at: "2026-07-28T00:00:00.000Z",
      privacy: { scan_mode: "standard" },
      summary: {
        detected_tools: 3,
        categories: 3,
        builder_signals: ["AI-assisted builder", "Design-enabled builder"],
      },
      apps: [
        { name: "Figma", kind: "app", category: "design" },
        { name: "Cursor", kind: "app", category: "ai-assistants" },
      ],
      cli: [
        {
          name: "Node.js",
          kind: "cli",
          category: "language-runtimes",
        },
      ],
    };
    const file = new File([JSON.stringify(payload)], "stackprint-profile.json", {
      type: "application/json",
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: transfer.files,
    });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await waitFor(() => document.querySelector(".tool-review"));
    const fields = [...document.querySelectorAll(".identity-fields input")];
    ["Stackprint E2E", "@stackprint-e2e", "Verification builder", ""].forEach(
      (value, index) => setValue(fields[index], value),
    );

    const figma = [...document.querySelectorAll(".tool-review label")].find(
      (label) => label.textContent.includes("Figma"),
    );
    figma?.querySelector("input")?.click();
    const consent = document.querySelector(".consent-check input");
    consent?.click();

    const publishButton = [...document.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === "Publish profile",
    );
    if (publishButton?.disabled) {
      throw new Error("Publish button remained disabled");
    }
    publishButton?.click();

    await waitFor(() => document.querySelector(".publish-success"), 20_000);
    const successUrl =
      document.querySelector(".success-url code")?.textContent.trim() || "";
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent.includes("View public profile"))
      ?.click();
    await waitFor(() => location.pathname === "/b/stackprint-e2e");
    await waitFor(
      () =>
        document.querySelector(".profile-identity h1")?.textContent ===
        "Stackprint E2E",
    );

    const persistedResponse = await fetch(
      "/api/profiles?slug=stackprint-e2e",
      { headers: { Accept: "application/json" } },
    );
    const persisted = await persistedResponse.json();
    const renderedSignals = [...document.querySelectorAll(".signals .signal p")].map(
      (item) => item.textContent.trim(),
    );
    if (
      renderedSignals.some((signal) => signal.includes("Design-enabled")) ||
      persisted.profile?.signals?.includes("Design-enabled builder")
    ) {
      throw new Error("A signal from the deselected Figma tool leaked publicly");
    }
    resolve({
      pathname: location.pathname,
      heading: document.querySelector(".profile-identity h1")?.textContent,
      renderedTools: [...document.querySelectorAll(".tool-name")].map(
        (item) => item.textContent,
      ),
      persistedStatus: persistedResponse.status,
      persistedTools: persisted.profile?.toolNames,
      renderedSignals,
      persistedSignals: persisted.profile?.signals,
      publishedUrl: successUrl,
      consoleErrors: [],
    });
  })().catch(reject);
});
