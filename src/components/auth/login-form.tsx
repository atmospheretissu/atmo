"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInWithPassword, type AuthState } from "@/app/auth/actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signInWithPassword,
    initialError ? { error: initialError } : undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-soft text-red text-[12.5px] border border-red/15"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <Label htmlFor="email">Adresse email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="prenom.nom@atmospheretissus.fr"
          defaultValue={state?.email ?? ""}
          autoComplete="email"
          autoFocus
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="password" className="mb-0">
            Mot de passe
          </Label>
          <Link href="#" className="text-[12px] text-violet hover:underline font-medium">
            Oublié&nbsp;?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <Button variant="primary" size="lg" className="w-full group" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connexion…
          </>
        ) : (
          <>
            Accéder à la plateforme
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}
