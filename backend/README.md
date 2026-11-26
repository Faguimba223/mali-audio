# Mali Audio API (v1.2 — PostgreSQL)

API REST centrale pour la PWA publique, l'espace d'administration et l'application mobile Expo.

## Prérequis
- Node.js 18+
- PostgreSQL 16+ (v18.6 détecté sur le poste)

## Installation & Migrations
```powershell
cd "backend"
Copy-Item .env.example .env
npm install
npm run db:status
npm run db:migrate
npm run dev
```

## Stockage & Streaming protégé
- Images publiques (pochettes, photos, miniatures) : `uploads/images/` servies sous `/uploads/images/*`.
- Fichiers audio, vidéos importées et documents de droits : `storage/private/` (aucun accès statique public).
- Écoute audio : `POST /api/songs/:id/stream-token` puis `GET /api/stream/:token` (jeton HMAC éphémère, support HTTP `Range 206`, `Cache-Control: no-store`).

## Documentation & Tests
- Documentation OpenAPI : `GET /api/openapi.json` et `GET /api/docs`
- Tests : `npm test`
