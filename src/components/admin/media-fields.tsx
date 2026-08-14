"use client";

import { useId, useMemo, useState } from "react";
import {
  ChevronDown,
  ImageIcon,
  Library,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import {
  ProjectGalleryField,
  type ProjectGalleryMediaOption,
} from "@/components/admin/project-gallery-field";

export type AdminMediaOption = ProjectGalleryMediaOption;

export const MediaGalleryField = ProjectGalleryField;

type MediaFieldProps = {
  assets: AdminMediaOption[];
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  placeholder?: string;
  preferredCategories?: string[];
};

export function MediaImageField({
  assets,
  defaultValue,
  disabled,
  error,
  label,
  name,
  placeholder,
  preferredCategories,
}: MediaFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const visibleAssets = usePreferredAssets(assets, preferredCategories);

  return (
    <div className="block md:col-span-2" data-testid={`media-field-${name}`}>
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
          {label}
        </span>
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <input
            className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
            value={value}
            disabled={disabled}
            name={name}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
          />
          <div className="relative min-h-28 overflow-hidden border border-ink/10 bg-mist">
            {value ? (
              // Admin previews must tolerate local uploads, remote assets and SVGs.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div className="grid h-full min-h-28 place-items-center text-ink/45">
                <ImageIcon className="size-7" />
              </div>
            )}
          </div>
        </div>
      </label>

      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}

      <MediaAssetChooser
        assets={visibleAssets}
        disabled={disabled}
        emptyLabel="Subí una imagen en Biblioteca visual para poder seleccionarla acá."
        onChoose={(asset) => setValue(asset.url)}
        title="Elegir desde biblioteca"
      />
    </div>
  );
}

function usePreferredAssets(
  assets: AdminMediaOption[],
  preferredCategories: string[] = [],
) {
  return useMemo(() => {
    if (!preferredCategories.length) return assets;

    const preferred = assets.filter((asset) =>
      preferredCategories.includes(asset.category),
    );
    const fallback = assets.filter(
      (asset) => !preferredCategories.includes(asset.category),
    );

    return [...preferred, ...fallback];
  }, [assets, preferredCategories]);
}

