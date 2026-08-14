"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";

export function DeleteMediaButton({
  id,
  title,
  usageCount = 0,
  usageLabels = [],
}: {
  id: string;
  title: string;
  usageCount?: number;
  usageLabels?: string[];
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function deleteAsset() {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/media/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setError(result?.message || "No se pudo eliminar la imagen.");
        return;
      }

      setOpen(false);
      router.replace("/admin/media?deleted=1");
      router.refresh();
    } catch {
      setError("No se pudo eliminar la imagen. Revisa la conexion.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={usageCount > 0}
        onClick={() => {
          setError("");
          setOpen(true);
          requestAnimationFrame(() => cancelRef.current?.focus());
        }}
        className="inline-flex h-10 items-center justify-center gap-2 border border-red-300 px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/35"
      >
        <Trash2 className="size-4" />
        {usageCount > 0 ? "En uso" : "Eliminar"}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/62 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (!pending && event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-lg border border-paper/12 bg-paper p-5 text-ink shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center border border-red-300 bg-red-50 text-red-700">
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <h2 id={titleId} className="font-serif text-3xl leading-tight">
                    Eliminar imagen
                  </h2>
                  <p id={descriptionId} className="mt-2 text-sm leading-6 text-ink/72">
                    Vas a eliminar &quot;{title}&quot; de la biblioteca de
                    imágenes.
                  </p>
                  {usageLabels.length ? (
                    <p className="mt-2 text-sm leading-6 text-red-700">
                      Primero reemplazá esta imagen en: {usageLabels.slice(0, 3).join(", ")}.
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center border border-ink/10 text-ink/65 transition hover:border-bronze hover:text-bronze disabled:cursor-not-allowed disabled:opacity-55"
                aria-label="Cerrar confirmación"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 border border-bronze/20 bg-bronze/10 p-4 text-sm leading-6 text-ink/75">
              Esta acción puede afectar contenido publicado y quedará registrada
              en la actividad del panel.
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center border border-ink/15 px-4 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze disabled:cursor-not-allowed disabled:opacity-55"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={deleteAsset}
                aria-busy={pending}
                className="inline-flex h-10 items-center justify-center gap-2 border border-red-300 px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Trash2 className="size-4" />
                {pending ? "Eliminando..." : "Confirmar eliminación"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
