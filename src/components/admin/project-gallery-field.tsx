"use client";

import type React from "react";
import { useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Images,
  Library,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  parseProjectGallery,
  projectGalleryTypes,
  serializeProjectGallery,
  type ProjectGalleryEditorItem,
  type ProjectGalleryType,
} from "@/lib/project-gallery-editor";

export type ProjectGalleryMediaOption = {
  altText: string;
  category: string;
  id: string;
  title: string;
  url: string;
};

const galleryTypeLabels: Record<ProjectGalleryType, string> = {
  after: "Después",
  before: "Antes",
  final: "Resultado final",
  plan: "Plano",
  process: "Proceso",
  render: "Render",
};

export function ProjectGalleryField({
  assets,
  defaultValue,
  disabled,
  error,
  hint,
  label,
  name,
}: {
  assets: ProjectGalleryMediaOption[];
  defaultValue: string;
  disabled: boolean;
  error?: string;
  hint?: string;
  label: string;
  name: string;
}) {
  const reactId = useId();
  const fieldId = `project-gallery-${reactId.replace(/:/g, "")}`;
  const nextItemId = useRef(parseProjectGallery(defaultValue).length + 1);
  const [items, setItems] = useState<ProjectGalleryEditorItem[]>(() =>
    parseProjectGallery(defaultValue),
  );
  const [announcement, setAnnouncement] = useState("");
  const [failedPreviews, setFailedPreviews] = useState<Set<string>>(
    () => new Set(),
  );
  const [libraryQuery, setLibraryQuery] = useState("");
  const [touchedUrls, setTouchedUrls] = useState<Set<string>>(() => new Set());

  const serializedValue = useMemo(
    () => serializeProjectGallery(items),
    [items],
  );
  const visibleAssets = useMemo(() => {
    const query = libraryQuery.trim().toLocaleLowerCase("es");
    if (!query) return assets.slice(0, 24);

    return assets
      .filter((asset) =>
        [asset.title, asset.altText, asset.category, asset.url]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(query),
      )
      .slice(0, 24);
  }, [assets, libraryQuery]);

  function createItem(
    values: Pick<
      ProjectGalleryEditorItem,
      "altText" | "caption" | "type" | "url"
    >,
  ) {
    const id = `gallery-new-${nextItemId.current}`;
    nextItemId.current += 1;
    return { id, ...values };
  }

  function focusItemUrl(id: string) {
    window.setTimeout(() => {
      document.getElementById(`${fieldId}-${id}-url`)?.focus();
    }, 0);
  }

  function addEmptyItem() {
    const item = createItem({
      altText: "",
      caption: "",
      type: "final",
      url: "",
    });
    setItems((current) => [...current, item]);
    setAnnouncement(`Imagen ${items.length + 1} agregada. Completá su URL.`);
    focusItemUrl(item.id);
  }

  function addLibraryAsset(asset: ProjectGalleryMediaOption) {
    const item = createItem({
      altText: asset.altText || asset.title,
      caption: asset.title,
      type: "final",
      url: asset.url,
    });
    setItems((current) => [...current, item]);
    setAnnouncement(`${asset.title} se agregó al final de la galería.`);
    focusItemUrl(item.id);
  }

  function updateItem(
    id: string,
    updates: Partial<
      Pick<
        ProjectGalleryEditorItem,
        "altText" | "caption" | "type" | "url"
      >
    >,
  ) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
    if (updates.url !== undefined) {
      setFailedPreviews((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    setItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setAnnouncement(
      `Imagen ${index + 1} movida a la posición ${nextIndex + 1}.`,
    );
  }

  function removeItem(index: number) {
    const item = items[index];
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setAnnouncement(
      `${item.caption || item.altText || `Imagen ${index + 1}`} eliminada de la galería.`,
    );
    setFailedPreviews((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  const descriptionIds = [
    hint ? `${fieldId}-hint` : "",
    error ? `${fieldId}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      className="min-w-0 md:col-span-2"
      data-testid={`media-gallery-${name}`}
      aria-describedby={descriptionIds || undefined}
      aria-invalid={Boolean(error)}
      disabled={disabled}
    >
      <legend className="sr-only">{label}</legend>
      <textarea
        data-testid={`${name}-serialized-value`}
        hidden
        name={name}
        readOnly
        value={serializedValue}
      />

      <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            aria-hidden="true"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/75"
          >
            {label}
          </p>
          {hint ? (
            <p id={`${fieldId}-hint`} className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
              {hint}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">
            {items.length} {items.length === 1 ? "imagen" : "imágenes"}
          </span>
          <button
            type="button"
            onClick={addEmptyItem}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Plus className="size-4" />
            Agregar imagen
          </button>
        </div>
      </div>

      {error ? (
        <div
          id={`${fieldId}-error`}
          className="mt-4 flex items-start gap-2 border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {items.length ? (
        <ol className="mt-5 grid gap-4" aria-label="Imágenes de la galería">
          {items.map((item, index) => {
            const urlIsMissing = touchedUrls.has(item.id) && !item.url.trim();
            const previewFailed = failedPreviews.has(item.id);
            const itemTitle = `Imagen ${index + 1}`;

            return (
              <li
                key={item.id}
                className="border border-ink/12 bg-white p-4 shadow-[0_14px_36px_rgba(31,32,27,0.05)] sm:p-5"
                aria-labelledby={`${fieldId}-${item.id}-title`}
              >
                <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <div className="relative aspect-[4/3] overflow-hidden border border-ink/10 bg-mist">
                      {item.url.trim() && !previewFailed ? (
                        // Admin previews must support local and configured remote assets.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                          onError={() =>
                            setFailedPreviews((current) =>
                              new Set(current).add(item.id),
                            )
                          }
                        />
                      ) : (
                        <div className="grid size-full place-items-center px-5 text-center text-ink/68">
                          <div>
                            <ImageIcon className="mx-auto size-7" />
                            <p className="mt-2 text-xs leading-5">
                              {previewFailed
                                ? "No se pudo cargar la vista previa. Revisá la URL."
                                : "La vista previa aparecerá al cargar una URL."}
                            </p>
                          </div>
                        </div>
                      )}
                      <span className="absolute left-3 top-3 bg-ink px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-paper">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p
                        id={`${fieldId}-${item.id}-title`}
                        className="truncate text-sm font-semibold text-ink"
                      >
                        {item.caption || item.altText || itemTitle}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton
                          disabled={disabled || index === 0}
                          label={`Mover ${itemTitle} hacia arriba`}
                          onClick={() => moveItem(index, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </IconButton>
                        <IconButton
                          disabled={disabled || index === items.length - 1}
                          label={`Mover ${itemTitle} hacia abajo`}
                          onClick={() => moveItem(index, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </IconButton>
                        <IconButton
                          destructive
                          disabled={disabled}
                          label={`Eliminar ${itemTitle}`}
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="block min-w-0 sm:col-span-2">
                      <FieldLabel htmlFor={`${fieldId}-${item.id}-url`}>
                        URL o ruta pública
                      </FieldLabel>
                      <input
                        id={`${fieldId}-${item.id}-url`}
                        type="text"
                        required
                        value={item.url}
                        onBlur={() =>
                          setTouchedUrls((current) =>
                            new Set(current).add(item.id),
                          )
                        }
                        onChange={(event) =>
                          updateItem(item.id, { url: event.target.value })
                        }
                        aria-invalid={urlIsMissing}
                        aria-describedby={
                          urlIsMissing
                            ? `${fieldId}-${item.id}-url-error`
                            : undefined
                        }
                        className="h-12 w-full min-w-0 border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 aria-[invalid=true]:border-red-400"
                      />
                      {urlIsMissing ? (
                        <span
                          id={`${fieldId}-${item.id}-url-error`}
                          className="mt-2 block text-xs text-red-700"
                        >
                          Cargá una URL o elegí una imagen de la biblioteca.
                        </span>
                      ) : null}
                    </div>

                    <div className="block min-w-0">
                      <FieldLabel htmlFor={`${fieldId}-${item.id}-type`}>
                        Tipo
                      </FieldLabel>
                      <select
                        id={`${fieldId}-${item.id}-type`}
                        value={item.type}
                        onChange={(event) =>
                          updateItem(item.id, {
                            type: event.target.value as ProjectGalleryType,
                          })
                        }
                        className="h-12 w-full min-w-0 border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
                      >
                        {projectGalleryTypes.map((type) => (
                          <option key={type} value={type}>
                            {galleryTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="block min-w-0">
                      <FieldLabel htmlFor={`${fieldId}-${item.id}-alt`}>
                        Texto alternativo
                      </FieldLabel>
                      <input
                        id={`${fieldId}-${item.id}-alt`}
                        type="text"
                        value={item.altText}
                        onChange={(event) =>
                          updateItem(item.id, { altText: event.target.value })
                        }
                        placeholder="Ej.: Cocina después de la remodelación"
                        className="h-12 w-full min-w-0 border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
                      />
                    </div>

                    <div className="block min-w-0 sm:col-span-2">
                      <FieldLabel htmlFor={`${fieldId}-${item.id}-caption`}>
                        Descripción breve
                      </FieldLabel>
                      <textarea
                        id={`${fieldId}-${item.id}-caption`}
                        value={item.caption}
                        onChange={(event) =>
                          updateItem(item.id, { caption: event.target.value })
                        }
                        rows={2}
                        placeholder="Qué muestra esta imagen y por qué es relevante."
                        className="min-h-20 w-full min-w-0 resize-y border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-5 border border-dashed border-ink/20 bg-mist px-5 py-10 text-center">
          <Images className="mx-auto size-8 text-bronze" />
          <p className="mt-3 font-serif text-2xl text-ink">La galería está vacía</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink/65">
            Agregá una URL o elegí una imagen aprobada. El orden de esta lista será el orden público del proyecto.
          </p>
          <button
            type="button"
            onClick={addEmptyItem}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Plus className="size-4" />
            Agregar primera imagen
          </button>
        </div>
      )}

      <details className="mt-5 border border-ink/12 bg-mist open:bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 text-sm font-semibold text-ink marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bronze sm:px-5">
          <Library className="size-4 text-bronze" />
          Agregar desde la biblioteca aprobada
          <span className="ml-auto text-xs font-normal text-ink/55">
            {assets.length} disponibles
          </span>
        </summary>
        <div className="border-t border-ink/10 p-4 sm:p-5">
          {assets.length ? (
            <>
              <label className="relative block max-w-xl">
                <span className="sr-only">Buscar en la biblioteca aprobada</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45" />
                <input
                  type="search"
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder="Buscar por nombre, categoría o descripción"
                  className="h-12 w-full border border-ink/12 bg-white pl-11 pr-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
                />
              </label>

              {visibleAssets.length ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleAssets.map((asset) => (
                    <li
                      key={asset.id}
                      className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] overflow-hidden border border-ink/10 bg-white"
                    >
                      <div className="relative min-h-24 bg-stone">
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
                          <p className="mt-1 truncate text-xs text-ink/60">
                            {asset.category}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addLibraryAsset(asset)}
                          className="inline-flex min-h-9 items-center justify-center gap-2 border border-ink/12 px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze disabled:cursor-not-allowed disabled:opacity-55"
                          aria-label={`Agregar ${asset.title} a la galería`}
                        >
                          <Plus className="size-3.5" />
                          Agregar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border border-dashed border-ink/15 bg-white px-4 py-5 text-sm text-ink/65">
                  No hay imágenes que coincidan con “{libraryQuery}”.
                </p>
              )}
            </>
          ) : (
            <p className="border border-dashed border-ink/15 bg-white px-4 py-5 text-sm leading-6 text-ink/65">
              Todavía no hay imágenes aprobadas. Podés cargar una URL manualmente o revisar la Biblioteca visual.
            </p>
          )}
        </div>
      </details>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </fieldset>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink/70"
    >
      {children}
    </label>
  );
}

function IconButton({
  children,
  destructive = false,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-10 place-items-center border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35 ${
        destructive
          ? "border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50"
          : "border-ink/12 text-ink/70 hover:border-bronze hover:text-bronze"
      }`}
    >
      {children}
    </button>
  );
}
