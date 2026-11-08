import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * The shells Home's sections show while their words stream in: page.tsx wraps every section that reads the
 * visitor's language in <Suspense>, so the page's shell (this file, plus the cached showcase) prerenders at
 * build time and the translated words arrive with the request. Nothing here reads cookies or translation
 * keys — it is static HTML. Each shell keeps its section's real frame (the same `home-cv` box and `--cv`
 * heights) and the same number of tiles, so the page doesn't jump when the real section lands.
 */

/** A section under the fold, laid out only once it nears the screen (.home-cv in globals.css). */
const SECTION = "home-cv -mx-4 mt-8 -mb-2 px-4 py-2 sm:mt-12";
/** A preset card's picture: four to three. */
const CARD = "aspect-[4/3] rounded-lg";
/** A rail item: two-thirds of a phone's width, a grid cell from sm up. */
const RAIL_ITEM = "w-[64%] shrink-0 sm:w-auto";
/** A card's name and line, as two bars. */
const NAME = "mt-2 space-y-1.5";

/** A section's heading with its count, and its line: bars, not words (the words are what streams). */
function Head({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mb-4" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className={cn("h-7", wide ? "w-56" : "w-40")} />
          <Skeleton className="h-6 w-9 rounded-full" />
        </div>
        <Skeleton className="h-4 w-14 shrink-0" />
      </div>
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
    </div>
  );
}

/** A preset row's placeholders at the counts the real one shows (ROWS in home-sections.tsx): 24 at xl, 16 at lg, 12 at sm. */
function PresetTiles({ className }: { className: string }) {
  return (
    <div className={cn("flex snap-x sm:grid sm:[mask-image:none] gap-0", className)}>
      {Array.from({ length: 24 }, (_, i) => (
        <Skeleton key={i} className={cn(RAIL_ITEM, CARD, i >= 16 && "lg:max-xl:hidden", i >= 12 && "sm:max-lg:hidden")} />
      ))}
    </div>
  );
}

export function LiveEditSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:720px] sm:[--cv:860px] md:[--cv:820px] lg:[--cv:470px] xl:[--cv:500px]")} aria-busy="true">
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-10">
        <Skeleton className="aspect-[4/3] w-full rounded-lg lg:col-span-7" />
        <div className="min-w-0 lg:col-span-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="mt-3 h-7 w-52" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-4 w-full max-w-[36ch]" />
            ))}
          </div>
          <Skeleton className="mt-6 h-10 w-40 rounded-full" />
        </div>
      </div>
    </section>
  );
}

/** Camera motions and Effects share the row's shape; only the heading's words differ (they stream). */
export function MotionsSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:336px] sm:[--cv:935px] md:[--cv:1014px] lg:[--cv:1039px] xl:[--cv:930px]")} aria-busy="true">
      <Head />
      <PresetTiles className="sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" />
    </section>
  );
}

export function EffectsSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:336px] sm:[--cv:951px] md:[--cv:1014px] lg:[--cv:1023px] xl:[--cv:930px]")} aria-busy="true">
      <Head />
      <PresetTiles className="sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" />
    </section>
  );
}

export function AppsSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:676px] sm:[--cv:1384px] md:[--cv:1496px] lg:[--cv:1198px] xl:[--cv:719px]")} aria-busy="true">
      <Head wide />
      <div className="grid grid-cols-1 gap-6 xl:-mx-1.5 xl:grid-cols-36 xl:gap-0">
        <Skeleton className="aspect-[4/3] rounded-xl xl:col-span-15 xl:row-span-2 xl:pt-1.5 xl:pr-2.5 xl:pl-1.5" />
        <div className="self-start sm:grid-cols-3 lg:grid-cols-4 xl:contents">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton
              key={i}
              className={cn(CARD, "w-[64%] sm:w-auto", i < 6 ? "xl:col-span-7" : "xl:col-span-6", i >= 12 && "xl:hidden", i >= 8 && "lg:max-xl:hidden")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function StudiosSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:529px] sm:[--cv:1526px] md:[--cv:1614px] lg:[--cv:1262px] xl:[--cv:1394px]")} aria-busy="true">
      <Head />
      <div className="gap-3 sm:grid sm:grid-cols-2 sm:gap-x-3 sm:gap-y-4 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={cn(RAIL_ITEM, i >= 8 && "sm:max-lg:hidden")}>
            <Skeleton className={CARD} />
            <div className={NAME}>
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 mb-2 h-3.5 w-28" />
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    </section>
  );
}

export function AssistSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:912px] sm:[--cv:831px] md:[--cv:911px] lg:[--cv:562px] xl:[--cv:480px]")} aria-busy="true">
      <div className="grid gap-8 rounded-2xl border bg-card p-5 sm:p-7 lg:grid-cols-2">
        <div className="min-w-0">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="mt-3 h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
          <div className="mt-5 space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-3.5 w-full max-w-[42ch]" />
            ))}
          </div>
          <Skeleton className="mt-5 h-3.5 w-72 max-w-full" />
          <Skeleton className="mt-4 h-9 w-44 rounded-full" />
        </div>
        <div className="min-w-0 space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function OpenSourceSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:528px] sm:[--cv:494px] md:[--cv:571px] lg:[--cv:494px] xl:[--cv:363px]")} aria-busy="true">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-2 h-4 w-64 max-w-[62ch]" />
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl bg-muted/50 p-6 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-w-0">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function StartSkeleton() {
  return (
    <section className={cn(SECTION, "[--cv:843px] sm:[--cv:726px] md:[--cv:748px] lg:[--cv:430px] xl:[--cv:427px]")} aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="min-w-0 rounded-2xl bg-media p-5 lg:col-span-7">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
          <Skeleton className="mt-4 h-28 w-full rounded-xl" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeFooterSkeleton() {
  return (
    <footer className="mt-12 flex flex-wrap items-end justify-between gap-4 border-t pt-8 pb-4" aria-busy="true">
      <div>
        <Skeleton className="h-6 w-16" />
        <Skeleton className="mt-2 h-3 w-40" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-3.5 w-16" />
        ))}
      </div>
    </footer>
  );
}
