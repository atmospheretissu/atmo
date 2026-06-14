/**
 * Normalise un numéro de téléphone vers le format E.164 attendu par Brevo SMS.
 *
 * Règles :
 *   - "0667699490"          → "+33667699490"
 *   - "0033 6 67 69 94 90"  → "+33667699490"
 *   - "+33 6 67 69 94 90"   → "+33667699490"
 *   - "06.67.69.94.90"      → "+33667699490"
 *   - retourne null si invalide
 *
 * Par défaut on assume la France (FR) ; pour d'autres pays passer countryCode.
 */
export function normalizePhone(
  raw: string | null | undefined,
  countryCode: "FR" = "FR",
): string | null {
  if (!raw) return null;
  // Garde uniquement les chiffres et le +
  let s = raw.replace(/[^\d+]/g, "");
  if (!s) return null;

  // "0033..." → "+33..."
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    // Format international déjà — on garde tel quel, validation minimale
    if (s.length < 8 || s.length > 16) return null;
    return s;
  }

  // Format national : commence par 0
  if (countryCode === "FR") {
    // Numéro FR : 10 chiffres commençant par 0 (06, 07, 01, 02, 03, 04, 05, 09)
    if (s.length === 10 && s.startsWith("0")) {
      return "+33" + s.slice(1);
    }
    // Numéro déjà sans le 0 ?  ex: 667699490 (9 chiffres mobile)
    if (s.length === 9 && /^[1-9]/.test(s)) {
      return "+33" + s;
    }
  }
  return null;
}
