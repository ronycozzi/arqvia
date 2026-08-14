"use client";

import { revokeAdminUserSessions } from "@/app/admin/(protected)/users/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function RevokeUserSessionsButton({
  disabled,
  id,
  label,
}: {
  disabled: boolean;
  id: string;
  label: string;
}) {
  return (
    <DeleteConfirmationForm
      action={revokeAdminUserSessions}
      disabled={disabled}
      fields={{ id }}
      title="Cerrar sesiones activas"
      description={`Vas a cerrar todas las sesiones abiertas de ${label}. La cuenta seguirá activa y podrá volver a ingresar con su contraseña.`}
      impactNote="Usá esta acción ante una sesión extraviada, un equipo compartido o una sospecha de acceso. El cierre quedará registrado en Actividad."
      intent="revoke-sessions"
      triggerLabel="Cerrar sesiones"
      confirmLabel="Confirmar cierre"
      pendingLabel="Cerrando..."
    />
  );
}
