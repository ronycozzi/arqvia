"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { isNotificationUndoMatch } from "@/lib/notification-undo";

const undoNotificationReadSchema = z.object({
  markedAt: z.string().datetime({ offset: true }),
  previousReadAt: z.string().datetime({ offset: true }).nullable(),
});

export type NotificationReadActionResult =
  | {
      ok: true;
      affectedCount: number;
      markedAt: string;
      previousReadAt: string | null;
    }
  | { ok: false; message: string };

export type NotificationUndoActionResult =
  | { ok: true; unreadCount: number }
  | { ok: false; message: string };

export async function markAllLeadNotificationsRead(): Promise<NotificationReadActionResult> {
  const session = await getVerifiedAdminSession();
  if (!session) return { ok: false, message: "La sesión ya no está activa." };

  const result = await markNotificationsReadTransaction(session.user.id);
  if (!result) {
    return {
      ok: false,
      message: "No pudimos actualizar las notificaciones. Reintentá en unos segundos.",
    };
  }

  return {
    ok: true,
    affectedCount: result.affectedCount,
    markedAt: result.markedAt.toISOString(),
    previousReadAt: result.previousReadAt?.toISOString() ?? null,
  };
}

async function markNotificationsReadTransaction(userId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { leadNotificationsReadAt: true },
          });
          if (!user) return null;

          const markedAt = new Date();
          const previousReadAt = user.leadNotificationsReadAt;
          const createdAt = previousReadAt
            ? { gt: previousReadAt, lte: markedAt }
            : { lte: markedAt };
          const affectedCount = await tx.lead.count({ where: { createdAt } });
          const update = await tx.user.updateMany({
            where: {
              id: userId,
              leadNotificationsReadAt: previousReadAt,
            },
            data: {
              leadNotificationsReadAt: markedAt,
              leadNotificationsUndoAt: previousReadAt,
              leadNotificationsUndoFor: markedAt,
            },
          });

          if (update.count !== 1) return { conflict: true as const };

          await tx.auditLog.create({
            data: {
              action: "MARK_NOTIFICATIONS_READ",
              entity: "LeadNotification",
              summary: `Marcó ${affectedCount} notificación${affectedCount === 1 ? "" : "es"} como leída${affectedCount === 1 ? "" : "s"}.`,
              userId,
            },
          });

          return {
            affectedCount,
            conflict: false as const,
            markedAt,
            previousReadAt,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (!result) return null;
      if (result.conflict) continue;
      return result;
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retryable || attempt === 2) throw error;
    }
  }

  return null;
}

export async function undoMarkAllLeadNotificationsRead(
  input: unknown,
): Promise<NotificationUndoActionResult> {
  const session = await getVerifiedAdminSession();
  if (!session) return { ok: false, message: "La sesión ya no está activa." };

  const parsed = undoNotificationReadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "No se pudo validar la acción para deshacer." };
  }

  const markedAt = new Date(parsed.data.markedAt);
  const requestedPreviousReadAt = parsed.data.previousReadAt
    ? new Date(parsed.data.previousReadAt)
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.user.id },
      select: {
        leadNotificationsReadAt: true,
        leadNotificationsUndoAt: true,
        leadNotificationsUndoFor: true,
      },
    });
    const serverPreviousReadAt = user?.leadNotificationsUndoAt ?? null;
    const undoMatches = isNotificationUndoMatch({
      currentReadAt: user?.leadNotificationsReadAt ?? null,
      requestedMarkedAt: markedAt,
      requestedPreviousReadAt,
      undoAt: serverPreviousReadAt,
      undoFor: user?.leadNotificationsUndoFor ?? null,
    });

    if (!undoMatches) {
      return { previousReadAt: null, reverted: false };
    }

    const update = await tx.user.updateMany({
      where: {
        id: session.user.id,
        leadNotificationsReadAt: markedAt,
        leadNotificationsUndoFor: markedAt,
      },
      data: {
        leadNotificationsReadAt: serverPreviousReadAt,
        leadNotificationsUndoAt: null,
        leadNotificationsUndoFor: null,
      },
    });

    if (update.count !== 1) {
      return { previousReadAt: null, reverted: false };
    }

    await tx.auditLog.create({
      data: {
        action: "RESTORE_NOTIFICATIONS_UNREAD",
        entity: "LeadNotification",
        summary: "Deshizo la lectura masiva de notificaciones.",
        userId: session.user.id,
      },
    });

    return { previousReadAt: serverPreviousReadAt, reverted: true };
  });

  if (!result.reverted) {
    return {
      ok: false,
      message: "La lectura cambió en otra sesión y ya no se puede deshacer.",
    };
  }

  const unreadCount = await prisma.lead.count({
    where: result.previousReadAt
      ? { createdAt: { gt: result.previousReadAt } }
      : undefined,
  });

  return { ok: true, unreadCount };
}
