new Promise((resolve, reject) => {
  const delay = (ms) => new Promise((done) => setTimeout(done, ms));
  const waitFor = async (check, timeout = 8_000) => {
    const started = Date.now();
    while (!check()) {
      if (Date.now() - started > timeout) throw new Error("UI wait timed out");
      await delay(50);
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
        builder_signals: ["AI-assisted builder"],
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
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([JSON.stringify(payload)], "stackprint-profile.json", {
        type: "application/json",
      }),
    );
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
    document.querySelector(".consent-check input")?.click();
    if (new URLSearchParams(location.search).has("bottom")) {
      const panel = document.querySelector(".import-panel");
      panel.scrollTop = panel.scrollHeight;
      await delay(100);
    }
    resolve({
      heading: document.querySelector("#publish-title")?.textContent,
      selected: document.querySelector(".review-summary b")?.textContent,
      publishDisabled: [...document.querySelectorAll("button")].find(
        (button) => button.textContent.trim() === "Publish profile",
      )?.disabled,
    });
  })().catch(reject);
});
