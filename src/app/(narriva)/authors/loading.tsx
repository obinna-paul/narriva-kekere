import { NarrivaTheme } from "@/components/theme";
import { Container, Section, Grid } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorsLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
            <Grid cols={4} gap="md" className="mt-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full rounded-lg" />
              ))}
            </Grid>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
