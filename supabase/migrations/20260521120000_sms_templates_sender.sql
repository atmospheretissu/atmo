-- =====================================================================
-- Migration : ajout colonne `sender` à sms_templates + seed des templates
-- =====================================================================
-- Permet à chaque template SMS de définir son propre expéditeur Brevo
-- (max 11 caractères alphanumériques, conformité Brevo). À défaut, fallback
-- sur env BREVO_SMS_SENDER puis 'ATMOSPHERE' côté code.

alter table public.sms_templates
  add column if not exists sender text;

-- Contrainte : sender doit faire entre 3 et 11 caractères s'il est défini
alter table public.sms_templates
  drop constraint if exists sms_templates_sender_length;

alter table public.sms_templates
  add constraint sms_templates_sender_length
  check (sender is null or (length(sender) between 3 and 11));

-- =====================================================================
-- Seed : 6 templates du CDC (ON CONFLICT DO NOTHING pour idempotence)
-- =====================================================================

insert into public.sms_templates (key, label, body, trigger_description, sender, active) values
  (
    'devis_envoye',
    'Devis envoyé',
    'Bonjour {{prenom}}, votre devis Atmosphère Tissus est disponible : {{lien_pdf}}. À très vite !',
    'À l''envoi du devis (action manuelle ou auto)',
    'ATMOSPHERE',
    true
  ),
  (
    'acompte_recu',
    'Acompte reçu · confirmation',
    'Merci {{prenom}} ! Acompte de {{acompte}}€ bien reçu. La production de votre commande démarre.',
    'À l''encaissement de l''acompte',
    'ATMOSPHERE',
    true
  ),
  (
    'article_pret',
    'Article prêt au retrait',
    '{{prenom}}, votre commande {{produit}} est prête en magasin (lun-sam, 9h-19h). Atmosphère Tissus, 33 cours du Maréchal Foch.',
    'Au scan QR du dernier élément destiné au retrait',
    'ATMOSPHERE',
    true
  ),
  (
    'tous_recus',
    'Tous éléments reçus → pose planifiable',
    'Bonne nouvelle {{prenom}} ! Tous les éléments de votre dossier sont reçus. Nous vous contactons pour planifier la pose.',
    'Quand 100% des items du dossier sont reçus',
    'ATMOSPHERE',
    true
  ),
  (
    'pose_planifiee_j1',
    'Rappel pose J-1',
    '{{prenom}}, rappel : pose prévue demain {{date}} à {{heure}} avec {{poseur}}. À demain !',
    'J-1 à 10h (cron à brancher)',
    'ATMO-POSE',
    true
  ),
  (
    'pose_effectuee',
    'Pose effectuée · satisfaction',
    '{{prenom}}, votre pose est terminée. Merci de votre confiance. Votre avis compte : {{lien_avis}}',
    'Au marquage "pose effectuée"',
    'ATMOSPHERE',
    true
  )
on conflict (key) do nothing;
