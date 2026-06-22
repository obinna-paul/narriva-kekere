import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { deleteAuthor, getAuthorById, updateAuthor } from "@/lib/data/authors";
import { getAuthorBySlug } from "@/lib/data/authors";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  // Accept either the id or the slug, since /authors/[slug] pages and admin
  // /admin/authors/[id] forms both need to resolve a single author here.
  const author = (await getAuthorById(params.id)) ?? (await getAuthorBySlug(params.id));
  if (!author) {
    return NextResponse.json({ error: "Author not found" }, { status: 404 });
  }
  return NextResponse.json({ author });
}

// Admin-only mutations — not in the original API list, but the /admin/authors
// CRUD UI needs somewhere to send create/edit/delete requests.
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortBio: z.string().optional(),
  bio: z.string().optional(),
  avatarColor: z.string().optional(),
  socialLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const author = await updateAuthor(params.id, parsed.data);
    return NextResponse.json({ author });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (_request, _session, { params }: { params: { id: string } }) => {
    await deleteAuthor(params.id);
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
