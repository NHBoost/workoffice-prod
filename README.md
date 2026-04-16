# WorkOffice Clone

Une plateforme complète de gestion d'espaces de coworking construite avec Next.js 14, TypeScript, Prisma et Tailwind CSS.

## Fonctionnalités

### 🔐 Authentification
- Connexion sécurisée avec NextAuth.js
- Gestion des rôles (Admin, Manager, User)
- Protection des routes

### 👥 Gestion des Utilisateurs
- Liste des utilisateurs avec filtres et recherche
- Ajout, modification et suppression d'utilisateurs
- Gestion des rôles et permissions
- Assignation aux centres

### 🏢 Gestion des Entreprises
- Domiciliation d'entreprises
- Suivi des statuts (Actif, Suspendu, Résilié)
- Gestion des contacts et informations légales
- Vue détaillée par entreprise

### 🏛️ Centres
- Gestion multi-centres
- Configuration des emplacements
- Assignation des ressources

### 🏠 Salles de Réunion
- Catalogue des salles disponibles
- Gestion des équipements
- Système de réservations
- Statistiques d'occupation
- Tarification flexible

### 💻 Espaces de Coworking
- Gestion des espaces ouverts
- Abonnements (journalier, mensuel, annuel)
- Suivi de l'occupation
- Gestion des équipements

### 📦 Gestion des Colis
- Réception et suivi des colis
- Notifications automatiques
- Gestion des statuts (Reçu, Récupéré, Retourné)
- Historique complet

### ✉️ Gestion du Courrier
- Réception du courrier
- Attribution aux entreprises
- Notifications de réception
- Suivi des collectes

### 💰 Facturation
- Génération automatique des factures
- Suivi des paiements
- Gestion des échéances
- Export des données

### 📧 Campagnes de Mailing
- Création de campagnes email
- Segmentation des destinataires
- Suivi des ouvertures et clics
- Templates personnalisables

### 💬 Messagerie
- Système de messages internes
- Communication entre utilisateurs
- Notifications en temps réel

### 📊 KPIs et Analytics
- Tableau de bord complet
- Statistiques d'utilisation
- Revenus et occupancy rates
- Exportation des rapports

### ⚙️ Paramètres
- Configuration générale
- Gestion des centres
- Paramètres de notification
- Sauvegarde et restauration

### 📱 Scanner QR Code
- Scanner intégré pour codes QR
- Gestion des accès
- Enregistrement des entrées/sorties

## Technologies Utilisées

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Base de données:** SQLite avec Prisma ORM
- **Authentification:** NextAuth.js
- **UI Components:** Headless UI, Lucide React Icons
- **Formulaires:** React Hook Form + Zod validation
- **Notifications:** React Hot Toast
- **Graphiques:** Recharts

## Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Un projet **Supabase** (gratuit sur https://supabase.com)

### Étapes d'installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd workoffice-clone
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
```

Renseigner dans `.env` :
- `DATABASE_URL` : pooler Supabase **port 6543** + `?pgbouncer=true&connection_limit=1`
- `DIRECT_URL` : session pooler Supabase **port 5432**
- `NEXTAUTH_SECRET` : `openssl rand -base64 32`
- `NEXTAUTH_URL` : `http://localhost:3000` en dev

4. **Initialiser la base de données**
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

5. **Démarrer l'application**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## Déploiement (GitHub + Vercel + Supabase)

### 1. Pousser sur GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

> ⚠️ Vérifier que `.env` est bien dans `.gitignore` (il l'est par défaut).

### 2. Importer dans Vercel
- https://vercel.com/new → sélectionner le repo
- Framework : **Next.js** (auto-détecté)
- Build command : `npm run build`
- Install command : `npm install` (inclut `prisma generate` via `postinstall`)

### 3. Variables d'environnement Vercel
Dans **Settings → Environment Variables**, ajouter :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | URL pooler Supabase 6543 + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | URL session pooler Supabase 5432 |
| `NEXTAUTH_SECRET` | Généré via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://<ton-app>.vercel.app` |

### 4. Déployer
Cliquer sur **Deploy**. Le seed doit être exécuté **manuellement une seule fois** depuis ta machine :
```bash
DATABASE_URL="<...>" DIRECT_URL="<...>" npm run db:seed
```

## Comptes de test

Après l'exécution du seed, vous pouvez utiliser ces comptes :

### Administrateur
- **Email:** admin@workoffice.be
- **Mot de passe:** admin123

### Manager
- **Email:** manager@workoffice.be
- **Mot de passe:** manager123

### Utilisateur
- **Email:** jf@beacoon.be
- **Mot de passe:** user123

## Structure du projet

```
workoffice-clone/
├── app/                    # App Router (Next.js 13+)
│   ├── auth/              # Pages d'authentification
│   ├── dashboard/         # Pages du tableau de bord
│   ├── api/              # Routes API
│   └── globals.css       # Styles globaux
├── components/            # Composants réutilisables
│   └── layout/           # Composants de mise en page
├── lib/                  # Utilitaires et configurations
├── prisma/               # Schéma et migrations
├── types/                # Types TypeScript
└── public/               # Fichiers statiques
```

## Fonctionnalités principales

### Tableau de bord
- Vue d'ensemble avec KPIs principaux
- Statistiques en temps réel
- Actions rapides
- Activité récente

### Gestion complète
Chaque module dispose de :
- Interface de listing avec filtres
- Formulaires d'ajout/modification
- Actions en lot
- Export des données
- Recherche avancée

### Responsive Design
- Interface adaptée mobile/tablette
- Navigation optimisée
- Performance optimisée

## Scripts disponibles

```bash
npm run dev          # Démarrer en mode développement
npm run build        # Construire pour la production
npm run start        # Démarrer en mode production
npm run lint         # Linter le code
npx prisma studio    # Interface graphique de la BDD
npx prisma generate  # Générer le client Prisma
npx prisma db push   # Pousser le schéma vers la BDD
npx prisma db seed   # Peupler la BDD avec des données test
```

## Architecture

### Frontend
- **Next.js 14** avec App Router pour la structure
- **TypeScript** pour la sécurité des types
- **Tailwind CSS** pour le styling
- **Composants modulaires** pour la réutilisabilité

### Backend
- **API Routes** Next.js pour les endpoints
- **Prisma ORM** pour les requêtes BDD
- **Validation Zod** pour les données entrantes
- **NextAuth.js** pour l'authentification

### Base de données
- **SQLite** pour le développement
- **Prisma Schema** pour la modélisation
- **Relations complexes** entre entités
- **Migrations** automatiques

## Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub.

---

**WorkOffice Clone** - Plateforme complète de gestion d'espaces de coworking 🏢