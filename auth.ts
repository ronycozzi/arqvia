import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthErrorType, isExpiredAuthSessionError } from "@/lib/auth-error";
import {
  buildRateLimitKey,
  clearRateLimit,
  getClientIp,
  rateLimit,
  releaseRateLimitReservation,
} from "@/lib/rate-limit";
import { serverEnv } from "@/lib/server-env";
import { logServerError, logServerWarning } from "@/lib/logger";
import { loginSchema } from "@/lib/validations";

const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const INVALID_PASSWORD_HASH =
  "$2b$12$4sFHEq9wcqnIZtWYqaDvruKPcNm0bYMnE89fUfOTOGaoVcCJSM1bm"; // nosemgrep: generic.secrets.security.detected-bcrypt-hash.detected-bcrypt-hash -- timing equalizer, not a credential

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: serverEnv.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/admin/login",
  },
  logger: {
    error(error) {
      const errorType = getAuthErrorType(error);
      if (isExpiredAuthSessionError(error)) {
        logServerWarning("auth.session_cookie_rejected", { errorType });
        return;
      }

      logServerError("auth.error", error, { errorType });
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const normalizedEmail = parsed.data.email.trim().toLowerCase();
        const loginKeys = [
          buildRateLimitKey("admin-login:email", normalizedEmail),
          buildRateLimitKey("admin-login:ip", getClientIp(request)),
        ];
        const reservations = await Promise.all(
          loginKeys.map((key) => rateLimit(key, 8, 15 * 60_000)),
        );
        if (reservations.some((item) => !item.allowed)) {
          await Promise.all(
            reservations.map((item, index) =>
              item.allowed
                ? releaseRateLimitReservation(loginKeys[index])
                : Promise.resolve(),
            ),
          );
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            active: true,
            email: true,
            id: true,
            image: true,
            name: true,
            passwordHash: true,
            role: true,
            sessionVersion: true,
          },
        });

        const isValid = await compare(
          parsed.data.password,
          user?.passwordHash || INVALID_PASSWORD_HASH,
        );
        if (!user?.passwordHash || !user.active || !isValid) {
          return null;
        }

        // A valid account may clear its own email bucket, but never the shared
        // IP bucket: otherwise one known credential could reset protection for
        // password spraying against other employees.
        await Promise.all([
          clearRateLimit(loginKeys[0]),
          releaseRateLimitReservation(loginKeys[1]),
        ]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = token.role;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
  },
});
