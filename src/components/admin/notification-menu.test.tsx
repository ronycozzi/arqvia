import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdminNotificationMenu,
  type AdminNotificationItem,
} from "./notification-menu";

const mocks = vi.hoisted(() => ({
  markAll: vi.fn(),
  refresh: vi.fn(),
  undo: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/app/admin/(protected)/notification-actions", () => ({
  markAllLeadNotificationsRead: mocks.markAll,
  undoMarkAllLeadNotificationsRead: mocks.undo,
}));

const items: AdminNotificationItem[] = [
  {
    createdAt: "2026-07-16T12:00:00.000Z",
    createdAtLabel: "16 jul 2026",
    description: "Remodelación integral · Córdoba Capital",
    href: "/admin/leads/lead-1",
    id: "lead-1",
    statusLabel: "Sin contactar",
    title: "Marina Suárez",
  },
  {
    createdAt: "2026-07-15T12:00:00.000Z",
    createdAtLabel: "15 jul 2026",
    description: "Construcción llave en mano · Villa Allende",
    href: "/admin/leads/lead-2",
    id: "lead-2",
    statusLabel: "Contactado",
    title: "Esteban Ruiz",
  },
];

describe("AdminNotificationMenu", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows unread consultations in an accessible dialog and restores trigger focus", () => {
    render(
      <AdminNotificationMenu
        initialItems={items}
        initialUndoPayload={null}
        initialUnreadCount={2}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /notificaciones: 2 sin leer/i,
    });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Centro de notificaciones",
    });
    expect(within(dialog).getByRole("list", { name: "Consultas sin leer" })).toBeVisible();
    expect(within(dialog).getByRole("link", { name: /Marina Suárez/i })).toHaveAttribute(
      "href",
      "/admin/leads/lead-1",
    );
    expect(
      within(dialog).getByRole("button", {
        name: "Cerrar centro de notificaciones",
      }),
    ).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Centro de notificaciones" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("marks all as read and can undo the exact server-confirmed operation", async () => {
    mocks.markAll.mockResolvedValue({
      affectedCount: 2,
      markedAt: "2026-07-16T13:00:00.000Z",
      ok: true,
      previousReadAt: "2026-07-14T13:00:00.000Z",
    });
    mocks.undo.mockResolvedValue({ ok: true, unreadCount: 2 });

    render(
      <AdminNotificationMenu
        initialItems={items}
        initialUndoPayload={null}
        initialUnreadCount={2}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /notificaciones: 2 sin leer/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));

    await waitFor(() => {
      expect(mocks.markAll).toHaveBeenCalledOnce();
      expect(screen.getByRole("status")).toHaveTextContent(
        "2 notificaciones marcadas como leídas.",
      );
    });
    expect(mocks.refresh).not.toHaveBeenCalled();

    const undoButton = screen.getByRole("button", { name: /^Deshacer$/ });
    await waitFor(() => expect(undoButton).toBeEnabled());
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(mocks.undo).toHaveBeenCalledWith({
        markedAt: "2026-07-16T13:00:00.000Z",
        previousReadAt: "2026-07-14T13:00:00.000Z",
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        "Las notificaciones volvieron a quedar sin leer.",
      );
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("keeps the persisted undo control available after a reload", () => {
    render(
      <AdminNotificationMenu
        initialItems={[]}
        initialUndoPayload={{
          markedAt: "2026-07-16T13:00:00.000Z",
          previousReadAt: null,
        }}
        initialUnreadCount={0}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /notificaciones: 0 sin leer/i }),
    );
    expect(
      screen.getByRole("button", { name: "Deshacer última lectura" }),
    ).toBeEnabled();
    expect(screen.getByText("No hay consultas pendientes de lectura.")).toBeVisible();
  });
});
