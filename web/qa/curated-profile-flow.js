new Promise((resolve, reject) => {
  const delay = (ms) => new Promise((done) => setTimeout(done, ms));
  const waitFor = async (check, timeout = 8_000) => {
    const started = Date.now();
    while (!check()) {
      if (Date.now() - started > timeout) throw new Error("UI wait timed out");
      await delay(50);
    }
  };

  (async () => {
    await waitFor(() => document.querySelector(".profile-identity h1"));
    const evidence = [...document.querySelectorAll(".evidence-mark")].map(
      (link) => link.href,
    );
    const disclosure =
      document.querySelector(".profile-identity .privacy-note")?.textContent ||
      "";

    if (!disclosure.includes("not prove current use or endorsement")) {
      throw new Error("Curated-profile disclosure is missing");
    }
    if (!evidence.length || evidence.some((url) => !url.startsWith("https://x.com/"))) {
      throw new Error("Curated tool evidence links are missing");
    }

    resolve({
      heading: document.querySelector(".profile-identity h1")?.textContent,
      count: document.querySelector(".profile-count")?.textContent.trim(),
      evidenceLabels: [...document.querySelectorAll(".tool-source.public")].map(
        (node) => node.textContent.trim(),
      ),
      evidence,
      disclosure: disclosure.trim(),
    });
  })().catch(reject);
});
