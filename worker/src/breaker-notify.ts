import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Envoie une alerte email quand le circuit-breaker se déclenche (N échecs
 * consécutifs → pause auto du scraping). Appel direct à l'API Brevo — le
 * worker n'a pas accès au wrapper sendBrevoEmail côté Next.js.
 *
 * Best-effort : un échec ici n'empêche pas le breaker de faire son travail
 * (pause en DB), il faut juste l'observer dans les logs Railway.
 */
export async function notifyBreakerTripped(args: {
  consecutiveFailures: number;
  lastErrorMessage: string;
  lastExecutionId: string;
  reason: string;
}): Promise<void> {
  if (!env.brevoApiKey) {
    logger.warn('breaker tripped but BREVO_API_KEY missing — no email sent');
    return;
  }
  const recipients = env.breakerAlertEmails
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
  if (recipients.length === 0) {
    logger.warn('breaker tripped but no ATMOLEAD_BREAKER_ALERT_EMAILS');
    return;
  }

  const execUrl = `https://atmo-production.up.railway.app/leads-lm/executions/${args.lastExecutionId}`;
  const configUrl = `https://atmo-production.up.railway.app/leads-lm/config`;

  const subject = `[Atmo] Scraping Leroy Merlin en panne — pause automatique`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px;background:#f8f7fb">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="padding:20px 24px;background:#fee2e2;border-bottom:1px solid #fca5a5">
    <p style="margin:0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:#991b1b">Alerte automatique</p>
    <h1 style="margin:4px 0 0 0;font-size:18px;color:#7f1d1d">Scraping Atmolead mis en pause</h1>
  </div>
  <div style="padding:24px">
    <p style="margin:0 0 12px 0;font-size:14px">Le circuit-breaker vient de se déclencher :</p>
    <ul style="margin:0 0 16px 0;padding-left:20px;font-size:13.5px;line-height:1.7">
      <li><strong>${args.consecutiveFailures} échecs consécutifs</strong></li>
      <li>Dernière erreur : <em>${escapeHtml(args.lastErrorMessage).slice(0, 200)}</em></li>
      <li>Motif enregistré : ${escapeHtml(args.reason)}</li>
    </ul>
    <p style="margin:0 0 12px 0;font-size:13.5px">
      Le scraping est en pause côté DB. Aucune nouvelle exécution ne sera
      lancée tant que ce n'est pas manuellement remis à zéro.
    </p>
    <p style="margin:16px 0">
      <a href="${execUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;margin-right:8px">Voir la dernière exécution</a>
      <a href="${configUrl}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Config scraper</a>
    </p>
    <p style="margin:20px 0 0 0;font-size:11.5px;color:#6b7280;line-height:1.6">
      Cette alerte a été envoyée par le worker Atmolead sur détection de
      pannes consécutives. Consulte la trace Playwright depuis la page
      d'exécution pour diagnostiquer.
    </p>
  </div>
</div>
</body></html>`;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.brevoApiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.brevoSenderEmail, name: 'Atmosphère (worker)' },
        to: recipients,
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, body: (await res.text()).slice(0, 200) },
        'breaker alert email failed',
      );
    } else {
      logger.info({ recipients: recipients.length }, 'breaker alert email sent');
    }
  } catch (err) {
    logger.warn({ err }, 'breaker alert email threw');
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
