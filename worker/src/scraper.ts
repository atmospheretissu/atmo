import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { env } from './env.js';
import { logger } from './logger.js';
import type { AtmoleadConfig } from './supabase.js';
import { StepRecorder } from './steps.js';

export type AtmoLeadStatus =
  | 'nouveau'
  | 'visio_planifie'
  | 'echantillons'
  | 'devis_envoye'
  | 'valide'
  | 'perdu';

export type ScrapedLead = {
  external_ref: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;          // LM store name
  product_summary: string | null;
  amount: number | null;
  status: AtmoLeadStatus;
  status_label: string | null;    // raw LM label, kept for traceability
  last_update_label: string | null;
  source_url: string;
  raw_data: Record<string, unknown>;
};

export type ScrapeResult = {
  leads: ScrapedLead[];
  startedAt: Date;
  finishedAt: Date;
  steps: ReturnType<StepRecorder['toJSON']>;
};

const DEFAULT_SELECTORS = {
  startUrl: 'https://partenaires.leroymerlin.fr/',
  leadsUrl: 'https://partenaires.leroymerlin.fr/leads-management/leads',
  leadDetailUrlTemplate: 'https://partenaires.leroymerlin.fr/leads-management/leads/{id}',
  identifierInput: '#identifierInput',
  identifierSubmit: '#my_sign_on_button',
  passwordInput: 'input[type="password"]',
  passwordSubmit: '#signOnButton',
  loggedInUrlMatch: 'leads-management',
  leadCardPrefix: 'lead-card-',
} as const;

function s(config: AtmoleadConfig, key: keyof typeof DEFAULT_SELECTORS): string {
  return (config.css_selectors[key] as string | undefined) ?? DEFAULT_SELECTORS[key];
}

// Maps the LM "Tandem Pro" status label to Atmo's public.lead_status enum.
function mapStatus(label: string | null): AtmoLeadStatus {
  if (!label) return 'nouveau';
  const l = label.toLowerCase();
  if (l.includes('devis')) return 'devis_envoye';
  if (l.includes('visio') || l.includes('rendez-vous')) return 'visio_planifie';
  if (l.includes('échantillon') || l.includes('echantillon')) return 'echantillons';
  if (l.includes('gagné') || l.includes('valid') || l.includes('signé')) return 'valide';
  if (l.includes('perdu') || l.includes('refus') || l.includes('abandonn') || l.includes('annul')) return 'perdu';
  return 'nouveau';
}

function storeFromEmail(email: string | null): string | null {
  if (!email) return null;
  const m = email.match(/^[a-z.]+\.([a-z-]+)@leroymerlin\.fr$/i);
  return m?.[1] ? m[1].replace(/^./, (c) => c.toUpperCase()) : null;
}

async function login(page: Page, config: AtmoleadConfig): Promise<void> {
  logger.info('starting login flow');
  await page.goto(s(config, 'startUrl'), { waitUntil: 'domcontentloaded', timeout: 60_000 });

  await page.waitForSelector(s(config, 'identifierInput'), { timeout: 30_000 });
  await page.fill(s(config, 'identifierInput'), env.lmLogin);
  await page.click(s(config, 'identifierSubmit'));

  await page.waitForSelector(s(config, 'passwordInput'), { timeout: 30_000 });
  await page.fill(s(config, 'passwordInput'), env.lmPassword);
  await page.click(s(config, 'passwordSubmit'));

  await page.waitForURL(new RegExp(s(config, 'loggedInUrlMatch')), { timeout: 60_000 });
  logger.info({ url: page.url() }, 'login successful');
}

type ListItem = {
  id: string;
  name: string | null;
  status: string | null;
  product: string | null;
  location: string | null;
  lastUpdate: string | null;
  deadline: string | null;
  amount: string | null;
};

