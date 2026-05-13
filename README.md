# Atmosphère Tissus — Plateforme

Plateforme de gestion centralisée pour Atmosphère Tissus (décoration d'intérieur sur mesure, Bordeaux). Remplace Axonaut + Hiboutik + les cahiers papier par une seule app couvrant les 8 modules du CDC v5 : simulateur de devis, suivi des confections, commandes fournisseurs, réception QR, SMS automatiques, gestion poseurs, Collection Atmosphère + Leroy Merlin, caisse comptoir.

## Stack

- **Frontend** : Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4
- **Base de données + Auth** : Supabase (Postgres, EU Paris) avec RLS par rôle
- **Paiements** : Stripe (acompte 50 % + soldes)
- **SMS** : Brevo (expéditeur ATMOSPHERE)
- **Comptabilité** : Pennylane API (e-facture à la pose)
- **Hébergement** : Railway

## Développement local

```bash
npm install
cp .env.example .env.local      # remplir les valeurs Supabase + Stripe
npm run dev                      # http://localhost:3000
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` | Build de production |
| `npm start` | Serveur de production (après build) |
| `npm run db:apply` | Applique les migrations SQL sur Supabase (nécessite `SUPABASE_DB_URL`) |
| `npm run db:types` | Régénère les types TypeScript depuis le schéma vivant |

### Migrations Supabase

Les migrations sont dans `supabase/migrations/` et nommées chronologiquement. Pour appliquer :

```bash
SUPABASE_DB_URL='postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres' \
  npm run db:apply
```

Ou copie-colle le contenu des fichiers `.sql` dans le SQL Editor du dashboard Supabase.

Pour régénérer les types après changement de schéma :

```bash
SUPABASE_DB_URL='...' node scripts/gen-types.mjs
```

## Sécurité

- **`.env.local` n'est jamais committé** (`.gitignore`)
- **RLS strict** sur toutes les tables (`supabase/migrations/*_rls_policies.sql`)
- La `service_role` key ne doit jamais être exposée côté client — utilisée uniquement dans les Route Handlers (`src/lib/supabase/server.ts → createServiceRoleClient()`)
- Le proxy Next 16 (`src/proxy.ts`) protège toutes les routes privées
- Routes publiques : `/`, `/auth/*`

## Architecture

```
src/
├── app/
│   ├── (platform)/         # Routes protégées (auth requise)
│   │   ├── dashboard/
│   │   ├── devis/
│   │   ├── confections/
│   │   ├── commandes/
│   │   ├── reception/
│   │   ├── poses/
│   │   ├── agenda/
│   │   ├── caisse/
│   │   ├── collection/
│   │   ├── clients/
│   │   └── parametres/
│   ├── api/health/         # Healthcheck Railway
│   ├── auth/               # callback, sign-out, server actions
│   └── page.tsx            # Login (publique)
├── components/
│   ├── shell/              # Sidebar, Topbar, command palette, notifs drawer
│   ├── ui/                 # Primitives (Button, Card, etc.)
│   └── auth/               # Formulaires d'auth
├── lib/
│   ├── supabase/           # client.ts, server.ts, middleware.ts, types.ts
│   ├── mock-data.ts        # ⚠ Données fictives (à migrer vers DB)
│   ├── formatters.ts       # eur(), shortDate(), …
│   └── utils.ts            # cn() helper
└── proxy.ts                # Next 16 proxy (ex-middleware)

supabase/
├── migrations/             # SQL versionné
└── config.toml             # Config Supabase CLI

scripts/
├── apply-migrations.ts     # `npm run db:apply`
└── gen-types.mjs           # Régénération des types
```

## Variables d'environnement

Voir `.env.example` pour la liste complète. Variables critiques :

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — exposées au client (RLS protège)
- `SUPABASE_SERVICE_ROLE_KEY` — **server-side only**, bypass RLS
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — server-side
- `BREVO_API_KEY` — server-side
- `NEXT_PUBLIC_APP_URL` — URL publique (Railway domain en prod)

## Déploiement Railway

L'app est déployée automatiquement à chaque `git push` sur `main` :

1. Railway détecte le `railway.json` à la racine
2. Build via Nixpacks (Node 22 + `npm ci && npm run build`)
3. Démarrage via `npm start`
4. Healthcheck sur `/api/health` (timeout 30s)

Les variables d'env sont configurées dans le dashboard Railway (jamais commitées).

## Rôles & permissions

Définis dans le type `user_role` Postgres :

- `admin` — accès complet, paramétrage, utilisateurs, rapports
- `commercial` — devis, fiches clients, suivi commandes
- `resp_confection` — suivi confections, assignation couturières, réception colis
- `couturiere` — ses bons de travail uniquement
- `poseur` — ses interventions, contact client, confirmation pose
- `decoratrice` — ses rendez-vous, fiches clients

Les RLS policies appliquent ces rôles automatiquement à toutes les requêtes.

## Licence

Privé · Atmosphère Tissus · 2026.
