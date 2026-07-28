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
    document.querySelector(".primary-action")?.click();
    await waitFor(() => document.querySelector("#publish-title"));
    if (new URLSearchParams(location.search).has("agent")) {
      [...document.querySelectorAll(".publish-mode-tabs button")]
        .find((button) => button.textContent.includes("Codex"))
        ?.click();
      await waitFor(
        () => document.querySelectorAll(".setup-route .command-box").length === 3,
      );
    }

    const commands = [...document.querySelectorAll(".setup-route code")].map(
      (node) => node.textContent.trim(),
    );
    const links = [...document.querySelectorAll(".install-links a")].map(
      (node) => ({ text: node.textContent.trim(), href: node.href }),
    );

    // Let the drawer's entrance animation finish before screenshots are taken.
    await delay(300);

    resolve({
      heading: document.querySelector("#publish-title")?.textContent.trim(),
      activeMode: document
        .querySelector(".publish-mode-tabs button.active")
        ?.textContent.trim(),
      commands,
      links,
      hasVersionPin: commands.every(
        (command) =>
          !command.includes("github:mahidalhan/stackprint") ||
          command.includes("#v0.3.1"),
      ),
    });
  })().catch(reject);
});
