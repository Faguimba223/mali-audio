# Mali Audio API

Le backend utilise MongoDB avec Mongoose. L'API refuse de démarrer si la base ne répond pas : aucun repli mémoire n'est utilisé. Les collections et index sont créés avec les migrations versionnées de `migrate-mongo`.

## 1. Créer MongoDB

Choisissez une seule option :

- **MongoDB Atlas** : créez un projet et un cluster, ajoutez un utilisateur de base de données avec le rôle `readWrite` sur `mali-audio`, puis autorisez l'adresse IP du serveur dans **Network Access**. Dans **Connect > Drivers**, copiez l'URI et remplacez les identifiants et le nom d'hôte. Encodez les caractères spéciaux du mot de passe au format URL.
- **MongoDB local avec Docker** : démarrez un serveur local avec `docker run --name mali-audio-mongo -p 27017:27017 -d mongo:8`. L'URI locale est `mongodb://127.0.0.1:27017/mali-audio`.

MongoDB crée la base et ses collections au premier `db:up`; il n'est pas nécessaire de créer manuellement la base dans Atlas ou dans le shell.

## 2. Configurer le backend

Dans PowerShell, ouvrez le dossier backend :

```powershell
Set-Location "C:\Users\T480s\OneDrive\Desktop\Mali Audio\backend"
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Collez la valeur générée dans `.env` comme `JWT_SECRET`, puis configurez `MONGODB_URI` :

```env
PORT=5000
JWT_SECRET=<secret aleatoire de 96 caracteres hexadecimaux>
MONGODB_URI=mongodb+srv://<utilisateur>:<mot_de_passe_encode>@<cluster-host>/mali-audio?retryWrites=true&w=majority
NODE_ENV=development
CORS_ORIGIN=http://localhost:8081,http://localhost:19006
```

Pour MongoDB local, remplacez `MONGODB_URI` par `mongodb://127.0.0.1:27017/mali-audio`. Ne commitez jamais `.env` ni l'URI Atlas.

## 3. Créer le schéma et démarrer

Toujours depuis `backend/` :

```powershell
npm install
npm run db:status
npm run db:up
npm run dev
```

`db:up` applique les migrations en attente et enregistre leur version dans `schema_migrations`. `db:status` affiche les migrations appliquées ou en attente. `db:down` annule la dernière migration : il retire ses index et les références backfillées, mais conserve les documents et les collections pour éviter une suppression accidentelle de données. Le serveur ne lance pas automatiquement les migrations ; appliquez-les avant son démarrage. En production, utilisez `npm start` après `npm run db:up`.

En développement, le démarrage du serveur crée automatiquement le compte admin s'il n'existe pas : identifiant `admin`, mot de passe `root`, email interne `admin@maliaudio.local`. Le mot de passe passe par le hook bcrypt du modèle; il n'est jamais écrit en clair. Pour désactiver ce compte par défaut, ajoutez `DEFAULT_ADMIN_ENABLED=false` à `backend/.env`. Avant toute mise en production, désactivez-le ainsi ou définissez explicitement `DEFAULT_ADMIN_ENABLED=true` avec `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD` (au moins 8 caractères) et `DEFAULT_ADMIN_EMAIL` sécurisés. Le mot de passe par défaut `root` n'est jamais activé en production.

Vérifiez la connexion sur `http://localhost:5000/health`. Une réponse valide inclut `"status":"ok"` et le nom de la base connectée.

## Modèles et relations

- `users` possède des favoris et des playlists.
- `artists` possède des albums et des musiques.
- `albums` référence un artiste ; `musics` référence un artiste, un album et une catégorie de genre.
- `news` peut référencer une catégorie.
- `favorites` relie un utilisateur à une musique, avec un index unique par paire.
- `playlists` relie un utilisateur à une liste ordonnée de musiques.

Une musique conserve également `artist`, `album`, `image` et `audioUrl` comme valeurs de compatibilité. Ses métadonnées sont `title`, `artistId`, `albumId`, `genre`, `categoryId`, `duration`, `audioFile`, `coverArt`, `publishedAt` et `playCount`. La migration initiale relie les anciennes musiques aux artistes/albums et crée les catégories de genre ou d'actualité manquantes sans supprimer les données existantes.

## API

| Méthode | Route | Accès |
| --- | --- | --- |
| GET | `/health` | Public |
| POST | `/api/users/register`, `/api/users/login` | Public, limitation de débit |
| GET | `/api/users/admin` | Admin, liste les utilisateurs |
| PATCH | `/api/users/admin/:id/active` | Admin, active/désactive un compte |
| GET, PATCH | `/api/users/profile` | Utilisateur connecté |
| PATCH | `/api/users/password` | Mot de passe actuel requis; ferme les autres sessions |
| POST | `/api/users/logout` | Utilisateur connecté; révoque ses JWT existants |
| GET, POST | `/api/musics` | Lecture publique, création admin |
| GET, PUT, DELETE | `/api/musics/:id` | Lecture publique, mutations admin |
| POST | `/api/musics/:id/play` | Public, incrémente atomiquement `playCount` |
| GET, POST | `/api/artists` | Lecture publique, création admin |
| GET, PUT, DELETE | `/api/artists/:id` | Lecture publique, mutations admin |
| GET, POST | `/api/albums` | Lecture publique, création admin |
| GET, PUT, DELETE | `/api/albums/:id` | Lecture publique, mutations admin |
| GET, POST | `/api/news` | Lecture publique, création admin |
| GET, PUT, DELETE | `/api/news/:id` | Lecture publique, mutations admin |
| GET, POST, PUT, DELETE | `/api/categories` | Lecture publique, mutations admin |
| GET, POST, DELETE | `/api/favorites` | Utilisateur connecté, ses propres favoris |
| GET, POST, PUT, DELETE | `/api/playlists` | Utilisateur connecté, ses propres playlists |
| POST, DELETE | `/api/playlists/:id/tracks` | Propriétaire de la playlist |
| GET, POST | `/api/playlists/admin` | Admin, gestion de toutes les playlists |
| PUT, DELETE | `/api/playlists/admin/:id` | Admin, gestion de toutes les playlists |
| GET | `/api/playlists/public/:id` | Public si la playlist est publique |

Les routes admin et utilisateur attendent `Authorization: Bearer <token>`. La connexion accepte l'identifiant ou l'email, et le rôle `admin` ouvre directement le tableau de bord. Les mots de passe sont hachés avec bcrypt avant l'écriture MongoDB et ne sont jamais renvoyés par l'API. Les jetons JWT ont une durée de vie de 7 jours; le serveur compare leur version avec celle de l'utilisateur et le logout invalide les sessions. Les inscriptions reçoivent toujours le rôle `user`. Pour promouvoir un compte manuellement, inscrivez-le puis exécutez dans `mongosh` connecté à la base :

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

Les listes renvoient un tableau par défaut. Ajoutez `?page=1&limit=20` pour recevoir `{ items, page, limit, total }`. La création d'une musique exige `artistId`; un champ `album` textuel crée ou réutilise l'album de cet artiste. Envoyez les fichiers de musique en multipart sous `audio` (100 Mo maximum) et la pochette sous `image` (10 Mo maximum). Les routes artistes/albums acceptent aussi `image`.