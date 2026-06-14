-- Seed la nouvelle automation_rule pour l'événement "devis_vu_client"
-- (notification interne quand le client ouvre/télécharge son devis)

INSERT INTO public.automation_rules (event_key, module, label, description, sms_enabled, email_enabled)
VALUES (
  'devis_vu_client',
  'devis',
  'Devis vu par le client',
  'Déclenché à la 1ère ouverture du portail client ou au 1er téléchargement du PDF. Notifie le commercial créateur du devis.',
  false,
  true
)
ON CONFLICT (event_key) DO NOTHING;
