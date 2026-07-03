export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { createService, listServices } from "@/lib/data/services";

export async function GET() {
  const services = await listServices();
  return NextResponse.json({ services });
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

const serviceSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  content: contentSchema,
  order: z.number().int().optional(),
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = await createService(parsed.data);
    return NextResponse.json({ service }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
