/**
 * Server-side verification of a Cloudflare Turnstile token. Used at the two
 * places automated abuse is most costly — sign-up (fake accounts) and
 * wallet top-up (payment fraud attempts) — not on every page, per the
 * explicit scope given for this hardening pass.
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // Not configured in this environment — fail closed in production, but
    // don't hard-block local/sandbox development where the key is unset.
    return process.env.NODE_ENV !== "production";
  }

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
