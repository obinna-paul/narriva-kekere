import { NarrivaTheme } from "@/components/theme";
import { Container, Section, Grid } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function NarrivaHomeLoading() {
  return (
    <NarrivaTheme>
      <main>
        <Section spacing="lg" className="flex min-h-screen items-center !py-0">
          <Container>
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <Skeleton className="h-16 w-full max-w-lg" />
                <Skeleton className="mt-6 h-20 w-full max-w-xl" />
                <div className="mt-8 flex gap-3">
                  <Skeleton className="h-14 w-56" />
                  <Skeleton className="h-14 w-48" />
                </div>
              </div>
              <Skeleton className="aspect-[4/5] w-full max-w-sm" />
            </div>
          </Container>
        </Section>
        <Section>
          <Container>
            <Grid cols={3} gap="lg">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-full rounded-lg" />
              ))}
            </Grid>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
