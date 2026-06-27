import { NarrivaTheme } from "@/components/theme";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <NarrivaTheme>
      <main>
        <div className="mx-auto max-w-[1140px] px-8 pb-11 pt-20">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="mt-4 h-5 w-full max-w-[520px]" />
        </div>
        <div className="mx-auto max-w-[1140px] px-8 pb-[110px]">
          <div className="grid grid-cols-1 gap-x-9 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-[3px]" />
            ))}
          </div>
        </div>
      </main>
    </NarrivaTheme>
  );
}
