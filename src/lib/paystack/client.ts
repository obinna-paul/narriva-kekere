import crypto from "crypto";

/**
 * Server-side Paystack integration via raw REST calls — both endpoints used
 * here (verify, webhook signature) are simple enough that pulling in the
 * `paystack` npm package would just add a dependency for two fetch() calls.
 * Checkout itself uses Paystack's Inline JS (see use-paystack-checkout.ts),
 * not a server-initiated redirect — keeps the buyer on the page and lets one
 * hook drive both Narriva book purchases and Kekere wallet top-ups.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackVerifyResult {
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number; // kobo
  currency: string;
  metadata: Record<string, unknown> | null;
  customer: { email: string };
}

/**
 * Re-verifies a transaction reference directly against Paystack's API.
 * Never trust a client-side `callback`/`onSuccess` alone — that handler only
 * proves the popup closed, not that Paystack actually settled the charge.
 */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );

  if (!res.ok) {
    throw new Error(`Paystack verify failed with status ${res.status}`);
  }

  const body = await res.json();
  return body.data as PaystackVerifyResult;
}

/**
 * Validates the `x-paystack-signature` header Paystack sends on every
 * webhook delivery: HMAC-SHA512 of the raw request body, keyed with the
 * secret key. Must run against the raw (unparsed) body — re-serializing
 * parsed JSON can produce a different byte sequence and fail verification.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signatureHeader) return false;

  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function authHeader(): Record<string, string> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return { Authorization: `Bearer ${secretKey}` };
}

export type BankResolveResult =
  | { verified: true; accountName: string }
  | { verified: false; message: string };

/**
 * Resolves a bank account name from account number + bank code, used to
 * confirm a writer's payout details before money ever moves. Never throws —
 * a failed resolution (bad account, Paystack outage) is a normal outcome
 * the caller still saves bank details for, just unverified.
 */
export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<BankResolveResult> {
  try {
    const res = await fetch(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: authHeader() }
    );
    const body = await res.json();
    if (!res.ok || !body?.status || !body?.data?.account_name) {
      return { verified: false, message: body?.message ?? `Resolution failed with status ${res.status}` };
    }
    return { verified: true, accountName: body.data.account_name as string };
  } catch (error) {
    return { verified: false, message: error instanceof Error ? error.message : "Network error" };
  }
}

export interface PaystackBank {
  name: string;
  code: string;
}

let bankListCache: { banks: PaystackBank[]; fetchedAt: number } | null = null;
const BANK_LIST_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Nigeria's bank list changes rarely enough that a 24h in-memory cache avoids
 * hitting Paystack on every withdrawal-page load, but often enough (new
 * fintech banks, renames) that it isn't worth hardcoding.
 */
export async function listBanks(): Promise<PaystackBank[]> {
  if (bankListCache && Date.now() - bankListCache.fetchedAt < BANK_LIST_TTL_MS) {
    return bankListCache.banks;
  }

  const res = await fetch(`${PAYSTACK_BASE_URL}/bank?currency=NGN&type=nuban`, {
    headers: authHeader(),
  });
  const body = await res.json();
  if (!res.ok || !body?.status) {
    throw new Error(body?.message ?? `Bank list fetch failed with status ${res.status}`);
  }

  const banks: PaystackBank[] = (body.data as Array<{ name: string; code: string }>).map((b) => ({
    name: b.name,
    code: b.code,
  }));
  bankListCache = { banks, fetchedAt: Date.now() };
  return banks;
}

export interface CreateTransferRecipientInput {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

/**
 * Creates a Paystack Transfer Recipient — a prerequisite for every transfer,
 * not cached, since bank details can change between withdrawals.
 */
export async function createTransferRecipient(input: CreateTransferRecipientInput): Promise<string> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "nuban",
      name: input.accountName,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
    }),
  });

  const body = await res.json();
  if (!res.ok || !body?.status || !body?.data?.recipient_code) {
    throw new Error(body?.message ?? `Transfer recipient creation failed with status ${res.status}`);
  }
  return body.data.recipient_code as string;
}

export interface InitiateTransferResult {
  transferCode: string;
  reference: string;
}

/** Initiates the actual payout. amountKobo must already be rounded to the nearest kobo. */
export async function initiateTransfer(
  recipientCode: string,
  amountKobo: number,
  reason: string
): Promise<InitiateTransferResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reason,
    }),
  });

  const body = await res.json();
  if (!res.ok || !body?.status) {
    throw new Error(body?.message ?? `Transfer initiation failed with status ${res.status}`);
  }
  return { transferCode: body.data.transfer_code as string, reference: body.data.reference as string };
}
