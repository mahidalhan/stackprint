new Promise((resolve, reject) => {
  const delay = (ms) => new Promise((done) => setTimeout(done, ms));
  const waitFor = async (check, timeout = 10_000) => {
    const started = Date.now();
    while (!check()) {
      if (Date.now() - started > timeout) throw new Error("UI wait timed out");
      await delay(50);
    }
  };

  (async () => {
    await waitFor(() => document.querySelector(".profile-identity h1"));
    const labels = [
      ...document.querySelectorAll(".tool-source.public"),
    ].map((node) => node.textContent.trim());
    const disclosure =
      document.querySelector(".profile-identity .privacy-note")?.textContent ||
      "";
    const roleSource = document.querySelector(".role-evidence-link")?.href;

    if (!labels.length || labels.some((label) => label !== "PUBLIC MENTION")) {
      throw new Error("Automated profile contains a stronger evidence label");
    }
    if (
      !disclosure.includes("Automatically indexed") ||
      !disclosure.includes("public mention") ||
      !disclosure.includes("does not prove use or endorsement")
    ) {
      throw new Error("Automated-profile disclosure is missing");
    }
    if (roleSource !== "https://www.angelclub.com/resources") {
      throw new Error("Automated profile role source is not Angel Club");
    }

    resolve({
      heading: document.querySelector(".profile-identity h1").textContent,
      labels: [...new Set(labels)],
      disclosure: disclosure.trim(),
      roleSource,
    });
  })().catch(reject);
});
