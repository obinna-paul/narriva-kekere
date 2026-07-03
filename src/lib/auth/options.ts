import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";

import { prisma } from "@/lib/db/prisma";

const isProduction = process.env.NODE_ENV === "production";
const sharedCookieDomain = isProduction ? ".narriva.pro" : undefined;

const IMPERSONATION_SECRET =
  process.env.NEXTAUTH_SECRET ?? "impersonation-fallback-secret";

function signImpersonationPayload(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signTarget = `${header}.${body}`;
  const hmac = createHmac("sha256", IMPERSONATION_SECRET);
  hmac.update(signTarget);
  const signature = hmac.digest("base64url");
  return `${signTarget}.${signature}`;
}

function verifyImpersonationPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const signTarget = `${parts[0]}.${parts[1]}`;
    const hmac = createHmac("sha256", IMPERSONATION_SECRET);
    hmac.update(signTarget);
    const expected = hmac.digest("base64url");

    if (expected !== parts[2]) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Record<string, unknown>;

    if (payload.expiresAt && Date.now() > (payload.expiresAt as number)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getImpersonationFromCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    /impersonation_token=([^;]+)/,
  );
  if (!match) return null;

  const payload = verifyImpersonationPayload(match[1]);
  if (!payload) return null;

  return {
    id: payload.impersonatedUserId as string,
    isImpersonated: true as const,
    actualAdminId: payload.impersonatingAdminId as string,
  };
}

export function extractImpersonation(request: Request) {
  return getImpersonationFromCookies(request);
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: sharedCookieDomain,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true,
            suspended: true,
            suspendedUntil: true,
            emailVerified: true,
          },
        });

        if (!user) return null;

        if (user.suspended) {
          if (user.suspendedUntil && user.suspendedUntil.getTime() < Date.now()) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                suspended: false,
                suspensionReason: null,
                suspendedUntil: null,
              },
            });
          } else {
            return null;
          }
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValidPassword) return null;

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

export { signImpersonationPayload, verifyImpersonationPayload };
