import type { Session } from "next-auth";

export type Role = "READER" | "WRITER" | "ADMIN";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function hasRole(session: Session | null, ...roles: Role[]): boolean {
  if (!session?.user) return false;
  return roles.includes(session.user.role as Role);
}

/** Throws ForbiddenError if the session's user doesn't have one of the given roles. */
export function requireRole(session: Session | null, ...roles: Role[]): void {
  if (!hasRole(session, ...roles)) {
    throw new ForbiddenError(
      `Requires one of roles: ${roles.join(", ")}`,
    );
  }
}

export const isAdmin = (session: Session | null) => hasRole(session, "ADMIN");
export const isWriter = (session: Session | null) =>
  hasRole(session, "WRITER", "ADMIN");
