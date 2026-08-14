(() => {
  const status = document.querySelector("[data-recovery-status]");
  const retryButton = document.querySelector("[data-retry-button]");
  const targetPath =
    window.location.pathname === "/offline.html"
      ? "/"
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  let retrying = false;

  async function recover() {
    if (retrying) return;
    retrying = true;

    if (status) status.textContent = "Comprobando conexión...";
    if (retryButton instanceof HTMLButtonElement) retryButton.disabled = true;

    try {
      const response = await fetch(`/api/health?recovery=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Site unavailable");
      window.location.replace(targetPath);
    } catch {
      if (status) {
        status.textContent =
          "Todavía no pudimos conectar. Volveremos a intentar automáticamente.";
      }
      retrying = false;
      if (retryButton instanceof HTMLButtonElement) retryButton.disabled = false;
    }
  }

  retryButton?.addEventListener("click", (event) => {
    event.preventDefault();
    void recover();
  });
  window.addEventListener("online", () => void recover());
  window.setInterval(() => void recover(), 4_000);
})();
