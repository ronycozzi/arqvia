"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cloneElement, type ReactElement, useId, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldErrors,
  type UseFormRegister,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { trackEvent } from "@/lib/analytics";
import {
  type EstimateSelection,
} from "@/lib/estimator";
import {
  formatAttachmentBytes,
  leadAttachmentAllowedMimeTypes,
  leadAttachmentMaxBytes,
  leadAttachmentMaxFiles,
  leadAttachmentMaxTotalBytes,
} from "@/lib/lead-attachment-config";
import { leadSchema, type LeadInput } from "@/lib/validations";
import type { z } from "zod";

type LeadFormValues = z.input<typeof leadSchema>;

const projectTypes = [
  "Obra nueva",
  "Remodelación",
  "Ampliación",
  "Diseño interior",
  "Local comercial",
  "Oficina",
  "Otro",
];

const currentStatuses = [
  "Tengo una idea",
  "Tengo terreno",
  "Tengo planos",
  "Ya empecé la obra",
  "Necesito remodelar un espacio existente",
];

const budgetRanges = [
  "A definir",
  "Hasta USD 10.000",
  "USD 10.000 - 30.000",
  "USD 30.000 - 80.000",
  "Más de USD 80.000",
  "Prefiero conversarlo",
];

export function QuoteForm({
  sourcePage,
  compact = false,
  initialEstimate,
}: {
  sourcePage: string;
  compact?: boolean;
  initialEstimate?: EstimateSelection;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [started, setStarted] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      sourcePage,
      projectType: initialEstimate?.ruleLabel || "",
      areaM2: initialEstimate ? `${initialEstimate.areaM2} m²` : "",
      budgetRange: "",
      estimateRuleId: initialEstimate?.ruleId || "",
      estimateTier: initialEstimate?.tier,
      estimateAreaM2: initialEstimate?.areaM2,
      estimateConfigVersion: initialEstimate?.configVersion,
      needsVisit: false,
      visitPreferredWindow: "FLEXIBLE",
      hasPlans: false,
      website: "",
    },
  });
  const needsVisit = useWatch({ control, name: "needsVisit" });

  async function onSubmit(values: LeadInput) {
    setServerError("");
    setAttachmentError("");
    trackEvent("quote_form_submit", {
      sourcePage,
      status: "attempt",
      attachmentCount: attachments.length,
      fromEstimator: Boolean(initialEstimate),
    });

    if (!navigator.onLine) {
      setServerError(
        "Estás sin conexión. Conservamos lo que completaste; enviá la consulta cuando vuelva internet.",
      );
      trackEvent("quote_form_submit", { sourcePage, status: "offline" });
      return;
    }

    const payload = {
      ...values,
      hasPlans: values.hasPlans || attachments.length > 0,
    };
    const body = new FormData();
    body.set("payload", JSON.stringify(payload));
    attachments.forEach((file) => body.append("attachments", file));

    let response: Response;

    try {
      response = await fetch("/api/leads", {
        method: "POST",
        body,
      });
    } catch {
      setServerError(
        "No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.",
      );
      trackEvent("quote_form_submit", { sourcePage, status: "network_error" });
      return;
    }

    const responsePayload = await response.json().catch(() => null);

    if (!response.ok) {
      setServerError(
        responsePayload?.message ||
          "No pudimos enviar tu consulta. Revisá los datos o intentá nuevamente.",
      );
      trackEvent("quote_form_submit", { sourcePage, status: "error" });
      return;
    }

    if (responsePayload?.estimate) {
      window.sessionStorage.setItem(
        "arqvia:last-estimate",
        JSON.stringify(responsePayload.estimate),
      );
    } else {
      window.sessionStorage.removeItem("arqvia:last-estimate");
    }
    trackEvent("quote_form_submit", { sourcePage, status: "success" });
    trackEvent("generate_lead", {
      sourcePage,
      attachmentCount: attachments.length,
      fromEstimator: Boolean(initialEstimate),
    });
    router.push("/gracias");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onFocus={() => {
        if (!started) {
          setStarted(true);
          trackEvent("quote_form_start", { sourcePage });
        }
      }}
      className="relative overflow-hidden border border-ink/10 bg-paper p-5 shadow-premium md:p-8"
      aria-label="Formulario de evaluación de proyecto"
      noValidate
    >
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        {...register("website")}
      />
      <input type="hidden" {...register("sourcePage")} />
      {initialEstimate ? (
        <>
          <input type="hidden" {...register("estimateRuleId")} />
          <input type="hidden" {...register("estimateTier")} />
          <input type="hidden" {...register("estimateAreaM2")} />
          <input type="hidden" {...register("estimateConfigVersion")} />
        </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre completo" error={errors.name?.message}>
          <input {...register("name")} autoComplete="name" required />
        </Field>
        <Field label="WhatsApp" error={errors.phone?.message}>
          <input {...register("phone")} autoComplete="tel" required />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            {...register("email")}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Ciudad / zona" error={errors.city?.message}>
          <input
            {...register("city")}
            autoComplete="address-level2"
            required
          />
        </Field>
        {initialEstimate ? (
          <Field label="Tipo de proyecto estimado" error={errors.projectType?.message}>
            <input readOnly {...register("projectType")} required />
          </Field>
        ) : (
          <Field label="Tipo de proyecto" error={errors.projectType?.message}>
            <select {...register("projectType")} required>
              <option value="">Seleccionar</option>
              {projectTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {compact ? (
        <div className="mt-5 border border-ink/10 bg-mist/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
            Diagnóstico rápido
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Etapa actual">
              <select {...register("currentStatus")}>
                <option value="">Seleccionar</option>
                {currentStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Rango de presupuesto">
              <select {...register("budgetRange")}>
                <option value="">Seleccionar</option>
                {budgetRanges.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <QualificationCheckbox
              label="Necesito visita técnica"
              registration={register("needsVisit")}
            />
            <QualificationCheckbox
              label="Tengo planos o imágenes"
              registration={register("hasPlans")}
            />
          </div>
          <Field label="Links de fotos, planos o referencias" className="mt-4">
            <textarea
              {...register("referenceLinks")}
              rows={3}
              placeholder="Pegá links de Drive, Pinterest, carpeta de fotos o referencias si ya los tenés."
            />
          </Field>
        </div>
      ) : (
        <details className="group mt-5 border border-ink/10 bg-mist/45 open:bg-mist/65">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 text-sm font-semibold text-ink transition hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze md:px-5 [&::-webkit-details-marker]:hidden">
            Agregar superficie, presupuesto, visita o archivos
            <ChevronDown
              className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-ink/10 p-4 md:p-5">
            <p className="mb-4 max-w-2xl text-sm leading-6 text-ink/68">
              Estos datos son opcionales y nos ayudan a preparar una primera
              respuesta más precisa.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tipo de cliente">
                <select {...register("clientType")}>
                  <option value="">Seleccionar</option>
                  <option>Particular</option>
                  <option>Empresa</option>
                  <option>Desarrollador</option>
                  <option>Profesional</option>
                </select>
              </Field>
              <Field label="Estado actual">
                <select {...register("currentStatus")}>
                  <option value="">Seleccionar</option>
                  {currentStatuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label={initialEstimate ? "Superficie estimada" : "Superficie aproximada"}>
                <input
                  {...register("areaM2")}
                  readOnly={Boolean(initialEstimate)}
                  placeholder="Ej: 120 m²"
                />
              </Field>
              <Field label="Rango de presupuesto">
                <select {...register("budgetRange")}>
                  <option value="">Seleccionar</option>
                  {budgetRanges.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha ideal de inicio">
                <input {...register("startDate")} placeholder="Ej: próximos 3 meses" />
              </Field>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <QualificationCheckbox
                label="Necesito visita técnica"
                registration={register("needsVisit")}
              />
              <QualificationCheckbox
                label="Tengo planos o imágenes"
                registration={register("hasPlans")}
              />
            </div>
            <Field label="Links de fotos, planos o referencias" className="mt-4">
              <textarea
                {...register("referenceLinks")}
                rows={3}
                placeholder="Ej: carpeta de Drive, tablero de Pinterest, fotos del espacio o planos disponibles."
              />
            </Field>
            {needsVisit ? (
              <TechnicalVisitPreferenceFields
                compact={compact}
                errors={errors}
                register={register}
              />
            ) : null}
            <LeadAttachmentPicker
              files={attachments}
              error={attachmentError}
              onChange={(files, error) => {
                setAttachments(files);
                setAttachmentError(error);
              }}
            />
          </div>
        </details>
      )}

      {compact && needsVisit ? (
        <TechnicalVisitPreferenceFields
          compact={compact}
          errors={errors}
          register={register}
        />
      ) : null}

      {compact ? (
        <LeadAttachmentPicker
          files={attachments}
          error={attachmentError}
          onChange={(files, error) => {
            setAttachments(files);
            setAttachmentError(error);
          }}
        />
      ) : null}

      <Field
        label="Mensaje"
        error={errors.message?.message}
        className="mt-4"
      >
        <textarea
          {...register("message")}
          rows={compact ? 4 : 6}
          required
          placeholder="Contanos brevemente qué necesitás resolver."
        />
      </Field>

      {serverError ? (
        <p
          role="alert"
          className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Enviando consulta..." : "Solicitar evaluación del proyecto"}
      </button>
      <p className="mt-3 text-xs leading-5 text-ink/75">
        Cuanta más información nos compartas, mejor podremos orientarte sobre
        alcance, etapas y próximos pasos.
      </p>
    </form>
  );
}

function TechnicalVisitPreferenceFields({
  compact,
  errors,
  register,
}: {
  compact: boolean;
  errors: FieldErrors<LeadFormValues>;
  register: UseFormRegister<LeadFormValues>;
}) {
  const minimumDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
  }).format(new Date());

  return (
    <section className="mt-4 border border-bronze/25 bg-bronze-light/15 p-4 md:p-5">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
          Preferencia para la visita
        </p>
        <h3 className="mt-2 font-serif text-2xl text-ink">
          Contanos cuándo y dónde te conviene recibirnos
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink/68">
          Tomamos estos datos como preferencia. El equipo confirma el día y el
          horario antes de la visita.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field
          label="Fecha preferida"
          error={errors.visitPreferredDate?.message}
        >
          <input
            type="date"
            min={minimumDate}
            {...register("visitPreferredDate")}
          />
        </Field>
        <Field
          label="Dirección o referencia del espacio"
          error={errors.visitAddress?.message}
        >
          <input
            {...register("visitAddress")}
            autoComplete="street-address"
            maxLength={180}
            placeholder="Ej: barrio, calle o punto de referencia"
          />
        </Field>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
          Franja horaria
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ["MORNING", "Mañana"],
            ["AFTERNOON", "Tarde"],
            ["FLEXIBLE", "Indistinto"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-12 cursor-pointer items-center gap-3 border border-ink/12 bg-paper px-4 text-sm font-semibold text-ink transition has-[:checked]:border-bronze has-[:checked]:bg-bronze-light/40"
            >
              <input
                type="radio"
                value={value}
                className="size-4 accent-bronze"
                {...register("visitPreferredWindow")}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Detalle para la visita"
        className="mt-4"
        error={errors.visitNotes?.message}
      >
        <textarea
          {...register("visitNotes")}
          maxLength={500}
          rows={compact ? 3 : 4}
          placeholder="Accesos, disponibilidad, qué espacio revisar o cualquier dato útil."
        />
      </Field>
    </section>
  );
}

function LeadAttachmentPicker({
  files,
  error,
  onChange,
}: {
  files: File[];
  error: string;
  onChange: (files: File[], error: string) => void;
}) {
  const inputId = useId();

  function addFiles(selectedFiles: File[]) {
    const nextFiles = [...files, ...selectedFiles];
    const validationError = validateSelectedAttachments(nextFiles);
    if (validationError) {
      onChange(files, validationError);
      return;
    }
    onChange(nextFiles, "");
  }

  return (
    <div className="mt-4 border border-ink/10 bg-mist/55 p-4 md:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
            Fotos o planos
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/65">
            Adjuntá hasta {leadAttachmentMaxFiles} archivos PDF o imágenes. Cada
            archivo puede pesar hasta 5 MB.
          </p>
        </div>
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-ink/15 bg-paper px-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-bronze hover:text-bronze focus-within:ring-2 focus-within:ring-bronze/30"
        >
          <Paperclip className="size-4" aria-hidden="true" />
          Adjuntar archivos
          <input
            id={inputId}
            name="attachments"
            type="file"
            multiple
            accept={leadAttachmentAllowedMimeTypes.join(",")}
            className="sr-only"
            onChange={(event) => {
              addFiles(Array.from(event.currentTarget.files || []));
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {files.length ? (
        <ul className="mt-4 grid gap-2" aria-label="Archivos seleccionados">
          {files.map((file, index) => {
            const key = `${file.name}-${file.size}-${file.lastModified}-${index}`;
            const Icon = file.type === "application/pdf" ? FileText : ImageIcon;
            return (
              <li
                key={key}
                className="flex min-w-0 items-center gap-3 border border-ink/10 bg-paper px-3 py-2.5"
              >
                <Icon className="size-4 shrink-0 text-bronze" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {file.name}
                  </span>
                  <span className="block text-xs text-ink/55">
                    {formatAttachmentBytes(file.size)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      files.filter((_, fileIndex) => fileIndex !== index),
                      "",
                    )
                  }
                  className="inline-flex size-9 shrink-0 items-center justify-center text-ink/55 transition hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze"
                  aria-label={`Quitar ${file.name}`}
                  title={`Quitar ${file.name}`}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function validateSelectedAttachments(files: File[]) {
  if (files.length > leadAttachmentMaxFiles) {
    return `Podés adjuntar hasta ${leadAttachmentMaxFiles} archivos.`;
  }
  if (files.some((file) => !file.size || file.size > leadAttachmentMaxBytes)) {
    return "Cada archivo debe pesar hasta 5 MB.";
  }
  if (
    files.reduce((total, file) => total + file.size, 0) >
    leadAttachmentMaxTotalBytes
  ) {
    return "Los archivos no pueden superar 12 MB en total.";
  }
  if (
    files.some(
      (file) =>
        !leadAttachmentAllowedMimeTypes.includes(
          file.type as (typeof leadAttachmentAllowedMimeTypes)[number],
        ),
    )
  ) {
    return "Formato no permitido. Usá PDF, JPG, PNG, WebP o AVIF.";
  }
  return "";
}

function QualificationCheckbox({
  label,
  registration,
}: {
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 border border-ink/10 bg-white/70 px-4 text-sm text-ink/75 transition hover:border-bronze/45">
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-bronze"
        {...registration}
      />
      {label}
    </label>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactElement<{
    id?: string;
    className?: string;
    name?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    "aria-required"?: boolean;
    required?: boolean;
  }>;
  className?: string;
}) {
  const id =
    children.props.name ||
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <div className={`block ${className || ""}`}>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75"
      >
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? `${id}-error` : undefined,
        "aria-required": children.props.required || undefined,
        className:
          children.type === "textarea"
          ? "min-h-28 w-full border border-ink/12 bg-white px-4 py-3 text-sm text-ink outline-none transition duration-300 placeholder:text-ink/35 hover:border-ink/25 focus:border-bronze focus:ring-2 focus:ring-bronze/20"
            : "h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition duration-300 placeholder:text-ink/35 hover:border-ink/25 focus:border-bronze focus:ring-2 focus:ring-bronze/20",
      })}
      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="mt-2 block text-xs text-red-700"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
