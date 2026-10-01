type CookieOptions = {
  httpOnly: boolean;
  path: string;
  sameSite: "lax";
  secure: boolean;
};

type AuthCookie = { name: string; options: CookieOptions };

export type AuthCookieOverrides = {
  cookies: {
    callbackUrl: AuthCookie;
    csrfToken: AuthCookie;
    sessionToken: AuthCookie;
  };
  useSecureCookies: boolean;
};

/**
 * Auth.js cookies for a deployment that shares its domain with other apps.
 *
 * The defaults ("authjs.session-token", Path=/) would be sent to, and could be
 * overwritten by, every other app on the host. Under a base path the cookies
 * get their own name and are confined to the prefix. At the domain root the
 * function returns `null` and Auth.js keeps its defaults, so existing sessions
 * are not invalidated.
 *
 * The "__Host-" prefix is not usable here: it requires Path=/.
 */
export function buildAuthCookieOverrides(
  basePath: string,
  env: Record<string, string | undefined> = process.env,
): AuthCookieOverrides | null {
  if (!basePath) return null;

  const authUrl = env.AUTH_URL || env.NEXTAUTH_URL || "";
  const secure = authUrl
    ? authUrl.trim().toLowerCase().startsWith("https://")
    : Boolean(env.VERCEL);
  const scope = basePath.replace(/^\/+/, "").replace(/\//g, ".");
  const prefix = `${secure ? "__Secure-" : ""}${scope}`;
  const options: CookieOptions = {
    httpOnly: true,
    path: basePath,
    sameSite: "lax",
    secure,
  };

  return {
    cookies: {
      callbackUrl: { name: `${prefix}.callback-url`, options },
      csrfToken: { name: `${prefix}.csrf-token`, options },
      sessionToken: { name: `${prefix}.session-token`, options },
    },
    useSecureCookies: secure,
  };
}
