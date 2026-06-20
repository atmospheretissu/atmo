-- =====================================================================
-- SMS dedup : normaliser les téléphones dans sms_log + index dédup
-- Permet d'identifier strictement si un SMS a déjà été envoyé à un lead
-- (clé = event_key + to_phone normalisé E.164).
-- =====================================================================

-- 1. Backfill des numéros existants vers E.164 (FR par défaut)
do $$
declare
  r record;
  digits text;
  norm text;
begin
  for r in select id, to_phone from public.sms_log where to_phone is not null loop
    digits := regexp_replace(r.to_phone, '[^0-9+]', '', 'g');
    norm := null;
    if digits like '00%' then
      norm := '+' || substring(digits from 3);
    elsif digits like '+%' then
      if length(digits) between 8 and 16 then
        norm := digits;
      end if;
    elsif length(digits) = 10 and left(digits, 1) = '0' then
      norm := '+33' || substring(digits from 2);
    elsif length(digits) = 9 and substring(digits from 1 for 1) between '1' and '9' then
      norm := '+33' || digits;
    end if;
    if norm is not null and norm <> r.to_phone then
      update public.sms_log set to_phone = norm where id = r.id;
    end if;
  end loop;
end $$;

-- 2. Index dédup : lookup rapide (event_key, to_phone) sur les envois réussis
create index if not exists sms_log_dedup_by_event_phone_idx
  on public.sms_log(event_key, to_phone)
  where status in ('sent', 'delivered');
