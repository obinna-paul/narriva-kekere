export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getServiceBySlug, updateService, deleteService } from "@/lib/data/services";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const service = await getServiceBySlug(params.slug);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
  return NextResponse.json({ service });
}

const includedItemSchema = z.object({ title: z.string().min(1), description: z.string().min(1) });
const faqSchema = z.object({ question: z.string().min(1), answer: z.string().min(1) });

const contentSchema = z.object({
  tagline: z.string().min(1).optional(),
  opening: z.string().min(1),
  included: z.array(includedItemSchema),
  closing: z.string().min(1),
  costClarity: z.string().min(1),
  faqs: z.array(faqSchema),
});

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  content: contentSchema.optional(),
  order: z.number().int().optional(),
});

// Admin needs the service's id to call updateService/deleteService, which key
// off id — look it up by slug first since this route is addressed by slug.
async function resolveServiceId(slug: string) {
  const service = await getServiceBySlug(slug);
  return service?.id;
}

export const PUT = withAuth(
  async (request, _session, { params }: { params: { slug: string } }) => {
    const id = await resolveServiceId(params.slug);
    if (!id) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = await updateService(id, parsed.data);
    return NextResponse.json({ service });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (_request, _session, { params }: { params: { slug: string } }) => {
    const id = await resolveServiceId(params.slug);
    if (!id) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    await deleteService(id);
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
