import { createClient } from "@/lib/supabase/server";

export type LmSmsRow = {
  id: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  to_phone: string;
  body: string;
  template_key: string | null;
  brevo_message_id: string | null;
  status: string;
  error: string | null;
  trigger_source: string | null;
  client_id: string | null;
  client_name: string | null;
  client_city: string | null;
  duplicate_of_id: string | null;
  duplicate_of_sent_at: string | null;
};

export type LmSmsStats = {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  skippedDuplicate: number;
  skippedOther: number;
  uniquePhones: number;
  last24h: number;
};

const EVENT_KEY = "lead_lm_received";

export async function listLmSmsLog(opts: {
  page?: number;
  pageSize?: number;
  status?: "all" | "sent" | "failed" | "skipped_duplicate";
} = {}): Promise<{ rows: LmSmsRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(200, opts.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let q = supabase
    .from("sms_log")
    .select(
      "id, created_at, sent_at, delivered_at, to_phone, body, template_key, brevo_message_id, status, error, trigger_source, client_id",
      { count: "exact" },
    )
    .eq("event_key", EVENT_KEY)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.status && opts.status !== "all") {
    if (opts.status === "sent") q = q.in("status", ["sent", "delivered"]);
    else q = q.eq("status", opts.status);
  }

  const { data, count } = await q;
  const logs = data ?? [];

  const clientIds = Array.from(
    new Set(logs.map((l) => l.client_id).filter(Boolean) as string[]),
  );
  const clientsById = new Map<string, { display_name: string; city: string | null }>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, display_name, city")
      .in("id", clientIds);
    for (const c of clients ?? []) {
      clientsById.set(c.id, { display_name: c.display_name, city: c.city ?? null });
    }
  }

  const dupPhones = Array.from(
    new Set(
      logs
        .filter((l) => l.status === "skipped_duplicate")
        .map((l) => l.to_phone),
    ),
  );
  const originalByPhone = new Map<string, { id: string; sent_at: string | null }>();
  if (dupPhones.length > 0) {
    const { data: originals } = await supabase
      .from("sms_log")
      .select("id, to_phone, sent_at, created_at")
      .eq("event_key", EVENT_KEY)
      .in("to_phone", dupPhones)
      .in("status", ["sent", "delivered"])
      .order("created_at", { ascending: true });
    for (const o of originals ?? []) {
      if (!originalByPhone.has(o.to_phone)) {
        originalByPhone.set(o.to_phone, { id: o.id, sent_at: o.sent_at ?? o.created_at });
      }
    }
  }

  const rows: LmSmsRow[] = logs.map((l) => {
    const client = l.client_id ? clientsById.get(l.client_id) : null;
    const orig = l.status === "skipped_duplicate" ? originalByPhone.get(l.to_phone) : null;
    return {
      id: l.id,
      created_at: l.created_at,
      sent_at: l.sent_at,
      delivered_at: l.delivered_at,
      to_phone: l.to_phone,
      body: l.body,
      template_key: l.template_key,
      brevo_message_id: l.brevo_message_id,
      status: l.status,
      error: l.error,
      trigger_source: l.trigger_source,
      client_id: l.client_id,
      client_name: client?.display_name ?? null,
      client_city: client?.city ?? null,
      duplicate_of_id: orig?.id ?? null,
      duplicate_of_sent_at: orig?.sent_at ?? null,
    };
  });

  return { rows, total: count ?? rows.length };
}

export async function getLmSmsStats(): Promise<LmSmsStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sms_log")
    .select("status, to_phone, created_at")
    .eq("event_key", EVENT_KEY)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = data ?? [];
  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const stats: LmSmsStats = {
    total: rows.length,
    sent: 0,
    delivered: 0,
    failed: 0,
    skippedDuplicate: 0,
    skippedOther: 0,
    uniquePhones: 0,
    last24h: 0,
  };
  const phones = new Set<string>();
  for (const r of rows) {
    if (r.status === "sent") stats.sent += 1;
    else if (r.status === "delivered") stats.delivered += 1;
    else if (r.status === "failed" || r.status === "bounced") stats.failed += 1;
    else if (r.status === "skipped_duplicate") stats.skippedDuplicate += 1;
    else if (r.status === "skipped") stats.skippedOther += 1;
    phones.add(r.to_phone);
    if (new Date(r.created_at).getTime() >= since24h) stats.last24h += 1;
  }
  stats.uniquePhones = phones.size;
  return stats;
}
