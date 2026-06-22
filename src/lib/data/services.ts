import { prisma } from "@/lib/db/prisma";
import type { Prisma, Service } from "@prisma/client";

export interface ServiceContentJson {
  opening: string;
  included: { title: string; description: string }[];
  closing: string;
  costClarity: string;
  faqs: { question: string; answer: string }[];
}

export type ServiceWithContent = Omit<Service, "content"> & { content: ServiceContentJson };

function parseContent(service: Service): ServiceWithContent {
  return { ...service, content: service.content as unknown as ServiceContentJson };
}

export async function listServices(): Promise<ServiceWithContent[]> {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });
  return services.map(parseContent);
}

export async function getServiceBySlug(slug: string): Promise<ServiceWithContent | null> {
  const service = await prisma.service.findUnique({ where: { slug } });
  return service ? parseContent(service) : null;
}

export async function getServiceById(id: string): Promise<ServiceWithContent | null> {
  const service = await prisma.service.findUnique({ where: { id } });
  return service ? parseContent(service) : null;
}

export interface ServiceInput {
  slug: string;
  title: string;
  content: ServiceContentJson;
  order?: number;
}

export async function createService(data: ServiceInput): Promise<Service> {
  return prisma.service.create({
    data: { ...data, content: data.content as unknown as Prisma.InputJsonValue },
  });
}

export async function updateService(
  id: string,
  data: Partial<ServiceInput>
): Promise<Service> {
  const { content, ...rest } = data;
  return prisma.service.update({
    where: { id },
    data: {
      ...rest,
      ...(content ? { content: content as unknown as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function deleteService(id: string): Promise<void> {
  await prisma.service.delete({ where: { id } });
}
