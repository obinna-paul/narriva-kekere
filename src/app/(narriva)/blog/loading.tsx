import { NarrivaTheme } from "@/components/theme";
import { Container, Section, Grid } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <Skeleton className="h-10 w-56" />
            <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
            <Skeleton className="mt-8 h-11 w-full max-w-sm" />
            <Grid cols={3} gap="lg" className="mt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-lg" />
              ))}
            </Grid>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
