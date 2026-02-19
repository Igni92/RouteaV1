# GERVIFRAIS — Fleet Management App

Application de gestion de flotte pour livraisons en frais (logistique froide).

## Architecture

Monorepo contenant 3 applications :

| App | Stack | Description |
|-----|-------|-------------|
| `backend/` | Node.js + Express + TypeScript | API REST + WebSocket |
| `frontend-manager/` | React + Vite + TypeScript | Dashboard manager (Mapbox) |
| `app-driver/` | React Native + Expo | App chauffeur (iOS/Android) |

Base de données : **PostgreSQL** via Supabase
Cache temps réel : **Redis**
Photos : **AWS S3**
Push notifications : **Firebase FCM**

## Prérequis

- Node.js >= 18
- Docker + Docker Compose
- Expo CLI (`npm install -g expo-cli`)

## Démarrage rapide (développement local)

```bash
# 1. Copier les variables d'environnement
cp backend/.env.example backend/.env
cp frontend-manager/.env.example frontend-manager/.env
cp app-driver/.env.example app-driver/.env

# 2. Démarrer PostgreSQL + Redis via Docker
docker-compose up -d postgres redis

# 3. Installer les dépendances
cd backend && npm install
cd ../frontend-manager && npm install
cd ../app-driver && npm install

# 4. Appliquer le schéma de base de données
cd ../backend && npm run db:migrate

# 5. Insérer les données de test GERVIFRAIS
npm run db:seed

# 6. Lancer le backend
npm run dev

# 7. Lancer le dashboard manager (autre terminal)
cd ../frontend-manager && npm run dev

# 8. Lancer l'app chauffeur (autre terminal)
cd ../app-driver && npx expo start
```

## Structure du projet

```
RouteaV1/
├── backend/              # API Express + services
├── frontend-manager/     # Dashboard React (managers)
├── app-driver/           # App React Native (chauffeurs)
├── shared/               # Types TypeScript partagés
├── docs/                 # Documentation technique (IMMUTABLE)
├── docker-compose.yml
└── README.md
```

## Documentation technique

- [Architecture système](docs/ARCHITECTURE.md)
- [Protocole multi-agent](docs/MULTI-AGENT-PROTOCOL.md)
- [Schéma base de données](docs/DATABASE_SCHEMA.md)
- [Spécification algorithme](docs/ALGORITHM_SPEC.md)
- [Contrat API](docs/API_CONTRACT.md)
- [UI Manager](docs/MANAGER_UI.md)
- [App Driver](docs/DRIVER_APP.md)

## Données pilote GERVIFRAIS

**Chauffeurs** : Hugo Vachey, Mamadou Keita
**Véhicules** : Renault Trafic (AA123BB), Citroën C15 (BB123AA)
**Magasins** :
- Auchan Marne la Vallée : 00:00–05:30, deadline 05:00
- Auchan Villebon : 00:00–05:00, deadline 04:45
- Carrefour Orly : 06:00–11:00, deadline 10:00
- Monoprix Villejuif : 07:00–12:00, deadline 11:00

## Agents de développement

Ce projet utilise une architecture multi-agent. Voir [MULTI-AGENT-PROTOCOL.md](docs/MULTI-AGENT-PROTOCOL.md).

## License

Propriétaire — GERVIFRAIS © 2026
