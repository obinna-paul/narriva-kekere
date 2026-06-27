import { NarrivaTheme } from "@/components/theme";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorsLoading() {
  return (
    <NarrivaTheme>
      <main>
        <div className="mx-auto max-w-[1140px] px-8 pb-[50px] pt-20">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="mt-4 h-5 w-full max-w-[480px]" />
        </div>
        <div className="mx-auto max-w-[1140px] px-8 pb-[110px]">
          <div className="grid grid-cols-1 gap-x-9 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-[3px]" />
            ))}
          </div>
        </div>
      </main>
    </NarrivaTheme>
  );
}
