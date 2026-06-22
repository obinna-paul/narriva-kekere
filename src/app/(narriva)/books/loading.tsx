import { NarrivaTheme } from "@/components/theme";
import { Container, Section, Grid } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BooksLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
            <Skeleton className="mt-10 h-24 w-full rounded-lg" />
            <Grid cols={3} gap="lg" className="mt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-full rounded-lg" />
              ))}
            </Grid>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
