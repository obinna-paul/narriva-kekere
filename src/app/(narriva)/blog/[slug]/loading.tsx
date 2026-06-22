import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogDetailLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container size="md">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-12 w-full" />
            <Skeleton className="mt-4 h-4 w-48" />
          </Container>
        </Section>
        <Section className="!pt-0">
          <Container size="md">
            <Skeleton className="h-64 w-full rounded-lg sm:h-80" />
            <div className="mt-10 flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
