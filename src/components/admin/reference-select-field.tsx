"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import {
  deduplicateAdminReferenceOptions,
  type AdminReferenceKind,
  type AdminReferenceOption,
} from "@/lib/admin-reference";

type ReferenceSelectFieldProps = {
  allowEmpty?: boolean;
  defaultValue: string;
  disabled: boolean;
  emptyLabel?: string;
  error?: string;
  label: string;
  name: string;
  options: AdminReferenceOption[];
  referenceType: AdminReferenceKind;
};

export function ReferenceSelectField({
  allowEmpty = true,
  defaultValue,
  disabled,
  emptyLabel = "Sin relación específica",
  error,
  label,
  name,
  options: initialOptions,
  referenceType,
}: ReferenceSelectFieldProps) {
  const reactId = useId().replace(/:/g, "");
  const searchId = `${name}-search-${reactId}`;
  const selectId = `${name}-select-${reactId}`;
  const statusId = `${name}-status-${reactId}`;
  const errorId = `${name}-error-${reactId}`;
  const [options, setOptions] = useState(initialOptions);
  const [query, setQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2 || disabled) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
          take: "30",
          type: referenceType,
        });
        if (selectedValue) params.set("selectedId", selectedValue);
        const response = await fetch(`/api/admin/references?${params}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | { message?: string; options?: AdminReferenceOption[] }
          | null;
        if (!response.ok || !payload?.options) {
          throw new Error(payload?.message || "No se pudo completar la búsqueda.");
        }
        setOptions((current) =>
          deduplicateAdminReferenceOptions([...current, ...payload.options!]),
        );
      } catch (caughtError) {
        if (controller.signal.aborted) return;
        setSearchError(
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo completar la búsqueda.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [disabled, query, referenceType, selectedValue]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return options;

    const matches = options.filter((option) =>
      `${option.label} ${option.meta || ""}`
        .toLocaleLowerCase("es")
        .includes(normalizedQuery),
    );
    const selected = options.find((option) => option.id === selectedValue);
    return selected
      ? deduplicateAdminReferenceOptions([selected, ...matches])
      : matches;
  }, [options, query, selectedValue]);

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </legend>
      <label htmlFor={searchId} className="relative block">
        <span className="sr-only">Buscar en {label.toLocaleLowerCase("es")}</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45"
          aria-hidden="true"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Buscar ${referenceType === "services" ? "servicio" : "proyecto"}`}
          className="h-11 w-full border border-b-0 border-ink/12 bg-mist/60 pl-11 pr-10 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:text-ink/55"
          aria-describedby={statusId}
        />
        {loading ? (
          <LoaderCircle
            className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-bronze"
            aria-label="Buscando"
          />
        ) : null}
      </label>
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        value={selectedValue}
        onChange={(event) => setSelectedValue(event.target.value)}
        aria-describedby={`${statusId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(error)}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {filteredOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}{option.meta ? ` · ${option.meta}` : ""}
          </option>
        ))}
      </select>
      <p id={statusId} className="mt-2 text-xs leading-5 text-ink/60" aria-live="polite">
        {searchError
          ? searchError
          : query.trim().length
            ? `${filteredOptions.length} coincidencia${filteredOptions.length === 1 ? "" : "s"}`
            : "Escribí al menos dos caracteres para buscar en todos los registros."}
      </p>
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
