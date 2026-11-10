import { Suspense } from "react";
import { StudioChrome } from "@/components/nav/studio-chrome";
import { ShareProvider } from "@/components/share/share-provider";
import { navCovers } from "@/lib/nav-covers";

/**
 * The studio pages read the saved language on the server (getServerLang → cookies()) at the top of their render and
 * inside each section. Runtime data is only allowed during a prerender when it is read inside a Suspense boundary;
 * without one Next raises "runtime data during prerendering", and `next dev`'s HMR recovery turns that into a reload
 * loop. Wrapping the page here defers every cookie read to a suspended segment, so the route shells statically and
 * the loop is gone. The layout's chrome and providers read no runtime data, so they stay outside the boundary.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioChrome covers={navCovers()}>
      <ShareProvider>
        <Suspense fallback={null}>{children}</Suspense>
      </ShareProvider>
    </StudioChrome>
  );
}
