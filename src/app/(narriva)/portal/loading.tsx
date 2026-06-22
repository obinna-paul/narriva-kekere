import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container size="md">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="mt-4 h-5 w-full max-w-md" />
            <div className="mt-10 flex flex-col gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
