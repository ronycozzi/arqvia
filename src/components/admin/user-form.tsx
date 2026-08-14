"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type AdminUserActionState,
  saveAdminUser,
} from "@/app/admin/(protected)/users/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";

export type AdminUserFormValue = {
  id?: string;
  updatedAt?: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  active: boolean;
};

const initialState: AdminUserActionState = {
  ok: false,
  message: "",
};

const roleLabels = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export function UserForm({
  canEdit,
  isSelf,
  user,
}: {
  canEdit: boolean;
  isSelf: boolean;
  user: AdminUserFormValue;
}) {
  const [state, formAction, pending] = useActionState(saveAdminUser, initialState);
  const createdAndLocked = state.ok && !user.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={user.id || ""} />
      <input
        name="updatedAt"
        type="hidden"
        value={state.resource?.updatedAt || user.updatedAt || ""}
      />

      {state.message ? (
        <div
          className={`border px-4 py-3 text-sm ${
            state.ok
              ? "border-olive/30 bg-mist text-ink"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      {createdAndLocked && state.resource ? (
        <PostSaveActions
          createHref="/admin/users/new"
          editHref={`/admin/users/${state.resource.id}`}
          resourceLabel="usuario"
          resourceName={`${state.resource.title} (${state.resource.email})`}
        />
      ) : null}

      <section className="premium-panel p-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Acceso al panel
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Usuario, rol y estado
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            Admin gestiona marca, usuarios y configuración. Editor carga contenido.
            Viewer solo revisa información del panel.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            autoComplete="name"
            defaultValue={user.name}
            disabled={disabled}
            error={state.errors?.name?.[0]}
            label="Nombre"
            name="name"
          />
          <TextField
            autoComplete="email"
            defaultValue={user.email}
            disabled={disabled}
            error={state.errors?.email?.[0]}
            label="Email"
            name="email"
            type="email"
          />
          <TextField
            autoComplete="new-password"
            defaultValue=""
            disabled={disabled}
            error={state.errors?.password?.[0]}
            hint={
              user.id
                ? "Completá solo para cambiarla. Usá 12 o más caracteres, mayúscula, minúscula, número y símbolo."
                : "Usá 12 o más caracteres, mayúscula, minúscula, número y símbolo."
            }
            label="Contraseña"
            name="password"
            type="password"
          />
          <label className="block" htmlFor="user-role">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
              Rol
            </span>
            <select
              id="user-role"
              className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
              defaultValue={user.role}
              disabled={disabled || isSelf}
              name="role"
              aria-invalid={Boolean(state.errors?.role?.[0])}
              aria-describedby={state.errors?.role?.[0] ? "user-role-error" : undefined}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {isSelf ? (
              <>
                <input name="role" type="hidden" value={user.role} />
                <span className="mt-2 block text-xs leading-5 text-ink/60">
                  Tu propio rol no se cambia desde esta sesión.
                </span>
              </>
            ) : null}
            {state.errors?.role?.[0] ? (
              <span id="user-role-error" role="alert" className="mt-2 block text-xs text-red-700">
                {state.errors.role[0]}
              </span>
            ) : null}
          </label>
          <label
            className="flex min-h-12 items-center gap-3 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink"
            htmlFor="user-active"
          >
            <input
              id="user-active"
              defaultChecked={user.active}
              disabled={disabled || isSelf}
              name="active"
              type="checkbox"
              value="true"
              className="size-4 accent-bronze"
            />
            Usuario activo
            {isSelf ? <input name="active" type="hidden" value="true" /> : null}
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar usuario"}
        </button>
      </div>
    </form>
  );
}

function TextField({
  autoComplete,
  defaultValue,
  disabled,
  error,
  hint,
  label,
  name,
  type = "text",
}: {
  autoComplete?: string;
  defaultValue: string;
  disabled: boolean;
  error?: string;
  hint?: string;
  label: string;
  name: string;
  type?: string;
}) {
  const id = `user-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <input
        id={id}
        autoComplete={autoComplete}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      />
      {hint ? <span id={hintId} className="mt-2 block text-xs leading-5 text-ink/60">{hint}</span> : null}
      {error ? <span id={errorId} role="alert" className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