async function extractList(page: Page, config: AtmoleadConfig): Promise<{ items: ListItem[]; sourceUrl: string }> {
  await page.goto(s(config, 'leadsUrl'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  const prefix = s(config, 'leadCardPrefix');
  await page.waitForSelector(`[data-testid^="${prefix}"]`, { timeout: 30_000 }).catch(() => {});

  const items: ListItem[] = await page.$$eval(
    `[data-testid^="${prefix}"]`,
    (cards, p) =>
      Array.from(cards).map((c) => {
        const tid = c.getAttribute('data-testid') ?? '';
        const id = tid.slice(p.length);
        const titles = c.querySelectorAll('p[title]');
        return {
          id,
          name:
            Array.from(c.querySelectorAll('p.mt-text--semi-bold'))
              .find((p) => !p.closest('[data-testid="LeadAmountBadge"]'))
              ?.textContent?.trim() ?? null,
          status:
            c.querySelector('[data-testid="StatusBadge"] p')?.textContent?.trim() ?? null,
          product: (titles[0] as HTMLElement | undefined)?.getAttribute('title') ?? null,
          location: (titles[1] as HTMLElement | undefined)?.getAttribute('title') ?? null,
          lastUpdate:
            c.querySelector('p.mt-text--color-light')?.textContent?.trim() ?? null,
          deadline:
            c.querySelector('p.LeadCard__deadline-reached')?.textContent?.trim() ?? null,
          amount:
            c.querySelector('[data-testid="LeadAmountBadge"]')?.textContent?.trim() ?? null,
        };
      }),
    prefix,
  );

  return { items, sourceUrl: page.url() };
}

type DetailFields = {
  customerEmail: string | null;
  customerPhone: string | null;
  storeEmail: string | null;
  storeName: string | null;
  address: string | null;
};

async function extractDetail(context: BrowserContext, config: AtmoleadConfig, id: string): Promise<DetailFields> {
  const url = s(config, 'leadDetailUrlTemplate').replace('{id}', id);
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(500);

    const data = await page.evaluate(() => {
      const mailto = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map((a) =>
        (a as HTMLAnchorElement).href.replace(/^mailto:/, ''),
      );
      const tel = Array.from(document.querySelectorAll('a[href^="tel:"]')).map((a) =>
        (a as HTMLAnchorElement).href.replace(/^tel:/, ''),
      );

      let address: string | null = null;
      const labels = Array.from(document.querySelectorAll('.EventContentItem__label'));
      for (const lab of labels) {
        if ((lab.textContent ?? '').trim().toLowerCase().startsWith('adresse')) {
          const val = lab.parentElement?.querySelector('.EventContentItem__value');
          address = val?.textContent?.trim() ?? null;
          break;
        }
      }

      // Store display name: closest <p> preceding the store mailto link in DOM order,
      // sitting in its own row alongside a store icon — NOT the section header.
      let storeName: string | null = null;
      const storeMail = Array.from(document.querySelectorAll('a[href^="mailto:"]')).find((a) =>
        (a as HTMLAnchorElement).href.endsWith('@leroymerlin.fr'),
      );
      if (storeMail) {
        const allPs = Array.from(document.querySelectorAll('p'));
        const mailPos = storeMail.compareDocumentPosition;
        const candidates = allPs.filter(
          (p) =>
            // p is BEFORE storeMail in DOM
            (storeMail.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_PRECEDING) !== 0 &&
            !p.closest('a[href]') &&
            !/@|^\+?\d/.test(p.textContent ?? '') &&
            (p.textContent ?? '').trim().length > 0 &&
            (p.textContent ?? '').trim().length < 80,
        );
        // The store name is the LAST such <p> before the store mailto.
        // Section headers ("Informations sur…") are filtered by length but to be safe
        // we also drop any candidate containing 'magasin' / 'informations'.
        const stripped = candidates
          .map((p) => p.textContent?.trim() ?? '')
          .filter((t) => !/informations|magasin de référence/i.test(t));
        storeName = stripped[stripped.length - 1] ?? null;
      }

      return { mailto, tel, address, storeName };
    });

    const customerEmail = data.mailto.find((m) => !m.endsWith('@leroymerlin.fr')) ?? null;
    const storeEmail = data.mailto.find((m) => m.endsWith('@leroymerlin.fr')) ?? null;
    const customerPhone = data.tel[0] ?? null;
    return {
      customerEmail,
      customerPhone,
      storeEmail,
      storeName: data.storeName,
      address: data.address,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function scrape(config: AtmoleadConfig): Promise<ScrapeResult> {
  const startedAt = new Date();
  const recorder = new StepRecorder();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await recorder.run(
      'browser_launch',
      'Lancement du navigateur Chromium',
      () => chromium.launch({ headless: true }),
    );
    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 900 },
      locale: 'fr-FR',
    });

    if (env.debugTrace) {
      await context.tracing.start({ screenshots: true, snapshots: true });
    }

    const page = await context.newPage();
    await recorder.run('login', 'Connexion au portail Leroy Merlin', () => login(page, config));

    const { items, sourceUrl } = await recorder.run(
      'extract_list',
      'Extraction de la liste des leads',
      () => extractList(page, config),
      (r) => ({ count: r.items.length }),
    );
    await page.close().catch(() => {});
    logger.info({ count: items.length }, 'lead cards extracted');

    // Drill into each detail in parallel (batches of 3 to avoid hammering the site)
    let detailFailures = 0;
    const details = await recorder.run(
      'extract_details',
      `Extraction des fiches détaillées (${items.length} leads)`,
      async () =>
        mapWithConcurrency(items, 3, async (item) => {
          try {
            const d = await extractDetail(context!, config, item.id);
            return { id: item.id, ...d };
          } catch (err) {
            detailFailures++;
            logger.warn(
              { id: item.id, err: err instanceof Error ? err.message : String(err) },
              'detail extraction failed',
            );
            return {
              id: item.id,
              customerEmail: null,
              customerPhone: null,
              storeEmail: null,
              storeName: null,
              address: null,
            };
          }
        }),
      (r) => ({ count: r.length, failures: detailFailures }),
    );
    const byId = new Map(details.map((d) => [d.id, d]));
    logger.info({ count: details.length }, 'lead details extracted');

    if (env.debugTrace) {
      await context.tracing.stop({ path: 'trace.zip' });
    }

    const leads: ScrapedLead[] = items.map((r) => {
      const d = byId.get(r.id);
      const locMatch = r.location?.match(/^(\d{4,5})\s+(.+)$/);
      const postalCode = locMatch?.[1] ?? null;
      const city = locMatch?.[2] ?? r.location ?? null;
      const amount = r.amount ? Number(r.amount.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
      const store = d?.storeName ?? storeFromEmail(d?.storeEmail ?? null);

      return {
        external_ref: r.id,
        display_name: r.name,
        email: d?.customerEmail ?? null,
        phone: d?.customerPhone ?? null,
        address: d?.address ?? null,
        city,
        postal_code: postalCode,
        region: store ?? city ?? 'inconnu',
        product_summary: r.product,
        amount: Number.isFinite(amount) ? amount : null,
        status: mapStatus(r.status),
        status_label: r.status,
        last_update_label: r.lastUpdate,
        source_url: sourceUrl,
        raw_data: {
          ...r,
          detail: d ?? null,
          store,
        } as Record<string, unknown>,
      };
    });

    return { leads, startedAt, finishedAt: new Date(), steps: recorder.toJSON() };
  } catch (err) {
    // Make sure we still surface partial steps even on failure
    (err as Error & { steps?: unknown }).steps = recorder.toJSON();
    throw err;
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}
