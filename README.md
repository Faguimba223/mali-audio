# Mali Audio

Ce dépôt contient l’application mobile Expo, le backend API et le dashboard d’administration.

## 1. Pré-requis

- Node.js 18+
- PostgreSQL 16+
- npm
- Expo SDK 57 (déjà utilisé dans l’application mobile)

## 2. Installation du backend

```powershell
cd "C:\Users\T480s\OneDrive\Desktop\Mali Audio\backend"
Copy-Item .env.example .env
npm install
npm run db:init
npm run dev
```

Dans le fichier .env, configurez :

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maliaudio
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
CORS_ORIGIN=http://localhost:8081,http://localhost:19006
UPLOAD_DIR=./uploads
ADMIN_EMAIL=admin@maliaudio.local
ADMIN_PASSWORD=root
ADMIN_NAME=Administrateur
```

## 3. Lancement du backend

```powershell
cd "C:\Users\T480s\OneDrive\Desktop\Mali Audio\backend"
npm run dev
```

La santé de l’API est accessible sur :

```text
http://localhost:5000/api/health
```

## 4. Lancement de l’application mobile

```powershell
cd "C:\Users\T480s\OneDrive\Desktop\Mali Audio\Mali Audio"
npm install
npx expo start -c
```

Définissez aussi :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api
```

## 5. Lancement du dashboard admin

```powershell
cd "C:\Users\T480s\OneDrive\Desktop\Mali Audio\admin"
npm install
npm run dev
```

## 6. Créer le compte administrateur

Le compte est initialisé automatiquement au démarrage si la table users est vide. Par défaut, l’email administrative est configurable via `ADMIN_EMAIL` et le mot de passe via `ADMIN_PASSWORD`.

## 7. Test rapide API

```powershell
Invoke-WebRequest http://localhost:5000/api/health
```

## 8. Connexion téléphone/API

- Exécuter le backend sur 0.0.0.0
- Mettre l’IP locale dans `EXPO_PUBLIC_API_URL`
- Vérifier que l’API écoute sur le port 5000

## 9. Déploiement

- API: hébergement Node.js compatible
- Base PostgreSQL: hébergement PostgreSQL
- Admin: hébergement Vite/React
- Android: `npx eas build -p android`

> Le démarrage automatique de build EAS n’a pas été lancé ici, conformément à la demande de ne pas lancer une action payante sans confirmation.
