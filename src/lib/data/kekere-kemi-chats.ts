import { prisma } from "@/lib/db/prisma";

interface StoredKemiMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  recommendedSlugs?: string[];
}

export interface AdminKemiMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AdminKemiConversationListItem {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  messageCount: number;
  lastMessagePreview: string;
  startedAt: Date;
  lastMessageAt: Date;
}

export interface AdminKemiConversationListResult {
  conversations: AdminKemiConversationListItem[];
  total: number;
}

/**
 * Product-usage view into Kemi's chat history — how readers are actually
 * talking to her, not a moderation queue (there's no report/flag mechanism
 * on a Kemi conversation the way there is for a Note). Like the Notes
 * monitor, this is the only place a conversation's content is ever read by
 * anyone other than the reader who had it — see the Privacy Policy for the
 * one-line disclosure that this exists.
 */
export async function listKemiConversationsForAdmin(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminKemiConversationListResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const search = params.search?.trim();

  const where = search
    ? {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.kemiConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        sessionId: true,
        startedAt: true,
        lastMessageAt: true,
        messages: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.kemiConversation.count({ where }),
  ]);

  return {
    total,
    conversations: rows.map((c) => {
      const messages = (c.messages as unknown as StoredKemiMessage[]) ?? [];
      const last = messages[messages.length - 1];
      return {
        id: c.id,
        sessionId: c.sessionId,
        userId: c.user.id,
        userName: c.user.name,
        userEmail: c.user.email,
        messageCount: messages.length,
        lastMessagePreview: last?.content.slice(0, 160) ?? "",
        startedAt: c.startedAt,
        lastMessageAt: c.lastMessageAt,
      };
    }),
  };
}

export interface AdminKemiConversationDetail {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  startedAt: Date;
  lastMessageAt: Date;
  messages: AdminKemiMessage[];
}

export async function getKemiConversationForAdmin(id: string): Promise<AdminKemiConversationDetail | null> {
  const c = await prisma.kemiConversation.findUnique({
    where: { id },
    select: {
      id: true,
      sessionId: true,
      startedAt: true,
      lastMessageAt: true,
      messages: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!c) return null;

  const messages = (c.messages as unknown as StoredKemiMessage[]) ?? [];
  return {
    id: c.id,
    sessionId: c.sessionId,
    userId: c.user.id,
    userName: c.user.name,
    userEmail: c.user.email,
    startedAt: c.startedAt,
    lastMessageAt: c.lastMessageAt,
    messages: messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
  };
}
