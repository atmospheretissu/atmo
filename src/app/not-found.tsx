import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="px-6 py-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <p className="text-[11.5px] font-semibold tracking-wider uppercase text-muted-2 mb-3">
            Erreur 404 · Page introuvable
          </p>
          <h1 className="text-[88px] font-semibold tracking-tight text-ink leading-none mb-2 tabular-nums">
            404
          </h1>
          <p className="text-[18px] text-ink-2 mb-3 font-medium">
            Cette page semble s'être faufilée derrière un rideau.
          </p>
          <p className="text-[13.5px] text-muted leading-relaxed mb-8">
            Le lien est peut-être ancien, ou la ressource a été archivée. Revenez au tableau de bord pour retrouver vos devis, dossiers et poses.
          </p>

          <div className="flex items-center justify-center gap-2">
            <Link href="/dashboard">
              <Button variant="primary" size="md">
                <Home className="h-4 w-4" strokeWidth={2.2} />
                Tableau de bord
              </Button>
            </Link>
            <Link href="/devis">
              <Button variant="secondary" size="md">
                <Search className="h-4 w-4" strokeWidth={2.2} />
                Rechercher un devis
              </Button>
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-line">
            <p className="text-[11.5px] text-muted-2 mb-3">Suggestions populaires</p>
            <div className="flex items-center justify-center flex-wrap gap-2">
              <Link
                href="/devis/nouveau"
                className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-white border border-line hover:border-line-strong text-[12px] text-ink-2 transition-colors"
              >
                Nouveau devis
              </Link>
              <Link
                href="/confections"
                className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-white border border-line hover:border-line-strong text-[12px] text-ink-2 transition-colors"
              >
                Confections
              </Link>
              <Link
                href="/reception"
                className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-white border border-line hover:border-line-strong text-[12px] text-ink-2 transition-colors"
              >
                Scanner un colis
              </Link>
              <Link
                href="/poses"
                className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-white border border-line hover:border-line-strong text-[12px] text-ink-2 transition-colors"
              >
                Planning des poses
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-5 flex items-center justify-between text-[11.5px] text-muted">
        <span>© 2026 Atmosphère Tissus</span>
        <Link href="#" className="hover:text-ink-2 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Signaler un lien cassé
        </Link>
      </footer>
    </div>
  );
}
