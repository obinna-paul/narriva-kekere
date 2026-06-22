import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorDetailLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <div className="flex items-center gap-6">
              <Skeleton className="h-28 w-28 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="mt-3 h-5 w-full max-w-md" />
              </div>
            </div>
            <Skeleton className="mt-10 h-24 w-full max-w-2xl" />
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
