import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { FileText, ScanLine, Receipt, Wrench, Lock } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ColorChip } from "@/components/ui/status-pill";
import { Sparkline } from "@/components/ui/sparkline";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectedFrom?: string }>;
}) {
  const params = await searchParams;
  const errorParam = params.error;

  return (
    <div className="min-h-screen canvas-bg flex flex-col lg:flex-row">
      {/* Left — form */}
      <section className="flex-1 lg:max-w-[520px] flex flex-col px-6 lg:px-12 py-8 lg:py-10">
        <Logo />

        <div className="flex-1 flex flex-col justify-center max-w-[400px] py-12 lg:py-16">
          <p className="eyebrow mb-4">Plateforme · v5.2</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-3">
            Connectez-vous à
            <br />
            votre <span className="gradient-text">atelier digital</span>
          </h1>
          <p className="text-[14px] text-muted leading-relaxed mb-8">
            Tous vos devis, confections, fournisseurs et poses au même endroit — du simulateur à la facture Pennylane.
          </p>

          <LoginForm initialError={errorParam ? "Connexion échouée. Réessayez." : undefined} />

          <div className="flex items-center gap-2 pt-5 text-[11.5px] text-muted">
            <Lock className="h-3 w-3" />
            <span>Connexion chiffrée · 2FA disponible · Hébergement Europe (Paris)</span>
          </div>
        </div>

        <footer className="flex items-center justify-between text-[11.5px] text-muted">
          <span>© 2026 Atmosphère Tissus</span>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-ink-2">Statut</Link>
            <Link href="#" className="hover:text-ink-2">Support</Link>
            <Link href="#" className="hover:text-ink-2">Mentions légales</Link>
          </div>
        </footer>
      </section>

      {/* Right — preview */}
      <aside className="hidden lg:flex flex-1 bg-white border-l border-line relative overflow-hidden">
        <div className="relative z-10 p-10 flex flex-col justify-center w-full max-w-[560px] mx-auto">
          <div className="space-y-5">
            <div className="card p-5">
              <p className="text-[11.5px] text-muted-2 font-semibold mb-2 tracking-wider uppercase">
                Chiffre d'affaires · 30 j
              </p>
              <p className="display-num text-[44px] gradient-text leading-none mb-3">
                84 200 €
              </p>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-emerald-soft text-emerald text-[11.5px] font-semibold">
                  ↑ +8,2%
                </span>
                <Sparkline data={[40, 38, 45, 50, 52, 48, 56, 62, 60, 68, 76, 84]} palette="orange" width={140} height={42} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <ColorChip tone="violet" size="sm" className="mb-2.5">
                  <FileText className="h-3.5 w-3.5" strokeWidth={2.4} />
                </ColorChip>
                <p className="text-[24px] font-semibold tabular-nums leading-none text-ink">47</p>
                <p className="text-[11.5px] text-muted mt-1">devis envoyés</p>
              </div>
              <div className="card p-4">
                <ColorChip tone="orange" size="sm" className="mb-2.5">
                  <ScanLine className="h-3.5 w-3.5" strokeWidth={2.4} />
                </ColorChip>
                <p className="text-[24px] font-semibold tabular-nums leading-none text-ink">23</p>
                <p className="text-[11.5px] text-muted mt-1">dossiers actifs</p>
              </div>
              <div className="card p-4">
                <ColorChip tone="pink" size="sm" className="mb-2.5">
                  <Receipt className="h-3.5 w-3.5" strokeWidth={2.4} />
                </ColorChip>
                <p className="text-[24px] font-semibold tabular-nums leading-none text-ink">5</p>
                <p className="text-[11.5px] text-muted mt-1">acomptes en attente</p>
              </div>
              <div className="card p-4">
                <ColorChip tone="emerald" size="sm" className="mb-2.5">
                  <Wrench className="h-3.5 w-3.5" strokeWidth={2.4} />
                </ColorChip>
                <p className="text-[24px] font-semibold tabular-nums leading-none text-ink">18</p>
                <p className="text-[11.5px] text-muted mt-1">poses · 7 jours</p>
              </div>
            </div>

            <p className="text-[15px] text-ink-2 leading-[1.45] max-w-md">
              «&nbsp;Zéro ressaisie entre le simulateur et la facture. Un QR code, une réception, un statut.&nbsp;»
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
