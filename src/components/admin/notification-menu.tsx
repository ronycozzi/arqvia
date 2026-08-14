"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clock3,
  EllipsisVertical,
  ExternalLink,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  markAllLeadNotificationsRead,
  undoMarkAllLeadNotificationsRead,
} from "@/app/admin/(protected)/notification-actions";
import {
  leadNotificationReadEvent,
  type LeadNotificationReadEventDetail,
} from "@/components/admin/unread-lead-badge";

export type AdminNotificationItem = {
  createdAt: string;
  createdAtLabel: string;
  description: string;
  href: string;
  id: string;
  statusLabel: string;
  title: string;
};

export type NotificationUndoPayload = {
  markedAt: string;
  previousReadAt: string | null;
};

type Feedback = {
  message: string;
  tone: "error" | "success";
};

export function AdminNotificationMenu({
  initialItems,
  initialUndoPayload,
  initialUnreadCount,
}: {
  initialItems: AdminNotificationItem[];
  initialUndoPayload: NotificationUndoPayload | null;
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [undoPayload, setUndoPayload] =
    useState<NotificationUndoPayload | null>(initialUndoPayload);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busyAction, setBusyAction] = useState<"mark" | "undo" | null>(null);
  const isPending = busyAction !== null;

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closePanel() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  async function markAllAsRead() {
    if (busyAction) return;
    setBusyAction("mark");
    setFeedback(null);

    try {
      const result = await markAllLeadNotificationsRead();
      if (!result.ok) {
        setFeedback({ message: result.message, tone: "error" });
        return;
      }

      setUnreadCount(0);
      setItems([]);
      setUndoPayload({
        markedAt: result.markedAt,
        previousReadAt: result.previousReadAt,
      });
      dispatchReadAtChange(result.markedAt);
      setFeedback({
        message:
          result.affectedCount === 1
            ? "1 notificación marcada como leída."
            : `${result.affectedCount} notificaciones marcadas como leídas.`,
        tone: "success",
      });
      setOpen(false);
    } catch {
      setFeedback({
        message: "No se pudieron actualizar las notificaciones.",
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function undoRead() {
    if (!undoPayload || busyAction) return;
    const previousReadAt = undoPayload.previousReadAt;
    setBusyAction("undo");
    setFeedback(null);

    try {
      const result = await undoMarkAllLeadNotificationsRead(undoPayload);
      if (!result.ok) {
        setUndoPayload(null);
        setFeedback({ message: result.message, tone: "error" });
        router.refresh();
        return;
      }

      setUnreadCount(result.unreadCount);
      setUndoPayload(null);
      dispatchReadAtChange(previousReadAt);
      setFeedback({
        message: "Las notificaciones volvieron a quedar sin leer.",
        tone: "success",
      });
      setOpen(false);
    } catch {
      setFeedback({
        message: "No se pudo deshacer la acción.",
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  }

  const displayedCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <div ref={rootRef} className="relative z-40">
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex h-10 items-center gap-2 border border-ink/10 bg-white/75 px-3 text-xs font-semibold text-ink transition hover:-translate-y-0.5 hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
          aria-controls={panelId}
          aria-label={`Notificaciones: ${unreadCount} sin leer. Abrir centro de notificaciones`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
          title="Centro de notificaciones"
        >
          <Bell className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Notificaciones</span>
          <span
            className={`grid min-w-6 place-items-center px-1.5 py-0.5 text-[10px] font-bold ${
              unreadCount > 0
                ? "bg-bronze text-paper"
                : "bg-olive/12 text-olive"
            }`}
            aria-hidden="true"
          >
            {displayedCount}
          </span>
          <EllipsisVertical className="size-4" aria-hidden="true" />
        </button>

        {open ? (
          <section
            id={panelId}
            role="dialog"
            aria-busy={isPending}
            aria-label="Centro de notificaciones"
            className="fixed inset-x-4 top-24 max-h-[min(70vh,38rem)] overflow-y-auto border border-ink/12 bg-paper p-2 text-ink shadow-[0_24px_64px_rgb(17_19_15/0.22)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[24rem]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-ink/10 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
                  Centro de notificaciones
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {unreadCount > 0
                    ? `${unreadCount} consulta${unreadCount === 1 ? "" : "s"} sin leer`
                    : "Todo está al día"}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink/60">
                  La lectura no modifica el estado comercial de la consulta.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closePanel}
                className="grid size-10 shrink-0 place-items-center border border-ink/10 text-ink/65 transition hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
                aria-label="Cerrar centro de notificaciones"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>

            {items.length ? (
              <ul className="divide-y divide-ink/10" aria-label="Consultas sin leer">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="group block px-3 py-3 transition hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink group-hover:text-bronze">
                            {item.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/65">
                            {item.description}
                          </p>
                        </div>
                        <span className="shrink-0 border border-bronze/25 bg-bronze-light/25 px-2 py-1 text-[10px] font-semibold text-ink">
                          {item.statusLabel}
                        </span>
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-ink/55">
                        <Clock3 className="size-3" aria-hidden="true" />
                        <time dateTime={item.createdAt}>{item.createdAtLabel}</time>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="m-3 border border-dashed border-ink/15 bg-mist px-4 py-5 text-center">
                <CheckCheck className="mx-auto size-5 text-olive" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-ink">
                  No hay consultas pendientes de lectura.
                </p>
              </div>
            )}

            {unreadCount > items.length && items.length > 0 ? (
              <p className="border-t border-ink/10 px-3 py-2 text-xs leading-5 text-ink/55">
                Se muestran las {items.length} más recientes. Abrí la bandeja
                para revisar las {unreadCount} pendientes.
              </p>
            ) : null}

            <div className="grid gap-1 border-t border-ink/10 p-2">
              <button
                type="button"
                disabled={isPending || unreadCount === 0}
                onClick={markAllAsRead}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold text-ink transition hover:bg-mist hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze disabled:cursor-not-allowed disabled:opacity-45"
              >
                <CheckCheck className="size-4" aria-hidden="true" />
                {busyAction === "mark" ? "Actualizando..." : "Marcar todas como leídas"}
              </button>
              {undoPayload ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={undoRead}
                  className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold text-ink transition hover:bg-mist hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {busyAction === "undo" ? "Deshaciendo..." : "Deshacer última lectura"}
                </button>
              ) : null}
              <Link
                href="/admin/leads"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-ink transition hover:bg-mist hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Abrir bandeja de consultas
              </Link>
            </div>
          </section>
        ) : null}
      </div>

      {feedback ? (
        <div
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`fixed bottom-5 left-5 right-5 z-[80] flex items-center gap-3 border p-3 shadow-[0_24px_64px_rgb(17_19_15/0.28)] sm:left-auto sm:w-[min(28rem,calc(100vw-2.5rem))] ${
            feedback.tone === "error"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-olive/30 bg-ink text-paper"
          }`}
        >
          <p className="min-w-0 flex-1 text-sm font-medium leading-6">
            {feedback.message}
          </p>
          {undoPayload && feedback.tone === "success" ? (
            <button
              type="button"
              onClick={undoRead}
              disabled={isPending}
              className="inline-flex h-10 shrink-0 items-center gap-2 border border-paper/20 px-3 text-xs font-semibold text-paper transition hover:border-bronze-light hover:text-bronze-light disabled:opacity-45"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Deshacer
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="grid size-10 shrink-0 place-items-center transition hover:text-bronze-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-light"
            aria-label="Cerrar aviso"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </>
  );
}

function dispatchReadAtChange(readAt: string | null) {
  window.dispatchEvent(
    new CustomEvent<LeadNotificationReadEventDetail>(leadNotificationReadEvent, {
      detail: { readAt },
    }),
  );
}
