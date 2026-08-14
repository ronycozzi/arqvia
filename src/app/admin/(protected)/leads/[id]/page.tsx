import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  CircleDollarSign,
  FileText,
  Mail,
  MessageCircle,
  Paperclip,
  Webhook,
} from "lucide-react";
import { LeadAttachmentRow } from "@/components/admin/lead-attachment-row";
import { LeadCommercialForm } from "@/components/admin/lead-commercial-form";
import { LeadContactLink } from "@/components/admin/lead-contact-link";
import { LeadNoteForm } from "@/components/admin/lead-note-form";
import { LeadPrivacyEraser } from "@/components/admin/lead-privacy-eraser";
import { LeadStatusSelect } from "@/components/admin/lead-status-select";
import { TechnicalVisitForm } from "@/components/admin/technical-visit-form";
import {
  canContactLead,
  canManageCommercial,
  canViewLeadPII,
  requireVerifiedAdminSession,
} from "@/lib/admin-auth";
import {
  buildLeadInternalBrief,
  buildLeadMailtoUrl,
  buildLeadResponseDraft,
  buildLeadWhatsAppUrl,
  getLeadCommercialReading,
  getLeadPriority,
  leadStatusClassNames,
  leadStatusLabels,
} from "@/lib/lead-utils";
import { prisma } from "@/lib/db";
import { estimateTierDetails, formatUsd } from "@/lib/estimator";
import {
  formatRequestedVisitDate,
  getCordobaDateTimeInputParts,
} from "@/lib/technical-visit-config";
import { formatDate } from "@/lib/utils";

type LeadDetailProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Detalle de consulta",
  robots: { index: false, follow: false },
};


const automationStatusLabels = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  DELIVERED: "Entregada",
  FAILED: "Reintento pendiente",
  DEAD: "Requiere revisión",
} as const;

