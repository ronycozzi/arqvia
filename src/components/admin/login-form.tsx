"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LockKeyhole } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loginSchema } from "@/lib/validations";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ callbackUrl = "/admin" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    setError("");
    const response = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (response?.error) {
      setError("Credenciales inválidas o usuario inactivo.");
      return;
    }

    router.push(resolveAdminCallbackUrl(callbackUrl));
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="relative w-full border border-paper/12 bg-paper p-6 text-ink shadow-[0_28px_90px_rgb(0_0_0/0.28)] md:p-8"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-bronze to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Inicio de sesión
          </p>
          <h2 className="mt-2 font-serif text-4xl text-ink">
            Ingresar al admin
          </h2>
        </div>
        <span className="grid size-11 place-items-center border border-ink/10 bg-mist text-bronze">
          <LockKeyhole className="size-5" />
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-ink/70">
        Usa tus credenciales para gestionar consultas, proyectos, servicios y
        configuración comercial.
      </p>

      <div className="mt-6 block">
        <label
          htmlFor="admin-email"
          className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-ink/75"
        >
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "admin-email-error" : undefined}
          {...register("email")}
          className="h-12 w-full border border-ink/12 bg-white px-4 text-sm outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
        />
        {errors.email ? (
          <span id="admin-email-error" role="alert" className="mt-2 block text-xs text-red-700">
            {errors.email.message}
          </span>
        ) : null}
      </div>

      <div className="mt-4 block">
        <label
          htmlFor="admin-password"
          className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-ink/75"
        >
          Contraseña
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "admin-password-error" : undefined}
          {...register("password")}
          className="h-12 w-full border border-ink/12 bg-white px-4 text-sm outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
        />
        {errors.password ? (
          <span
            id="admin-password-error"
            role="alert"
            className="mt-2 block text-xs text-red-700"
          >
            {errors.password.message}
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Verificando..." : "Entrar al panel"}
      </button>

      <div className="mt-5 border-t border-ink/10 pt-4 text-xs leading-5 text-ink/60">
        No hay registro público. Solo un Admin puede crear perfiles para otros
        empleados desde Usuarios dentro del panel.
      </div>
    </form>
  );
}

function resolveAdminCallbackUrl(value: string) {
  if (
    value.startsWith("/admin") &&
    !value.startsWith("//") &&
    !value.startsWith("/admin/login")
  ) {
    return value;
  }

  return "/admin";
}
