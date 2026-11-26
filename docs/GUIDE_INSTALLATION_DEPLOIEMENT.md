# Guide d'installation, déploiement et sauvegarde — Mali Audio v1.2

## 1. Architecture cible
- **PWA publique (`web/`)** : React 19 + Vite 8 + Web App Manifest + Service Worker (`sw.js`) — `https://maliaudio.com`
- **Administration séparée (`admin/`)** : React 19 + Vite 8 — `https://admin.maliaudio.com`
- **API centrale (`backend/`)** : Node.js + Express 4 + PostgreSQL (`pg`) — `https://api.maliaudio.com`
- **Stockage privé (`backend/storage/private/`)** : fichiers audio, vidéos importées et documents de droits (aucun accès statique HTTP direct)
- **Application mobile (`Mali Audio/`)** : Expo 57 / React Native conservée et branchée sur la même API

## 2. Démarrage en local
1. **Backend & PostgreSQL** :
   ```powershell
   cd backend
   Copy-Item .env.example .env
   # Renseigner DATABASE_URL, JWT_SECRET (min 32 car.), STREAM_SECRET (min 32 car.)
   npm install
   npm run db:status
   npm run db:migrate
   npm run dev
   ```
2. **PWA publique (`web/`)** :
   ```powershell
   cd web
   Copy-Item .env.example .env
   npm install
   npm run dev   # http://localhost:5173
   ```
3. **Administration séparée (`admin/`)** :
   ```powershell
   cd admin
   Copy-Item .env.example .env
   npm install
   npm run dev   # http://localhost:5174
   ```

## 3. Séparation des environnements & Mise en production HTTPS
- **Développement** : `NODE_ENV=development`, données de test séparées, secrets locaux dans `.env` (jamais commités).
- **Préproduction / Test** : domaine de test HTTPS, base PostgreSQL dédiée non sensible, test de restauration avant bascule.
- **Production** :
  - `NODE_ENV=production`
  - `DEFAULT_ADMIN_ENABLED=false` (ou mot de passe robuste >= 12 caractères si utilisé pour l'initialisation)
  - `JWT_SECRET` et `STREAM_SECRET` générés aléatoirement (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
  - `CORS_ORIGIN=https://maliaudio.com,https://admin.maliaudio.com`
  - Certificat TLS/HTTPS obligatoire (prérequis pour l'installation PWA et le Service Worker).
  - Sauvegarde de la base avant toute migration (`npm run db:migrate`).

## 4. Sauvegardes & Restauration PostgreSQL + Médias
- **Sauvegarde PostgreSQL** :
  ```powershell
  pg_dump -Fc -h localhost -U postgres -d maliaudio -f "backup_maliaudio_$(Get-Date -Format yyyyMMdd_HHmm).dump"
  ```
- **Sauvegarde des médias privés et images** : archiver conjointement `backend/storage/private/` et `backend/uploads/images/` pour conserver la correspondance avec `media_assets`.
- **Test de restauration** :
  ```powershell
  createdb maliaudio_restore_test
  pg_restore -d maliaudio_restore_test backup_maliaudio_YYYYMMDD_HHMM.dump
  ```
- Vérifier ensuite le nombre d'enregistrements (`songs`, `artists`, `albums`, `playlists`, `media_assets`) et la lecture d'un titre protégé.