export default async function LeadDetailPage({
  params,
}: LeadDetailProps) {
  const { id } = await params;
  const session = await requireVerifiedAdminSession();
  const canManage = canManageCommercial(session.user.role);
  const canViewContactData = canViewLeadPII(session.user.role);
  const canContact = canContactLead(session.user.role);

  const [lead, activity, visitAssignees, automationDeliveries] =
    await Promise.all([
      prisma.lead.findUnique({
        where: { id },
        include: {
          attachments: {
            orderBy: { createdAt: "desc" },
          },
          technicalVisit: true,
          estimate: true,
          assignedUser: { select: { email: true, name: true } },
          commercialActivities: {
            orderBy: { createdAt: "desc" },
            take: 30,
            include: {
              user: { select: { name: true, email: true } },
            },
          },
          possibleDuplicateOf: {
            select: { createdAt: true, id: true, name: true },
          },
          notes: {
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      canManage
        ? prisma.auditLog.findMany({
            where: {
              OR: [
                { entity: "Lead", entityId: id },
                { entity: "LeadNote", entityId: id },
                { entity: "LeadAttachment", entityId: id },
                { entity: "TechnicalVisit", entityId: id },
                { entity: "LeadEstimate", entityId: id },
                { entity: "LeadAutomationDelivery", entityId: id },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 24,
            include: {
              user: { select: { name: true, email: true } },
            },
          })
        : Promise.resolve([]),
      canManage
        ? prisma.user.findMany({
            where: {
              active: true,
            },
            orderBy: [{ name: "asc" }, { email: "asc" }],
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      session.user.role === "ADMIN"
        ? prisma.leadAutomationDelivery.findMany({
            where: { leadId: id },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

  if (!lead) notFound();

  const sensitiveLead = canViewContactData ? lead : null;
  const priority = sensitiveLead ? getLeadPriority(sensitiveLead) : null;
  const reading = sensitiveLead
    ? getLeadCommercialReading(sensitiveLead)
    : null;
  const hasReconsultation = Boolean(sensitiveLead?.possibleDuplicateOf);
  const visibleActivity = canManage
    ? lead.commercialActivities.length
      ? lead.commercialActivities
      : activity
    : [];

  const displayName = sensitiveLead
    ? sensitiveLead.name
    : `Consulta ${lead.id.slice(-6).toUpperCase()}`;
  const fields = sensitiveLead
    ? [
        ["Nombre", sensitiveLead.name],
        ["WhatsApp", sensitiveLead.phone],
        ["Email", sensitiveLead.email],
        ["Ciudad / zona", sensitiveLead.city],
        ["Tipo de cliente", sensitiveLead.clientType || "Sin especificar"],
        ["Tipo de proyecto", sensitiveLead.projectType],
        ["Estado actual", sensitiveLead.currentStatus || "Sin especificar"],
        ["Superficie aproximada", sensitiveLead.areaM2 || "Sin especificar"],
        ["Rango de presupuesto", sensitiveLead.budgetRange || "Sin especificar"],
        ["Fecha ideal de inicio", sensitiveLead.startDate || "Sin especificar"],
        ["Necesita visita técnica", sensitiveLead.needsVisit ? "Sí" : "No"],
        ["Tiene planos o imágenes", sensitiveLead.hasPlans ? "Sí" : "No"],
        ["Links o referencias", sensitiveLead.referenceLinks || "Sin especificar"],
        ["Origen", sensitiveLead.sourcePage],
        [
          "Responsable comercial",
          sensitiveLead.assignedUser?.name ||
            sensitiveLead.assignedUser?.email ||
            "Sin asignar",
        ],
        [
          "Próximo seguimiento",
          sensitiveLead.nextFollowUpAt
            ? formatDate(sensitiveLead.nextFollowUpAt)
            : "Sin fecha programada",
        ],
        [
          "Presupuesto enviado",
          sensitiveLead.quotedAmountUsd !== null
            ? formatUsd(sensitiveLead.quotedAmountUsd)
            : "Sin registrar",
        ],
        [
          "Valor ganado",
          sensitiveLead.wonAmountUsd !== null
            ? formatUsd(sensitiveLead.wonAmountUsd)
            : "Sin registrar",
        ],
        ["Motivo de pérdida", sensitiveLead.lostReason || "No aplica"],
        ["Fecha de ingreso", formatDate(sensitiveLead.createdAt)],
        ["Última actividad", formatDate(sensitiveLead.lastActivityAt)],
      ]
    : [
        ["Consulta", displayName],
        ["Tipo de proyecto", lead.projectType],
        ["Estado comercial", leadStatusLabels[lead.status]],
        ["Fecha de ingreso", formatDate(lead.createdAt)],
      ];

  const nextSteps = reading?.nextSteps ?? [];
  const responseDraft = sensitiveLead
    ? buildLeadResponseDraft(sensitiveLead)
    : null;
  const internalBrief = sensitiveLead
    ? buildLeadInternalBrief(sensitiveLead)
    : null;
  const visitDateTime = getCordobaDateTimeInputParts(
    sensitiveLead?.technicalVisit?.scheduledAt,
  );
  const followUpDateTime = getCordobaDateTimeInputParts(
    sensitiveLead?.nextFollowUpAt,
  );

  return (
    <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <aside className="premium-card h-fit p-6 lg:sticky lg:top-28">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
        >
          <ArrowLeft className="size-4" />
          Volver a consultas
        </Link>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-[0.2em] text-bronze">
            Consulta
          </p>
          <h2 className="mt-2 font-serif text-4xl leading-tight text-ink">
            {displayName}
          </h2>
          <p className="mt-3 text-sm leading-7 text-ink/75">
            {lead.projectType} · {sensitiveLead ? sensitiveLead.city : "Zona reservada"}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {priority ? (
            <span className={`px-3 py-1 text-xs font-semibold ${priority.className}`}>
              Prioridad {priority.label}
            </span>
          ) : null}
          <span
            className={`px-3 py-1 text-xs font-semibold ${leadStatusClassNames[lead.status]}`}
          >
            {leadStatusLabels[lead.status]}
          </span>
          {hasReconsultation ? (
            <span className="border border-bronze/25 bg-bronze-light/30 px-3 py-1 text-xs font-semibold text-ink">
              Reconsulta web
            </span>
          ) : null}
        </div>

        {canManage ? (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/60">
              Cambiar estado
            </p>
            <LeadStatusSelect leadId={lead.id} initialStatus={lead.status} />
          </div>
        ) : (
          <p className="mt-6 border border-ink/10 bg-mist px-4 py-3 text-sm text-ink/70">
            Modo lectura: podés revisar la consulta sin modificar seguimiento.
          </p>
        )}

        {canContact && sensitiveLead ? (
          <div className="mt-6 grid gap-3">
            <LeadContactLink
              channel="WHATSAPP"
              leadId={lead.id}
              href={buildLeadWhatsAppUrl(sensitiveLead)}
              className="inline-flex h-12 items-center justify-center gap-2 bg-olive px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-ink"
            >
              <MessageCircle className="size-4" />
              Responder por WhatsApp
            </LeadContactLink>
            <LeadContactLink
              channel="EMAIL"
              leadId={lead.id}
              href={buildLeadMailtoUrl(sensitiveLead)}
              className="inline-flex h-12 items-center justify-center gap-2 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              <Mail className="size-4" />
              Responder por email
            </LeadContactLink>
          </div>
        ) : (
          <p className="mt-6 border border-ink/10 bg-mist px-4 py-3 text-sm text-ink/70">
            Los datos de contacto completos y las acciones de respuesta están
            reservados para Admin.
          </p>
        )}

        <div className="mt-6 border-t border-ink/10 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
            Lectura rápida
          </p>
          <p className="mt-3 text-sm leading-7 text-ink/75">
            {sensitiveLead
              ? `${sensitiveLead.budgetRange || "Sin rango de presupuesto"} · ${
                  sensitiveLead.needsVisit ? "requiere visita" : "sin visita marcada"
                } · ${
                  sensitiveLead.attachments.length
                    ? `${sensitiveLead.attachments.length} ${sensitiveLead.attachments.length === 1 ? "archivo recibido" : "archivos recibidos"}`
                    : sensitiveLead.hasPlans
                      ? "tiene planos o imágenes"
                      : "sin archivos marcados"
                }`
              : "Información comercial reservada para Admin."}
          </p>
        </div>

        {reading ? (
          <div className="mt-6 border-t border-ink/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
              Score comercial
            </p>
            <p className="mt-2 font-serif text-5xl leading-none text-ink">
              {reading.score}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">
              {reading.summary}
            </p>
          </div>
        ) : null}
      </aside>

      <div className="grid gap-6">
        <section className="premium-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-bronze">
            Mensaje
          </p>
          <h1 className="mt-2 font-serif text-4xl text-ink">
            Qué necesita resolver
          </h1>
          {hasReconsultation ? (
            <div className="mt-5 border border-bronze/25 bg-bronze-light/25 px-4 py-3 text-sm font-semibold text-ink">
              Este envío coincide con una consulta anterior, pero se conservó
              como ficha independiente hasta verificar la identidad.
              {sensitiveLead?.possibleDuplicateOf ? (
                <Link
                  href={`/admin/leads/${sensitiveLead.possibleDuplicateOf.id}`}
                  className="ml-1 underline decoration-bronze underline-offset-4"
                >
                  Revisar posible antecedente
                </Link>
              ) : null}
            </div>
          ) : null}
          <p className="mt-5 whitespace-pre-line text-lg leading-9 text-ink/75">
            {sensitiveLead
              ? sensitiveLead.message
              : "El mensaje completo puede contener información personal y está reservado para Admin."}
          </p>
        </section>

        {sensitiveLead?.estimate ? (
          <section className="premium-card overflow-hidden p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center bg-ink text-paper">
                <CircleDollarSign className="size-5 text-bronze-light" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-bronze">
                  Estimación web
                </p>
                <h2 className="mt-2 font-serif text-3xl text-ink">
                  Referencia de inversión calculada
                </h2>
              </div>
            </div>
            <p className="mt-6 font-serif text-4xl leading-tight text-ink md:text-5xl">
              {formatUsd(sensitiveLead.estimate.totalMinUsd)}
              <span className="mx-2 text-ink/28">—</span>
              {formatUsd(sensitiveLead.estimate.totalMaxUsd)}
            </p>
            <dl className="mt-6 grid gap-4 border-t border-ink/10 pt-5 sm:grid-cols-4">
              {[
                ["Proyecto", sensitiveLead.estimate.projectTypeLabel],
                ["Superficie", `${sensitiveLead.estimate.areaM2} m²`],
                ["Terminación", estimateTierDetails[sensitiveLead.estimate.finishTier].label],
                ["Versión", `v${sensitiveLead.estimate.configVersion}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-[0.14em] text-ink/55">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs leading-6 text-ink/68">
              Es una referencia orientativa calculada con los valores vigentes al momento de la consulta. No reemplaza el presupuesto técnico.
            </p>
          </section>
        ) : null}

        {session.user.role === "ADMIN" ? (
          <section className="premium-card overflow-hidden p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center bg-ink text-paper">
                  <Webhook className="size-5 text-bronze-light" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-bronze">
                    Automatización
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-ink">
                    Entregas a sistemas externos
                  </h2>
                </div>
              </div>
              <Link
                href="/admin/automations"
                className="inline-flex min-h-11 items-center justify-center border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
              >
                Ver cola completa
              </Link>
            </div>

            {automationDeliveries.length ? (
              <div className="mt-6 grid gap-3">
                {automationDeliveries.map((delivery) => (
                  <article
                    key={delivery.id}
                    className="grid gap-3 border border-ink/10 bg-mist/55 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {delivery.event === "LEAD_CREATED"
                          ? "Nuevo lead"
                          : "Reconsulta"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-ink/65">
                        Creada {formatDate(delivery.createdAt)} · {delivery.attempts} intento{delivery.attempts === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span
                      className={`w-fit px-3 py-1 text-xs font-semibold ${
                        delivery.status === "DELIVERED"
                          ? "bg-olive/12 text-olive"
                          : delivery.status === "DEAD" || delivery.status === "FAILED"
                            ? "bg-bronze-light/35 text-ink"
                            : "bg-white text-ink/70"
                      }`}
                    >
                      {automationStatusLabels[delivery.status]}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 border border-dashed border-ink/20 p-5 text-sm leading-7 text-ink/65">
                Este lead no generó entregas externas. La integración puede estar desactivada o haberse habilitado después de recibirlo.
              </p>
            )}
          </section>
        ) : null}

        {canManage && sensitiveLead ? (
          <section
            aria-labelledby="lead-commercial-title"
            className="premium-card p-6"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-bronze">
                  Gestión comercial
                </p>
                <h2
                  id="lead-commercial-title"
                  className="mt-2 font-serif text-3xl text-ink"
                >
                  Responsable, próxima acción y valor
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/70">
                  Asigná quién continúa la conversación, programá el siguiente
                  contacto y registrá el resultado económico sin depender de
                  planillas externas.
                </p>
              </div>
              <span className="inline-flex w-fit border border-ink/10 bg-mist px-3 py-2 text-xs font-semibold text-ink/70">
                {sensitiveLead.assignedUser?.name ||
                  sensitiveLead.assignedUser?.email ||
                  "Sin responsable"}
              </span>
            </div>
            <LeadCommercialForm
              assignees={visitAssignees.map((user) => ({
                id: user.id,
                label: user.name || user.email || "Usuario Arqvia",
              }))}
              leadId={lead.id}
              value={{
                assignedUserId: sensitiveLead.assignedUserId || "",
                lostReason: sensitiveLead.lostReason || "",
                nextFollowUpAt:
                  followUpDateTime.date && followUpDateTime.time
                    ? `${followUpDateTime.date}T${followUpDateTime.time}`
                    : "",
                quotedAmountUsd: sensitiveLead.quotedAmountUsd,
                status: sensitiveLead.status,
                wonAmountUsd: sensitiveLead.wonAmountUsd,
              }}
            />
          </section>
        ) : null}

        <section id="visita-tecnica" className="premium-card scroll-mt-28 p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center bg-ink text-paper">
              <CalendarClock className="size-5 text-bronze-light" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-bronze">
                Agenda técnica
              </p>
              <h2 className="mt-2 font-serif text-3xl text-ink">
                Coordinar visita al espacio
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/70">
                Convertí la preferencia inicial en una cita confirmada, asigná
                un responsable y conservá el contexto operativo en el lead.
              </p>
            </div>
          </div>

          {canManage && sensitiveLead ? (
            <TechnicalVisitForm
              assignees={visitAssignees.map((user) => ({
                id: user.id,
                label: user.name || user.email || "Usuario Arqvia",
              }))}
              leadId={lead.id}
              preference={{
                notes: sensitiveLead.technicalVisit?.requestNotes || "",
                requestedDateLabel: formatRequestedVisitDate(
                  sensitiveLead.technicalVisit?.requestedDate,
                ),
                window: sensitiveLead.technicalVisit?.preferredWindow || "FLEXIBLE",
              }}
              visit={{
                address: sensitiveLead.technicalVisit?.address || sensitiveLead.city,
                assignedUserId: sensitiveLead.technicalVisit?.assignedUserId || "",
                durationMinutes: sensitiveLead.technicalVisit?.durationMinutes || 60,
                id: sensitiveLead.technicalVisit?.id,
                internalNotes: sensitiveLead.technicalVisit?.internalNotes || "",
                scheduledDate: visitDateTime.date,
                scheduledTime: visitDateTime.time,
                status: sensitiveLead.technicalVisit?.status || "REQUESTED",
              }}
            />
          ) : (
            <p className="mt-6 border border-ink/10 bg-mist p-5 text-sm leading-7 text-ink/70">
              La dirección, la agenda y las notas de visita están reservadas para
              Admin.
            </p>
          )}
        </section>

        <section className="premium-card p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-bronze">
                Documentación recibida
              </p>
              <h2 className="mt-2 font-serif text-3xl text-ink">
                Fotos y planos de la consulta
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/70">
                Los archivos se almacenan de forma privada y solo pueden
                descargarlos Admin desde una sesión activa.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 border border-ink/10 bg-mist px-3 py-2 text-xs font-semibold text-ink/70">
              <Paperclip className="size-4 text-bronze" aria-hidden="true" />
              {canViewContactData ? lead.attachments.length : "—"} archivos
            </span>
          </div>

          {canViewContactData ? (
            lead.attachments.length ? (
              <ul className="mt-6 grid gap-3">
                {lead.attachments.map((attachment) => (
                  <LeadAttachmentRow
                    key={attachment.id}
                    attachment={{
                      id: attachment.id,
                      mimeType: attachment.mimeType,
                      originalName: attachment.originalName,
                      sizeBytes: attachment.sizeBytes,
                    }}
                    canManage={canManage}
                    createdAtLabel={formatDate(attachment.createdAt)}
                    leadId={lead.id}
                  />
                ))}
              </ul>
            ) : (
              <div className="mt-6 border border-dashed border-ink/20 p-6 text-sm text-ink/65">
                Esta consulta todavía no tiene fotos ni planos adjuntos.
              </div>
            )
          ) : (
            <div className="mt-6 border border-ink/10 bg-mist p-6 text-sm leading-7 text-ink/70">
              Los documentos pueden contener información personal, planos y
              fotografías privadas. El acceso está reservado para Admin.
            </div>
          )}
        </section>

        {reading ? (
          <section className="premium-card p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-bronze">
              Calificación comercial
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Por qué esta consulta merece seguimiento
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="border border-ink/10 bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                Señales positivas
              </p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/75">
                {reading.reasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>
            <div className="border border-ink/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                Datos a confirmar
              </p>
              {reading.missing.length ? (
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/75">
                  {reading.missing.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-ink/75">
                  La consulta trae información suficiente para avanzar a una
                  evaluación inicial.
                </p>
              )}
            </div>
            </div>
          </section>
        ) : null}

        <section className="premium-card-dark p-6 text-paper">
          <p className="text-xs uppercase tracking-[0.2em] text-bronze-light">
            Brief operativo
          </p>
          <h2 className="mt-2 font-serif text-3xl">
            Respuesta inicial y contexto para el equipo
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            {responseDraft ? (
              <article className="border border-paper/12 bg-paper/[0.045] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze-light">
                  Primer mensaje sugerido
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-paper/78">
                  {responseDraft}
                </p>
              </article>
            ) : (
              <article className="border border-paper/12 bg-paper/[0.045] p-4 text-sm leading-7 text-paper/72">
                La respuesta sugerida está reservada para Admin.
              </article>
            )}
            {internalBrief ? (
              <article className="border border-paper/12 bg-paper/[0.045] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze-light">
                  Resumen interno
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-paper/78">
                  {internalBrief}
                </p>
              </article>
            ) : (
              <article className="border border-paper/12 bg-paper/[0.045] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze-light">
                  Resumen interno
                </p>
                <p className="mt-4 text-sm leading-7 text-paper/72">
                  Este bloque incluye datos de contacto completos y está
                  disponible solo para Admin.
                </p>
              </article>
            )}
          </div>
        </section>

        <section className="premium-card p-6">
          <h2 className="font-serif text-3xl text-ink">
            Datos para calificar la consulta
          </h2>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="border-b border-ink/10 pb-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-ink/60">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {canManage ? (
        <section className="premium-card p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-bronze">
                Seguimiento interno
              </p>
              <h2 className="mt-2 font-serif text-3xl text-ink">
                Notas comerciales
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/75">
                Registrá llamadas, dudas del cliente, próximos pasos y criterios
                de calificación para que el equipo tenga contexto.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 border border-ink/10 bg-mist px-3 py-2 text-xs font-semibold text-ink/70">
              <FileText className="size-4 text-bronze" />
              {lead.notes.length} notas
            </span>
          </div>

          {canManage ? (
            <LeadNoteForm leadId={lead.id} />
          ) : (
            <p className="mt-6 border border-ink/10 bg-mist px-4 py-3 text-sm text-ink/70">
              Tu rol permite revisar la consulta, pero no editar seguimiento.
            </p>
          )}
          {canManage ? (
            <div className="mt-6 grid gap-3">
              {lead.notes.length ? (
              lead.notes.map((note) => (
                <article key={note.id} className="border border-ink/10 bg-mist p-4">
                  <p className="whitespace-pre-line text-sm leading-7 text-ink/78">
                    {note.body}
                  </p>
                  <p className="mt-3 text-xs text-ink/55">
                    {formatDate(note.createdAt)} ·{" "}
                    {note.user?.name || note.user?.email || "Equipo Arqvia"}
                  </p>
                </article>
              ))
              ) : (
                <div className="border border-dashed border-ink/20 p-6 text-sm text-ink/65">
                  Todavía no hay notas internas para esta consulta.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 border border-ink/10 bg-mist p-6 text-sm leading-7 text-ink/70">
              Las notas internas pueden incluir datos personales, acuerdos y
              contexto comercial. Solo Admin puede ver el detalle.
            </div>
          )}
        </section>
        ) : null}

        {canManage ? (
        <section className="premium-card p-6">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-1 size-5 text-bronze" />
            <div>
              <h2 className="font-serif text-3xl text-ink">
                Actividad reciente
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink/75">
                Historial tipado de responsables, próximos contactos, valores,
                estados y notas. En consultas anteriores se muestra el audit log
                disponible como respaldo.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {visibleActivity.length ? (
              visibleActivity.map((item) => (
                <article
                  key={item.id}
                  className="border-l-2 border-bronze bg-mist px-4 py-3"
                >
                  <p className="text-sm font-semibold text-ink">{item.summary}</p>
                  <p className="mt-1 text-xs text-ink/55">
                    {formatDate(item.createdAt)} ·{" "}
                    {item.user?.name || item.user?.email || "Sistema"}
                  </p>
                </article>
              ))
            ) : (
              <div className="border border-dashed border-ink/20 p-6 text-sm text-ink/65">
                La actividad aparecerá cuando el equipo cambie estados o agregue
                notas.
              </div>
            )}
          </div>
        </section>
        ) : null}

        {session.user.role === "ADMIN" ? (
          <LeadPrivacyEraser
            attachmentCount={lead.attachments.length}
            leadId={lead.id}
          />
        ) : null}

        {reading ? (
        <section className="premium-card bg-mist p-6">
          <h2 className="font-serif text-3xl text-ink">
            Próximos pasos sugeridos
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {nextSteps.map((item, index) => (
              <div key={item} className="premium-card bg-paper p-4 text-sm text-ink/75">
                <p className="font-serif text-2xl text-bronze">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 leading-7">{item}</p>
              </div>
            ))}
          </div>
        </section>
        ) : null}
      </div>
    </section>
  );
}
