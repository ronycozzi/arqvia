"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validations";

/**
 * Credentials sign-in as a Server Action.
 *
 * The browser helper from `next-auth/react` posts to a hard-coded
 * `/api/auth/...`, which does not exist when the app is served under a base
 * path. A Server Action posts to the current page, so it works at the domain
 * root and under any prefix, and the session cookie is set on the response.
 */
export async function loginWithCredentials(values: {
  email: string;
  password: string;
}): Promise<{ ok: boolean }> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false };
    throw error;
  }
}
