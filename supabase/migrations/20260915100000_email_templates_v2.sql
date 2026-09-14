-- ==========================================================================
-- Refonte des templates email transactionnels (v2 — 15/09/2026)
--
-- Motivation (David) : les mails automatiques étaient trop pauvres. Le mail
-- "Votre commande est prête" ne contenait AUCUN lien (ni portail client,
-- ni info pratique). Refonte de bout en bout :
--
--   - Shell HTML cohérent appliqué automatiquement par sendEmailForTemplate
--     (header Atmosphère + footer + CTA principal + lien secondaire portail)
--   - Corps des templates recentré sur le message métier (1 titre, 1-2
--     paragraphes, 1 CTA), sans HTML de style dupliqué
--   - Placeholder <!-- atmo:cta --> : indique au shell où placer le bouton
--     principal. Si absent, le bouton est ajouté après le texte.
--   - Variables systématiques attendues : {{prenom}}, {{lien_portail}},
--     {{cta_primary_label}}, {{cta_primary_url}} (voir triggers).
--
-- Idempotent : on utilise UPDATE (pas INSERT ... ON CONFLICT), donc
-- ré-exécuter la migration écrase à nouveau les valeurs. Les templates
-- que l'admin aura personnalisés depuis l'UI seront réécrits — c'est
-- assumé pour cette bascule, le design précédent était clairement en
-- deçà des attentes.
-- ==========================================================================

UPDATE public.email_templates SET
  subject = 'Votre devis Atmosphère · {{numero_devis}}',
  html_body =
    '<p style="margin:0 0 12px 0">Bonjour <strong>{{prenom}}</strong>,</p>' ||
    '<p style="margin:0 0 12px 0">Voici votre devis <strong>{{numero_devis}}</strong> — total <strong>{{total_ttc}} € TTC</strong>.</p>' ||
    '<p style="margin:0 0 4px 0">Pour lancer la commande, il vous suffit de signer et régler l''acompte en ligne. La signature électronique fait office d''acceptation ferme du devis.</p>' ||
    '<!-- atmo:cta -->' ||
    '<p style="margin:0 0 12px 0;font-size:12.5px;color:#6b7280">Le devis détaillé est en pièce jointe (PDF).</p>',
  text_body =
    'Bonjour {{prenom}},' || chr(10) || chr(10) ||
    'Voici votre devis {{numero_devis}} — total {{total_ttc}} € TTC.' || chr(10) || chr(10) ||
    'Signer et payer en ligne : {{cta_primary_url}}' || chr(10) || chr(10) ||
    'Suivre ma commande : {{lien_portail}}'
WHERE key = 'devis_envoye';

UPDATE public.email_templates SET
  subject = 'Acompte reçu — votre commande démarre',
  html_body =
    '<p style="margin:0 0 12px 0">Bonjour <strong>{{prenom}}</strong>,</p>' ||
    '<p style="margin:0 0 12px 0">Nous avons bien reçu votre acompte de <strong>{{acompte}} €</strong>. Votre commande passe en production immédiatement.</p>' ||
    '<p style="margin:0 0 8px 0">Vous pouvez suivre l''avancement (commandes fournisseurs, réception, pose planifiée) depuis votre espace client à tout moment :</p>' ||
    '<!-- atmo:cta -->' ||
    '<p style="margin:0 0 12px 0;font-size:12.5px;color:#6b7280">Nous vous préviendrons dès que tout est arrivé pour convenir d''un créneau de pose.</p>',
  text_body =
    'Bonjour {{prenom}},' || chr(10) || chr(10) ||
    'Nous avons bien reçu votre acompte de {{acompte}} €. Votre commande passe en production.' || chr(10) || chr(10) ||
    'Suivre ma commande : {{lien_portail}}'
WHERE key = 'acompte_recu';

UPDATE public.email_templates SET
  subject = 'Votre commande est prête · dossier {{numero_dossier}}',
  html_body =
    '<p style="margin:0 0 12px 0">Bonjour <strong>{{prenom}}</strong>,</p>' ||
    '<p style="margin:0 0 12px 0">Bonne nouvelle : <strong>tous les éléments de votre commande sont arrivés</strong> et préparés. Il reste juste à planifier la pose.</p>' ||
    '<p style="margin:0 0 4px 0">Vous pouvez régler le solde de <strong>{{solde}} €</strong> depuis votre espace client — c''est ce qui débloque la planification de la pose :</p>' ||
    '<!-- atmo:cta -->' ||
    '<p style="margin:0 0 12px 0;font-size:12.5px;color:#6b7280">Notre équipe vous contactera dans la foulée pour convenir d''un créneau qui vous arrange.</p>',
  text_body =
    'Bonjour {{prenom}},' || chr(10) || chr(10) ||
    'Tous les éléments de votre commande {{numero_dossier}} sont arrivés et préparés.' || chr(10) || chr(10) ||
    'Régler le solde ({{solde}} €) et suivre votre commande : {{lien_portail}}'
WHERE key = 'tous_recus';

UPDATE public.email_templates SET
  subject = 'Merci pour votre demande Atmosphère Tissus',
  html_body =
    '<p style="margin:0 0 12px 0">Bonjour <strong>{{prenom}}</strong>,</p>' ||
    '<p style="margin:0 0 12px 0">Merci pour votre demande passée via Leroy Merlin. Nous avons bien reçu votre projet.</p>' ||
    '<p style="margin:0 0 12px 0">Notre équipe vous recontacte sous 48h pour planifier une visio de découverte (mesures, conseil produit, chiffrage).</p>' ||
    '<p style="margin:0 0 8px 0">D''ici là, si vous avez une question, répondez directement à ce mail.</p>',
  text_body =
    'Bonjour {{prenom}},' || chr(10) || chr(10) ||
    'Merci pour votre demande Leroy Merlin. Nous vous recontactons sous 48h pour planifier une visio.' || chr(10) || chr(10) ||
    'L''équipe Atmosphère Tissus'
WHERE key = 'lead_lm_received';

UPDATE public.email_templates SET
  subject = 'Pose effectuée — merci !',
  html_body =
    '<p style="margin:0 0 12px 0">Bonjour <strong>{{prenom}}</strong>,</p>' ||
    '<p style="margin:0 0 12px 0">Votre pose est terminée — merci de votre confiance et bienvenue dans votre nouveau chez-vous !</p>' ||
    '<p style="margin:0 0 8px 0">Si tout vous convient, votre avis nous ferait vraiment plaisir (30 secondes chrono) :</p>' ||
    '<!-- atmo:cta -->' ||
    '<p style="margin:0 0 12px 0;font-size:12.5px;color:#6b7280">Un souci, une remarque ? Répondez à ce mail, nous vous répondons personnellement.</p>',
  text_body =
    'Bonjour {{prenom}},' || chr(10) || chr(10) ||
    'Votre pose est terminée — merci de votre confiance !' || chr(10) || chr(10) ||
    'Donner mon avis : {{lien_avis}}'
WHERE key = 'pose_effectuee';
