"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, UploadCloud } from "lucide-react";
import type { MediaActionState } from "@/lib/media-upload";
import {
  allowedMediaMimeTypes,
  formatMediaBytes,
  isAllowedMediaMimeType,
  mediaAssetCategories,
  mediaUploadMaxBytes,
} from "@/lib/media";

const initialState: MediaActionState = {
  errors: {},
  ok: false,
  message: "",
};

export function MediaUploadForm({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<MediaActionState>(initialState);
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const messagePath = useMemo(() => {
    const match = state.message.match(/Ruta:\s(.+)$/);
    return match?.[1] || "";
  }, [state.message]);

  return (
    <form
      className="premium-card grid gap-5 p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canManage || pending) return;

        const form = event.currentTarget;
        setPending(true);
        setState(initialState);

        try {
          const response = await fetch("/api/admin/media", {
            body: new FormData(form),
            method: "POST",
          });
          const result = (await response.json()) as MediaActionState;
          setState(result);
          if (response.ok) {
            form.reset();
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
            router.refresh();
          }
        } catch {
          setState({
            ok: false,
            message: "No se pudo subir la imagen. Revisá la conexión.",
          });
        } finally {
          setPending(false);
        }
      }}
    >
      {state.message ? (
        <div
          role="status"
          className={`border px-4 py-3 text-sm ${
            state.ok
              ? "border-olive/30 bg-olive/10 text-ink"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          <p>{state.message}</p>
          {messagePath ? (
            <code className="mt-2 block overflow-x-auto bg-white/70 px-3 py-2 text-xs text-ink">
              {messagePath}
            </code>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <label className="group relative grid min-h-72 cursor-pointer place-items-center overflow-hidden border border-dashed border-ink/20 bg-mist text-center transition hover:border-bronze">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Preview de imagen seleccionada"
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <span className="grid gap-3 px-6">
              <span className="mx-auto grid size-14 place-items-center border border-bronze/30 bg-bronze/10 text-bronze">
                <ImagePlus className="size-6" />
              </span>
              <span className="font-serif text-2xl text-ink">
                Seleccioná una imagen
              </span>
              <span className="text-sm leading-6 text-ink/65">
                JPG, PNG, WebP o AVIF. Máximo {formatMediaBytes(mediaUploadMaxBytes)}.
              </span>
            </span>
          )}
          <input
            type="file"
            name="file"
            accept={allowedMediaMimeTypes.join(",")}
            disabled={!canManage || pending}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              if (!file) {
                setPreviewUrl("");
                return;
              }

              if (!isAllowedMediaMimeType(file.type)) {
                setPreviewUrl("");
                setState({
                  errors: { file: ["Usá JPG, PNG, WebP o AVIF."] },
                  message: "Formato no permitido.",
                  ok: false,
                });
                event.target.value = "";
                return;
              }

              if (file.size > mediaUploadMaxBytes) {
                setPreviewUrl("");
                setState({
                  errors: {
                    file: [
                      `Subí una imagen de hasta ${formatMediaBytes(mediaUploadMaxBytes)}.`,
                    ],
                  },
                  message: "La imagen supera el máximo permitido.",
                  ok: false,
                });
                event.target.value = "";
                return;
              }

              setState((current) => ({
                ...current,
                errors: { ...current.errors, file: undefined },
                message: current.ok ? current.message : "",
              }));
              setPreviewUrl(URL.createObjectURL(file));
            }}
          />
        </label>

        <div className="grid gap-4">
          <TextField
            disabled={!canManage || pending}
            error={state.errors?.title?.[0]}
            label="Título interno"
            name="title"
            placeholder="Casa Patio Norte - galería final"
          />
          <TextField
            disabled={!canManage || pending}
            error={state.errors?.altText?.[0]}
            label="Alt text"
            name="altText"
            placeholder="Vivienda contemporánea con patio, galería y grandes ventanales"
          />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
              Categoría
            </span>
            <select
              name="category"
              disabled={!canManage || pending}
              className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
            >
              {mediaAssetCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {state.errors?.category?.[0] ? (
              <span className="mt-2 block text-xs text-red-700">
                {state.errors.category[0]}
              </span>
            ) : null}
          </label>
          <TextField
            disabled={!canManage || pending}
            error={state.errors?.sourceUrl?.[0]}
            label="URL de origen"
            name="sourceUrl"
            placeholder="https://sitio-del-autor.com/recurso"
            type="url"
          />
          <TextareaField
            disabled={!canManage || pending}
            error={state.errors?.rightsNote?.[0]}
            label="Nota de licencia o derechos"
            name="rightsNote"
            placeholder="Autoría propia, licencia adquirida, cesión o permiso de uso"
          />
          <label className="flex items-start gap-3 border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink">
            <input
              className="mt-1 size-4 shrink-0 accent-bronze"
              disabled={!canManage || pending}
              name="rightsApproved"
              type="checkbox"
              value="true"
            />
            <span>
              <strong className="block">Autorizar para uso público</strong>
              La aprobación registrará tu identidad y la fecha actual. Requiere una nota de derechos.
            </span>
          </label>

          {state.errors?.file?.[0] ? (
            <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.errors.file[0]}
            </p>
          ) : null}

          <p className="text-xs leading-5 text-ink/68">
            Podés cargar el recurso sin aprobarlo y completar la evidencia más
            adelante desde la biblioteca.
          </p>

          <button
            type="submit"
            disabled={!canManage || pending}
            className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud className="size-4" />
            {pending ? "Subiendo imagen..." : "Subir imagen"}
          </button>
        </div>
      </div>
    </form>
  );
}

function TextField({
  disabled,
  error,
  label,
  name,
  placeholder,
  type = "text",
}: {
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: "text" | "url";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        type={type}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function TextareaField({
  disabled,
  error,
  label,
  name,
  placeholder,
}: {
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <textarea
        aria-invalid={Boolean(error)}
        className="min-h-28 w-full resize-y border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        disabled={disabled}
        name={name}
        placeholder={placeholder}
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
