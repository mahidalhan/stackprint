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
    await waitFor(
      () =>
        Number.parseInt(
          document.querySelector(".catalog-meta span")?.textContent,
          10,
        ) > 60 &&
        document.querySelectorAll(".builder-tile").length === 60,
    );
    const totalProfiles = Number.parseInt(
      document.querySelector(".catalog-meta span").textContent,
      10,
    );
    const initialCards = document.querySelectorAll(".builder-tile").length;
    const initialDetailRequests = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/data/builders/")).length;
    if (initialDetailRequests !== 0) {
      throw new Error("Full profile JSON was loaded before opening a profile");
    }
    [
      ...document.querySelectorAll(".filter-row button"),
    ].find((button) => button.textContent === "Investing").click();
    await waitFor(() => {
      const count = Number.parseInt(
        document.querySelector(".catalog-meta span").textContent,
        10,
      );
      return count > totalProfiles * 0.8;
    });
    const investingProfiles = Number.parseInt(
      document.querySelector(".catalog-meta span").textContent,
      10,
    );
    [
      ...document.querySelectorAll(".filter-row button"),
    ].find((button) => button.textContent === "All").click();
    await waitFor(
      () =>
        Number.parseInt(
          document.querySelector(".catalog-meta span").textContent,
          10,
        ) === totalProfiles,
    );
    document.querySelector(".catalog-more button").click();
    await waitFor(
      () => document.querySelectorAll(".builder-tile").length === 120,
    );
    const expandedCards = document.querySelectorAll(".builder-tile").length;
    const search = document.querySelector(".catalog .search-control input");
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    const searchStarted = performance.now();
    nativeSetter.call(search, "Naval");
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(
      () =>
        document.querySelectorAll(".builder-tile").length === 1 &&
        document.querySelector(".builder-tile h2")?.textContent ===
          "Naval Ravikant",
    );
    const searchMs = Math.round(performance.now() - searchStarted);
    document.querySelector(".builder-tile .tile-hit").click();
    await waitFor(
      () =>
        document.querySelector(".profile-identity h1")?.textContent ===
        "Naval Ravikant",
    );
    const detailRequests = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/data/builders/")).length;
    if (detailRequests !== 1) {
      throw new Error(`Expected one lazy profile request, found ${detailRequests}`);
    }

    const sourceLinks = [
      ...document.querySelectorAll(".evidence-mark"),
    ].map((link) => link.href);
    if (sourceLinks.length !== 5) {
      throw new Error(`Expected five Naval tool rows, found ${sourceLinks.length}`);
    }
    if (!document.querySelector(".role-evidence-link")) {
      throw new Error("Role evidence link is missing");
    }

    resolve({
      initialCards,
      initialDetailRequests,
      investingProfiles,
      expandedCards,
      totalProfiles,
      filteredCards: 1,
      searchMs,
      route: location.pathname,
      detailRequests,
      heading: document.querySelector(".profile-identity h1").textContent,
      sourceLinks,
      roleSource: document.querySelector(".role-evidence-link").href,
      resourceCount: performance.getEntriesByType("resource").length,
    });
  })().catch(reject);
});
