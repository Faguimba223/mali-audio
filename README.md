# Mali Audio — PWA & Backend

> Plateforme musicale numérique malienne — Site web PWA, interface d'administration et API backend.

[![Node.js](https://img.shields.io/badge/Node.js-24-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue)](https://www.postgresql.org)
[![Vite](https://img.shields.io/badge/Vite-8-purple)](https://vitejs.dev)

---

## 🎵 Présentation

**Mali Audio** est une plateforme de découverte et de diffusion de musique malienne et africaine.  
Elle regroupe artistes, chansons, albums, playlists, vidéos et actualités dans une expérience unifiée.

| Composant | Description | URL locale |
|-----------|-------------|-----------|
| **PWA publique** (`web/`) | Site React + Vite, installable comme app | `http://localhost:5173` |
| **Admin** (`admin/`) | Tableau de bord administrateur séparé | `http://localhost:5174` |
| **Backend** (`backend/`) | API REST Node.js + Express + PostgreSQL | `http://localhost:5000` |
| **Mobile** (`Mali Audio/`) | App Expo / React Native | Expo Go |

---

## ⚡ Démarrage rapide

### Prérequis
- Node.js ≥ 20
- PostgreSQL 18 (service démarré)
- npm ≥ 10

### 1. Backend

```bash
cd backend
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET, STREAM_SECRET dans .env
npm install
npm run db:migrate   # Crée les tables + compte admin
npm run dev          # → http://localhost:5000
```

### 2. Site web (PWA)

```bash
cd web
npm install
npm run dev          # → http://localhost:5173
```

### 3. Administration

```bash
cd admin
npm install
npm run dev          # → http://localhost:5174
```

### 4. Application mobile

```bash
cd "Mali Audio"
npm install
npx expo start
```

---

## 🔐 Sécurité audio

Les fichiers audio sont stockés dans `backend/storage/private/audio/` — **jamais exposés via HTTP**.  
L'écoute passe par un jeton HMAC temporaire :

```
POST /api/songs/:id/stream-token  →  { token }
GET  /api/stream/:token           →  206 Partial Content (Range)
```

Le Service Worker (`web/public/sw.js`) exclut explicitement `/api/stream/*` du cache.

---

## 👤 Compte administrateur par défaut

| Champ | Valeur |
|-------|--------|
| Email | `admin@maliaudio.local` |
| Mot de passe | `root` |

> ⚠️ Changer ce mot de passe dès la première connexion en production.

---

## 🧪 Tests

```bash
cd backend
npm test   # 5 tests doivent passer ✅
```

---

## 📁 Structure du projet

```
Mali Audio/           # Application mobile Expo/React Native
admin/                # Interface d'administration (React + Vite, port 5174)
backend/              # API REST (Node.js + Express + PostgreSQL)
  ├── config/         # Configuration (env, db, upload)
  ├── controllers/    # Logique métier
  ├── db/migrations/  # Scripts SQL versionnés
  ├── docs/           # Spécification OpenAPI
  ├── middleware/     # Auth JWT, gestion erreurs
  ├── routes/         # Router principal
  ├── test/           # Tests Node.js natifs
  └── utils/          # Validation, audit, streaming
docs/                 # Guides d'installation et d'administration
web/                  # Site public PWA (React + Vite, port 5173)
  ├── public/         # Manifest, Service Worker, icônes
  └── src/            # Composants, pages, contextes, services
```

---

## 📚 Documentation

- [Guide d'installation et de déploiement](docs/GUIDE_INSTALLATION_DEPLOIEMENT.md)
- [Guide d'administration](docs/GUIDE_ADMINISTRATION.md)
- API OpenAPI : `http://localhost:5000/api/docs`

---

## 🏗️ Technologies

| Couche | Technologie |
|--------|-------------|
| Frontend web | React 19, Vite 8, CSS custom (black/gold) |
| Frontend admin | React 19, Vite 8 |
| Backend | Node.js 24, Express 4, PostgreSQL 18 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Upload | Multer + validation magic bytes |
| Streaming | HMAC tokens, HTTP Range 206 |
| PWA | Web App Manifest, Service Worker |
| Mobile | Expo 57, React Native |

---

## 📄 Licence

Projet privé — Faguimba Traoré / Mali Audio © 2026. Tous droits réservés.
