"use client";

import { useState, useTransition } from "react";
import { submitDossierRatingAction } from "./actions";

export function RateForm({
  token,
  alreadyRated,
}: {
  token: string;
  alreadyRated: boolean;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    rating: number;
    googleReviewUrl: string | null;
  } | null>(null);

  if (alreadyRated) {
    return (
      <div className="p-6">
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Vous avez déjà noté ce dossier. Merci beaucoup pour votre retour !
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6">
        <p className="text-[15px] font-semibold text-ink mb-2">
          Merci pour votre retour de {submitted.rating}/5 ⭐
        </p>
        {submitted.googleReviewUrl ? (
          <>
            <p className="text-[13.5px] text-ink-2 leading-relaxed mb-4">
              Nous sommes ravis que votre expérience se soit si bien passée !
              Un avis Google nous aiderait beaucoup et prend moins d&apos;une
              minute :
            </p>
            <a
              href={submitted.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center h-12 rounded-md bg-ink text-white text-[14px] font-semibold hover:bg-ink/90 transition-colors leading-[3rem]"
            >
              Publier mon avis sur Google →
            </a>
          </>
        ) : (
          <p className="text-[13.5px] text-ink-2 leading-relaxed">
            Nous avons bien pris en compte votre retour. Notre équipe reviendra
            vers vous si nous devons ajuster quelque chose.
          </p>
        )}
      </div>
    );
  }

  const submit = () => {
    if (!rating) {
      setError("Merci de choisir une note.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await submitDossierRatingAction(token, rating, comment);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setSubmitted({ rating: r.rating, googleReviewUrl: r.googleReviewUrl });
    });
  };

  return (
    <div className="p-6">
      <p className="text-[13.5px] text-ink-2 mb-4">
        Comment évaluez-vous votre expérience avec Atmosphère Tissus ?
      </p>
      <div className="flex justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            disabled={pending}
            className={
              "h-14 w-14 rounded-full text-[24px] transition-all " +
              (rating != null && n <= rating
                ? "bg-amber text-white shadow-md"
                : "bg-canvas-2 text-muted-2 hover:bg-canvas hover:text-ink")
            }
            aria-label={`${n} sur 5`}
          >
            ★
          </button>
        ))}
      </div>
      <label className="block text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1.5">
        Un commentaire ? (facultatif)
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={pending}
        placeholder="Ce qui vous a plu, ce qui pourrait être amélioré…"
        rows={4}
        className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13.5px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
      />
      {error && (
        <div className="mt-3 text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
          {error}
        </div>
      )}
      <button
        onClick={submit}
        disabled={pending || !rating}
        className="mt-4 w-full h-12 rounded-md bg-ink text-white text-[15px] font-semibold hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Envoi…" : "Envoyer ma note"}
      </button>
    </div>
  );
}
