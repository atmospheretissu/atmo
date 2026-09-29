-- ===========================================================================
-- SMS senders explicites par template (29/09/2026)
--
-- Contexte : David a rapporté que les SMS clients Atmosphère partaient en
-- tant que "LEROYMERLIN" alors que ce sender doit être réservé au flow
-- Atmolead (invitation visio, échantillons, relances leads LM). Cause :
-- variable env Railway BREVO_SMS_SENDER=LEROYMERLIN qui servait de fallback
-- pour TOUS les templates dont le champ sender était NULL.
--
-- Correctif : on inscrit un sender explicite sur chaque template — plus
-- aucun héritage silencieux depuis l'env var. Cf. commit associé qui
-- retire aussi le fallback env var côté code (client.ts + send-sms.ts).
-- ===========================================================================

UPDATE public.sms_templates SET sender = 'ATMOSPHERE'
  WHERE key IN (
    'acompte_recu',
    'article_pret',
    'devis_envoye',
    'devis_valide',
    'pose_effectuee',
    'pose_planifiee',
    'tous_recus'
  );

-- Rappel pose J-1 : garde son sender dédié "ATMO-POSE" pour distinguer
-- les rappels J-1 (opérationnels, jour proche) des SMS commerciaux.
UPDATE public.sms_templates SET sender = 'ATMO-POSE'
  WHERE key = 'pose_planifiee_j1' AND (sender IS NULL OR sender = '');

-- Templates dédiés au canal Leroy Merlin : sender "LEROYMERLIN" pour
-- que le client identifie l'origine du message.
UPDATE public.sms_templates SET sender = 'LEROYMERLIN'
  WHERE key = 'echantillons_lm';