function MediaAssetChooser({
  assets,
  disabled,
  emptyLabel,
  onChoose,
  title,
}: {
  assets: AdminMediaOption[];
  disabled: boolean;
  emptyLabel: string;
  onChoose: (asset: AdminMediaOption) => void;
  title: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const searchId = `media-search-${reactId}`;
  const categoryId = `media-category-${reactId}`;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(12);
  const [libraryAssets, setLibraryAssets] = useState(assets);
  const [searchingLibrary, setSearchingLibrary] = useState(false);
  const [librarySearchMessage, setLibrarySearchMessage] = useState("");
  const [librarySearchError, setLibrarySearchError] = useState("");
  const categories = useMemo(
    () =>
      Array.from(
        new Set(libraryAssets.map((asset) => asset.category).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right, "es")),
    [libraryAssets],
  );
  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");

    return libraryAssets.filter((asset) => {
      if (category !== "all" && asset.category !== category) return false;
      if (!normalizedQuery) return true;

      return [asset.title, asset.altText, asset.category, asset.url]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(normalizedQuery);
    });
  }, [libraryAssets, category, query]);
  const visibleAssets = filteredAssets.slice(0, visibleCount);

  function updateQuery(value: string) {
    setQuery(value);
    setVisibleCount(12);
    setLibrarySearchMessage("");
    setLibrarySearchError("");
  }

  function updateCategory(value: string) {
    setCategory(value);
    setVisibleCount(12);
    setLibrarySearchMessage("");
    setLibrarySearchError("");
  }

  async function searchEntireLibrary() {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2 || searchingLibrary) return;

    setSearchingLibrary(true);
    setLibrarySearchMessage("");
    setLibrarySearchError("");

    try {
      const params = new URLSearchParams({ q: normalizedQuery, take: "36" });
      if (category !== "all") params.set("category", category);
      const response = await fetch(`/api/admin/media?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            assets?: AdminMediaOption[];
            hasMore?: boolean;
            message?: string;
          }
        | null;
      if (!response.ok || !payload?.assets) {
        throw new Error(payload?.message || "No se pudo buscar en la biblioteca.");
      }

      setLibraryAssets((current) => {
        const merged = new Map(current.map((asset) => [asset.id, asset]));
        payload.assets?.forEach((asset) => merged.set(asset.id, asset));
        return [...merged.values()];
      });
      setVisibleCount(36);
      setLibrarySearchMessage(
        payload.assets.length
          ? `${payload.assets.length} coincidencia${payload.assets.length === 1 ? "" : "s"} encontrada${payload.assets.length === 1 ? "" : "s"} en toda la biblioteca${payload.hasMore ? "; refiná la búsqueda para ver más" : ""}.`
          : "No se encontraron coincidencias en toda la biblioteca.",
      );
    } catch (error) {
      setLibrarySearchError(
        error instanceof Error
          ? error.message
          : "No se pudo buscar en la biblioteca.",
      );
    } finally {
      setSearchingLibrary(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">
        <Library className="size-4 text-bronze" />
        {title}
      </div>
      {assets.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <label htmlFor={searchId} className="relative block">
              <span className="sr-only">Buscar imágenes en la biblioteca</span>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/48"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                disabled={disabled}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Buscar por nombre o descripción"
                className="h-11 w-full border border-ink/12 bg-white pl-11 pr-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist"
              />
            </label>
            <label htmlFor={categoryId} className="relative block">
              <span className="sr-only">Filtrar biblioteca por categoría</span>
              <select
                id={categoryId}
                value={category}
                disabled={disabled}
                onChange={(event) => updateCategory(event.target.value)}
                className="h-11 w-full appearance-none border border-ink/12 bg-white px-4 pr-10 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink/55"
                aria-hidden="true"
              />
            </label>
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink/68" aria-live="polite">
            {filteredAssets.length} {filteredAssets.length === 1 ? "resultado" : "resultados"}
          </p>

          {query.trim().length >= 2 ? (
            <div className="mt-3 flex flex-col gap-2 border border-ink/10 bg-mist/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-ink/68">
                La selección inicial prioriza recursos recientes. Buscá también
                entre todas las imágenes aprobadas.
              </p>
              <button
                type="button"
                disabled={disabled || searchingLibrary}
                onClick={searchEntireLibrary}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-ink/15 bg-white px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze disabled:cursor-not-allowed disabled:opacity-55"
              >
                {searchingLibrary ? (
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="size-3.5" aria-hidden="true" />
                )}
                {searchingLibrary ? "Buscando..." : "Buscar en toda la biblioteca"}
              </button>
            </div>
          ) : null}

          {librarySearchMessage ? (
            <p className="mt-3 text-sm text-olive" role="status">
              {librarySearchMessage}
            </p>
          ) : null}
          {librarySearchError ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {librarySearchError}
            </p>
          ) : null}

          {visibleAssets.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleAssets.map((asset) => (
                <article
                  key={asset.id}
                  className="grid grid-cols-[88px_minmax(0,1fr)] overflow-hidden border border-ink/10 bg-white"
                >
                  <div className="relative h-full min-h-24 bg-stone">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  </div>
                  <div className="grid min-w-0 gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {asset.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink/65">
                        {asset.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChoose(asset)}
                      className="inline-flex h-9 items-center justify-center gap-2 border border-ink/12 px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze disabled:cursor-not-allowed disabled:opacity-55"
                      aria-label={`Usar ${asset.title}`}
                    >
                      <Plus className="size-3.5" />
                      Usar imagen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 border border-dashed border-ink/15 bg-white px-4 py-4 text-sm text-ink/68">
              No hay imágenes que coincidan con la búsqueda y categoría elegidas.
            </p>
          )}

          {visibleAssets.length < filteredAssets.length ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setVisibleCount((current) => current + 12)}
              className="mt-4 inline-flex min-h-11 items-center justify-center border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze disabled:cursor-not-allowed disabled:opacity-55"
            >
              Mostrar {Math.min(12, filteredAssets.length - visibleAssets.length)} más
            </button>
          ) : null}
        </>
      ) : (
        <p className="border border-dashed border-ink/15 bg-white px-4 py-3 text-sm text-ink/68">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}
