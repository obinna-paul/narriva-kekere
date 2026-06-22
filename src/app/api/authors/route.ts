import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { createAuthor, listAuthors } from "@/lib/data/authors";

export async function GET() {
  const authors = await listAuthors();
  return NextResponse.json({ authors });
}

const createAuthorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  slug: z.string().min(1),
  shortBio: z.string().optional(),
  bio: z.string().optional(),
  avatarColor: z.string().optional(),
  socialLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = createAuthorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const author = await createAuthor(parsed.data);
    return NextResponse.json(
      { author: { id: author.id, name: author.name, slug: author.slug } },
      { status: 201 }
    );
  },
  { roles: ["ADMIN"] }
);
