import { Topbar } from "@/components/shell/topbar";

/**
 * Skeleton générique pour toutes les pages /platform pendant la navigation.
 * S'affiche dès le clic sur un Link → l'utilisateur voit immédiatement la
 * structure de la nouvelle page pendant que le SSR fetch ses données.
 */
export default function PlatformLoading() {
  return (
    <>
      <Topbar breadcrumb={[{ label: "Atmosphère" }]} />
      <div className="flex-1 overflow-hidden">
        <section className="px-8 pt-10 pb-6">
          <div className="h-3 w-32 rounded bg-canvas-2 mb-3 animate-pulse" />
          <div className="h-9 w-72 rounded bg-canvas-2 mb-2 animate-pulse" />
          <div className="h-3 w-96 max-w-full rounded bg-canvas-2 animate-pulse" />
        </section>

        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-line rounded-2xl p-4 flex items-start gap-3"
              >
                <div className="h-9 w-9 rounded-xl bg-canvas-2 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-20 rounded bg-canvas-2 animate-pulse" />
                  <div className="h-5 w-16 rounded bg-canvas-2 animate-pulse" />
                  <div className="h-2 w-24 rounded bg-canvas-2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-8 pb-10">
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <div className="h-10 bg-canvas-2/40 border-b border-line" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border-b border-line last:border-0 px-4 py-3.5 flex items-center gap-3"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="h-8 w-8 rounded-full bg-canvas-2 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/3 rounded bg-canvas-2 animate-pulse" />
                  <div className="h-2.5 w-1/4 rounded bg-canvas-2 animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded-full bg-canvas-2 animate-pulse" />
                <div className="h-4 w-12 rounded bg-canvas-2 animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
