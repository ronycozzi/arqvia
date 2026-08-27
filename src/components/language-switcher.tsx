"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { useAppLocale } from "@/components/i18n-provider";
import type { AppLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  compact = false,
  theme = "dark",
}: {
  compact?: boolean;
  theme?: "dark" | "light";
}) {
  const locale = useAppLocale();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const dark = theme === "dark";
  const label = locale === "en" ? "Language" : "Idioma";

  const selectLocale = async (nextLocale: AppLocale) => {
    if (nextLocale === locale || pending) return;

    setError(false);
    setPending(true);
    try {
      const response = await fetch("/api/locale", {
        body: JSON.stringify({ locale: nextLocale }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("Locale preference was not saved");
      window.location.reload();
    } catch {
      setError(true);
      setPending(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compact ? "justify-between" : "flex-wrap",
      )}
      aria-label={label}
      aria-busy={pending}
      data-no-translate
      role="group"
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 text-xs font-semibold uppercase",
          dark ? "text-paper/62" : "text-ink/62",
        )}
      >
        <Languages className="size-4" aria-hidden="true" />
        {!compact ? label : null}
      </span>
      <span
        className={cn(
          "grid grid-cols-2 border p-1",
          dark ? "border-paper/16 bg-paper/[0.035]" : "border-ink/12 bg-white/60",
        )}
      >
        {(["es", "en"] as const).map((option) => {
          const active = locale === option;
          const optionLabel = option === "es" ? "Español" : "English";

          return (
            <button
              key={option}
              type="button"
              aria-label={`${locale === "en" ? "Switch to" : "Cambiar a"} ${optionLabel}`}
              aria-pressed={active}
              data-locale-option={option}
              lang={option}
              onClick={() => selectLocale(option)}
              disabled={pending}
              className={cn(
                "grid min-h-9 min-w-11 place-items-center px-2 text-xs font-bold transition duration-200",
                pending && "cursor-wait opacity-60",
                active
                  ? dark
                    ? "bg-paper text-ink"
                    : "bg-ink text-paper"
                  : dark
                    ? "text-paper/62 hover:bg-paper/8 hover:text-paper"
                    : "text-ink/55 hover:bg-ink/6 hover:text-ink",
              )}
            >
              {option.toUpperCase()}
            </button>
          );
        })}
      </span>
      {error ? (
        <span className={cn("basis-full text-xs", dark ? "text-red-200" : "text-error")}>
          No se pudo cambiar el idioma. Intentá nuevamente.
        </span>
      ) : null}
    </div>
  );
}
