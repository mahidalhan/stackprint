new Promise((resolve, reject) => {
  const delay = (ms) => new Promise((done) => setTimeout(done, ms));

  (async () => {
    document.querySelector(".primary-action")?.click();
    await delay(30);

    const fields = [...document.querySelectorAll(".identity-fields input")];
    const values = ["Test Builder", "@testbuilder", "Tool maker", "@testbuilder"];
    fields.forEach((field, index) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(field, values[index]);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const payload = {
      summary: {
        detected_tools: 3,
        categories: 2,
        builder_signals: ["AI-assisted builder"],
      },
      apps: [
        { name: "Figma", kind: "app", category: "design" },
        { name: "Cursor", kind: "app", category: "ai-assistants" },
      ],
      cli: [{ name: "Node.js", kind: "cli", category: "runtimes" }],
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

    await delay(120);
    resolve({
      pathname: location.pathname,
      heading: document.querySelector(".profile-identity h1")?.textContent,
      tools: [...document.querySelectorAll(".tool-name")].map(
        (item) => item.textContent,
      ),
      privacy: document.querySelector(".privacy-note")?.textContent.trim(),
      xHref: document.querySelector(".x-link")?.href,
    });
  })().catch(reject);
});
