"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function PwaManager() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateNetworkStatus = () => setIsOnline(navigator.onLine);
    const registerServiceWorker = () => {
      void navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch(() => undefined);
    };

    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        window.addEventListener("load", registerServiceWorker, { once: true });
      }
    } else if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-status"
      className="pointer-events-none fixed inset-x-0 top-[calc(5rem+env(safe-area-inset-top))] z-[70] border-y border-bronze-light/30 bg-graphite px-5 py-3 text-paper shadow-premium"
    >
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-sm font-semibold">
        <WifiOff className="size-4 shrink-0 text-bronze-light" aria-hidden="true" />
        Sin conexión. Lo que completes seguirá en pantalla y podrás enviarlo
        cuando vuelva internet.
      </p>
    </div>
  );
}
