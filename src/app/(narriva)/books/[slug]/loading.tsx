import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookDetailLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr]">
              <Skeleton className="aspect-[3/4] w-full max-w-sm rounded-lg" />
              <div className="flex flex-col gap-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full max-w-md" />
                <Skeleton className="h-6 w-full max-w-lg" />
                <Skeleton className="h-24 w-full max-w-md rounded-lg" />
                <Skeleton className="h-12 w-40" />
              </div>
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
