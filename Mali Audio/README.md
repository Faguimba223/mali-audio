# Mali Audio mobile

## Authentification

L'application permet de créer un compte, se connecter, modifier son profil et son mot de passe, puis fermer la session. Sur iOS et Android, le JWT est conservé dans `expo-secure-store`. Sur le web, il reste uniquement en mémoire et disparaît au rechargement.

L'espace Administration utilise cette même authentification. En développement, utilisez `admin` / `root`; le compte est créé automatiquement au démarrage du backend. Dans Expo Go, ouvrez l'onglet Profil, choisissez Administration, saisissez ces identifiants, puis vérifiez le tableau de bord. Les rubriques Utilisateurs, Musiques, Artistes, Albums et Playlists utilisent l'API backend. Les paramètres et indicateurs du tableau de bord conservent leur comportement de démonstration actuel. Désactivez le compte par défaut dans `backend/.env` avec `DEFAULT_ADMIN_ENABLED=false` avant une mise en production.

## Adresse de l'API

Le backend doit être démarré avec MongoDB connecté et ses migrations appliquées. L'URL par défaut est `http://10.0.2.2:5000/api` sur l'émulateur Android, et `http://localhost:5000/api` sur iOS Simulator et web.

Pour un téléphone physique, copiez `.env.example` vers `.env`, remplacez l'adresse par l'IP locale de l'ordinateur qui héberge le backend (par exemple `http://192.168.1.20:5000/api`), puis relancez Expo :

```powershell
Copy-Item .env.example .env
npx expo start -c
```

Le téléphone et l'ordinateur doivent être sur le même réseau. `EXPO_PUBLIC_API_URL` est une adresse publique de service, jamais un secret. Le secret JWT reste uniquement dans `backend/.env`.
