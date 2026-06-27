import { NarrivaTheme } from "@/components/theme";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorDetailLoading() {
  return (
    <NarrivaTheme>
      <main>
        <div className="mx-auto grid max-w-[1140px] gap-14 px-8 py-10 pb-[72px] lg:grid-cols-[34%_1fr]">
          <Skeleton className="aspect-[4/5] w-full rounded" />
          <div>
            <Skeleton className="h-12 w-72" />
            <Skeleton className="mt-4 h-5 w-80" />
            <Skeleton className="mt-7 h-24 w-full max-w-[520px]" />
          </div>
        </div>
      </main>
    </NarrivaTheme>
  );
}
