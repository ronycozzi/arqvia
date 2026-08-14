"use client";

import { revokeAdminUserAccess } from "@/app/admin/(protected)/users/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteUserButton({
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
      action={revokeAdminUserAccess}
      disabled={disabled}
      fields={{ id }}
      title="Revocar acceso"
      description={`Vas a cerrar las sesiones de ${label} y dejar su usuario inactivo. Su autoría histórica se conserva y un Admin puede reactivar el acceso.`}
      impactNote="Las notas, asignaciones y movimientos anteriores conservarán la autoría de este usuario. La revocación quedará registrada en Actividad."
      intent="revoke-access"
      triggerLabel="Revocar"
      confirmLabel="Confirmar revocación"
      pendingLabel="Revocando..."
    />
  );
}
