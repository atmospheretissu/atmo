import { listSuppliers } from "@/lib/db/suppliers";
import { listProfiles, listAuthUsers } from "@/lib/db/profiles";
import { listSmsTemplates } from "@/lib/db/sms-templates";
import { listEmailTemplates } from "@/lib/db/email-templates";
import { listPoseurs, listAteliers } from "@/lib/db/equipe";
import { listSources } from "@/lib/db/sources";
import { listStores } from "@/lib/db/stores";
import { listCatalogProductsPage } from "@/lib/db/catalog";
import { listAutomationRules } from "@/lib/db/automation-rules";
import { listEventAlerts } from "@/lib/db/event-alerts";
import ParametresClient from "./parametres-client";
import type { UserRole } from "@/lib/db/profiles-shared";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [
    suppliers,
    profiles,
    authUsers,
    smsTemplates,
    emailTemplates,
    poseurs,
    ateliers,
    sources,
    stores,
    catalog,
    automationRules,
    eventAlerts,
  ] = await Promise.all([
    listSuppliers(),
    listProfiles(),
    listAuthUsers().catch(() => []),
    listSmsTemplates(),
    listEmailTemplates(),
    listPoseurs(),
    listAteliers(),
    listSources(),
    listStores(),
    listCatalogProductsPage({ pageSize: 50 }),
    listAutomationRules(),
    listEventAlerts(),
  ]);

  const roleCounts: Record<UserRole, number> = {
    admin: 0,
    resp_magasin: 0,
    commercial: 0,
    resp_confection: 0,
    couturiere: 0,
    couturiere_externe: 0,
    poseur: 0,
    poseur_externe: 0,
    decoratrice: 0,
    consultation_lm: 0,
    collection_atmosphere: 0,
  };
  for (const p of profiles) {
    if (p.active !== false) roleCounts[p.role] += 1;
  }

  const envFlags = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    brevoEmail: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
    brevoSms: Boolean(process.env.BREVO_API_KEY),
    // Le client Pennylane (lib/pennylane/client.ts) lit UN TOKEN PAR SCOPE,
    // jamais PENNYLANE_API_KEY. S'appuyer sur cette dernière faisait
    // afficher « Connecté » alors qu'aucun appel ne pouvait aboutir.
    pennylane: Boolean(
      process.env.PENNYLANE_TOKEN_CUSTOMERS &&
        process.env.PENNYLANE_TOKEN_INVOICES,
    ),
  };

  return (
    <ParametresClient
      suppliers={suppliers}
      profiles={profiles}
      authUsers={authUsers}
      smsTemplates={smsTemplates}
      emailTemplates={emailTemplates}
      roleCounts={roleCounts}
      envFlags={envFlags}
      poseurs={poseurs}
      ateliers={ateliers}
      sources={sources}
      stores={stores}
      catalogProducts={catalog.products}
      catalogTotal={catalog.total}
      catalogCategories={catalog.categories}
      automationRules={automationRules}
      eventAlerts={eventAlerts}
    />
  );
}
